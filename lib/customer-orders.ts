import type { Order, OrderStatus } from "@/data/types";
import { clockLabel, dayMonth } from "./datetime";
import { demoNow } from "./clock";

/**
 * A shopper's own orders: how they are grouped, and how one reads as a
 * sequence of events.
 *
 * WHICH orders a shopper may see is no longer decided here. Until slice B2
 * `visibleOrder()` filtered the fixtures by customer; the orders are rows in
 * Postgres now, and row level security answers that question before a single
 * order reaches the app (`lib/db/orders.ts`, QĐ-16).
 */

export type OrderTabKey = "all" | "processing" | "delivered" | "cancelled";

export interface OrderTab {
  key: OrderTabKey;
  /** Shown as-is. */
  label: string;
}

export const ORDER_TABS: OrderTab[] = [
  { key: "all", label: "Tất cả" },
  { key: "processing", label: "Đang xử lý" },
  { key: "delivered", label: "Đã giao" },
  { key: "cancelled", label: "Đã huỷ" },
];

/** Everything between placing and arriving counts as still being handled. */
const PROCESSING: string[] = ["AWAITING_TRANSFER", "PAID", "SHIPPING", "RECEIVED"];

/**
 * Does a state belong under this tab?
 *
 * `RECEIVED` — taken, nobody paid yet — is still being handled, like a
 * transfer being waited on. Takes a string so the rows (`order-rows.ts`) and
 * the orders ask the same question through one definition; two would let the
 * tab and its count disagree.
 */
export function inTab(tab: OrderTabKey, state: string): boolean {
  switch (tab) {
    case "all":
      return true;
    case "processing":
      return PROCESSING.includes(state);
    case "delivered":
      return state === "DELIVERED";
    case "cancelled":
      return state === "CANCELLED";
  }
}

export function ordersForTab(orders: Order[], tab: OrderTabKey): Order[] {
  // Copy before sorting: the caller's list is usually the fixture itself.
  return orders
    .filter((o) => inTab(tab, o.status.state))
    .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
}

// ───────────────────────────────────────────── the status, read off the clock
/**
 * What an order's status IS right now, as against what was written down.
 *
 * An unpaid transfer holds the goods for twelve hours — the promise checkout
 * makes twice, the confirmation counts down, and `DH-2310` in the fixtures
 * already kept. Past that hour the order is cancelled, whether or not
 * anybody wrote it down: the fixtures are a snapshot taken on some Tuesday,
 * and a stored `AWAITING_TRANSFER` two days past its own deadline is a flag
 * nobody flipped rather than a fact (`lib/drop.ts` refuses stored state for
 * exactly this reason, and the back office's own log says "Huỷ đơn / quá 12
 * giờ chưa chuyển khoản · Hệ thống").
 *
 * The moment recorded is the DEADLINE, not "now": that is when the pieces
 * went back on the shelf, and it is the same number however long after the
 * fact the screen is opened.
 *
 * ONE function, and every surface reads through it — the row, the detail,
 * the timeline, the tab counts, the notifications, and from slice 5 the back
 * office too. Two of those deriving it separately is how a shopper's "Đã
 * huỷ" ends up beside the shop's "Chờ chuyển khoản".
 */
export const OVERDUE_REASON = "quá hạn chuyển khoản";

/**
 * Why an order the shopper called off themselves is cancelled — the words
 * `cancel_order()` writes into `cancel_reason`, and the ones every screen
 * prints after "Đã huỷ —". Kept beside `OVERDUE_REASON` because the two are
 * the only reasons the shop itself writes, and `customer-orders.test.ts`
 * checks that the migration still spells both exactly this way.
 */
export const CUSTOMER_CANCEL_REASON = "khách huỷ";

export function effectiveStatus(o: Order, now: Date = demoNow()): OrderStatus {
  if (o.status.state !== "AWAITING_TRANSFER") return o.status;
  if (now.getTime() < Date.parse(o.status.dueAt)) return o.status;
  return { state: "CANCELLED", cancelledAt: o.status.dueAt, reason: OVERDUE_REASON };
}

/** The same order, with the status the clock says it is in. */
export function effectiveOrder<T extends Order>(o: T, now: Date = demoNow()): T {
  const status = effectiveStatus(o, now);
  // Generic so an order that carries more than `Order` — the back office's,
  // with its owner — keeps it on the way through.
  return status === o.status ? o : { ...o, status };
}

// ──────────────────────────────────────────────────────────────── timeline
export interface TimelineStep {
  /** Shown as-is. Carries the state in words, never in colour alone. */
  title: string;
  detail?: string;
  state: "done" | "now" | "todo";
}

/**
 * `"18/09 · 07:15"` — how every step of every timeline is stamped. Exported
 * so anything else that dates a milestone dates it the same way; two
 * timelines on the same screen in two date formats read as a bug.
 */
export function eventStamp(iso: string): string {
  return `${dayMonth(iso)} · ${clockLabel(iso)}`;
}

const at = eventStamp;

/**
 * An order as a sequence of events, derived from its status.
 *
 * Exactly one step is ever "now" and nothing after it is done — the test
 * pins that, because a timeline with two current steps or a finished step
 * below an unfinished one is a timeline that is lying about something.
 *
 * A cancelled order does not show the steps it never reached. Drawing
 * "Đang giao" greyed out under a cancellation suggests it is still coming.
 */
export function orderTimeline(o: Order): TimelineStep[] {
  const placed: TimelineStep = {
    title: "Đã nhận đơn",
    detail: at(o.placedAt),
    state: "done",
  };

  switch (o.status.state) {
    case "AWAITING_TRANSFER":
      return [
        { ...placed, state: "now" },
        { title: "Chờ chuyển khoản", detail: `hạn ${at(o.status.dueAt)}`, state: "todo" },
        { title: "Đóng gói", state: "todo" },
        { title: "Giao hàng", state: "todo" },
      ];

    // Taken, and nobody has paid or packed anything yet — a COD order, or a
    // card order with no gateway behind it. What is known is the order and
    // the two steps still ahead of it, and nothing is claimed as done.
    case "RECEIVED":
      return [
        { ...placed, state: "now" },
        { title: "Đóng gói", state: "todo" },
        { title: "Giao hàng", state: "todo" },
      ];

    case "PAID":
      return [
        placed,
        { title: "Đã thanh toán", detail: at(o.status.paidAt), state: "now" },
        { title: "Đóng gói", state: "todo" },
        { title: "Giao hàng", state: "todo" },
      ];

    case "SHIPPING":
      return [
        placed,
        { title: "Đã thanh toán", state: "done" },
        { title: "Đã đóng gói", state: "done" },
        {
          title: "Đang trên đường giao",
          detail: `${at(o.status.shippedAt)} · mã vận đơn ${o.status.trackingCode}`,
          state: "now",
        },
        { title: "Giao thành công", state: "todo" },
      ];

    case "DELIVERED":
      return [
        placed,
        { title: "Đã thanh toán", state: "done" },
        { title: "Đã đóng gói", state: "done" },
        { title: "Đã giao cho đơn vị vận chuyển", state: "done" },
        { title: "Giao thành công", detail: at(o.status.deliveredAt), state: "now" },
      ];

    case "CANCELLED":
      return [
        placed,
        { title: `Đã huỷ — ${o.status.reason}`, detail: at(o.status.cancelledAt), state: "now" },
      ];
  }
}

/**
 * What happens to the money on a cancelled order.
 *
 * The two reasons the shop writes itself settle it: the shopper can only call
 * off an order nobody has paid for (`cancel_order()` allows a transfer inside
 * its hold or a `RECEIVED` order, nothing else), and the clock only cancels a
 * transfer that never arrived. Neither can have anything to refund — a COD
 * order cancelled before delivery included, which the payment-method rule
 * below would get wrong. For any other reason the method decides, as it
 * always has.
 *
 * Saying "không có gì để hoàn" on an order somebody had paid for would be the
 * worst sentence on the site; saying "sẽ được hoàn" on one nobody paid for is
 * the second worst.
 */
export const REFUND_NONE =
  "Không có gì để hoàn. Đơn chưa từng được thanh toán nên không phát sinh hoàn tiền.";
export const REFUND_TO_SOURCE = "Khoản đã thanh toán sẽ được hoàn về nguồn ban đầu.";

export function refundNote(o: Order): string | null {
  if (o.status.state !== "CANCELLED") return null;
  const reason = o.status.reason;
  if (reason === CUSTOMER_CANCEL_REASON || reason === OVERDUE_REASON) return REFUND_NONE;
  return o.payment === "BANK_TRANSFER" ? REFUND_NONE : REFUND_TO_SOURCE;
}
