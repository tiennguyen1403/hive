import "server-only";

import type Stripe from "stripe";
import type { Order } from "@/data/types";
import {
  cardTotalVnd,
  checkPaidSession,
  checkoutSessionParams,
  isSessionId,
  paidCopy,
  type CheckoutOrder,
} from "@/lib/card-checkout";
import { demoNow, demoNowMs } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import type { Locale } from "@/lib/i18n";
import { getStripe } from "@/lib/stripe";
import { getServiceSupabase } from "./service";

/**
 * Card payments on Stripe, from the server's side (slice B18, QĐ-42, QĐ-46):
 * Stripe's Checkout Sessions and the three SQL moves that keep the order in
 * step with them (`20261007180000_card_checkout.sql`) — `card_session()`,
 * `card_checkout_opened()`, `card_mark_paid()` — which only the service role
 * may call, so this goes through `getServiceSupabase()`, as the rate limits do.
 * No table is read or written with it directly.
 *
 * EVERY CALLER HAS ALREADY DECIDED THE VISITOR MAY SEE THE ORDER: the
 * account's own (`findMyOrder`), a guest's receipt cookie (`loadReceipt`), the
 * lookup's code and phone (`lookupOrder`), the back office (`requireAdmin`).
 * This module is handed that order and trusts nothing else — not a session id
 * from a URL (only the session the order row stored is ever asked about; a URL
 * id that is not it is ignored), not an amount.
 *
 * NOTHING HERE THROWS for Stripe or the network: a page that asks Stripe while
 * it is drawn must still draw. A failure is logged (never with the key — the
 * SDK masks it, and `logged` strips anything shaped like one) and answered as
 * a value: the order stays as it was, and the next view asks again.
 */

/** What asking Stripe about one session came to. */
export type ConfirmOutcome =
  /** Stripe says it is paid, and the order is now PAID. */
  | "PAID"
  /** The order was paid already: nothing changed. */
  | "ALREADY_PAID"
  /** Paid, but the order had been cancelled: not revived; a note asks the shop to refund it by hand. */
  | "CANCELLED"
  /** The session is this order's, and not paid (yet). */
  | "NOT_PAID"
  /** Not this order's session, not for its total or currency, or no such session. */
  | "REFUSED"
  /** No key, no service role, or Stripe or the database did not answer. */
  | "UNAVAILABLE";

/** The order fields the server reads to price and check a session. */
type CardOrder = CheckoutOrder & Pick<Order, "payment" | "status"> & { moments?: Order["moments"] };

const SECRET = /\b(sk|rk|pk)_(test|live)_[A-Za-z0-9*]+/g;

/** An error's message for the server log, with anything shaped like a Stripe key taken out. */
function logged(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(SECRET, "[key]");
}

/** A Stripe error that is the request's fault — a session that does not exist — rather than Stripe's or the network's. */
function isRequestRefusal(error: unknown): boolean {
  const e = error as { type?: unknown; statusCode?: unknown } | null;
  return e?.type === "StripeInvalidRequestError" || e?.statusCode === 404;
}

/** The Checkout Session the order last opened, or null (none, not a card order, or the database did not answer). */
async function storedSession(code: string): Promise<string | null> {
  const service = getServiceSupabase();
  if (!service) return null;
  const { data, error } = await service.rpc("card_session", { p_code: code });
  if (error) {
    console.error(`card_session(${code}):`, error.message);
    return null;
  }
  return isSessionId(data) ? data : null;
}

/** One session, from Stripe; null when there is no such session or Stripe did not answer (logged). */
async function retrieve(stripe: Stripe, sessionId: string): Promise<{ session: Stripe.Checkout.Session | null; refused: boolean }> {
  try {
    return { session: await stripe.checkout.sessions.retrieve(sessionId), refused: false };
  } catch (error) {
    if (isRequestRefusal(error)) return { session: null, refused: true };
    console.error(`stripe: retrieve checkout session for an order failed: ${logged(error)}`);
    return { session: null, refused: false };
  }
}

/**
 * Ask Stripe about one session of this order and record what it says. The
 * session is believed only when Stripe's own copy of it is this order's, for
 * this order's total, in đồng, and paid (`checkPaidSession`); then
 * `card_mark_paid()` checks the total once more against the order's lines and
 * either makes it PAID, finds it paid already, or finds it cancelled.
 */
async function confirmSession(
  order: CardOrder,
  sessionId: string,
): Promise<{ outcome: ConfirmOutcome; paidAt?: string; paymentIntent?: string }> {
  if (!isSessionId(sessionId)) return { outcome: "REFUSED" };
  const stripe = getStripe();
  const service = getServiceSupabase();
  if (!stripe || !service) return { outcome: "UNAVAILABLE" };

  const { session, refused } = await retrieve(stripe, sessionId);
  if (!session) return { outcome: refused ? "REFUSED" : "UNAVAILABLE" };

  const totalVnd = cardTotalVnd(order);
  const check = checkPaidSession(session, { code: order.code, totalVnd });
  if (!check.ok) return { outcome: check.reason === "NOT_PAID" ? "NOT_PAID" : "REFUSED" };

  const paidAt = toVnIso(demoNow());
  const { data, error } = await service.rpc("card_mark_paid", {
    p_code: order.code,
    p_session_id: session.id,
    p_payment_intent: check.paymentIntent,
    p_amount_vnd: totalVnd,
    p_now: paidAt,
  });
  if (error) {
    console.error(`card_mark_paid(${order.code}):`, error.message);
    return { outcome: "UNAVAILABLE" };
  }
  if (data === "PAID") return { outcome: "PAID", paidAt, paymentIntent: check.paymentIntent };
  if (data === "CANCELLED") {
    // The order was called off before the money came, and stays so; the
    // system's note in the log tells the shop to refund it by hand (QĐ-46).
    console.warn(`card payment for cancelled order ${order.code} (${check.paymentIntent}): refund by hand on Stripe`);
    return { outcome: "CANCELLED" };
  }
  return { outcome: "ALREADY_PAID" };
}

/**
 * The order as Stripe says it is, for the pages that draw ONE order (the
 * receipt, the account's order page, the lookup's result, the back office's
 * order page — never a list), and handed back PAID when Stripe says so.
 *
 * ONLY THE SESSION THIS ORDER ROW STORED IS EVER ASKED ABOUT (`card_session()`).
 * An order number comes round again after every `reset_demo()` — the daily
 * cron, and the public "Đặt lại dữ liệu mẫu" — and the "Đăng nhập thử" account
 * is shared, so yesterday's paid session for the same number and the same
 * total (KHÓI with delivery, 420.000₫, is the commonest order) would pass every
 * check on its own data: a `session_id` on the URL is believed only when it IS
 * the stored one, and otherwise Stripe is not even asked about it. The stored
 * id is the one page that can take the order's money (`openCardCheckout` never
 * leaves two open).
 *
 *   · a card order still waiting is checked at every view — no webhook
 *     (QĐ-46), so a shopper who paid and closed the tab finds it paid;
 *   · a card order already cancelled — called off, or its hold ran out while
 *     the shopper paid (`effectiveOrder` reads an unswept one as cancelled), or
 *     a retry's page outlived the hold by up to its 31 minutes — is checked
 *     only when the shopper comes back from Stripe with the stored session on
 *     the URL. `card_mark_paid()` then answers CANCELLED and leaves the shop its
 *     note, once per payment intent. Not at every view of a cancelled order:
 *     that would cost a call to Stripe for each;
 *   · paid, on its way or delivered: never asked.
 *
 * Still not covered, a known limit of having no webhook: a shopper who pays,
 * closes the tab, and does not come back before the hold runs out leaves a
 * cancelled order and a payment for the shop to refund by hand.
 *
 * The order is handed back patched (`paidCopy`) rather than read again: the
 * account's list and the back office's book are cached for the request, and
 * would answer with the order as it was a moment ago. A back-office order
 * (one that carries `card`, `admin_orders()`) gets Stripe's reference too, as
 * the book will have it on the next read.
 *
 * Pass the order as the clock reads it (`effectiveOrder`).
 */
export async function reconcileCardOrder<T extends CardOrder>(order: T, returnedSessionId: string | null = null): Promise<T> {
  if (order.payment !== "CARD") return order;
  const waiting = order.status.state === "AWAITING_TRANSFER";
  const backToCancelled = order.status.state === "CANCELLED" && isSessionId(returnedSessionId);
  if (!waiting && !backToCancelled) return order;

  const stored = await storedSession(order.code);
  if (!stored) return order;
  if (backToCancelled && returnedSessionId !== stored) return order;

  const { outcome, paidAt, paymentIntent } = await confirmSession(order, stored);
  if (outcome === "PAID" && paidAt) {
    const paid = paidCopy(order, paidAt);
    return "card" in order ? ({ ...paid, card: { checkout: true, paymentIntent: paymentIntent ?? null } } as T) : paid;
  }
  return order;
}

/** What "Trả bằng thẻ" — or a card order just placed — came to. */
export type OpenOutcome =
  /** A Stripe page is open for the order: send the shopper there. */
  | { kind: "OPENED"; url: string }
  /** The session the order last opened turned out paid: the order is PAID now, nothing to open. */
  | { kind: "PAID" }
  /** The order cannot be paid now: not a card order, not waiting, past its hold. */
  | { kind: "NOT_ALLOWED" }
  /** No key, no service role, or Stripe or the database did not answer. */
  | { kind: "UNAVAILABLE" };

/**
 * Open a Stripe page for a card order waiting for its money (`order` as the
 * clock reads it, `effectiveOrder`), on the origin the shopper is on, in their
 * language.
 *
 * The session the order opened before, if any, goes first, and no new page is
 * opened while the old one might still take the money — the stored id must
 * stay the one page that can be paid, since it is the only one the app ever
 * believes (`reconcileCardOrder`):
 *
 *   · paid already — the shopper paid in another tab — the order is marked
 *     paid and nothing is opened (PAID);
 *   · still open, it is expired first
 *     (https://docs.stripe.com/api/checkout/sessions/expire: "After it
 *     expires, a customer can't complete a Checkout Session"). When the expiry
 *     fails, Stripe is asked once more: paid a moment ago is PAID; anything
 *     else is UNAVAILABLE, and no second page is opened;
 *   · Stripe cannot say what became of it (no answer): UNAVAILABLE, for the
 *     same reason. Stripe knows no such session (a sandbox made anew): there is
 *     nothing left to take money, and a page is opened.
 *
 * Then the new session (`checkoutSessionParams`), whose id
 * `card_checkout_opened()` keeps on the order — which also refuses an order
 * that is no longer waiting. A session the database would not keep is expired
 * again at once.
 *
 * Still open, a known limit: two different browsers pressing "Trả bằng thẻ"
 * for the same order within the same second can both find the old page
 * already expired by the other and open one each; one browser cannot, as Next
 * runs a client's actions one at a time.
 */
export async function openCardCheckout(order: CardOrder, origin: string, locale: Locale): Promise<OpenOutcome> {
  if (order.payment !== "CARD" || order.status.state !== "AWAITING_TRANSFER") return { kind: "NOT_ALLOWED" };
  const stripe = getStripe();
  const service = getServiceSupabase();
  if (!stripe || !service) return { kind: "UNAVAILABLE" };

  const previous = await storedSession(order.code);
  if (previous) {
    const { session, refused } = await retrieve(stripe, previous);
    if (!session && !refused) return { kind: "UNAVAILABLE" };
    if (session?.status === "complete") {
      const { outcome } = await confirmSession(order, previous);
      if (outcome === "PAID" || outcome === "ALREADY_PAID") return { kind: "PAID" };
      if (outcome === "CANCELLED") return { kind: "NOT_ALLOWED" };
      // A finished page that paid nothing takes no more money; anything Stripe or the database could not settle does
      // not get a second page beside it.
      if (outcome !== "NOT_PAID") return { kind: "UNAVAILABLE" };
    } else if (session?.status === "open") {
      try {
        await stripe.checkout.sessions.expire(previous);
      } catch (error) {
        // It may have been paid a moment ago: then there is nothing to open. Otherwise it may still take money.
        const { outcome } = await confirmSession(order, previous);
        if (outcome === "PAID" || outcome === "ALREADY_PAID") return { kind: "PAID" };
        console.error(`stripe: expire the previous session of ${order.code} failed: ${logged(error)}`);
        return { kind: "UNAVAILABLE" };
      }
    }
  }

  const params = checkoutSessionParams({
    code: order.code,
    totalVnd: cardTotalVnd(order),
    dueAt: order.status.dueAt,
    origin,
    locale,
    nowMs: demoNowMs(),
  });
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(params);
  } catch (error) {
    console.error(`stripe: create a checkout session for ${order.code} failed: ${logged(error)}`);
    return { kind: "UNAVAILABLE" };
  }
  if (!session.url || !isSessionId(session.id)) {
    console.error(`stripe: the checkout session for ${order.code} came back without a page`);
    return { kind: "UNAVAILABLE" };
  }

  const { error } = await service.rpc("card_checkout_opened", {
    p_code: order.code,
    p_session_id: session.id,
    p_now: toVnIso(demoNow()),
  });
  if (error) {
    console.error(`card_checkout_opened(${order.code}):`, error.message);
    try {
      await stripe.checkout.sessions.expire(session.id);
    } catch (expireError) {
      console.error(`stripe: expire the unkept session of ${order.code} failed: ${logged(expireError)}`);
    }
    return error.message === "NOT_ALLOWED" ? { kind: "NOT_ALLOWED" } : { kind: "UNAVAILABLE" };
  }
  return { kind: "OPENED", url: session.url };
}

/**
 * After a card order is cancelled — by the shopper ("Huỷ đơn") or by the shop —
 * its Stripe page stops taking money: the stored session, when Stripe still
 * calls it `open`, is expired. Called by the cancelling actions once the
 * database has cancelled the order, with the order as it now reads.
 *
 * BEST EFFORT, and it never throws: whatever fails is logged (`logged`), and
 * the cancellation stands and is answered as before. A page that turns out paid
 * a moment before — the expiry refused because the session is `complete` — is
 * handed to `card_mark_paid()`, which finds the order cancelled, leaves it so,
 * and writes the shop its note to refund the payment by hand (QĐ-46). Any other
 * order, and an order with no stored session, costs nothing.
 */
export async function closeCardCheckout(order: CardOrder): Promise<void> {
  if (order.payment !== "CARD") return;
  const stripe = getStripe();
  if (!stripe) return;
  const stored = await storedSession(order.code);
  if (!stored) return;

  const { session } = await retrieve(stripe, stored);
  if (session?.status === "open") {
    try {
      await stripe.checkout.sessions.expire(stored);
      return;
    } catch (error) {
      const { outcome } = await confirmSession(order, stored);
      if (outcome !== "CANCELLED" && outcome !== "ALREADY_PAID") {
        console.error(`stripe: expire the session of cancelled order ${order.code} failed: ${logged(error)}`);
      }
      return;
    }
  }
  // Paid between the shopper's last look and the cancel: the order stays cancelled, with the note.
  if (session?.status === "complete") await confirmSession(order, stored);
}
