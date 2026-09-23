import { describe, it, expect } from "vitest";
import { invoiceOf } from "./invoice";
import { findFixtureOrder, trackedOfOrder, trackedOfPlaced } from "./lookup";
import type { PlacedOrder } from "./placed-order";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";

const NAM = "0908 221 447";
const DURING_5 = new Date("2026-09-20T10:00:00+07:00");

const placed: PlacedOrder = {
  code: "DH-9001",
  placedAt: "2026-09-20T09:00:00+07:00",
  lines: [
    {
      slug: "khoi",
      name: "KHÓI",
      kind: "Áo thun oversize",
      colorLabel: "Đen",
      size: "M",
      qty: 2,
      unitPriceVnd: 390_000,
      photoKey: "khoi",
    },
  ],
  recipient: "Trần Minh Anh",
  phone: "0912345678",
  email: "minhanh@vidu.vn",
  addressLine: "12 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh",
  note: "Gọi trước 10 phút",
  delivery: "STANDARD",
  payment: "COD",
  subtotalVnd: 780_000,
  shippingFeeVnd: 30_000,
  codFeeVnd: 15_000,
  discountVnd: 78_000,
  promo: "DOT05",
  totalVnd: 747_000,
};

describe("invoiceOf — an order the shop shipped", () => {
  const order = findFixtureOrder("DH-2425", NAM)!;
  const inv = invoiceOf(trackedOfOrder(FIXTURE_CATALOG, order, "88 Xuân Thuỷ, Phường Cầu Giấy, TP. Hà Nội", DURING_5));

  it("carries the order's own identity", () => {
    expect(inv.brand).toBe("BRAND");
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

describe("invoiceOf — an order placed in this browser", () => {
  const inv = invoiceOf(trackedOfPlaced(placed, DURING_5));

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
});

describe("invoiceOf — rows that do not apply are absent", () => {
  it("leaves out the handling fee and the discount when both are zero", () => {
    const plain = invoiceOf(
      trackedOfPlaced(
        { ...placed, codFeeVnd: 0, discountVnd: 0, payment: "BANK_TRANSFER" },
        DURING_5,
      ),
    );
    expect(plain.rows.map((r) => r.label)).toEqual(["Tạm tính", "Phí giao"]);
  });

  it("writes free delivery as a word, not as a zero", () => {
    const free = invoiceOf(trackedOfPlaced({ ...placed, shippingFeeVnd: 0 }, DURING_5));
    expect(free.rows).toContainEqual({ label: "Phí giao", value: "Miễn phí" });
  });
});
