/**
 * The phone number a lookup form hands to the lookup's page (slice B19).
 *
 * "Tra cứu đơn" on Tôi and on an order's page (`LookupForm`) checks the pair,
 * then opens `/track?code=…`, where the lookup runs and its answer is shown
 * (`TrackView`). The number used to ride along in that address; it may not
 * any more — an address is kept in the history, in logs, in a copied link, and
 * sent on as the referrer. So the form leaves it HERE, in the memory of this
 * tab, and the lookup's page takes it once, when it mounts after the client
 * navigation, and forgets it. Not in `sessionStorage` or a cookie: nothing new
 * is kept on the device (`DESIGN.md` §1, "Kho trên thiết bị").
 *
 * A reload in between loses it, and the lookup's page then asks for the
 * number again, with the code typed in — the same as a link opened in another
 * browser. Without script none of this runs: the form posts the pair to
 * `/track` through the lookup's Server Action instead (`lookupFormAction`).
 *
 * Only event handlers and effects call these, which never run on the server,
 * so the server's copy of this module never holds a number.
 */

let handed: { href: string; phone: string } | null = null;

/** Leave the number for the lookup page at `href` (`trackHref(code)`); a newer one replaces it. */
export function handOver(href: string, phone: string): void {
  handed = { href, phone };
}

/** The number left for `href`, once — "" when there is none, or it was left for another page. Either way it is gone. */
export function takeOver(href: string): string {
  const mine = handed;
  handed = null;
  return mine !== null && mine.href === href ? mine.phone : "";
}
