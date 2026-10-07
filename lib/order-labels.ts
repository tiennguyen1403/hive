import type { OrderState, PaymentMethod } from "@/data/types";
import { pick, pickAll, type Locale, type Pair } from "./i18n";

/**
 * The tone a status label carries, named for the STATE and not for a colour,
 * because the colours have moved before (v3's badge family, 22/09/2026; Arc's
 * badge since round v5):
 *
 * · `ok`    a live state — đang bán, đã thanh toán, đã giao.
 * · `info`  something on its way — sắp mở, đang giao.
 * · `hot`   an alert worth a red — sắp hết, hết lượt.
 * · `warn`  waiting on somebody — chờ chuyển khoản.
 * · `shut`  over — đã đóng, đã huỷ, hết.
 * · `flat`  not a state at all: an identity label.
 * · `""`    the neutral one.
 *
 * The back office draws them with Arc's `Badge`: `TONE`
 * (`components/admin-arc/ArcOrderCells.tsx`) turns each into an Arc tone.
 * Until round v5 slice 6 this type was v3's `BadgeTone`, beside its `Badge`.
 */
export type StatusTone = "" | "ok" | "hot" | "warn" | "info" | "shut" | "flat";

/**
 * Wire value → what a person reads, and the tone that carries it.
 *
 * In `lib`, not beside a screen, for a reason that has already bitten once:
 * these used to be exported from `OrdersScreen.tsx`, which is `"use client"`.
 * The admin dashboard and the admin order list both render on the SERVER,
 * and importing a value across that line throws at request time while the
 * build stays silent. `order-labels.test.ts` pins it.
 *
 * The tone is a second channel, never the only one. Every state says its
 * name, so a badge read without colour still reports the state — which is
 * PRODUCT.md's accessibility floor, and also just how a list gets scanned.
 *
 * In both languages since round v6 (QĐ-40), in the words of the user's
 * glossary (01/10/2026): each name is a `{ vi, en }` pair, `STATE_LABEL` the
 * Vietnamese side as before, `stateLabel(state, locale)` either side.
 */
const STATE_TEXT: Record<OrderState, { text: Pair; tone: StatusTone }> = {
  AWAITING_TRANSFER: { text: { vi: "Chờ chuyển khoản", en: "Awaiting transfer" }, tone: "warn" },
  // Taken, and waiting for nothing but the shop — a COD order, or a card
  // order from before slice B7 (a card order waits in AWAITING_TRANSFER since,
  // and pays on Stripe's page since B18). "Đã
  // nhận đơn" and not "Đã thanh toán": no money has moved, and `PAID` on that
  // row would be the screen inventing a payment. Until slice B2 only an order
  // kept in the browser could be in this state, so it had a map of its own
  // (`ROW_STATE_LABEL`); the database issues it now, and one map is enough.
  RECEIVED: { text: { vi: "Đã nhận đơn", en: "Order received" }, tone: "ok" },
  PAID: { text: { vi: "Đã thanh toán", en: "Paid" }, tone: "ok" },
  SHIPPING: { text: { vi: "Đang giao", en: "Shipping" }, tone: "info" },
  DELIVERED: { text: { vi: "Đã giao", en: "Delivered" }, tone: "ok" },
  // Cancelled is an ENDED state, not an alert: the red family is kept for
  // the two things a shopper can still act on (stock running out, a code out
  // of uses). Family B, 22/09/2026.
  CANCELLED: { text: { vi: "Đã huỷ", en: "Cancelled" }, tone: "shut" },
};

/** A state's name in one language, and its tone. */
export function stateLabel(state: OrderState, locale: Locale = "vi"): { text: string; tone: StatusTone } {
  const { text, tone } = STATE_TEXT[state];
  return { text: pick(text, locale), tone };
}

export const STATE_LABEL: Record<OrderState, { text: string; tone: StatusTone }> = {
  AWAITING_TRANSFER: stateLabel("AWAITING_TRANSFER"),
  RECEIVED: stateLabel("RECEIVED"),
  PAID: stateLabel("PAID"),
  SHIPPING: stateLabel("SHIPPING"),
  DELIVERED: stateLabel("DELIVERED"),
  CANCELLED: stateLabel("CANCELLED"),
};

/**
 * A card order waiting in AWAITING_TRANSFER since slice B18 (QĐ-46): it waits
 * for a card payment on Stripe's page, not a transfer, and says so. The state
 * is the same one — the machine did not change — and so is the tone.
 */
const CARD_AWAITING_TEXT: Pair = { vi: "Chờ trả thẻ", en: "Awaiting card payment" };

/**
 * One ORDER's state, named for how it is being paid (slice B18): a card order
 * waiting for its money is "Chờ trả thẻ", a transfer's "Chờ chuyển khoản" as
 * before, every other state its own name (`stateLabel`). Every screen that
 * prints the state of a particular order reads this; a label for the state
 * alone — a tab, a filter — reads `stateLabel` or `stateTabLabel`.
 */
export function orderStateLabel(
  o: { status: { state: OrderState }; payment: PaymentMethod },
  locale: Locale = "vi",
): { text: string; tone: StatusTone } {
  if (o.status.state === "AWAITING_TRANSFER" && o.payment === "CARD") {
    return { text: pick(CARD_AWAITING_TEXT, locale), tone: STATE_TEXT.AWAITING_TRANSFER.tone };
  }
  return stateLabel(o.status.state, locale);
}

/**
 * The order book's tab for a state (slice B18): AWAITING_TRANSFER holds the
 * transfers AND the card orders waiting for their money, so its tab is "Chờ
 * thanh toán" / "Awaiting payment"; every other tab is the state's own name.
 */
const AWAITING_ANY_TEXT: Pair = { vi: "Chờ thanh toán", en: "Awaiting payment" };

export function stateTabLabel(state: OrderState, locale: Locale = "vi"): string {
  return state === "AWAITING_TRANSFER" ? pick(AWAITING_ANY_TEXT, locale) : stateLabel(state, locale).text;
}

const PAYMENT_TEXT: Record<PaymentMethod, Pair> = {
  BANK_TRANSFER: { vi: "Chuyển khoản", en: "Bank transfer" },
  CARD: { vi: "Thẻ", en: "Card" },
  COD: { vi: "COD", en: "Cash on delivery (COD)" },
};

/** A way to pay, in one language. */
export function paymentLabel(method: PaymentMethod, locale: Locale = "vi"): string {
  return pick(PAYMENT_TEXT[method], locale);
}

export const PAYMENT_LABEL: Record<PaymentMethod, string> = pickAll(PAYMENT_TEXT, "vi");

/**
 * A way to pay as the back office prints it (round v6 slice E4), in the
 * glossary's admin words: "Bank transfer", "Card", "COD". COD keeps its short
 * name in English, as the Vietnamese does and as the shop's footer does
 * (`FOOT_COD`, `lib/feed-home.ts`): a table cell and a filter chip have no room
 * for the checkout's "Cash on delivery (COD)". The Vietnamese side is
 * `PAYMENT_LABEL`, word for word.
 */
const ADMIN_PAYMENT_TEXT: Record<PaymentMethod, Pair> = {
  BANK_TRANSFER: PAYMENT_TEXT.BANK_TRANSFER,
  CARD: PAYMENT_TEXT.CARD,
  COD: { vi: PAYMENT_TEXT.COD.vi, en: "COD" },
};

/** A way to pay, as the back office names it, in one language. */
export function adminPaymentLabel(method: PaymentMethod, locale: Locale = "vi"): string {
  return pick(ADMIN_PAYMENT_TEXT[method], locale);
}

/**
 * What the database knows about a card order's Stripe side (slice B18,
 * `admin_orders()` v2): whether it ever opened a Stripe page, and Stripe's
 * payment intent once it was paid there.
 */
export interface CardPaymentFacts {
  checkout: boolean;
  paymentIntent: string | null;
}

/**
 * The way an order was paid, as one order's page and the CSV print it (slice
 * B18): "Thẻ · Stripe" / "Card · Stripe" for a card order Stripe has seen, and
 * then " · pi_…", Stripe's reference, once Stripe says it was paid — the
 * reference a manager quotes to find the payment in Stripe's dashboard.
 *
 * Only on EVIDENCE: a card order with neither a Stripe page nor a payment
 * intent — the sample's, all paid before any gateway existed — stays plain
 * "Thẻ". Calling it Stripe's would be the screen inventing where the money
 * came from (DESIGN.md §9 rule 1). Every other way to pay is its
 * `adminPaymentLabel`.
 */
export function adminPaymentDetail(
  o: { payment: PaymentMethod; card?: CardPaymentFacts | null },
  locale: Locale = "vi",
): string {
  const label = adminPaymentLabel(o.payment, locale);
  const card = o.payment === "CARD" ? o.card : null;
  if (!card || (!card.checkout && !card.paymentIntent)) return label;
  return card.paymentIntent ? `${label} · Stripe · ${card.paymentIntent}` : `${label} · Stripe`;
}
