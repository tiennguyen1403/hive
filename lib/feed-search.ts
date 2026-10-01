import { FAMILY_SHORT_LABELS, familyShortLabel, type Product } from "@/data/types";
import type { Catalog } from "./catalog";
import { FIT_LABELS, fitLabel, fold } from "./catalog-query";
import { lineStyles, shopLines } from "./feed";
import { homeMoment, lineIssue } from "./feed-home";
import { printOf } from "./feed-product";
import { pick, type Locale } from "./i18n";
import { isFixed, productsInDrop } from "./inventory";
import { FIXED_WORD_TEXT, issueLabel } from "./lexicon";
import { productText } from "./product-text";

/**
 * The Feed search screen (round v4, slice 1b): what `/search` looks through
 * and how a query matches, by the approved mock's rules
 * (`prototype/explore/shared/data.js`: `search`, `SUGGEST`;
 * `feed/search.js`: `idle`).
 *
 * In English since round v6 slice E1: a query is held against the style's
 * English words (`productText`) and its Vietnamese name, and its family is
 * found by the family itself — the English name keyed by `family`, never a
 * kind's words, since "Bottoms" is in no English kind ("Chinos", "Fleece
 * shorts"). The Vietnamese search is as it was.
 */

/**
 * What a search looks through: the shop's two lines — the issue it shows (the
 * one selling, else the last to close, so a style of an issue just shut is
 * still found, and says it has closed) and the fixed line. The older issues
 * are records, reached through `/so`, not search results.
 */
export function searchPool(catalog: Catalog, now: Date): Product[] {
  const m = homeMoment(catalog, now);
  const lines = shopLines(lineIssue(m), m.kind === "open", true);
  return lineStyles(catalog, lines, "all");
}

/**
 * Everything a style can be found by, folded: its name, kind, material,
 * family, fit and print. In English: its English name, kind and material, its
 * Vietnamese name (what the drops' styles are called in both languages), the
 * English name of its family ("Hoodies", "Bottoms") and fit ("Oversized"),
 * and its print, which keeps its Vietnamese name.
 */
function haystack(p: Product, locale: Locale): string {
  if (locale === "en") {
    const en = productText(p, "en");
    return fold(
      [en.name, p.name, en.kind, en.material, familyShortLabel(p.family, "en"), fitLabel(p.fit, "en"), printOf(p) ?? ""].join(
        " ",
      ),
    );
  }
  return fold(
    [p.name, p.kind, p.material, FAMILY_SHORT_LABELS[p.family], FIT_LABELS[p.fit], printOf(p) ?? ""].join(" "),
  );
}

/**
 * The styles a query finds: every word of it, accents and case aside ("ao
 * khoac" finds ÁO KHOÁC DÙ and SƯƠNG), somewhere in what the style can be
 * found by. In the pool's order. Nothing for an empty query.
 */
export function searchStyles(pool: readonly Product[], query: string, locale: Locale = "vi"): Product[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return pool.filter((p) => {
    const hay = haystack(p, locale);
    return words.every((w) => hay.includes(w));
  });
}

/** The mock's suggestions ("Gợi ý", "Thử tìm"), in its order. */
export const SEARCH_SUGGEST = ["hoodie", "áo khoác", "quần", "oversize", "cotton"] as const;

/**
 * The same five in English (round v6 slice E1): the three families by the
 * glossary's names, the fit, the cotton.
 */
export const SEARCH_SUGGEST_EN = ["hoodies", "jackets", "bottoms", "oversized", "cotton"] as const;

/** The suggestions in one language. */
export function searchSuggest(locale: Locale = "vi"): readonly string[] {
  return locale === "en" ? SEARCH_SUGGEST_EN : SEARCH_SUGGEST;
}

/** The suggestions that find something in this pool: a chip that leads to nothing is not offered. */
export function suggestTerms(pool: readonly Product[], locale: Locale = "vi"): string[] {
  return searchSuggest(locale).filter((t) => searchStyles(pool, t, locale).length > 0);
}

/**
 * The rail an empty search shows under the suggestions ("Cửa hàng"): the
 * issue while it sells, otherwise the fixed line — what is on sale — with
 * the way to the shop's grid on that line.
 */
export interface SearchRail {
  sub: string;
  href: string;
  items: Product[];
}

export function searchRail(catalog: Catalog, now: Date, locale: Locale = "vi"): SearchRail {
  const m = homeMoment(catalog, now);
  if (m.kind === "open") {
    return {
      sub: issueLabel(m.issue.no, locale),
      href: `/products?line=${m.issue.no}`,
      items: productsInDrop(catalog, m.issue.no),
    };
  }
  return {
    sub: pick(FIXED_WORD_TEXT, locale),
    href: "/products?line=fixed",
    items: catalog.products.filter((p) => isFixed(p)),
  };
}
