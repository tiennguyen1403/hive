import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import type { Order, OrderCode } from "@/data/types";
import {
  GUEST_ORDERS_COOKIE,
  GUEST_ORDERS_MAX_AGE_S,
  keyFor,
  parseGuestOrders,
  rememberGuestOrder,
  serializeGuestOrders,
} from "@/lib/guest-orders";
import { isOrderCode, normaliseOrderCode, phoneDigits } from "@/lib/lookup";
import { orderFailureOf, type OrderFailure, type PlaceOrderInput } from "@/lib/order-payload";
import type { Json } from "./database.types";
import { toOrder, toOrders } from "./order-dto";
import { getSupabase } from "./server";
import { getSession } from "./session";

/**
 * Orders, in Postgres.
 *
 * Until slice B2 an order lived in one of two places — the sample fixture, or
 * `localStorage` in the browser that placed it — and every screen had to ask
 * both. Every order is a row now, and there are exactly three ways to read
 * one, each deciding WHO may see it before anything leaves the database:
 *
 *   · the signed-in account, through row level security (`my_orders()`,
 *     `order_json()` — somebody else's code simply comes back empty);
 *   · the guest who placed it, through the receipt key kept in an httpOnly
 *     cookie (`receipt_order()`);
 *   · anybody holding the code AND the phone number on the order
 *     (`track_order()`, QĐ-16).
 *
 * All three return the same JSON and go through one mapper, `toOrder`.
 * Nothing here passes an owner id to the database: `auth.uid()` inside the
 * policies and the functions is the owner.
 *
 * Writes are the two functions `place_order()` and `cancel_order()`. Their
 * refusals come back as a typed `OrderError` whose `failure` is one of the
 * seven codes the SQL raises (or `UNAVAILABLE`), for the Server Action to
 * turn into a sentence.
 *
 * `access_key` is handled here and only here: read from the RPC's answer,
 * written into the cookie, never logged, never returned to a caller outside
 * this module.
 */

export class OrderError extends Error {
  readonly failure: OrderFailure;

  constructor(failure: OrderFailure) {
    super(`order refused: ${failure}`);
    this.name = "OrderError";
    this.failure = failure;
  }
}

/** A read that failed for a reason nobody can act on is an error page, not "no orders". */
function readFailed(what: string, error: { message: string }): never {
  throw new Error(`${what} failed: ${error.message}`);
}

// ────────────────────────────────────────────────────────── the account's own
/**
 * Every order this account placed, newest first.
 *
 * Cached for the request: the account layout counts them for the rail, and
 * the page below it lists them, in the same render.
 */
export const listMyOrders = cache(async (): Promise<Order[]> => {
  const session = await getSession();
  if (!session) return [];

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("my_orders");
  if (error) readFailed("my_orders", error);
  return toOrders(data);
});

/**
 * One of this account's orders, or null — for somebody else's order, an order
 * that does not exist and a code that is not a code alike (QĐ-16). The page
 * turns null into `notFound()`, on the server, before a byte is rendered.
 */
export const findMyOrder = cache(async (code: string): Promise<Order | null> => {
  if (!isOrderCode(code)) return null;
  const session = await getSession();
  if (!session) return null;

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("order_json", { p_code: code });
  if (error) readFailed("order_json", error);
  return data === null ? null : toOrder(data);
});

// ─────────────────────────────────────────────────────── without a session
/** The receipts this browser holds, from the httpOnly cookie. */
async function guestReceipts() {
  const store = await cookies();
  return parseGuestOrders(store.get(GUEST_ORDERS_COOKIE)?.value);
}

/**
 * The order behind `/order-confirmed/<code>`: the account's own first, then a
 * receipt this browser was given when it placed the order signed out.
 */
export async function loadReceipt(code: string): Promise<Order | null> {
  if (!isOrderCode(code)) return null;

  const mine = await findMyOrder(code);
  if (mine) return mine;

  const key = keyFor(await guestReceipts(), code);
  if (!key) return null;

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("receipt_order", { p_code: code, p_key: key });
  if (error) readFailed("receipt_order", error);
  return data === null ? null : toOrder(data);
}

/**
 * `/track`: a code and the phone number on the order, however both were
 * typed. A miss of either kind is the same null.
 */
export async function trackOrder(code: string, phone: string): Promise<Order | null> {
  const wanted = normaliseOrderCode(code);
  const digits = phoneDigits(phone);
  if (!isOrderCode(wanted) || !digits) return null;

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("track_order", { p_code: wanted, p_phone: digits });
  if (error) readFailed("track_order", error);
  return data === null ? null : toOrder(data);
}

// ──────────────────────────────────────────────────────────────── writing
export interface PlacedReceipt {
  code: OrderCode;
  /** The guest's receipt key. Goes into the cookie and nowhere else. */
  accessKey: string;
}

/**
 * Place the order. `now` is the app's clock (`toVnIso(demoNow())`), which is
 * what the database stamps, counts the hold from and judges the issue and the
 * code against — never its own `now()`.
 */
export async function placeOrder(input: PlaceOrderInput, now: string): Promise<PlacedReceipt> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("place_order", {
    p_input: input as unknown as Json,
    p_now: now,
  });
  if (error) throw new OrderError(orderFailureOf(error));

  const answer = data as { code?: unknown; accessKey?: unknown } | null;
  if (
    !answer ||
    typeof answer.code !== "string" ||
    !isOrderCode(answer.code) ||
    typeof answer.accessKey !== "string"
  ) {
    throw new OrderError("UNAVAILABLE");
  }
  return { code: answer.code as OrderCode, accessKey: answer.accessKey };
}

/** Call off one of the account's own unpaid orders. Refusals throw `OrderError`. */
export async function cancelOrder(code: string, now: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("cancel_order", { p_code: code, p_now: now });
  if (error) throw new OrderError(orderFailureOf(error));
}

/**
 * Keep a guest's receipt: this order at the top of the cookie, ten at most,
 * for thirty days.
 *
 * httpOnly so no script can read a key; `sameSite: "lax"` so the link in a
 * new tab still opens it; `secure` wherever the site is served over HTTPS.
 * Setting a cookie is only possible in a Server Action or a Route Handler
 * (`03-api-reference/04-functions/cookies.md`), which is where this is called
 * from.
 */
export async function rememberGuestReceipt(receipt: PlacedReceipt): Promise<void> {
  const store = await cookies();
  const next = rememberGuestOrder(parseGuestOrders(store.get(GUEST_ORDERS_COOKIE)?.value), {
    code: receipt.code,
    key: receipt.accessKey,
  });
  store.set(GUEST_ORDERS_COOKIE, serializeGuestOrders(next), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_ORDERS_MAX_AGE_S,
    secure: process.env.NODE_ENV === "production",
  });
}
