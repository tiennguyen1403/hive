import { SIZES, type Product } from "@/data/types";
import type { Query } from "./admin-url";
import type { Catalog } from "./catalog";
import { fold } from "./catalog-query";
import { picker, plural, type Locale } from "./i18n";
import { FIXED_LOW_AT, isFixed, isRunningLow, onHand, onHandOf, productsOnSale } from "./inventory";

/**
 * The styles table's rules for the FIXED styles (v3 slice 12), kept out of
 * the table (v3's `ProductsTable`, the Arc `ArcProductsScreen` since round v5
 * slice 5a) so they read and test without a DOM.
 *
 * Approved on the fixed-styles board (`prototype/v3/line.html`, round 4,
 * 25/09/2026; the frame `line/admin-products.html`): "Cố định" is the first
 * tab and the one that opens; a style running low comes first, says so in
 * its badge and in a red line under its stock, and the tab carries a red dot
 * so a manager on another tab still sees there is restocking to do.
 *
 * "Running low" is the fixed rule, cell by cell (`isRunningLow` in
 * `lib/inventory.ts`, slice B5): any colour in any size down to two or fewer,
 * none included. An issue's style keeps its own rule on its own tab.
 */

/** The badge of a fixed style: an empty shelf, running low, or selling. */
export type FixedStatus = "OUT" | "LOW" | "OK";

export function fixedStatus(p: Product): FixedStatus {
  if (onHand(p) === 0) return "OUT";
  return isRunningLow(p) ? "LOW" : "OK";
}

/**
 * "M hết · L còn 2 · XL còn 2" — the red line under a fixed style's stock,
 * or null when it is not running low (and always for an issue's style).
 *
 * Size by size, S → XL: a size gone in every colour is "M hết"; a size down
 * to two or fewer in some colour is "L còn N", N being the fewest left in any
 * one colour of it. The board's own reading (`adminProducts` in
 * `prototype/v3/line/line-mock.js`); where a size is gone in one colour but
 * not in another the board printed nothing, and the brief's rule — the
 * fewest left — reads "L còn 0".
 */
export function lowNote(p: Product, locale: Locale = "vi"): string | null {
  if (!isFixed(p) || !isRunningLow(p)) return null;
  const t = picker(locale);
  const parts: string[] = [];
  for (const size of SIZES) {
    const left = p.colors.map((c) => onHandOf(p, c, size));
    const fewest = Math.min(...left);
    // "out", as the drops' detail says it: the table's stock column is narrow (round v6 slice E5, measured).
    if (left.every((n) => n === 0)) parts.push(t({ vi: `${size} hết`, en: `${size} out` }));
    else if (fewest <= FIXED_LOW_AT) parts.push(t({ vi: `${size} còn ${fewest}`, en: `${size} ${fewest} left` }));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * The Cố định tab's rows: every style running low (an empty shelf is one)
 * first, then the rest, each group in the order it was given — catalogue
 * order, which is `position`. A copy; the list passed in is left alone.
 */
export function fixedRows(products: readonly Product[]): Product[] {
  return [...products.filter(isRunningLow), ...products.filter((p) => !isRunningLow(p))];
}

/**
 * The tool bar's two chips on the Cố định tab: "Sắp hết N" by the fixed rule
 * (`isRunningLow`) and "Hết N" by an empty shelf. The red dot on the tab
 * counts the first.
 */
export function fixedCounts(products: readonly Product[]): { low: number; out: number } {
  return {
    low: products.filter(isRunningLow).length,
    out: products.filter((p) => onHand(p) === 0).length,
  };
}

/**
 * Whether a kind's name already says its fit: "Áo thun oversize" says
 * "oversize", "Oversized tee" says "oversized". The styles table's "Loại ·
 * form" column then prints the kind alone, not "Áo thun oversize · oversize"
 * (round v6 slice R2, G5). Compared without marks or case (`fold`). An empty
 * fit word is never said.
 */
export function kindSaysFit(kind: string, fit: string): boolean {
  const word = fold(fit);
  return word !== "" && fold(kind).includes(word);
}

/** Which tab the address opens: `?drop=N` an issue, anything else Cố định. */
export type ProductsTab = { fixed: true } | { fixed: false; no: number };

/**
 * Cố định is the first tab, so it is the one a bare `/admin/products` opens,
 * and `?fixed=1` names it; `?drop=N` opens issue N unless `fixed=1` is there
 * too. A `drop` that is not a whole number above zero is read as absent.
 */
export function productsTab(query: Query): ProductsTab {
  if (query.fixed === "1") return { fixed: true };
  const no = Number(query.drop);
  return query.drop && Number.isInteger(no) && no > 0 ? { fixed: false, no } : { fixed: true };
}

/**
 * "29 mẫu · 18 đang bán" — every style the shop has, issue or fixed (teasers
 * are not styles yet), then the ones on sale now (`productsOnSale`: the open
 * issue's, sold out included, and every fixed one). The clause that explained
 * the stock columns went at v3 slice 13 (the user's copy review).
 */
export function stylesLine(catalog: Catalog, now: Date, locale: Locale = "vi"): string {
  const all = catalog.products.length;
  const selling = productsOnSale(catalog, now).length;
  return picker(locale)({ vi: `${all} mẫu · ${selling} đang bán`, en: `${plural(all, "style", "styles")} · ${selling} live` });
}
