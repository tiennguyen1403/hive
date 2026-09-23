"use server";

import { revalidatePath } from "next/cache";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { OrderError, cancelOrder, placeOrder, rememberGuestReceipt } from "@/lib/db/orders";
import { getSession, requireSession } from "@/lib/db/session";
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
 * The clock is the app's (QĐ-24): `toVnIso(demoNow())` is what the database
 * stamps the order with and judges the issue, the code and the hold against.
 */

/**
 * "Đặt hàng".
 *
 * Called from `CheckoutScreen` as a function inside `startTransition`, with
 * the basket, the form and the code the screen applied. A guest's receipt key
 * goes into an httpOnly cookie here — the only place a cookie can be set —
 * so `/order-confirmed/<code>` opens again in this browser and nowhere else.
 *
 * `revalidatePath("/", "layout")` on success: the order just took pieces off
 * the shelf, and the catalogue the browser holds (the root layout's
 * `CatalogProvider`, which the cart and the saved list read) must learn it —
 * as must any page the router kept (`02-guides/server-actions.md`, "A single
 * response carries data and UI"). The response re-renders checkout against
 * the new stock; `CheckoutScreen` keeps drawing what was pressed until the
 * receipt takes over, so that re-render cannot flash "vừa hết" over an order
 * that went through.
 */
export async function placeOrderAction(payload: unknown): Promise<PlaceOrderResult> {
  const read = readPlaceOrderPayload(payload);
  if (!read.ok) return { ok: false, failure: "INVALID", message: read.message };

  const session = await getSession();
  try {
    const receipt = await placeOrder(read.input, toVnIso(demoNow()));
    if (!session) await rememberGuestReceipt(receipt);
    revalidatePath("/", "layout");
    return { ok: true, code: receipt.code };
  } catch (error) {
    const failure: OrderFailure = error instanceof OrderError ? error.failure : "UNAVAILABLE";
    if (failure === "UNAVAILABLE") {
      // The reason stays in the server log; the shopper gets the sentence.
      console.error("placeOrderAction:", error instanceof Error ? error.message : error);
    }
    return { ok: false, failure, message: placeFailureMessage(failure) };
  }
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
 */
export async function cancelOrderAction(code: unknown): Promise<CancelOrderResult> {
  await requireSession("/account/orders");

  if (typeof code !== "string" || !isOrderCode(code)) {
    return { ok: false, message: cancelFailureMessage("NOT_OWNER") };
  }

  try {
    await cancelOrder(code, toVnIso(demoNow()));
  } catch (error) {
    const failure: OrderFailure = error instanceof OrderError ? error.failure : "UNAVAILABLE";
    if (failure === "UNAVAILABLE") {
      console.error("cancelOrderAction:", error instanceof Error ? error.message : error);
    }
    return { ok: false, message: cancelFailureMessage(failure) };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
