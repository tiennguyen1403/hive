import { describe, it, expect } from "vitest";
import { invoiceOf } from "./invoice";
import { trackedOfOrder } from "./lookup";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { orderByCode } from "@/data/orders";
import { orderCode, productId, promoCode, type Order } from "@/data/types";

const DURING_5 = new Date("2026-09-20T10:00:00+07:00");
const ADDRESS = "12 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh";

/**
 * An order placed at checkout since slice B2: two KHÓI, cash on delivery,
 * DOT05 applied, a note for the courier — as `order_json()` returns it.
 */
const placed: Order = {
  code: orderCode("DH-2432"),
  customerId: "" as Order["customerId"],
  lines: [
    { productId: productId("p-khoi"), size: "M", color: "black", qty: 2, unitPriceVnd: 390_000 },
  ],
  status: { state: "RECEIVED" },
  payment: "COD",
  delivery: "STANDARD",
  shippingFeeVnd: 30_000,
  codFeeVnd: 15_000,
  discountVnd: 78_000,
  shipTo: {
    recipient: "Trần Minh Anh",
    phone: "0912345678",
    line: "12 Nguyễn Huệ",
    provinceCode: "29",
    wardCode: "70101063",
  },
  email: "minhanh@vidu.vn",
  note: "Gọi trước 10 phút",
  placedAt: "2026-09-20T09:00:00+07:00",
  promo: promoCode("DOT05"),
};

const bill = (o: Order) => invoiceOf(trackedOfOrder(FIXTURE_CATALOG, o, ADDRESS, DURING_5));

describe("invoiceOf — an order the shop shipped", () => {
  // DH-2425 belongs to Lê Hoàng Nam and is on the road.
  const order = orderByCode.get(orderCode("DH-2425"))!;
  const inv = invoiceOf(trackedOfOrder(FIXTURE_CATALOG, order, "88 Xuân Thuỷ, Phường Cầu Giấy, TP. Hà Nội", DURING_5));

  it("carries the order's own identity", () => {
    expect(inv.brand).toBe("HIVE");
    expect(inv.code).toBe("DH-2425");
  });

  it("dates it with the year — a bill is reopened months later", () => {
    expect(inv.placedAtLabel).toBe("14:50 · 15/09/2026");
  });

  it("reads the phone back the way a person reads one", () => {
    expect(inv.phoneLabel).toBe("0908 221 447");
  });

  it("prints one line per line of the order, priced from the order", () => {
    expect(inv.lines).toHaveLength(2);
    expect(inv.lines[0]!.detail).toBe("Áo thun oversize · Kem · XL");
    expect(inv.lines[0]!.lineTotalVnd).toBe(390_000);
  });

  it("totals what the screen totals", () => {
    expect(inv.totalVnd).toBe(820_000);
    expect(inv.totalLabel).toBe("Đã thanh toán");
    expect(inv.paidLabel).toBe("Đã thanh toán");
  });

  it("names the discount code on the row it took money off", () => {
    expect(inv.rows).toContainEqual({ label: "Giảm giá · CHAOBAN", value: "−50.000₫" });
  });

  it("carries the courier's number when there is one", () => {
    expect(inv.trackingCode).toBe("VNP-8842204");
  });

  it("says what it is not", () => {
    expect(inv.disclaimer).toContain("không phải hoá đơn giá trị gia tăng");
  });
});

describe("invoiceOf — an order placed at checkout, cash on delivery", () => {
  const inv = bill(placed);

  it("never says the money arrived", () => {
    expect(inv.paidLabel).toBe("Chưa thu tiền");
    expect(inv.totalLabel).toBe("Cần thanh toán");
  });

  it("prints the cash-handling fee as its own row", () => {
    expect(inv.rows).toContainEqual({ label: "Phí thu hộ", value: "15.000₫" });
  });

  it("keeps the note for the courier", () => {
    expect(inv.note).toBe("Gọi trước 10 phút");
  });

  it("counts the pieces, not the lines", () => {
    expect(inv.units).toBe(2);
    expect(inv.lines).toHaveLength(1);
  });

  it("names how it is being paid", () => {
    expect(inv.paymentLabel).toBe("COD");
  });

  it("totals goods, delivery and handling, less the discount — the number checkout charged", () => {
    expect(inv.totalVnd).toBe(780_000 + 30_000 + 15_000 - 78_000);
  });
});

describe("invoiceOf — rows that do not apply are absent", () => {
  it("leaves out the handling fee and the discount when both are zero", () => {
    const plain = bill({
      ...placed,
      codFeeVnd: 0,
      discountVnd: 0,
      payment: "BANK_TRANSFER",
      status: { state: "AWAITING_TRANSFER", dueAt: "2026-09-20T21:00:00+07:00" },
    });
    expect(plain.rows.map((r) => r.label)).toEqual(["Tạm tính", "Phí giao"]);
  });

  it("writes free delivery as a word, not as a zero", () => {
    const free = bill({ ...placed, shippingFeeVnd: 0 });
    expect(free.rows).toContainEqual({ label: "Phí giao", value: "Miễn phí" });
  });
});
