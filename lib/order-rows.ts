import type { Order, OrderState, PaymentMethod } from "@/data/types";
import type { Catalog } from "./catalog";
import { effectiveStatus, inTab, type OrderTabKey } from "./customer-orders";
import { dayMonth } from "./datetime";
import { orderTotalVnd, orderUnits } from "./orders";
import { demoNow } from "./clock";

/**
 * One line of "Đơn của tôi".
 *
 * Until slice B2 the list held two kinds of order — the fixtures', and the
 * ones placed IN THIS BROWSER, which lived in `localStorage` because there
 * was no server to send them to — and a row carried a flag saying which. Every
 * order is a row in Postgres now, whoever placed it and wherever, so there is
 * one kind and one function that turns it into a row.
 *
 * Everything here is derived. Nothing is invented: a row's state comes from
 * the order's own status read against the clock (`effectiveStatus`), never
 * from a courier event nobody sent.
 */

/** One style in an order, as a row prints it: "KHÓI ×1". */
export interface OrderRowItem {
  /** Shown as-is. */
  name: string;
  qty: number;
}

export interface OrderRow {
  code: string;
  /** ISO, +07:00 like everything else. */
  placedAt: string;
  state: OrderState;
  units: number;
  totalVnd: number;
  /** "SƯƠNG, THAN" — the styles in the order, in order. Shown as-is. */
  names: string;
  /** The same styles with their counts, for the row that has room for both. */
  items: OrderRowItem[];
  /**
   * Which issue the order bought from, read off the first style in it that
   * belongs to one (a fixed style, slice B5, belongs to none).
   *
   * It decides how the row dates itself: an order from the issue selling now
   * is stamped with its hour ("18:50 · 20/09"), because that is how recent
   * it is; an older one is stamped with its issue ("12/06 · Số 04"), because
   * that is what places it. Absent when no style in it has an issue, or the
   * style has left the catalog — the row is then dated by its hour.
   */
  dropNo?: number;
  /** At most two, for the stacked thumbnails. */
  photoKeys: string[];
  /** The third fact on the detail line: how it is paid, or where it got to. */
  note: string;
  /** "19:50 ngày 21/09" — only while a transfer is still owed. */
  dueAt?: string;
  /** The courier's number, on the one state that has one. */
  tracking?: string;
}

/**
 * Lower case, because it lands mid-sentence: "19/09/2026 · 2 món ·
 * chuyển khoản". `PAYMENT_LABEL` in `order-labels.ts` is the sentence-start
 * form the detail screens use.
 */
const PAYMENT_IN_LINE: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "chuyển khoản",
  CARD: "thẻ",
  COD: "COD",
};

/** Two thumbnails is what the row has space for; the count is on the line. */
const MAX_THUMBS = 2;

/**
 * `now` is not decoration: an unpaid transfer past its deadline is a
 * cancelled order, and which side of that line an order falls on is a fact
 * about the clock (`effectiveStatus`). The row reads the status through it
 * so the list, the tabs and the detail cannot disagree.
 */
export function rowOfOrder(catalog: Catalog, o: Order, now: Date = demoNow()): OrderRow {
  const products = o.lines.map((l) => catalog.byId.get(l.productId));
  const status = effectiveStatus(o, now);
  // The first style in it that belongs to an issue: a fixed style (slice B5)
  // has none, and an order of fixed styles only has no issue to be dated by.
  const dropNo = products.find((p) => p !== undefined && p.dropNo !== null)?.dropNo ?? undefined;

  return {
    code: o.code,
    placedAt: o.placedAt,
    state: status.state,
    units: orderUnits(o),
    totalVnd: orderTotalVnd(o),
    names: products.map((p) => p?.name ?? "—").join(", "),
    items: o.lines.map((l, i) => ({ name: products[i]?.name ?? "—", qty: l.qty })),
    ...(dropNo !== undefined ? { dropNo } : {}),
    photoKeys: o.lines.slice(0, MAX_THUMBS).map((l, i) => {
      const p = products[i];
      return p?.photoKeys[p.colors.indexOf(l.color)] ?? p?.photoKeys[0] ?? "hero";
    }),
    note: noteOfOrder({ ...o, status }),
    ...(status.state === "AWAITING_TRANSFER" ? { dueAt: status.dueAt } : {}),
    ...(status.state === "SHIPPING" ? { tracking: status.trackingCode } : {}),
  };
}

/**
 * Where the order got to, in the fewest words that are true.
 *
 * A shipping order quotes what is RECORDED — the day it left — and not an
 * arrival date: the delivery window is a promise made at checkout, and the
 * row is not the place to repeat a promise as if it were a fact.
 *
 * An order still waiting — for a transfer, or for the shop to act on a COD or
 * card order — says how it is being paid, because that is what it is waiting
 * on.
 */
function noteOfOrder(o: Order): string {
  switch (o.status.state) {
    case "AWAITING_TRANSFER":
    case "RECEIVED":
      return PAYMENT_IN_LINE[o.payment];
    case "PAID":
      return `đã thanh toán ${dayMonth(o.status.paidAt)}`;
    case "SHIPPING":
      return `gửi đi ${dayMonth(o.status.shippedAt)}`;
    case "DELIVERED":
      return `đã giao ${dayMonth(o.status.deliveredAt)}`;
    case "CANCELLED":
      return cancelNote(o);
  }
}

/**
 * Whether the shopper may still call an order off.
 *
 * Only an order nobody has been paid for: a transfer still inside its hold,
 * or a COD / card order the shop has not handled. A cancelled order cannot be
 * cancelled again, and an order whose hold has run out has already cancelled
 * itself. `cancel_order()` in the database applies the same rule and is the
 * one that decides; this is what decides whether the button is drawn.
 */
export function canCancel(state: OrderState): boolean {
  return state === "AWAITING_TRANSFER" || state === "RECEIVED";
}

/**
 * Who called it off — the shopper ("khách huỷ"), the clock ("quá hạn chuyển
 * khoản"), or the shop in its own words. Read straight off the order: the
 * reason is recorded with the cancellation, so nothing here has to guess it.
 * "" for an order that has not been cancelled.
 */
export function cancelNote(o: Order): string {
  return o.status.state === "CANCELLED" ? o.status.reason : "";
}

/** Every order this person has, as rows, newest first. */
export function orderRows(catalog: Catalog, orders: Order[], now: Date = demoNow()): OrderRow[] {
  return orders
    .map((o) => rowOfOrder(catalog, o, now))
    .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
}

export function rowsForTab(rows: OrderRow[], tab: OrderTabKey): OrderRow[] {
  return rows.filter((r) => inTab(tab, r.state));
}

export function rowCount(rows: OrderRow[], tab: OrderTabKey): number {
  return rows.reduce((n, r) => n + (inTab(tab, r.state) ? 1 : 0), 0);
}
