import type { Order, OrderStatus, PaymentMethod } from "@/data/types";
import { demoNow } from "./clock";

/**
 * A shopper's own orders: the status one is in.
 *
 * WHICH orders a shopper may see is no longer decided here. Until slice B2
 * `visibleOrder()` filtered the fixtures by customer; the orders are rows in
 * Postgres now, and row level security answers that question before a single
 * order reaches the app (`lib/db/orders.ts`, QĐ-16).
 */

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
 * Since slice B7 a card order waits in the same state with the same hold,
 * and since slice B18 it pays on Stripe's page (QĐ-46): past its hold it is
 * cancelled the same way, only the reason names what never came — "quá hạn
 * thanh toán", a card payment, where a transfer's is "quá hạn chuyển khoản".
 * `expire_and_lock()` writes the same two words when the sweep catches up
 * (`20261007180000_card_checkout.sql`). An order read without its way of
 * paying is read as a transfer, as before.
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
 * Why a card order whose hold ran out is cancelled (slice B18): no card
 * payment came. `customer-orders.test.ts` checks the migration spells it
 * exactly this way.
 */
export const CARD_OVERDUE_REASON = "quá hạn thanh toán";

/** The reason an order's hold ran out under, by how it was being paid. */
export function overdueReason(payment?: PaymentMethod): string {
  return payment === "CARD" ? CARD_OVERDUE_REASON : OVERDUE_REASON;
}

/**
 * Why an order the shopper called off themselves is cancelled — the words
 * `cancel_order()` writes into `cancel_reason`, which the screens read to
 * name the reason. Kept beside `OVERDUE_REASON` because the two are
 * the only reasons the shop itself writes, and `customer-orders.test.ts`
 * checks that the migration still spells both exactly this way.
 */
export const CUSTOMER_CANCEL_REASON = "khách huỷ";

export function effectiveStatus(
  o: Pick<Order, "status"> & Partial<Pick<Order, "payment">>,
  now: Date = demoNow(),
): OrderStatus {
  if (o.status.state !== "AWAITING_TRANSFER") return o.status;
  if (now.getTime() < Date.parse(o.status.dueAt)) return o.status;
  return { state: "CANCELLED", cancelledAt: o.status.dueAt, reason: overdueReason(o.payment) };
}

/** The same order, with the status the clock says it is in. */
export function effectiveOrder<T extends Pick<Order, "status">>(o: T, now: Date = demoNow()): T {
  const status = effectiveStatus(o, now);
  // Generic so an order that carries more than `Order` — the back office's,
  // with its owner — keeps it on the way through, and one that carries less —
  // the guest lookup's (slice B11), without where it goes — reads the same.
  return status === o.status ? o : { ...o, status };
}
