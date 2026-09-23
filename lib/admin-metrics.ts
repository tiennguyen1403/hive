import { customerById } from "@/data/customers";
import type { CustomerId, Order, OrderState, Product } from "@/data/types";
import type { Catalog } from "./catalog";
import { toVnIso } from "./datetime";
import {
  LOW_STOCK_AT,
  isSoldOut,
  onHand,
  productsInDrop,
  soldOutSizes,
  soldUnits,
} from "./inventory";
import { orderTotalVnd } from "./orders";

/**
 * What the admin dashboard is allowed to say.
 *
 * Every figure here is DERIVED from the fixtures — none is typed in. That is
 * not tidiness, it is the whole point: PRODUCT.md forbids inventing sales,
 * and the approved mock's dashboard was drawn with invented ones (88,3tr of
 * revenue, 2.850 page views, +12% on the period before). Numbers that come
 * out of `ORDERS` and `CATALOG` cannot drift from what the rest of the app
 * shows, and where the fixtures hold nothing — nobody ever recorded a page
 * view — this file offers nothing rather than a plausible number.
 *
 * `data/orders.ts` is also explicit that its 24 orders are a RECENT SAMPLE,
 * not the full ledger. Screens reading this module must say so; that is what
 * `AdminTop`'s "dữ liệu mô phỏng" badge is for.
 */

/**
 * The states in which money is counted as taken.
 *
 * Not "every order". An order sitting in AWAITING_TRANSFER is a promise —
 * the fixtures contain one that was cancelled twelve hours later for exactly
 * that reason — and a cancelled order is money that never arrived. Booking
 * either would report cash the shop does not have.
 */
export const BOOKED_STATES = ["PAID", "SHIPPING", "DELIVERED"] as const;
const BOOKED = new Set<OrderState>(BOOKED_STATES);

/** Orders still waiting on the shop, rather than on the courier or the shopper. */
const ACTIONABLE: OrderState[] = ["AWAITING_TRANSFER", "PAID"];

export interface DayPoint {
  /** `YYYY-MM-DD`, Vietnamese calendar day. */
  day: string;
  vnd: number;
  orders: number;
}

/** The Vietnamese calendar day an ISO timestamp falls on, read off its text. */
function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/** `days` steps from a `YYYY-MM-DD`, still in Vietnamese calendar days. */
function stepDay(day: string, delta: number): string {
  const t = Date.parse(`${day}T12:00:00+07:00`);
  return dayOf(toVnIso(new Date(t + delta * 86_400_000)));
}

/**
 * Money taken per day for the `days` days ending today, oldest first.
 *
 * Empty days are kept as zeros. Between two drops this shop sells nothing at
 * all, and that gap is the shape of the business — collapsing it would draw
 * a continuous trade that never happened.
 */
export function revenueByDay(now: Date, orders: Order[], days: number): DayPoint[] {
  const today = dayOf(toVnIso(now));
  const points: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    points.push({ day: stepDay(today, -i), vnd: 0, orders: 0 });
  }
  const at = new Map(points.map((p) => [p.day, p]));

  for (const o of orders) {
    if (!BOOKED.has(o.status.state)) continue;
    const p = at.get(dayOf(o.placedAt));
    if (!p) continue;
    p.vnd += orderTotalVnd(o);
    p.orders += 1;
  }
  return points;
}

export interface SalesWindow {
  points: DayPoint[];
  totalVnd: number;
  /** Orders booked inside the window. */
  orders: number;
  /** The best day, or null when the window took nothing. */
  peak: DayPoint | null;
  averageOrderVnd: number;
}

export function salesWindow(now: Date, orders: Order[], days: number): SalesWindow {
  const points = revenueByDay(now, orders, days);
  const totalVnd = points.reduce((n, p) => n + p.vnd, 0);
  const count = points.reduce((n, p) => n + p.orders, 0);
  const peak = totalVnd === 0 ? null : points.reduce((a, b) => (b.vnd > a.vnd ? b : a));
  return {
    points,
    totalVnd,
    orders: count,
    peak,
    averageOrderVnd: count === 0 ? 0 : Math.round(totalVnd / count),
  };
}

/** Booked money divided by booked orders. Zero, never NaN, on an empty list. */
export function averageOrderVnd(orders: Order[]): number {
  const booked = orders.filter((o) => BOOKED.has(o.status.state));
  if (booked.length === 0) return 0;
  return Math.round(booked.reduce((n, o) => n + orderTotalVnd(o), 0) / booked.length);
}

/**
 * The queue: orders whose next move belongs to the shop.
 *
 * This replaces the mock's conversion-rate tile. Nothing in this codebase
 * records a page view, so a conversion rate could only be invented — and on
 * a screen somebody works from, "what do I have to do now" beats a number
 * nobody can act on anyway.
 */
export function needsAction(orders: Order[]): Order[] {
  return orders.filter((o) => ACTIONABLE.includes(o.status.state));
}

/** Newest first, capped. Cancelled ones stay: an admin list is a ledger. */
export function recentOrders(orders: Order[], n: number): Order[] {
  return [...orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, n);
}

/** The ranges the dashboard offers. 14 is what the drop cycle is cut into. */
export const WINDOW_CHOICES = [7, 14, 30] as const;
export type WindowDays = (typeof WINDOW_CHOICES)[number];

/** `?days=` from the URL, or the default. An unlisted value is not honoured. */
export function windowDays(raw: string | string[] | undefined): WindowDays {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return (WINDOW_CHOICES as readonly number[]).includes(n) ? (n as WindowDays) : 14;
}

export interface CustomerSplit {
  /** People who placed at least one booked order inside the window. */
  total: number;
  /** Of those, the ones who joined on or after `joinedSince`. */
  fresh: number;
  returning: number;
}

/**
 * How many people the window's money came from, and how many of them are new.
 *
 * "New" is answered by the customer's own joining date against the drop's
 * opening instant — not by "has no earlier order", which would call somebody
 * new whose first order simply falls outside this sample of twenty-four.
 * Cancelled and unpaid orders do not count anybody: a name is counted when
 * money is.
 */
export function customerSplit(
  now: Date,
  orders: Order[],
  days: number,
  joinedSince: string,
): CustomerSplit {
  const from = Date.parse(`${stepDay(dayOf(toVnIso(now)), -(days - 1))}T00:00:00+07:00`);
  const ids = new Set<CustomerId>();
  for (const o of orders) {
    if (!BOOKED.has(o.status.state)) continue;
    if (Date.parse(o.placedAt) < from) continue;
    ids.add(o.customerId);
  }

  let fresh = 0;
  for (const id of ids) {
    const c = customerById.get(id);
    if (c && Date.parse(c.joinedAt) >= Date.parse(joinedSince)) fresh += 1;
  }
  return { total: ids.size, fresh, returning: ids.size - fresh };
}

export interface SellerRank {
  product: Product;
  sold: number;
  cut: number;
  /** Sold as a share of what was cut, rounded. */
  percent: number;
  left: number;
}

/**
 * What is selling in a drop, best first.
 *
 * Ranked by units gone rather than by share: the share of a small cut swings
 * wildly, and a style that sold eighteen pieces is the one that mattered to
 * the week. The share is on the row anyway, so neither reading is hidden.
 */
export function dropRanking(
  catalog: Catalog,
  dropNo: number,
  products?: readonly Product[],
): SellerRank[] {
  return productsInDrop(catalog, dropNo, products)
    .map((product) => {
      const sold = soldUnits(product);
      const left = onHand(product);
      return {
        product,
        sold,
        left,
        cut: product.cutUnits,
        percent: product.cutUnits === 0 ? 0 : Math.round((sold / product.cutUnits) * 100),
      };
    })
    .sort((a, b) => b.sold - a.sold || b.percent - a.percent || a.product.name.localeCompare(b.product.name));
}

export interface StockAlert {
  product: Product;
  /** Units left across every size and colour. */
  left: number;
  /** Which sizes went — the part an admin can act on. */
  note: string;
  tone: "hot" | "warn";
}

/**
 * What is running out in a drop, worst first.
 *
 * A drop is cut once and never restocked, so this list is not a reorder
 * prompt — it is how long the shelf has left. Styles fully gone come first,
 * then those down to `LOW_STOCK_AT` or fewer.
 */
export function stockAlerts(
  catalog: Catalog,
  dropNo: number,
  products?: readonly Product[],
): StockAlert[] {
  return productsInDrop(catalog, dropNo, products)
    .map((product) => {
      const left = onHand(product);
      const gone = soldOutSizes(product);
      return {
        product,
        left,
        tone: (isSoldOut(product) ? "hot" : "warn") as StockAlert["tone"],
        note: isSoldOut(product)
          ? "hết toàn bộ size"
          : gone.length > 0
            ? `hết ${gone.join(" · ")}`
            : `còn ${left} chiếc, chưa hết size nào`,
      };
    })
    .filter((r) => r.left <= LOW_STOCK_AT)
    .sort((a, b) => a.left - b.left || a.product.name.localeCompare(b.product.name));
}
