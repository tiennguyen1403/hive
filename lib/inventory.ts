import { CATALOG } from "@/data/catalog";
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

/** Cut minus what is left. No restock exists, so this is what sold. */
export function soldUnits(p: Product): number {
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
 * `products` defaults to the catalogue and is passed in by the back office,
 * which renders `fixtures + overlay` — a stock adjustment made in this
 * browser has to reach the issue's own figures, or "còn 73 chiếc" on the
 * dashboard would disagree with the products table one click away. Every
 * other caller reads the fixtures and passes nothing (v3 slice 5).
 */
export function productsInDrop(no: number, products: Product[] = CATALOG): Product[] {
  return products.filter((p) => p.dropNo === no);
}

export function dropSummary(no: number, products: Product[] = CATALOG): DropSummary {
  const ps = productsInDrop(no, products);
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
export function lowStockIn(no: number, products: Product[] = CATALOG): Product[] {
  return productsInDrop(no, products)
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

export function familyGroupsIn(no: number): FamilyGroup[] {
  const ps = productsInDrop(no);
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
 */
export function familyKindsLabel(products: Product[]): string {
  const first = products[0];
  if (!first) return "";

  const kinds = [...new Set(products.map((p) => p.kind))];
  if (kinds.length === 1) {
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
export function dropRevenueVnd(no: number, products: Product[] = CATALOG): number {
  return productsInDrop(no, products).reduce((n, p) => n + p.priceVnd * soldUnits(p), 0);
}

/** How many photo sets the open drop still needs: one per colourway. */
export function photoSetsNeeded(no: number): number {
  return productsInDrop(no).reduce((n, p) => n + p.colors.length, 0);
}
