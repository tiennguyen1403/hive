import { describe, expect, it } from "vitest";
import { ORDERS } from "@/data/orders";
import type { Order } from "@/data/types";
import { toOrder, toOrders } from "./order-dto";

/**
 * JSON exactly as `order_json()` writes it (`supabase/migrations/…_orders.sql`):
 * camelCase keys, the status as its own object, `promo` null when there is
 * none, every instant with `+07:00` spelled out.
 */
function json(status: Record<string, unknown>, over: Record<string, unknown> = {}) {
  return {
    code: "DH-2432",
    customerId: "",
    lines: [
      { productId: "p-khoi", size: "M", color: "black", qty: 2, unitPriceVnd: 390000 },
      { productId: "p-nang", size: "L", color: "moss", qty: 1, unitPriceVnd: 450000 },
    ],
    status,
    payment: "BANK_TRANSFER",
    shippingFeeVnd: 30000,
    codFeeVnd: 0,
    discountVnd: 78000,
    shipTo: {
      recipient: "Khách Thử",
      phone: "0901234567",
      line: "1 Thử Nghiệm",
      provinceCode: "29",
      wardCode: "70101063",
    },
    placedAt: "2026-09-20T19:00:00+07:00",
    promo: "DOT05",
    email: "khach@example.test",
    note: "gọi trước 10 phút",
    delivery: "STANDARD",
    ...over,
  };
}

/** The same order, as the app reads it. */
const expected = (status: Order["status"], over: Partial<Order> = {}): Order =>
  ({
    code: "DH-2432",
    customerId: "",
    lines: [
      { productId: "p-khoi", size: "M", color: "black", qty: 2, unitPriceVnd: 390_000 },
      { productId: "p-nang", size: "L", color: "moss", qty: 1, unitPriceVnd: 450_000 },
    ],
    status,
    payment: "BANK_TRANSFER",
    delivery: "STANDARD",
    shippingFeeVnd: 30_000,
    codFeeVnd: 0,
    discountVnd: 78_000,
    shipTo: {
      recipient: "Khách Thử",
      phone: "0901234567",
      line: "1 Thử Nghiệm",
      provinceCode: "29",
      wardCode: "70101063",
    },
    email: "khach@example.test",
    note: "gọi trước 10 phút",
    placedAt: "2026-09-20T19:00:00+07:00",
    promo: "DOT05",
    ...over,
  }) as Order;

describe("toOrder — all six states", () => {
  it("reads a transfer still being waited on, with its deadline", () => {
    const status = { state: "AWAITING_TRANSFER", dueAt: "2026-09-21T07:00:00+07:00" } as const;
    expect(toOrder(json(status))).toEqual(expected(status));
  });

  it("reads a COD order the shop has taken, which carries nothing else", () => {
    const got = toOrder(json({ state: "RECEIVED" }, { payment: "COD", codFeeVnd: 15000 }));
    expect(got).toEqual(expected({ state: "RECEIVED" }, { payment: "COD", codFeeVnd: 15_000 }));
    expect(Object.keys(got.status)).toEqual(["state"]);
  });

  it("reads a paid order", () => {
    const status = { state: "PAID", paidAt: "2026-09-20T19:13:00+07:00" } as const;
    expect(toOrder(json(status))).toEqual(expected(status));
  });

  it("reads a shipping order with its tracking code", () => {
    const status = {
      state: "SHIPPING",
      shippedAt: "2026-09-21T07:15:00+07:00",
      trackingCode: "VD-8842-1907",
    } as const;
    expect(toOrder(json(status))).toEqual(expected(status));
  });

  it("reads a delivered order", () => {
    const status = { state: "DELIVERED", deliveredAt: "2026-09-23T10:05:00+07:00" } as const;
    expect(toOrder(json(status))).toEqual(expected(status));
  });

  it("reads a cancelled order and why", () => {
    const status = {
      state: "CANCELLED",
      cancelledAt: "2026-09-20T19:30:00+07:00",
      reason: "khách huỷ",
    } as const;
    expect(toOrder(json(status))).toEqual(expected(status));
  });

  it("keeps a state to its own fields, whatever else the object carries", () => {
    const got = toOrder(
      json({ state: "RECEIVED", trackingCode: "VD-1", dueAt: "2026-09-21T07:00:00+07:00" }),
    );
    expect(got.status).toEqual({ state: "RECEIVED" });
  });
});

describe("toOrder — the optional and the empty", () => {
  it("leaves promo off when the order has no code", () => {
    const got = toOrder(json({ state: "RECEIVED" }, { promo: null, discountVnd: 0 }));
    expect("promo" in got).toBe(false);
  });

  it("accepts an empty note and an empty owner — a guest who typed nothing", () => {
    const got = toOrder(json({ state: "RECEIVED" }, { note: "", customerId: "" }));
    expect(got.note).toBe("");
    expect(got.customerId).toBe("");
  });

  it("carries a demo account's handle as the owner", () => {
    expect(toOrder(json({ state: "RECEIVED" }, { customerId: "c-minhanh" })).customerId).toBe(
      "c-minhanh",
    );
  });
});

describe("toOrder — refuses what order_json() would never write, and says where", () => {
  const good = () => json({ state: "RECEIVED" });

  it("names the field that is wrong", () => {
    expect(() => toOrder({ ...good(), placedAt: "2026-09-20T12:00:00Z" })).toThrow(
      "order DH-2432.placedAt must be an ISO instant ending in +07:00",
    );
    expect(() => toOrder({ ...good(), status: { state: "LOST" } })).toThrow(
      "order DH-2432.status.state must be one of",
    );
    expect(() => toOrder({ ...good(), payment: "CASH" })).toThrow("order DH-2432.payment");
  });

  it("refuses a status missing the field its state needs", () => {
    expect(() => toOrder(json({ state: "AWAITING_TRANSFER" }))).toThrow(
      "order DH-2432.status.dueAt",
    );
    expect(() =>
      toOrder(json({ state: "SHIPPING", shippedAt: "2026-09-21T07:15:00+07:00" })),
    ).toThrow("order DH-2432.status.trackingCode");
    expect(() => toOrder(json({ state: "CANCELLED", cancelledAt: "2026-09-21T07:15:00+07:00" })))
      .toThrow("order DH-2432.status.reason");
  });

  it("refuses money that is not whole, or below zero", () => {
    expect(() => toOrder({ ...good(), discountVnd: -1 })).toThrow("order DH-2432.discountVnd");
    expect(() => toOrder({ ...good(), shippingFeeVnd: 1.5 })).toThrow(
      "order DH-2432.shippingFeeVnd",
    );
  });

  it("refuses an order with no lines, or a line with no pieces", () => {
    expect(() => toOrder({ ...good(), lines: [] })).toThrow("order DH-2432.lines");
    expect(() =>
      toOrder({
        ...good(),
        lines: [{ productId: "p-khoi", size: "M", color: "black", qty: 0, unitPriceVnd: 1 }],
      }),
    ).toThrow("order DH-2432.lines[0].qty");
  });

  it("refuses a code the database would not have issued", () => {
    expect(() => toOrder({ ...good(), code: "2432" })).toThrow("order.code");
  });

  it("refuses something that is not an order at all", () => {
    expect(() => toOrder(null)).toThrow("order must be an object");
    expect(() => toOrders({})).toThrow("orders must be an array");
  });
});

describe("toOrders", () => {
  it("reads the list in the order it came", () => {
    const got = toOrders([
      json({ state: "RECEIVED" }, { code: "DH-2433" }),
      json({ state: "RECEIVED" }),
    ]);
    expect(got.map((o) => o.code)).toEqual(["DH-2433", "DH-2432"]);
  });

  it("reads an empty list as no orders", () => {
    expect(toOrders([])).toEqual([]);
  });
});

/**
 * The sample orders, written the way `order_json()` writes them, come back as
 * the fixture itself. The database half of this — that `order_json()` really
 * does write them this way — is `lib/db/orders.dbtest.ts`.
 */
describe("toOrder — the twenty-four sample orders survive the trip", () => {
  it("reads each one back unchanged", () => {
    for (const o of ORDERS) {
      const wire = {
        ...o,
        status: { ...o.status },
        promo: o.promo ?? null,
        shipTo: { ...o.shipTo, phone: o.shipTo.phone.replace(/\s/g, "") },
      };
      const back = toOrder(JSON.parse(JSON.stringify(wire)));
      expect(back).toEqual({ ...o, shipTo: wire.shipTo });
    }
  });
});
