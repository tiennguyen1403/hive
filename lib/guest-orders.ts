/**
 * The receipts of a browser that ordered while signed out.
 *
 * A signed-in shopper reopens an order through the session: row level
 * security hands the account its own rows and nobody else's. A guest has no
 * session, so `place_order()` hands back a random `access_key` with the order
 * number, and the Server Action keeps the pair in a cookie. With it,
 * `/order-confirmed/<code>` opens the receipt again in THIS browser; without
 * it, the code alone opens nothing (`receipt_order()` answers null), because
 * codes are short and sequential and the page behind one holds a name, a
 * phone number and a home address (QĐ-16).
 *
 * The cookie is httpOnly — no script on the page can read a key — and only the
 * server parses it (`lib/db/orders.ts`). This module is the pure half: what
 * the value looks like, how it is read back defensively, and how a new
 * receipt goes to the front of the list.
 */

export const GUEST_ORDERS_COOKIE = "guest_orders";

/** Enough for every order a demo visitor places; the oldest drops off first. */
export const GUEST_ORDERS_MAX = 10;

/** Thirty days, in seconds — `maxAge` is in seconds. */
export const GUEST_ORDERS_MAX_AGE_S = 30 * 24 * 60 * 60;

export interface GuestOrder {
  code: string;
  /** The order's `access_key`, a uuid. */
  key: string;
}

const CODE = /^DH-\d{4,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * `DH-2432:<uuid>~DH-2433:<uuid>` — newest first.
 *
 * A format of its own rather than JSON: it is short, it needs nothing but
 * characters a cookie carries anyway, and there is nothing in it to nest.
 */
export function serializeGuestOrders(list: GuestOrder[]): string {
  return list
    .slice(0, GUEST_ORDERS_MAX)
    .map((o) => `${o.code}:${o.key}`)
    .join("~");
}

/**
 * Read the cookie back. Never throws and never returns junk: a cookie is
 * something the browser can write, so every entry is checked on its own and
 * one bad entry costs only itself. A code seen twice keeps its first (newest)
 * key.
 */
export function parseGuestOrders(raw: string | null | undefined): GuestOrder[] {
  if (!raw) return [];

  const out: GuestOrder[] = [];
  const seen = new Set<string>();
  for (const entry of raw.split("~")) {
    const at = entry.indexOf(":");
    if (at === -1) continue;
    const code = entry.slice(0, at);
    const key = entry.slice(at + 1).toLowerCase();
    if (!CODE.test(code) || !UUID.test(key) || seen.has(code)) continue;
    seen.add(code);
    out.push({ code, key });
    if (out.length === GUEST_ORDERS_MAX) break;
  }
  return out;
}

/** Put a receipt at the top of the list, dropping an older copy and the eleventh. */
export function rememberGuestOrder(list: GuestOrder[], entry: GuestOrder): GuestOrder[] {
  return [entry, ...list.filter((o) => o.code !== entry.code)].slice(0, GUEST_ORDERS_MAX);
}

/** The key this browser holds for an order, or null when it holds none. */
export function keyFor(list: GuestOrder[], code: string): string | null {
  return list.find((o) => o.code === code)?.key ?? null;
}
