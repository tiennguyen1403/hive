import type { Catalog } from "./catalog";
import { dropState } from "./drop";
import { SIZES, type ColorKey, type Product, type Size } from "@/data/types";

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
 * When a colour last sold (backend slice B12): the moment the most recent
 * order still in force that took a piece of it was placed, as the catalogue
 * carries it (`Product.lastSoldAt`) — or null for a colour nobody has bought,
 * for a colour the catalogue did not date, and for a style read from a source
 * that dates none (the fixture, a database before B12).
 */
export function lastSoldAtOf(p: Pick<Product, "lastSoldAt">, color: ColorKey): string | null {
  return p.lastSoldAt?.[color] ?? null;
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
