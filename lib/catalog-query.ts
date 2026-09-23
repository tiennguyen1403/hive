import { COLORS } from "@/data/colors";
import {
  COLOR_KEYS,
  FAMILIES,
  FAMILY_SHORT_LABELS,
  SIZES,
  type ColorKey,
  type Family,
  type Fit,
  type Product,
  type Size,
} from "@/data/types";
import { isSoldOut, onHand, onHandBySize } from "./inventory";
import { vnd } from "./money";

/**
 * Turning a URL into a filtered grid.
 *
 * The filters live in the query string and nowhere else. That is the whole
 * design: a shopper who has narrowed the drop down to "oversize, còn size M,
 * dưới 900k" can send that link to a friend, and Back returns them to it. A
 * filter kept in component state is a filter that disappears on refresh and
 * cannot be shared at all.
 *
 * Everything read out of the URL is treated as input from a stranger — every
 * value is checked against the list it must come from, and anything else is
 * dropped rather than passed through.
 */

/* The order the menu draws them in, settled with the v3 mock: what is new,
   what is nearly gone, then the two price directions. Scarcity sits second
   because on an issue it is the reason a shopper reorders at all. */
export const SORT_KEYS = ["newest", "low-stock", "price-asc", "price-desc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const DEFAULT_SORT: SortKey = "newest";

/** Shown as-is, on the list bar's button and in the menu under it. */
export const SORT_LABELS: Record<SortKey, string> = {
  newest: "Mới nhất",
  "low-stock": "Sắp hết trước",
  "price-asc": "Giá thấp đến cao",
  "price-desc": "Giá cao đến thấp",
};

export const FITS = ["OVERSIZE", "REGULAR"] as const;
export const FIT_LABELS: Record<Fit, string> = {
  OVERSIZE: "Oversize",
  REGULAR: "Regular",
};

export interface ListingQuery {
  /**
   * `?family=HOODIE` — where the nav's five family links land.
   *
   * A field on the product, never read off `kind`: the drop has nine kinds
   * and four of them differ only by a cut, so "Áo sơ mi dệt" and "Áo sơ mi"
   * have to end up in one group without anyone parsing the words (QĐ-10).
   */
  families: Family[];
  fits: Fit[];
  sizes: Size[];
  /**
   * `?color=black,cream` — the colour group in the filter rail and sheet.
   *
   * It asks which colourways the style was CUT in, not which ones still have
   * units: a sold-out black jogger is still a black jogger, and the listing
   * shows sold-out styles on purpose. "Còn size M" is the filter that asks
   * about the shelf, and it says so in its own label.
   */
  colors: ColorKey[];
  minVnd?: number;
  maxVnd?: number;
  sort: SortKey;
  /** As typed, so it can be shown back in the search box. */
  q?: string;
}

/** Nothing selected — what `/products` shows on a first visit. */
export const EMPTY_QUERY: ListingQuery = {
  families: [],
  fits: [],
  sizes: [],
  colors: [],
  sort: DEFAULT_SORT,
};

export function isFiltered(q: ListingQuery): boolean {
  return (
    q.families.length > 0 ||
    q.fits.length > 0 ||
    q.sizes.length > 0 ||
    q.colors.length > 0 ||
    q.minVnd !== undefined ||
    q.maxVnd !== undefined ||
    q.sort !== DEFAULT_SORT
  );
}

/**
 * The same query with every filter dropped — what "Xoá tất cả" produces.
 *
 * The search term survives. "Xoá tất cả" clears the FILTERS; wiping the word
 * they typed as well would look like the box broke.
 */
export function clearFilters(q: ListingQuery): ListingQuery {
  return { ...EMPTY_QUERY, ...(q.q ? { q: q.q } : {}) };
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

// ──────────────────────────────────────────────────────────────── the URL
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** `?size=M,L` and `?size=M&size=L` mean the same thing; accept both. */
function listOf(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  const flat = Array.isArray(v) ? v : [v];
  return flat
    .flatMap((s) => s.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

function firstOf(v: string | string[] | undefined): string | undefined {
  const flat = Array.isArray(v) ? v[0] : v;
  const trimmed = flat?.trim();
  return trimmed ? trimmed : undefined;
}

function priceOf(v: string | string[] | undefined): number | undefined {
  const raw = firstOf(v);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseListingQuery(sp: RawSearchParams): ListingQuery {
  const families = listOf(sp.family).filter((v): v is Family =>
    (FAMILIES as readonly string[]).includes(v),
  );
  const fits = listOf(sp.fit).filter((v): v is Fit =>
    (FITS as readonly string[]).includes(v),
  );
  const sizes = listOf(sp.size).filter((v): v is Size =>
    (SIZES as readonly string[]).includes(v),
  );
  const colors = listOf(sp.color).filter((v): v is ColorKey =>
    (COLOR_KEYS as readonly string[]).includes(v),
  );

  let minVnd = priceOf(sp.min);
  let maxVnd = priceOf(sp.max);
  // A window typed backwards is a slip, not a request for nothing. Swapping
  // it returns what was meant; honouring it returns an empty grid and blames
  // the shopper.
  if (minVnd !== undefined && maxVnd !== undefined && minVnd > maxVnd) {
    [minVnd, maxVnd] = [maxVnd, minVnd];
  }

  const rawSort = firstOf(sp.sort);
  const sort = (SORT_KEYS as readonly string[]).includes(rawSort ?? "")
    ? (rawSort as SortKey)
    : DEFAULT_SORT;

  const q = firstOf(sp.q);

  return {
    families,
    fits,
    sizes,
    colors,
    ...(minVnd !== undefined ? { minVnd } : {}),
    ...(maxVnd !== undefined ? { maxVnd } : {}),
    sort,
    ...(q !== undefined ? { q } : {}),
  };
}

/**
 * Back to a query string. The default sort is left out: a URL should carry
 * what was chosen, not restate what was never touched.
 */
export function queryToSearchParams(q: ListingQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (q.q) sp.set("q", q.q);
  if (q.families.length) sp.set("family", q.families.join(","));
  if (q.fits.length) sp.set("fit", q.fits.join(","));
  if (q.sizes.length) sp.set("size", q.sizes.join(","));
  if (q.colors.length) sp.set("color", q.colors.join(","));
  if (q.minVnd !== undefined) sp.set("min", String(q.minVnd));
  if (q.maxVnd !== undefined) sp.set("max", String(q.maxVnd));
  if (q.sort !== DEFAULT_SORT) sp.set("sort", q.sort);
  return sp;
}

/** `/products?fit=OVERSIZE` — or bare `/products` when nothing is set. */
export function listingHref(path: string, q: ListingQuery): string {
  const s = queryToSearchParams(q).toString();
  return s ? `${path}?${s}` : path;
}

// ────────────────────────────────────────────────────────────── the sieve
function matchesQuery(p: Product, q: ListingQuery): boolean {
  if (q.families.length && !q.families.includes(p.family)) return false;

  if (q.fits.length && !q.fits.includes(p.fit)) return false;

  // "Còn size M" asks what is left, not what was cut. A style that sold out
  // of M is not an answer to it.
  if (q.sizes.length && !q.sizes.some((s) => onHandBySize(p, s) > 0)) return false;

  if (q.colors.length && !q.colors.some((c) => p.colors.includes(c))) return false;

  if (q.minVnd !== undefined && p.priceVnd < q.minVnd) return false;
  if (q.maxVnd !== undefined && p.priceVnd > q.maxVnd) return false;

  if (q.q) {
    const needle = fold(q.q);
    const hay = fold(`${p.name} ${p.kind} ${p.material}`);
    if (!hay.includes(needle)) return false;
  }

  return true;
}

function compare(a: Product, b: Product, sort: SortKey): number {
  switch (sort) {
    case "price-asc":
      return a.priceVnd - b.priceVnd;
    case "price-desc":
      return b.priceVnd - a.priceVnd;
    case "low-stock": {
      // Sold out is not "almost gone" — it is over. Leading with it would
      // fill the top of the grid with things nobody can buy, so it sinks.
      const ga = isSoldOut(a) ? 1 : 0;
      const gb = isSoldOut(b) ? 1 : 0;
      if (ga !== gb) return ga - gb;
      return onHand(a) - onHand(b);
    }
    case "newest":
      return 0;
  }
}

/**
 * Filter then sort. Returns a new array — the caller's list, usually the
 * catalog itself, is never reordered in place.
 */
export function runListingQuery(products: Product[], q: ListingQuery): Product[] {
  return products.filter((p) => matchesQuery(p, q)).sort((a, b) => compare(a, b, q.sort));
}

// ──────────────────────────────────────────────────────────────── the counts
/**
 * The number beside every tab and every chip.
 *
 * All five counters answer the same question — "how many styles would I still
 * see if I ticked this?" — and all five are arithmetic over the pool the page
 * was handed, never a figure typed into the markup. A value that nothing in
 * the drop matches is LEFT OUT rather than drawn with a zero: a chip that
 * leads to an empty grid is worse than no chip, the rule `familyGroupsIn`
 * already follows.
 *
 * They count STYLES, not units. "Áo thun 3" means three styles to look at,
 * which is what the shopper is choosing between; how many pieces are left of
 * each is the card's job.
 */
export interface Tally<T> {
  value: T;
  styles: number;
}

export function familyCounts(products: Product[]): Tally<Family>[] {
  return FAMILIES.flatMap((family) => {
    const styles = products.filter((p) => p.family === family).length;
    return styles ? [{ value: family, styles }] : [];
  });
}

export function fitCounts(products: Product[]): Tally<Fit>[] {
  return FITS.flatMap((fit) => {
    const styles = products.filter((p) => p.fit === fit).length;
    return styles ? [{ value: fit, styles }] : [];
  });
}

/** "Còn size M 8" — styles with at least one piece left in that size. */
export function sizeCounts(products: Product[]): Tally<Size>[] {
  return SIZES.flatMap((size) => {
    const styles = products.filter((p) => onHandBySize(p, size) > 0).length;
    return styles ? [{ value: size, styles }] : [];
  });
}

/**
 * Colourways the drop was cut in, commonest first.
 *
 * Sorted by count rather than by `COLOR_KEYS`, because this list is read as
 * "what does this drop look like" — the colour the drop is mostly made of
 * belongs at the front. Ties fall back to `COLOR_KEYS` order so the row does
 * not reshuffle between two renders of the same numbers.
 */
export function colorCounts(products: Product[]): Tally<ColorKey>[] {
  return COLOR_KEYS.flatMap((color) => {
    const styles = products.filter((p) => p.colors.includes(color)).length;
    return styles ? [{ value: color, styles }] : [];
  }).sort((a, b) => b.styles - a.styles);
}

/**
 * The three price windows the filter offers as one-tap chips.
 *
 * They write the SAME `min`/`max` the two number boxes write, so a band and a
 * hand-typed window cannot disagree about what the URL means. The boundaries
 * do not overlap: 500.000₫ belongs to the middle band only.
 */
export interface PriceBand {
  id: string;
  /** Shown as-is. */
  label: string;
  minVnd?: number;
  maxVnd?: number;
}

export const PRICE_BANDS: PriceBand[] = [
  { id: "under-500k", label: "Dưới 500k", maxVnd: 499_999 },
  { id: "500k-1m", label: "500k – 1tr", minVnd: 500_000, maxVnd: 1_000_000 },
  { id: "over-1m", label: "Trên 1tr", minVnd: 1_000_001 },
];

export function priceBandCounts(products: Product[]): Array<PriceBand & { styles: number }> {
  return PRICE_BANDS.flatMap((band) => {
    const styles = products.filter(
      (p) =>
        (band.minVnd === undefined || p.priceVnd >= band.minVnd) &&
        (band.maxVnd === undefined || p.priceVnd <= band.maxVnd),
    ).length;
    return styles ? [{ ...band, styles }] : [];
  });
}

/** Is this band the window the URL currently carries? */
export function isBandApplied(q: ListingQuery, band: PriceBand): boolean {
  return q.minVnd === band.minVnd && q.maxVnd === band.maxVnd;
}

/** "Số này từ 390.000₫ đến 1.450.000₫" — the real ends of the drop. */
export function priceRangeOf(
  products: Product[],
): { minVnd: number; maxVnd: number } | undefined {
  if (products.length === 0) return undefined;
  const prices = products.map((p) => p.priceVnd);
  return { minVnd: Math.min(...prices), maxVnd: Math.max(...prices) };
}

/**
 * Every filter in force, as words — "Hoodie · Oversize · còn size S · đen".
 *
 * The empty state is the one screen that has to say WHY it is empty, and the
 * only honest answer is the list of conditions the shopper set. Read off the
 * query rather than off the controls, so it cannot drift from the URL that
 * produced the result.
 *
 * A price window that matches one of the three bands is printed as that
 * band's own label: the shopper tapped "Dưới 500k", and "đến 499.999₫" is
 * the same window described back at them in a way they never typed.
 */
export function filterLabels(q: ListingQuery): string[] {
  const out: string[] = [];
  for (const f of q.families) out.push(FAMILY_SHORT_LABELS[f]);
  for (const f of q.fits) out.push(FIT_LABELS[f]);
  for (const s of q.sizes) out.push(`còn size ${s}`);
  for (const c of q.colors) out.push(COLORS[c].label.toLocaleLowerCase("vi"));

  const band = PRICE_BANDS.find((b) => isBandApplied(q, b));
  if (band) out.push(band.label);
  else if (q.minVnd !== undefined && q.maxVnd !== undefined) {
    out.push(`${vnd(q.minVnd)} – ${vnd(q.maxVnd)}`);
  } else if (q.minVnd !== undefined) out.push(`từ ${vnd(q.minVnd)}`);
  else if (q.maxVnd !== undefined) out.push(`đến ${vnd(q.maxVnd)}`);

  return out;
}
