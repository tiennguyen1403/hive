import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Order } from "@/data/types";
import { CARD_OVERDUE_REASON, OVERDUE_REASON } from "./customer-orders";
import {
  EXPIRY_MARGIN_S,
  STRIPE_MAX_EXPIRY_S,
  STRIPE_MIN_EXPIRY_S,
  awaitsCardPayment,
  cardReturnUrls,
  cardTotalVnd,
  checkPaidSession,
  checkoutExpiresAt,
  checkoutSessionParams,
  isPaymentIntentId,
  isSessionId,
  isTestKey,
  lateCardPaymentText,
  lineItemName,
  paidCopy,
  payByCardMessage,
  paymentFailedPath,
  readPaymentReturn,
  receiptPath,
  type SessionFacts,
} from "./card-checkout";

/**
 * Slice B18's rules with no I/O: the key it accepts, the Checkout Session it
 * makes for an order, and the verdict on a session Stripe returns — every
 * refusal the brief names (a session of another order, or none, unpaid, the
 * wrong amount, the wrong currency). The I/O around them is
 * `lib/db/card-payments.test.ts`; the database's side `card-checkout.dbtest.ts`.
 */

const NOW = Date.parse("2026-10-07T10:00:00+07:00");
const SEC = Math.floor(NOW / 1000);
const DUE_12H = "2026-10-07T22:00:00+07:00";

const order: Pick<Order, "code" | "lines" | "shippingFeeVnd" | "codFeeVnd" | "discountVnd"> = {
  code: "DH-2432" as Order["code"],
  lines: [
    { productId: "p-khoi" as Order["lines"][number]["productId"], size: "M", color: "black", qty: 2, unitPriceVnd: 390_000 },
  ],
  shippingFeeVnd: 30_000,
  codFeeVnd: 0,
  discountVnd: 50_000,
};

describe("the key", () => {
  it("takes a test-mode secret key, and nothing else", () => {
    expect(isTestKey("sk_test_abc123")).toBe(true);
    expect(isTestKey("sk_live_abc123")).toBe(false);
    expect(isTestKey("rk_test_abc123")).toBe(false);
    expect(isTestKey("pk_test_abc123")).toBe(false);
    expect(isTestKey("sk_test_")).toBe(false);
    expect(isTestKey("")).toBe(false);
    expect(isTestKey(undefined)).toBe(false);
    expect(isTestKey(null)).toBe(false);
  });
});

describe("the ids", () => {
  it("knows a test session id and a payment intent id by their shape", () => {
    expect(isSessionId("cs_test_a1B2c3")).toBe(true);
    expect(isSessionId("cs_live_a1B2c3")).toBe(false);
    expect(isSessionId("cs_test_")).toBe(false);
    expect(isSessionId("cs_test_a1;drop")).toBe(false);
    expect(isSessionId(`cs_test_${"a".repeat(248)}`)).toBe(false);
    expect(isSessionId(42)).toBe(false);
    expect(isPaymentIntentId("pi_3QxYz")).toBe(true);
    expect(isPaymentIntentId("pi_")).toBe(false);
    expect(isPaymentIntentId("ch_3QxYz")).toBe(false);
  });
});

describe("the way back", () => {
  it("sends both of Stripe's URLs to the order's receipt, the success one with Stripe's own placeholder", () => {
    expect(receiptPath("DH-2432")).toBe("/order-confirmed/DH-2432");
    expect(cardReturnUrls("http://127.0.0.1:3200", "DH-2432")).toEqual({
      success: "http://127.0.0.1:3200/order-confirmed/DH-2432?session_id={CHECKOUT_SESSION_ID}",
      cancel: "http://127.0.0.1:3200/order-confirmed/DH-2432?payment=cancelled",
    });
    expect(paymentFailedPath("DH-2432")).toBe("/order-confirmed/DH-2432?payment=failed");
  });

  it("reads a session id only when it has a session's shape, and the two flags only", () => {
    expect(readPaymentReturn({ session_id: "cs_test_a1B2", payment: undefined })).toEqual({ sessionId: "cs_test_a1B2", flag: null });
    expect(readPaymentReturn({ session_id: "{CHECKOUT_SESSION_ID}" })).toEqual({ sessionId: null, flag: null });
    expect(readPaymentReturn({ session_id: "' or 1=1" })).toEqual({ sessionId: null, flag: null });
    expect(readPaymentReturn({ session_id: ["cs_test_first", "cs_test_second"] })).toEqual({ sessionId: "cs_test_first", flag: null });
    expect(readPaymentReturn({ payment: "cancelled" })).toEqual({ sessionId: null, flag: "cancelled" });
    expect(readPaymentReturn({ payment: "failed" })).toEqual({ sessionId: null, flag: "failed" });
    expect(readPaymentReturn({ payment: "paid" })).toEqual({ sessionId: null, flag: null });
    expect(readPaymentReturn({})).toEqual({ sessionId: null, flag: null });
  });
});

describe("the window (expires_at)", () => {
  it("is the order's hold when the hold sits inside Stripe's 30 minutes to 24 hours", () => {
    expect(checkoutExpiresAt(DUE_12H, NOW)).toBe(SEC + 12 * 3600);
  });

  it("is held inside Stripe's window, a minute in from each end, whatever the hold", () => {
    const earliest = SEC + STRIPE_MIN_EXPIRY_S + EXPIRY_MARGIN_S;
    const latest = SEC + STRIPE_MAX_EXPIRY_S - EXPIRY_MARGIN_S;
    expect(checkoutExpiresAt("2026-10-07T10:10:00+07:00", NOW)).toBe(earliest); // ten minutes of hold left
    expect(checkoutExpiresAt("2026-10-07T09:00:00+07:00", NOW)).toBe(earliest); // already past
    expect(checkoutExpiresAt("2026-10-09T10:00:00+07:00", NOW)).toBe(latest); // two days away
    for (const due of ["2026-10-07T10:00:00+07:00", "2026-10-07T10:31:00+07:00", DUE_12H, "2026-10-08T09:59:00+07:00"]) {
      const at = checkoutExpiresAt(due, NOW);
      expect(at - SEC).toBeGreaterThanOrEqual(STRIPE_MIN_EXPIRY_S);
      expect(at - SEC).toBeLessThanOrEqual(STRIPE_MAX_EXPIRY_S);
    }
  });
});

describe("the session (checkoutSessionParams)", () => {
  const request = { code: "DH-2432", totalVnd: cardTotalVnd(order), dueAt: DUE_12H, origin: "https://hive.example", nowMs: NOW };

  it("prices the order at its total, in đồng, NOT times a hundred", () => {
    expect(cardTotalVnd(order)).toBe(760_000); // 2 × 390.000 + 30.000 − 50.000
    const params = checkoutSessionParams({ ...request, locale: "vi" });
    expect(params.mode).toBe("payment");
    expect(params.line_items).toEqual([
      { quantity: 1, price_data: { currency: "vnd", unit_amount: 760_000, product_data: { name: "Đơn DH-2432" } } },
    ]);
    expect(params.line_items![0]!.price_data!.unit_amount).not.toBe(76_000_000);
  });

  it("takes a card and nothing else, names the order twice, and comes back to its receipt", () => {
    const params = checkoutSessionParams({ ...request, locale: "vi" });
    expect(params.allowed_payment_method_types).toEqual(["card"]);
    expect(params.client_reference_id).toBe("DH-2432");
    expect(params.metadata).toEqual({ order_code: "DH-2432" });
    expect(params.success_url).toBe("https://hive.example/order-confirmed/DH-2432?session_id={CHECKOUT_SESSION_ID}");
    expect(params.cancel_url).toBe("https://hive.example/order-confirmed/DH-2432?payment=cancelled");
    expect(params.expires_at).toBe(SEC + 12 * 3600);
  });

  it("speaks the shopper's language, the line included", () => {
    expect(checkoutSessionParams({ ...request, locale: "vi" }).locale).toBe("vi");
    const en = checkoutSessionParams({ ...request, locale: "en" });
    expect(en.locale).toBe("en");
    expect(en.line_items![0]!.price_data!.product_data!.name).toBe("Order DH-2432");
    expect(lineItemName("DH-2432")).toBe("Đơn DH-2432");
  });
});

describe("the verdict on a session Stripe returned (checkPaidSession)", () => {
  const paid: SessionFacts = {
    mode: "payment",
    payment_status: "paid",
    client_reference_id: "DH-2432",
    amount_total: 760_000,
    currency: "vnd",
    payment_intent: "pi_3QxYzAbC",
  };
  const expected = { code: "DH-2432", totalVnd: 760_000 };

  it("passes a paid session of this order, for its total, in đồng, and keeps its payment intent", () => {
    expect(checkPaidSession(paid, expected)).toEqual({ ok: true, paymentIntent: "pi_3QxYzAbC" });
    const expanded = { ...paid, payment_intent: { id: "pi_3QxYzAbC" } } as unknown as SessionFacts;
    expect(checkPaidSession(expanded, expected)).toEqual({ ok: true, paymentIntent: "pi_3QxYzAbC" });
  });

  it("refuses a session of another order, or of none", () => {
    expect(checkPaidSession({ ...paid, client_reference_id: "DH-2431" }, expected)).toEqual({ ok: false, reason: "OTHER_ORDER" });
    expect(checkPaidSession({ ...paid, client_reference_id: null }, expected)).toEqual({ ok: false, reason: "OTHER_ORDER" });
  });

  it("refuses a session not yet paid", () => {
    expect(checkPaidSession({ ...paid, payment_status: "unpaid" }, expected)).toEqual({ ok: false, reason: "NOT_PAID" });
    expect(checkPaidSession({ ...paid, payment_status: "no_payment_required" }, expected)).toEqual({ ok: false, reason: "NOT_PAID" });
  });

  it("refuses the wrong amount — a hundred times too much, or a đồng off", () => {
    expect(checkPaidSession({ ...paid, amount_total: 76_000_000 }, expected)).toEqual({ ok: false, reason: "AMOUNT" });
    expect(checkPaidSession({ ...paid, amount_total: 759_999 }, expected)).toEqual({ ok: false, reason: "AMOUNT" });
    expect(checkPaidSession({ ...paid, amount_total: null }, expected)).toEqual({ ok: false, reason: "AMOUNT" });
  });

  it("refuses another currency, and anything but a one-off payment", () => {
    expect(checkPaidSession({ ...paid, currency: "usd" }, expected)).toEqual({ ok: false, reason: "CURRENCY" });
    expect(checkPaidSession({ ...paid, mode: "subscription" }, expected)).toEqual({ ok: false, reason: "NOT_PAYMENT" });
  });

  it("refuses a paid session that names no payment intent the order could keep", () => {
    expect(checkPaidSession({ ...paid, payment_intent: null }, expected)).toEqual({ ok: false, reason: "NO_INTENT" });
    expect(checkPaidSession({ ...paid, payment_intent: "ch_123" }, expected)).toEqual({ ok: false, reason: "NO_INTENT" });
  });
});

describe("once Stripe says it is paid", () => {
  it("draws the order PAID at the instant the server recorded, and keeps the moment", () => {
    const waiting: Pick<Order, "status" | "payment" | "moments"> = {
      status: { state: "AWAITING_TRANSFER", dueAt: DUE_12H },
      payment: "CARD",
    };
    const paid = paidCopy(waiting, "2026-10-07T10:05:00+07:00");
    expect(paid.status).toEqual({ state: "PAID", paidAt: "2026-10-07T10:05:00+07:00" });
    expect(paid.moments).toEqual({ paidAt: "2026-10-07T10:05:00+07:00" });
    expect(waiting.status.state).toBe("AWAITING_TRANSFER");
  });

  it("asks Stripe only about a card order still waiting", () => {
    const status = { state: "AWAITING_TRANSFER" as const, dueAt: DUE_12H };
    expect(awaitsCardPayment({ payment: "CARD", status })).toBe(true);
    expect(awaitsCardPayment({ payment: "BANK_TRANSFER", status })).toBe(false);
    expect(awaitsCardPayment({ payment: "CARD", status: { state: "PAID", paidAt: DUE_12H } })).toBe(false);
  });
});

describe("the reason the database writes is the one the screens read", () => {
  it("cancels a card order whose hold ran out with CARD_OVERDUE_REASON, verbatim (expire_and_lock v4)", () => {
    const sql = readFileSync(join(process.cwd(), "supabase", "migrations", "20261007180000_card_checkout.sql"), "utf8");
    expect(sql).toContain(`when 'CARD' then '${CARD_OVERDUE_REASON}'`);
    expect(sql).toContain(`else '${OVERDUE_REASON}'`);
  });
});

describe("the words", () => {
  it("says why no page opened, in both languages", () => {
    expect(payByCardMessage("NOT_ALLOWED")).toBe("Đơn này không còn chờ trả thẻ.");
    expect(payByCardMessage("NOT_ALLOWED", "en")).toBe("This order is no longer awaiting card payment.");
    expect(payByCardMessage("UNAVAILABLE")).toBe("Chưa mở được trang thanh toán. Thử lại sau ít phút.");
    expect(payByCardMessage("UNAVAILABLE", "en")).toBe("Couldn't open the payment page. Try again in a few minutes.");
  });

  it("leaves the shop a note for a payment that came after the order was cancelled", () => {
    expect(lateCardPaymentText("pi_3QxYz")).toBe("Stripe nhận tiền sau khi đơn đã huỷ · pi_3QxYz · hoàn tiền tay trên Stripe");
    expect(lateCardPaymentText("pi_3QxYz", "en")).toBe(
      "Stripe took the payment after the order was cancelled · pi_3QxYz · refund it by hand on Stripe",
    );
  });
});
