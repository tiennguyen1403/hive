import { byId } from "@/data/catalog";
import {
  COLOR_KEYS,
  SIZES,
  productId,
  type ColorKey,
  type Product,
  type ProductId,
  type Size,
} from "@/data/types";
import { onHandOf } from "./inventory";

/**
 * "Giữ lại sau" — a line taken out of the basket without letting go of the
 * choice behind it.
 *
 * NOT the wishlist. A saved style (`lib/wishlist.ts`) is a STYLE somebody
 * wants to watch across issues; this is a SIZE AND COLOUR somebody already
 * picked and is deciding about right now. The two were kept side by side on
 * purpose (decided 22/09/2026): moving a line here keeps "size M màu Đen",
 * which is exactly what a wishlist throws away.
 *
 * Like the cart, it stores WHICH thing and nothing else. Price and stock are
 * looked up fresh on every render, because a cut runs out while a list sits
 * waiting — a row that remembered "còn 12" would be wrong within the hour.
 *
 * The quantity is deliberately absent. Putting a line back in the basket
 * puts back ONE, and the stepper in the cart is where a second one is
 * chosen; keeping a count here would mean two places that both think they
 * know how many.
 */

export interface LaterLine {
  productId: ProductId;
  size: Size;
  color: ColorKey;
}

export type LaterList = LaterLine[];

/** Same identity rule as the cart: the choice, not the count. */
export function laterKey(l: LaterLine): string {
  return `${l.productId}:${l.color}:${l.size}`;
}

/**
 * Put a line aside. Newest first, and the same choice twice is once — a row
 * appearing twice is a rendering bug the shopper sees.
 */
export function addLater(list: LaterList, line: LaterLine): LaterList {
  const key = laterKey(line);
  return [line, ...list.filter((l) => laterKey(l) !== key)];
}

export function removeLater(list: LaterList, key: string): LaterList {
  return list.filter((l) => laterKey(l) !== key);
}

export function hasLater(list: LaterList, key: string): boolean {
  return list.some((l) => laterKey(l) === key);
}

export interface ResolvedLaterLine {
  key: string;
  line: LaterLine;
  product: Product;
  /** Units left in this exact colour and size, right now. */
  available: number;
}

export interface ResolvedLater {
  items: ResolvedLaterLine[];
  /** Lines whose product has left the catalog entirely. Dropped, not shown. */
  unknown: LaterLine[];
}

/**
 * Join the list to the catalog.
 *
 * A row whose size has sold out STAYS, with the shelf's answer on it. The
 * cart deletes nothing behind the shopper's back and neither does this: the
 * row says "hết size M" and its button goes quiet, which is information, not
 * an error.
 */
export function resolveLater(list: LaterList): ResolvedLater {
  const items: ResolvedLaterLine[] = [];
  const unknown: LaterLine[] = [];

  for (const line of list) {
    const product = byId.get(line.productId);
    if (!product) {
      unknown.push(line);
      continue;
    }
    items.push({
      key: laterKey(line),
      line,
      product,
      available: onHandOf(product, line.color, line.size),
    });
  }

  return { items, unknown };
}

// ─────────────────────────────────────────────────────────────── persistence
/**
 * Storage format, versioned — the same shape and the same defensive read as
 * `brand.cart`, because it is the same kind of value and is written by the
 * same screen. A payload that is not `v: 1` is dropped whole rather than
 * guessed at.
 */
export const LATER_STORAGE_KEY = "brand.later";
const SCHEMA_VERSION = 1;

export function serializeLater(list: LaterList): string {
  return JSON.stringify({ v: SCHEMA_VERSION, lines: list });
}

export function parseLater(raw: string | null): LaterList {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!isRecord(parsed) || parsed.v !== SCHEMA_VERSION || !Array.isArray(parsed.lines)) {
    return [];
  }

  const seen = new Set<string>();
  const out: LaterList = [];
  for (const raw of parsed.lines) {
    if (!isStoredLine(raw)) continue;
    const line: LaterLine = {
      productId: productId(raw.productId),
      color: raw.color,
      size: raw.size,
    };
    const key = laterKey(line);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStoredLine(
  v: unknown,
): v is { productId: string; color: ColorKey; size: Size } {
  if (!isRecord(v)) return false;
  return (
    typeof v.productId === "string" &&
    v.productId.length > 0 &&
    typeof v.color === "string" &&
    (COLOR_KEYS as readonly string[]).includes(v.color) &&
    typeof v.size === "string" &&
    (SIZES as readonly string[]).includes(v.size)
  );
}
