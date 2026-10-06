import type { Fit, Product } from "@/data/types";
import { pick, pickAll, type Locale, type Pair } from "./i18n";
import { styleName } from "./lexicon";
import { productText } from "./product-text";

/**
 * The fits' labels, and how a typed term is held against a style's name:
 * `fold` for any text a shopper types, `foldName` and `styleNameHas` for a
 * style's name as the shop shows it.
 */

export const FITS = ["OVERSIZE", "REGULAR"] as const;

/**
 * The two fits in both languages (round v6 slice E1, the glossary's "Form
 * Fit (Oversized / Regular)"); `FIT_LABELS` stays the Vietnamese side.
 */
export const FIT_LABELS_TEXT: Readonly<Record<Fit, Pair>> = {
  OVERSIZE: { vi: "Oversize", en: "Oversized" },
  REGULAR: { vi: "Regular", en: "Regular" },
};

export const FIT_LABELS: Record<Fit, string> = pickAll(FIT_LABELS_TEXT, "vi");

/** A fit's name in one language: "Oversize", or "Oversized". */
export function fitLabel(fit: Fit, locale: Locale = "vi"): string {
  return pick(FIT_LABELS_TEXT[fit], locale);
}

// ─────────────────────────────────────────────────────────── accent folding
/**
 * Fold a string down to what someone types when they are in a hurry.
 *
 * `đ` is handled by hand because it does not decompose: it is a letter in its
 * own right, not `d` with a mark on it. `compareByName` in `data/regions.ts`
 * relies on exactly that and sorts `đ` after `d`. Searching is a different
 * job from sorting — someone typing "ao khoac du" still means "áo khoác dù" —
 * so here, and only here, `đ` folds to `d`.
 */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

/**
 * What a name can be typed apart with: a space of any kind — `\s` takes in
 * the no-break one `styleName` sets before the dash — and a dash of any
 * length (U+2010–U+2015, and the keyboard's own).
 */
const SEPARATORS = /[\s‐-―-]+/gu;

/**
 * `fold` for a style's name, and for a term held against one (v3 slice 11).
 *
 * An issue's style is shown as "S05 – KHÓI": a no-break space, an en dash, a
 * space. Nobody types that. A shopper types "s05 khoi", "S05 - KHÓI", or
 * pastes the name as it stands on the card; each run of spaces and dashes
 * comes out as one space, so all of them read "s05 khoi".
 */
export function foldName(s: string): string {
  return fold(s).replace(SEPARATORS, " ").trim();
}

/**
 * Whether the name the shop shows a style under carries the term: "s05",
 * "S05 KHÓI" and "S05 – KHÓI" all find KHÓI of Số 05 (v3 slice 11). A fixed
 * style's shown name is its name, so for it this asks nothing new.
 */
export function styleNameHas(p: Product, term: string, locale: Locale = "vi"): boolean {
  const needle = foldName(term);
  if (needle === "") return false;
  if (foldName(styleName(p.name, p.dropNo)).includes(needle)) return true;
  // An English page finds the name it prints too: "plain", "D05 KHOI" (round v6 slice E5).
  return locale === "en" && foldName(styleName(productText(p, "en").name, p.dropNo, "en")).includes(needle);
}
