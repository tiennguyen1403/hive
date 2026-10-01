import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG as C } from "@/data/fixture-catalog";
import { productId, type ColorKey, type Order, type OrderStatus, type PaymentMethod, type Size } from "@/data/types";
import { CANCEL_REASONS } from "./admin-orders";
import { resolveCart, type Cart } from "./cart";
import { validateCheckout, type CheckoutDraft } from "./checkout-form";
import { CUSTOMER_CANCEL_REASON, OVERDUE_REASON } from "./customer-orders";
import {
  cancelReasonLabel,
  cancelReasonText,
  groupLabel,
  groupLabelIn,
  lookupCheck,
  orderSteps,
  stepStamp,
} from "./feed-account";
import { cartSummary, problemText } from "./feed-cart";
import {
  FEED_DELIVERY,
  FEED_PAYMENTS,
  checkoutRows,
  deliverySub,
  expressOffNote,
  expressSwitchNote,
  feedDeliveries,
  feedDelivery,
  feedDeliveryWindow,
  feedFormErrors,
  feedPayments,
  feedPromoCheck,
  feedSentence,
} from "./feed-checkout";
import {
  BACK_IN_STOCK_EN,
  CONFIRM_STEPS,
  codFeeRow,
  confirmLines,
  confirmNext,
  confirmRows,
  confirmShipRows,
  confirmSteps,
  confirmTransfer,
  followLink,
} from "./feed-order";
import {
  LOOKUP_TEXT,
  LOOKUP_WORDS,
  lookupResultOf,
  lookupWordIn,
  lookupWords,
  readLookup,
} from "./order-lookup";
import { cancelFailureMessage, placeFailureMessage, readPlaceOrderPayload, type OrderFailure } from "./order-payload";
import { checkPromoCode } from "./promotions";
import { rateLimitMessage } from "./rate-limit";
import { checkoutTotals } from "./shipping";

/**
 * Round v6 slice E2 (QĐ-40): the English of what the basket, the checkout, the
 * receipt and the lookup print, and of the sentences their Server Actions
 * answer with, in the words of the user's glossary (`tasks/plan.md`, "Thuật
 * ngữ tiếng Anh"): Bag, Checkout, Track an order, the order states, "Cash on
 * delivery (COD)", Drop 05, Basics, "N left", "1 Oct", "390,000₫". The
 * Vietnamese side is pinned by each function's own test, untouched; these also
 * check that asking for Vietnamese by name gives what asking for nothing gives.
 */

const NBSP = " ";
/** The Feed's range between two dates: a no-break space, the hyphen, a word joiner, a no-break space. */
const R = (a: string, b: string) => `${a}${NBSP}-⁠${NBSP}${b}`;
/** The Feed's range between two numbers, held tight by word joiners. */
const TIGHT = (a: string, b: string) => `${a}⁠-⁠${b}`;
const LONG_DASH = /[–—]/;
/** An English day and its month, held together by a no-break space (`dayMonth`): "23 Sep". */
const D = (day: number, month: string) => `${day}${NBSP}${month}`;

const PLACED = "2026-09-21T19:02:00+07:00";
const DUE = "2026-09-22T07:02:00+07:00";
/** Inside every live fixture code's window; Số 05 sells 11/09 20:00 → 25/09 20:00 in the fixture. */
const DURING = new Date("2026-09-21T19:02:00+07:00");
const AFTER = new Date("2026-09-28T19:02:00+07:00");

function order(payment: PaymentMethod, status: OrderStatus, extra: Partial<Order> = {}): Order {
  return {
    code: "DH-1507" as Order["code"],
    customerId: "" as Order["customerId"],
    lines: [
      { productId: productId("p-suong"), color: "moss", size: "L", qty: 1, unitPriceVnd: 1_450_000 },
      { productId: productId("p-khoi"), color: "black", size: "M", qty: 2, unitPriceVnd: 390_000 },
      { productId: productId("p-ao-thun-tron"), color: "white", size: "L", qty: 1, unitPriceVnd: 400_000 },
    ],
    status,
    payment,
    delivery: "STANDARD",
    shippingFeeVnd: 0,
    codFeeVnd: payment === "COD" ? 15_000 : 0,
    discountVnd: 0,
    shipTo: { recipient: "Trần Minh Khoa", phone: "0938571204", provinceCode: "29", wardCode: "70101063", line: "12 Nguyễn Huệ" },
    email: "khoa@example.com",
    note: "",
    placedAt: PLACED,
    ...extra,
  };
}
const waiting = (p: PaymentMethod = "BANK_TRANSFER") => order(p, { state: "AWAITING_TRANSFER", dueAt: DUE });
const cancelled = (reason: string) => order("BANK_TRANSFER", { state: "CANCELLED", cancelledAt: DUE, reason });

const line = (stem: string, color: ColorKey, size: Size, qty: number) => ({ productId: productId(`p-${stem}`), color, size, qty });
const one = (cart: Cart, now = DURING) => resolveCart(C, now, cart).lines[0]!;

describe("the rate limit's sentence in English", () => {
  it("names the wait in minutes or hours, singular or plural, never zero", () => {
    expect(rateLimitMessage("lookup", 200, "en")).toBe("Too many tries in a row. Try again in 4 minutes.");
    expect(rateLimitMessage("lookup", 30, "en")).toBe("Too many tries in a row. Try again in 1 minute.");
    expect(rateLimitMessage("lookup", 0, "en")).toBe("Too many tries in a row. Try again in 1 minute.");
    expect(rateLimitMessage("order_place", 3_600, "en")).toBe("Too many tries in a row. Try again in 1 hour.");
    expect(rateLimitMessage("sign_in", 7_201, "en")).toBe("Too many tries in a row. Try again in 3 hours.");
  });

  it("says what the two other buckets are about", () => {
    expect(rateLimitMessage("order_units", 600, "en")).toBe("Each shopper can order up to 60 items a day. Try again in 10 minutes.");
    expect(rateLimitMessage("upload_global", 7_200, "en")).toBe("The photo store is full for today. Try again in 2 hours.");
  });

  it("is the Vietnamese one when asked by name", () => {
    for (const bucket of ["lookup", "order_units", "upload_global"] as const) {
      expect(rateLimitMessage(bucket, 200, "vi")).toBe(rateLimitMessage(bucket, 200));
    }
  });
});

describe("the lookup's words", () => {
  it("are the mock's sentences in English", () => {
    expect(lookupWords("en")).toEqual({
      codeMissing: "Enter an order code",
      codeShape: "Order codes look like DH-1499",
      phoneMissing: "Enter a phone number",
      phoneShape: "Phone numbers have 10 digits, starting with 0",
      noOrder: "No order has this code",
      phoneMismatch: "This phone number doesn't match the order",
      unavailable: "Couldn't look up the order. Try again in a few minutes.",
    });
    expect(LOOKUP_WORDS).toEqual(lookupWords("vi"));
    expect(lookupWords()).toEqual(lookupWords("vi"));
  });

  it("reword a sentence of either language in the other, and leave anything else alone", () => {
    for (const pair of Object.values(LOOKUP_TEXT)) {
      expect(lookupWordIn(pair.vi, "en")).toBe(pair.en);
      expect(lookupWordIn(pair.en, "vi")).toBe(pair.vi);
      expect(lookupWordIn(pair.vi, "vi")).toBe(pair.vi);
    }
    expect(lookupWordIn("Too many tries in a row. Try again in 4 minutes.", "vi")).toBe(
      "Too many tries in a row. Try again in 4 minutes.",
    );
  });

  it("are what the form's check and the server's answer say in English", () => {
    expect(readLookup("", "", "en")).toEqual({
      ok: false,
      errors: { code: "Enter an order code", phone: "Enter a phone number" },
    });
    expect(readLookup("DH-12", "123", "en")).toEqual({
      ok: false,
      errors: { code: "Order codes look like DH-1499", phone: "Phone numbers have 10 digits, starting with 0" },
    });
    expect(lookupCheck("", "", "en")).toEqual({
      ok: false,
      errors: { code: "Enter an order code", phone: "Enter a phone number" },
    });
    expect(lookupCheck("dh2425", "0908 221 447", "en")).toEqual(lookupCheck("dh2425", "0908 221 447"));
    expect(lookupResultOf({ ok: false, reason: "NO_ORDER" }, "en")).toEqual({
      ok: false,
      reason: "NO_ORDER",
      errors: { code: "No order has this code" },
    });
    expect(lookupResultOf({ ok: false, reason: "PHONE_MISMATCH" }, "en")).toEqual({
      ok: false,
      reason: "PHONE_MISMATCH",
      errors: { phone: "This phone number doesn't match the order" },
    });
  });

  it("keep a rate limit's sentence as the server wrote it", () => {
    const message = "Too many tries in a row. Try again in 4 minutes.";
    expect(lookupResultOf({ ok: false, reason: "RATE_LIMITED", message, retryAfterSeconds: 200 }, "en")).toEqual({
      ok: false,
      reason: "RATE_LIMITED",
      message,
    });
  });
});

describe("the order's refusals in English", () => {
  const failures: OrderFailure[] = [
    "OUT_OF_STOCK",
    "DROP_CLOSED",
    "PROMO_INVALID",
    "EMPTY_ORDER",
    "BAD_INPUT",
    "NOT_OWNER",
    "NOT_CANCELLABLE",
    "UNAVAILABLE",
  ];

  it("say what to do next, with no long dash, so the Feed prints them as they are", () => {
    expect(placeFailureMessage("OUT_OF_STOCK", "en")).toBe(
      "An item just sold out. Open your bag to change the size or remove it.",
    );
    expect(placeFailureMessage("DROP_CLOSED", "en")).toBe(
      "The drop has closed. An item in your bag is no longer on sale.",
    );
    expect(placeFailureMessage("UNAVAILABLE", "en")).toBe("Couldn't place the order. Try again in a few minutes.");
    for (const f of failures) {
      expect(placeFailureMessage(f, "en")).not.toMatch(LONG_DASH);
      expect(feedSentence(placeFailureMessage(f, "en"))).toBe(placeFailureMessage(f, "en"));
      expect(cancelFailureMessage(f, "en")).not.toMatch(LONG_DASH);
      expect(placeFailureMessage(f, "vi")).toBe(placeFailureMessage(f));
      expect(cancelFailureMessage(f, "vi")).toBe(cancelFailureMessage(f));
    }
    expect(cancelFailureMessage("NOT_OWNER", "en")).toBe("This order isn't in your account.");
    expect(cancelFailureMessage("NOT_CANCELLABLE", "en")).toBe("This order can no longer be cancelled. Contact the shop.");
  });

  const draft: CheckoutDraft = {
    recipient: "Trần Minh Anh",
    phone: "0912 345 678",
    email: "",
    provinceCode: "29",
    wardCode: "70101063",
    line: "24 Nguyễn Thị Minh Khai",
    note: "",
    delivery: "STANDARD",
    payment: "COD",
  };
  const payload = (d: Partial<CheckoutDraft>, lines = [{ productId: "p-khoi", color: "black", size: "M", qty: 1 }]) => ({
    lines,
    draft: { ...draft, ...d },
    promoCode: null,
  });

  it("re-read on the server, answer the first thing wrong in English", () => {
    expect(readPlaceOrderPayload("nonsense", "en")).toEqual({ ok: false, message: placeFailureMessage("BAD_INPUT", "en") });
    expect(readPlaceOrderPayload(payload({}, []), "en")).toEqual({ ok: false, message: placeFailureMessage("EMPTY_ORDER", "en") });
    expect(readPlaceOrderPayload(payload({}, [{ productId: "p-khoi", color: "black", size: "M", qty: 21 }]), "en")).toEqual({
      ok: false,
      message: "An order takes up to 20 items.",
    });
    expect(readPlaceOrderPayload(payload({ phone: "12345" }), "en")).toEqual({
      ok: false,
      message: "The phone number isn't right. It has 10 digits, starting with 0.",
    });
    expect(readPlaceOrderPayload(payload({ note: "x".repeat(501) }), "en")).toEqual({
      ok: false,
      message: "A note takes up to 500 characters.",
    });
    expect(readPlaceOrderPayload(payload({}), "en").ok).toBe(true);
    expect(readPlaceOrderPayload(payload({ phone: "12345" }), "vi")).toEqual(readPlaceOrderPayload(payload({ phone: "12345" })));
  });

  it("check the form the way the Vietnamese does, field by field", () => {
    expect(
      validateCheckout(
        { ...draft, recipient: " ", phone: "", email: "a@b", provinceCode: "", wardCode: "", line: "", delivery: "EXPRESS" },
        "en",
      ),
    ).toEqual({
      recipient: "A recipient's name is needed.",
      phone: "A phone number is needed for the courier to call.",
      email: "The email isn't in a valid format.",
      provinceCode: "Choose a province or city.",
      wardCode: "Choose a ward or commune.",
      line: "A house number and street are needed.",
      delivery: "Express delivery only runs in central HCMC.",
    });
    expect(validateCheckout({ ...draft, provinceCode: "01" }, "en").wardCode).toBe(
      "This ward or commune isn't in the chosen province.",
    );
    expect(validateCheckout({ ...draft, phone: "" }, "vi")).toEqual(validateCheckout({ ...draft, phone: "" }));
  });
});

describe("the codes in English", () => {
  it("refuse in the app's words with the code named", () => {
    expect(checkPromoCode(C, "", 900_000, DURING, "en")).toEqual({ ok: false, message: "Enter a discount code before applying it." });
    expect(checkPromoCode(C, "XYZ", 900_000, DURING, "en")).toEqual({ ok: false, message: "There is no code XYZ." });
    expect(checkPromoCode(C, "VIP20", 3_000_000, DURING, "en")).toEqual({ ok: false, message: "Code VIP20 has been used up." });
    expect(checkPromoCode(C, "DOT05", 420_000, DURING, "en")).toEqual({
      ok: false,
      message: "Code DOT05 needs an order from 500,000₫.",
    });
  });

  it("refuse in the mock's words on the checkout", () => {
    expect(feedPromoCheck(C, "  ", 900_000, DURING, "en")).toEqual({ ok: false, message: "Enter a discount code" });
    expect(feedPromoCheck(C, "XYZ", 900_000, DURING, "en")).toEqual({ ok: false, message: "This code doesn't exist" });
    expect(feedPromoCheck(C, "DOT04", 2_000_000, DURING, "en")).toEqual({ ok: false, message: "This code has expired" });
    expect(feedPromoCheck(C, "VIP20", 3_000_000, DURING, "en")).toEqual({ ok: false, message: "This code has been used up" });
    expect(feedPromoCheck(C, "DOT05", 420_000, DURING, "en")).toEqual({
      ok: false,
      message: "This code needs an order from 500,000₫",
    });
    expect(feedPromoCheck(C, "DOT05", 900_000, new Date("2026-09-01T10:00:00+07:00"), "en")).toEqual({
      ok: false,
      message: "This code isn't active yet",
    });
    expect(feedPromoCheck(C, "dot05", 900_000, DURING, "en").ok).toBe(true);
    expect(feedPromoCheck(C, "XYZ", 900_000, DURING, "vi")).toEqual(feedPromoCheck(C, "XYZ", 900_000, DURING));
  });
});

describe("the checkout's cards in English", () => {
  it("name the two services, their days from the label and express's city in Vietnamese", () => {
    expect(feedDelivery("STANDARD", "en")).toEqual({
      method: "STANDARD",
      title: "Standard delivery",
      days: `${TIGHT("2", "4")} days`,
      note: null,
    });
    expect(feedDelivery("EXPRESS", "en")).toEqual({
      method: "EXPRESS",
      title: "Express city delivery",
      days: "24 hours",
      note: "Central HCMC only, during office hours",
    });
    expect(feedDeliveries("en").map((d) => d.method)).toEqual(FEED_DELIVERY.map((d) => d.method));
    expect(feedDeliveries("vi")).toBe(FEED_DELIVERY);
    expect(feedDelivery("EXPRESS", "vi")).toEqual(feedDelivery("EXPRESS"));
  });

  it("date the window the glossary's way", () => {
    expect(feedDeliveryWindow("STANDARD", PLACED, "en")).toBe(R(D(23, "Sep"), D(25, "Sep")));
    expect(feedDeliveryWindow("EXPRESS", PLACED, "en")).toBe(D(22, "Sep"));
    expect(deliverySub("STANDARD", PLACED, "en")).toBe(`${TIGHT("2", "4")} days · expected ${R(D(23, "Sep"), D(25, "Sep"))}`);
    expect(deliverySub("EXPRESS", PLACED, "en")).toBe(`24 hours · expected ${D(22, "Sep")}`);
    expect(deliverySub("STANDARD", PLACED, "vi")).toBe(deliverySub("STANDARD", PLACED));
  });

  it("say where express does not go, and that it moved to the standard service", () => {
    expect(expressOffNote("Hà Nội", "en")).toBe("No express delivery to Hà Nội");
    expect(expressSwitchNote("TP. Hồ Chí Minh", "en")).toBe("Express only runs in HCMC, so delivery is now standard");
    expect(expressSwitchNote("TP. Hồ Chí Minh", "vi")).toBe(expressSwitchNote("TP. Hồ Chí Minh"));
    expect(expressOffNote("Hà Nội", "vi")).toBe(expressOffNote("Hà Nội"));
  });

  it("are the three ways to pay, the checkout naming COD in full", () => {
    expect(feedPayments("en").map((p) => [p.method, p.title, p.note, p.price])).toEqual([
      [
        "BANK_TRANSFER",
        "Bank transfer",
        "Reserved for 12 hours. Transfer details are on the next screen.",
        null,
      ],
      ["COD", `Cash on delivery${NBSP}(COD)`, "Check before you pay.", "+15,000₫"],
      ["CARD", "Card (domestic, Visa)", "For now, paid by bank transfer.", null],
    ]);
    expect(feedPayments("vi")).toBe(FEED_PAYMENTS);
  });

  it("check the contact and the address in English", () => {
    const empty = { name: "", phone: "", email: "", provinceCode: "", wardCode: "", street: "" };
    expect(feedFormErrors(empty, "en")).toEqual({
      name: "Enter your full name",
      phone: "Enter a phone number",
      province: "Choose province / city",
      street: "Enter house number and street",
    });
    expect(feedFormErrors({ ...empty, phone: "123", email: "a@b", provinceCode: "29" }, "en")).toMatchObject({
      phone: "Phone numbers have 10 digits, starting with 0",
      email: "This email isn't valid",
      ward: "Choose ward / commune",
    });
    expect(feedFormErrors(empty, "vi")).toEqual(feedFormErrors(empty));
  });

  it("sum the order up in English", () => {
    const totals = checkoutTotals({ subtotalVnd: 420_000, delivery: "STANDARD", payment: "COD" });
    expect(checkoutRows(totals, null, "en")).toEqual([
      { label: "Subtotal", value: "420,000₫" },
      { label: "Delivery", value: "30,000₫" },
      { label: "COD surcharge", value: "+15,000₫" },
    ]);
    const free = checkoutTotals({ subtotalVnd: 1_200_000, delivery: "STANDARD", payment: "BANK_TRANSFER" });
    expect(checkoutRows(free, "FREESHIP", "en")).toEqual([
      { label: "Subtotal", value: "1,200,000₫" },
      { label: "Delivery", value: "Free" },
      { label: "Code FREESHIP", value: "Free delivery" },
    ]);
    expect(checkoutRows(totals, "DOT05", "vi")).toEqual(checkoutRows(totals, "DOT05"));
  });
});

describe("the basket in English", () => {
  it("says why a line cannot be bought, and its fix", () => {
    expect(problemText(C, one([line("bui", "black", "M", 1)]), DURING, "en")).toBe("Out of size M. Swap it to check out.");
    expect(problemText(C, one([line("muoi", "black", "M", 1)]), DURING, "en")).toBe("Out of size M. Remove it to check out.");
    expect(problemText(C, one([line("khoi", "black", "M", 1)], AFTER), AFTER, "en")).toBe("Drop 05 closed. Remove it to check out.");
    expect(problemText(C, one([line("nguoi", "black", "M", 5)]), DURING, "en")).toBe("Only 2 left. Lower the quantity to check out.");
    expect(problemText(C, one([line("khoi", "black", "M", 2)]), DURING, "en")).toBeNull();
    const l = one([line("bui", "black", "M", 1)]);
    expect(problemText(C, l, DURING, "vi")).toBe(problemText(C, l, DURING));
  });

  it("dates the standard window in English", () => {
    const lines = resolveCart(C, DURING, [line("khoi", "black", "M", 1)]).lines;
    expect(cartSummary(C, lines, DURING, PLACED, "en").window).toBe(R(D(23, "Sep"), D(25, "Sep")));
    expect(cartSummary(C, lines, DURING, PLACED, "vi")).toEqual(cartSummary(C, lines, DURING, PLACED));
  });
});

describe("the receipt in English", () => {
  it("lights the steps in the glossary's states", () => {
    expect(confirmSteps(waiting(), "en")).toEqual([
      { label: "Placed", state: "done" },
      { label: "Awaiting transfer", state: "now" },
      { label: "Shipping", state: "todo" },
      { label: "Delivered", state: "todo" },
    ]);
    expect(confirmSteps(order("COD", { state: "RECEIVED" }), "en").map((s) => s.label)).toEqual([
      "Placed",
      "Call to confirm",
      "Shipping",
      "Delivered",
    ]);
    expect(confirmSteps(cancelled(OVERDUE_REASON), "en")).toEqual([
      { label: "Placed", state: "done" },
      { label: "Cancelled", state: "now" },
    ]);
    expect(confirmSteps(waiting(), "vi")).toEqual(confirmSteps(waiting()));
    expect(CONFIRM_STEPS.cod).toEqual(["Đã đặt", "Gọi xác nhận", "Đang giao", "Đã giao"]);
  });

  it("says what happens next, or what happened", () => {
    expect(confirmNext(waiting(), "en")).toBe("Transfer within 12 hours to keep your items.");
    expect(confirmNext(order("COD", { state: "RECEIVED" }), "en")).toBe("The shop will call to confirm before delivery.");
    expect(confirmNext(order("CARD", { state: "RECEIVED" }), "en")).toBe("For now, paid by bank transfer.");
    expect(confirmNext(order("BANK_TRANSFER", { state: "PAID", paidAt: DUE }), "en")).toBe("Paid.");
    expect(confirmNext(order("BANK_TRANSFER", { state: "SHIPPING", shippedAt: DUE, trackingCode: "VNP-1" }), "en")).toBe(
      "Shipping.",
    );
    expect(confirmNext(cancelled("quá hạn chuyển khoản"), "en")).toBe(`Transfer overdue. ${BACK_IN_STOCK_EN}`);
    expect(confirmNext(cancelled("Quá hạn chuyển khoản"), "en")).toBe("Transfer overdue. Items back in stock.");
    expect(confirmNext(cancelled("Khách đổi ý"), "en")).toBe("Change of mind. Items back in stock.");
    expect(confirmNext(cancelled("giao lỗi"), "en")).toBe("giao lỗi. Items back in stock.");
    expect(confirmNext(cancelled("Khách đổi ý"), "vi")).toBe(confirmNext(cancelled("Khách đổi ý")));
  });

  it("holds the transfer to the clock the glossary's way", () => {
    expect(confirmTransfer(waiting(), "en")).toEqual({
      amountVnd: 2_630_000,
      memo: "DH1507",
      dueAt: DUE,
      until: `07:02, Tuesday ${D(22, "Sep")}`,
      note: "Then it's cancelled and 4 items go back in stock.",
    });
    const single = order("BANK_TRANSFER", { state: "AWAITING_TRANSFER", dueAt: DUE }, {
      lines: [{ productId: productId("p-khoi"), color: "black", size: "M", qty: 1, unitPriceVnd: 390_000 }],
    });
    expect(confirmTransfer(single, "en")?.note).toBe("Then it's cancelled and 1 item goes back in stock.");
    expect(confirmTransfer(waiting(), "vi")).toEqual(confirmTransfer(waiting()));
  });

  it("keeps the recipient and the address Vietnamese, and says so", () => {
    const address = "12 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh";
    expect(confirmShipRows(waiting(), address, "en")).toEqual([
      { label: "Standard delivery", value: `expected ${R(D(23, "Sep"), D(25, "Sep"))}` },
      { label: "Recipient", value: `Trần Minh Khoa, 0938${NBSP}571${NBSP}204`, lang: "vi" },
      { label: "Address", value: address, lang: "vi" },
    ]);
    // Nothing marked on a Vietnamese page, whose <html> says it already.
    expect(confirmShipRows(waiting(), address, "vi").every((r) => r.lang === undefined)).toBe(true);
    expect(confirmShipRows(waiting(), address, "vi")).toEqual(confirmShipRows(waiting(), address));
  });

  it("prices the summary as the order was, in English", () => {
    expect(confirmRows(order("COD", { state: "RECEIVED" }), "en")).toEqual([
      { label: "Subtotal", value: "2,630,000₫" },
      { label: "Delivery", value: "Free" },
      { label: "COD surcharge", value: "+15,000₫" },
    ]);
    const coded = order("BANK_TRANSFER", { state: "AWAITING_TRANSFER", dueAt: DUE }, { promo: "DOT05" as Order["promo"], discountVnd: 150_000 });
    expect(confirmRows(coded, "en").at(-1)).toEqual({ label: "Code DOT05", value: "-150,000₫" });
    expect(codFeeRow({ codFeeVnd: 15_000 }, "en")).toEqual({ label: "COD surcharge", value: "+15,000₫" });
    expect(confirmRows(coded, "vi")).toEqual(confirmRows(coded));
  });

  it("names each line by the style's English, a drop style's Vietnamese marked", () => {
    const lines = confirmLines(C, waiting(), "en");
    expect(lines.map((l) => [l.name, l.nameLang, l.colorLabel, l.size, l.qty])).toEqual([
      ["SƯƠNG", "vi", "Moss", "L", 1],
      ["KHÓI", "vi", "Black", "M", 2],
      ["PLAIN TEE", undefined, "White", "L", 1],
    ]);
    expect(confirmLines(C, waiting(), "vi").every((l) => !("nameLang" in l))).toBe(true);
    expect(confirmLines(C, waiting(), "vi")).toEqual(confirmLines(C, waiting()));
  });

  it("leads on in English: the order's page, or the lookup by its glossary name", () => {
    expect(followLink(waiting(), true, "en")).toEqual({ label: "View order", href: "/account/orders/DH-1507" });
    expect(followLink(waiting(), false, "en")).toEqual({
      label: "Track an order",
      href: "/track?code=DH-1507&phone=0938571204",
    });
  });
});

describe("a cancelled order's reason, stored in Vietnamese", () => {
  it("has English for every reason the app itself writes", () => {
    for (const reason of [...CANCEL_REASONS, OVERDUE_REASON, CUSTOMER_CANCEL_REASON]) {
      const english = cancelReasonLabel(reason, "en");
      expect(english, reason).not.toBe(reason);
      expect(english, reason).not.toMatch(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i);
    }
  });

  it("is matched whatever its case, and an unknown one is printed as stored", () => {
    expect(cancelReasonLabel("quá hạn chuyển khoản", "en")).toBe("Transfer overdue");
    expect(cancelReasonLabel("Quá hạn chuyển khoản", "en")).toBe("Transfer overdue");
    expect(cancelReasonLabel("  KHÁCH ĐỔI Ý ", "en")).toBe("Change of mind");
    expect(cancelReasonLabel("Hết hàng thật", "en")).toBe("Out of stock");
    expect(cancelReasonLabel("Khác", "en")).toBe("Other");
    expect(cancelReasonLabel("khách huỷ", "en")).toBe("Cancelled by the customer");
    expect(cancelReasonLabel("giao lỗi", "en")).toBe("giao lỗi");
    expect(cancelReasonLabel("Khách đổi ý", "vi")).toBe("Khách đổi ý");
  });

  it("reads on the lookup as the Vietnamese does, the shopper's own cancel as theirs", () => {
    expect(cancelReasonText(CUSTOMER_CANCEL_REASON, "en")).toBe("You cancelled");
    expect(cancelReasonText("Quá hạn chuyển khoản", "en")).toBe("Transfer overdue");
    expect(cancelReasonText("Khách đổi ý", "en")).toBe("Change of mind");
    expect(cancelReasonText("giao lỗi", "en")).toBe("giao lỗi");
    expect(cancelReasonText("Khách đổi ý", "vi")).toBe(cancelReasonText("Khách đổi ý"));
  });
});

describe("the lookup's result in English", () => {
  it("names what an order was bought from by the glossary", () => {
    expect(groupLabelIn(5, "en")).toBe("Drop 05");
    expect(groupLabelIn("fixed", "en")).toBe("Basics");
    expect(groupLabelIn(5, "vi")).toBe(groupLabel(5));
    expect(groupLabelIn("fixed", "vi")).toBe(groupLabel("fixed"));
    // The orders list maps over the one-parameter function: still Vietnamese, never an index read as a language.
    expect([5, "fixed" as const].map(groupLabel)).toEqual(["Số 05", "Cố định"]);
  });

  it("names the step an order waits on for what happens there, never as done", () => {
    const waitingSteps = orderSteps({ status: { state: "AWAITING_TRANSFER", dueAt: DUE }, placedAt: PLACED, payment: "BANK_TRANSFER" }, "en");
    expect(waitingSteps.map((s) => [s.label, s.state])).toEqual([
      ["Ordered", "done"],
      ["Payment", "now"],
      ["Dispatch", "todo"],
      ["Delivered", "todo"],
    ]);
    const paid = orderSteps({ status: { state: "PAID", paidAt: DUE }, placedAt: PLACED, payment: "CARD" }, "en");
    expect(paid.find((s) => s.state === "now")?.label).toBe("Dispatch");
  });

  it("walks the four steps in English, with the times the glossary's way", () => {
    const shipped = { state: "SHIPPING" as const, shippedAt: "2026-09-23T09:15:00+07:00", trackingCode: "VNP-1" };
    const steps = orderSteps({ status: shipped, placedAt: PLACED, payment: "CARD", moments: { paidAt: "2026-09-21T19:10:00+07:00" } }, "en");
    expect(steps.map((s) => [s.label, s.state])).toEqual([
      ["Ordered", "done"],
      ["Payment", "done"],
      ["Dispatch", "done"],
      ["Delivered", "now"],
    ]);
    expect(orderSteps({ status: { state: "RECEIVED" }, placedAt: PLACED, payment: "COD" }, "en").map((s) => s.label)).toEqual([
      "Ordered",
      "Confirmation",
      "Dispatch",
      "Delivered",
    ]);
    expect(
      orderSteps({ status: { state: "CANCELLED", cancelledAt: DUE, reason: "x" }, placedAt: PLACED, payment: "COD" }, "en").map(
        (s) => s.label,
      ),
    ).toEqual(["Ordered", "Cancelled", "Dispatch", "Delivered"]);
    expect(stepStamp(PLACED, "en")).toBe(`19:02, ${D(21, "Sep")}`);
    expect(stepStamp(PLACED, "vi")).toBe(stepStamp(PLACED));
  });
});
