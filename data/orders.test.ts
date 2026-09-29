import { describe, it, expect } from "vitest";
import { CATALOG, byId } from "./catalog";
import { CUSTOMERS } from "./customers";
import { ORDERS } from "./orders";
import { PROMOTIONS } from "./promotions";
import { PROVINCES, findWard } from "./regions";
import { SIZES } from "./types";
import { isFixed, isIssueStyle, soldUnits } from "@/lib/inventory";
import {
  orderSubtotalVnd,
  orderTotalVnd,
  orderUnits,
  promoDiscountVnd,
} from "@/lib/orders";

describe("customers", () => {
  it("keeps every id distinct", () => {
    expect(new Set(CUSTOMERS.map((c) => c.id)).size).toBe(CUSTOMERS.length);
  });

  it("keeps every email distinct, since that is how a shopper signs in", () => {
    const emails = CUSTOMERS.map((c) => c.email.toLowerCase());
    expect(new Set(emails).size).toBe(CUSTOMERS.length);
  });

  it("points every saved address at a real province and commune", () => {
    const pc = new Set(PROVINCES.map((p) => p.code));
    for (const c of CUSTOMERS) {
      for (const a of c.addresses) {
        expect(pc.has(a.provinceCode), `${c.name}: province`).toBe(true);
        expect(
          findWard(a.provinceCode, a.wardCode),
          `${c.name}: commune ${a.wardCode} is not in province ${a.provinceCode}`,
        ).toBeDefined();
      }
    }
  });

  it("gives an address book at most one default", () => {
    for (const c of CUSTOMERS) {
      const defaults = c.addresses.filter((a) => a.isDefault);
      expect(defaults.length, `${c.name} has ${defaults.length} defaults`)
        .toBeLessThanOrEqual(1);
    }
  });
});

describe("orders reference real things", () => {
  it("keeps every order code distinct", () => {
    expect(new Set(ORDERS.map((o) => o.code)).size).toBe(ORDERS.length);
  });

  it("names a customer that exists", () => {
    const ids = new Set(CUSTOMERS.map((c) => c.id));
    for (const o of ORDERS) {
      expect(ids.has(o.customerId), `${o.code} → ${o.customerId}`).toBe(true);
    }
  });

  it("names a product that exists, in a colour that product comes in", () => {
    for (const o of ORDERS) {
      for (const l of o.lines) {
        const p = byId.get(l.productId);
        expect(p, `${o.code} → ${l.productId}`).toBeDefined();
        expect(
          p!.colors.includes(l.color),
          `${o.code}: ${p!.name} does not come in ${l.color}`,
        ).toBe(true);
        expect(SIZES).toContain(l.size);
      }
    }
  });

  it("never orders zero or fewer of something", () => {
    for (const o of ORDERS) {
      expect(o.lines.length).toBeGreaterThan(0);
      for (const l of o.lines) expect(l.qty).toBeGreaterThan(0);
    }
  });

  it("charges the product's price on the line", () => {
    for (const o of ORDERS) {
      for (const l of o.lines) {
        expect(l.unitPriceVnd, `${o.code} line price`).toBe(
          byId.get(l.productId)!.priceVnd,
        );
      }
    }
  });

  it("names a promotion that exists when one is applied", () => {
    const codes = new Set(PROMOTIONS.map((p) => p.code));
    for (const o of ORDERS.filter((o) => o.promo)) {
      expect(codes.has(o.promo!), `${o.code} → ${o.promo}`).toBe(true);
    }
  });
});

describe("orders stay inside what was actually sold", () => {
  it("never ships more units of a style than the catalog says left the shelf", () => {
    // These orders are a recent sample, not the full ledger — but a sample
    // cannot contain more of a style than was ever sold. If it does, the two
    // fixtures have drifted apart and the admin screens will contradict
    // each other.
    const shipped = new Map<string, number>();
    for (const o of ORDERS) {
      if (o.status.state === "CANCELLED") continue;
      for (const l of o.lines) {
        shipped.set(l.productId, (shipped.get(l.productId) ?? 0) + l.qty);
      }
    }
    // An issue's style: a fixed one (slice B5) has no cut, so no "ever sold"
    // is arithmetic over its shelf — and the sample holds none of them.
    for (const p of CATALOG.filter(isIssueStyle)) {
      const n = shipped.get(p.id) ?? 0;
      expect(n, `${p.name}: sample has ${n}, only ${soldUnits(p)} ever sold`)
        .toBeLessThanOrEqual(soldUnits(p));
    }
    const fixed = new Set(CATALOG.filter(isFixed).map((p) => p.id));
    expect([...shipped.keys()].filter((id) => fixed.has(id as never))).toEqual([]);
  });
});

describe("order money adds up", () => {
  it("sums the lines rather than carrying a typed-in subtotal", () => {
    const o = ORDERS[0]!;
    const byHand = o.lines.reduce((n, l) => n + l.unitPriceVnd * l.qty, 0);
    expect(orderSubtotalVnd(o)).toBe(byHand);
  });

  it("reaches the total as subtotal plus shipping and handling minus discount", () => {
    for (const o of ORDERS) {
      expect(orderTotalVnd(o)).toBe(
        orderSubtotalVnd(o) + o.shippingFeeVnd + o.codFeeVnd - o.discountVnd,
      );
    }
  });

  it("keeps the sample's handling fee at zero, so reviewed figures do not move", () => {
    // `codFeeVnd` joined the wire format at slice B2. The sample orders were
    // priced before it existed and keep 0 — COD ones included.
    for (const o of ORDERS) expect(o.codFeeVnd, o.code).toBe(0);
  });

  it("never discounts more than the goods are worth", () => {
    for (const o of ORDERS) {
      expect(o.discountVnd, `${o.code}`).toBeLessThanOrEqual(orderSubtotalVnd(o));
      expect(o.discountVnd).toBeGreaterThanOrEqual(0);
    }
  });

  it("gives a discount exactly when a promotion says so", () => {
    for (const o of ORDERS) {
      const promo = PROMOTIONS.find((p) => p.code === o.promo);
      expect(o.discountVnd, `${o.code}`).toBe(
        promoDiscountVnd(promo, orderSubtotalVnd(o), o.shippingFeeVnd),
      );
    }
  });

  it("counts units across the lines", () => {
    const o = ORDERS[0]!;
    expect(orderUnits(o)).toBe(o.lines.reduce((n, l) => n + l.qty, 0));
  });
});

describe("order status carries what that state needs", () => {
  it("dates every state against the moment the order was placed", () => {
    for (const o of ORDERS) {
      const placed = Date.parse(o.placedAt);
      const at = {
        AWAITING_TRANSFER: () => Date.parse((o.status as any).dueAt),
        // Nothing has happened since the order was taken.
        RECEIVED: () => placed,
        PAID: () => Date.parse((o.status as any).paidAt),
        SHIPPING: () => Date.parse((o.status as any).shippedAt),
        DELIVERED: () => Date.parse((o.status as any).deliveredAt),
        CANCELLED: () => Date.parse((o.status as any).cancelledAt),
      }[o.status.state]();
      expect(at, `${o.code} ${o.status.state} predates its own order`)
        .toBeGreaterThanOrEqual(placed);
    }
  });

  it("gives a shipping order a tracking code and a cancelled one a reason", () => {
    for (const o of ORDERS) {
      if (o.status.state === "SHIPPING") {
        expect(o.status.trackingCode.length).toBeGreaterThan(0);
      }
      if (o.status.state === "CANCELLED") {
        expect(o.status.reason.length).toBeGreaterThan(0);
      }
    }
  });

  it("covers every state, so no admin screen has an untested column", () => {
    const seen = new Set(ORDERS.map((o) => o.status.state));
    for (const s of [
      "AWAITING_TRANSFER",
      "PAID",
      "SHIPPING",
      "DELIVERED",
      "CANCELLED",
    ]) {
      expect(seen.has(s as never), `no order is ${s}`).toBe(true);
    }
  });
});

/**
 * Slice B10: the steps each sample order passed — paid, handed over,
 * delivered — so the Feed order page stamps every one, as the mock stamps
 * DH-1496. The rule and where its numbers come from are written beside the
 * fixture (`data/orders.ts`); these restate the numbers on purpose.
 */
describe("the steps each sample order passed (`moments`)", () => {
  const ANCHOR = Date.parse("2026-09-20T18:50:00+07:00");
  const TWINS = ["DH-2416", "DH-2210"];

  it("gives every step an order passed its moment, the status's own included, and no other", () => {
    for (const o of ORDERS) {
      const s = o.status;
      const paysAhead = o.payment !== "COD";
      const paid = paysAhead ? { paidAt: expect.any(String) } : {};
      switch (s.state) {
        case "PAID":
          expect(o.moments, o.code).toEqual({ paidAt: s.paidAt });
          break;
        case "SHIPPING":
          expect(o.moments, o.code).toEqual({ ...paid, shippedAt: s.shippedAt });
          break;
        case "DELIVERED":
          expect(o.moments, o.code).toEqual({ ...paid, shippedAt: expect.any(String), deliveredAt: s.deliveredAt });
          break;
        default:
          // Waiting, taken, or cancelled: no step the page stamps was passed.
          expect(o.moments, o.code).toBeUndefined();
      }
    }
  });

  it("never pays a COD order ahead: it pays at the door", () => {
    for (const o of ORDERS.filter((x) => x.payment === "COD")) {
      expect(o.moments?.paidAt, o.code).toBeUndefined();
    }
  });

  it("keeps them in order — placed, paid, handed over, delivered — and none after the anchor", () => {
    for (const o of ORDERS) {
      const chain = [o.placedAt, o.moments?.paidAt, o.moments?.shippedAt, o.moments?.deliveredAt]
        .filter((at): at is string => at !== undefined)
        .map(Date.parse);
      for (let i = 1; i < chain.length; i++) {
        expect(chain[i], `${o.code}: step ${i} before the one ahead of it`).toBeGreaterThanOrEqual(chain[i - 1]!);
      }
      for (const at of chain) expect(at, `${o.code} after the anchor`).toBeLessThanOrEqual(ANCHOR);
    }
  });

  it("gives the two orders the Feed mock also has the mock's own times", () => {
    const moments = (code: string) => ORDERS.find((o) => o.code === code)!.moments;
    // DH-1496: placed 21:40 11/09, paid 21:52, handed over 08:20 13/09, delivered 10:02 16/09.
    expect(moments("DH-2416")).toEqual({
      paidAt: "2026-09-11T21:52:00+07:00",
      shippedAt: "2026-09-13T08:20:00+07:00",
      deliveredAt: "2026-09-16T10:02:00+07:00",
    });
    // DH-1210: placed 20:30 09/03, paid 20:41, handed over 09:00 11/03, delivered 10:05 14/03.
    expect(moments("DH-2210")).toEqual({
      paidAt: "2026-03-09T20:41:00+07:00",
      shippedAt: "2026-03-11T09:00:00+07:00",
      deliveredAt: "2026-03-14T10:05:00+07:00",
    });
  });

  it("times every other one by the mock's rule: paid 13 minutes after placing, handed over at 08:25 two days on", () => {
    const day = (iso: string) => Date.parse(iso.slice(0, 10));
    let paid = 0;
    let handed = 0;
    for (const o of ORDERS.filter((x) => !TWINS.includes(x.code))) {
      const m = o.moments;
      // A PAID order's payment and a SHIPPING order's hand-over are their status's own.
      if (m?.paidAt && o.status.state !== "PAID") {
        expect(Date.parse(m.paidAt) - Date.parse(o.placedAt), o.code).toBe(13 * 60_000);
        paid += 1;
      }
      if (m?.shippedAt && o.status.state === "DELIVERED") {
        expect(m.shippedAt.slice(11), o.code).toBe("08:25:00+07:00");
        expect(day(m.shippedAt) - day(o.placedAt), o.code).toBe(2 * 86_400_000);
        handed += 1;
      }
    }
    // Bar the two twins: nine transfer or card orders on their way or delivered, ten delivered.
    expect([paid, handed]).toEqual([9, 10]);
  });
});

describe("the fields slice B2 added to every order", () => {
  it("sends the confirmation to the customer's own address", () => {
    for (const o of ORDERS) {
      const customer = CUSTOMERS.find((c) => c.id === o.customerId);
      expect(o.email, o.code).toBe(customer!.email);
    }
  });

  it("carries no note and the one delivery service there was", () => {
    for (const o of ORDERS) {
      expect(o.note, o.code).toBe("");
      expect(o.delivery, o.code).toBe("STANDARD");
    }
  });
});

describe("promotions", () => {
  it("keeps every code distinct", () => {
    expect(new Set(PROMOTIONS.map((p) => p.code)).size).toBe(PROMOTIONS.length);
  });

  it("ends every window after it starts", () => {
    for (const p of PROMOTIONS) {
      expect(Date.parse(p.endsAt)).toBeGreaterThan(Date.parse(p.startsAt));
    }
  });

  it("never records more uses than the limit allows", () => {
    for (const p of PROMOTIONS) {
      if (p.usageLimit !== null) {
        expect(p.usedCount, `${p.code}`).toBeLessThanOrEqual(p.usageLimit);
      }
      expect(p.usedCount).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps a percentage between 1 and 100", () => {
    for (const p of PROMOTIONS) {
      if (p.kind === "PERCENT") {
        expect(p.percent).toBeGreaterThan(0);
        expect(p.percent).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("promoDiscountVnd", () => {
  const window = {
    startsAt: "2026-09-01T00:00:00+07:00",
    endsAt: "2026-10-01T00:00:00+07:00",
    usageLimit: null,
    usedCount: 0,
  };

  it("is nothing at all when no promotion applies", () => {
    expect(promoDiscountVnd(undefined, 1_000_000, 30_000)).toBe(0);
  });

  it("takes a percentage off the goods, not off the shipping", () => {
    const p = { code: "X" as never, kind: "PERCENT" as const, percent: 10, ...window };
    expect(promoDiscountVnd(p, 1_000_000, 30_000)).toBe(100_000);
  });

  it("stops at the cap when one is set", () => {
    const p = {
      code: "X" as never,
      kind: "PERCENT" as const,
      percent: 20,
      maxDiscountVnd: 150_000,
      ...window,
    };
    expect(promoDiscountVnd(p, 1_000_000, 30_000)).toBe(150_000);
  });

  it("never takes off more than the goods cost", () => {
    const p = { code: "X" as never, kind: "AMOUNT" as const, amountVnd: 500_000, ...window };
    expect(promoDiscountVnd(p, 300_000, 30_000)).toBe(300_000);
  });

  it("refunds exactly the shipping for a free-shipping code", () => {
    const p = { code: "X" as never, kind: "FREE_SHIPPING" as const, ...window };
    expect(promoDiscountVnd(p, 1_000_000, 30_000)).toBe(30_000);
  });

  it("gives nothing when the order is under the minimum", () => {
    const p = {
      code: "X" as never,
      kind: "AMOUNT" as const,
      amountVnd: 100_000,
      minOrderVnd: 500_000,
      ...window,
    };
    expect(promoDiscountVnd(p, 400_000, 30_000)).toBe(0);
    expect(promoDiscountVnd(p, 500_000, 30_000)).toBe(100_000);
  });
});
