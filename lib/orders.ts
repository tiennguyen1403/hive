import type { Order, Promotion } from "@/data/types";
import { demoNow } from "./clock";

/**
 * Order arithmetic. The same rules the checkout screen shows the shopper and
 * the admin order screen shows the operator — one implementation, so the two
 * cannot disagree.
 */

export function orderSubtotalVnd(o: Order): number {
  return o.lines.reduce((n, l) => n + l.unitPriceVnd * l.qty, 0);
}

export function orderUnits(o: Order): number {
  return o.lines.reduce((n, l) => n + l.qty, 0);
}

export function orderTotalVnd(o: Order): number {
  return orderSubtotalVnd(o) + o.shippingFeeVnd - o.discountVnd;
}

/**
 * What a promotion takes off.
 *
 * Two rules worth stating because they are the ones shoppers argue about:
 * a percentage comes off the goods and never off the shipping, and no code
 * can take off more than the goods are worth. A discount larger than the
 * subtotal would make the shop pay the shopper.
 */
export function promoDiscountVnd(
  promo: Promotion | undefined,
  subtotalVnd: number,
  shippingFeeVnd: number,
): number {
  if (!promo) return 0;
  if (promo.minOrderVnd !== undefined && subtotalVnd < promo.minOrderVnd) return 0;

  switch (promo.kind) {
    case "PERCENT": {
      const off = Math.floor((subtotalVnd * promo.percent) / 100);
      const capped = promo.maxDiscountVnd ? Math.min(off, promo.maxDiscountVnd) : off;
      return Math.min(capped, subtotalVnd);
    }
    case "AMOUNT":
      return Math.min(promo.amountVnd, subtotalVnd);
    case "FREE_SHIPPING":
      return shippingFeeVnd;
  }
}

/** Whether a code can be used right now — window and usage cap, both. */
export function isPromoLive(promo: Promotion, now: Date = demoNow()): boolean {
  const t = now.getTime();
  if (t < Date.parse(promo.startsAt) || t >= Date.parse(promo.endsAt)) return false;
  return promo.usageLimit === null || promo.usedCount < promo.usageLimit;
}
