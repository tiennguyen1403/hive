import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG as C } from "@/data/fixture-catalog";
import { productId, type Order, type OrderStatus, type PaymentMethod } from "@/data/types";
import {
  FEED_STATE_LABEL,
  NO_FILTER,
  buyAgainLines,
  canReturn,
  cancelReasonText,
  defaultFirst,
  feedAddressErrors,
  filterOrders,
  firstWrongAddress,
  groupLabel,
  groupSlug,
  groupsOfOrders,
  linePicture,
  lookupCheck,
  newestFirst,
  nextAddressLabel,
  noneLabel,
  orderGroups,
  orderPhase,
  orderSteps,
  parseOrdersFilter,
  pathWithQuery,
  paymentTitle,
  deliveryTitle,
  readAddressId,
  resultLabel,
  returnUntil,
  stepStamp,
  ticketNote,
  tileLabel,
} from "./feed-account";

const PLACED = "2026-09-21T19:02:00+07:00";
const OPEN = new Date("2026-09-21T19:02:00+07:00");
const AFTER_CLOSE = new Date("2026-09-28T19:02:00+07:00");

/** The mock's DH-1507: SƯƠNG rêu L, KHÓI đen M ×2 (Số 05) and ÁO THUN TRƠN trắng L (Cố định). */
function order(status: OrderStatus, payment: PaymentMethod = "BANK_TRANSFER", extra: Partial<Order> = {}): Order {
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
    email: null,
    note: "",
    placedAt: PLACED,
    ...extra,
  };
}

const reu = (status: OrderStatus): Order =>
  order(status, "BANK_TRANSFER", {
    code: "DH-1310" as Order["code"],
    lines: [{ productId: productId("p-reu"), color: "moss", size: "M", qty: 1, unitPriceVnd: 1_500_000 }],
    placedAt: "2026-06-06T20:15:00+07:00",
  });

describe("the state in the mock's words (ORDER_STATES)", () => {
  it("names a COD order before the call 'Chờ xác nhận'", () => {
    expect(FEED_STATE_LABEL).toEqual({
      AWAITING_TRANSFER: "Chờ chuyển khoản",
      RECEIVED: "Chờ xác nhận",
      PAID: "Đã thanh toán",
      SHIPPING: "Đang giao",
      DELIVERED: "Đã giao",
      CANCELLED: "Đã huỷ",
    });
  });

  it("says the two reasons the shop writes as the mock does, and keeps the shop's own words", () => {
    expect(cancelReasonText("khách huỷ")).toBe("Bạn đã huỷ");
    expect(cancelReasonText("quá hạn chuyển khoản")).toBe("Quá hạn chuyển khoản");
    expect(cancelReasonText("Quá hạn chuyển khoản")).toBe("Quá hạn chuyển khoản");
    expect(cancelReasonText("hết hàng khi đóng gói")).toBe("Hết hàng khi đóng gói");
    expect(cancelReasonText("Khách đổi ý")).toBe("Khách đổi ý");
  });

  it("names the payment and the delivery as the checkout does", () => {
    expect(paymentTitle("BANK_TRANSFER")).toBe("Chuyển khoản");
    // "nhận (COD)" held together, as the checkout's card has it.
    expect(paymentTitle("COD")).toBe("Thanh toán khi nhận (COD)");
    // The card's name for Stripe's test mode since slice B18 (QĐ-46, the user's words).
    expect(paymentTitle("CARD")).toBe("Thẻ (Visa, Mastercard)");
    expect(deliveryTitle("STANDARD")).toBe("Giao tiêu chuẩn");
    expect(deliveryTitle("EXPRESS")).toBe("Giao nhanh nội thành");
  });
});

describe("the two filters (orders.js, ORDER_PHASES, orderGroups)", () => {
  it("reads the phase off the status the shopper sees", () => {
    expect(orderPhase({ state: "AWAITING_TRANSFER", dueAt: PLACED })).toBe("active");
    expect(orderPhase({ state: "RECEIVED" })).toBe("active");
    expect(orderPhase({ state: "PAID", paidAt: PLACED })).toBe("active");
    expect(orderPhase({ state: "SHIPPING", shippedAt: PLACED, trackingCode: "VD-1" })).toBe("active");
    expect(orderPhase({ state: "DELIVERED", deliveredAt: PLACED })).toBe("delivered");
    expect(orderPhase({ state: "CANCELLED", cancelledAt: PLACED, reason: "khách huỷ" })).toBe("cancelled");
  });

  it("files an order under every group it touches, issues first, then the fixed line", () => {
    expect(orderGroups(C, order({ state: "RECEIVED" }))).toEqual([5, "fixed"]);
    expect(orderGroups(C, reu({ state: "RECEIVED" }))).toEqual([4]);
    const gone = order({ state: "RECEIVED" }, "COD", {
      lines: [{ productId: productId("p-gone"), color: "black", size: "M", qty: 1, unitPriceVnd: 1 }],
    });
    expect(orderGroups(C, gone)).toEqual([]);
    expect(groupsOfOrders(C, [reu({ state: "RECEIVED" }), order({ state: "RECEIVED" })])).toEqual([5, 4, "fixed"]);
  });

  it("writes a group in the URL and on the chip", () => {
    expect(groupSlug(5)).toBe("so-05");
    expect(groupSlug("fixed")).toBe("co-dinh");
    expect(groupLabel(4)).toBe("Số 04");
    expect(groupLabel("fixed")).toBe("Cố định");
  });

  it("parses the URL, and reads the v3 list's ?tab= as the phase it meant", () => {
    const groups = [5, 4, "fixed"] as const;
    expect(parseOrdersFilter({ phase: "active", group: "so-05" }, groups)).toEqual({ phase: "active", group: 5 });
    expect(parseOrdersFilter({ group: "co-dinh" }, groups)).toEqual({ phase: "all", group: "fixed" });
    expect(parseOrdersFilter({ phase: "nope", group: "so-03" }, groups)).toEqual(NO_FILTER);
    expect(parseOrdersFilter({ tab: "processing" }, groups)).toEqual({ phase: "active", group: "all" });
    expect(parseOrdersFilter({ tab: "cancelled" }, groups).phase).toBe("cancelled");
    expect(parseOrdersFilter({ tab: "all" }, groups).phase).toBe("all");
    expect(parseOrdersFilter({ phase: ["delivered", "active"] }, groups).phase).toBe("delivered");
  });

  it("keeps a page's own query in the way back from signing in", () => {
    expect(pathWithQuery("/account/orders", {})).toBe("/account/orders");
    expect(pathWithQuery("/account/addresses", { add: "1", x: ["a", "b"], y: undefined })).toBe("/account/addresses?add=1&x=a&x=b");
  });

  it("keeps the orders both filters allow", () => {
    const a = order({ state: "AWAITING_TRANSFER", dueAt: PLACED });
    const b = reu({ state: "CANCELLED", cancelledAt: PLACED, reason: "quá hạn chuyển khoản" });
    expect(filterOrders(C, [a, b], NO_FILTER)).toEqual([a, b]);
    expect(filterOrders(C, [a, b], { phase: "cancelled", group: "all" })).toEqual([b]);
    expect(filterOrders(C, [a, b], { phase: "all", group: "fixed" })).toEqual([a]);
    expect(filterOrders(C, [a, b], { phase: "cancelled", group: "fixed" })).toEqual([]);
  });

  it("says the combination that leaves nothing, and the count otherwise", () => {
    expect(noneLabel({ phase: "active", group: 5 })).toBe("Không có đơn đang xử lý ở Số 05");
    expect(noneLabel({ phase: "cancelled", group: "fixed" })).toBe("Không có đơn đã huỷ ở Cố định");
    expect(noneLabel({ phase: "all", group: 4 })).toBe("Không có đơn ở Số 04");
    expect(noneLabel({ phase: "delivered", group: "all" })).toBe("Không có đơn đã giao");
    expect(resultLabel(3, NO_FILTER)).toBe("3 đơn");
    expect(resultLabel(0, { phase: "delivered", group: "all" })).toBe("Không có đơn đã giao");
  });

  it("lists the newest first", () => {
    const old = reu({ state: "RECEIVED" });
    const recent = order({ state: "RECEIVED" });
    expect(newestFirst([old, recent]).map((o) => o.code)).toEqual(["DH-1507", "DH-1310"]);
  });
});

describe("a ticket's note (account.js ticket)", () => {
  it("counts the hold down, says why it was cancelled, gives the tracking code, the return's last day", () => {
    expect(ticketNote(order({ state: "AWAITING_TRANSFER", dueAt: "2026-09-22T07:02:00+07:00" }), OPEN)).toEqual({
      kind: "hold",
      dueAt: "2026-09-22T07:02:00+07:00",
    });
    expect(ticketNote(reu({ state: "CANCELLED", cancelledAt: PLACED, reason: "khách huỷ" }), OPEN)).toEqual({
      kind: "reason",
      text: "Bạn đã huỷ",
    });
    expect(ticketNote(order({ state: "SHIPPING", shippedAt: PLACED, trackingCode: "VD-8842-1907" }), OPEN)).toEqual({
      kind: "tracking",
      code: "VD-8842-1907",
    });
    const delivered = order({ state: "DELIVERED", deliveredAt: "2026-09-16T10:02:00+07:00" });
    expect(ticketNote(delivered, OPEN)).toEqual({ kind: "return", day: "23/09" });
    // Past the seven days, nothing.
    expect(ticketNote(delivered, AFTER_CLOSE)).toBeNull();
    expect(ticketNote(order({ state: "PAID", paidAt: PLACED }), OPEN)).toBeNull();
    expect(ticketNote(order({ state: "RECEIVED" }, "COD"), OPEN)).toBeNull();
  });
});

describe("one order: returns, cancelling, the four steps", () => {
  it("opens the return window for seven days from delivery", () => {
    const o = order({ state: "DELIVERED", deliveredAt: "2026-09-16T10:02:00+07:00" });
    expect(returnUntil(o)).toBe("2026-09-23T10:02:00+07:00");
    expect(canReturn(o, new Date("2026-09-23T10:01:00+07:00"))).toBe(true);
    expect(canReturn(o, new Date("2026-09-23T10:02:00+07:00"))).toBe(false);
    expect(returnUntil(order({ state: "RECEIVED" }))).toBeNull();
  });

  it("lights the transfer's step while it is awaited", () => {
    expect(orderSteps(order({ state: "AWAITING_TRANSFER", dueAt: PLACED }))).toEqual([
      { label: "Đặt hàng", at: PLACED, state: "done" },
      { label: "Thanh toán", at: null, state: "now" },
      { label: "Gửi hàng", at: null, state: "todo" },
      { label: "Đã giao", at: null, state: "todo" },
    ]);
  });

  it("calls COD's second step Xác nhận, now until the order ships", () => {
    expect(orderSteps(order({ state: "RECEIVED" }, "COD")).map((s) => [s.label, s.state])).toEqual([
      ["Đặt hàng", "done"],
      ["Xác nhận", "now"],
      ["Gửi hàng", "todo"],
      ["Đã giao", "todo"],
    ]);
    const shipping = order({ state: "SHIPPING", shippedAt: "2026-09-18T07:15:00+07:00", trackingCode: "VD-1" }, "COD");
    expect(orderSteps(shipping)).toEqual([
      { label: "Đặt hàng", at: PLACED, state: "done" },
      { label: "Xác nhận", at: null, state: "done" },
      { label: "Gửi hàng", at: "2026-09-18T07:15:00+07:00", state: "done" },
      { label: "Đã giao", at: null, state: "now" },
    ]);
  });

  it("stamps a paid step with its moment, and lights the next", () => {
    expect(orderSteps(order({ state: "PAID", paidAt: "2026-09-21T20:14:00+07:00" })).map((s) => [s.label, s.at, s.state])).toEqual([
      ["Đặt hàng", PLACED, "done"],
      ["Thanh toán", "2026-09-21T20:14:00+07:00", "done"],
      ["Gửi hàng", null, "now"],
      ["Đã giao", null, "todo"],
    ]);
  });

  it("fills every bar once delivered", () => {
    const steps = orderSteps(order({ state: "DELIVERED", deliveredAt: "2026-09-25T15:20:00+07:00" }));
    expect(steps.every((s) => s.state === "done")).toBe(true);
    expect(steps[3]!.at).toBe("2026-09-25T15:20:00+07:00");
  });

  it("draws a cancelled order as placed, cancelled, and two steps it never reached", () => {
    expect(orderSteps(reu({ state: "CANCELLED", cancelledAt: "2026-06-07T08:15:00+07:00", reason: "x" }))).toEqual([
      { label: "Đặt hàng", at: "2026-06-06T20:15:00+07:00", state: "done" },
      { label: "Đã huỷ", at: "2026-06-07T08:15:00+07:00", state: "off" },
      { label: "Gửi hàng", at: null, state: "off" },
      { label: "Đã giao", at: null, state: "off" },
    ]);
  });

  it("stamps a step as the mock does", () => {
    expect(stepStamp("2026-09-21T19:02:00+07:00")).toBe("19:02 21/09");
  });
});

describe("one order: a time under every step passed (slice B10, stepModel)", () => {
  // The mock's DH-1496: placed 21:40 11/09, paid 21:52, shipped 08:20 13/09, delivered 10:02 16/09.
  const PAID = "2026-09-11T21:52:00+07:00";
  const SHIPPED = "2026-09-13T08:20:00+07:00";
  const DELIVERED = "2026-09-16T10:02:00+07:00";
  const placed = { placedAt: "2026-09-11T21:40:00+07:00" };

  it("stamps placing, paying, shipping and delivering on a delivered order that recorded them", () => {
    const o = order({ state: "DELIVERED", deliveredAt: DELIVERED }, "BANK_TRANSFER", {
      ...placed,
      moments: { paidAt: PAID, shippedAt: SHIPPED, deliveredAt: DELIVERED },
    });
    expect(orderSteps(o)).toEqual([
      { label: "Đặt hàng", at: "2026-09-11T21:40:00+07:00", state: "done" },
      { label: "Thanh toán", at: PAID, state: "done" },
      { label: "Gửi hàng", at: SHIPPED, state: "done" },
      { label: "Đã giao", at: DELIVERED, state: "done" },
    ]);
  });

  it("keeps the payment's time on an order on its way, and waits on delivery", () => {
    const o = order({ state: "SHIPPING", shippedAt: SHIPPED, trackingCode: "VD-8831-0413" }, "CARD", {
      ...placed,
      moments: { paidAt: PAID, shippedAt: SHIPPED },
    });
    expect(orderSteps(o).map((s) => [s.label, s.at, s.state])).toEqual([
      ["Đặt hàng", "2026-09-11T21:40:00+07:00", "done"],
      ["Thanh toán", PAID, "done"],
      ["Gửi hàng", SHIPPED, "done"],
      ["Đã giao", null, "now"],
    ]);
  });

  it("stamps only what the order recorded: one that recorded only its arrival shows that and its placing", () => {
    const o = order({ state: "DELIVERED", deliveredAt: DELIVERED }, "BANK_TRANSFER", {
      ...placed,
      moments: { deliveredAt: DELIVERED },
    });
    expect(orderSteps(o).map((s) => s.at)).toEqual(["2026-09-11T21:40:00+07:00", null, null, DELIVERED]);
    expect(orderSteps(o).every((s) => s.state === "done")).toBe(true);
  });

  it("reads an order with no moments, from a database before B10, by its status's own moment", () => {
    const shipping = order({ state: "SHIPPING", shippedAt: SHIPPED, trackingCode: "VD-1" }, "BANK_TRANSFER", placed);
    expect(orderSteps(shipping).map((s) => s.at)).toEqual(["2026-09-11T21:40:00+07:00", null, SHIPPED, null]);
    const paid = order({ state: "PAID", paidAt: PAID }, "BANK_TRANSFER", placed);
    expect(orderSteps(paid).map((s) => s.at)).toEqual(["2026-09-11T21:40:00+07:00", PAID, null, null]);
  });

  it("puts no time under COD's Xác nhận: the shop's call is not recorded, and a payment is not a confirmation", () => {
    const o = order({ state: "DELIVERED", deliveredAt: DELIVERED }, "COD", {
      ...placed,
      moments: { shippedAt: SHIPPED, deliveredAt: DELIVERED },
    });
    expect(orderSteps(o).map((s) => [s.label, s.at, s.state])).toEqual([
      ["Đặt hàng", "2026-09-11T21:40:00+07:00", "done"],
      ["Xác nhận", null, "done"],
      ["Gửi hàng", SHIPPED, "done"],
      ["Đã giao", DELIVERED, "done"],
    ]);
    const paidCod = order({ state: "PAID", paidAt: PAID }, "COD", { ...placed, moments: { paidAt: PAID } });
    expect(orderSteps(paidCod)[1]).toEqual({ label: "Xác nhận", at: null, state: "now" });
  });

  it("stamps nothing but the placing on a transfer still awaited", () => {
    const o = order({ state: "AWAITING_TRANSFER", dueAt: "2026-09-12T09:40:00+07:00" }, "BANK_TRANSFER", placed);
    expect(orderSteps(o).map((s) => s.at)).toEqual(["2026-09-11T21:40:00+07:00", null, null, null]);
  });

  it("draws a cancelled order the same way, paid before or not", () => {
    const o = reu({ state: "CANCELLED", cancelledAt: "2026-06-07T08:15:00+07:00", reason: "Khác" });
    const paidFirst = { ...o, moments: { paidAt: "2026-06-06T20:30:00+07:00" } };
    expect(orderSteps(paidFirst)).toEqual(orderSteps(o));
  });
});

describe("Mua lại: what can be bought again today (buyAgain)", () => {
  it("takes the lines still sold, in a colour and size with anything left", () => {
    const o = order({ state: "DELIVERED", deliveredAt: PLACED });
    // While Số 05 sells: SƯƠNG rêu L (1 left), KHÓI đen M (4 left), ÁO THUN TRƠN trắng L.
    expect(buyAgainLines(C, o, OPEN).map((l) => l.productId)).toEqual(["p-suong", "p-khoi", "p-ao-thun-tron"]);
    // Once it has closed, only the fixed line.
    expect(buyAgainLines(C, o, AFTER_CLOSE).map((l) => l.productId)).toEqual(["p-ao-thun-tron"]);
    // A closed issue's style, sold out: nothing.
    expect(buyAgainLines(C, reu({ state: "CANCELLED", cancelledAt: PLACED, reason: "x" }), OPEN)).toEqual([]);
  });

  it("leaves out a size with nothing left", () => {
    const o = order({ state: "DELIVERED", deliveredAt: PLACED }, "BANK_TRANSFER", {
      lines: [{ productId: productId("p-suong"), color: "moss", size: "S", qty: 1, unitPriceVnd: 1_450_000 }],
    });
    expect(buyAgainLines(C, o, OPEN)).toEqual([]);
  });
});

describe("a piece's tile (account.js tile)", () => {
  it("shows a Số 05 style's packshot and a fixed style's flat drawing", () => {
    expect(linePicture(C.byId.get(productId("p-suong")), "moss")).toBe("/shots/suong-moss.webp");
    expect(linePicture(C.byId.get(productId("p-ao-thun-tron")), "white")).toBe("/flats/tee-white.png");
  });

  it("sets a style with only a borrowed frame in type, as the mock sets a closed issue's", () => {
    expect(linePicture(C.byId.get(productId("p-reu")), "moss")).toBeNull();
    expect(linePicture(undefined, "black")).toBeNull();
  });

  it("names the piece for a screen reader", () => {
    expect(tileLabel("SƯƠNG", "moss", "L", 1)).toBe("SƯƠNG, rêu, size L");
    expect(tileLabel("KHÓI", "black", "M", 2)).toBe("KHÓI, đen, size M, 2 chiếc");
  });
});

describe("the address sheet (addresses.js check)", () => {
  const good = { recipient: "Trần Minh Anh", phone: "0912 345 678", provinceCode: "29", wardCode: "70101063", street: "24 Nguyễn Thị Minh Khai" };

  it("passes a complete address", () => {
    expect(feedAddressErrors(good)).toEqual({});
  });

  it("says what is missing in the mock's words, the commune only once a province is chosen", () => {
    expect(feedAddressErrors({ recipient: "", phone: "", provinceCode: "", wardCode: "", street: "" })).toEqual({
      recipient: "Nhập tên người nhận",
      phone: "Nhập số điện thoại",
      province: "Chọn tỉnh / thành",
      street: "Nhập số nhà, đường",
    });
    expect(feedAddressErrors({ ...good, wardCode: "" })).toEqual({ ward: "Chọn phường / xã" });
    expect(feedAddressErrors({ ...good, phone: "0912" })).toEqual({ phone: "Số điện thoại gồm 10 số, bắt đầu bằng 0" });
    expect(feedAddressErrors({ ...good, recipient: "A" }).recipient).toBe("Nhập tên người nhận");
  });

  it("points at the first wrong field in the sheet's order", () => {
    expect(firstWrongAddress({ street: "x", phone: "y" })).toBe("phone");
  });

  it("names a new address with the first name the book does not use", () => {
    expect(nextAddressLabel([])).toBe("Nhà");
    expect(nextAddressLabel(["Nhà"])).toBe("Công ty");
    expect(nextAddressLabel(["Nhà", "Công ty", "Khác"])).toBe("Khác");
  });

  it("puts the default first and keeps the book's order otherwise", () => {
    const list = [
      { id: "a", isDefault: false },
      { id: "b", isDefault: false },
      { id: "c", isDefault: true },
    ];
    expect(defaultFirst(list).map((a) => a.id)).toEqual(["c", "a", "b"]);
  });

  it("takes an address's id as the book writes one, and nothing else (Hoàn tác, slice B10)", () => {
    expect(readAddressId("0b6f5a4e-1d2c-4b3a-9f8e-7d6c5b4a3f21")).toBe("0b6f5a4e-1d2c-4b3a-9f8e-7d6c5b4a3f21");
    expect(readAddressId("0B6F5A4E-1D2C-4B3A-9F8E-7D6C5B4A3F21")).toBe("0b6f5a4e-1d2c-4b3a-9f8e-7d6c5b4a3f21");
    for (const bad of ["", "a-minhanh-1", "0b6f5a4e1d2c4b3a9f8e7d6c5b4a3f21", " 0b6f5a4e-1d2c-4b3a-9f8e-7d6c5b4a3f21", 7, null, undefined, {}]) {
      expect(readAddressId(bad), String(bad)).toBeNull();
    }
  });
});

describe("Tra cứu đơn, checked in the mock's words (account.js lookupForm)", () => {
  it("asks for both, then for the right shapes", () => {
    expect(lookupCheck("", "")).toEqual({ ok: false, errors: { code: "Nhập mã đơn", phone: "Nhập số điện thoại" } });
    expect(lookupCheck("1499", "12345")).toEqual({
      ok: false,
      errors: { code: "Mã đơn có dạng DH-1499", phone: "Số điện thoại gồm 10 số, bắt đầu bằng 0" },
    });
  });

  it("leads a valid pair to the lookup, the code with its dash, the phone as its digits", () => {
    expect(lookupCheck(" dh2430 ", "0912 345 678")).toEqual({ ok: true, href: "/track?code=DH-2430&phone=0912345678" });
    expect(lookupCheck("DH-2430", "0912.345.678")).toEqual({ ok: true, href: "/track?code=DH-2430&phone=0912345678" });
  });
});
