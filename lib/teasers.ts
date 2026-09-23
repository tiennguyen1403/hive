/**
 * Address segments for what the back office creates (slice B3b).
 *
 * Moved here when the back office stopped simulating in the browser: a
 * teaser is a row of `public.teasers` now (`admin_add_teaser`), and its slug
 * is still decided here — by the Server Action, before the database checks
 * its shape (`^[a-z0-9-]+$`) and that it is new.
 */

/**
 * A name as English letters, digits and dashes: "ĐÁ CUỘI" → "da-cuoi".
 *
 * Diacritics are stripped the way the catalogue's own slugs are written
 * (`khoi`, `suong`, `nguoi`) — a slug is an address, and an address is
 * English letters. "Đ" has no combining mark to strip, so it is mapped by
 * hand. Empty when nothing survives.
 */
export function asciiSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * A URL segment for a style announced for an issue.
 *
 * Derived from the name and the issue rather than random, so the same teaser
 * added twice is the same slug — which the database then refuses as taken —
 * instead of two rows of one style.
 */
export function teaserSlug(name: string, no: number): string {
  return `${asciiSlug(name) || "mau"}-${no}`;
}
