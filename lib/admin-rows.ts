import { teasersIn, type Catalog } from "./catalog";
import type { Drop, DropState, Order, Product, Promotion } from "@/data/types";
import { needsAction } from "./admin-metrics";
import type { AdminOrder } from "./admin-orders";
import { clockLabel, dayMonth, dateTimeLabel, rangeLabel } from "./datetime";
import { dropState } from "./drop";
import { dropRevenueVnd, dropSummary } from "./inventory";
import { orderTotalVnd, orderUnits } from "./orders";
import { vnd } from "./money";
import { STANDARD_FEE_VND } from "./shipping";
import { demoNow } from "./clock";

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
/** What the "Khách" column adds to an order placed signed out. */
export const GUEST_SUFFIX = "vãng lai";

/**
 * Who an order is for, as the "Khách" column says it: the account's name, or
 * — for an order placed signed out, which has no account — the name it is
 * addressed to with "· vãng lai" after it (slice B3b). Only an order with an
 * account links to a profile; a guest has none to link to.
 */
export function orderCustomer(o: AdminOrder): string {
  return o.owner ? o.owner.name : `${o.shipTo.recipient} · ${GUEST_SUFFIX}`;
}

/** "MUỐI ×2, KHÓI ×1" — what is in the box, in the fewest characters. */
export function orderItemsLabel(catalog: Catalog, o: Order): string {
  return o.lines
    .map((l) => `${catalog.byId.get(l.productId)?.name ?? "?"} ×${l.qty}`)
    .join(", ");
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
export function orderNote(o: Order, now: Date): OrderNote | null {
  switch (o.status.state) {
    case "AWAITING_TRANSFER":
      return {
        text: `hạn ${clockLabel(o.status.dueAt)} ${dayMonth(o.status.dueAt)}`,
        late: now.getTime() > Date.parse(o.status.dueAt),
      };
    case "PAID": {
      const days = Math.floor((now.getTime() - Date.parse(o.status.paidAt)) / 86_400_000);
      return {
        text: days >= 1 ? `chưa bàn giao · ${days} ngày` : "chưa bàn giao",
        late: days >= HANDOVER_LATE_DAYS,
      };
    }
    // Taken and not yet paid for (slice B3a brought these to the back
    // office). A COD order waits to be handed over — its money comes at the
    // door, so its age counts from the order — and a card order waits for the
    // shop to confirm the money by hand, with no gateway to do it.
    case "RECEIVED": {
      if (o.payment !== "COD") return { text: "chưa thu tiền", late: false };
      const days = Math.floor((now.getTime() - Date.parse(o.placedAt)) / 86_400_000);
      return {
        text: days >= 1 ? `chưa bàn giao · ${days} ngày` : "chưa bàn giao",
        late: days >= HANDOVER_LATE_DAYS,
      };
    }
    case "SHIPPING":
      return { text: o.status.trackingCode, late: false };
    default:
      return null;
  }
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
export function queueRows(catalog: Catalog, orders: AdminOrder[], now: Date): QueueRow[] {
  return needsAction(orders)
    .slice()
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    .map((o) => {
      const note = orderNote(o, now);
      const customer = orderCustomer(o);
      if (o.status.state === "AWAITING_TRANSFER") {
        return {
          code: o.code,
          customer,
          totalVnd: orderTotalVnd(o),
          standing: "Chờ chuyển khoản",
          due: `hạn ${dateTimeLabel(o.status.dueAt)}`,
          late: note?.late ?? false,
          action: "MARK_PAID" as const,
          items: orderItemsLabel(catalog, o),
        };
      }
      if (o.status.state === "RECEIVED") {
        const cod = o.payment === "COD";
        return {
          code: o.code,
          customer,
          totalVnd: orderTotalVnd(o),
          standing: cod
            ? `Đã nhận đơn ${clockLabel(o.placedAt)} ${dayMonth(o.placedAt)} · COD, thu khi giao`
            : `Đã nhận đơn ${clockLabel(o.placedAt)} ${dayMonth(o.placedAt)} · thẻ, chưa thu tiền`,
          due: cod && note?.late ? note.text.replace("chưa bàn giao · ", "") : null,
          late: cod ? (note?.late ?? false) : false,
          action: cod ? ("HAND_OVER" as const) : ("MARK_PAID" as const),
          items: orderItemsLabel(catalog, o),
        };
      }
      const paidAt = o.status.state === "PAID" ? o.status.paidAt : o.placedAt;
      return {
        code: o.code,
        customer,
        totalVnd: orderTotalVnd(o),
        standing: `Đã thanh toán ${clockLabel(paidAt)} ${dayMonth(paidAt)} · chưa bàn giao`,
        due: note?.late ? note.text.replace("chưa bàn giao · ", "") : null,
        late: note?.late ?? false,
        action: "HAND_OVER" as const,
        items: orderItemsLabel(catalog, o),
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
  // same one `dropState` and `isPromoLive` already apply. It was `>` here
  // until v3 slice 5, and the off-by-one showed the moment "Kết thúc sớm"
  // moved a code's closing hour to now: checkout was refusing the code
  // (`isPromoLive`, `>=`) while this table still said "Đang chạy".
  if (t >= Date.parse(p.endsAt)) return "ENDED";
  if (p.usageLimit !== null && p.usedCount >= p.usageLimit) return "USED_UP";
  if (p.paused) return "PAUSED";
  return "LIVE";
}

export const PROMO_KIND_LABEL: Record<Promotion["kind"], string> = {
  PERCENT: "Phần trăm",
  AMOUNT: "Số tiền",
  FREE_SHIPPING: "Miễn phí giao",
};

/**
 * What the code actually takes off.
 *
 * A percentage without its cap is not the offer — "10%" on a 3.000.000₫
 * order reads as 300.000₫ when the code stops at 150.000₫. The cap is the
 * number somebody is checking, so it goes on the same line.
 */
export function promoValueLabel(p: Promotion): string {
  if (p.kind === "PERCENT") {
    return p.maxDiscountVnd ? `${p.percent}% · tối đa ${vnd(p.maxDiscountVnd)}` : `${p.percent}%`;
  }
  if (p.kind === "AMOUNT") return vnd(p.amountVnd);
  // What free shipping is WORTH, which is the number the column is for —
  // the kind column beside it already says "Miễn phí giao", and printing
  // that twice tells nobody what it takes off.
  return `Phí giao tiêu chuẩn · ${vnd(STANDARD_FEE_VND)}`;
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

export const DROP_STATE_LABEL: Record<DropState, string> = {
  UPCOMING: "Sắp mở",
  OPEN: "Đang mở",
  CLOSED: "Đã đóng",
};

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
