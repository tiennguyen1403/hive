import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { ORDERS } from "@/data/orders";
import type { Order } from "@/data/types";
import { logRows } from "./activity-log";
import { paymentReturnText } from "./card-checkout";
import { needsAction } from "./admin-metrics";
import type { AdminOrder } from "./admin-orders";
import { orderNote } from "./admin-rows";
import { timelineOf } from "./admin-timeline";
import { CARD_OVERDUE_REASON, effectiveStatus } from "./customer-orders";
import type { AdminEvent } from "./db/event-dto";
import { cancelReasonLabel, cancelReasonText, feedStateLabel, paymentTitle } from "./feed-account";
import { STRIPE_TEST_CARD, feedPayments } from "./feed-checkout";
import { helpGroups } from "./feed-help";
import { inboxItems } from "./feed-inbox";
import { CONFIRM_STEPS_TEXT, confirmHold, confirmNext, confirmSteps, confirmTransfer } from "./feed-order";
import { vnd } from "./money";
import { internalNotes } from "./order-notes";
import { adminPaymentDetail, orderStateLabel, stateLabel, stateTabLabel } from "./order-labels";
import { orderTotalVnd } from "./orders";
import { ordersCsvRows } from "./orders-csv";

/**
 * Every new sentence of slice B18 (card payments on Stripe, QĐ-46), side by
 * side in both languages: a card order waiting for its money names what it
 * waits for, the order book's tab holds both kinds, a card order Stripe has
 * seen says "Stripe" — and a sample card order, paid before any gateway,
 * does not. Transfers keep every word they had.
 */

const NOW = new Date("2026-10-07T20:00:00+07:00");
const DUE = "2026-10-08T07:00:00+07:00";
const NB = " ";

/** DH-2431: a transfer waiting in the sample, one piece. */
const base = ORDERS.find((o) => String(o.code) === "DH-2431")!;
const cardWaiting: AdminOrder = {
  ...base,
  code: "DH-2440" as Order["code"],
  payment: "CARD",
  status: { state: "AWAITING_TRANSFER", dueAt: DUE },
  placedAt: "2026-10-07T19:00:00+07:00",
  owner: null,
  card: { checkout: true, paymentIntent: null },
};
const cardPaid: AdminOrder = {
  ...cardWaiting,
  code: "DH-2441" as Order["code"],
  status: { state: "PAID", paidAt: "2026-10-07T19:30:00+07:00" },
  card: { checkout: true, paymentIntent: "pi_3Paid0001" },
};
const samplePaidCard = ORDERS.find((o) => o.payment === "CARD" && o.status.state === "PAID")!;

describe("a card order waiting for its money", () => {
  it("is 'Chờ trả thẻ' / 'Awaiting card payment' wherever one order's state is printed", () => {
    expect(orderStateLabel(cardWaiting)).toEqual({ text: "Chờ trả thẻ", tone: "warn" });
    expect(orderStateLabel(cardWaiting, "en")).toEqual({ text: "Awaiting card payment", tone: "warn" });
    expect(feedStateLabel("AWAITING_TRANSFER", "vi", "CARD")).toBe("Chờ trả thẻ");
    expect(feedStateLabel("AWAITING_TRANSFER", "en", "CARD")).toBe("Awaiting card payment");
    expect(orderNote({ ...cardWaiting, status: { state: "RECEIVED" } }, NOW)).toEqual({ text: "chờ trả thẻ", late: false });
    expect(orderNote({ ...cardWaiting, status: { state: "RECEIVED" } }, NOW, "en")).toEqual({
      text: "awaiting card payment",
      late: false,
    });
  });

  it("leaves a transfer's every word as it was", () => {
    const transfer = { ...cardWaiting, payment: "BANK_TRANSFER" as const };
    expect(orderStateLabel(transfer)).toEqual(stateLabel("AWAITING_TRANSFER"));
    expect(orderStateLabel(transfer, "en").text).toBe("Awaiting transfer");
    expect(feedStateLabel("AWAITING_TRANSFER", "vi", "BANK_TRANSFER")).toBe("Chờ chuyển khoản");
    expect(confirmNext(transfer)).toBe("Chuyển khoản trong 12 giờ để giữ hàng.");
    expect(confirmTransfer(transfer)).not.toBeNull();
  });

  it("is asked to pay by card within the hold, with no transfer to make", () => {
    expect(confirmNext(cardWaiting)).toBe("Trả bằng thẻ trong 12 giờ để giữ hàng.");
    expect(confirmNext(cardWaiting, "en")).toBe("Pay by card within 12 hours to keep your items.");
    expect(confirmTransfer(cardWaiting)).toBeNull();
    expect(confirmHold(cardWaiting)).toMatchObject({ dueAt: DUE, note: "Quá giờ, đơn tự huỷ và 1 chiếc về kệ." });
    expect(confirmHold(cardWaiting, "en")!.note).toBe("Then it's cancelled and 1 item goes back in stock.");
    expect(CONFIRM_STEPS_TEXT.card).toEqual({
      vi: ["Đã đặt", "Chờ trả thẻ", "Đang giao", "Đã giao"],
      en: ["Placed", "Awaiting card payment", "Shipping", "Delivered"],
    });
    expect(confirmSteps(cardWaiting, "en").map((s) => [s.label, s.state])).toEqual([
      ["Placed", "done"],
      ["Awaiting card payment", "now"],
      ["Shipping", "todo"],
      ["Delivered", "todo"],
    ]);
  });

  it("is cancelled past its hold for want of a card payment: 'quá hạn thanh toán' / 'Payment overdue'", () => {
    const late = effectiveStatus(cardWaiting, new Date("2026-10-08T08:00:00+07:00"));
    expect(late).toEqual({ state: "CANCELLED", cancelledAt: DUE, reason: CARD_OVERDUE_REASON });
    expect(CARD_OVERDUE_REASON).toBe("quá hạn thanh toán");
    expect(cancelReasonText(CARD_OVERDUE_REASON)).toBe("Quá hạn thanh toán");
    expect(cancelReasonText(CARD_OVERDUE_REASON, "en")).toBe("Payment overdue");
    expect(cancelReasonLabel("Quá hạn thanh toán", "en")).toBe("Payment overdue");
  });

  it("says so in the inbox", () => {
    const src = { orders: [cardWaiting], favorites: [], reminders: [], catalog: FIXTURE_CATALOG, joinedAt: null, now: NOW };
    const titleOf = (locale: "vi" | "en") => inboxItems(src, locale).find((i) => i.title.startsWith("DH-2440"))?.title;
    expect(titleOf("vi")).toBe("DH-2440 chờ trả thẻ");
    expect(titleOf("en")).toBe("DH-2440 awaiting card payment");
  });

  it("is not in the shop's queue: Stripe confirms it", () => {
    expect(needsAction([cardWaiting, cardPaid]).map((o) => o.code)).toEqual(["DH-2441"]);
  });
});

describe("the order book's tab", () => {
  it("holds both kinds of waiting: 'Chờ thanh toán' / 'Awaiting payment'", () => {
    expect(stateTabLabel("AWAITING_TRANSFER")).toBe("Chờ thanh toán");
    expect(stateTabLabel("AWAITING_TRANSFER", "en")).toBe("Awaiting payment");
    expect(stateTabLabel("PAID", "en")).toBe(stateLabel("PAID", "en").text);
  });
});

describe("the checkout's card", () => {
  it("has the user's three lines in both languages, the test card held on one line", () => {
    const [vi, en] = [feedPayments("vi"), feedPayments("en")].map((list) => list.find((p) => p.method === "CARD")!);
    expect([vi!.title, vi!.note, vi!.hint]).toEqual([
      "Thẻ (Visa, Mastercard)",
      "Trả trên trang Stripe, chế độ thử.",
      `Thẻ thử 4242${NB}4242${NB}4242${NB}4242, hạn và CVC bất kỳ.`,
    ]);
    expect([en!.title, en!.note, en!.hint]).toEqual([
      "Card (Visa, Mastercard)",
      "Pay on Stripe's page, test mode.",
      `Test card 4242${NB}4242${NB}4242${NB}4242, any expiry and CVC.`,
    ]);
    expect(STRIPE_TEST_CARD).not.toContain(" ");
    expect(feedPayments("vi").filter((p) => p.hint)).toHaveLength(1);
    expect(paymentTitle("CARD", "en")).toBe("Card (Visa, Mastercard)");
  });

  it("is answered in Hỏi đáp as it now is", () => {
    const answer = (locale: "vi" | "en") =>
      helpGroups(null, locale)
        .flatMap((g) => g.items)
        .find((i) => i.id === "q-thanh-toan-3")!
        .a.map((bit) => (typeof bit === "string" ? bit : bit.b))
        .join("");
    expect(answer("vi")).toBe("Được. Trả trên trang Stripe, chế độ thử. Đơn chọn thẻ có cùng hạn giữ hàng với chuyển khoản.");
    expect(answer("en")).toBe("Yes. Pay on Stripe's page, test mode. Card orders have the same reservation time as bank transfers.");
  });

  it("is cancelled in Hỏi đáp as a transfer is, in the user's words (07/10): 'hoặc', not 'hay'", () => {
    const answer = (locale: "vi" | "en", q: string) =>
      helpGroups(null, locale)
        .flatMap((g) => g.items)
        .find((i) => i.q === q)!
        .a.map((bit) => (typeof bit === "string" ? bit : bit.b))
        .join("");
    expect(answer("vi", "Huỷ đơn thế nào?")).toBe(
      "Ở trang đơn: đơn chuyển khoản hoặc thẻ huỷ được tới khi trả tiền, đơn COD tới khi cửa hàng gọi xác nhận. " +
        "Đơn chuyển khoản hoặc thẻ hết hạn giữ hàng mà chưa trả thì tự huỷ.",
    );
    expect(answer("en", "How do I cancel an order?")).toBe(
      "On the order page: a bank transfer or card order can be cancelled until it's paid, a COD order until the shop " +
        "calls to confirm. An unpaid bank transfer or card order cancels itself when its reservation runs out.",
    );
  });
});

describe("the receipt, back from Stripe without paying", () => {
  it("says only 'Chưa trả.' after Stripe's '←' — the hold below prints the hour — and why when no page opened", () => {
    expect(paymentReturnText("cancelled")).toBe("Chưa trả.");
    expect(paymentReturnText("cancelled", "en")).toBe("Not paid yet.");
    expect(paymentReturnText("failed")).toBe("Chưa mở được trang thanh toán. Đơn vẫn được giữ.");
    expect(paymentReturnText("failed", "en")).toBe("Couldn't open the payment page. Your order is still reserved.");
  });
});

describe("the back office, on evidence", () => {
  it("names Stripe on a card order Stripe has seen, with the payment intent once paid, and never on the sample's", () => {
    expect(adminPaymentDetail(cardWaiting)).toBe("Thẻ · Stripe");
    expect(adminPaymentDetail(cardWaiting, "en")).toBe("Card · Stripe");
    expect(adminPaymentDetail(cardPaid)).toBe("Thẻ · Stripe · pi_3Paid0001");
    expect(adminPaymentDetail(cardPaid, "en")).toBe("Card · Stripe · pi_3Paid0001");
    expect(adminPaymentDetail(samplePaidCard)).toBe("Thẻ");
    expect(adminPaymentDetail({ ...cardWaiting, card: { checkout: false, paymentIntent: null } }, "en")).toBe("Card");
    expect(adminPaymentDetail({ ...cardWaiting, payment: "BANK_TRANSFER" })).toBe("Chuyển khoản");
  });

  it("reads the journey the same way: 'Chờ trả thẻ', then 'Đã thanh toán qua Stripe' only with Stripe's reference", () => {
    expect(timelineOf(cardWaiting, NOW)[1]!.title).toBe("Chờ trả thẻ");
    expect(timelineOf(cardWaiting, NOW, undefined, "en")[1]!.title).toBe("Awaiting card payment");
    expect(timelineOf(cardPaid, NOW)[1]!.title).toBe("Đã thanh toán qua Stripe");
    expect(timelineOf(cardPaid, NOW, undefined, "en")[1]!.title).toBe("Paid via Stripe");
    expect(timelineOf(samplePaidCard, NOW)[1]!.title).toBe("Đã thanh toán");
  });

  it("prints the CSV's payment and state the same way", () => {
    const [, waiting, paid] = ordersCsvRows(FIXTURE_CATALOG, [cardWaiting, cardPaid]);
    expect(waiting!.slice(-2)).toEqual(["Thẻ · Stripe", "Chờ trả thẻ"]);
    expect(paid!.slice(-2)).toEqual(["Thẻ · Stripe · pi_3Paid0001", "Đã thanh toán"]);
    const [, enWaiting] = ordersCsvRows(FIXTURE_CATALOG, [cardWaiting], "en");
    expect(enWaiting!.slice(-2)).toEqual(["Card · Stripe", "Awaiting card payment"]);
    const [, sample] = ordersCsvRows(FIXTURE_CATALOG, [{ ...samplePaidCard, owner: null }]);
    expect(sample!.slice(-2)).toEqual(["Thẻ", "Đã thanh toán"]);
  });
});

describe("the log and the order's notes", () => {
  const book: AdminOrder[] = [cardWaiting, cardPaid];
  const ev = (e: Partial<AdminEvent> & Pick<AdminEvent, "kind">, id: number): AdminEvent =>
    ({ id, at: "2026-10-07T19:30:00+07:00", actorRole: "system", actor: "", code: "DH-2441", ...e }) as AdminEvent;
  const stripePaid = ev({ kind: "ORDER_PAID", from: "AWAITING_TRANSFER", via: "STRIPE", paymentIntent: "pi_3Paid0001" } as never, 1);
  const lateNote = ev({ kind: "ORDER_NOTE", text: "x", via: "STRIPE", paymentIntent: "pi_3Late0001" } as never, 2);
  const expired = ev({ kind: "ORDER_EXPIRED", code: "DH-2440" } as never, 3);
  const placed = ev({ kind: "ORDER_PLACED", actorRole: "customer", code: "DH-2440" } as never, 4);

  it("calls a Stripe payment by its name, not a matched transfer", () => {
    const [vi] = logRows(FIXTURE_CATALOG, [stripePaid], book, NOW);
    expect(vi).toMatchObject({ action: "Trả bằng thẻ", detail: "qua Stripe", before: "chờ trả thẻ", after: "đã thanh toán" });
    const [en] = logRows(FIXTURE_CATALOG, [stripePaid], book, NOW, "en");
    expect(en).toMatchObject({ action: "Paid by card", detail: "via Stripe", before: "awaiting card payment", after: "paid" });
    const total = orderTotalVnd(cardPaid);
    expect(internalNotes([stripePaid], cardPaid).map((n) => n.text)).toEqual([
      `Đã thanh toán qua Stripe · pi_3Paid0001 · ${vnd(total)}`,
    ]);
    expect(internalNotes([stripePaid], cardPaid, "en").map((n) => n.text)).toEqual([
      `Paid via Stripe · pi_3Paid0001 · ${vnd(total, "en")}`,
    ]);
  });

  it("says no card payment came when a card order's hold ran out", () => {
    const [vi] = logRows(FIXTURE_CATALOG, [expired], book, NOW);
    expect(vi).toMatchObject({ action: "Huỷ đơn", detail: "quá 12 giờ chưa thanh toán", before: "chờ trả thẻ" });
    const [en] = logRows(FIXTURE_CATALOG, [expired], book, NOW, "en");
    expect(en).toMatchObject({ detail: "no payment within 12 hours", before: "awaiting card payment" });
    expect(internalNotes([expired], cardWaiting).map((n) => n.text)).toEqual(["Huỷ đơn · lý do: quá hạn thanh toán."]);
    expect(internalNotes([expired], cardWaiting, "en").map((n) => n.text)).toEqual(["Order cancelled · reason: payment overdue."]);
  });

  it("files a card order placed as waiting for a card payment", () => {
    expect(logRows(FIXTURE_CATALOG, [placed], book, NOW, "en")[0]).toMatchObject({ detail: "card", after: "awaiting card payment" });
  });

  it("writes the shop a note, as the system, when Stripe took the money of an order already cancelled", () => {
    const [vi] = logRows(FIXTURE_CATALOG, [lateNote], book, NOW);
    expect(vi).toMatchObject({ author: "Hệ thống", tail: "Stripe nhận tiền sau khi đơn đã huỷ · pi_3Late0001 · hoàn tiền tay trên Stripe" });
    const [en] = logRows(FIXTURE_CATALOG, [lateNote], book, NOW, "en");
    expect(en!.tail).toBe("Stripe took the payment after the order was cancelled · pi_3Late0001 · refund it by hand on Stripe");
    expect(internalNotes([lateNote], cardPaid, "en")).toEqual([
      {
        text: "Stripe took the payment after the order was cancelled · pi_3Late0001 · refund it by hand on Stripe",
        author: "",
        at: "2026-10-07T19:30:00+07:00",
        system: true,
      },
    ]);
  });
});
