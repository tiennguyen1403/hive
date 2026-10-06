import { teasersIn, type Catalog } from "./catalog";
import type { Drop, DropState, Order, Product, Promotion } from "@/data/types";
import { needsAction } from "./admin-metrics";
import type { AdminOrder } from "./admin-orders";
import { clockLabel, dayMonth, dateTimeLabel, rangeLabel } from "./datetime";
import { dropState } from "./drop";
import { dropRevenueVnd, dropSummary } from "./inventory";
import { styleInList, styleName } from "./lexicon";
import { orderTotalVnd } from "./orders";
import { vnd } from "./money";
import { STANDARD_FEE_VND } from "./shipping";
import { demoNow } from "./clock";
import { pick, pickAll, picker, pluralNoun, type Locale, type Pair } from "./i18n";
import { nameLang, productText } from "./product-text";

/**
 * The rows behind the admin tables.
 *
 * Kept out of the screens so they can be tested without rendering, and
 * because every one of these figures is DERIVED — from `CATALOG`, `DROPS`
 * and `PROMOTIONS` — rather than typed into a fixture of its own. A number
 * that exists in two places is a number that will eventually disagree with
 * itself.
 *
 * The v2 builders that had no caller left went at v3 slice 6: `promoRows`,
 * `dropRows`, `productRows`, `customerRows`, `simPromoRows` and the types
 * and labels only they read. The v3 tables (`ProductsTable`,
 * `CustomersTable`, `AdminPromotionsScreen`) each build their own rows from
 * the same fixtures, because each one shows a different set of columns.
 */

// ───────────────────────────────────────────────────────────────── orders
/**
 * What the "Khách" column adds to an order placed signed out; in English
 * "guest" (round v6 slice E4). `GUEST_SUFFIX` stays the Vietnamese side.
 */
const GUEST_SUFFIX_TEXT: Pair = { vi: "vãng lai", en: "guest" };
export const GUEST_SUFFIX = GUEST_SUFFIX_TEXT.vi;

/**
 * Who an order is for, as the "Khách" column says it: the account's name, or
 * — for an order placed signed out, which has no account — the name it is
 * addressed to with "· vãng lai" after it (slice B3b). Only an order with an
 * account links to a profile; a guest has none to link to.
 *
 * The name is printed as stored in both languages; in English the suffix is
 * "guest". `orderCustomerName` gives the two apart, for a screen that marks
 * the name `lang="vi"`.
 */
export function orderCustomer(o: AdminOrder, locale: Locale = "vi"): string {
  const { name, guest } = orderCustomerName(o);
  return guest ? `${name} · ${guestSuffix(locale)}` : name;
}

/** The name `orderCustomer` prints, and whether the order was placed signed out. */
export function orderCustomerName(o: AdminOrder): { name: string; guest: boolean } {
  return o.owner ? { name: o.owner.name, guest: false } : { name: o.shipTo.recipient, guest: true };
}

/** The suffix of a guest's name in one language: "vãng lai", "guest". */
export function guestSuffix(locale: Locale = "vi"): string {
  return pick(GUEST_SUFFIX_TEXT, locale);
}

/**
 * "S05 – MUỐI ×2, ÁO THUN TRƠN ×1" — what is in the box, in the fewest
 * characters, each style as the back office names it (v3 slice 12). Each
 * entry is held together (`styleInList`, v3 slice 13) so the list breaks at
 * its commas: the table printed "S05 – GIÓ ×1, S05 –" over "KHÓI ×1".
 *
 * In English (round v6 slice E4) each name comes through `productText` and
 * the code is the English one: "D05 – MUỐI ×2, PLAIN TEE ×1".
 */
export function orderItemsLabel(catalog: Catalog, o: Order, locale: Locale = "vi"): string {
  return o.lines
    .map((l) => {
      const p = catalog.byId.get(l.productId);
      return styleInList(p ? styleName(productText(p, locale).name, p.dropNo, locale) : "?", l.qty);
    })
    .join(", ");
}

/**
 * The `lang` of the element holding `orderItemsLabel`: `"vi"` on an English
 * page when every name in it is the Vietnamese one — an issue's styles keep
 * theirs — as the shop marks a list of names (`namesLang`, slice E1); nothing
 * when the list mixes in an English name, and nothing on a Vietnamese page.
 */
export function orderItemsLang(catalog: Catalog, o: Order, locale: Locale = "vi"): "vi" | undefined {
  if (locale === "vi" || o.lines.length === 0) return undefined;
  const allVi = o.lines.every((l) => {
    const p = catalog.byId.get(l.productId);
    return p !== undefined && nameLang(p, locale) === "vi";
  });
  return allVi ? "vi" : undefined;
}

/**
 * How long an order that has been paid for has sat unhandled, in whole days.
 *
 * Whole days, from the moment the money landed. Anything the shop is holding
 * for two days or more is late by its own promise — checkout says 2–4 days to
 * the door — and the row says so in words as well as in red.
 */
export const HANDOVER_LATE_DAYS = 2;

export interface OrderNote {
  text: string;
  /** Past the shop's own promise: rendered in `--hot`, and it says why. */
  late: boolean;
}

/**
 * The second line under an order's status, or nothing.
 *
 * Every state that is WAITING on somebody gets one: a transfer has a
 * deadline, a paid order has an age, a parcel has a number to quote. The
 * settled states — delivered, cancelled — say nothing, because there is
 * nothing left to do about them.
 */
export function orderNote(o: Order, now: Date, locale: Locale = "vi"): OrderNote | null {
  const t = picker(locale);
  switch (o.status.state) {
    // The hour and the day are one moment: a no-break space between them, or
    // the table printed "hạn 08:05" over "26/09" (v3 slice 13).
    case "AWAITING_TRANSFER": {
      const due = `${clockLabel(o.status.dueAt)}\u00a0${dayMonth(o.status.dueAt, locale)}`;
      return {
        text: t({ vi: `hạn ${due}`, en: `due ${due}` }),
        late: now.getTime() > Date.parse(o.status.dueAt),
      };
    }
    // A count and its unit never part: the queue broke "2" over "ngày"
    // (v3 slice 13).
    case "PAID": {
      const days = Math.floor((now.getTime() - Date.parse(o.status.paidAt)) / 86_400_000);
      return {
        text: notHandedOver(days, locale),
        late: days >= HANDOVER_LATE_DAYS,
      };
    }
    // Taken and not yet paid for (slice B3a brought these to the back
    // office). A COD order waits to be handed over — its money comes at the
    // door, so its age counts from the order. A card order here was taken
    // before slice B7, when card orders were RECEIVED; a card pays by
    // transfer now, so it waits for one, like every card order.
    case "RECEIVED": {
      if (o.payment !== "COD") return { text: t({ vi: "chờ chuyển khoản", en: "awaiting transfer" }), late: false };
      const days = Math.floor((now.getTime() - Date.parse(o.placedAt)) / 86_400_000);
      return {
        text: notHandedOver(days, locale),
        late: days >= HANDOVER_LATE_DAYS,
      };
    }
    case "SHIPPING":
      return { text: o.status.trackingCode, late: false };
    default:
      return null;
  }
}

/**
 * "2 ngày", "2 days": a count of whole days and its unit, held together by a
 * no-break space (v3 slice 13); the English noun by its count (round v6 slice
 * E4).
 */
function daysHeld(days: number, locale: Locale): string {
  return locale === "en" ? `${days}\u00a0${pluralNoun(days, "day", "days")}` : `${days}\u00a0ngày`;
}

/** "chưa bàn giao · 2 ngày", or bare "chưa bàn giao" inside the first day; in English "not handed over · 2 days". */
function notHandedOver(days: number, locale: Locale): string {
  const words = pick({ vi: "chưa bàn giao", en: "not handed over" }, locale);
  return days >= 1 ? `${words} · ${daysHeld(days, locale)}` : words;
}

export interface QueueRow {
  code: string;
  customer: string;
  totalVnd: number;
  /** "Chờ chuyển khoản" / "Đã thanh toán 07:52 19/09" — where it stands. */
  standing: string;
  /** "hạn 08:05 ngày 22/09" / "3 ngày", the part rendered as `.due`. */
  due: string | null;
  late: boolean;
  /**
   * What the guard allows next (`lib/admin-orders.ts#nextMove`): a transfer
   * or a card order has its money confirmed; a paid or COD order is handed
   * over.
   */
  action: "MARK_PAID" | "HAND_OVER";
  items: string;
}

/**
 * "Cần xử lý": the orders whose next move belongs to the shop.
 *
 * Newest first, like the mock and like every other list in the back office —
 * the operator works down the screen and the newest order is the one they
 * were just told about. The lateness is on the row rather than in the
 * ordering, so nothing jumps position while somebody is reading it.
 */
export function queueRows(catalog: Catalog, orders: AdminOrder[], now: Date, locale: Locale = "vi"): QueueRow[] {
  const t = picker(locale);
  return needsAction(orders)
    .slice()
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    .map((o) => {
      const note = orderNote(o, now, locale);
      const customer = orderCustomer(o, locale);
      const items = orderItemsLabel(catalog, o, locale);
      if (o.status.state === "AWAITING_TRANSFER") {
        const due = dateTimeLabel(o.status.dueAt, locale);
        return {
          code: o.code,
          customer,
          totalVnd: orderTotalVnd(o),
          // A card order pays by transfer (slice B7) and waits like one; the
          // row names the card, or it would pass for a plain transfer.
          standing:
            o.payment === "CARD"
              ? t({ vi: "Chờ chuyển khoản · thẻ", en: "Awaiting transfer · card" })
              : t({ vi: "Chờ chuyển khoản", en: "Awaiting transfer" }),
          due: t({ vi: `hạn ${due}`, en: `due ${due}` }),
          late: note?.late ?? false,
          action: "MARK_PAID" as const,
          items,
        };
      }
      // The red part of a late row: the days alone, without the words the
      // standing already says ("2 ngày" out of "chưa bàn giao · 2 ngày").
      const lateDays = (from: string) =>
        daysHeld(Math.floor((now.getTime() - Date.parse(from)) / 86_400_000), locale);
      if (o.status.state === "RECEIVED") {
        const cod = o.payment === "COD";
        const at = `${clockLabel(o.placedAt)} ${dayMonth(o.placedAt, locale)}`;
        return {
          code: o.code,
          customer,
          totalVnd: orderTotalVnd(o),
          standing: cod
            ? t({ vi: `Đã nhận đơn ${at} · COD, thu khi giao`, en: `Order received ${at} · COD, collect on delivery` })
            : t({ vi: `Đã nhận đơn ${at} · thẻ, chờ chuyển khoản`, en: `Order received ${at} · card, awaiting transfer` }),
          due: cod && note?.late ? lateDays(o.placedAt) : null,
          late: cod ? (note?.late ?? false) : false,
          action: cod ? ("HAND_OVER" as const) : ("MARK_PAID" as const),
          items,
        };
      }
      const paidAt = o.status.state === "PAID" ? o.status.paidAt : o.placedAt;
      const at = `${clockLabel(paidAt)} ${dayMonth(paidAt, locale)}`;
      return {
        code: o.code,
        customer,
        totalVnd: orderTotalVnd(o),
        standing: t({ vi: `Đã thanh toán ${at} · chưa bàn giao`, en: `Paid ${at} · not handed over` }),
        due: note?.late ? lateDays(paidAt) : null,
        late: note?.late ?? false,
        action: "HAND_OVER" as const,
        items,
      };
    });
}

export type PromoState = "UPCOMING" | "LIVE" | "PAUSED" | "USED_UP" | "ENDED";

/**
 * Which of the five things a code is doing right now.
 *
 * "Used up" is its own state and not a footnote on "live": a code inside its
 * dates with no uses left is being REFUSED at checkout, and that is exactly
 * the thing somebody opens this table to find out. The date wins when both
 * apply — a run that is over is over, and no amount of unused quota brings
 * it back.
 *
 * "Paused" (slice B3b, `Promotion.paused`) is the one state not read off the
 * clock, and it only shows over what would otherwise be "live": a paused
 * code is being refused at checkout whatever its dates say, and hiding that
 * behind "Đang chạy" would be the table contradicting the button somebody
 * just pressed — but a code that has not started, has run out or is over is
 * still that first, exactly as the simulation drew it.
 */
export function promoState(p: Promotion, now: Date = demoNow()): PromoState {
  const t = now.getTime();
  if (t < Date.parse(p.startsAt)) return "UPCOMING";
  // Start-inclusive, end-EXCLUSIVE, the same rule as a shop door and the
  // same one `dropState` and `checkPromoCode` already apply. It was `>` here
  // until v3 slice 5, and the off-by-one showed the moment "Kết thúc sớm"
  // moved a code's closing hour to now: checkout was refusing the code
  // (`>=`) while this table still said "Đang chạy".
  if (t >= Date.parse(p.endsAt)) return "ENDED";
  if (p.usageLimit !== null && p.usedCount >= p.usageLimit) return "USED_UP";
  if (p.paused) return "PAUSED";
  return "LIVE";
}

/** A code's kind in either language (round v6 slice E5). */
export const PROMO_KIND_TEXT: Record<Promotion["kind"], Pair> = {
  PERCENT: { vi: "Phần trăm", en: "Percentage" },
  AMOUNT: { vi: "Số tiền", en: "Amount" },
  FREE_SHIPPING: { vi: "Miễn phí giao", en: "Free delivery" },
};

export const PROMO_KIND_LABEL: Record<Promotion["kind"], string> = pickAll(PROMO_KIND_TEXT, "vi");

/** A code's kind in one language. */
export function promoKindLabel(kind: Promotion["kind"], locale: Locale = "vi"): string {
  return pick(PROMO_KIND_TEXT[kind], locale);
}

/**
 * What the code actually takes off.
 *
 * A percentage without its cap is not the offer — "10%" on a 3.000.000₫
 * order reads as 300.000₫ when the code stops at 150.000₫. The cap is the
 * number somebody is checking, so it goes on the same line.
 */
export function promoValueLabel(p: Promotion, locale: Locale = "vi"): string {
  const t = picker(locale);
  if (p.kind === "PERCENT") {
    return p.maxDiscountVnd
      ? t({
          vi: `${p.percent}% · tối đa ${vnd(p.maxDiscountVnd)}`,
          en: `${p.percent}% · up to ${vnd(p.maxDiscountVnd, "en")}`,
        })
      : `${p.percent}%`;
  }
  if (p.kind === "AMOUNT") return vnd(p.amountVnd, locale);
  // What free shipping is WORTH, which is the number the column is for —
  // the kind column beside it already says "Miễn phí giao", and printing
  // that twice tells nobody what it takes off.
  return t({
    vi: `Phí giao tiêu chuẩn · ${vnd(STANDARD_FEE_VND)}`,
    en: `Standard delivery fee · ${vnd(STANDARD_FEE_VND, "en")}`,
  });
}

export interface DropRow {
  no: number;
  label: string;
  window: string;
  state: DropState;
  styles: number;
  /** Styles announced but not yet on sale — a drop before it opens. */
  teasers: number;
  cutUnits: number;
  soldUnits: number;
  onHand: number;
  revenueVnd: number;
}

/**
 * An issue's state, named. In both languages since round v6 (QĐ-40): the
 * user's glossary calls an open issue "Live" — never "On sale", which in
 * English reads as a discount — and the other two "Coming soon" and "Closed".
 * `DROP_STATE_LABEL` is the Vietnamese side, as before.
 */
export const DROP_STATE_TEXT: Record<DropState, Pair> = {
  UPCOMING: { vi: "Sắp mở", en: "Coming soon" },
  OPEN: { vi: "Đang mở", en: "Live" },
  CLOSED: { vi: "Đã đóng", en: "Closed" },
};

/** An issue's state in one language. */
export function dropStateLabel(state: DropState, locale: Locale = "vi"): string {
  return pick(DROP_STATE_TEXT[state], locale);
}

export const DROP_STATE_LABEL: Record<DropState, string> = pickAll(DROP_STATE_TEXT, "vi");

/**
 * The issue rows, newest number first.
 *
 * `teasers` is counted separately from `styles`: a drop that has not opened
 * holds no product yet, and writing "0 mẫu" while two styles are being teased
 * on the shop front would read as a mistake. The state stays derived from
 * the two instants: closing early is a moved closing hour
 * (`admin_schedule_drop()`), never a flag.
 */
export function dropRows(
  catalog: Catalog,
  drops: readonly Drop[],
  now: Date,
  products: readonly Product[] = catalog.products,
): DropRow[] {
  return [...drops]
    .sort((a, b) => b.no - a.no)
    .map((d) => {
      const s = dropSummary(catalog, d.no, products);
      return {
        no: d.no,
        label: `Số ${String(d.no).padStart(2, "0")}`,
        window: rangeLabel(d.opensAt, d.closesAt),
        state: dropState(d, now),
        styles: s.styles,
        teasers: teasersIn(catalog, d.no).length,
        cutUnits: s.cutUnits,
        soldUnits: s.soldUnits,
        onHand: s.onHand,
        revenueVnd: dropRevenueVnd(catalog, d.no, products),
      };
    });
}
