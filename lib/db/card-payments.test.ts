import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/data/types";
import type { AdminOrder } from "@/lib/admin-orders";

/**
 * `reconcileCardOrder`, `openCardCheckout` and `closeCardCheckout` without
 * Stripe or a database (slice B18): what they ask Stripe, what they hand
 * `card_mark_paid()` and `card_checkout_opened()`, and above all what they
 * refuse to believe — any session but the one the order row stored, since an
 * order number comes round again after every reset. The Stripe client
 * (`lib/stripe.ts`), the service role (`./service`), the clock and
 * `server-only` are replaced. The verdict's own rules are
 * `lib/card-checkout.test.ts`; Postgres' side is `card-checkout.dbtest.ts`.
 */

vi.mock("server-only", () => ({}));

const NOW = Date.parse("2026-10-07T10:00:00+07:00");
vi.mock("@/lib/clock", () => ({ demoNow: () => new Date(NOW), demoNowMs: () => NOW }));

const KEYISH = "sk_test_51ThisLooksLikeAKey";

type Session = {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  mode: "payment";
  payment_status: "paid" | "unpaid";
  client_reference_id: string | null;
  amount_total: number | null;
  currency: string | null;
  payment_intent: string | null;
};

const notFound = (id: string) =>
  Object.assign(new Error(`No such checkout.session: '${id}'`), { type: "StripeInvalidRequestError", statusCode: 404 });
const connection = () => Object.assign(new Error(`connection reset, key ${KEYISH}`), { type: "StripeConnectionError" });

const sessions = new Map<string, Session>();
const retrieve = vi.fn(async (id: string) => {
  const s = sessions.get(id);
  if (!s) throw notFound(id);
  return { ...s };
});
const create = vi.fn(async (params: Record<string, unknown>) => {
  const s: Session = {
    id: "cs_test_new0001",
    url: "https://checkout.stripe.com/c/pay/cs_test_new0001",
    status: "open",
    mode: "payment",
    payment_status: "unpaid",
    client_reference_id: params.client_reference_id as string,
    amount_total: (params.line_items as { price_data: { unit_amount: number } }[])[0]!.price_data.unit_amount,
    currency: "vnd",
    payment_intent: null,
  };
  sessions.set(s.id, s);
  return { ...s };
});
const expire = vi.fn(async (id: string) => {
  const s = sessions.get(id);
  if (!s || s.status !== "open") {
    throw Object.assign(new Error("Only Checkout Sessions with a status in [\"open\"] can be expired."), {
      type: "StripeInvalidRequestError",
      statusCode: 400,
    });
  }
  s.status = "expired";
  return { ...s };
});
let stripeOn = true;
vi.mock("@/lib/stripe", () => ({
  getStripe: () => (stripeOn ? { checkout: { sessions: { retrieve, create, expire } } } : null),
}));

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
let stored: string | null = null;
let markAnswer: string = "PAID";
let openedError: { message: string } | null = null;
const rpc = vi.fn<Rpc>(async (fn) => {
  if (fn === "card_session") return { data: stored, error: null };
  if (fn === "card_mark_paid") return { data: markAnswer, error: null };
  if (fn === "card_checkout_opened") return { data: null, error: openedError };
  return { data: null, error: { message: `unexpected ${fn}` } };
});
let serviceOn = true;
vi.mock("./service", () => ({ getServiceSupabase: () => (serviceOn ? { rpc } : null) }));

const { reconcileCardOrder, openCardCheckout, closeCardCheckout } = await import("./card-payments");

const DUE = "2026-10-07T22:00:00+07:00";
const ORDER: Order = {
  code: "DH-2433" as Order["code"],
  customerId: "" as Order["customerId"],
  lines: [{ productId: "p-khoi" as Order["lines"][number]["productId"], size: "M", color: "black", qty: 1, unitPriceVnd: 390_000 }],
  status: { state: "AWAITING_TRANSFER", dueAt: DUE },
  payment: "CARD",
  delivery: "STANDARD",
  shippingFeeVnd: 30_000,
  codFeeVnd: 0,
  discountVnd: 0,
  shipTo: { recipient: "Trần Minh Anh", phone: "0912345678", line: "24 Nguyễn Thị Minh Khai", provinceCode: "79", wardCode: "26734" },
  email: null,
  note: "",
  placedAt: "2026-10-07T10:00:00+07:00",
};
const TOTAL = 420_000;
const CANCELLED: Order = { ...ORDER, status: { state: "CANCELLED", cancelledAt: DUE, reason: "quá hạn thanh toán" } };

function paidSession(id: string, over: Partial<Session> = {}): Session {
  return {
    id,
    url: null,
    status: "complete",
    mode: "payment",
    payment_status: "paid",
    client_reference_id: "DH-2433",
    amount_total: TOTAL,
    currency: "vnd",
    payment_intent: "pi_3Paid0001",
    ...over,
  };
}
const openSession = (id: string) => paidSession(id, { status: "open", payment_status: "unpaid", payment_intent: null });

let errors: ReturnType<typeof vi.spyOn>;
let warns: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sessions.clear();
  retrieve.mockClear();
  create.mockClear();
  expire.mockClear();
  rpc.mockClear();
  stored = null;
  markAnswer = "PAID";
  openedError = null;
  stripeOn = true;
  serviceOn = true;
  errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
  warns = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  // No log line ever carries anything shaped like a key.
  for (const call of [...errors.mock.calls, ...warns.mock.calls]) expect(call.join(" ")).not.toMatch(/sk_(test|live)_[A-Za-z0-9]/);
  errors.mockRestore();
  warns.mockRestore();
});

const marks = () => rpc.mock.calls.filter(([fn]) => fn === "card_mark_paid");
const asked = () => retrieve.mock.calls.map(([id]) => id);

describe("reconcileCardOrder: only the session this order row stored", () => {
  it("never believes a session on the URL that is not the stored one — paid, same number, same total — nor asks Stripe about it", async () => {
    // Yesterday's DH-2433, paid; today's DH-2433, same basket, waiting on its own page.
    sessions.set("cs_test_yesterday1", paidSession("cs_test_yesterday1"));
    stored = "cs_test_today00001";
    sessions.set("cs_test_today00001", openSession("cs_test_today00001"));
    const order = await reconcileCardOrder(ORDER, "cs_test_yesterday1");
    expect(order).toBe(ORDER);
    expect(asked()).toEqual(["cs_test_today00001"]);
    expect(marks()).toEqual([]);
  });

  it("asks nothing at all for a waiting order that stored no session, whatever the URL says", async () => {
    sessions.set("cs_test_yesterday1", paidSession("cs_test_yesterday1"));
    expect(await reconcileCardOrder(ORDER, "cs_test_yesterday1")).toBe(ORDER);
    expect(retrieve).not.toHaveBeenCalled();
    expect(rpc.mock.calls).toEqual([["card_session", { p_code: "DH-2433" }]]);
  });

  it("marks a waiting order paid when the stored session is paid — back from Stripe with it, or at any later view", async () => {
    stored = "cs_test_stored001";
    sessions.set("cs_test_stored001", paidSession("cs_test_stored001"));
    const back = await reconcileCardOrder(ORDER, "cs_test_stored001");
    expect(back.status).toEqual({ state: "PAID", paidAt: "2026-10-07T10:00:00+07:00" });
    expect(back.moments).toEqual({ paidAt: "2026-10-07T10:00:00+07:00" });
    expect(marks()).toEqual([
      [
        "card_mark_paid",
        {
          p_code: "DH-2433",
          p_session_id: "cs_test_stored001",
          p_payment_intent: "pi_3Paid0001",
          p_amount_vnd: TOTAL,
          p_now: "2026-10-07T10:00:00+07:00",
        },
      ],
    ]);
    expect((await reconcileCardOrder(ORDER)).status.state).toBe("PAID");
    expect(asked()).toEqual(["cs_test_stored001", "cs_test_stored001"]);
  });

  it("leaves a waiting order waiting when its stored session is unpaid, another order's, for another amount or currency", async () => {
    stored = "cs_test_stored001";
    for (const over of [
      { status: "open", payment_status: "unpaid" },
      { client_reference_id: "DH-2431" },
      { amount_total: TOTAL * 100 },
      { currency: "usd" },
    ] as Partial<Session>[]) {
      sessions.set("cs_test_stored001", paidSession("cs_test_stored001", over));
      expect(await reconcileCardOrder(ORDER, "cs_test_stored001"), JSON.stringify(over)).toBe(ORDER);
    }
    expect(marks()).toEqual([]);
  });

  it("is safe to ask twice: an order already paid in the database is left alone", async () => {
    stored = "cs_test_stored001";
    sessions.set("cs_test_stored001", paidSession("cs_test_stored001"));
    markAnswer = "ALREADY_PAID";
    expect(await reconcileCardOrder(ORDER, "cs_test_stored001")).toBe(ORDER);
    expect(await reconcileCardOrder(ORDER, "cs_test_stored001")).toBe(ORDER);
    expect(marks()).toHaveLength(2);
  });

  it("draws the page anyway when Stripe, the key or the database does not answer", async () => {
    stored = "cs_test_stored001";
    retrieve.mockRejectedValueOnce(connection());
    expect(await reconcileCardOrder(ORDER)).toBe(ORDER);
    expect(errors).toHaveBeenCalled();
    stripeOn = false;
    expect(await reconcileCardOrder(ORDER)).toBe(ORDER);
    stripeOn = true;
    serviceOn = false;
    expect(await reconcileCardOrder(ORDER, "cs_test_stored001")).toBe(ORDER);
  });

  it("gives a back-office order Stripe's reference too, as the book will have it", async () => {
    stored = "cs_test_stored001";
    sessions.set("cs_test_stored001", paidSession("cs_test_stored001"));
    const admin: AdminOrder = { ...ORDER, owner: null, card: { checkout: true, paymentIntent: null } };
    const paid = await reconcileCardOrder(admin);
    expect(paid.card).toEqual({ checkout: true, paymentIntent: "pi_3Paid0001" });
    expect(paid.status.state).toBe("PAID");
  });
});

describe("reconcileCardOrder: a cancelled order, back from Stripe", () => {
  it("asks Stripe when the shopper comes back with the stored session: card_mark_paid says CANCELLED, the order stays so", async () => {
    stored = "cs_test_stored001";
    sessions.set("cs_test_stored001", paidSession("cs_test_stored001"));
    markAnswer = "CANCELLED";
    expect(await reconcileCardOrder(CANCELLED, "cs_test_stored001")).toBe(CANCELLED);
    expect(marks()).toHaveLength(1);
    expect(warns).toHaveBeenCalledTimes(1);
    expect(String(warns.mock.calls[0]![0])).toContain("DH-2433");
  });

  it("asks nothing when the URL's session is not the stored one", async () => {
    stored = "cs_test_stored001";
    sessions.set("cs_test_yesterday1", paidSession("cs_test_yesterday1"));
    expect(await reconcileCardOrder(CANCELLED, "cs_test_yesterday1")).toBe(CANCELLED);
    expect(retrieve).not.toHaveBeenCalled();
    expect(marks()).toEqual([]);
  });

  it("asks nothing, not even the database, at a plain view of a cancelled order", async () => {
    stored = "cs_test_stored001";
    sessions.set("cs_test_stored001", paidSession("cs_test_stored001"));
    expect(await reconcileCardOrder(CANCELLED)).toBe(CANCELLED);
    expect(rpc).not.toHaveBeenCalled();
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("never asks about an order paid, on its way or delivered, nor any order that is not a card order", async () => {
    stored = "cs_test_stored001";
    sessions.set("cs_test_stored001", paidSession("cs_test_stored001"));
    for (const order of [
      { ...ORDER, status: { state: "PAID" as const, paidAt: DUE } },
      { ...ORDER, status: { state: "SHIPPING" as const, shippedAt: DUE, trackingCode: "VNP-1" } },
      { ...ORDER, status: { state: "DELIVERED" as const, deliveredAt: DUE } },
      { ...ORDER, payment: "BANK_TRANSFER" as const },
    ]) {
      expect(await reconcileCardOrder(order, "cs_test_stored001")).toBe(order);
    }
    expect(rpc).not.toHaveBeenCalled();
    expect(retrieve).not.toHaveBeenCalled();
  });
});

describe("openCardCheckout: a Stripe page for a waiting card order", () => {
  it("makes the session from the order and keeps its id on the order", async () => {
    const opened = await openCardCheckout(ORDER, "http://127.0.0.1:3200", "en");
    expect(opened).toEqual({ kind: "OPENED", url: "https://checkout.stripe.com/c/pay/cs_test_new0001" });
    const params = create.mock.calls[0]![0] as Record<string, unknown>;
    expect(params).toMatchObject({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      client_reference_id: "DH-2433",
      metadata: { order_code: "DH-2433" },
      locale: "en",
      success_url: "http://127.0.0.1:3200/order-confirmed/DH-2433?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://127.0.0.1:3200/order-confirmed/DH-2433?payment=cancelled",
      expires_at: Math.floor(NOW / 1000) + 12 * 3600,
    });
    expect(params.line_items).toEqual([
      { quantity: 1, price_data: { currency: "vnd", unit_amount: TOTAL, product_data: { name: "Order DH-2433" } } },
    ]);
    expect(rpc).toHaveBeenCalledWith("card_checkout_opened", {
      p_code: "DH-2433",
      p_session_id: "cs_test_new0001",
      p_now: "2026-10-07T10:00:00+07:00",
    });
  });

  it("expires the page the order opened before, when it is still open, before making a new one", async () => {
    stored = "cs_test_old00001";
    sessions.set("cs_test_old00001", openSession("cs_test_old00001"));
    expect((await openCardCheckout(ORDER, "http://127.0.0.1:3200", "vi")).kind).toBe("OPENED");
    expect(expire).toHaveBeenCalledWith("cs_test_old00001");
    expect(expire.mock.invocationCallOrder[0]!).toBeLessThan(create.mock.invocationCallOrder[0]!);
  });

  it("opens nothing when the old page cannot be expired and is still unpaid: never two pages that take money", async () => {
    stored = "cs_test_old00001";
    sessions.set("cs_test_old00001", openSession("cs_test_old00001"));
    expire.mockRejectedValueOnce(connection());
    expect(await openCardCheckout(ORDER, "http://127.0.0.1:3200", "vi")).toEqual({ kind: "UNAVAILABLE" });
    expect(create).not.toHaveBeenCalled();
    expect(errors).toHaveBeenCalled();
  });

  it("opens nothing when the old page turns out paid a moment ago, as the expiry is refused: the order is PAID", async () => {
    stored = "cs_test_old00001";
    sessions.set("cs_test_old00001", openSession("cs_test_old00001"));
    expire.mockImplementationOnce(async (id: string) => {
      sessions.set(id, paidSession(id));
      throw Object.assign(new Error("already complete"), { type: "StripeInvalidRequestError", statusCode: 400 });
    });
    expect(await openCardCheckout(ORDER, "http://127.0.0.1:3200", "vi")).toEqual({ kind: "PAID" });
    expect(create).not.toHaveBeenCalled();
    expect(marks()).toHaveLength(1);
  });

  it("opens nothing when the old page is paid already: the order is marked paid instead", async () => {
    stored = "cs_test_old00001";
    sessions.set("cs_test_old00001", paidSession("cs_test_old00001"));
    expect(await openCardCheckout(ORDER, "http://127.0.0.1:3200", "vi")).toEqual({ kind: "PAID" });
    expect(create).not.toHaveBeenCalled();
    expect(marks()).toHaveLength(1);
  });

  it("opens nothing when Stripe cannot say what became of the old page, and opens one when Stripe knows no such page", async () => {
    stored = "cs_test_old00001";
    retrieve.mockRejectedValueOnce(connection());
    expect(await openCardCheckout(ORDER, "http://127.0.0.1:3200", "vi")).toEqual({ kind: "UNAVAILABLE" });
    expect(create).not.toHaveBeenCalled();
    // A sandbox made anew knows nothing of the old id: nothing left to take money.
    expect((await openCardCheckout(ORDER, "http://127.0.0.1:3200", "vi")).kind).toBe("OPENED");
  });

  it("refuses an order that is not a card order waiting for its money", async () => {
    expect(await openCardCheckout({ ...ORDER, payment: "BANK_TRANSFER" }, "http://x.test", "vi")).toEqual({ kind: "NOT_ALLOWED" });
    expect(await openCardCheckout(CANCELLED, "http://x.test", "vi")).toEqual({ kind: "NOT_ALLOWED" });
    expect(create).not.toHaveBeenCalled();
  });

  it("answers UNAVAILABLE without a key, without the service role, or when Stripe refuses to make the page", async () => {
    stripeOn = false;
    expect(await openCardCheckout(ORDER, "http://x.test", "vi")).toEqual({ kind: "UNAVAILABLE" });
    stripeOn = true;
    serviceOn = false;
    expect(await openCardCheckout(ORDER, "http://x.test", "vi")).toEqual({ kind: "UNAVAILABLE" });
    serviceOn = true;
    create.mockRejectedValueOnce(Object.assign(new Error(`Invalid API Key provided: ${KEYISH}`), { type: "StripeAuthenticationError" }));
    expect(await openCardCheckout(ORDER, "http://x.test", "vi")).toEqual({ kind: "UNAVAILABLE" });
  });

  it("expires a new page the database would not keep, and says why", async () => {
    openedError = { message: "NOT_ALLOWED" };
    expect(await openCardCheckout(ORDER, "http://x.test", "vi")).toEqual({ kind: "NOT_ALLOWED" });
    expect(expire).toHaveBeenCalledWith("cs_test_new0001");
  });
});

describe("closeCardCheckout: a cancelled card order's page takes no more money", () => {
  it("expires the stored session while Stripe still calls it open", async () => {
    stored = "cs_test_stored001";
    sessions.set("cs_test_stored001", openSession("cs_test_stored001"));
    await closeCardCheckout(CANCELLED);
    expect(expire).toHaveBeenCalledWith("cs_test_stored001");
    expect(sessions.get("cs_test_stored001")!.status).toBe("expired");
    expect(marks()).toEqual([]);
  });

  it("hands a page paid a moment before the expiry to card_mark_paid, which says CANCELLED and leaves the note", async () => {
    stored = "cs_test_stored001";
    sessions.set("cs_test_stored001", openSession("cs_test_stored001"));
    expire.mockImplementationOnce(async (id: string) => {
      sessions.set(id, paidSession(id));
      throw Object.assign(new Error("already complete"), { type: "StripeInvalidRequestError", statusCode: 400 });
    });
    markAnswer = "CANCELLED";
    await closeCardCheckout(CANCELLED);
    expect(marks()).toHaveLength(1);
    expect(errors).not.toHaveBeenCalled();
  });

  it("logs an expiry that failed for any other reason, and never throws", async () => {
    stored = "cs_test_stored001";
    sessions.set("cs_test_stored001", openSession("cs_test_stored001"));
    expire.mockRejectedValueOnce(connection());
    await expect(closeCardCheckout(CANCELLED)).resolves.toBeUndefined();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(marks()).toEqual([]);
  });

  it("hands a page already paid to card_mark_paid", async () => {
    stored = "cs_test_stored001";
    sessions.set("cs_test_stored001", paidSession("cs_test_stored001"));
    markAnswer = "CANCELLED";
    await closeCardCheckout(CANCELLED);
    expect(expire).not.toHaveBeenCalled();
    expect(marks()).toHaveLength(1);
  });

  it("costs nothing for any other order, an order that stored no session, or without a key", async () => {
    await closeCardCheckout({ ...CANCELLED, payment: "BANK_TRANSFER" });
    expect(rpc).not.toHaveBeenCalled();
    await closeCardCheckout(CANCELLED);
    expect(retrieve).not.toHaveBeenCalled();
    stripeOn = false;
    stored = "cs_test_stored001";
    await closeCardCheckout(CANCELLED);
    expect(retrieve).not.toHaveBeenCalled();
    expect(expire).not.toHaveBeenCalled();
  });
});
