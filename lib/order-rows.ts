import { byId, bySlug } from "@/data/catalog";
import type { CustomerId, Order, OrderState, PaymentMethod } from "@/data/types";
import {
  effectiveStatus,
  eventStamp,
  inTab,
  type OrderTabKey,
  type TimelineStep,
} from "./customer-orders";
import { dayMonth } from "./datetime";
import { orderTotalVnd, orderUnits } from "./orders";
import { transferDeadlineIso, type PlacedOrder } from "./placed-order";
import { demoNow } from "./clock";

/**
 * One line of "Đơn của tôi", whichever of the two places the order came
 * from.
 *
 * The shopper's list now holds two kinds of order: the fixtures' — placed
 * before this build existed, with a courier and a delivery date behind them
 * — and the one placed IN THIS BROWSER, which exists nowhere else because
 * there is no server to send it to. They are the same thing to the person
 * reading the list, so the screen is handed one shape and the difference is
 * a flag (`onDevice`) plus a label, not two code paths through the markup.
 *
 * Everything here is derived. Nothing about a device order is invented: its
 * state comes from how it is being paid for and from the clock, never from
 * a courier event nobody sent.
 */

/**
 * `RECEIVED` is the state the fixtures never needed: an order that has been
 * placed and not yet paid or handled. A COD order is not `PAID` — writing
 * that down would be the screen claiming money changed hands.
 */
export type RowState = OrderState | "RECEIVED";

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
  state: RowState;
  units: number;
  totalVnd: number;
  /** "SƯƠNG, THAN" — the styles in the order, in order. Shown as-is. */
  names: string;
  /** The same styles with their counts, for the row that has room for both. */
  items: OrderRowItem[];
  /**
   * Which issue the order bought from, read off the first style in it.
   *
   * It decides how the row dates itself: an order from the issue selling now
   * is stamped with its hour ("18:50 · 20/09"), because that is how recent
   * it is; an older one is stamped with its issue ("12/06 · Số 04"), because
   * that is what places it. Absent when the style has left the catalog.
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
  /** Placed in this browser. It is in no account on any other device. */
  onDevice: boolean;
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

// ────────────────────────────────────────────────── the fixtures' orders
/**
 * `now` is not decoration: an unpaid transfer past its deadline is a
 * cancelled order, and which side of that line an order falls on is a fact
 * about the clock (`effectiveStatus`). The row reads the status through it
 * so the list, the tabs and the detail cannot disagree.
 */
export function rowOfOrder(o: Order, now: Date = demoNow()): OrderRow {
  const products = o.lines.map((l) => byId.get(l.productId));
  const status = effectiveStatus(o, now);

  return {
    code: o.code,
    placedAt: o.placedAt,
    state: status.state,
    units: orderUnits(o),
    totalVnd: orderTotalVnd(o),
    names: products.map((p) => p?.name ?? "—").join(", "),
    items: o.lines.map((l, i) => ({ name: products[i]?.name ?? "—", qty: l.qty })),
    ...(products[0]?.dropNo !== undefined ? { dropNo: products[0].dropNo } : {}),
    photoKeys: o.lines.slice(0, MAX_THUMBS).map((l, i) => {
      const p = products[i];
      return p?.photoKeys[p.colors.indexOf(l.color)] ?? p?.photoKeys[0] ?? "hero";
    }),
    note: noteOfOrder({ ...o, status }),
    ...(status.state === "AWAITING_TRANSFER" ? { dueAt: status.dueAt } : {}),
    ...(status.state === "SHIPPING" ? { tracking: status.trackingCode } : {}),
    onDevice: false,
  };
}

/**
 * Where the order got to, in the fewest words that are true.
 *
 * A shipping order quotes what is RECORDED — the day it left — and not an
 * arrival date. The mock wrote "dự kiến nhận 21/09" there, but an order
 * carries no delivery method, so the arrival window cannot be derived and
 * would have to be invented (DESIGN.md §9 rule 1).
 */
function noteOfOrder(o: Order): string {
  switch (o.status.state) {
    case "AWAITING_TRANSFER":
      return PAYMENT_IN_LINE[o.payment];
    case "PAID":
      return `đã thanh toán ${dayMonth(o.status.paidAt)}`;
    case "SHIPPING":
      return `gửi đi ${dayMonth(o.status.shippedAt)}`;
    case "DELIVERED":
      return `đã giao ${dayMonth(o.status.deliveredAt)}`;
    case "CANCELLED":
      return o.status.reason;
  }
}

// ──────────────────────────────────────────── the order placed right here
/**
 * Which of the three states a device order is in.
 *
 * Two things move it, and both are recorded rather than assumed. The shopper
 * can cancel an order they have not paid for — the user settled that on
 * 22/09/2026 — and that is a stamp on the record. Otherwise it is the clock:
 * an unpaid transfer holds the goods for twelve hours, the promise checkout
 * makes twice, and then the order cancels itself, which is exactly what
 * `DH-2310` in the fixtures did. Nothing else can happen to an order in a
 * build with no server, so nothing else is claimed.
 */
export function deviceState(p: PlacedOrder, now: Date = demoNow()): RowState {
  if (p.cancelledAt) return "CANCELLED";
  if (p.payment !== "BANK_TRANSFER") return "RECEIVED";
  return now.getTime() >= Date.parse(transferDeadlineIso(p.placedAt))
    ? "CANCELLED"
    : "AWAITING_TRANSFER";
}

/**
 * Whether the shopper may still call an order off.
 *
 * Only an order nobody has been paid for: a transfer still inside its hold,
 * or a COD / card order the shop has not handled — which, with no server, is
 * every one of them. A cancelled order cannot be cancelled again, and an
 * order whose hold has run out has already cancelled itself.
 */
export function canCancel(state: RowState): boolean {
  return state === "AWAITING_TRANSFER" || state === "RECEIVED";
}

export function rowOfPlaced(p: PlacedOrder, now: Date = demoNow()): OrderRow {
  const state = deviceState(p, now);
  const due = transferDeadlineIso(p.placedAt);

  return {
    code: p.code,
    placedAt: p.placedAt,
    state,
    units: p.lines.reduce((n, l) => n + l.qty, 0),
    totalVnd: p.totalVnd,
    names: p.lines.map((l) => l.name).join(", "),
    items: p.lines.map((l) => ({ name: l.name, qty: l.qty })),
    // A device order stores the style's slug, so the issue is one lookup
    // away; a slug the catalog no longer carries leaves the field off.
    ...(dropNoOfSlug(p.lines[0]?.slug) !== undefined
      ? { dropNo: dropNoOfSlug(p.lines[0]?.slug) }
      : {}),
    photoKeys: p.lines.slice(0, MAX_THUMBS).map((l) => l.photoKey),
    note: state === "CANCELLED" ? cancelNote(p) : PAYMENT_IN_LINE[p.payment],
    ...(state === "AWAITING_TRANSFER" ? { dueAt: due } : {}),
    onDevice: true,
  };
}

/** Who called it off — the shopper, or the clock. They are not the same fact. */
export function cancelNote(p: PlacedOrder): string {
  return p.cancelReason === "customer" ? "khách huỷ" : "quá hạn chuyển khoản";
}

function dropNoOfSlug(slug: string | undefined): number | undefined {
  return slug ? bySlug.get(slug)?.dropNo : undefined;
}

/**
 * The device orders this person may see.
 *
 * An order placed while signed out has no owner and belongs to no account —
 * it stays on the confirmation page and appears in nobody's list. An order
 * placed by somebody else on this shared browser is somebody else's name,
 * phone number and address; the check is the same one `visibleOrder` makes
 * for the fixtures (QĐ-16).
 *
 * A LIST since slice 5 of v2: the device now keeps every order placed on it
 * rather than only the last one, so this filters instead of matching one.
 */
export function deviceOrdersOf(
  customer: CustomerId,
  placed: PlacedOrder[],
): PlacedOrder[] {
  return placed.filter((p) => p.customerId === customer);
}

/** One device order by code, for this customer, or nothing. */
export function visibleDeviceOrder(
  customer: CustomerId,
  code: string,
  placed: PlacedOrder[],
): PlacedOrder | undefined {
  return deviceOrdersOf(customer, placed).find((p) => p.code === code);
}

// ───────────────────────────────────────────────────────── the merged list
/**
 * Every order this person has, newest first.
 *
 * A device order with the same code as a fixture order would be the same
 * order twice — `nextOrderCode` can land on a number the fixtures already
 * use — so the fixture wins and the duplicate is dropped. The fixture is
 * the one with a history behind it.
 */
export function orderRows(
  orders: Order[],
  placed: PlacedOrder[],
  now: Date = demoNow(),
): OrderRow[] {
  const rows = orders.map((o) => rowOfOrder(o, now));
  const taken = new Set(rows.map((r) => r.code));

  for (const p of placed) {
    if (taken.has(p.code)) continue;
    taken.add(p.code);
    rows.push(rowOfPlaced(p, now));
  }

  return rows.sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
}

export function rowsForTab(rows: OrderRow[], tab: OrderTabKey): OrderRow[] {
  return rows.filter((r) => inTab(tab, r.state));
}

export function rowCount(rows: OrderRow[], tab: OrderTabKey): number {
  return rows.reduce((n, r) => n + (inTab(tab, r.state) ? 1 : 0), 0);
}

// ─────────────────────────────────────────────────────────── the timeline
/**
 * A device order as a sequence of events — the same shape
 * `orderTimeline` produces for a fixture order, and deliberately shorter.
 *
 * There is no courier, so there is no packing step to mark done and no
 * despatch to date. What the browser knows is: the order was taken, what it
 * is waiting for, and when that wait runs out.
 */
export function deviceTimeline(p: PlacedOrder, now: Date = demoNow()): TimelineStep[] {
  const placed: TimelineStep = {
    title: "Đã nhận đơn",
    detail: eventStamp(p.placedAt),
    state: "done",
  };
  const state = deviceState(p, now);

  if (state === "AWAITING_TRANSFER") {
    return [
      { ...placed, state: "now" },
      {
        title: "Chờ chuyển khoản",
        detail: `hạn ${eventStamp(transferDeadlineIso(p.placedAt))}`,
        state: "todo",
      },
      { title: "Đóng gói", state: "todo" },
      { title: "Giao hàng", state: "todo" },
    ];
  }

  if (state === "CANCELLED") {
    return [
      placed,
      {
        title: `Đã huỷ — ${cancelNote(p)}`,
        // The moment it really happened: the stamp the shopper's own
        // cancellation wrote, or the hour the hold ran out.
        detail: eventStamp(p.cancelledAt ?? transferDeadlineIso(p.placedAt)),
        state: "now",
      },
    ];
  }

  return [
    { ...placed, state: "now" },
    { title: "Đóng gói", state: "todo" },
    { title: "Giao hàng", state: "todo" },
  ];
}
