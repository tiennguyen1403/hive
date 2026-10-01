/**
 * Two languages, Vietnamese and English (round v6, QĐ-40).
 *
 * The app keeps one address per screen: the language is not in the path
 * (`/en/…`) but in a cookie, `hive-lang`, which `proxy.ts` writes the first
 * time a browser says which language it prefers, `?lang=` overrides, and the
 * switch in the top bar (the shop) or the sidebar (the back office) changes
 * through a Server Action (`lib/actions/locale.ts`). The server reads it with
 * `getLocale()` (`lib/locale.ts`), the client with `useLocale()`
 * (`components/i18n/LocaleContext.tsx`).
 *
 * TEXT LIVES WHERE IT IS USED, as a `{ vi, en }` pair: a component or a
 * function in `lib/` writes both sides beside each other, and the type makes a
 * missing side a `tsc` error. No dictionary files: a screen's words stay in
 * the screen's file, where its layout is. A table that other code already
 * reads in Vietnamese (`LEX`, `STATE_LABEL`, `FOOT_HELP`…) keeps its name and
 * its shape, derived from the `vi` side of its pairs; a function beside it
 * takes the language as its last parameter, `"vi"` by default.
 *
 * Nothing here reads a request: the proxy imports this module, and the proxy
 * must not pull in `next/headers` (`lib/request-path.ts`).
 */

/** The two languages. Vietnamese is the default and every fallback. */
export type Locale = "vi" | "en";

export const LOCALES: readonly Locale[] = ["vi", "en"];

export const DEFAULT_LOCALE: Locale = "vi";

/** The cookie that remembers the language. */
export const LOCALE_COOKIE = "hive-lang";

/** The query parameter that forces one: `?lang=en`, `?lang=vi`. */
export const LOCALE_PARAM = "lang";

/** One year, `SameSite=Lax`, the whole site. */
export const LOCALE_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
  path: "/",
} as const;

export function isLocale(value: unknown): value is Locale {
  return value === "vi" || value === "en";
}

/** A valid language, or null for anything else (an empty cookie, `?lang=fr`). */
export function parseLocale(value: unknown): Locale | null {
  return isLocale(value) ? value : null;
}

// ─────────────────────────────────────────────────────────── text in pairs

/** A piece of text, or anything else that differs by language, in both. */
export interface Pair<T = string> {
  readonly vi: T;
  readonly en: T;
}

/** One side of a pair. */
export function pick<T>(pair: Pair<T>, locale: Locale): T {
  return pair[locale];
}

/**
 * `pick`, bound to one language: `const t = picker(locale)`, then
 * `t({ vi: "Giỏ", en: "Bag" })` wherever a component or a function prints
 * text.
 */
export function picker(locale: Locale): <T>(pair: Pair<T>) => T {
  return (pair) => pair[locale];
}

/** Every pair of a table in one language: `{ a: { vi, en } }` → `{ a: vi }`. */
export function pickAll<K extends string, T>(table: Readonly<Record<K, Pair<T>>>, locale: Locale): Record<K, T> {
  const out = {} as Record<K, T>;
  for (const key of Object.keys(table) as K[]) out[key] = table[key][locale];
  return out;
}

// ─────────────────────────────────────────────────────────── numbers

const THOUSANDS: Pair = { vi: ".", en: "," };

/**
 * `1290000` → "1.290.000" (vi) or "1,290,000" (en): a whole number grouped in
 * thousands, the way each language writes it. By hand, not with `Intl`, for
 * the reason `lib/money.ts` gives.
 */
export function groupDigits(n: number, locale: Locale = "vi"): string {
  const sign = n < 0 ? "-" : "";
  const digits = String(Math.abs(Math.round(n)));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS[locale]);
}

const EN_PLURAL = new Intl.PluralRules("en-GB");

/** The English noun for a count, by `Intl.PluralRules("en-GB")`: "item" for 1, "items" otherwise. */
export function pluralNoun(n: number, one: string, other: string): string {
  return EN_PLURAL.select(n) === "one" ? one : other;
}

/**
 * A count and its noun in English, singular or plural by
 * `Intl.PluralRules("en-GB")`: `plural(1, "item", "items")` → "1 item",
 * `plural(2, "item", "items")` → "2 items". Vietnamese has no plural, so its
 * side of a pair writes the count and the noun itself.
 */
export function plural(n: number, one: string, other: string): string {
  return `${groupDigits(n, "en")} ${pluralNoun(n, one, other)}`;
}

// ─────────────────────────────────────────────────────────── which language

/**
 * The language `Accept-Language` prefers: the tag with the highest weight
 * (`q`, 1 when absent; the first of equals), Vietnamese when it is `vi` or
 * `vi-*`, English for anything else (`fr-FR,fr;q=0.9` → English). Null when
 * there is no header, or nothing in it is acceptable (only `q=0`), so the
 * caller can tell "no preference" from a preference.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  let best: { tag: string; q: number } | null = null;
  for (const part of header.split(",")) {
    const [rawTag = "", ...params] = part.split(";");
    const tag = rawTag.trim();
    if (!tag) continue;
    let q = 1;
    for (const param of params) {
      const m = /^\s*q\s*=\s*([0-9.]+)\s*$/i.exec(param);
      if (m) q = Number(m[1]);
    }
    if (!Number.isFinite(q) || q <= 0) continue;
    if (!best || q > best.q) best = { tag, q };
  }
  if (!best) return null;
  return /^vi(?:[-_]|$)/i.test(best.tag) ? "vi" : "en";
}

export interface LocaleSignals {
  /** `?lang=` from the address, when the request has it. */
  param?: string | null;
  /** The `hive-lang` cookie. */
  cookie?: string | null;
  /** The `Accept-Language` header. */
  acceptLanguage?: string | null;
}

export interface LocaleChoice {
  locale: Locale;
  /**
   * What decided it. Only `header` is a first visit the proxy remembers in
   * the cookie; `default` is a request that said nothing — a link preview's
   * bot, usually — which gets Vietnamese and NO cookie (QĐ-40).
   */
  from: "param" | "cookie" | "header" | "default";
}

/**
 * The order of the decision (QĐ-40, brief v6 slice E0 §2.1): a valid
 * `?lang=`, then a valid cookie, then `Accept-Language`, then Vietnamese.
 */
export function chooseLocale({ param, cookie, acceptLanguage }: LocaleSignals): LocaleChoice {
  const fromParam = parseLocale(param);
  if (fromParam) return { locale: fromParam, from: "param" };
  const fromCookie = parseLocale(cookie);
  if (fromCookie) return { locale: fromCookie, from: "cookie" };
  const fromHeader = localeFromAcceptLanguage(acceptLanguage);
  if (fromHeader) return { locale: fromHeader, from: "header" };
  return { locale: DEFAULT_LOCALE, from: "default" };
}

/**
 * A query string without one parameter, every other one kept exactly as it
 * was written — its order and its encoding (QĐ-8: filters and pages live in
 * the address): `?line=fixed&lang=en` → `?line=fixed`, `?lang=en` → "".
 */
export function withoutParam(search: string, name: string): string {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (!raw) return "";
  const kept = raw.split("&").filter((segment) => keyOf(segment) !== name);
  return kept.length ? `?${kept.join("&")}` : "";
}

function keyOf(segment: string): string {
  const key = segment.split("=")[0] ?? "";
  try {
    return decodeURIComponent(key.replace(/\+/g, " "));
  } catch {
    return key;
  }
}
