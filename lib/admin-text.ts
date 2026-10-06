import type { Locale } from "./i18n";

/**
 * Text the back office prints that is partly the code's and partly the
 * database's (round v6 slice E4).
 *
 * The log's sentences and an order's notes are written in code, in the page's
 * language, around values somebody typed and the database kept as typed: a
 * note, the reason an address changed, a style's name at that moment. Those
 * values are printed exactly as stored — in Vietnamese, usually — and on an
 * English page the element around a Vietnamese one says so with
 * `lang="vi"`, so a screen reader reads it in the right voice.
 *
 * A `Phrase` is that text. On a Vietnamese page, and whenever nothing stored
 * in it is Vietnamese, it is one plain string, exactly the string the module
 * returned before this slice; only an English page with a Vietnamese value in
 * it gets the list of pieces, which `ArcPhrase` draws with a `<span lang="vi">`
 * around each stored one. `plainText` gives the words for a search, a CSV or a
 * test.
 */

/** A value printed as the database keeps it, on an English page, in Vietnamese. */
export interface Stored {
  readonly stored: string;
  readonly lang: "vi";
}

export type Phrase = string | readonly (string | Stored)[];

/**
 * The letters only Vietnamese writes: the vowels with their marks and "đ" (the
 * same set as the check the slices E1 to E3b ran over every English page).
 */
const VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

/** True when the text holds a letter only Vietnamese writes. */
export function isVietnamese(text: string): boolean {
  return VIETNAMESE.test(text);
}

/**
 * The `lang` an element holding a typed value carries: `"vi"` on an English
 * page when the value is Vietnamese, nothing otherwise — never on a Vietnamese
 * page, whose `<html>` says it already, so its markup does not change.
 */
export function storedLang(text: string, locale: Locale): "vi" | undefined {
  return locale === "en" && isVietnamese(text) ? "vi" : undefined;
}

/** A stored value as a piece of a phrase: marked when it is Vietnamese on an English page, plain otherwise. */
export function stored(text: string, locale: Locale): string | Stored {
  return storedLang(text, locale) ? { stored: text, lang: "vi" } : text;
}

/**
 * The pieces as one phrase: one string when no piece is marked (always, on a
 * Vietnamese page), else the pieces with neighbouring strings joined.
 */
export function phrase(...pieces: (string | Stored)[]): Phrase {
  if (pieces.every((p) => typeof p === "string")) return pieces.join("");
  const out: (string | Stored)[] = [];
  for (const piece of pieces) {
    const last = out[out.length - 1];
    if (typeof piece === "string" && typeof last === "string") out[out.length - 1] = last + piece;
    else if (piece !== "") out.push(piece);
  }
  return out;
}

/** The words of a phrase, as one string. */
export function plainText(value: Phrase | undefined): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return value.map((p) => (typeof p === "string" ? p : p.stored)).join("");
}

/** A phrase's pieces joined by `separator`, the way `[a, b].join(" · ")` joins strings. */
export function joinPhrases(parts: readonly Phrase[], separator: string): Phrase {
  const pieces: (string | Stored)[] = [];
  parts.forEach((part, i) => {
    if (i > 0) pieces.push(separator);
    if (typeof part === "string") pieces.push(part);
    else pieces.push(...part);
  });
  return phrase(...pieces);
}
