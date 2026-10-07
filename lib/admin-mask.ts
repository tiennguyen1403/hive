import type { Address } from "@/data/types";
import { isSampleAccount, type AdminCustomer, type AdminCustomerDetail } from "./admin-customers";
import { isSampleOrder, type AdminOrder, type OrderOwner, type ShipTo } from "./admin-orders";
import type { AdminEvent } from "./db/event-dto";
import { isDemoEmail } from "./demo-accounts";
import { PHONE_GAP } from "./phone";

/**
 * The public back office masks what belongs to real people (QĐ-44, slice B17).
 *
 * WHY. Anybody can press "Vào quản trị thử" (QĐ-25, answer 2) and read the
 * customer list and the order book. The sample shows as it always has; a guest
 * who ordered and an account somebody signed up for — and, with slice B16, a
 * Google account's name and Gmail — show shortened: "Peter S. ·
 * pe•••@gmail.com · 09•• ••• 678", the house number and street as "•••".
 * Province, ward, items, money and states print in full.
 *
 * WHERE. In the back office's reads (`lib/db/admin.ts`), before anything
 * reaches a component, so the real value never leaves the server: not in the
 * HTML, not in the RSC payload, not in a CSV (each file is built in the
 * browser from what the page was given), and the screens' searches, which run
 * over the same values, can only match what is printed. Next's own advice for
 * a Data Access Layer: "Return safe, minimal Data Transfer Objects", with the
 * privacy rule applied to each field before it is returned
 * (`node_modules/next/dist/docs/01-app/02-guides/data-security.md`, "Data
 * Access Layer"). The shop's own reads are not touched: an account still
 * reads all of its own data.
 *
 * WHAT IS REAL. An account without a handle (`isSampleAccount`), an order
 * whose `customerId` is empty (`isSampleOrder`). A sample value passes through
 * as the SAME object, so the sample's screens cannot move by a pixel.
 *
 * WHAT IS NOT MASKED (brief B17 §2): what the shop typed itself — an internal
 * note, the reason an address or a stock count was changed, a tracking number
 * — and fixed labels such as a cancel reason, a carrier, an address label.
 *
 * Pure: data in, data out, tested beside it (`admin-mask.test.ts`).
 */

/** What stands for each hidden character: U+2022, the same in both languages. */
export const MASK = "•";

/** A run of three, for a value that is hidden whole: a street line, a typed note, a name's tail. */
const HIDDEN = MASK.repeat(3);

// One user-perceived character at a time: a Vietnamese letter typed as a base
// and its marks (NFD) stays whole. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter
const GRAPHEMES = new Intl.Segmenter("vi", { granularity: "grapheme" });

/** The first letter or digit of a word, whole; its first character when it has neither. */
function initialOf(word: string): string {
  let first = "";
  for (const { segment } of GRAPHEMES.segment(word)) {
    if (first === "") first = segment;
    if (/[\p{L}\p{N}]/u.test(segment)) return segment;
  }
  return first;
}

/**
 * A word that carries contact data rather than a name — an "@", or three
 * digits in a row — is never printed whole, even in first place: a name typed
 * as "0912345678 Peter" must not put the number back on the screen.
 */
function looksLikeContact(word: string): boolean {
  return word.includes("@") || /\d{3}/.test(word);
}

/**
 * "Peter Smith" → "Peter S.", "Nguyễn Văn Tiến" → "Nguyễn T.": the first word,
 * then the initial of the last and a full stop. One word → its initial and
 * "•••" ("Peter" → "P•••"); so is a first word that looks like an email or a
 * number. Blank stays blank. The avatar's initials are read off the result,
 * so they come from the masked name too.
 */
export function maskName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0]!;
  if (words.length === 1 || looksLikeContact(first)) {
    const tail = words.length === 1 ? "" : ` ${initialOf(words.at(-1)!)}.`;
    return `${initialOf(first)}${HIDDEN}${tail}`;
  }
  return `${first} ${initialOf(words.at(-1)!)}.`;
}

/**
 * "peter@gmail.com" → "pe•••@gmail.com": two characters of the part before
 * the "@", then "•••", then the domain. A part of one or two characters keeps
 * one ("pe@x.vn" → "p•••@x.vn"). Without an "@", the part is all there is.
 * Blank stays blank — a guest who typed none has none.
 */
export function maskEmail(email: string): string {
  const value = email.trim();
  if (value === "") return "";
  const at = value.lastIndexOf("@");
  const local = Array.from(at === -1 ? value : value.slice(0, at));
  const domain = at === -1 ? "" : value.slice(at);
  return `${local.slice(0, local.length > 2 ? 2 : 1).join("")}${HIDDEN}${domain}`;
}

/**
 * "0912345678" → "09•• ••• 678": the first two digits and the last three,
 * every other one hidden, grouped as `formatPhone` groups a number — four,
 * then threes, a lone last digit joined to the run before it — with the same
 * no-break space (`PHONE_GAP`), so a masked number sits on one line like a
 * sample one. `formatPhone` hands a string with "•" in it back untouched.
 * Blank stays blank: an account made through the sign-up form has no number.
 * A value too short to keep five characters of is hidden whole.
 */
export function maskPhone(phone: string): string {
  const chars = Array.from(phone.replace(/[\s.\-()]/g, ""));
  if (chars.length === 0) return "";
  const keep = chars.length > 5;
  const shown = chars.map((c, i) => (keep && (i < 2 || i >= chars.length - 3) ? c : MASK));

  const groups: string[] = [shown.slice(0, 4).join("")];
  for (let i = 4; i < shown.length; i += 3) groups.push(shown.slice(i, i + 3).join(""));
  if (groups.length > 1 && groups[groups.length - 1]!.length === 1) {
    const last = groups.pop()!;
    groups[groups.length - 1] += last;
  }
  return groups.join(PHONE_GAP);
}

/**
 * Words a real person typed that the back office prints — the house number
 * and street of an address, the note left at checkout — hidden whole: "•••".
 * Blank stays blank, so "no note" still reads as no note.
 */
export function maskText(text: string): string {
  return text.trim() === "" ? "" : HIDDEN;
}

function maskShipTo(s: ShipTo): ShipTo {
  return { ...s, recipient: maskName(s.recipient), phone: maskPhone(s.phone), line: maskText(s.line) };
}

function maskAddress(a: Address): Address {
  return { ...a, recipient: maskName(a.recipient), phone: maskPhone(a.phone), line: maskText(a.line) };
}

function maskOwner(o: OrderOwner): OrderOwner {
  return { ...o, name: maskName(o.name), email: maskEmail(o.email), phone: maskPhone(o.phone) };
}

// ─────────────────────────────────────────────────────────────── the DTOs
/**
 * One order of the book. A real one has its name, number and street, its
 * e-mail, the note typed at checkout and its account's name, e-mail and
 * number masked; the ward, the province, the lines, the money, the state and
 * the account's id (the link to its profile) stay.
 */
export function maskAdminOrder(o: AdminOrder): AdminOrder {
  if (isSampleOrder(o)) return o;
  return {
    ...o,
    shipTo: maskShipTo(o.shipTo),
    email: o.email === null ? null : maskEmail(o.email),
    note: maskText(o.note),
    owner: o.owner === null ? null : maskOwner(o.owner),
  };
}

/** One row of the customer list: a real account's name, e-mail and number masked. */
export function maskAdminCustomer<T extends AdminCustomer>(c: T): T {
  if (isSampleAccount(c)) return c;
  return { ...c, name: maskName(c.name), email: maskEmail(c.email), phone: maskPhone(c.phone) };
}

/** One customer's page: the same, and every address in the book it loads. */
export function maskAdminCustomerDetail(c: AdminCustomerDetail): AdminCustomerDetail {
  if (isSampleAccount(c)) return c;
  return { ...maskAdminCustomer(c), addresses: c.addresses.map(maskAddress) };
}

/** The codes of the book's sample orders — what `maskAdminEvents` leaves whole. */
export function sampleOrderCodes(orders: readonly AdminOrder[]): Set<string> {
  return new Set(orders.filter(isSampleOrder).map((o) => String(o.code)));
}

/**
 * The log, as the back office reads it. Two things in it can hold a real
 * person's data:
 *
 *   · `actor`, the e-mail of whoever acted — for a guest's `ORDER_PLACED`, the
 *     e-mail typed at checkout. Printed nowhere, but in the page's data. Left
 *     whole only when it is empty (the system) or one of the nine shared demo
 *     accounts (`isDemoEmail`), whose addresses the sign-in screen prints;
 *   · `ORDER_ADDRESS_EDITED`, which keeps the whole address before and after:
 *     masked unless its order is one of the book's sample orders — an order
 *     the book does not have reads as real.
 *
 * The reason an address changed is the shop's own words and stays.
 */
export function maskAdminEvents(events: readonly AdminEvent[], sampleOrders: ReadonlySet<string>): AdminEvent[] {
  return events.map((e) => {
    const actor = e.actor === "" || isDemoEmail(e.actor) ? e.actor : maskEmail(e.actor);
    if (e.kind === "ORDER_ADDRESS_EDITED" && !sampleOrders.has(e.code)) {
      return { ...e, actor, before: maskShipTo(e.before), after: maskShipTo(e.after) };
    }
    return actor === e.actor ? e : { ...e, actor };
  });
}
