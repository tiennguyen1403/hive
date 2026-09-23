import "server-only";

import { cache } from "react";
import {
  isShopper,
  type AdminCustomer,
  type AdminCustomerDetail,
} from "@/lib/admin-customers";
import type { AdminOrder } from "@/lib/admin-orders";
import { demoNowMs } from "@/lib/clock";
import { isOrderCode } from "@/lib/lookup";
import { toAddress, toAdminCustomer } from "./account-dto";
import { toEvents, type AdminEvent, type EventKind } from "./event-dto";
import { toAdminOrders } from "./order-dto";
import { getSupabase } from "./server";
import { getSession } from "./session";

/**
 * The back office's reads, since slice B3a: the order book, the customers,
 * the log.
 *
 * Every function asks for an admin session before it builds a client — the
 * Data Access Layer is where the Next guide puts the check, "close to your
 * data source" (`02-guides/authentication.md`) — and the database asks again:
 * the manager sees every row only because the admin read policies say so
 * (`public.is_admin()`), and `admin_orders()` refuses anybody else outright.
 * The pages call `requireAdmin()` first, which redirects or 404s; reaching a
 * function here without an admin session is a bug, and it throws like one.
 *
 * What leaves is DTOs (`lib/admin-orders.ts`, `lib/admin-customers.ts`,
 * `event-dto.ts`), never rows. Cached per request (`React.cache`): the admin
 * layout counts the orders waiting while the page below lists them, from one
 * round trip.
 */

async function adminClient() {
  const session = await getSession();
  if (session?.role !== "admin") {
    throw new Error("an admin read was attempted without an admin session");
  }
  return getSupabase();
}

/** A read that failed for a reason nobody can act on is an error page, not "nothing". */
function readFailed(what: string, error: { message: string }): never {
  throw new Error(`${what} failed: ${error.message}`);
}

const DAY_MS = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROFILE_COLUMNS = "id, handle, name, email, phone, joined_at";
const ADDRESS_COLUMNS = "id, recipient, phone, line, province_code, ward_code, label, is_default";
const EVENT_COLUMNS = "id, at, actor_role, actor, kind, order_code, payload";

// ──────────────────────────────────────────────────────────────── orders
/** Every order in the book, newest first, each with its account. */
export const listAllOrders = cache(async (): Promise<AdminOrder[]> => {
  const supabase = await adminClient();
  const { data, error } = await supabase.rpc("admin_orders");
  if (error) readFailed("admin_orders", error);
  return toAdminOrders(data);
});

/**
 * One order, or null for a code that is not one or not in the book — the
 * page turns null into `notFound()`. Read off the cached book the layout has
 * already fetched, so opening an order costs no second round trip.
 */
export async function findOrderAdmin(code: string): Promise<AdminOrder | null> {
  if (!isOrderCode(code)) return null;
  return (await listAllOrders()).find((o) => o.code === code) ?? null;
}

// ───────────────────────────────────────────────────────────── customers
/**
 * Every shopper — the demo accounts and everybody who signed up — oldest
 * account first, which is the order `data/customers.ts` lists the eight in.
 * The shop's own manager is left out (`isShopper`).
 */
export const listCustomers = cache(async (): Promise<AdminCustomer[]> => {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .order("joined_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) readFailed("profiles", error);
  return data.map(toAdminCustomer).filter(isShopper);
});

/**
 * One shopper with their address book, by the key the back office's URLs use:
 * the fixture handle (`c-minhanh`) or the uuid. Null for anything else — the
 * page turns it into `notFound()`.
 */
export async function findCustomer(key: string): Promise<AdminCustomerDetail | null> {
  if (key === "") return null;
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq(UUID.test(key) ? "id" : "handle", key)
    .maybeSingle();
  if (error) readFailed("profiles", error);
  if (!data) return null;

  const customer = toAdminCustomer(data);
  if (!isShopper(customer)) return null;

  const book = await supabase
    .from("addresses")
    .select(ADDRESS_COLUMNS)
    .eq("profile_id", customer.id)
    .order("position", { ascending: true });
  if (book.error) readFailed("addresses", book.error);

  return { ...customer, addresses: book.data.map(toAddress) };
}

// ──────────────────────────────────────────────────────────────── the log
/**
 * The log, newest first — read straight off `public.events`, which only the
 * manager may read (the `events: admin reads` policy). One kind, and only the
 * last `days` days, when asked.
 */
export async function listEvents({
  kind,
  days,
  limit,
}: {
  kind?: EventKind;
  days?: number;
  limit: number;
}): Promise<AdminEvent[]> {
  const supabase = await adminClient();
  let query = supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .order("at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (kind) query = query.eq("kind", kind);
  if (days !== undefined) query = query.gte("at", new Date(demoNowMs() - days * DAY_MS).toISOString());

  const { data, error } = await query;
  if (error) readFailed("events", error);
  return toEvents(data);
}

/** One order's own events, oldest first — its notes, read a second way. */
export const orderEvents = cache(async (code: string): Promise<AdminEvent[]> => {
  if (!isOrderCode(code)) return [];
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("order_code", code)
    .order("at", { ascending: true })
    .order("id", { ascending: true });
  if (error) readFailed("events", error);
  return toEvents(data);
});

/** When the sample data was last put back, or null if the log has no reset. */
export const lastReset = cache(async (): Promise<string | null> => {
  const [latest] = await listEvents({ kind: "DEMO_RESET", limit: 1 });
  return latest?.at ?? null;
});
