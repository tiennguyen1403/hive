import type { Order, PaymentMethod, Promotion } from "@/data/types";

/**
 * Order arithmetic. The same rules the checkout screen shows the shopper and
 * the admin order screen shows the operator — one implementation, so the two
 * cannot disagree.
 */

/*
 * Each takes only the fields it reads (round v4 slice 4a), so the order the
 * guest lookup hands out (`LookedUpOrder`, `lib/order-lookup.ts`) — which has
 * no address, phone or owner — is summed by the same arithmetic.
 */

export function orderSubtotalVnd(o: Pick<Order, "lines">): number {
  return o.lines.reduce((n, l) => n + l.unitPriceVnd * l.qty, 0);
}

export function orderUnits(o: Pick<Order, "lines">): number {
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
export function orderTotalVnd(o: Pick<Order, "lines" | "shippingFeeVnd" | "codFeeVnd" | "discountVnd">): number {
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
 * Whether an order waits in AWAITING_TRANSFER, holding its pieces for
 * `TRANSFER_HOLD_HOURS`, and cancels itself when the hold runs out — the
 * name is the Feed mock's (`HIVE.paysByTransfer`) and the state's.
 *
 * A transfer, and since slice B7 a card order too: from B7 to B18 a card
 * order paid by transfer (user, 27/09); since slice B18 it pays on Stripe's
 * page, in test mode (QĐ-46), and keeps the same state and the same hold
 * while it waits. COD is the one method that is not — it is paid at the door,
 * so nothing is held for it. `place_order()` names the same two methods
 * (`lib/orders.test.ts` pins that the SQL and this agree).
 */
export function paysByTransfer(payment: PaymentMethod): boolean {
  return payment === "BANK_TRANSFER" || payment === "CARD";
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
