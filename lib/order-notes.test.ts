import { describe, expect, it } from "vitest";
import { ORDERS } from "@/data/orders";
import type { AdminEvent } from "./db/event-dto";
import { CUSTOMER_AUTHOR, NOTE_AUTHOR, addressEditReason, internalNotes } from "./order-notes";

const ORDER = ORDERS.find((o) => o.code === "DH-2429")!; // transfer, paid
const CODE = "DH-2429";
const AT = "2026-09-20T18:52:00+07:00";

let id = 0;
const base = (over: Partial<{ at: string; actorRole: "admin" | "customer" | "system"; actor: string }> = {}) => ({
  id: ++id,
  at: AT,
  actorRole: "admin" as const,
  actor: "quanly@email.com",
  code: CODE,
  ...over,
});

const SHIP_TO = ORDER.shipTo;

describe("internalNotes — one record, read as notes", () => {
  it("tells a matched transfer from a payment the shop confirmed by hand", () => {
    const matched = internalNotes([{ ...base({ actorRole: "system", actor: "" }), kind: "ORDER_PAID" }], ORDER);
    expect(matched[0]!.text).toMatch(/^Chuyển khoản khớp nội dung DH2429 · .*₫$/);
    expect(matched[0]!.system).toBe(true);

    const byHand = internalNotes([{ ...base(), kind: "ORDER_PAID", from: "AWAITING_TRANSFER" }], ORDER);
    expect(byHand[0]!.text).toBe("Đã ghi nhận tiền về · đơn chuyển sang Đã thanh toán.");
  });

  it("names the courier on a handover when one was recorded", () => {
    const events: AdminEvent[] = [
      { ...base(), kind: "ORDER_SHIPPED", carrier: "Giao tiêu chuẩn · 2–4 ngày", trackingCode: "VNP-2429-01" },
      { ...base({ at: "2026-09-18T07:15:00+07:00" }), kind: "ORDER_SHIPPED", trackingCode: "VD-8842-1907" },
    ];
    expect(internalNotes(events, ORDER).map((n) => n.text)).toEqual([
      "Bàn giao · mã vận đơn VD-8842-1907.",
      "Bàn giao · Giao tiêu chuẩn · 2–4 ngày · mã vận đơn VNP-2429-01.",
    ]);
  });

  it("splits a cancellation into what happened and what was written about it", () => {
    const notes = internalNotes(
      [{ ...base(), kind: "ORDER_CANCELLED", from: "PAID", reason: "Khác", note: "  khách gọi huỷ  " }],
      ORDER,
    );
    expect(notes).toEqual([
      { text: "Huỷ đơn · lý do: Khác.", author: "", at: AT, system: true },
      { text: "khách gọi huỷ", author: NOTE_AUTHOR, at: AT, system: false },
    ]);
  });

  it("drops an empty internal comment rather than adding a blank note", () => {
    const notes = internalNotes([{ ...base(), kind: "ORDER_CANCELLED", reason: "Khác", note: "" }], ORDER);
    expect(notes).toHaveLength(1);
  });

  it("names the shopper as the hand that cancelled their own order", () => {
    const [note] = internalNotes(
      [{ ...base({ actorRole: "customer", actor: "x@example.test" }), kind: "ORDER_CANCELLED_BY_CUSTOMER" }],
      ORDER,
    );
    expect(note).toMatchObject({ author: CUSTOMER_AUTHOR, system: false });
  });

  it("writes what the clock did, the shop's typed notes and an address change", () => {
    const events: AdminEvent[] = [
      { ...base({ actorRole: "system", actor: "" }), kind: "ORDER_EXPIRED" },
      { ...base(), kind: "ORDER_NOTE", text: "gọi trước" },
      {
        ...base(),
        kind: "ORDER_ADDRESS_EDITED",
        before: SHIP_TO,
        after: { ...SHIP_TO, line: "47 Trần Hưng Đạo" },
        reason: "khách nhắn đổi số nhà",
      },
      { ...base({ actorRole: "system", actor: "" }), kind: "ORDER_DELIVERED" },
      { ...base(), kind: "ORDER_DELIVERED" },
    ];
    expect(internalNotes(events, ORDER).map((n) => [n.text, n.author])).toEqual([
      ["Huỷ đơn · lý do: quá hạn chuyển khoản.", ""],
      ["gọi trước", NOTE_AUTHOR],
      ["Sửa địa chỉ giao · lý do: khách nhắn đổi số nhà", ""],
      ["Khách đã nhận hàng.", ""],
      ["Khách đã nhận hàng · cửa hàng đánh dấu tay.", ""],
    ]);
  });

  it("keeps to its own order, skips the placement and the resets, and sorts oldest first", () => {
    const events: AdminEvent[] = [
      { ...base({ at: "2026-09-20T19:00:00+07:00" }), kind: "ORDER_NOTE", text: "sau" },
      { ...base({ at: "2026-09-20T09:00:00+07:00" }), kind: "ORDER_NOTE", text: "trước" },
      { ...base(), code: "DH-2430", kind: "ORDER_NOTE", text: "đơn khác" },
      { ...base({ actorRole: "customer" }), kind: "ORDER_PLACED" },
      { id: 99, at: AT, actorRole: "system", actor: "", kind: "DEMO_RESET", anchor: "2026-09-20T18:50:00+07:00" },
    ];
    expect(internalNotes(events, ORDER).map((n) => n.text)).toEqual(["trước", "sau"]);
  });
});

describe("addressEditReason", () => {
  it("is the last edit's reason, for this order only", () => {
    const edit = (code: string, reason: string): AdminEvent => ({
      ...base(),
      code,
      kind: "ORDER_ADDRESS_EDITED",
      before: SHIP_TO,
      after: SHIP_TO,
      reason,
    });
    const events = [edit(CODE, "lần một"), edit("DH-2430", "đơn khác"), edit(CODE, "lần hai")];
    expect(addressEditReason(events, CODE)).toBe("lần hai");
    expect(addressEditReason(events, "DH-2431")).toBeUndefined();
  });
});
