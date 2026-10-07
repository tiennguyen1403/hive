import type { Order } from "@/data/types";
import type { LookupField } from "./feed-account";
import { pick, pickAll, type Locale, type Pair } from "./i18n";
import { TRACK_PATH, isOrderCode, normaliseOrderCode, phoneDigits, trackHref } from "./lookup";

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

/**
 * An order the app already holds whole — read for a browser that may see it
 * (`loadReceipt`) — cut down to what the lookup screen prints, key by key, as
 * `toLookupAnswer` builds what `lookup_order()` sends: the same ten keys, and
 * no courier inside SHIPPING's status. What is not printed never reaches the
 * page's payload, whoever is looking (slice B19).
 */
export function lookedUpOf(o: Order): LookedUpOrder {
  const s = o.status;
  return {
    code: o.code,
    placedAt: o.placedAt,
    status: s.state === "SHIPPING" ? { state: "SHIPPING", shippedAt: s.shippedAt, trackingCode: s.trackingCode } : s,
    payment: o.payment,
    lines: o.lines,
    shippingFeeVnd: o.shippingFeeVnd,
    codFeeVnd: o.codFeeVnd,
    discountVnd: o.discountVnd,
    ...(o.promo ? { promo: o.promo } : {}),
    ...(o.moments ? { moments: o.moments } : {}),
  };
}

// ────────────────────────────────────────────── the two forms (slice B19)
/**
 * What the lookup's form action (`lookupFormAction`) keeps between two
 * answers, for `useActionState`: the two fields as they were sent, and the
 * answer. It matters to a page drawn WITHOUT script — the form posted to the
 * action, the server drew `/track` again with this — which fills the form in
 * again and shows the answer; the number travels in the POST's body and this
 * state, never in an address. With script the screens look up through
 * `lookupOrderAction` and never post the form.
 */
export interface LookupFormState {
  code: string;
  phone: string;
  /** The answer, or null while nothing has been sent. */
  result: LookupResult | null;
}

/** Nothing sent yet. */
export const NO_LOOKUP: LookupFormState = { code: "", phone: "", result: null };

/**
 * The longest a field comes back in the state, in UTF-16 units. The fields
 * are read whole and judged whole (`readLookup`); only what is handed back to
 * fill the form in again is cut, so a request carrying a megabyte of text
 * gets an answer of a few hundred bytes.
 */
const ECHO_MAX = 64;

/**
 * The two fields of a lookup form, as the browser sent them — "" for one
 * missing, or a file, or a body that is not a form at all: an action is a
 * public endpoint, and its argument is whatever the request carried.
 */
export function readLookupForm(form: unknown): { code: string; phone: string } {
  if (!(form instanceof FormData)) return { code: "", phone: "" };
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };
  return { code: field("code"), phone: field("phone") };
}

/** The state the form action answers: what was sent, cut to `ECHO_MAX`, and the answer. */
export function lookupFormState(sent: { code: string; phone: string }, result: LookupResult): LookupFormState {
  return { code: sent.code.slice(0, ECHO_MAX), phone: sent.phone.slice(0, ECHO_MAX), result };
}

/** An order on the lookup screen: the order, the number COD's line prints, and whether it fades in. */
export interface TrackFound {
  order: LookedUpOrder;
  /** The number the shopper typed — or, for an order this browser may already see, the one on the order. */
  phone: string;
  /** Just looked up from the form (with script): it fades in. Anything else is simply there. */
  fresh: boolean;
}

/**
 * The order behind `/track?code=…` when this browser may already see it — the
 * account's own, or one it placed signed out — as the lookup prints it, with
 * the number on the order for COD's line (`knownOrder`, `lib/db/track-known.ts`).
 */
export interface KnownOrder {
  order: LookedUpOrder;
  phone: string;
}

/** What the lookup screen is drawn with first. */
export interface TrackStart {
  values: { code: string; phone: string };
  errors: LookupErrors;
  /**
   * One sentence for the whole form — out of lookups, or none could be made —
   * only after a form sent without script: there is no toast without script.
   */
  notice: string | null;
  found: TrackFound | null;
  /**
   * The address the screen stands on, never with the number: where "Đăng
   * nhập" brings the shopper back to, and where an old link's `phone` goes.
   */
  here: string;
}

/**
 * The lookup screen's first state, from what its page knows (slice B19), in
 * this order:
 *
 *   1. the answer to a form sent without script (`posted`): the fields as
 *      sent, and the order, the sentence under a field, or the sentence for
 *      the whole form. The page is then `/track`, where such a form posts;
 *   2. an order this browser may already see (`known`), drawn at once — no
 *      number asked, no lookup spent;
 *   3. otherwise the form, with what the address carried: `?code=` typed in,
 *      and the number only from a link made before slice B19. The screen
 *      looks such a link up once it mounts, as before.
 */
export function trackStart(from: {
  posted: LookupFormState;
  known: KnownOrder | null;
  code: string;
  phone: string;
}): TrackStart {
  const { posted, known } = from;
  const result = posted.result;
  if (result) {
    const values = { code: posted.code, phone: posted.phone };
    if (result.ok) {
      const found = { order: result.order, phone: posted.phone.trim(), fresh: false };
      return { values, errors: {}, notice: null, found, here: TRACK_PATH };
    }
    if (result.errors) return { values, errors: result.errors, notice: null, found: null, here: TRACK_PATH };
    return { values, errors: {}, notice: result.message, found: null, here: TRACK_PATH };
  }
  if (known) {
    const found = { order: known.order, phone: known.phone, fresh: false };
    return { values: { code: known.order.code, phone: "" }, errors: {}, notice: null, found, here: trackHref(known.order.code) };
  }
  const code = normaliseOrderCode(from.code);
  return {
    values: { code: from.code, phone: from.phone },
    errors: {},
    notice: null,
    found: null,
    here: isOrderCode(code) ? trackHref(code) : TRACK_PATH,
  };
}
