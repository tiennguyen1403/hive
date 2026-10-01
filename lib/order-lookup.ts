import type { Order } from "@/data/types";
import type { LookupField } from "./feed-account";
import { pick, pickAll, type Locale, type Pair } from "./i18n";
import { normaliseOrderCode, phoneDigits } from "./lookup";

/**
 * Looking an order up without an account, the Feed's way (slice B11): the
 * part with no I/O. What the form sent, read the way the app reads a code and
 * a number; the order as the lookup hands it out; and what the action
 * answers, in the mock's words.
 *
 * The v3 lookup (`lib/lookup.ts`, over `track_order()`) answered the same
 * null whichever of the two was wrong; slice B13 dropped that function, which,
 * granted to `anon`, handed the whole order to anybody calling the API
 * directly. This one SAYS which — "Không có đơn nào mang mã này" under the
 * code, "Số điện thoại không khớp với đơn" under the number
 * (`prototype/explore/feed/track.js`, `lookup` in `shared/data.js`; the
 * user's choice of 30/09, for this screen only) — and a limit of ten lookups
 * per ten minutes per visitor (`RATE_RULES.lookup`) is what keeps that from
 * being a way to learn, one code after another, which orders exist.
 *
 * The server half is `lookupOrder` (`lib/db/order-lookup.ts`, over
 * `lookup_order()` in `20260930150000_order_lookup.sql`), the action
 * `lookupOrderAction` (`lib/actions/order-lookup.ts`). This module is pure and
 * safe for the browser, which is what the result types are for.
 */

export type { LookupField };

/**
 * The screen's sentences. The first six are the mock's own words
 * (`track.js`: `validate`; `shared/data.js`: `lookup`), the four about the
 * form the same as `lookupCheck`'s in `lib/feed-account.ts`. The last is the
 * app's, in the words its other reads use when the database cannot be
 * reached ("Chưa … được. Thử lại sau ít phút."): the mock cannot fail.
 *
 * In both languages since round v6 slice E2: `LOOKUP_WORDS` is the Vietnamese
 * side, as before, and `lookupWords(locale)` either side.
 */
export const LOOKUP_TEXT = {
  codeMissing: { vi: "Nhập mã đơn", en: "Enter an order code" },
  codeShape: { vi: "Mã đơn có dạng DH-1499", en: "Order codes look like DH-1499" },
  phoneMissing: { vi: "Nhập số điện thoại", en: "Enter a phone number" },
  phoneShape: { vi: "Số điện thoại gồm 10 số, bắt đầu bằng 0", en: "Phone numbers have 10 digits, starting with 0" },
  noOrder: { vi: "Không có đơn nào mang mã này", en: "No order has this code" },
  phoneMismatch: { vi: "Số điện thoại không khớp với đơn", en: "This phone number doesn't match the order" },
  unavailable: {
    vi: "Chưa tra được đơn. Thử lại sau ít phút.",
    en: "Couldn't look up the order. Try again in a few minutes.",
  },
} as const satisfies Record<string, Pair>;

export type LookupWord = keyof typeof LOOKUP_TEXT;

/** The screen's sentences in one language. */
export function lookupWords(locale: Locale = "vi"): Readonly<Record<LookupWord, string>> {
  return pickAll(LOOKUP_TEXT, locale);
}

export const LOOKUP_WORDS = lookupWords("vi");

/**
 * One of the screen's sentences, in either language, written again in
 * `locale`; anything that is not one of them is left as it is. The lookup
 * screen keeps the sentence under a field as it arrived — from its own check
 * or from the server, in the language of the moment — and reads it through
 * this, so a switch of language rewords it in place.
 */
export function lookupWordIn(sentence: string, locale: Locale): string {
  for (const pair of Object.values(LOOKUP_TEXT) as Pair[]) {
    if (pair.vi === sentence || pair.en === sentence) return pick(pair, locale);
  }
  return sentence;
}

/** Field → the sentence under it, only for the fields that are wrong. */
export type LookupErrors = Partial<Record<LookupField, string>>;

/** A code and a number exactly as `lookup_order()` compares them: `DH-2425`, `0908221447`. */
export interface LookupInput {
  code: string;
  phone: string;
}

/**
 * The shape the mock asks a code to have — `DH` and three to six digits
 * (`track.js`: `/^DH-?\d{3,6}$/`) — checked once the app has read it, so the
 * dash is always there by then.
 */
const CODE_SHAPE = /^DH-\d{3,6}$/;

/**
 * What the form sent, as the lookup will compare it — or what is wrong with
 * it, field by field, in the mock's words.
 *
 * The code and the number are read the way the app has always read them
 * (`normaliseOrderCode`, `phoneDigits`): `dh2425`, `2425` and ` DH-2425 ` are
 * one code, `0908 221 447`, `0908.221.447` and `+84 908 221 447` one number.
 * That is a little more than the mock's own check lets through (`lookupCheck`
 * refuses a bare `2425` and a `+84`), never less, except for a number
 * separated by something the app does not read as punctuation (`0908/221/447`),
 * which is refused here with the mock's sentence. Anything that is not a
 * string reads as nothing typed: the arguments arrive from the browser.
 */
export function readLookup(
  code: unknown,
  phone: unknown,
  locale: Locale = "vi",
): { ok: true; input: LookupInput } | { ok: false; errors: LookupErrors } {
  const codeText = typeof code === "string" ? code : "";
  const phoneText = typeof phone === "string" ? phone : "";
  const errors: LookupErrors = {};
  const words = lookupWords(locale);

  const wanted = normaliseOrderCode(codeText);
  if (!codeText.trim()) errors.code = words.codeMissing;
  else if (!CODE_SHAPE.test(wanted)) errors.code = words.codeShape;

  const digits = phoneDigits(phoneText);
  if (!phoneText.trim()) errors.phone = words.phoneMissing;
  else if (!digits) errors.phone = words.phoneShape;

  if (errors.code || errors.phone) return { ok: false, errors };
  return { ok: true, input: { code: wanted, phone: digits } };
}

// ─────────────────────────────────────────────────────── what comes back
/**
 * The keys of an order the lookup hands out: what the Feed's lookup screen
 * prints for somebody who is not signed in (`track.js`: `result`) —
 *
 *   · the code, and what it was bought from (the lines' styles);
 *   · the four steps and their times: `placedAt`, `status`, `moments`, and
 *     `payment` (COD's second step is "Xác nhận", the others' "Thanh toán");
 *   · what can be done from here: while a transfer is awaited the amount and
 *     the memo (the code without its dash) and the hold (`status.dueAt`); on
 *     the road the tracking code; delivered, the return window
 *     (`status.deliveredAt`); cancelled, why;
 *   · the pieces and the money: `lines`, the fees, the discount and its code.
 *
 * Nothing of where it goes: no recipient, no address, no phone, no e-mail, no
 * note, no owner, no delivery service, and no courier (`status.carrier` is
 * never set here) — "The address and the actions that need the account stay
 * on the order page". COD's line prints the number the shopper just typed,
 * which the screen already has. Totals, units and the return window are
 * derived, never sent (`lib/orders.ts`, `lib/feed-account.ts#returnUntil`).
 */
export const LOOKED_UP_KEYS = [
  "code",
  "placedAt",
  "status",
  "moments",
  "payment",
  "lines",
  "shippingFeeVnd",
  "codFeeVnd",
  "discountVnd",
  "promo",
] as const satisfies readonly (keyof Order)[];

/**
 * An order as the lookup hands it out: `Order`'s own fields, those of
 * `LOOKED_UP_KEYS` and no others. `promo` and `moments` stay optional, absent
 * when there is none, as on `Order`. A screen reads it with the functions it
 * reads an `Order` with, wherever those ask only for these fields.
 */
export type LookedUpOrder = Pick<Order, (typeof LOOKED_UP_KEYS)[number]>;

/** The two ways a code and a number find nothing. */
export type LookupMiss = "NO_ORDER" | "PHONE_MISMATCH";

export interface LookupFound {
  ok: true;
  order: LookedUpOrder;
}

export interface LookupMissed {
  ok: false;
  reason: LookupMiss;
}

export interface LookupRefused {
  ok: false;
  reason: "RATE_LIMITED";
  /** The app's rate-limit sentence (`rateLimitMessage`), shown as it is. */
  message: string;
  retryAfterSeconds: number;
}

/** What `lookupOrder` answers: the order, a miss, or "not now". */
export type LookupAnswer = LookupFound | LookupMissed | LookupRefused;

/**
 * What `lookupOrderAction` hands back to the screen:
 *
 *   · `ok: true` with the order;
 *   · INVALID, NO_ORDER, PHONE_MISMATCH with `errors`: the sentence under
 *     each field that is wrong — both fields may be, for INVALID; NO_ORDER
 *     speaks under the code, PHONE_MISMATCH under the number;
 *   · RATE_LIMITED, UNAVAILABLE with `message`: one sentence for the whole
 *     form — the app's rate-limit sentence, or "Chưa tra được đơn…".
 *
 * Nothing in it was not asked for: no database text, no key.
 */
export type LookupResult =
  | { ok: true; order: LookedUpOrder }
  | { ok: false; reason: "INVALID" | LookupMiss; errors: LookupErrors; message?: undefined }
  | { ok: false; reason: "RATE_LIMITED" | "UNAVAILABLE"; message: string; errors?: undefined };

/**
 * The server's answer, in the screen's words: each miss under its own field.
 * A refusal for going too fast keeps the sentence `takeRate` wrote, already in
 * the request's language.
 */
export function lookupResultOf(answer: LookupAnswer, locale: Locale = "vi"): LookupResult {
  if (answer.ok) return { ok: true, order: answer.order };
  switch (answer.reason) {
    case "NO_ORDER":
      return { ok: false, reason: "NO_ORDER", errors: { code: lookupWords(locale).noOrder } };
    case "PHONE_MISMATCH":
      return { ok: false, reason: "PHONE_MISMATCH", errors: { phone: lookupWords(locale).phoneMismatch } };
    case "RATE_LIMITED":
      return { ok: false, reason: "RATE_LIMITED", message: answer.message };
  }
}
