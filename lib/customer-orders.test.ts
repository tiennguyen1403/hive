import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CUSTOMER_CANCEL_REASON,
  ORDER_TABS,
  OVERDUE_REASON,
  REFUND_NONE,
  REFUND_TO_SOURCE,
  effectiveOrder,
  effectiveStatus,
  inTab,
  orderTimeline,
  ordersForTab,
  refundNote,
} from "./customer-orders";
import { CUSTOMERS } from "@/data/customers";
import { ORDERS, orderByCode, ordersOf } from "@/data/orders";
import { orderCode, type Order } from "@/data/types";

const ME = CUSTOMERS[0]!;
const MINE = ordersOf(ME.id);

describe("the fixtures these tests rest on", () => {
  it("gives the signed-in customer more than one order to look at", () => {
    expect(MINE.length).toBeGreaterThan(1);
  });
});

describe("ordersForTab", () => {
  it("offers exactly the four tabs the screen draws", () => {
    expect(ORDER_TABS.map((t) => t.key)).toEqual([
      "all",
      "processing",
      "delivered",
      "cancelled",
    ]);
  });

  it("returns everything on the first tab", () => {
    expect(ordersForTab(MINE, "all")).toHaveLength(MINE.length);
  });

  it("counts awaiting-transfer, paid and shipping as still being handled", () => {
    const got = ordersForTab(MINE, "processing");
    expect(
      got.every((o) =>
        ["AWAITING_TRANSFER", "PAID", "SHIPPING"].includes(o.status.state),
      ),
    ).toBe(true);
  });

  it("keeps delivered and cancelled out of 'processing'", () => {
    const got = ordersForTab(MINE, "processing").map((o) => o.status.state);
    expect(got).not.toContain("DELIVERED");
    expect(got).not.toContain("CANCELLED");
  });

  it("splits the two finished states apart", () => {
    expect(
      ordersForTab(MINE, "delivered").every((o) => o.status.state === "DELIVERED"),
    ).toBe(true);
    expect(
      ordersForTab(MINE, "cancelled").every((o) => o.status.state === "CANCELLED"),
    ).toBe(true);
  });

  it("puts the newest order first on every tab", () => {
    for (const tab of ORDER_TABS) {
      const got = ordersForTab(MINE, tab.key);
      const times = got.map((o) => Date.parse(o.placedAt));
      expect(times).toEqual([...times].sort((a, b) => b - a));
    }
  });

  it("does not reorder the list it was given", () => {
    const before = MINE.map((o) => o.code);
    ordersForTab(MINE, "all");
    expect(MINE.map((o) => o.code)).toEqual(before);
  });
});

/**
 * An order checkout placed for cash on delivery: taken, and nobody has paid.
 * The state the fixtures never needed and the database now issues.
 */
const RECEIVED: Order = {
  ...orderByCode.get(orderCode("DH-2430"))!,
  code: orderCode("DH-2432"),
  status: { state: "RECEIVED" },
  payment: "COD",
  codFeeVnd: 15_000,
  placedAt: "2026-09-20T19:00:00+07:00",
};

describe("a RECEIVED order — taken, nobody paid yet", () => {
  it("is still being handled", () => {
    expect(inTab("processing", "RECEIVED")).toBe(true);
    expect(inTab("delivered", "RECEIVED")).toBe(false);
    expect(inTab("cancelled", "RECEIVED")).toBe(false);
    expect(ordersForTab([RECEIVED], "processing")).toHaveLength(1);
  });

  it("reads as the order, then the two steps still ahead — nothing claimed as done", () => {
    const steps = orderTimeline(RECEIVED);
    expect(steps.map((s) => s.title)).toEqual(["Đã nhận đơn", "Đóng gói", "Giao hàng"]);
    expect(steps.map((s) => s.state)).toEqual(["now", "todo", "todo"]);
    expect(steps[0]!.detail).toBe("20/09 · 19:00");
  });

  it("is not something the clock can cancel", () => {
    const late = new Date("2026-10-30T10:00:00+07:00");
    expect(effectiveStatus(RECEIVED, late)).toBe(RECEIVED.status);
  });

  it("has nothing to refund once the shopper calls it off", () => {
    // COD money is collected at the door, and a cancelled order never got
    // there. The payment-method rule alone would say "sẽ được hoàn".
    const called: Order = {
      ...RECEIVED,
      status: {
        state: "CANCELLED",
        cancelledAt: "2026-09-20T19:30:00+07:00",
        reason: CUSTOMER_CANCEL_REASON,
      },
    };
    expect(refundNote(called)).toBe(REFUND_NONE);
    expect(refundNote({ ...called, payment: "CARD" })).toBe(REFUND_NONE);
  });
});

// ──────────────────────────────────────────────────────────────── timeline
describe("orderTimeline", () => {
  const pick = (state: string) => MINE.find((o) => o.status.state === state);

  it("marks every step with a word, never colour alone", () => {
    for (const o of MINE) {
      for (const step of orderTimeline(o)) {
        expect(step.title.length).toBeGreaterThan(0);
        expect(["done", "now", "todo"]).toContain(step.state);
      }
    }
  });

  it("has exactly one step underway, and none after it are done", () => {
    for (const o of MINE) {
      const steps = orderTimeline(o);
      expect(steps.filter((s) => s.state === "now")).toHaveLength(1);
      const at = steps.findIndex((s) => s.state === "now");
      expect(steps.slice(at + 1).every((s) => s.state === "todo")).toBe(true);
      expect(steps.slice(0, at).every((s) => s.state === "done")).toBe(true);
    }
  });

  it("stops at the cancellation for a cancelled order, with no steps beyond", () => {
    const o = pick("CANCELLED");
    if (!o) throw new Error("fixture lost its cancelled order");
    const steps = orderTimeline(o);
    expect(steps.at(-1)!.state).toBe("now");
    expect(steps.at(-1)!.title).toMatch(/huỷ/i);
    expect(steps.some((s) => s.state === "todo")).toBe(false);
  });

  it("ends a delivered order on its last step, nothing left to wait for", () => {
    const o = pick("DELIVERED");
    if (!o) throw new Error("fixture lost its delivered order");
    const steps = orderTimeline(o);
    expect(steps.at(-1)!.state).toBe("now");
    expect(steps.some((s) => s.state === "todo")).toBe(false);
  });

  it("leaves the later steps ahead of a shipping order", () => {
    const o = pick("SHIPPING");
    if (!o) throw new Error("fixture lost its shipping order");
    expect(orderTimeline(o).some((s) => s.state === "todo")).toBe(true);
  });

  it("carries the tracking code onto the step that has one", () => {
    const o = pick("SHIPPING");
    if (!o || o.status.state !== "SHIPPING") throw new Error("no shipping order");
    const text = orderTimeline(o)
      .map((s) => s.detail ?? "")
      .join(" ");
    expect(text).toContain(o.status.trackingCode);
  });
});

describe("refundNote", () => {
  it("says there is nothing to refund on an order never paid for", () => {
    const o = MINE.find((o) => o.status.state === "CANCELLED");
    if (!o) throw new Error("fixture lost its cancelled order");
    expect(refundNote(o)).toMatch(/không/i);
  });

  it("reads a missed deadline as never paid, whatever the method", () => {
    const overdue: Order = {
      ...RECEIVED,
      payment: "CARD",
      status: { state: "CANCELLED", cancelledAt: "2026-09-21T07:00:00+07:00", reason: OVERDUE_REASON },
    };
    expect(refundNote(overdue)).toBe(REFUND_NONE);
  });

  it("still promises the money back on a paid order the shop cancelled for its own reason", () => {
    const shop: Order = {
      ...RECEIVED,
      payment: "CARD",
      status: { state: "CANCELLED", cancelledAt: "2026-09-21T07:00:00+07:00", reason: "hết hàng" },
    };
    expect(refundNote(shop)).toBe(REFUND_TO_SOURCE);
  });

  it("says nothing at all for an order that was not cancelled", () => {
    const o = MINE.find((o) => o.status.state !== "CANCELLED");
    if (!o) throw new Error("every fixture order is cancelled");
    expect(refundNote(o)).toBeNull();
  });
});

describe("effectiveStatus — the status is read off the clock", () => {
  const waiting = orderByCode.get(orderCode("DH-2430"))!; // due 21/09 19:50
  const shipping = orderByCode.get(orderCode("DH-2422"))!;

  it("leaves a transfer alone while the hold is still running", () => {
    const status = effectiveStatus(waiting, new Date("2026-09-21T19:49:00+07:00"));
    expect(status).toBe(waiting.status);
  });

  it("cancels it the moment the hold runs out", () => {
    const status = effectiveStatus(waiting, new Date("2026-09-21T19:50:00+07:00"));
    expect(status.state).toBe("CANCELLED");
    expect(status.state === "CANCELLED" && status.reason).toBe(OVERDUE_REASON);
  });

  it("stamps the DEADLINE, not the moment somebody looked", () => {
    // The pieces went back on the shelf at 19:50 on the 21st, whoever opens
    // the screen and whenever.
    const a = effectiveStatus(waiting, new Date("2026-09-22T10:00:00+07:00"));
    const b = effectiveStatus(waiting, new Date("2026-10-30T10:00:00+07:00"));
    expect(a.state === "CANCELLED" && a.cancelledAt).toBe("2026-09-21T19:50:00+07:00");
    expect(b).toEqual(a);
  });

  it("touches no other state", () => {
    const late = new Date("2026-10-30T10:00:00+07:00");
    for (const o of ORDERS) {
      if (o.status.state === "AWAITING_TRANSFER") continue;
      expect(effectiveStatus(o, late)).toBe(o.status);
      expect(effectiveOrder(o, late)).toBe(o);
    }
    expect(effectiveStatus(shipping, late)).toBe(shipping.status);
  });

  it("gives the timeline the cancellation rather than a step left hanging", () => {
    const steps = orderTimeline(effectiveOrder(waiting, new Date("2026-09-22T10:00:00+07:00")));
    expect(steps[steps.length - 1]!.title).toBe("Đã huỷ — quá hạn chuyển khoản");
    expect(steps.some((s) => s.title === "Chờ chuyển khoản")).toBe(false);
  });

  it("does not mutate the order it was handed", () => {
    effectiveOrder(waiting, new Date("2026-09-22T10:00:00+07:00"));
    expect(waiting.status.state).toBe("AWAITING_TRANSFER");
  });
});

/**
 * The two reasons the database writes itself are the two constants the
 * screens compare against. If a migration respelled one — "khách hủy" with
 * the other accent, say — every refund note and every timeline would quietly
 * take the wrong branch, with every other test still green.
 */
describe("the reasons the database writes are the ones the screens read", () => {
  const dir = join(process.cwd(), "supabase", "migrations");
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");

  it("cancels an overdue transfer with OVERDUE_REASON, verbatim", () => {
    expect(sql).toContain(`cancel_reason = '${OVERDUE_REASON}'`);
  });

  it("cancels at the shopper's request with CUSTOMER_CANCEL_REASON, verbatim", () => {
    expect(sql).toContain(`cancel_reason = '${CUSTOMER_CANCEL_REASON}'`);
  });
});
