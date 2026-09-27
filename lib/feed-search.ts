import { FAMILY_SHORT_LABELS, type Product } from "@/data/types";
import type { Catalog } from "./catalog";
import { FIT_LABELS, fold } from "./catalog-query";
import { lineStyles, shopLines } from "./feed";
import { homeMoment, lineIssue } from "./feed-home";
import { printOf } from "./feed-product";
import { isFixed, productsInDrop } from "./inventory";
import { issueLabel } from "./lexicon";

/**
 * The Feed search screen (round v4, slice 1b): what `/search` looks through
 * and how a query matches, by the approved mock's rules
 * (`prototype/explore/shared/data.js`: `search`, `SUGGEST`;
 * `feed/search.js`: `idle`).
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

/** Everything a style can be found by, folded: its name, kind, material, family, fit and print. */
function haystack(p: Product): string {
  return fold(
    [p.name, p.kind, p.material, FAMILY_SHORT_LABELS[p.family], FIT_LABELS[p.fit], printOf(p) ?? ""].join(" "),
  );
}

/**
 * The styles a query finds: every word of it, accents and case aside ("ao
 * khoac" finds ÁO KHOÁC DÙ and SƯƠNG), somewhere in what the style can be
 * found by. In the pool's order. Nothing for an empty query.
 */
export function searchStyles(pool: readonly Product[], query: string): Product[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return pool.filter((p) => {
    const hay = haystack(p);
    return words.every((w) => hay.includes(w));
  });
}

/** The mock's suggestions ("Gợi ý", "Thử tìm"), in its order. */
export const SEARCH_SUGGEST = ["hoodie", "áo khoác", "quần", "oversize", "cotton"] as const;

/** The suggestions that find something in this pool: a chip that leads to nothing is not offered. */
export function suggestTerms(pool: readonly Product[]): string[] {
  return SEARCH_SUGGEST.filter((t) => searchStyles(pool, t).length > 0);
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

export function searchRail(catalog: Catalog, now: Date): SearchRail {
  const m = homeMoment(catalog, now);
  if (m.kind === "open") {
    return {
      sub: issueLabel(m.issue.no),
      href: `/products?line=${m.issue.no}`,
      items: productsInDrop(catalog, m.issue.no),
    };
  }
  return { sub: "Cố định", href: "/products?line=fixed", items: catalog.products.filter((p) => isFixed(p)) };
}
