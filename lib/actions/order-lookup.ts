"use server";

import { lookupOrder } from "@/lib/db/order-lookup";
import { LOOKUP_WORDS, lookupResultOf, readLookup, type LookupResult } from "@/lib/order-lookup";

/**
 * "Tra cứu" on the Feed's lookup screen (slice B11): the order behind a code
 * and the phone number it was placed with, for somebody without an account —
 * or which of the two is wrong, in the mock's words, under that field.
 *
 * A PUBLIC ENDPOINT, like every action: "Server Functions are reachable via
 * direct POST requests, not just through your application's UI"
 * (`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`).
 * No session is asked for — the lookup is for anybody, and the phone number
 * on the order is what stands in for one — so the order of things is:
 *
 *   1. read what the browser sent as untrusted (`readLookup`): a field left
 *      empty or not a code or a number is INVALID, with the mock's sentence
 *      under it, and spends NOTHING — no lookup happened;
 *   2. look it up (`lookupOrder`), which spends one token of the visitor's
 *      `lookup` limit first — RATE_LIMITED and the app's sentence when it is
 *      used up — and answers the order, NO_ORDER or PHONE_MISMATCH;
 *   3. anything that breaks on the way is UNAVAILABLE with a sentence, its
 *      reason in the server log; nothing expected is thrown, and no database
 *      text reaches the browser (`02-guides/data-security.md`, "Controlling
 *      return values").
 *
 * Nothing is revalidated or refreshed here: the answer IS what the screen
 * shows, so it comes back without the page (`02-guides/server-actions.md`:
 * an action that does none of those things "carries only its return value").
 * And should the page be re-rendered on the way all the same — a renewed
 * session cookie does that — it looks nothing up: no page renders a lookup on
 * the server (`lib/db/order-lookup.ts` says why it must not).
 *
 * FOR THE SCREEN: call it inside a transition from the form's submit; for a
 * link that carries `code` and `phone`, call it ONCE when the screen mounts
 * with the two values the page read from the URL — never from the page's
 * render, and not again when the URL changes. Writing `code` and `phone` into
 * the URL after a result, as the mock does, is `window.history.replaceState`,
 * which does not ask the server for anything.
 */
export async function lookupOrderAction(code: string, phone: string): Promise<LookupResult> {
  const read = readLookup(code, phone);
  if (!read.ok) return { ok: false, reason: "INVALID", errors: read.errors };

  try {
    return lookupResultOf(await lookupOrder(read.input));
  } catch (error) {
    console.error("lookupOrderAction:", error instanceof Error ? error.message : error);
    return { ok: false, reason: "UNAVAILABLE", message: LOOKUP_WORDS.unavailable };
  }
}
