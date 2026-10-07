"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Order } from "@/data/types";
import { requestOrigin } from "@/lib/auth-redirect";
import { payByCardMessage, receiptPath, type PayByCardState } from "@/lib/card-checkout";
import { demoNow } from "@/lib/clock";
import { effectiveOrder } from "@/lib/customer-orders";
import { toVnIso } from "@/lib/datetime";
import type { OpenOutcome } from "@/lib/db/card-payments";
import {
  OrderError,
  cancelOrder,
  findMyOrder,
  loadPlacedOrder,
  loadReceipt,
  placeOrder,
  rememberGuestReceipt,
  type PlacedReceipt,
} from "@/lib/db/orders";
import { takeRate } from "@/lib/db/rate-limit";
import { getSession, requireSession } from "@/lib/db/session";
import type { Locale } from "@/lib/i18n";
import { getActionLocale } from "@/lib/locale";
import { isOrderCode } from "@/lib/lookup";
import {
  cancelFailureMessage,
  placeFailureMessage,
  readPlaceOrderPayload,
  type CancelOrderResult,
  type OrderFailure,
  type PlaceOrderResult,
} from "@/lib/order-payload";

/**
 * Placing an order, and calling one off.
 *
 * Both are PUBLIC ENDPOINTS — "Server Functions are reachable via direct POST
 * requests, not just through your application's UI. Always verify
 * authentication and authorization inside every Server Function"
 * (`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`).
 * So neither trusts what the browser sends: the order is re-read and
 * re-validated (`lib/order-payload.ts`), priced by the database rather than
 * by the page, and a cancellation asks who is signed in for itself.
 *
 * Expected failures are VALUES — a piece that sold a second ago is not an
 * error page, it is a sentence under the button. Only broken plumbing throws.
 * The values carry no database text and no key: what crosses back to the
 * browser is the order number, or a sentence and the reason it was chosen
 * (`02-guides/data-security.md`, "Controlling return values").
 *
 * The clock is the app's — the real one since slice B3a: `toVnIso(demoNow())`
 * is what the database stamps the order with and judges the issue, the code
 * and the hold against, and the only `p_now` it accepts from a shopper.
 */

/**
 * "Đặt hàng".
 *
 * Called from `CheckoutView` as a function inside `startTransition`, with
 * the basket, the form and the code the screen applied. A guest's receipt key
 * goes into an httpOnly cookie here — the only place a cookie can be set —
 * so `/order-confirmed/<code>` opens again in this browser and nowhere else.
 *
 * `revalidatePath("/", "layout")` on success: the order just took pieces off
 * the shelf, and the catalogue the browser holds (the root layout's
 * `CatalogProvider`, which the cart and the saved list read) must learn it —
 * as must any page the router kept (`02-guides/server-actions.md`, "A single
 * response carries data and UI"). The response re-renders checkout against
 * the new stock; `CheckoutView` keeps drawing what was pressed until the
 * receipt takes over, so that re-render cannot flash "vừa hết" over an order
 * that went through.
 *
 * Slice B4b: a request that reads as an order then spends two tokens of the
 * visitor's rate limits (`lib/db/rate-limit.ts`) before the database sees it
 * — one order of five per ten minutes, and its pieces of sixty a day — so one
 * visitor cannot buy an issue's shelf empty, twenty pieces at a time. A token
 * spent is not given back when the order then fails; a refusal spends none.
 * It answers `RATE_LIMITED`, and the catalogue did not move.
 *
 * Round v6 slice E2: every sentence is in the request's language
 * (`getActionLocale`, the `hive-lang` cookie; Vietnamese without a request).
 *
 * Slice B18 (QĐ-46): a CARD order, once placed exactly as before, goes on to
 * Stripe's page — the action makes the Checkout Session
 * (`lib/db/card-payments.ts#openCardCheckout`) and REDIRECTS to its URL, an
 * absolute address outside the site, so it does not go through `safeNext`.
 * "`redirect` also accepts absolute URLs and can be used to redirect to
 * external links", and in a Server Action called from the client it becomes
 * a full-page navigation (`03-api-reference/04-functions/redirect.md`;
 * `server-action-reducer.js`: an external redirect "Triggers an MPA
 * navigation"). `redirect` throws, so it is called after the `try`, never in
 * it. The guest's receipt cookie is set on this same response, before the
 * browser leaves, so the receipt opens again when Stripe sends it back. When
 * no page can be opened the order is still placed and kept: the answer says
 * `payment: "FAILED"`, and the receipt prints the line and the button to try
 * again. No token is spent for the Stripe page: placing the order spent them.
 */
export async function placeOrderAction(payload: unknown): Promise<PlaceOrderResult> {
  const locale = await getActionLocale();
  const read = readPlaceOrderPayload(payload, locale);
  if (!read.ok) return { ok: false, failure: "INVALID", message: read.message };

  const pace = await takeRate("order_place", 1, locale);
  if (!pace.ok) return { ok: false, failure: "RATE_LIMITED", message: pace.message };
  const pieces = read.input.lines.reduce((n, line) => n + line.qty, 0);
  const volume = await takeRate("order_units", pieces, locale);
  if (!volume.ok) return { ok: false, failure: "RATE_LIMITED", message: volume.message };

  const session = await getSession();
  let receipt: PlacedReceipt;
  try {
    receipt = await placeOrder(read.input, toVnIso(demoNow()));
    if (!session) await rememberGuestReceipt(receipt);
    revalidatePath("/", "layout");
  } catch (error) {
    const failure: OrderFailure = error instanceof OrderError ? error.failure : "UNAVAILABLE";
    if (failure === "UNAVAILABLE") {
      // The reason stays in the server log; the shopper gets the sentence.
      console.error("placeOrderAction:", error instanceof Error ? error.message : error);
    }
    return { ok: false, failure, message: placeFailureMessage(failure, locale) };
  }

  if (read.input.payment !== "CARD") return { ok: true, code: receipt.code };

  const page = await cardPageFor(receipt, locale);
  if (!page) return { ok: true, code: receipt.code, payment: "FAILED" };
  redirect(page);
}

/**
 * The Stripe half of this module (`lib/db/card-payments.ts`), loaded when a
 * card order needs it and not before: every other order, and every other
 * action of this file, never loads the Stripe SDK or the service-role client.
 */
const cardPayments = () => import("@/lib/db/card-payments");

/**
 * The Stripe page for a card order just placed, or null when none could be
 * opened (logged). The order is read back by its receipt (`loadPlacedOrder`),
 * so the page is priced from the database's own lines and fees; the origin
 * is the one the shopper is on, read as `googleSignIn` reads it
 * (`requestOrigin`, slice B16).
 */
async function cardPageFor(receipt: PlacedReceipt, locale: Locale): Promise<string | null> {
  try {
    const request = await headers();
    const origin = requestOrigin((name) => request.get(name));
    if (!origin) return null;
    const order = await loadPlacedOrder(receipt);
    if (!order) return null;
    const { openCardCheckout } = await cardPayments();
    const opened = await openCardCheckout(order, origin, locale);
    return opened.kind === "OPENED" ? opened.url : null;
  } catch (error) {
    console.error("placeOrderAction (card page):", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * "Trả bằng thẻ" (slice B18): pay again for a card order still waiting for
 * its money, from its receipt or its page in the account. A form with one
 * field, the order's code, sent with `useActionState`; works without
 * JavaScript too (a form post answered with a redirect).
 *
 * A PUBLIC ENDPOINT, so nothing the form sends is believed but the code, and
 * the code only names the order to look up the way its pages do
 * (`loadReceipt`: the signed-in account's own order, or the order this
 * browser placed signed out, by its httpOnly receipt cookie). Anybody else's
 * order, or none, answers the same sentence as an order that cannot be paid
 * now (QĐ-16). The order is read as the clock reads it (`effectiveOrder`): past
 * its hold it is cancelled, and nothing opens.
 *
 * Then a new Stripe page (`openCardCheckout`: the previous session, still
 * open, is expired first; found paid, the order is marked paid and the
 * shopper goes to its receipt) and a redirect to it, outside every `try`.
 *
 * RATE LIMIT: one token of `order_place` — the bucket of placing an order —
 * per press, after the cheap checks and before Stripe or the database is
 * asked. Each press makes a Stripe session, the second half of placing a card
 * order, and five a visitor per ten minutes covers a shopper who backs out of
 * Stripe's page a few times; a new bucket would have needed a migration of
 * `rate_hits` and `take_rate()` for no different number. The refusal is the
 * limit's sentence, in the request's language (`getActionLocale`, as round v6
 * slice E2's actions do).
 */
export async function payByCard(_prev: PayByCardState, form: FormData): Promise<PayByCardState> {
  const locale = await getActionLocale();
  const raw = form.get("code");
  const code = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!isOrderCode(code)) return { message: payByCardMessage("NOT_ALLOWED", locale) };

  const request = await headers();
  const origin = requestOrigin((name) => request.get(name));
  if (!origin) return { message: payByCardMessage("UNAVAILABLE", locale) };

  const pace = await takeRate("order_place", 1, locale);
  if (!pace.ok) return { message: pace.message };

  let opened: OpenOutcome;
  try {
    const found = await loadReceipt(code);
    if (!found) return { message: payByCardMessage("NOT_ALLOWED", locale) };
    const { openCardCheckout } = await cardPayments();
    opened = await openCardCheckout(effectiveOrder(found, demoNow()), origin, locale);
  } catch (error) {
    console.error("payByCard:", error instanceof Error ? error.message : error);
    return { message: payByCardMessage("UNAVAILABLE", locale) };
  }

  if (opened.kind === "NOT_ALLOWED") return { message: payByCardMessage("NOT_ALLOWED", locale) };
  if (opened.kind === "UNAVAILABLE") return { message: payByCardMessage("UNAVAILABLE", locale) };
  if (opened.kind === "PAID") {
    // Paid in another tab a moment ago: the receipt says so now.
    revalidatePath("/", "layout");
    redirect(receiptPath(code));
  }
  redirect(opened.url);
}

/**
 * "Huỷ đơn", from the order's own page.
 *
 * `requireSession` first: a guest cannot cancel (the lookup page has no
 * button for it), and a request without a session is sent to sign in rather
 * than answered. Ownership is then the database's call — `cancel_order()`
 * refuses somebody else's order with the same code as an order that does not
 * exist.
 *
 * `revalidatePath("/", "layout")` and not just the list: the rail's count,
 * the overview's rows and the notifications all read the same orders, the
 * order's own page is the one being looked at — and the pieces went back on
 * the shelf, which the product pages and the browser's catalogue show.
 *
 * Slice B4b: one token of the visitor's `account` limit, right after the
 * session check (thirty account writes per ten minutes). Its sentences in the
 * request's language since round v6 slice E2, as `placeOrderAction`'s.
 *
 * Slice B18: a card order cancelled here has its Stripe page closed, once the
 * database has cancelled it (`closeCardPageAfterCancel`); the answer is the
 * same whatever that comes to.
 */
export async function cancelOrderAction(code: unknown): Promise<CancelOrderResult> {
  await requireSession("/account/orders");
  const locale = await getActionLocale();

  const pace = await takeRate("account", 1, locale);
  if (!pace.ok) return { ok: false, message: pace.message };

  if (typeof code !== "string" || !isOrderCode(code)) {
    return { ok: false, message: cancelFailureMessage("NOT_OWNER", locale) };
  }

  try {
    await cancelOrder(code, toVnIso(demoNow()));
  } catch (error) {
    const failure: OrderFailure = error instanceof OrderError ? error.failure : "UNAVAILABLE";
    if (failure === "UNAVAILABLE") {
      console.error("cancelOrderAction:", error instanceof Error ? error.message : error);
    }
    return { ok: false, message: cancelFailureMessage(failure, locale) };
  }

  revalidatePath("/", "layout");
  await closeCardPageAfterCancel(() => findMyOrder(code));
  return { ok: true };
}

/**
 * After an order was cancelled (slice B18): read it as it now is, and when it
 * is a card order, close its Stripe page (`closeCardCheckout`) — the Stripe half
 * is loaded for a card order only. Best effort: anything that fails is logged
 * and the cancellation stands. `read` is the canceller's own way to see the
 * order (the shopper's account here; the back office has its own).
 */
async function closeCardPageAfterCancel(read: () => Promise<Order | null>): Promise<void> {
  try {
    const order = await read();
    if (order?.payment !== "CARD") return;
    const { closeCardCheckout } = await cardPayments();
    await closeCardCheckout(order);
  } catch (error) {
    console.error("cancel (card page):", error instanceof Error ? error.message : error);
  }
}
