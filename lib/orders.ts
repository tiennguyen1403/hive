import type { Order, PaymentMethod, Promotion } from "@/data/types";
import { demoNow } from "./clock";
import { addHoursIso } from "./datetime";

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

/**
 * Goods, delivery and the cash-handling fee, less the discount.
 *
 * `codFeeVnd` joined at slice B2, when an order placed through checkout
 * started carrying the fee it was charged — the same four terms
 * `lib/shipping.ts#checkoutTotals` adds up, so the receipt and the button that
 * placed the order print one number. The sample orders keep it at 0
 * (`data/orders.ts` says why).
 */
export function orderTotalVnd(o: Order): number {
  return orderSubtotalVnd(o) + o.shippingFeeVnd + o.codFeeVnd - o.discountVnd;
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

/**
 * Whether a code can be used right now — window and usage cap, both, and not
 * paused by the shop (slice B3b: `place_order()` refuses a paused code).
 */
export function isPromoLive(promo: Promotion, now: Date = demoNow()): boolean {
  if (promo.paused) return false;
  const t = now.getTime();
  if (t < Date.parse(promo.startsAt) || t >= Date.parse(promo.endsAt)) return false;
  return promo.usageLimit === null || promo.usedCount < promo.usageLimit;
}

// ───────────────────────────────────────────────── the bank-transfer hold
/**
 * How long a bank transfer holds the goods.
 *
 * Twelve hours is a promise made twice before the confirmation screen — on
 * the payment row at checkout and in the note under the order button — and it
 * is the reason the cart is allowed to say it holds no stock: the hold starts
 * when the order is placed, not when the cart was filled.
 *
 * Moved here at slice B2, when orders stopped living in the browser.
 * `place_order()` restates it as `interval '12 hours'` and writes `due_at`
 * itself; this constant is what the screens print.
 */
export const TRANSFER_HOLD_HOURS = 12;

/**
 * Whether an order is paid by bank transfer — and so waits in
 * AWAITING_TRANSFER, holding its pieces for `TRANSFER_HOLD_HOURS`, and
 * cancels itself when the hold runs out.
 *
 * A transfer, and since slice B7 a card order too: no card gateway is
 * connected, so a shopper who picks card pays by transfer (user, 27/09; the
 * Feed mock's `HIVE.paysByTransfer`). COD is the one method that is not —
 * it is paid at the door, so nothing is held for it. `place_order()` names
 * the same two methods (`lib/orders.test.ts` pins that the SQL and this
 * agree).
 */
export function paysByTransfer(payment: PaymentMethod): boolean {
  return payment === "BANK_TRANSFER" || payment === "CARD";
}

/** When an unpaid transfer order cancels itself and the pieces go back. */
export function transferDeadlineIso(placedAtIso: string): string {
  return addHoursIso(placedAtIso, TRANSFER_HOLD_HOURS);
}

/**
 * What goes in the bank's memo field, which will not take a dash: the order
 * code without it, `DH2432`.
 *
 * It is what the shopper is shown to type. The Feed confirmation's transfer
 * block prints it on its "Nội dung" row, beside a copy button, exactly as the
 * mock does (`prototype/explore/feed/confirmed.js`: `memo: "DH1507"` for
 * `DH-1507`; `order.js`: the code with its dash dropped). Everywhere else the
 * code keeps its dash — the receipt's title, the order lists, the lookup —
 * and the back office matches a bank line against an order by this same
 * dashless form (`lib/order-notes.ts`), since the memo is what the bank
 * statement carries.
 */
export function transferReference(code: string): string {
  return code.replace(/-/g, "");
}
