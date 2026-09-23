import {
  COLOR_KEYS,
  SIZES,
  customerId,
  orderCode,
  productId,
  promoCode,
  type ColorKey,
  type DeliveryMethod,
  type Order,
  type OrderLine,
  type OrderState,
  type OrderStatus,
  type PaymentMethod,
  type Size,
} from "@/data/types";
import type { AdminOrder, OrderOwner } from "@/lib/admin-orders";

/**
 * The border between `order_json()` and `data/types.ts`.
 *
 * Every order the app reads arrives through one Postgres function — the
 * signed-in list (`my_orders()`), one order of the account's
 * (`order_json()`), a guest's receipt (`receipt_order()`) and the public
 * lookup (`track_order()`) all return the same JSON — so one mapper reads
 * them all, and the three doors cannot drift into three shapes.
 *
 * The JSON arrives as `unknown`: PostgREST hands over whatever the function
 * produced, and a migration that renames a column produces a DIFFERENT
 * document rather than an error. So every field is checked on the way in and
 * a failure names the field — `order DH-2432.status.dueAt` is a bug report,
 * `undefined is not an object` is a puzzle. Same approach, same reasons, as
 * `catalog-snapshot.ts`.
 *
 * Pure and free of `server-only`, for the reason slice B0b found the hard
 * way: the marker does not resolve under vitest, so a mapper that lived beside
 * the query could not be tested. `order-dto.test.ts` sits beside this one.
 */

const fail = (path: string, expected: string): never => {
  throw new Error(`${path} ${expected}`);
};

/** Every instant in this codebase carries `+07:00` — see `catalog-snapshot.ts`. */
const VN_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/;
const CODE = /^DH-\d{4,}$/;

const STATES: readonly OrderState[] = [
  "AWAITING_TRANSFER",
  "RECEIVED",
  "PAID",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
];
const PAYMENTS: readonly PaymentMethod[] = ["BANK_TRANSFER", "CARD", "COD"];
const DELIVERIES: readonly DeliveryMethod[] = ["STANDARD", "EXPRESS"];

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(path, "must be an object");
  }
  return value as Record<string, unknown>;
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) return fail(path, "must be an array");
  return value;
}

function text(source: Record<string, unknown>, key: string, path: string): string {
  const value = source[key];
  if (typeof value !== "string" || value === "") {
    return fail(`${path}.${key}`, "must be a non-empty string");
  }
  return value;
}

/** A string that may legitimately be empty — a note nobody typed, a guest's owner. */
function textOrEmpty(source: Record<string, unknown>, key: string, path: string): string {
  const value = source[key];
  if (typeof value !== "string") return fail(`${path}.${key}`, "must be a string");
  return value;
}

function amount(source: Record<string, unknown>, key: string, path: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return fail(`${path}.${key}`, "must be a whole number of đồng, not negative");
  }
  return value;
}

function member<T extends string>(
  allowed: readonly T[],
  source: Record<string, unknown>,
  key: string,
  path: string,
): T {
  const value = source[key];
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    return fail(`${path}.${key}`, `must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function instant(source: Record<string, unknown>, key: string, path: string): string {
  const value = source[key];
  if (typeof value !== "string" || !VN_ISO.test(value)) {
    return fail(`${path}.${key}`, "must be an ISO instant ending in +07:00");
  }
  return value;
}

function readLine(value: unknown, path: string): OrderLine {
  const source = record(value, path);
  const qty = source.qty;
  if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) {
    fail(`${path}.qty`, "must be a whole number of at least 1");
  }
  const unitPriceVnd = amount(source, "unitPriceVnd", path);
  if (unitPriceVnd === 0) fail(`${path}.unitPriceVnd`, "must be more than 0");

  return {
    productId: productId(text(source, "productId", path)),
    size: member<Size>(SIZES, source, "size", path),
    color: member<ColorKey>(COLOR_KEYS, source, "color", path),
    qty: qty as number,
    unitPriceVnd,
  };
}

/**
 * The discriminated union, rebuilt from the object `order_json()` wrote for
 * it. Each state takes exactly the fields `OrderStatus` gives it, so an extra
 * key cannot sneak a `trackingCode` onto a pending order.
 */
function readStatus(value: unknown, path: string): OrderStatus {
  const source = record(value, path);
  const state = member(STATES, source, "state", path);
  switch (state) {
    case "AWAITING_TRANSFER":
      return { state, dueAt: instant(source, "dueAt", path) };
    case "RECEIVED":
      return { state };
    case "PAID":
      return { state, paidAt: instant(source, "paidAt", path) };
    case "SHIPPING": {
      // Absent on the sample orders, which were handed over before a courier
      // was recorded; present, it must be words (slice B3a).
      const carrier = source.carrier;
      if (carrier !== undefined && carrier !== null && (typeof carrier !== "string" || carrier === "")) {
        fail(`${path}.carrier`, "must be a non-empty string when present");
      }
      return {
        state,
        shippedAt: instant(source, "shippedAt", path),
        trackingCode: text(source, "trackingCode", path),
        ...(typeof carrier === "string" ? { carrier } : {}),
      };
    }
    case "DELIVERED":
      return { state, deliveredAt: instant(source, "deliveredAt", path) };
    case "CANCELLED":
      return {
        state,
        cancelledAt: instant(source, "cancelledAt", path),
        reason: text(source, "reason", path),
      };
  }
}

/** One order, from `order_json()`. Throws, naming the field, on anything else. */
export function toOrder(value: unknown): Order {
  const source = record(value, "order");
  const code = text(source, "code", "order");
  if (!CODE.test(code)) fail("order.code", "must look like DH-2432");
  const path = `order ${code}`;

  const lines = list(source.lines, `${path}.lines`).map((line, i) =>
    readLine(line, `${path}.lines[${i}]`),
  );
  if (lines.length === 0) fail(`${path}.lines`, "must hold at least one line");

  const shipTo = record(source.shipTo, `${path}.shipTo`);
  const promo = source.promo;

  return {
    code: orderCode(code),
    customerId: customerId(textOrEmpty(source, "customerId", path)),
    lines,
    status: readStatus(source.status, `${path}.status`),
    payment: member(PAYMENTS, source, "payment", path),
    delivery: member(DELIVERIES, source, "delivery", path),
    shippingFeeVnd: amount(source, "shippingFeeVnd", path),
    codFeeVnd: amount(source, "codFeeVnd", path),
    discountVnd: amount(source, "discountVnd", path),
    shipTo: {
      recipient: text(shipTo, "recipient", `${path}.shipTo`),
      phone: text(shipTo, "phone", `${path}.shipTo`),
      line: text(shipTo, "line", `${path}.shipTo`),
      provinceCode: text(shipTo, "provinceCode", `${path}.shipTo`),
      wardCode: text(shipTo, "wardCode", `${path}.shipTo`),
    },
    email: text(source, "email", path),
    note: textOrEmpty(source, "note", path),
    placedAt: instant(source, "placedAt", path),
    // `null` and absent mean the same thing: no code on this order.
    ...(promo === null || promo === undefined
      ? {}
      : { promo: promoCode(text(source, "promo", path)) }),
  };
}

/** A list of them, from `my_orders()`, in the order it was returned. */
export function toOrders(value: unknown): Order[] {
  return list(value, "orders").map(toOrder);
}

// ──────────────────────────────────────────────────── the back office's read
/**
 * The manager's list, from `admin_orders()` (slice B3a): each order in the
 * same `order_json()` shape the shoppers' doors return — read by the same
 * `toOrder`, so the back office cannot drift into a fourth shape — beside the
 * account it belongs to, or null for a guest's.
 */
export function toAdminOrders(value: unknown): AdminOrder[] {
  return list(value, "admin orders").map((item, i) => {
    const source = record(item, `admin orders[${i}]`);
    const order = toOrder(source.order);
    return { ...order, owner: toOwner(source.owner, `order ${order.code}.owner`) };
  });
}

function toOwner(value: unknown, path: string): OrderOwner | null {
  if (value === null || value === undefined) return null;
  const source = record(value, path);
  const handle = source.handle;
  if (handle !== null && handle !== undefined && (typeof handle !== "string" || handle === "")) {
    fail(`${path}.handle`, "must be a non-empty string or null");
  }
  return {
    id: text(source, "id", path),
    handle: typeof handle === "string" ? handle : null,
    name: text(source, "name", path),
    email: textOrEmpty(source, "email", path),
    phone: textOrEmpty(source, "phone", path),
    joinedAt: instant(source, "joinedAt", path),
  };
}
