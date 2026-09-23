import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ORDERS } from "@/data/orders";
import type { Order, OrderStatus, PaymentMethod } from "@/data/types";
import {
  ADMIN_ERROR_CODES,
  CANCEL_REASONS,
  adminFailureMessage,
  adminFailureOf,
  bulkPaidMessage,
  canCancel,
  canEditAddress,
  isCancelReason,
  isCarrier,
  isPaidFor,
  isTrackingCode,
  nextMove,
  normaliseTrackingCode,
} from "./admin-orders";

const NOW = new Date("2026-09-20T18:50:00+07:00");

function order(status: OrderStatus, payment: PaymentMethod = "BANK_TRANSFER"): Order {
  return { ...ORDERS[0]!, status, payment };
}

const awaiting = (dueAt: string) => order({ state: "AWAITING_TRANSFER", dueAt });

describe("nextMove — the SQL guard read as a to-do list", () => {
  it("confirms a transfer still inside its hold", () => {
    expect(nextMove(awaiting("2026-09-21T19:50:00+07:00"), NOW)).toBe("MARK_PAID");
  });

  it("has nothing left for a transfer whose hold ran out: it is cancelled", () => {
    expect(nextMove(awaiting("2026-09-20T18:00:00+07:00"), NOW)).toBeNull();
  });

  it("hands a COD order over, and asks for a card order's money first", () => {
    expect(nextMove(order({ state: "RECEIVED" }, "COD"), NOW)).toBe("HAND_OVER");
    expect(nextMove(order({ state: "RECEIVED" }, "CARD"), NOW)).toBe("MARK_PAID");
  });

  it("hands a paid order over, and records a parcel's delivery", () => {
    expect(nextMove(order({ state: "PAID", paidAt: "2026-09-20T10:00:00+07:00" }), NOW)).toBe("HAND_OVER");
    expect(
      nextMove(order({ state: "SHIPPING", shippedAt: "2026-09-20T10:00:00+07:00", trackingCode: "X" }), NOW),
    ).toBe("MARK_DELIVERED");
  });

  it("has nothing left for a delivered or a cancelled order", () => {
    expect(nextMove(order({ state: "DELIVERED", deliveredAt: "2026-09-20T10:00:00+07:00" }), NOW)).toBeNull();
    expect(
      nextMove(order({ state: "CANCELLED", cancelledAt: "2026-09-20T10:00:00+07:00", reason: "x" }), NOW),
    ).toBeNull();
  });
});

describe("canCancel and canEditAddress — only before the parcel leaves", () => {
  const open = [
    awaiting("2026-09-21T19:50:00+07:00"),
    order({ state: "RECEIVED" }, "COD"),
    order({ state: "PAID", paidAt: "2026-09-20T10:00:00+07:00" }),
  ];
  const closed = [
    awaiting("2026-09-20T18:00:00+07:00"),
    order({ state: "SHIPPING", shippedAt: "2026-09-20T10:00:00+07:00", trackingCode: "X" }),
    order({ state: "DELIVERED", deliveredAt: "2026-09-20T10:00:00+07:00" }),
    order({ state: "CANCELLED", cancelledAt: "2026-09-20T10:00:00+07:00", reason: "x" }),
  ];

  it("allows the three states before handover", () => {
    for (const o of open) {
      expect(canCancel(o, NOW), o.status.state).toBe(true);
      expect(canEditAddress(o, NOW), o.status.state).toBe(true);
    }
  });

  it("refuses an expired hold, a parcel on the road and a finished order", () => {
    for (const o of closed) {
      expect(canCancel(o, NOW), o.status.state).toBe(false);
      expect(canEditAddress(o, NOW), o.status.state).toBe(false);
    }
  });
});

describe("isPaidFor — money received, not promised", () => {
  it("counts a paid, delivered, or prepaid shipping order", () => {
    expect(isPaidFor(order({ state: "PAID", paidAt: "x" }))).toBe(true);
    expect(isPaidFor(order({ state: "DELIVERED", deliveredAt: "x" }, "COD"))).toBe(true);
    expect(isPaidFor(order({ state: "SHIPPING", shippedAt: "x", trackingCode: "X" }))).toBe(true);
  });

  it("does not count a COD parcel still on the road, or an order only taken", () => {
    expect(isPaidFor(order({ state: "SHIPPING", shippedAt: "x", trackingCode: "X" }, "COD"))).toBe(false);
    expect(isPaidFor(order({ state: "RECEIVED" }, "CARD"))).toBe(false);
    expect(isPaidFor(awaiting("x"))).toBe(false);
  });
});

describe("what a form may send", () => {
  it("knows the four reasons, and nothing else", () => {
    expect(CANCEL_REASONS).toEqual(["Khách đổi ý", "Quá hạn chuyển khoản", "Hết hàng thật", "Khác"]);
    expect(isCancelReason("Khác")).toBe(true);
    expect(isCancelReason("khác")).toBe(false);
  });

  it("records one of the delivery services the shop sells as the carrier", () => {
    expect(isCarrier("Giao tiêu chuẩn · 2–4 ngày")).toBe(true);
    expect(isCarrier("Giao nhanh nội thành · 24 giờ")).toBe(true);
    expect(isCarrier("GHN")).toBe(false);
  });

  it("takes a tracking number as couriers print it, the way the database checks it", () => {
    expect(normaliseTrackingCode("  vnp-2430-01 ")).toBe("VNP-2430-01");
    for (const ok of ["VNP-2430-01", "VD-8842-1907", "S19825433.MB", "A"]) expect(isTrackingCode(ok), ok).toBe(true);
    for (const bad of ["", "-X", "VNP 2430", "#2430", "X".repeat(41)]) {
      expect(isTrackingCode(bad), bad).toBe(false);
    }
  });

  it("uses the pattern admin_hand_over() uses", () => {
    const dir = join(process.cwd(), "supabase", "migrations");
    const sql = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .join("\n");
    expect(sql).toContain("v_tracking !~ '^[A-Z0-9][A-Z0-9.-]*$'");
    expect(sql).toContain("length(v_tracking) > 40");
  });
});

describe("what went wrong", () => {
  it("reads the four codes the admin functions raise, and nothing else", () => {
    for (const code of ADMIN_ERROR_CODES) {
      expect(adminFailureOf({ code: "P0001", message: code })).toBe(code);
    }
    expect(adminFailureOf({ code: "P0001", message: "OUT_OF_STOCK" })).toBe("UNAVAILABLE");
    expect(adminFailureOf({ code: "42501", message: "permission denied" })).toBe("UNAVAILABLE");
    expect(adminFailureOf(null)).toBe("UNAVAILABLE");
  });

  it("says which order and what to do, move by move", () => {
    expect(adminFailureMessage("MARK_PAID", "NOT_ALLOWED", "DH-2430")).toBe(
      "DH-2430 không còn chờ tiền — tải lại trang để xem trạng thái mới.",
    );
    expect(adminFailureMessage("CANCEL", "NOT_ALLOWED", "DH-2422")).toContain("không huỷ được nữa");
    expect(adminFailureMessage("HAND_OVER", "BAD_INPUT")).toContain("Mã vận đơn");
    expect(adminFailureMessage("NOTE", "NOT_FOUND", "DH-9999")).toBe("Không tìm thấy đơn DH-9999.");
    expect(adminFailureMessage("RESET", "NOT_FOUND")).toBe("Không tìm thấy đơn này.");
    expect(adminFailureMessage("RESET", "NOT_ADMIN")).toContain("đăng nhập lại");
    expect(adminFailureMessage("EDIT_ADDRESS", "UNAVAILABLE")).toBe("Chưa lưu được. Thử lại sau ít phút.");
  });

  it("counts a half-failed batch honestly", () => {
    expect(bulkPaidMessage(3, 0)).toBe("3 đơn → đã thanh toán · đã lưu");
    expect(bulkPaidMessage(2, 1)).toContain("1 đơn không đổi được");
    expect(bulkPaidMessage(0, 2)).toMatch(/^Chưa đánh dấu được đơn nào/);
  });
});
