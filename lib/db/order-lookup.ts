import "server-only";

import { demoNow } from "@/lib/clock";
import { effectiveOrder } from "@/lib/customer-orders";
import type { LookupAnswer, LookupInput } from "@/lib/order-lookup";
import { toLookupAnswer } from "./order-dto";
import { takeRate } from "./rate-limit";
import { getSupabase } from "./server";

/**
 * The Feed's order lookup, from the server's side (slice B11): a code and the
 * phone number the order was placed with, answered with the order — as far as
 * the lookup screen shows it (`LookedUpOrder`) — or with WHICH of the two did
 * not match, NO_ORDER or PHONE_MISMATCH. The rules and the words are
 * `lib/order-lookup.ts`; the door is `lookup_order()`
 * (`supabase/migrations/20260930150000_order_lookup.sql`). The v3 lookup,
 * `trackOrder` in `lib/db/orders.ts`, is untouched and still answers the same
 * null for both.
 *
 * ONE CALL IS ONE LOOKUP, and each spends a token of the visitor's `lookup`
 * limit (`RATE_RULES.lookup`: ten per ten minutes) before the database is
 * asked; a refused one asks nothing and answers RATE_LIMITED with the app's
 * sentence. The token is spent here, not in the action, so nothing can look
 * an order up through this module without paying for it. `takeRate` fails
 * open, as every limit of the demo does (`lib/db/rate-limit.ts`).
 *
 * CALL IT FROM A SERVER ACTION ONLY (`lookupOrderAction`), never while a page
 * renders. Spending a token is a write, and "Mutations (e.g. logging out
 * users, updating databases, invalidating caches) should never be a
 * side-effect, either in Server or Client Components"
 * (`node_modules/next/dist/docs/01-app/02-guides/data-security.md`, "Avoiding
 * side-effects during rendering"): a render runs again on a refresh or a
 * revalidation, and "Next.js might run them when the route is prefetched, not
 * when the user visits the page" (`02-guides/prefetching.md`) — each would
 * spend another token for the same lookup. A link that carries the code and
 * the phone is looked up by the screen calling the action once, when it
 * mounts — "move side-effects to a `useEffect` hook or a Server Action
 * triggered from a Client Component" (same page) — which no re-render and no
 * prefetch repeats.
 *
 * `lookup_order()` is asked with the visitor's own client (`getSupabase()`,
 * the publishable key): it is granted to `anon` and `authenticated`, as
 * `track_order()` is, and decides itself what leaves the database. The status
 * that comes back is the one the clock says (`effectiveOrder`): a transfer
 * past its hold reads as cancelled, as on every other screen.
 *
 * A miss is an answer. A database or network failure throws, and the action
 * turns it into a sentence, with the reason in the server log.
 */
export async function lookupOrder(input: LookupInput): Promise<LookupAnswer> {
  const pace = await takeRate("lookup");
  if (!pace.ok) {
    return {
      ok: false,
      reason: "RATE_LIMITED",
      message: pace.message,
      retryAfterSeconds: pace.retryAfterSeconds,
    };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("lookup_order", {
    p_code: input.code,
    p_phone: input.phone,
  });
  if (error) throw new Error(`lookup_order failed: ${error.message}`);

  const answer = toLookupAnswer(data);
  return answer.ok ? { ok: true, order: effectiveOrder(answer.order, demoNow()) } : answer;
}
