import { orderByCode } from "@/data/orders";
import type { CustomerId, Order, OrderCode, OrderStatus } from "@/data/types";
import { clockLabel, dayMonth } from "./datetime";
import { demoNow } from "./clock";

/**
 * A shopper's own orders: which ones they may see, how they are grouped, and
 * how one reads as a sequence of events.
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
 * Takes the state as a string rather than as `OrderState` so the merged
 * list can ask the same question about a device order, whose `RECEIVED`
 * state the fixtures never needed (`order-rows.ts`). One definition, or the
 * tab and its count would eventually disagree.
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

/**
 * One order, but only if it belongs to the person asking.
 *
 * Order codes are short and sequential — `DH-2419`, `DH-2431`. Looking one
 * up without checking who is asking would hand a stranger somebody else's
 * name, phone number and home address. The route treats `undefined` as a
 * 404, which also avoids confirming that a code exists at all.
 */
export function visibleOrder(customer: CustomerId, code: OrderCode): Order | undefined {
  const order = orderByCode.get(code);
  if (!order || order.customerId !== customer) return undefined;
  return order;
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

export function effectiveStatus(o: Order, now: Date = demoNow()): OrderStatus {
  if (o.status.state !== "AWAITING_TRANSFER") return o.status;
  if (now.getTime() < Date.parse(o.status.dueAt)) return o.status;
  return { state: "CANCELLED", cancelledAt: o.status.dueAt, reason: OVERDUE_REASON };
}

/** The same order, with the status the clock says it is in. */
export function effectiveOrder(o: Order, now: Date = demoNow()): Order {
  const status = effectiveStatus(o, now);
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
 * so the device order's timeline (`order-rows.ts`) stamps its steps the same
 * way; two timelines on the same screen in two date formats read as a bug.
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
 * Only two of the five states can precede a cancellation in this data, and
 * they differ in exactly the way that matters: one had been paid, the other
 * never was. Saying "không có gì để hoàn" on an order somebody had paid for
 * would be the worst sentence on the site.
 */
export const REFUND_NONE =
  "Không có gì để hoàn. Đơn chưa từng được thanh toán nên không phát sinh hoàn tiền.";
export const REFUND_TO_SOURCE = "Khoản đã thanh toán sẽ được hoàn về nguồn ban đầu.";

export function refundNote(o: Order): string | null {
  if (o.status.state !== "CANCELLED") return null;
  return o.payment === "BANK_TRANSFER" ? REFUND_NONE : REFUND_TO_SOURCE;
}
