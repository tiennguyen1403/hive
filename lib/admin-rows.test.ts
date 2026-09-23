import { describe, it, expect } from "vitest";
import {
  orderItemsLabel,
  orderNote,
  promoState,
  promoValueLabel,
  queueRows,
  simDropRows,
} from "./admin-rows";
import { EMPTY_SIM, pushSim, simDrops } from "./admin-sim";
import { DROPS } from "@/data/catalog";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { ORDERS } from "@/data/orders";
import { promoCode, type Order, type OrderStatus, type Promotion } from "@/data/types";

/** The smallest order the row builders read: a state, a time and a line. */
function testOrder(status: OrderStatus): Order {
  const first = ORDERS[0]!;
  return { ...first, status };
}

const NOW = new Date("2026-09-20T10:00:00+07:00");

function promo(over: Partial<Promotion> = {}): Promotion {
  return {
    code: promoCode("TEST"),
    kind: "AMOUNT",
    amountVnd: 50_000,
    startsAt: "2026-09-11T20:00:00+07:00",
    endsAt: "2026-09-25T20:00:00+07:00",
    usageLimit: 100,
    usedCount: 10,
    ...over,
  } as Promotion;
}

describe("promoState", () => {
  it("is running inside its window with room left", () => {
    expect(promoState(promo(), NOW)).toBe("LIVE");
  });

  it("is upcoming before it starts", () => {
    expect(promoState(promo(), new Date("2026-09-01T10:00:00+07:00"))).toBe("UPCOMING");
  });

  it("is finished after it ends", () => {
    expect(promoState(promo(), new Date("2026-10-01T10:00:00+07:00"))).toBe("ENDED");
  });

  it("is used up when the limit is reached, even inside the window", () => {
    // A code with no uses left is not "đang chạy". The admin needs to see
    // that difference at a glance — it is the reason a shopper's code is
    // being refused while the dates still look fine.
    expect(promoState(promo({ usedCount: 100 }), NOW)).toBe("USED_UP");
  });

  it("treats a null limit as unlimited rather than as zero", () => {
    expect(promoState(promo({ usageLimit: null, usedCount: 9999 }), NOW)).toBe("LIVE");
  });

  it("calls an expired code expired even if it also ran out", () => {
    // One state per row, and the date is the one that cannot be undone.
    expect(promoState(promo({ usedCount: 100 }), new Date("2026-10-01T10:00:00+07:00"))).toBe(
      "ENDED",
    );
  });
});

describe("promoValueLabel", () => {
  it("writes a percentage with its cap, because the cap is the real number", () => {
    expect(
      promoValueLabel(promo({ kind: "PERCENT", percent: 10, maxDiscountVnd: 150_000 })),
    ).toBe("10% · tối đa 150.000₫");
  });

  it("writes a percentage without a cap when there is none", () => {
    expect(promoValueLabel(promo({ kind: "PERCENT", percent: 10 }))).toBe("10%");
  });

  it("writes a flat amount as money", () => {
    expect(promoValueLabel(promo({ kind: "AMOUNT", amountVnd: 50_000 }))).toBe("50.000₫");
  });

  it("says what free shipping is worth, not just that it is free", () => {
    // The kind column beside it already reads "Miễn phí giao"; this column
    // is where the amount goes, and it comes from `lib/shipping.ts` rather
    // than being typed in twice.
    expect(promoValueLabel(promo({ kind: "FREE_SHIPPING" }))).toBe(
      "Phí giao tiêu chuẩn · 30.000₫",
    );
  });
});

describe("orderNote", () => {
  const at = "2026-09-20T10:00:00+07:00";

  it("gives an unpaid transfer its deadline and flags it once it passes", () => {
    const soon = orderNote(
      testOrder({ state: "AWAITING_TRANSFER", dueAt: "2026-09-21T08:05:00+07:00" }),
      NOW,
    )!;
    expect(soon.text).toBe("hạn 08:05 21/09");
    expect(soon.late).toBe(false);

    const past = orderNote(
      testOrder({ state: "AWAITING_TRANSFER", dueAt: "2026-09-19T08:05:00+07:00" }),
      NOW,
    )!;
    expect(past.late).toBe(true);
  });

  it("ages a paid order in whole days and calls two days late", () => {
    expect(orderNote(testOrder({ state: "PAID", paidAt: at }), NOW)!).toEqual({
      text: "chưa bàn giao",
      late: false,
    });
    expect(
      orderNote(testOrder({ state: "PAID", paidAt: "2026-09-17T10:00:00+07:00" }), NOW),
    ).toEqual({ text: "chưa bàn giao · 3 ngày", late: true });
  });

  it("quotes the courier's number while a parcel is out", () => {
    expect(
      orderNote(
        testOrder({ state: "SHIPPING", shippedAt: at, trackingCode: "VNP-8842377" }),
        NOW,
      )!.text,
    ).toBe("VNP-8842377");
  });

  it("says nothing about an order that is finished", () => {
    expect(orderNote(testOrder({ state: "DELIVERED", deliveredAt: at }), NOW)).toBeNull();
    expect(
      orderNote(testOrder({ state: "CANCELLED", cancelledAt: at, reason: "x" }), NOW),
    ).toBeNull();
  });
});

describe("queueRows", () => {
  it("holds exactly the orders waiting on the shop, newest first", () => {
    const rows = queueRows(FIXTURE_CATALOG, ORDERS, NOW);
    expect(rows).toHaveLength(
      ORDERS.filter((o) => ["AWAITING_TRANSFER", "PAID"].includes(o.status.state)).length,
    );
    const codes = rows.map((r) => r.code);
    expect(codes).toEqual([...codes].sort().reverse());
  });

  it("offers the one action that state allows", () => {
    for (const row of queueRows(FIXTURE_CATALOG, ORDERS, NOW)) {
      const order = ORDERS.find((o) => o.code === row.code)!;
      expect(row.action).toBe(
        order.status.state === "AWAITING_TRANSFER" ? "MARK_PAID" : "HAND_OVER",
      );
    }
  });

  it("names what is in the box and what it came to", () => {
    const row = queueRows(FIXTURE_CATALOG, ORDERS, NOW)[0]!;
    const order = ORDERS.find((o) => o.code === row.code)!;
    expect(row.items).toBe(orderItemsLabel(FIXTURE_CATALOG, order));
    expect(row.totalVnd).toBeGreaterThan(0);
    expect(row.customer).not.toBe("—");
  });

  it("marks only a paid order that has waited too long", () => {
    const rows = queueRows(FIXTURE_CATALOG, ORDERS, NOW).filter((r) => r.action === "HAND_OVER");
    for (const r of rows) expect(r.due === null).toBe(!r.late);
  });
});

describe("simDropRows", () => {
  it("counts teased styles apart from styles on sale", () => {
    const rows = simDropRows(FIXTURE_CATALOG, simDrops(DROPS, EMPTY_SIM), NOW);
    const six = rows.find((r) => r.no === 6)!;
    expect(six.styles).toBe(0);
    expect(six.teasers).toBe(2);
  });

  it("reports a drop closed once its hour has been moved to the past", () => {
    const overlay = pushSim(EMPTY_SIM, {
      kind: "DROP_SCHEDULED",
      at: "2026-09-20T09:00:00+07:00",
      no: FIXTURE_CATALOG.currentDropNo,
      opensAt: "2026-09-11T20:00:00+07:00",
      closesAt: "2026-09-20T09:00:00+07:00",
    });
    const row = simDropRows(FIXTURE_CATALOG, simDrops(DROPS, overlay), NOW).find((r) => r.no === FIXTURE_CATALOG.currentDropNo)!;
    expect(row.state).toBe("CLOSED");
    expect(row.rescheduled).toBe(true);
  });
});

