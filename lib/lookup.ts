/**
 * Looking an order up WITHOUT signing in — a code plus the phone number it
 * was placed with.
 *
 * Two things make the lookup safe enough to offer. Order codes are short and
 * sequential (`DH-2425`, `DH-2431`), so a code alone would hand a stranger
 * somebody's name, address and phone number — that is QĐ-16 again, with the
 * phone number standing in for the session. And the answer is the same
 * whichever of the two is wrong, so the screen never confirms that a code
 * exists.
 *
 * The matching itself happens in Postgres since slice B2: every order is a
 * row there, whoever placed it. It was `track_order()`, reached through
 * `lib/db/orders.ts#trackOrder`, until slice B13 removed both — granted to
 * `anon`, the function handed the whole order to anybody calling the API
 * directly — and is `lookup_order()` now (`lib/db/order-lookup.ts`). What
 * stays here is pure — reading a code and a number the way people type them.
 */

// ─────────────────────────────────────────────────────────── normalisation
/**
 * `dh2425`, `2425`, ` DH-2425 ` → `DH-2425`.
 *
 * A code is read off an email or off the confirmation screen and typed by
 * hand, usually on a phone keyboard that capitalises nothing. Refusing a
 * lower-case code, or one typed without its prefix, would be the form being
 * fussy about punctuation at the only step that matters here.
 */
export function normaliseOrderCode(raw: string): string {
  const bare = raw.trim().toUpperCase().replace(/[\s.]/g, "");
  if (!bare) return "";
  if (/^\d+$/.test(bare)) return `DH-${bare}`;
  if (/^DH-?\d+$/.test(bare)) return `DH-${bare.replace(/^DH-?/, "")}`;
  return bare;
}

/**
 * The ten digits of a Vietnamese mobile, however it was written.
 *
 * Same reading as `normalisePhone` in `checkout-form.ts` and `formatPhone`
 * in `phone.ts` — spaces, dots, dashes and a `+84` prefix are punctuation.
 * Written again here rather than imported: `checkout-form.ts` pulls in
 * `data/regions.ts` and the 218KB of communes behind it, and this module is
 * read by a screen that needs none of it.
 */
export function phoneDigits(raw: string): string {
  const stripped = raw.replace(/[\s.\-()]/g, "");
  const local = stripped.replace(/^\+84/, "0").replace(/^84(?=\d{9}$)/, "0");
  return /^0\d{9}$/.test(local) ? local : "";
}

/**
 * A code as the database issues it — `DH-` and four or more digits — which is
 * the only shape worth sending to it. Anything else cannot match a row, so
 * the question is not asked at all.
 */
export function isOrderCode(code: string): boolean {
  return /^DH-\d{4,}$/.test(code);
}

/** The lookup's page. A form sent without script lands here (slice B19). */
export const TRACK_PATH = "/track";

/**
 * `/track?code=DH-2425` — shareable, and the QR's target.
 *
 * Never the phone number (slice B19): an address is kept in the history, in
 * the server's and the host's logs, in a copied link, and sent on as the
 * referrer. A browser that may already see the order — the account's own, or
 * one it placed signed out (`loadReceipt`) — gets it at once from the code
 * alone; any other browser is asked for the number, which the lookup's forms
 * send in the body of a POST.
 */
export function trackHref(code: string): string {
  return `${TRACK_PATH}?${new URLSearchParams({ code: normaliseOrderCode(code) }).toString()}`;
}
