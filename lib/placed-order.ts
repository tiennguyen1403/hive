import type { PaymentMethod, Size } from "@/data/types";
import { addHoursIso } from "./datetime";
import type { DeliveryMethod } from "./shipping";

/**
 * The order the confirmation screen shows, and how it survives one
 * navigation.
 *
 * There is no backend, so nothing here is submitted anywhere. An order is
 * written to `localStorage` and read back by `/order-confirmed` and by the
 * account screens. LOCAL and not session, changed in slice 5 of v2: the
 * account lists these as "đơn của tôi", and an order that disappeared when
 * the tab closed made that list a lie twice over — it also lost the first
 * order the moment a second one was placed. The screens now say what is
 * true: it lives on this device, and clearing browser data loses it.
 *
 * It is a FROZEN COPY. Prices, colour labels and photo keys are written out
 * rather than looked up again — the catalog is a live thing, and a receipt
 * that changes when the shop does is not a receipt.
 */

export interface PlacedOrderLine {
  slug: string;
  name: string;
  kind: string;
  colorLabel: string;
  size: Size;
  qty: number;
  unitPriceVnd: number;
  photoKey: string;
}

export interface PlacedOrder {
  code: string;
  /**
   * Who placed it, when anybody was signed in — the session's customer id.
   *
   * Absent for a guest order, and absent in anything written by a build
   * before this field existed. Both absences mean the same thing and are
   * treated the same way: the order belongs to no account, so no account
   * lists it. QĐ-16 — reading an order asks who is asking — and here the
   * answer has to be stored at placing time, because the confirmation is
   * the last moment the session and the order are in the same place.
   */
  customerId?: string;
  placedAt: string;
  lines: PlacedOrderLine[];
  recipient: string;
  phone: string;
  email: string;
  /** Already formatted, smallest unit first. */
  addressLine: string;
  note: string;
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  subtotalVnd: number;
  shippingFeeVnd: number;
  codFeeVnd: number;
  discountVnd: number;
  totalVnd: number;
  promo?: string;
  /**
   * When the shopper cancelled it themselves — added at v3 slice 4, the day
   * the user decided a customer may cancel an unpaid order.
   *
   * Absent on every order written before that, and absent on every order
   * still standing. A record without it is not broken: it is an order that
   * has not been cancelled, which is what `deviceState` reads it as.
   */
  cancelledAt?: string;
  /** Why. Only one hand can cancel a device order, so only one value exists. */
  cancelReason?: "customer";
}

const SCHEMA_VERSION = 1;

/**
 * An order number.
 *
 * A real backend issues this, and issues it once — that is the only way to
 * guarantee it is unique. With no backend the next best thing is a number
 * that is DETERMINISTIC for a given instant, so re-rendering the
 * confirmation screen cannot renumber an order that has already been shown.
 * Minutes since the start of 2026, wrapped to four digits, in keeping with
 * the `DH-2419` codes the fixtures already use.
 */
export function nextOrderCode(now: Date): string {
  const EPOCH = Date.parse("2026-01-01T00:00:00+07:00");
  const minutes = Math.floor((now.getTime() - EPOCH) / 60_000);
  return `DH-${String(((minutes % 10_000) + 10_000) % 10_000).padStart(4, "0")}`;
}

/**
 * What goes in the bank's memo field, which will not take a dash.
 *
 * NOT rendered anywhere right now, and kept on purpose. From v3 slice 3 the
 * confirmation prints the order code as the shopper reads it everywhere else
 * — `DH-1494`, dash and all, which is what the approved mock draws. The
 * dashless form belongs to the OTHER side of that transfer: when the back
 * office matches a bank line against an order (slice 5), the statement it
 * reads will have had the dash stripped by the bank. One function, used at
 * the point where the stripping actually happens.
 */
export function transferReference(code: string): string {
  return code.replace(/-/g, "");
}

/**
 * How long a bank transfer holds the goods.
 *
 * Twelve hours is a promise made twice before this screen — on the payment
 * row at checkout and in the note under the order button — and it is the
 * reason the cart is allowed to say it holds no stock: the hold starts when
 * the order is placed, not when the cart was filled.
 */
export const TRANSFER_HOLD_HOURS = 12;

/** When an unpaid transfer order cancels itself and the pieces go back. */
export function transferDeadlineIso(placedAtIso: string): string {
  return addHoursIso(placedAtIso, TRANSFER_HOLD_HOURS);
}

export function serializePlacedOrder(order: PlacedOrder): string {
  return JSON.stringify({ v: SCHEMA_VERSION, order });
}

/**
 * Read the order back. Never throws, and never returns a half-built one:
 * the confirmation screen prints a total and a transfer reference, and
 * rendering those from a partial object would produce a receipt that is
 * confidently wrong.
 */
export function parsePlacedOrder(raw: string | null): PlacedOrder | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || parsed.v !== SCHEMA_VERSION) return null;
  return readOrder(parsed.order);
}

// ─────────────────────────────────────────── every order placed here, kept
/**
 * The orders placed on this DEVICE, newest first.
 *
 * `localStorage` and a list, where slice 4 had `sessionStorage` and one
 * order. Two things were wrong with that and both were visible: a second
 * order replaced the first, and closing the tab threw the lot away while the
 * account screen still listed them as "đơn của tôi". A shop that takes an
 * order and forgets it by lunchtime is not a mock of a shop.
 *
 * Capped, because this is a browser and not a ledger: twenty is far past
 * anything a demo produces, and the cap is enforced on write so the bound
 * holds no matter how the key was filled.
 */
export const PLACED_ORDERS_KEY = "brand.orders";
export const PLACED_ORDERS_MAX = 20;

export function serializePlacedOrders(orders: PlacedOrder[]): string {
  return JSON.stringify({ v: SCHEMA_VERSION, orders: orders.slice(0, PLACED_ORDERS_MAX) });
}

/**
 * Read the list back, dropping anything that does not parse.
 *
 * One damaged record must not cost the other nineteen — and a record that
 * only half-parses is worse than a missing one, because it would print a
 * receipt with holes in it.
 */
export function parsePlacedOrders(raw: string | null): PlacedOrder[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!isRecord(parsed) || parsed.v !== SCHEMA_VERSION) return [];
  if (!Array.isArray(parsed.orders)) return [];

  const orders: PlacedOrder[] = [];
  for (const item of parsed.orders) {
    const order = readOrder(item);
    if (order) orders.push(order);
  }
  return orders.slice(0, PLACED_ORDERS_MAX);
}

/**
 * Put an order at the top of the list.
 *
 * The same code twice is the same order — `nextOrderCode` is deterministic
 * per minute, so two orders placed in one minute collide — and the newer
 * copy wins rather than appearing twice.
 */
export function addPlacedOrder(list: PlacedOrder[], order: PlacedOrder): PlacedOrder[] {
  return [order, ...list.filter((o) => o.code !== order.code)].slice(0, PLACED_ORDERS_MAX);
}

/**
 * The shopper cancels their own unpaid order.
 *
 * The record STAYS in the list, stamped. Deleting it would take the order
 * out of "Đơn hàng" altogether, and an order that vanishes is one the
 * shopper cannot check they really cancelled — the fixtures keep their
 * cancelled orders for the same reason (`DH-2310`).
 *
 * Cancelling twice is not an error and does not move the stamp: the first
 * hand is the one that cancelled it.
 */
export function cancelPlacedOrder(
  list: PlacedOrder[],
  code: string,
  at: string,
): PlacedOrder[] {
  return list.map((o) =>
    o.code === code && !o.cancelledAt
      ? { ...o, cancelledAt: at, cancelReason: "customer" as const }
      : o,
  );
}

/** One record, validated. Shared by the single reader and the list reader. */
function readOrder(value: unknown): PlacedOrder | null {
  const o = value;
  if (!isRecord(o)) return null;

  const strings = [
    "code",
    "placedAt",
    "recipient",
    "phone",
    "email",
    "addressLine",
    "note",
    "delivery",
    "payment",
  ] as const;
  if (!strings.every((k) => typeof o[k] === "string")) return null;

  const numbers = [
    "subtotalVnd",
    "shippingFeeVnd",
    "codFeeVnd",
    "discountVnd",
    "totalVnd",
  ] as const;
  if (!numbers.every((k) => typeof o[k] === "number")) return null;

  if (!Array.isArray(o.lines) || o.lines.length === 0) return null;
  if (!o.lines.every(isLine)) return null;

  // `customerId` arrived after v1 shipped, so a record without it is not
  // broken — it is a guest order, or one written by the older build. Either
  // way it belongs to no account. A value of the wrong type is dropped
  // rather than trusted: this field decides who may read the order.
  //
  // `cancelledAt` is read the same way and for the same kind of reason: it
  // decides whether the order is still standing, so a value that is not a
  // timestamp is dropped rather than treated as "cancelled at NaN".
  const optional = ["customerId", "cancelledAt", "cancelReason"] as const;
  const bad = optional.filter((k) => k in o && typeof o[k] !== "string");
  if (bad.length > 0) {
    const rest: Record<string, unknown> = { ...o };
    for (const k of bad) delete rest[k];
    return rest as unknown as PlacedOrder;
  }

  return o as unknown as PlacedOrder;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isLine(v: unknown): boolean {
  if (!isRecord(v)) return false;
  return (
    typeof v.slug === "string" &&
    typeof v.name === "string" &&
    typeof v.kind === "string" &&
    typeof v.colorLabel === "string" &&
    typeof v.size === "string" &&
    typeof v.photoKey === "string" &&
    typeof v.qty === "number" &&
    typeof v.unitPriceVnd === "number"
  );
}
