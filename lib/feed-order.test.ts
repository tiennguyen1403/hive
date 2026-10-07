import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG as C } from "@/data/fixture-catalog";
import { productId, type Order, type OrderStatus, type PaymentMethod } from "@/data/types";
import {
  CONFIRM_STEPS,
  codFeeRow,
  confirmFlow,
  confirmLines,
  confirmNext,
  confirmRows,
  confirmShipRows,
  confirmSteps,
  confirmTransfer,
  followLink,
} from "./feed-order";

const PLACED = "2026-09-21T19:02:00+07:00";
const DUE = "2026-09-22T07:02:00+07:00";
const R = (a: string, b: string) => `${a} -⁠ ${b}`;

/** The mock's demo basket (`DEMO_CARTS.full`), placed at the mock's clock. */
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

describe("the flow: the transfer's screen, a card's, or COD's", () => {
  it("pays a card on Stripe's page, its own flow (slice B18; by transfer from B7)", () => {
    expect(confirmFlow({ payment: "BANK_TRANSFER" })).toBe("transfer");
    expect(confirmFlow({ payment: "CARD" })).toBe("card");
    expect(confirmFlow({ payment: "COD" })).toBe("cod");
  });
});

describe("the line under the code, and the status (confirmed.js NEXT, STEPS)", () => {
  it("asks for the transfer within the hold, the second step lit", () => {
    expect(confirmNext(waiting())).toBe("Chuyển khoản trong 12 giờ để giữ hàng.");
    // A card order pays on Stripe's page since slice B18, within the same hold.
    expect(confirmNext(waiting("CARD"))).toBe("Trả bằng thẻ trong 12 giờ để giữ hàng.");
    expect(confirmSteps(waiting())).toEqual([
      { label: "Đã đặt", state: "done" },
      { label: "Chờ chuyển khoản", state: "now" },
      { label: "Đang giao", state: "todo" },
      { label: "Đã giao", state: "todo" },
    ]);
  });

  it("gives COD the shop's call, and no hold", () => {
    const cod = order("COD", { state: "RECEIVED" });
    expect(confirmNext(cod)).toBe("Cửa hàng gọi xác nhận trước khi giao.");
    expect(confirmSteps(cod).map((s) => [s.label, s.state])).toEqual([
      ["Đã đặt", "done"],
      ["Gọi xác nhận", "now"],
      ["Đang giao", "todo"],
      ["Đã giao", "todo"],
    ]);
    expect(confirmTransfer(cod)).toBeNull();
  });

  it("says a card order taken before slice B7 waits for the shop: no transfer since slice B18", () => {
    expect(confirmNext(order("CARD", { state: "RECEIVED" }))).toBe("Chờ xác nhận.");
  });

  it("follows an order reopened after it moved on, and asks for nothing that no longer applies", () => {
    const paid = order("BANK_TRANSFER", { state: "PAID", paidAt: "2026-09-21T20:00:00+07:00" });
    expect(confirmNext(paid)).toBe("Đã thanh toán.");
    expect(confirmSteps(paid).map((s) => s.state)).toEqual(["done", "done", "todo", "todo"]);
    expect(confirmTransfer(paid)).toBeNull();
    const shipping = order("COD", { state: "SHIPPING", shippedAt: "2026-09-22T08:00:00+07:00", trackingCode: "VD-1" });
    expect(confirmNext(shipping)).toBe("Đang giao.");
    expect(confirmSteps(shipping).map((s) => s.state)).toEqual(["done", "done", "now", "todo"]);
    const delivered = order("COD", { state: "DELIVERED", deliveredAt: "2026-09-24T10:00:00+07:00" });
    expect(confirmNext(delivered)).toBe("Đã giao.");
    expect(confirmSteps(delivered).map((s) => s.state)).toEqual(["done", "done", "done", "done"]);
  });

  it("shows a cancelled order placed and cancelled, and why", () => {
    const off = order("BANK_TRANSFER", { state: "CANCELLED", cancelledAt: DUE, reason: "quá hạn chuyển khoản" });
    expect(confirmNext(off)).toBe("Quá hạn chuyển khoản. Hàng đã về kệ.");
    expect(confirmSteps(off)).toEqual([
      { label: "Đã đặt", state: "done" },
      { label: "Đã huỷ", state: "now" },
    ]);
  });

  it("keeps exactly one step lit as now, and nothing done after it", () => {
    expect(CONFIRM_STEPS.transfer).toHaveLength(4);
    for (const o of [waiting(), order("COD", { state: "RECEIVED" })]) {
      const states = confirmSteps(o).map((s) => s.state);
      expect(states.filter((s) => s === "now")).toHaveLength(1);
      expect(states.lastIndexOf("done")).toBeLessThan(states.indexOf("now"));
    }
  });
});

describe("the transfer block and the hold", () => {
  it("asks for the order's total, with the code as the memo, dashless as a bank takes it", () => {
    expect(confirmTransfer(waiting())).toEqual({
      amountVnd: 2_630_000,
      memo: "DH1507",
      dueAt: DUE,
      until: "07:02 thứ Ba 22/09",
      note: "Quá giờ, đơn tự huỷ và 4 chiếc về kệ.",
    });
  });
});

describe("delivery, the summary, the lines and the way on", () => {
  it("dates the window from when the order was placed, with the recipient and the address", () => {
    expect(confirmShipRows(waiting(), "12 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh")).toEqual([
      { label: "Giao tiêu chuẩn", value: `dự kiến ${R("23/09", "25/09")}` },
      { label: "Người nhận", value: "Trần Minh Khoa, 0938 571 204" },
      { label: "Địa chỉ", value: "12 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh" },
    ]);
  });

  it("prices the summary as the order was, the code's line only when it took something off", () => {
    expect(confirmRows(order("COD", { state: "RECEIVED" }))).toEqual([
      { label: "Tạm tính", value: "2.630.000₫" },
      { label: "Giao hàng", value: "Miễn phí" },
      { label: "Phụ phí COD", value: "+15.000₫" },
    ]);
    const coded = order("BANK_TRANSFER", { state: "AWAITING_TRANSFER", dueAt: DUE }, { promo: "DOT05" as Order["promo"], discountVnd: 150_000 });
    expect(confirmRows(coded).at(-1)).toEqual({ label: "Mã DOT05", value: "-150.000₫" });
    const free = order("BANK_TRANSFER", { state: "AWAITING_TRANSFER", dueAt: DUE }, { promo: "FREESHIP" as Order["promo"] });
    expect(confirmRows(free)).toHaveLength(2);
  });

  it("prints the COD surcharge as one line, and none for an order that carries none (the back office's too)", () => {
    expect(codFeeRow({ codFeeVnd: 15_000 })).toEqual({ label: "Phụ phí COD", value: "+15.000₫" });
    expect(codFeeRow({ codFeeVnd: 0 })).toBeNull();
    // The summary's own line is this one.
    expect(confirmRows(order("COD", { state: "RECEIVED" }))).toContainEqual(codFeeRow({ codFeeVnd: 15_000 }));
  });

  it("names each line bare, at the price it was sold for", () => {
    const lines = confirmLines(C, waiting());
    expect(lines.map((l) => [l.name, l.colorLabel, l.size, l.qty, l.totalVnd])).toEqual([
      ["SƯƠNG", "Rêu", "L", 1, 1_450_000],
      ["KHÓI", "Đen", "M", 2, 780_000],
      ["ÁO THUN TRƠN", "Trắng", "L", 1, 400_000],
    ]);
  });

  it("leads to the order's own page in the account, or to the lookup", () => {
    expect(followLink(waiting(), true)).toEqual({ label: "Xem đơn", href: "/account/orders/DH-1507" });
    expect(followLink(waiting(), false)).toEqual({ label: "Tra cứu đơn", href: "/track?code=DH-1507&phone=0938571204" });
  });
});
