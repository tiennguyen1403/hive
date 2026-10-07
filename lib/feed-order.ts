import { colorLabel } from "@/data/colors";
import type { Order, Product, Size } from "@/data/types";
import type { Catalog } from "./catalog";
import { clockDayLabel } from "./datetime";
import { cancelReasonLabel, feedStateLabel } from "./feed-account";
import { feedDelivery, feedDeliveryWindow, type FeedRow } from "./feed-checkout";
import { pickAll, picker, plural, type Locale, type Pair } from "./i18n";
import { trackHref } from "./lookup";
import { vnd } from "./money";
import { stateLabel } from "./order-labels";
import {
  TRANSFER_HOLD_HOURS,
  orderSubtotalVnd,
  orderTotalVnd,
  orderUnits,
  paysByTransfer,
  transferReference,
} from "./orders";
import { formatPhone } from "./phone";
import { nameLang, productText } from "./product-text";

/**
 * The Feed's order confirmation (round v4 slice 2): the approved mock's
 * `confirmed.js` over one order the database placed. Pure; the screen is
 * `components/feed/order/OrderConfirmedView.tsx`.
 *
 * The mock shows the moment just after checkout: a transfer waiting, or a COD
 * order waiting for the shop's call. Since slice B18 a card order waits for a
 * card payment on Stripe's page (QĐ-46): the same hold as a transfer, no
 * transfer details, and a button to pay. A receipt can be reopened later,
 * when the order has moved on; the title "Đã đặt hàng" stays true, and the
 * line under it and the status follow the order instead of repeating a
 * request that no longer applies.
 */

/** Which screen: the transfer's (the mock's), the card's (slice B18), or COD's (the mock's). */
export type ConfirmFlow = "transfer" | "card" | "cod";

export function confirmFlow(o: Pick<Order, "payment">): ConfirmFlow {
  if (o.payment === "CARD") return "card";
  return paysByTransfer(o.payment) ? "transfer" : "cod";
}

/**
 * The mock's four steps of each flow (`confirmed.js`: `STEPS`), in both
 * languages since round v6 slice E2 — the order states in the glossary's
 * words ("Awaiting transfer", "Shipping", "Delivered"); `CONFIRM_STEPS` is the
 * Vietnamese side. The card's (slice B18) waits on "Chờ trả thẻ", the name
 * every screen gives a card order waiting for its money.
 */
export const CONFIRM_STEPS_TEXT: Readonly<Record<ConfirmFlow, Pair<readonly string[]>>> = {
  transfer: {
    vi: ["Đã đặt", "Chờ chuyển khoản", "Đang giao", "Đã giao"],
    en: ["Placed", "Awaiting transfer", "Shipping", "Delivered"],
  },
  card: {
    vi: ["Đã đặt", "Chờ trả thẻ", "Đang giao", "Đã giao"],
    en: ["Placed", "Awaiting card payment", "Shipping", "Delivered"],
  },
  cod: {
    vi: ["Đã đặt", "Gọi xác nhận", "Đang giao", "Đã giao"],
    en: ["Placed", "Call to confirm", "Shipping", "Delivered"],
  },
};

export const CONFIRM_STEPS: Readonly<Record<ConfirmFlow, readonly string[]>> = pickAll(CONFIRM_STEPS_TEXT, "vi");

export type StepState = "done" | "now" | "todo";

export interface ConfirmStep {
  label: string;
  state: StepState;
}

/**
 * "Trạng thái": the flow's four steps, lit to where the order is. Just placed
 * — the mock's state — the first is done and the second is now (the transfer
 * awaited, the call awaited). Paid: the second is done too; on its way: the
 * third is now; delivered: all four done. A cancelled order does not show the
 * steps it will never reach: it was placed, and it is cancelled.
 */
export function confirmSteps(o: Order, locale: Locale = "vi"): ConfirmStep[] {
  const labels = CONFIRM_STEPS_TEXT[confirmFlow(o)][locale];
  const lit = (done: number, now: number | null): ConfirmStep[] =>
    labels.map((label, i) => ({ label, state: i < done ? "done" : i === now ? "now" : "todo" }));
  switch (o.status.state) {
    case "AWAITING_TRANSFER":
    case "RECEIVED":
      return lit(1, 1);
    case "PAID":
      return lit(2, null);
    case "SHIPPING":
      return lit(2, 2);
    case "DELIVERED":
      return lit(4, null);
    case "CANCELLED":
      return [
        { label: labels[0]!, state: "done" },
        { label: stateLabel("CANCELLED", locale).text, state: "now" },
      ];
  }
}

const capitalise = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("vi") + s.slice(1) : s);

/**
 * The one line under "Mã đơn": what happens next (`confirmed.js`: `NEXT`) —
 * transfer within the hold, pay by card within it (slice B18), or the shop's
 * call before delivery. A card order taken before slice B7 waits in RECEIVED
 * for the shop, and says so in the account's own word for that state, "Chờ
 * xác nhận" (it can no longer be paid by transfer, nor on Stripe's page).
 * Reopened later: the state in its own words, or, cancelled, why and that the
 * pieces went back (the Feed's order page, `order.js`).
 *
 * In English (round v6 slice E2) the reason a cancelled order gives is the
 * stored one translated by `cancelReasonLabel`, or as stored when it is not
 * one of the app's own.
 */
export function confirmNext(o: Order, locale: Locale = "vi"): string {
  const t = picker(locale);
  switch (o.status.state) {
    case "AWAITING_TRANSFER":
      return o.payment === "CARD"
        ? t({
            vi: `Trả bằng thẻ trong ${TRANSFER_HOLD_HOURS} giờ để giữ hàng.`,
            en: `Pay by card within ${TRANSFER_HOLD_HOURS} hours to keep your items.`,
          })
        : t({
            vi: `Chuyển khoản trong ${TRANSFER_HOLD_HOURS} giờ để giữ hàng.`,
            en: `Transfer within ${TRANSFER_HOLD_HOURS} hours to keep your items.`,
          });
    case "RECEIVED":
      return o.payment === "COD"
        ? t({ vi: "Cửa hàng gọi xác nhận trước khi giao.", en: "The shop will call to confirm before delivery." })
        : `${feedStateLabel("RECEIVED", locale)}.`;
    case "PAID":
    case "SHIPPING":
    case "DELIVERED":
      return `${stateLabel(o.status.state, locale).text}.`;
    case "CANCELLED":
      return t({
        vi: `${capitalise(o.status.reason)}. Hàng đã về kệ.`,
        en: `${cancelReasonLabel(o.status.reason, "en")}. ${BACK_IN_STOCK_EN}`,
      });
  }
}

/** "Hàng đã về kệ." in English: what follows a cancelled order's reason, here and on the lookup. */
export const BACK_IN_STOCK_EN = "Items back in stock.";

/** The hold, while the money is awaited — a transfer's, or a card order's (slice B18). */
export interface ConfirmHold {
  dueAt: string;
  /** "07:02 thứ Ba 22/09". */
  until: string;
  /** "Quá giờ, đơn tự huỷ và 4 chiếc về kệ." */
  note: string;
}

/** The transfer block and the hold, while the transfer is awaited. */
export interface ConfirmTransfer extends ConfirmHold {
  amountVnd: number;
  /** The bank memo: the order code without its dash ("DH1507"), `transferReference`. */
  memo: string;
}

/**
 * "Giữ hàng": when the hold ends and what happens then, for any order waiting
 * for its money — a transfer, and since slice B18 a card order, which keeps
 * the same twelve hours and is cancelled the same way.
 */
export function confirmHold(o: Pick<Order, "status" | "lines">, locale: Locale = "vi"): ConfirmHold | null {
  if (o.status.state !== "AWAITING_TRANSFER") return null;
  const units = orderUnits(o);
  return {
    dueAt: o.status.dueAt,
    until: clockDayLabel(o.status.dueAt, locale),
    note: picker(locale)({
      vi: `Quá giờ, đơn tự huỷ và ${units} chiếc về kệ.`,
      en: `Then it's cancelled and ${plural(units, "item goes", "items go")} back in stock.`,
    }),
  };
}

/*
 * `confirmTransfer` and `confirmRows` take only the fields they read (round v4
 * slice 4a): the guest lookup (`/track`) prints the same hold, memo and totals
 * from an order that has no address, phone or owner (`LookedUpOrder`).
 *
 * A card order has no transfer to make since slice B18 — it pays on Stripe's
 * page — so it gets no transfer block: no amount to copy, no memo, no bank
 * account. Its hold is `confirmHold`. An order read without its way of paying
 * is read as a transfer, as before.
 */
export function confirmTransfer(
  o: Pick<Order, "code" | "status" | "lines" | "shippingFeeVnd" | "codFeeVnd" | "discountVnd"> &
    Partial<Pick<Order, "payment">>,
  locale: Locale = "vi",
): ConfirmTransfer | null {
  if (o.payment === "CARD") return null;
  const hold = confirmHold(o, locale);
  if (!hold) return null;
  return { amountVnd: orderTotalVnd(o), memo: transferReference(o.code), ...hold };
}

/**
 * "Giao hàng": the service and its window counted from when the order was
 * placed (a receipt reopened days later keeps the window it promised), the
 * recipient, the address. The address line is built on the server, where the
 * communes are.
 *
 * In English (round v6 slice E2) the recipient and the address keep their
 * Vietnamese (QĐ-40), so their rows say so (`lang`).
 */
export function confirmShipRows(o: Order, addressLine: string, locale: Locale = "vi"): FeedRow[] {
  const t = picker(locale);
  const window = feedDeliveryWindow(o.delivery, o.placedAt, locale);
  const vi = locale === "en" ? { lang: "vi" as const } : {};
  return [
    { label: feedDelivery(o.delivery, locale).title, value: t({ vi: `dự kiến ${window}`, en: `expected ${window}` }) },
    { label: t({ vi: "Người nhận", en: "Recipient" }), value: `${o.shipTo.recipient}, ${formatPhone(o.shipTo.phone)}`, ...vi },
    { label: t({ vi: "Địa chỉ", en: "Address" }), value: addressLine, ...vi },
  ];
}

/**
 * The COD surcharge an order was charged, as its summary prints it
 * ("+15.000₫"), or null for an order that carries none: every transfer and
 * card order, and the sample's COD orders, which were never charged it. The
 * back office's order page prints the same line (round v5 slice 1), so its
 * sums add up to a total that includes the surcharge (`orderTotalVnd`).
 */
export function codFeeRow(o: Pick<Order, "codFeeVnd">, locale: Locale = "vi"): FeedRow | null {
  return o.codFeeVnd
    ? { label: picker(locale)({ vi: "Phụ phí COD", en: "COD surcharge" }), value: `+${vnd(o.codFeeVnd, locale)}` }
    : null;
}

/**
 * "Tóm tắt" above "Tổng", as the order was priced: the code's line only when
 * it took something off. In English the checkout's words (`checkoutRows`).
 */
export function confirmRows(
  o: Pick<Order, "lines" | "shippingFeeVnd" | "codFeeVnd" | "discountVnd" | "promo">,
  locale: Locale = "vi",
): FeedRow[] {
  const t = picker(locale);
  const rows: FeedRow[] = [
    { label: t({ vi: "Tạm tính", en: "Subtotal" }), value: vnd(orderSubtotalVnd(o), locale) },
    {
      label: t({ vi: "Giao hàng", en: "Delivery" }),
      value: o.shippingFeeVnd ? vnd(o.shippingFeeVnd, locale) : t({ vi: "Miễn phí", en: "Free" }),
    },
  ];
  const cod = codFeeRow(o, locale);
  if (cod) rows.push(cod);
  if (o.discountVnd && o.promo) {
    rows.push({ label: t({ vi: `Mã ${o.promo}`, en: `Code ${o.promo}` }), value: `-${vnd(o.discountVnd, locale)}` });
  }
  return rows;
}

/** One line of the order as the summary prints it: the style by its bare name, at the price it was sold for. */
export interface ConfirmLine {
  key: string;
  product: Product | undefined;
  name: string;
  /** `"vi"` on an English page when `name` is the Vietnamese one (`nameLang`); absent otherwise. */
  nameLang?: "vi";
  colorLabel: string;
  color: Order["lines"][number]["color"];
  size: Size;
  qty: number;
  totalVnd: number;
}

/** In the page's language since round v6 slice E2: the name by `productText`, the colour by `colorLabel`. */
export function confirmLines(catalog: Catalog, o: Order, locale: Locale = "vi"): ConfirmLine[] {
  return o.lines.map((l, i) => {
    const product = catalog.byId.get(l.productId);
    const lang = product ? nameLang(product, locale) : undefined;
    return {
      key: `${l.productId}:${l.color}:${l.size}:${i}`,
      product,
      name: product ? productText(product, locale).name : "—",
      ...(lang ? { nameLang: lang } : {}),
      colorLabel: colorLabel(l.color, locale),
      color: l.color,
      size: l.size,
      qty: l.qty,
      totalVnd: l.unitPriceVnd * l.qty,
    };
  });
}

/**
 * The second button: the order's own page for an order in the signed-in
 * account, the lookup otherwise — an order placed signed out is not in the
 * account's list, whoever is signed in now. In English "View order", or the
 * lookup by its glossary name, "Track an order".
 *
 * The lookup's address carries the code alone since slice B19, never the
 * phone number: the browser that placed the order is shown it at once from
 * the code (`/track` reads its receipt), any other is asked for the number.
 */
export function followLink(o: Order, inAccount: boolean, locale: Locale = "vi"): { label: string; href: string } {
  const t = picker(locale);
  return inAccount
    ? { label: t({ vi: "Xem đơn", en: "View order" }), href: `/account/orders/${o.code}` }
    : { label: t({ vi: "Tra cứu đơn", en: "Track an order" }), href: trackHref(o.code) };
}
