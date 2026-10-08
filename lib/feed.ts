import { colorLabel } from "@/data/colors";
import { SIZES, type ColorKey, type Drop, type Family, type Product, type Size, type Teaser } from "@/data/types";
import type { Catalog } from "./catalog";
import { dayMonth } from "./datetime";
import { dropState } from "./drop";
import { FLATS_MADE, flatKey, type FlatShape } from "./flats";
import { pick, pickAll, type Locale, type Pair } from "./i18n";
import {
  isFixed,
  isIssueStyle,
  isLowStock,
  isSoldOut,
  onHand,
  onHandByColor,
  onHandOf,
  productsInDrop,
  soldOutSizes,
  soldUnits,
} from "./inventory";
import { FIXED_WORD_TEXT, issueLabel, kindInSentence } from "./lexicon";
import { lookbookUrl, photoUrl } from "./photos";
import { productText } from "./product-text";
import { isTeaserShotKey } from "./shots";

/**
 * What the Feed screens (round v4, QĐ-32) print about one style, and how
 * their shop grid narrows and orders its styles.
 *
 * The rules are the approved mock's (`prototype/explore/feed/feed.js`:
 * `firstColor`, `canBuy`, `stockLine`, `alt`, `sizeOpts`, `shop`), the facts
 * the app's own (`lib/inventory.ts`, `lib/drop.ts`). Pure, and every function
 * that depends on the time is handed `now`, like `lib/drop.ts`: the server
 * render and the hydrating client must agree on it.
 *
 * Where the mock names one issue (its `LIVE` is "Số 05 is selling"), the app
 * asks each style's own issue: a style is live while the issue it was cut for
 * is open.
 */

// ─────────────────────────────────────────────────────────── one style

/** The issue a style was cut for, or nothing for a fixed style. */
function issueOf(catalog: Catalog, p: Product): Drop | undefined {
  return p.dropNo === null ? undefined : catalog.dropByNo.get(p.dropNo);
}

/** An issue's style whose issue is selling now. A fixed style has no issue and is never "live". */
export function isLive(catalog: Catalog, p: Product, now: Date): boolean {
  const drop = issueOf(catalog, p);
  return drop !== undefined && dropState(drop, now) === "OPEN";
}

/** An issue's style whose issue is not selling (the mock's `closedStyle`). */
export function isOver(catalog: Catalog, p: Product, now: Date): boolean {
  return !isFixed(p) && !isLive(catalog, p, now);
}

/**
 * The ĐÃ HẾT stamp: an issue's style with nothing left. A fixed style's empty
 * shelf is "tạm hết" — it comes back — and never gets the stamp.
 */
export function isGone(p: Product): boolean {
  return !isFixed(p) && isSoldOut(p);
}

/** Whether the quick add is offered: a fixed style with anything left, an issue's style while its issue sells and it lasts. */
export function canBuy(catalog: Catalog, p: Product, now: Date): boolean {
  return isFixed(p) ? onHand(p) > 0 : isLive(catalog, p, now) && !isSoldOut(p);
}

/** The colour a card shows: the first with anything left, else the first. */
export function firstColor(p: Product): ColorKey {
  return p.colors.find((c) => onHandByColor(p, c) > 0) ?? p.colors[0]!;
}

/**
 * The stock line under a style, as facts (the mock's `stockLine`):
 * · `sold` — "108/181 đã bán"-style, for an issue that has closed, when the
 *   grid asks for it (the closed issue's line in the shop);
 * · `fixed` — the sizes gone in every colour, or "Đủ size";
 * · `closed` — "Đã đóng 25/09", an issue's style once the issue has shut;
 * · `left` — "Còn N", with the fire when N is three or fewer, and the sizes gone.
 * Null for a sold-out issue's style: the ĐÃ HẾT stamp says it once, and for
 * a style of an issue that has not opened.
 */
export type StockFacts =
  | { kind: "sold"; sold: number; cut: number }
  | { kind: "fixed"; gone: Size[] }
  | { kind: "closed"; day: string }
  | { kind: "left"; n: number; low: boolean; gone: Size[] };

export function stockFacts(
  catalog: Catalog,
  p: Product,
  now: Date,
  opts: { soldCount?: boolean } = {},
  locale: Locale = "vi",
): StockFacts | null {
  if (opts.soldCount && isOver(catalog, p, now) && !isSoldOut(p) && isIssueStyle(p)) {
    return { kind: "sold", sold: soldUnits(p), cut: p.cutUnits };
  }
  const gone = soldOutSizes(p);
  if (isFixed(p)) return { kind: "fixed", gone };
  if (isSoldOut(p)) return null;
  const drop = issueOf(catalog, p);
  if (!drop) return null;
  const state = dropState(drop, now);
  // "Đã đóng 25/09"; in English "Closed 25 Sep" (round v6 slice E1): the day in the page's language.
  if (state === "CLOSED") return { kind: "closed", day: dayMonth(drop.closesAt, locale) };
  if (state === "UPCOMING") return null;
  return { kind: "left", n: onHand(p), low: isLowStock(p), gone };
}

// ─────────────────────────────────────────────────────────── pictures

/** Which picture of a colour: its packshot (a fixed style's flat drawing), or the lookbook frame. */
export type PictureKind = "pack" | "look";

/** Every picture the Feed shows is 4:5; the shots are 1200 × 1500. */
export const PICTURE = { width: 1200, height: 1500 } as const;

/** The photo key of one colourway. */
export function photoKeyOf(p: Product, color: ColorKey): string {
  return p.photoKeys[p.colors.indexOf(color)] ?? p.photoKeys[0]!;
}

/**
 * A colour's picture. "look" is the lookbook frame when the colour has one
 * (Số 05's shots); a colour without one — a flat, an upload, a borrowed
 * frame — shows its packshot instead, and says so with `look: false`.
 */
export function pictureOf(p: Product, color: ColorKey, kind: PictureKind): { src: string; look: boolean } {
  const key = photoKeyOf(p, color);
  if (kind === "look") {
    const look = lookbookUrl(key);
    if (look) return { src: look, look: true };
  }
  return { src: photoUrl(key, PICTURE.width), look: false };
}

/**
 * "Người mặc NGUỘI màu đen" for a lookbook frame, "KHÓI, áo thun oversize màu
 * kem" otherwise. In English (round v6 slice E1) "Model wearing NGUỘI in
 * black" and "PLAIN TEE, tee in cream": the style's words through
 * `productText`, the colour's English name.
 */
export function pictureAlt(p: Product, color: ColorKey, look: boolean, locale: Locale = "vi"): string {
  const { name, kind } = productText(p, locale);
  const c = kindInSentence(colorLabel(color, locale), locale);
  if (locale === "en") return look ? `Model wearing ${name} in ${c}` : `${name}, ${kindInSentence(kind, "en")} in ${c}`;
  return look ? `Người mặc ${name} màu ${c}` : `${name}, ${kindInSentence(kind)} màu ${c}`;
}

/**
 * The shape a teaser without a packshot of its own is drawn as: the mock
 * shows the next issue's styles as flat silhouettes of their kind of garment
 * ("No price, no photo"), never another style's photo.
 */
const TEASER_SHAPE: Record<Family, FlatShape> = {
  TEE: "tee",
  HOODIE: "hoodie",
  JACKET: "jacket",
  VEST: "vest",
  SHIRT: "shirt",
  PANTS: "trousers",
};

/** A teaser's picture, and whether it is a photograph of the teaser itself. */
export interface TeaserPicture {
  src: string;
  /** The teaser's own packshot, shown in colour; false for the silhouette. */
  photo: boolean;
}

/**
 * What a teaser stands as. Its own packshot when it has one (Số 06's four,
 * round v6, the user's call 08/10: `shot-<stem>`, `isTeaserShotKey`), in
 * colour; otherwise — a borrowed frame, another style's photo — the flat
 * drawing of its family's shape, in black where that drawing exists, as the
 * mock draws every teaser. Never a price either way.
 */
export function teaserPicture(t: Teaser): TeaserPicture {
  if (isTeaserShotKey(t.photoKey)) return { src: photoUrl(t.photoKey, PICTURE.width), photo: true };
  const shape = TEASER_SHAPE[t.family];
  const made = FLATS_MADE[shape];
  const color = made.includes("black") ? "black" : made[0]!;
  return { src: photoUrl(flatKey(shape, color), PICTURE.width), photo: false };
}

// ─────────────────────────────────────────────────────────── the quick add

/** One size of one colour and what is left of it. */
export function sizesIn(p: Product, color: ColorKey): { size: Size; n: number }[] {
  return SIZES.map((size) => ({ size, n: onHandOf(p, color, size) }));
}

/**
 * "Hết" and "Còn N" in both languages (round v6 slice E1, the glossary's
 * "Sold out" and "N left"), for the notes under a size and under a colour.
 */
const SOLD_OUT: Pair = { vi: "Hết", en: "Sold out" };
const left = (n: number): Pair => ({ vi: `Còn ${n}`, en: `${n} left` });

/** The size note as a pair: "Hết", "Còn 1", "Còn 2", or nothing. */
function sizeNoteText(n: number): Pair | null {
  if (n === 0) return SOLD_OUT;
  return n <= 2 ? left(n) : null;
}

/**
 * The small line under a size pill: "Hết", "Còn 1", "Còn 2", or nothing.
 * Vietnamese only, as it always was; the English one is `sizeOption`'s.
 */
export function sizeNote(n: number): string | null {
  return sizeNoteText(n)?.vi ?? null;
}

/**
 * One size pill of the size sheet and the product page, once the basket is
 * counted (round v4 slice 2): whether one more piece can go in, and its note.
 * `n` is what is left of the size, `held` how many the basket holds already.
 * A size the basket already holds every piece of cannot be added again: it is
 * drawn the way the mock draws a size that cannot be bought (struck through),
 * and its note says why — "Đã có trong giỏ". Otherwise the note is
 * `sizeNote`'s: "Hết", "Còn 1", "Còn 2", or nothing. In English "Sold out",
 * "In your bag", "1 left", "2 left" (round v6 slice E1).
 */
export function sizeOption(n: number, held: number, locale: Locale = "vi"): { open: boolean; note: string | null } {
  if (n === 0) return { open: false, note: pick(SOLD_OUT, locale) };
  if (held >= n) return { open: false, note: pick({ vi: "Đã có trong giỏ", en: "In your bag" }, locale) };
  const note = sizeNoteText(n);
  return { open: true, note: note ? pick(note, locale) : null };
}

/** Under a colour: "Còn 4" or "Hết" for an issue's style; nothing for a fixed one. In English "4 left", "Sold out". */
export function swatchNote(p: Product, color: ColorKey, locale: Locale = "vi"): string | null {
  if (isFixed(p)) return null;
  const n = onHandByColor(p, color);
  return pick(n ? left(n) : SOLD_OUT, locale);
}

/**
 * The size a quick add starts on: the remembered one, when this colour still
 * has a piece of it the basket does not hold already (`held`, the basket's
 * count of a size; none by default).
 */
export function startSize(
  p: Product,
  color: ColorKey,
  remembered: Size | null,
  held: (size: Size) => number = () => 0,
): Size | null {
  return remembered && onHandOf(p, color, remembered) > held(remembered) ? remembered : null;
}

/** "Size của tôi" while the chosen size is the remembered one, "Size" otherwise; in English "My size", "Size". */
export function sizeRowLabel(size: Size | null, mine: Size | null, locale: Locale = "vi"): string {
  return size !== null && size === mine ? pick({ vi: "Size của tôi", en: "My size" }, locale) : "Size";
}

// ─────────────────────────────────────────────────────────── the shop grid

/**
 * A line of the shop: every style on the switch ("all"), the fixed styles
 * ("fixed"), or one issue's styles (its number). In the URL: `?line=all`,
 * `?line=fixed`, `?line=5`.
 */
export type ShopLine = "all" | "fixed" | number;

/** The mock's three orders. The keys are `lib/catalog-query.ts`'s, the words the mock's. */
export const SHOP_SORTS = ["newest", "price-asc", "price-desc"] as const;
export type ShopSort = (typeof SHOP_SORTS)[number];

/** The orders' names in both languages (round v6 slice E1); `SHOP_SORT_LABELS` stays the Vietnamese side. */
export const SHOP_SORT_LABELS_TEXT: Readonly<Record<ShopSort, Pair>> = {
  newest: { vi: "Mới nhất", en: "Newest" },
  "price-asc": { vi: "Giá tăng dần", en: "Price: low to high" },
  "price-desc": { vi: "Giá giảm dần", en: "Price: high to low" },
};

export const SHOP_SORT_LABELS: Record<ShopSort, string> = pickAll(SHOP_SORT_LABELS_TEXT, "vi");

/** An order's name in one language. */
export function sortLabel(sort: ShopSort, locale: Locale = "vi"): string {
  return pick(SHOP_SORT_LABELS_TEXT[sort], locale);
}

/** The filter row, in the mock's order ("Mọi loại" first, Gile last). */
export const SHOP_FAMILIES: readonly Family[] = ["TEE", "HOODIE", "JACKET", "SHIRT", "PANTS", "VEST"];

export interface ShopState {
  line: ShopLine;
  family: Family | "ALL";
  sort: ShopSort;
}

/**
 * The lines on the switch, in the order it draws them (the mock's
 * `shopLines`): while the issue sells it leads — after "Tất cả" where that is
 * offered — and the fixed line follows; once it has closed the fixed line is
 * what sells and leads, the issue stays viewable after it. With no issue at
 * all, the fixed line alone.
 */
export function shopLines(issue: Drop | undefined, live: boolean, withAll: boolean): ShopLine[] {
  if (!issue) return ["fixed"];
  if (live) return withAll ? ["all", issue.no, "fixed"] : [issue.no, "fixed"];
  return ["fixed", issue.no];
}

/** The line a visit starts on: the first that is not "Tất cả". */
export function defaultLine(lines: readonly ShopLine[]): ShopLine {
  return lines.find((l) => l !== "all") ?? lines[0] ?? "fixed";
}

/** "Tất cả" · "Số 05" · "Cố định"; in English "All" · "Drop 05" · "Basics" (round v6 slice E1). */
export function lineLabel(line: ShopLine, locale: Locale = "vi"): string {
  if (line === "all") return pick({ vi: "Tất cả", en: "All" }, locale);
  if (line === "fixed") return pick(FIXED_WORD_TEXT, locale);
  return issueLabel(line, locale);
}

/** "Số 05" for an issue's style, "Cố định" for a fixed one — the line a style belongs to. In English "Drop 05", "Basics". */
export function lineOfStyle(p: Product, locale: Locale = "vi"): string {
  return p.dropNo === null ? pick(FIXED_WORD_TEXT, locale) : issueLabel(p.dropNo, locale);
}

type RawParams = Record<string, string | string[] | undefined>;

function firstParam(v: string | string[] | undefined): string | undefined {
  const one = Array.isArray(v) ? v[0] : v;
  const t = one?.trim();
  return t ? t : undefined;
}

/**
 * The grid's state from the URL — `?line=`, `?family=`, `?sort=` — each value
 * checked against what it may be; anything else is the default (QĐ-8: the
 * filters live in the URL, so a reload or a shared link opens the same grid).
 */
export function parseShopState(sp: RawParams, lines: readonly ShopLine[]): ShopState {
  const rawLine = firstParam(sp.line);
  let line = defaultLine(lines);
  if (rawLine === "all" || rawLine === "fixed") {
    if (lines.includes(rawLine)) line = rawLine;
  } else if (rawLine && /^\d{1,3}$/.test(rawLine) && lines.includes(Number(rawLine))) {
    line = Number(rawLine);
  }
  const rawFamily = firstParam(sp.family);
  const family = (SHOP_FAMILIES as readonly string[]).includes(rawFamily ?? "") ? (rawFamily as Family) : "ALL";
  const rawSort = firstParam(sp.sort);
  const sort = (SHOP_SORTS as readonly string[]).includes(rawSort ?? "") ? (rawSort as ShopSort) : "newest";
  return { line, family, sort };
}

/** The same state as a query, defaults left out: `line=fixed&family=TEE`, or "". */
export function shopQuery(state: ShopState, lines: readonly ShopLine[]): string {
  const q = new URLSearchParams();
  if (state.line !== defaultLine(lines)) q.set("line", String(state.line));
  if (state.family !== "ALL") q.set("family", state.family);
  if (state.sort !== "newest") q.set("sort", state.sort);
  return q.toString();
}

/** A line's styles in catalogue order; "Tất cả" is the issue's, then the fixed ones. */
export function lineStyles(catalog: Catalog, lines: readonly ShopLine[], line: ShopLine): Product[] {
  const fixed = catalog.products.filter((p) => isFixed(p));
  if (line === "fixed") return fixed;
  if (line === "all") {
    const no = lines.find((l): l is number => typeof l === "number");
    return [...(no === undefined ? [] : productsInDrop(catalog, no)), ...fixed];
  }
  return productsInDrop(catalog, line);
}

/** What the grid shows: the line, narrowed to one family, in the order asked for. */
export function shopList(catalog: Catalog, lines: readonly ShopLine[], state: ShopState): Product[] {
  const list = lineStyles(catalog, lines, state.line).filter(
    (p) => state.family === "ALL" || p.family === state.family,
  );
  if (state.sort === "price-asc") return [...list].sort((a, b) => a.priceVnd - b.priceVnd);
  if (state.sort === "price-desc") return [...list].sort((a, b) => b.priceVnd - a.priceVnd);
  return list;
}

/** For an empty grid: another line that has the family asked for, if one does. */
export function otherLineWith(catalog: Catalog, lines: readonly ShopLine[], state: ShopState): ShopLine | undefined {
  if (state.family === "ALL") return undefined;
  return lines.find(
    (l) => l !== state.line && l !== "all" && lineStyles(catalog, lines, l).some((p) => p.family === state.family),
  );
}
