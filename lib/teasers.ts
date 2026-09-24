/**
 * Address segments for what the back office creates (slice B3b).
 *
 * Moved here when the back office stopped simulating in the browser: a
 * teaser is a row of `public.teasers` now (`admin_add_teaser`), and its slug
 * is decided by the Server Action before the database checks its shape
 * (`^[a-z0-9-]+$`) and that it is new. Since v3 slice 12 that slug is
 * `slugFor` in `lib/catalog-admin.ts` — `s06-soi`, the pattern every issue's
 * style has — and `teaserSlug` (`soi-6`), the second pattern, is gone.
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
