import type Stripe from "stripe";
import type { Order } from "@/data/types";
import { picker, type Locale } from "./i18n";
import { orderTotalVnd } from "./orders";

/**
 * Card payments on Stripe's hosted Checkout page, TEST MODE ONLY (slice B18,
 * QĐ-42, QĐ-46): the parts with no I/O, so they can be tested without a key,
 * a network or a request. The server side is `lib/stripe.ts` (the client) and
 * `lib/db/card-payments.ts` (Stripe and the database together); the actions
 * are `placeOrderAction` and `payByCard`.
 *
 * The browser only ever NAVIGATES to Stripe (QĐ-46, as QĐ-41 for Google): a
 * Server Action creates the session and answers with a redirect to its URL,
 * and Stripe sends the shopper back to `/order-confirmed/<code>`. No Stripe
 * script is loaded, and the publishable key is never read.
 *
 * Nothing that comes back on the URL is believed. `session_id` only names the
 * session to ask Stripe about; the order is marked paid when the session
 * Stripe returns is this order's, for this order's total, in đồng, and paid
 * (`checkPaidSession`).
 *
 * Sources: https://docs.stripe.com/api/checkout/sessions/create (`mode`,
 * `line_items[].price_data`, `client_reference_id`, `metadata`, `locale`,
 * `success_url` with `{CHECKOUT_SESSION_ID}`, `cancel_url`, `expires_at` "from
 * 30 minutes to 24 hours after Checkout Session creation",
 * `allowed_payment_method_types`), https://docs.stripe.com/currencies (zero-decimal
 * currencies: "the charge and the amount are the same, without requiring
 * multiplication").
 */

// ─────────────────────────────────────────────────────────────── the key
/**
 * A secret key of Stripe's test mode. QĐ-42: only a sandbox, never real money,
 * so a live key (`sk_live_…`) or a restricted one is refused before any
 * request is made — card payment is then simply off (`getStripe()` answers
 * null).
 */
export const TEST_KEY_PREFIX = "sk_test_";

export function isTestKey(key: string | null | undefined): key is string {
  return typeof key === "string" && key.startsWith(TEST_KEY_PREFIX) && key.length > TEST_KEY_PREFIX.length;
}

// ─────────────────────────────────────────────────────────────── the ids
/** A test-mode Checkout Session id, as `orders.stripe_session_id` accepts it (letters and digits after `cs_test_`). */
const SESSION_ID = /^cs_test_[A-Za-z0-9]+$/;
/** A payment intent id, as `orders.stripe_payment_intent` accepts it. */
const PAYMENT_INTENT_ID = /^pi_[A-Za-z0-9]+$/;
const MAX_ID_LENGTH = 255;

export function isSessionId(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_ID_LENGTH && SESSION_ID.test(value);
}

export function isPaymentIntentId(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_ID_LENGTH && PAYMENT_INTENT_ID.test(value);
}

// ─────────────────────────────────────────────────────────── the return
/** Where Stripe's own placeholder goes: Stripe writes the session's id there on the way back. */
export const SESSION_ID_PARAM = "session_id";
/** The flag on the way back without paying: `cancelled` (Stripe's "←"), or `failed` (no page could be opened). */
export const PAYMENT_PARAM = "payment";

export type PaymentFlag = "cancelled" | "failed";

/** The receipt of one order, where both of Stripe's URLs lead. */
export function receiptPath(code: string): string {
  return `/order-confirmed/${code}`;
}

/**
 * `success_url` and `cancel_url`: the order's receipt on the origin the
 * shopper is on, the first with `{CHECKOUT_SESSION_ID}` — written as the
 * literal braces, which Stripe replaces with the session's id — the second
 * with the "not paid" flag.
 */
export function cardReturnUrls(origin: string, code: string): { success: string; cancel: string } {
  const at = `${origin}${receiptPath(code)}`;
  return {
    success: `${at}?${SESSION_ID_PARAM}={CHECKOUT_SESSION_ID}`,
    cancel: `${at}?${PAYMENT_PARAM}=cancelled`,
  };
}

/** The receipt when no Stripe page could be opened: the order is kept, and the page says so beside its button. */
export function paymentFailedPath(code: string): string {
  return `${receiptPath(code)}?${PAYMENT_PARAM}=failed`;
}

/**
 * The line the receipt adds under its next step for a card order back without
 * paying: "Chưa trả." after Stripe's "←" — the hold just below already prints
 * how long the items are kept (the main session, 07/10) — or, when no Stripe
 * page could be opened, that and that the order is still kept.
 */
export function paymentReturnText(flag: PaymentFlag, locale: Locale = "vi"): string {
  const t = picker(locale);
  return flag === "cancelled"
    ? t({ vi: "Chưa trả.", en: "Not paid yet." })
    : t({
        vi: "Chưa mở được trang thanh toán. Đơn vẫn được giữ.",
        en: "Couldn't open the payment page. Your order is still reserved.",
      });
}

type RawParam = string | string[] | undefined;
const firstOf = (v: RawParam) => (Array.isArray(v) ? v[0] : v);

/**
 * The two things the receipt's URL may carry (`searchParams`): the session to
 * ask Stripe about — only when it has a session's shape, anything else is
 * ignored — and the flag. Neither is believed: the session is checked with
 * Stripe, and the flag only adds a line to an order still waiting.
 */
export function readPaymentReturn(sp: Record<string, RawParam>): { sessionId: string | null; flag: PaymentFlag | null } {
  const id = firstOf(sp[SESSION_ID_PARAM]);
  const flag = firstOf(sp[PAYMENT_PARAM]);
  return {
    sessionId: isSessionId(id) ? id : null,
    flag: flag === "cancelled" || flag === "failed" ? flag : null,
  };
}

// ─────────────────────────────────────────────────────────── the window
/** Stripe's limits on `expires_at`, counted from the session's creation. */
export const STRIPE_MIN_EXPIRY_S = 30 * 60;
export const STRIPE_MAX_EXPIRY_S = 24 * 60 * 60;
/**
 * Kept inside both limits by a minute: Stripe counts from its own moment of
 * creation, which comes after ours by the request's flight — an `expires_at`
 * exactly 30 minutes from our clock would be a little under 30 from Stripe's.
 */
export const EXPIRY_MARGIN_S = 60;

/**
 * When the Stripe page stops taking payment: the order's hold, held inside the
 * 30-minute to 24-hour window Stripe allows (unix seconds). A new order's
 * twelve hours sit inside it; a retry with less than half an hour of hold left
 * gets half an hour, and a payment that lands after the hold finds the order
 * cancelled — never revived (`card_mark_paid()`).
 */
export function checkoutExpiresAt(dueAtIso: string, nowMs: number): number {
  const now = Math.floor(nowMs / 1000);
  const due = Math.floor(Date.parse(dueAtIso) / 1000);
  const earliest = now + STRIPE_MIN_EXPIRY_S + EXPIRY_MARGIN_S;
  const latest = now + STRIPE_MAX_EXPIRY_S - EXPIRY_MARGIN_S;
  return Math.min(Math.max(due, earliest), latest);
}

// ─────────────────────────────────────────────────────────── the session
/** The one line Stripe's page lists: "Đơn DH-2432", in English "Order DH-2432". */
export function lineItemName(code: string, locale: Locale = "vi"): string {
  return picker(locale)({ vi: `Đơn ${code}`, en: `Order ${code}` });
}

/** What a session is made from: the order's number, its total, its hold, where the shopper is, and their language. */
export interface CheckoutRequest {
  code: string;
  totalVnd: number;
  dueAt: string;
  origin: string;
  locale: Locale;
  nowMs: number;
}

/**
 * The Checkout Session for one order.
 *
 *   · `mode: "payment"`, one line for the whole order at its total — the goods,
 *     the delivery and the COD fee, less the code, as the order was priced
 *     (`orderTotalVnd`) — in đồng, a zero-decimal currency: 390.000₫ is
 *     `unit_amount: 390000`, never times a hundred. The session's currency is
 *     the line's, `vnd`;
 *   · `allowed_payment_method_types: ["card"]`: a card and nothing else —
 *     "Only payment methods that are both dynamically eligible and present in
 *     this list will be offered to the customer". Without it the sandbox also
 *     offers Link, Stripe's wallet (measured 07/10/2026), and wallets are out
 *     of this slice. (The API version the SDK pins, `2026-09-30.endive`, has
 *     no `payment_method_types` on create; this filter is its way to say it.);
 *   · `client_reference_id` and `metadata.order_code`: the order's number;
 *   · `locale`: the shopper's language, `vi` or `en`, both Stripe locales;
 *   · the two URLs back to the receipt (`cardReturnUrls`);
 *   · `expires_at`: the hold, held inside Stripe's window (`checkoutExpiresAt`).
 */
export function checkoutSessionParams(r: CheckoutRequest): Stripe.Checkout.SessionCreateParams {
  const urls = cardReturnUrls(r.origin, r.code);
  return {
    mode: "payment",
    allowed_payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "vnd",
          unit_amount: r.totalVnd,
          product_data: { name: lineItemName(r.code, r.locale) },
        },
      },
    ],
    client_reference_id: r.code,
    metadata: { order_code: r.code },
    locale: r.locale,
    success_url: urls.success,
    cancel_url: urls.cancel,
    expires_at: checkoutExpiresAt(r.dueAt, r.nowMs),
  };
}

/** The order fields a session is priced from: `checkoutSessionParams` for one order. */
export type CheckoutOrder = Pick<Order, "code" | "lines" | "shippingFeeVnd" | "codFeeVnd" | "discountVnd">;

/** The total Stripe must have taken, for an order: `orderTotalVnd`, the same sum every receipt prints. */
export function cardTotalVnd(o: CheckoutOrder): number {
  return orderTotalVnd(o);
}

// ──────────────────────────────────────────────────────── the verdict
/** The fields of a session the verdict reads. Stripe's `Checkout.Session` has them all. */
export type SessionFacts = Pick<
  Stripe.Checkout.Session,
  "mode" | "payment_status" | "client_reference_id" | "amount_total" | "currency" | "payment_intent"
>;

/** Why a session does not pay for an order. */
export type SessionRefusal = "OTHER_ORDER" | "NOT_PAYMENT" | "CURRENCY" | "AMOUNT" | "NOT_PAID" | "NO_INTENT";

export type SessionCheck = { ok: true; paymentIntent: string } | { ok: false; reason: SessionRefusal };

/**
 * Whether a session Stripe returned pays for this order — never what the URL
 * said. In this order, so the answer names the first thing that is wrong:
 *
 *   1. it is this order's session (`client_reference_id`): a session of
 *      another order, or anybody's, pays for nothing here;
 *   2. a one-off payment, in đồng, for exactly the order's total;
 *   3. Stripe calls it `paid`;
 *   4. it names the payment intent the order will keep.
 */
export function checkPaidSession(session: SessionFacts, expected: { code: string; totalVnd: number }): SessionCheck {
  if (session.client_reference_id !== expected.code) return { ok: false, reason: "OTHER_ORDER" };
  if (session.mode !== "payment") return { ok: false, reason: "NOT_PAYMENT" };
  if (session.currency !== "vnd") return { ok: false, reason: "CURRENCY" };
  if (session.amount_total !== expected.totalVnd) return { ok: false, reason: "AMOUNT" };
  if (session.payment_status !== "paid") return { ok: false, reason: "NOT_PAID" };
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  return isPaymentIntentId(intent) ? { ok: true, paymentIntent: intent } : { ok: false, reason: "NO_INTENT" };
}

// ─────────────────────────────────────────────────────── once it is paid
/**
 * The order as it reads once `card_mark_paid()` has made it paid at `paidAt`
 * — the same instant the server sent, so the page that asked Stripe draws what
 * a fresh read would return, without reading again (`listMyOrders` and the
 * back office's book are cached for the request, and would answer with the
 * order as it was a moment ago).
 */
export function paidCopy<T extends Pick<Order, "status"> & { moments?: Order["moments"] }>(order: T, paidAt: string): T {
  return { ...order, status: { state: "PAID", paidAt }, moments: { ...order.moments, paidAt } };
}

/** Whether an order is a card order still waiting for its payment — the one kind the server asks Stripe about. */
export function awaitsCardPayment(o: Pick<Order, "payment" | "status">): boolean {
  return o.payment === "CARD" && o.status.state === "AWAITING_TRANSFER";
}

// ─────────────────────────────────────────────────────── "Trả bằng thẻ"
/**
 * What the "Trả bằng thẻ" form shows under its button: nothing, or why no
 * Stripe page opened. A page that did open is not an answer — the action
 * redirects to it.
 */
export interface PayByCardState {
  message: string | null;
}

export const PAY_BY_CARD_IDLE: PayByCardState = { message: null };

/**
 * Why no page opened, besides the rate limit's own sentence:
 *   · `NOT_ALLOWED`: the order cannot be paid by card now — paid, cancelled,
 *     past its hold, not a card order — or is not one this visitor may see;
 *     one sentence for all of them, so a guessed number learns nothing (QĐ-16);
 *   · `UNAVAILABLE`: Stripe or the database did not answer, or card payment is
 *     off here (no test key).
 */
export type PayByCardRefusal = "NOT_ALLOWED" | "UNAVAILABLE";

export function payByCardMessage(refusal: PayByCardRefusal, locale: Locale = "vi"): string {
  const t = picker(locale);
  return refusal === "NOT_ALLOWED"
    ? t({ vi: "Đơn này không còn chờ trả thẻ.", en: "This order is no longer awaiting card payment." })
    : t({
        vi: "Chưa mở được trang thanh toán. Thử lại sau ít phút.",
        en: "Couldn't open the payment page. Try again in a few minutes.",
      });
}

// ─────────────────────────────────────────────────────── the late payment
/**
 * The note the system leaves when Stripe took a card payment for an order
 * already cancelled (`card_mark_paid()`): the order is not revived, and the
 * shop refunds the payment by hand on Stripe (no refund is automatic,
 * QĐ-46). The log and the order's notes print it in the page's language; the
 * database keeps the Vietnamese as the note's text.
 */
export function lateCardPaymentText(paymentIntent: string, locale: Locale = "vi"): string {
  return picker(locale)({
    vi: `Stripe nhận tiền sau khi đơn đã huỷ · ${paymentIntent} · hoàn tiền tay trên Stripe`,
    en: `Stripe took the payment after the order was cancelled · ${paymentIntent} · refund it by hand on Stripe`,
  });
}
