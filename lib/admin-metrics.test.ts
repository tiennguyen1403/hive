import { describe, it, expect } from "vitest";
import {
  BOOKED_STATES,
  averageOrderVnd,
  needsAction,
  recentOrders,
  customerSplit,
  dropRanking,
  revenueByDay,
  salesWindow,
  stockAlerts,
  windowDays,
} from "./admin-metrics";
import { CUSTOMERS } from "@/data/customers";
import { ORDERS } from "@/data/orders";
import type { AdminOrder } from "./admin-orders";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import type { Order, OrderStatus } from "@/data/types";
import { customerId, orderCode } from "@/data/types";

/** The smallest Order the metrics actually read: when, what state, how much. */
function order(placedAt: string, status: OrderStatus, unitPriceVnd: number): Order {
  return {
    code: orderCode(`DH-${unitPriceVnd}${placedAt.slice(8, 10)}`),
    customerId: customerId("c-minhanh"),
    lines: [
      {
        productId: "p-khoi" as Order["lines"][number]["productId"],
        size: "M",
        color: "black",
        qty: 1,
        unitPriceVnd,
      },
    ],
    status,
    payment: "BANK_TRANSFER",
    shippingFeeVnd: 0,
    discountVnd: 0,
    delivery: "STANDARD",
    codFeeVnd: 0,
    email: "minhanh@email.com",
    note: "",
    shipTo: {
      recipient: "Trần Minh Anh",
      phone: "0912345678",
      provinceCode: "29",
      wardCode: "70101063",
      line: "24 Nguyễn Thị Minh Khai",
    },
    placedAt,
  };
}

const paid = (at: string): OrderStatus => ({ state: "PAID", paidAt: at });
const delivered = (at: string): OrderStatus => ({ state: "DELIVERED", deliveredAt: at });
const shipping = (at: string): OrderStatus =>
  ({ state: "SHIPPING", shippedAt: at, trackingCode: "VD-1" });
const awaiting = (at: string): OrderStatus => ({ state: "AWAITING_TRANSFER", dueAt: at });
const cancelled = (at: string): OrderStatus =>
  ({ state: "CANCELLED", cancelledAt: at, reason: "quá hạn chuyển khoản" });

/** 2026-09-20, 10:00 Vietnam time, as an instant. */
const NOW = new Date("2026-09-20T10:00:00+07:00");

describe("revenueByDay", () => {
  it("returns one point per day, ending on today", () => {
    const pts = revenueByDay(NOW, [], 14);
    expect(pts).toHaveLength(14);
    expect(pts.at(-1)!.day).toBe("2026-09-20");
    expect(pts[0]!.day).toBe("2026-09-07");
  });

  it("keeps a day with no orders as a zero, not as a gap", () => {
    // Between two drops the shop sells nothing, and that IS the shape of the
    // business. Dropping the empty days would draw a continuous trade that
    // never happened.
    const pts = revenueByDay(NOW, [order("2026-09-20T09:00:00+07:00", paid("x"), 500_000)], 3);
    expect(pts.map((p) => p.vnd)).toEqual([0, 0, 500_000]);
  });

  it("reads the calendar day off the timestamp's own text", () => {
    // 23:30 in Vietnam is 16:30 UTC and already tomorrow in Auckland. Going
    // through Date's local getters would file this order on a different day
    // depending on where the build ran.
    const pts = revenueByDay(NOW, [order("2026-09-19T23:30:00+07:00", paid("x"), 700_000)], 3);
    expect(pts.find((p) => p.day === "2026-09-19")!.vnd).toBe(700_000);
    expect(pts.find((p) => p.day === "2026-09-20")!.vnd).toBe(0);
  });

  it("books paid, shipping and delivered orders", () => {
    expect([...BOOKED_STATES].sort()).toEqual(["DELIVERED", "PAID", "SHIPPING"]);
    const os = [
      order("2026-09-20T08:00:00+07:00", paid("x"), 100_000),
      order("2026-09-20T09:00:00+07:00", shipping("x"), 200_000),
      order("2026-09-20T10:00:00+07:00", delivered("x"), 300_000),
    ];
    expect(revenueByDay(NOW, os, 1)[0]!.vnd).toBe(600_000);
  });

  it("books nothing for a cancelled order", () => {
    // The money never arrived. DH-2310 in the fixtures is exactly this case.
    const pts = revenueByDay(NOW, [order("2026-09-20T09:00:00+07:00", cancelled("x"), 900_000)], 1);
    expect(pts[0]!.vnd).toBe(0);
    expect(pts[0]!.orders).toBe(0);
  });

  it("books nothing yet for an order still awaiting transfer", () => {
    // Placed is not paid. Counting it would report money the shop does not
    // have, and the fixtures contain an order that was cancelled for exactly
    // this reason after twelve hours.
    const pts = revenueByDay(NOW, [order("2026-09-20T09:00:00+07:00", awaiting("x"), 900_000)], 1);
    expect(pts[0]!.vnd).toBe(0);
  });

  it("ignores orders older than the window", () => {
    const pts = revenueByDay(NOW, [order("2026-06-10T09:00:00+07:00", delivered("x"), 800_000)], 14);
    expect(pts.reduce((n, p) => n + p.vnd, 0)).toBe(0);
  });
});

describe("salesWindow", () => {
  it("totals the window and names its best day", () => {
    const os = [
      order("2026-09-18T09:00:00+07:00", paid("x"), 400_000),
      order("2026-09-19T09:00:00+07:00", paid("x"), 900_000),
      order("2026-09-20T09:00:00+07:00", paid("x"), 100_000),
    ];
    const w = salesWindow(NOW, os, 14);
    expect(w.totalVnd).toBe(1_400_000);
    expect(w.orders).toBe(3);
    expect(w.peak!.day).toBe("2026-09-19");
  });

  it("has no peak when nothing sold, rather than a day claiming zero", () => {
    expect(salesWindow(NOW, [], 14).peak).toBeNull();
  });

  it("matches the fixtures: the window opens before the drop did", () => {
    // Drop 05 opened on 11/09. A 14-day window from 20/09 reaches back to
    // 07/09, so the first four days are real zeros — the gap between drops.
    const w = salesWindow(NOW, ORDERS, 14);
    expect(w.points.slice(0, 4).every((p) => p.vnd === 0)).toBe(true);
    expect(w.points[4]!.day).toBe("2026-09-11");
    expect(w.totalVnd).toBeGreaterThan(0);
  });
});

describe("averageOrderVnd", () => {
  it("divides booked money by booked orders", () => {
    const os = [
      order("2026-09-19T09:00:00+07:00", paid("x"), 300_000),
      order("2026-09-20T09:00:00+07:00", paid("x"), 500_000),
    ];
    expect(averageOrderVnd(os)).toBe(400_000);
  });

  it("leaves cancelled orders out of both halves of the fraction", () => {
    const os = [
      order("2026-09-19T09:00:00+07:00", paid("x"), 300_000),
      order("2026-09-20T09:00:00+07:00", cancelled("x"), 900_000),
    ];
    expect(averageOrderVnd(os)).toBe(300_000);
  });

  it("is zero, not NaN, when nothing has been booked", () => {
    expect(averageOrderVnd([])).toBe(0);
  });
});

describe("needsAction", () => {
  it("picks the orders the shop still owes a move on", () => {
    // Waiting on the shopper's transfer, or paid and not yet handed over.
    // Shipping and delivered are somebody else's turn; cancelled is nobody's.
    const os = [
      order("2026-09-20T01:00:00+07:00", awaiting("x"), 100_000),
      order("2026-09-20T02:00:00+07:00", paid("x"), 200_000),
      order("2026-09-20T03:00:00+07:00", shipping("x"), 300_000),
      order("2026-09-20T04:00:00+07:00", delivered("x"), 400_000),
      order("2026-09-20T05:00:00+07:00", cancelled("x"), 500_000),
    ];
    expect(needsAction(os).map((o) => o.status.state)).toEqual(["AWAITING_TRANSFER", "PAID"]);
  });

  it("counts a COD or card order the shop has taken and not handled (slice B3a)", () => {
    const received = order("2026-09-20T06:00:00+07:00", { state: "RECEIVED" }, 600_000);
    expect(needsAction([received]).map((o) => o.status.state)).toEqual(["RECEIVED"]);
  });

  it("finds them in the real fixtures", () => {
    expect(needsAction(ORDERS).length).toBe(5);
  });
});

describe("recentOrders", () => {
  it("returns the newest first, capped", () => {
    const rows = recentOrders(ORDERS, 5);
    expect(rows).toHaveLength(5);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.placedAt >= rows[i]!.placedAt).toBe(true);
    }
  });

  it("does not hide cancelled orders — an admin list is a ledger", () => {
    const all = recentOrders(ORDERS, ORDERS.length);
    expect(all).toHaveLength(ORDERS.length);
  });
});

describe("stockAlerts", () => {
  it("puts what has run out above what is merely low", () => {
    const rows = stockAlerts(FIXTURE_CATALOG, FIXTURE_CATALOG.currentDropNo);
    const firstLow = rows.findIndex((r) => r.left > 0);
    const lastGone = rows.map((r) => r.left).lastIndexOf(0);
    if (firstLow !== -1 && lastGone !== -1) expect(lastGone).toBeLessThan(firstLow);
  });

  it("says which sizes went, not just that something did", () => {
    for (const r of stockAlerts(FIXTURE_CATALOG, FIXTURE_CATALOG.currentDropNo)) {
      expect(r.note.length).toBeGreaterThan(0);
    }
  });

  it("only reports styles from the drop it was asked about", () => {
    for (const r of stockAlerts(FIXTURE_CATALOG, FIXTURE_CATALOG.currentDropNo)) {
      expect(r.product.dropNo).toBe(FIXTURE_CATALOG.currentDropNo);
    }
  });

  it("leaves a fully stocked style out", () => {
    const rows = stockAlerts(FIXTURE_CATALOG, FIXTURE_CATALOG.currentDropNo);
    expect(rows.every((r) => r.left <= 3)).toBe(true);
  });
});

describe("windowDays", () => {
  it("takes one of the three offered ranges", () => {
    expect(windowDays("7")).toBe(7);
    expect(windowDays("30")).toBe(30);
  });

  it("falls back to fourteen for anything else", () => {
    // The same rule QĐ-8 applies to every value read off a URL: check it
    // against the list of legal ones before it reaches a calculation.
    expect(windowDays(undefined)).toBe(14);
    expect(windowDays("9999")).toBe(14);
    expect(windowDays("tuần")).toBe(14);
  });

  it("reads the first value when the parameter repeats", () => {
    expect(windowDays(["30", "7"])).toBe(30);
  });
});

describe("customerSplit", () => {
  const OPENS = "2026-09-11T20:00:00+07:00";
  /** The sample orders as the back office reads them: each with its account. */
  const BOOK: AdminOrder[] = ORDERS.map((o) => {
    const c = CUSTOMERS.find((x) => x.id === o.customerId)!;
    return {
      ...o,
      owner: { id: `uuid-${c.id}`, handle: String(c.id), name: c.name, email: c.email, phone: "", joinedAt: c.joinedAt },
    };
  });

  it("counts people, not orders", () => {
    const split = customerSplit(NOW, BOOK, 30, OPENS);
    expect(split.total).toBeGreaterThan(0);
    expect(split.total).toBeLessThanOrEqual(ORDERS.length);
    expect(split.fresh + split.returning).toBe(split.total);
  });

  it("ignores orders nobody paid for", () => {
    const only = BOOK.filter((o) => o.status.state === "AWAITING_TRANSFER");
    expect(customerSplit(NOW, only, 30, OPENS).total).toBe(0);
  });

  it("calls somebody new when they joined inside the drop", () => {
    // The cut is the drop's opening instant: joined before it, they came
    // back for this one; joined after it, this drop is how they found us.
    const allFresh = customerSplit(NOW, BOOK, 30, "2000-01-01T00:00:00+07:00");
    expect(allFresh.returning).toBe(0);
    expect(allFresh.fresh).toBe(allFresh.total);
    const noneFresh = customerSplit(NOW, BOOK, 30, "2099-01-01T00:00:00+07:00");
    expect(noneFresh.fresh).toBe(0);
  });

  it("counts nobody for an order placed signed out, rather than inventing a person", () => {
    const guests = BOOK.map((o) => ({ ...o, owner: null }));
    expect(customerSplit(NOW, guests, 30, OPENS)).toEqual({ total: 0, fresh: 0, returning: 0 });
  });
});

describe("dropRanking", () => {
  it("ranks by units gone, best first", () => {
    const rows = dropRanking(FIXTURE_CATALOG, FIXTURE_CATALOG.currentDropNo);
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.sold).toBeGreaterThanOrEqual(rows[i]!.sold);
    }
  });

  it("reports the share of the cut beside the count", () => {
    for (const r of dropRanking(FIXTURE_CATALOG, FIXTURE_CATALOG.currentDropNo)) {
      expect(r.percent).toBe(Math.round((r.sold / r.cut) * 100));
      expect(r.sold + r.left).toBe(r.cut);
    }
  });

  it("holds every style of the drop and nothing from another", () => {
    const rows = dropRanking(FIXTURE_CATALOG, FIXTURE_CATALOG.currentDropNo);
    expect(rows.every((r) => r.product.dropNo === FIXTURE_CATALOG.currentDropNo)).toBe(true);
  });
});
