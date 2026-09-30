import { describe, expect, it } from "vitest";
import { ORDERS } from "@/data/orders";
import type { Order, OrderStatus, PaymentMethod } from "@/data/types";
import { timelineOf, timelineSteps, type Milestone } from "./admin-timeline";

/**
 * "Hành trình" on an order's own page (round v5 slice 1): the v3 milestones,
 * and how the Arc Stepper reads them — which step is the current one, and
 * which is late.
 */

const NOW = new Date("2026-09-22T18:50:00+07:00");

function order(status: OrderStatus, payment: PaymentMethod = "BANK_TRANSFER"): Order {
  return { ...ORDERS[0]!, placedAt: "2026-09-20T19:50:00+07:00", status, payment };
}

describe("timelineOf", () => {
  it("opens a transfer being waited on with the order itself, the deadline next", () => {
    const m = timelineOf(order({ state: "AWAITING_TRANSFER", dueAt: "2026-09-23T07:50:00+07:00" }), NOW);
    expect(m.map((x) => x.title)).toEqual(["Đã nhận đơn", "Chờ chuyển khoản", "Chờ bàn giao", "Đang giao", "Đã giao"]);
    expect(m.map((x) => x.state)).toEqual(["now", "todo", "todo", "todo", "todo"]);
    expect(m[0]!.detail).toBe("19:50 · 20/09");
    expect(m[1]!.detail).toBe("hạn 07:50 ngày 23/09");
  });

  it("turns handover red at the shop's own promise", () => {
    const fresh = timelineOf(order({ state: "PAID", paidAt: "2026-09-22T10:00:00+07:00" }), NOW);
    expect(fresh[2]).toMatchObject({ title: "Chờ bàn giao", state: "now" });
    const late = timelineOf(order({ state: "PAID", paidAt: "2026-09-20T10:00:00+07:00" }), NOW);
    expect(late[2]).toMatchObject({ title: "Chờ bàn giao", state: "late" });
    expect(late[2]!.detail).toBe("2 ngày 8 giờ trước · mục tiêu bàn giao trong 1 ngày sau thanh toán");
  });

  it("leaves the payment step out of a COD parcel on the road, and names the carrier", () => {
    const status: OrderStatus = {
      state: "SHIPPING",
      shippedAt: "2026-09-21T08:05:00+07:00",
      trackingCode: "VNP-8842377",
      carrier: "Giao tiêu chuẩn · 2–4 ngày",
    };
    const cod = timelineOf(order(status, "COD"), NOW, "Giao tiêu chuẩn · 2–4 ngày");
    expect(cod.map((x) => x.title)).toEqual(["Đã nhận đơn", "Đã bàn giao", "Đang giao", "Đã giao"]);
    expect(cod[2]!.detail).toBe("08:05 · 21/09 · Giao tiêu chuẩn · 2–4 ngày · VNP-8842377");
    expect(timelineOf(order(status), NOW).map((x) => x.title)).toContain("Đã thanh toán");
  });

  it("stops a cancelled order at its cancellation, with the reason in the title", () => {
    const m = timelineOf(
      order({ state: "CANCELLED", cancelledAt: "2026-09-21T18:10:00+07:00", reason: "Khách đổi ý" }),
      NOW,
    );
    expect(m.map((x) => x.title)).toEqual(["Đã nhận đơn", "Đã huỷ · Khách đổi ý"]);
    expect(m[1]).toMatchObject({ state: "late", detail: "18:10 · 21/09" });
  });
});

describe("timelineSteps", () => {
  it("makes the first milestone that is now the current step", () => {
    const { steps, current } = timelineSteps(
      timelineOf(order({ state: "SHIPPING", shippedAt: "2026-09-21T08:05:00+07:00", trackingCode: "X" }), NOW),
    );
    expect(current).toBe(3);
    expect(steps[3]).toEqual({ id: "Đang giao", label: "Đang giao", description: "08:05 · 21/09 · X" });
  });

  it("gives a milestone with no detail no description at all", () => {
    const { steps } = timelineSteps(
      timelineOf(order({ state: "DELIVERED", deliveredAt: "2026-09-22T09:00:00+07:00" }), NOW),
    );
    expect(steps[1]).toEqual({ id: "Đã thanh toán", label: "Đã thanh toán" });
    expect("description" in steps[1]!).toBe(false);
  });

  it("carries a late milestone's detail as its error, and makes it the current step", () => {
    const { steps, current } = timelineSteps(
      timelineOf(order({ state: "CANCELLED", cancelledAt: "2026-09-21T18:10:00+07:00", reason: "quá hạn chuyển khoản" }), NOW),
    );
    expect(current).toBe(1);
    expect(steps[1]).toEqual({
      id: "Đã huỷ · quá hạn chuyển khoản",
      label: "Đã huỷ · quá hạn chuyển khoản",
      error: "18:10 · 21/09",
    });
  });

  it("is complete when no milestone is now or late", () => {
    const done: Milestone[] = [
      { title: "A", detail: "", state: "done" },
      { title: "B", detail: "b", state: "done" },
    ];
    expect(timelineSteps(done).current).toBe(2);
  });

  it("keys every step by a title that is unique within the order", () => {
    for (const status of [
      { state: "AWAITING_TRANSFER", dueAt: "2026-09-23T07:50:00+07:00" },
      { state: "RECEIVED" },
      { state: "PAID", paidAt: "2026-09-22T10:00:00+07:00" },
      { state: "SHIPPING", shippedAt: "2026-09-21T08:05:00+07:00", trackingCode: "X" },
      { state: "DELIVERED", deliveredAt: "2026-09-22T09:00:00+07:00" },
      { state: "CANCELLED", cancelledAt: "2026-09-21T18:10:00+07:00", reason: "Khách đổi ý" },
    ] satisfies OrderStatus[]) {
      const ids = timelineSteps(timelineOf(order(status), NOW)).steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
