import "server-only";

import { awaitsCardPayment } from "@/lib/card-checkout";
import { demoNow } from "@/lib/clock";
import { effectiveOrder } from "@/lib/customer-orders";
import { isOrderCode, normaliseOrderCode } from "@/lib/lookup";
import { lookedUpOf, type KnownOrder } from "@/lib/order-lookup";
import { formatPhone } from "@/lib/phone";
import { loadReceipt } from "./orders";

/**
 * The order behind `/track?code=…` when THIS BROWSER MAY ALREADY SEE IT —
 * slice B19, the lookup without the phone number in its address.
 *
 * "May already see it" is `loadReceipt`'s rule, the receipt page's own: the
 * signed-in account's order, or one this browser placed signed out, by the
 * key it keeps in the httpOnly receipt cookie. Then the lookup screen shows
 * the order at once, from the code alone — the "Tra cứu đơn" button on a
 * guest's receipt leads here with nothing else — and asks for no number. Any
 * other browser gets null, the same null for an order that does not exist
 * (QĐ-16), and the screen asks for the number.
 *
 * This is a READ, unlike a lookup: it spends no token of the `lookup` limit,
 * which is why the page may call it while it renders — the receipt page does
 * the same read. What it hands the screen is what a lookup would print
 * (`lookedUpOf`: no address, no recipient), and the number on the order for
 * COD's line, as `formatPhone` prints numbers; the screen leaves both to the
 * browser that could open the receipt anyway.
 *
 * Like every page that draws one order (slice B18, `supabase/README.md`), a
 * card order still waiting is checked against Stripe first, so a shopper who
 * paid and closed Stripe's tab finds it paid; the Stripe side is loaded only
 * for such an order, as `lookupOrderAction` loads it.
 *
 * It never throws: a page that cannot read the receipt still draws the form.
 * A failure goes to the server log, without the code.
 */
export async function knownOrder(code: string): Promise<KnownOrder | null> {
  const wanted = normaliseOrderCode(code);
  if (!isOrderCode(wanted)) return null;
  try {
    const found = await loadReceipt(wanted);
    if (!found) return null;
    let order = effectiveOrder(found, demoNow());
    if (awaitsCardPayment(order)) {
      const { reconcileCardOrder } = await import("./card-payments");
      order = await reconcileCardOrder(order);
    }
    return { order: lookedUpOf(order), phone: formatPhone(order.shipTo.phone) };
  } catch (error) {
    console.error("knownOrder:", error instanceof Error ? error.message : error);
    return null;
  }
}
