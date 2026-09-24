import type { Catalog } from "./catalog";
import { dropState } from "./drop";
import {
  FAMILIES,
  FAMILY_LABELS,
  SIZES,
  type ColorKey,
  type Family,
  type Product,
  type Size,
} from "@/data/types";

/**
 * Everything about how much is left is DERIVED here, never stored.
 *
 * The prototype cached `conTong` and `ban` on each record. That works right
 * up until one of them is edited and the other is not. On a drop model the
 * only fact is how many units were cut and how many are still on the shelf;
 * the rest is arithmetic.
 */

// ─────────────────────────────────────────────── two kinds of style (B5)
/**
 * A style of an issue: cut once for one numbered issue, never restocked.
 * Everything that counts against a cut — what sold, an issue's totals, the
 * hour a style ran out — is about these, and takes this type so the compiler
 * keeps a fixed style out of the arithmetic.
 */
export type IssueStyle = Product & { dropNo: number; cutUnits: number };

/**
 * A FIXED style (slice B5): a basic that belongs to no issue, sells at any
 * hour, and has a size brought back when it runs out. It has no issue number
 * and no cut — both null, which the database checks as a pair.
 */
export function isFixed(p: Product): boolean {
  return p.dropNo === null;
}

/** The other kind, as a type guard for the code that needs the cut. */
export function isIssueStyle(p: Product): p is IssueStyle {
  return p.dropNo !== null && p.cutUnits !== null;
}

/** Units left in one colour and size. */
export function onHandOf(p: Product, color: ColorKey, size: Size): number {
  return p.stock[color]?.[size] ?? 0;
}

/** Units left in one size, across every colour. */
export function onHandBySize(p: Product, size: Size): number {
  return p.colors.reduce((n, c) => n + onHandOf(p, c, size), 0);
}

/** Units left in one colour, across every size. */
export function onHandByColor(p: Product, color: ColorKey): number {
  return SIZES.reduce((n, s) => n + onHandOf(p, color, s), 0);
}

/** Units left, whole style. */
export function onHand(p: Product): number {
  return p.colors.reduce((n, c) => n + onHandByColor(p, c), 0);
}

/**
 * Cut minus what is left. An issue's style is never restocked, so this is
 * what sold. A fixed style has no cut, so what it sold is not arithmetic over
 * the shelf at all — hence the type.
 */
export function soldUnits(p: IssueStyle): number {
  return p.cutUnits - onHand(p);
}

export function isSoldOut(p: Product): boolean {
  return onHand(p) === 0;
}

/**
 * Sizes with nothing left — in the chosen colour when one is given, otherwise
 * across the whole style. Scarcity is content, not a warning: the shopper is
 * told before reaching for the button, not after.
 */
export function soldOutSizes(p: Product, color?: ColorKey): Size[] {
  return SIZES.filter((s) =>
    color ? onHandOf(p, color, s) === 0 : onHandBySize(p, s) === 0,
  );
}

/** The card calls a style "low" at three or fewer left. */
export const LOW_STOCK_AT = 3;

export function isLowStock(p: Product, color?: ColorKey): boolean {
  const left = color ? onHandByColor(p, color) : onHand(p);
  return left > 0 && left <= LOW_STOCK_AT;
}

/**
 * A fixed style runs low CELL by cell (slice B5): one colour in one size down
 * to two or fewer is what the back office restocks, whatever the rest of the
 * shelf holds. A cell at zero counts — that size is gone until it is brought
 * back, which is exactly when it needs flagging.
 */
export const FIXED_LOW_AT = 2;

/** One colour in one size, and what is left of it. */
export interface StockCell {
  color: ColorKey;
  size: Size;
  onHand: number;
}

/** The cells of a fixed style at `FIXED_LOW_AT` or below, colour by colour in band order, then S → XL. */
export function fixedLowCells(p: Product): StockCell[] {
  const cells: StockCell[] = [];
  for (const color of p.colors) {
    for (const size of SIZES) {
      const left = onHandOf(p, color, size);
      if (left <= FIXED_LOW_AT) cells.push({ color, size, onHand: left });
    }
  }
  return cells;
}

/**
 * "Sắp hết", by each kind's own rule: a fixed style when any cell is at two
 * or fewer (`fixedLowCells`); an issue's style when the whole style is down
 * to its last three (`isLowStock`, unchanged).
 */
export function isRunningLow(p: Product): boolean {
  return isFixed(p) ? fixedLowCells(p).length > 0 : isLowStock(p);
}

// ───────────────────────────────────────────────────────────── whole drops
export interface DropSummary {
  styles: number;
  cutUnits: number;
  soldUnits: number;
  onHand: number;
}

/**
 * The styles cut for one issue.
 *
 * `products` defaults to the catalogue this render was handed. The back
 * office passes its list in explicitly (v3 slice 5), which since slice B3b is
 * the same catalogue the database holds — a stock adjustment saved there
 * reaches the issue's own figures in the same response, so "còn 73 chiếc" on
 * the dashboard cannot disagree with the products table one click away.
 */
export function productsInDrop(
  catalog: Catalog,
  no: number,
  products: readonly Product[] = catalog.products,
): IssueStyle[] {
  return products.filter((p): p is IssueStyle => isIssueStyle(p) && p.dropNo === no);
}

/**
 * "Đang bán" (slice B5): every style of an issue that is open now — its sold
 * out ones included, the issue is still the one selling — and every fixed
 * style, a style with an empty shelf included ("tạm hết": it will be back).
 *
 * In catalogue order, which is `position`; the fixed styles were added after
 * every style the shop already had, so they come last. Between two issues
 * nothing is open and the fixed styles are all there is.
 */
export function productsOnSale(
  catalog: Catalog,
  now?: Date,
  products: readonly Product[] = catalog.products,
): Product[] {
  return products.filter((p) => {
    if (p.dropNo === null) return true;
    const drop = catalog.dropByNo.get(p.dropNo);
    return drop !== undefined && dropState(drop, now) === "OPEN";
  });
}

/** How many cards the home page's "Đang bán" holds: three rows on a phone, two on a monitor. */
export const SHOWCASE = 6;

/**
 * The six under "Đang bán" on the home page (v3 slice 11).
 *
 * Styles on sale that belong to no issue — the open issue's own stand above,
 * under "Trong số này" — and never one with an empty shelf, which is a card
 * with nothing to add. One per family first, in `FAMILIES` order, each the
 * family's first by position, so six cards show six kinds of garment; then
 * the rest by position until there are six.
 */
export function showcaseOnSale(
  catalog: Catalog,
  now?: Date,
  products: readonly Product[] = catalog.products,
): Product[] {
  const pool = productsOnSale(catalog, now, products).filter((p) => isFixed(p) && !isSoldOut(p));
  const firsts = FAMILIES.flatMap((family) => {
    const lead = pool.find((p) => p.family === family);
    return lead ? [lead] : [];
  });
  const rest = pool.filter((p) => !firsts.includes(p));
  return [...firsts, ...rest].slice(0, SHOWCASE);
}

/** How many cards a product page's lower row holds: two phone rows, one desktop row. */
export const RELATED_ROW = 4;

/**
 * "Cùng loại", the row under a fixed style (v3 slice 11): the other styles
 * on sale in its family, of either kind, the nearest in price first. Ties
 * keep catalogue order (the sort is stable). Empty when the style is the
 * only one of its family on sale — the page then draws no row.
 */
export function sameFamilyOnSale(
  catalog: Catalog,
  product: Product,
  now?: Date,
  limit: number = RELATED_ROW,
): Product[] {
  const gap = (p: Product) => Math.abs(p.priceVnd - product.priceVnd);
  return productsOnSale(catalog, now)
    .filter((p) => p.family === product.family && p.id !== product.id)
    .sort((a, b) => gap(a) - gap(b))
    .slice(0, limit);
}

export function dropSummary(
  catalog: Catalog,
  no: number,
  products: readonly Product[] = catalog.products,
): DropSummary {
  const ps = productsInDrop(catalog, no, products);
  return {
    styles: ps.length,
    cutUnits: ps.reduce((n, p) => n + p.cutUnits, 0),
    soldUnits: ps.reduce((n, p) => n + soldUnits(p), 0),
    onHand: ps.reduce((n, p) => n + onHand(p), 0),
  };
}

/**
 * The styles behind the home page's "Sắp hết" strip.
 *
 * Scarcest first, because the strip is a decision compressed into one row
 * and the one with two left is the one worth a tap. A style with nothing
 * left is not "sắp hết" — it is gone, and `isLowStock` already excludes it.
 *
 * Ties break on the name so the row does not reshuffle between two renders
 * of the same numbers.
 */
export function lowStockIn(
  catalog: Catalog,
  no: number,
  products: readonly Product[] = catalog.products,
): Product[] {
  return productsInDrop(catalog, no, products)
    .filter((p) => isLowStock(p))
    .sort((a, b) => onHand(a) - onHand(b) || a.name.localeCompare(b.name, "vi"));
}

/**
 * One tile per garment family the drop actually contains.
 *
 * In `FAMILIES` order rather than catalog order, so the row does not
 * reshuffle as the drop sells down, and families with nothing in this drop
 * are left out instead of being drawn with a zero — a tile leading to an
 * empty grid is worse than no tile (the same rule `familiesIn` follows).
 *
 * `lead` is the first style of that family in the drop; its photo is what
 * the tile shows. No photography of a CATEGORY exists — PRODUCT.md records
 * that none of this imagery is real — so standing one garment in for the
 * group is the most the fixtures can honestly supply.
 */
export interface FamilyGroup {
  family: Family;
  styles: number;
  lead: Product;
  /** "oversize, cơ bản và tay lỡ" — what tells the styles inside it apart. */
  kinds: string;
  /** The cheapest of them, for the row's "từ 390.000₫". */
  fromVnd: number;
}

export function familyGroupsIn(catalog: Catalog, no: number): FamilyGroup[] {
  return familyGroupsOf(productsInDrop(catalog, no));
}

/**
 * The same rows over any list of styles (v3 slice 11): the home page's
 * "Theo loại" counts everything on sale — the open issue's styles and the
 * fixed ones together, or the fixed ones alone between two issues — and each
 * row's photo is the first of its family in that list.
 */
export function familyGroupsOf(ps: readonly Product[]): FamilyGroup[] {
  return FAMILIES.flatMap((family) => {
    const inFamily = ps.filter((p) => p.family === family);
    const lead = inFamily[0];
    return lead
      ? [
          {
            family,
            styles: inFamily.length,
            lead,
            kinds: familyKindsLabel(inFamily),
            fromVnd: Math.min(...inFamily.map((p) => p.priceVnd)),
          },
        ]
      : [];
  });
}

/**
 * The word for a style whose `kind` is nothing but its family's name.
 *
 * "Áo hoodie" inside a row already titled Hoodie has nothing left to say
 * once the family name comes off, so the row names what the OTHERS are not:
 * the plain one. Vietnamese picks a different word per garment — a tee is
 * "cơ bản", a hoodie is "trơn" — so it is a table and not one adjective.
 */
const PLAIN_KIND: Partial<Record<Family, string>> = {
  TEE: "cơ bản",
  HOODIE: "trơn",
};

const PLAIN_KIND_FALLBACK = "trơn";

/**
 * "oversize, cơ bản và tay lỡ" — the second line of a family row.
 *
 * Derived, never written: the row is a promise about what is inside it, and
 * a hand-typed list goes stale the first time an issue carries a different
 * cut. Each style's `kind` loses the part the row's own title already says
 * ("Áo thun oversize" under Áo thun → "oversize"), and a kind that is only
 * the family name falls back to `PLAIN_KIND` above.
 *
 * A family with ONE kind is the exception: stripping "Áo sơ mi" off "Áo sơ
 * mi dệt" leaves "dệt", which names nothing on its own. There the kind
 * itself is printed, minus the garment word that opens it — "sơ mi dệt".
 * Unless nothing is left once the family name comes off: a lone "Áo hoodie"
 * is still the plain one, "trơn", as it would be in a list of several (v3
 * slice 11 — HOODIE TRƠN is the only hoodie on sale between two issues).
 */
export function familyKindsLabel(products: Product[]): string {
  const first = products[0];
  if (!first) return "";

  const kinds = [...new Set(products.map((p) => p.kind))];
  if (kinds.length === 1) {
    if (stripPrefix(first.kind, FAMILY_LABELS[first.family]) === "") {
      return PLAIN_KIND[first.family] ?? PLAIN_KIND_FALLBACK;
    }
    const [garment] = FAMILY_LABELS[first.family].split(" ");
    return stripPrefix(first.kind, garment ?? "").toLowerCase();
  }

  const tails: string[] = [];
  for (const p of products) {
    const tail = stripPrefix(p.kind, FAMILY_LABELS[p.family]).toLowerCase();
    const word = tail === "" ? (PLAIN_KIND[p.family] ?? PLAIN_KIND_FALLBACK) : tail;
    if (!tails.includes(word)) tails.push(word);
  }
  return joinWords(tails);
}

/** The text with `prefix` taken off the front, if it is on the front. */
function stripPrefix(text: string, prefix: string): string {
  if (prefix === "") return text;
  return text.toLowerCase().startsWith(prefix.toLowerCase())
    ? text.slice(prefix.length).trim()
    : text;
}

/** `["a", "b", "c"]` → `"a, b và c"`. A list read aloud, not a CSV. */
function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} và ${words[words.length - 1]}`;
}

/**
 * Price times units sold. Simulated, like everything else here — an admin
 * screen showing this must say so.
 */
export function dropRevenueVnd(
  catalog: Catalog,
  no: number,
  products: readonly Product[] = catalog.products,
): number {
  return productsInDrop(catalog, no, products).reduce(
    (n, p) => n + p.priceVnd * soldUnits(p),
    0,
  );
}

/** How many photo sets the open drop still needs: one per colourway. */
export function photoSetsNeeded(catalog: Catalog, no: number): number {
  return productsInDrop(catalog, no).reduce((n, p) => n + p.colors.length, 0);
}
