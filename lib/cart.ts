import {
  COLOR_KEYS,
  SIZES,
  productId,
  type ColorKey,
  type Product,
  type ProductId,
  type Size,
} from "@/data/types";
import type { Catalog } from "./catalog";
import { dropState, getDrop } from "./drop";
import { onHandOf } from "./inventory";

/**
 * The cart, as arithmetic.
 *
 * Everything here is a pure function over a plain array. Nothing reaches for
 * `localStorage`, `window` or React — those belong to `CartProvider`, which is
 * a thin shell around this file. The split is what lets the rules below be
 * tested at all, and it is also what stops two components from each holding
 * their own slightly different idea of what "add to cart" means.
 *
 * What a cart line stores is deliberately small: WHICH thing, not what it
 * looked like at the time. Price, photo and availability are looked up from
 * the catalog on every render. A drop sells out while carts are open, so a
 * cart that remembers "890.000₫, còn 2" is a cart that lies within the hour.
 */

export interface CartLine {
  productId: ProductId;
  size: Size;
  color: ColorKey;
  qty: number;
}

export type Cart = CartLine[];

/**
 * A line's identity is the choice, not the quantity: the same style in the
 * same colour and size is the same line however many the shopper wants.
 */
export function lineKey(l: Pick<CartLine, "productId" | "size" | "color">): string {
  return `${l.productId}:${l.color}:${l.size}`;
}

/** Units on hand for exactly this choice. 0 for a product that has gone. */
function availableFor(
  catalog: Catalog,
  l: Pick<CartLine, "productId" | "size" | "color">,
): number {
  const p = catalog.byId.get(l.productId);
  return p ? onHandOf(p, l.color, l.size) : 0;
}

/**
 * Add, or merge into the line that is already there.
 *
 * The quantity is clamped to what the drop actually has. A drop is cut once —
 * there is no reorder to fall back on — so letting the number climb past the
 * stock would put a promise in the cart that no later screen can keep. A
 * choice with nothing left is refused outright rather than added at zero.
 */
export function addToCart(catalog: Catalog, cart: Cart, add: CartLine): Cart {
  const stock = availableFor(catalog, add);
  if (stock <= 0) return cart;

  const key = lineKey(add);
  const at = cart.findIndex((l) => lineKey(l) === key);
  if (at === -1) {
    return [...cart, { ...add, qty: Math.min(add.qty, stock) }];
  }
  const next = [...cart];
  next[at] = { ...next[at]!, qty: Math.min(next[at]!.qty + add.qty, stock) };
  return next;
}

/** Set a line's quantity. Zero or less removes it — an empty line is noise. */
export function setLineQty(
  catalog: Catalog,
  cart: Cart,
  key: string,
  qty: number,
): Cart {
  if (qty <= 0) return removeLine(cart, key);
  return cart.map((l) =>
    lineKey(l) === key ? { ...l, qty: Math.min(qty, availableFor(catalog, l)) } : l,
  );
}

export function removeLine(cart: Cart, key: string): Cart {
  return cart.filter((l) => lineKey(l) !== key);
}

/** Pieces, not lines — the badge on the nav bag counts things to wear. */
export function cartUnits(cart: Cart): number {
  return cart.reduce((n, l) => n + l.qty, 0);
}

// ──────────────────────────────────────────────────── joined to the catalog
/**
 * Why a line cannot be bought right now. Three cases, because the cart says
 * three different things: one offers another size, one offers fewer, and one
 * has no remedy at all — the window shut.
 */
export type LineIssue =
  | { kind: "SOLD_OUT" }
  | { kind: "SHORT"; available: number }
  | { kind: "DROP_CLOSED"; dropNo: number };

export interface ResolvedLine {
  key: string;
  line: CartLine;
  product: Product;
  /** Units left in this exact colour and size. */
  available: number;
  lineTotalVnd: number;
  issue: LineIssue | null;
}

export interface ResolvedCart {
  lines: ResolvedLine[];
  /** Lines whose product has left the catalog entirely. Dropped, not shown. */
  unknown: CartLine[];
}

/**
 * Join the cart to the catalog and judge every line.
 *
 * `now` is a parameter and not a call to `demoNow()` inside, because whether
 * a line can be bought depends on the clock: a drop is a window, and a cart
 * left open across the closing bell is holding something that is no longer
 * for sale even though the shelf still shows units. Passing the instant in
 * keeps that testable instead of true-until-next-Tuesday.
 */
export function resolveCart(catalog: Catalog, now: Date, cart: Cart): ResolvedCart {
  const lines: ResolvedLine[] = [];
  const unknown: CartLine[] = [];

  for (const line of cart) {
    const product = catalog.byId.get(line.productId);
    if (!product) {
      unknown.push(line);
      continue;
    }
    const available = onHandOf(product, line.color, line.size);
    const drop = getDrop(catalog, product.dropNo);
    const dropOpen = drop ? dropState(drop, now) === "OPEN" : false;

    lines.push({
      key: lineKey(line),
      line,
      product,
      available,
      lineTotalVnd: product.priceVnd * line.qty,
      // Sold out is reported ahead of a closed drop on purpose: it is the
      // more useful sentence, because it points at another size. "Số đã
      // đóng" points at nothing the shopper can do on this screen.
      issue:
        available === 0
          ? { kind: "SOLD_OUT" }
          : !dropOpen
            ? { kind: "DROP_CLOSED", dropNo: product.dropNo }
            : available < line.qty
              ? { kind: "SHORT", available }
              : null,
    });
  }

  return { lines, unknown };
}

/**
 * The goods, counting only what can actually be bought.
 *
 * A blocked line is left out on purpose: the approved cart screen reads
 * "Tạm tính · 1 món" beside "Món đang vướng — chưa tính". Quoting a total
 * that includes something the shopper cannot pay for would be a number that
 * changes under them at the next step.
 */
export function cartSubtotalVnd(lines: ResolvedLine[]): number {
  return lines.reduce((n, l) => (l.issue ? n : n + l.lineTotalVnd), 0);
}

export function buyableUnits(lines: ResolvedLine[]): number {
  return lines.reduce((n, l) => (l.issue ? n : n + l.line.qty), 0);
}

/** Any blocked line shuts checkout. The shopper resolves it, not us. */
export function hasBlockingIssue(lines: ResolvedLine[]): boolean {
  return lines.some((l) => l.issue !== null);
}

/** Sizes of the same colourway that could be swapped to. Powers "Đổi sang size L". */
export function swapSizesFor(catalog: Catalog, line: CartLine): Size[] {
  const p = catalog.byId.get(line.productId);
  if (!p) return [];
  return SIZES.filter((s) => s !== line.size && onHandOf(p, line.color, s) > 0);
}

// ─────────────────────────────────────────────────────────────── persistence
/**
 * Storage format, versioned.
 *
 * The version is not ceremony. Stock became colour-major during Phase 1, so a
 * cart written by any earlier build has lines with no colour on them. Reviving
 * one would mean this code picking a colourway on the shopper's behalf and
 * putting it in their basket. A payload that is not `v: 1` is dropped whole.
 */
export const CART_STORAGE_KEY = "brand.cart";
const SCHEMA_VERSION = 1;

interface StoredCart {
  v: number;
  lines: unknown[];
}

export function serializeCart(cart: Cart): string {
  return JSON.stringify({ v: SCHEMA_VERSION, lines: cart } satisfies StoredCart);
}

/**
 * Read a cart back. Never throws: this runs on the first paint of every page,
 * and a browser that once held a bad value would otherwise be locked out of
 * the whole site until someone cleared their storage by hand.
 *
 * Each line is checked field by field rather than cast. Everything in
 * `localStorage` is input — another tab, an older build, or a fat finger in
 * devtools can all have written it.
 */
export function parseCart(raw: string | null): Cart {
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

  return parsed.lines.filter(isStoredLine).map((l) => ({
    productId: productId(l.productId),
    color: l.color,
    size: l.size,
    qty: l.qty,
  }));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStoredLine(
  v: unknown,
): v is { productId: string; color: ColorKey; size: Size; qty: number } {
  if (!isRecord(v)) return false;
  return (
    typeof v.productId === "string" &&
    v.productId.length > 0 &&
    typeof v.color === "string" &&
    (COLOR_KEYS as readonly string[]).includes(v.color) &&
    typeof v.size === "string" &&
    (SIZES as readonly string[]).includes(v.size) &&
    typeof v.qty === "number" &&
    Number.isInteger(v.qty) &&
    v.qty > 0
  );
}
