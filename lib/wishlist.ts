import { byId } from "@/data/catalog";
import { productId, type Product, type ProductId } from "@/data/types";
import { dropState, getDrop } from "./drop";
import { LOW_STOCK_AT, isSoldOut, onHand } from "./inventory";

/**
 * Saved styles.
 *
 * Only the ids are stored. Everything a card shows — price, stock, whether
 * it has sold out since — is looked up fresh, for the same reason the cart
 * stores only ids: a drop moves while a list sits saved, and a list that
 * remembers "còn 2" is a list that is wrong by tomorrow.
 *
 * A sold-out style stays. The screen says so in as many words: "Mẫu đã hết
 * hàng vẫn được giữ trong danh sách để bạn theo dõi số sau." A wishlist
 * that deletes things is a wishlist nobody trusts.
 */

/**
 * One saved style: which one, and when it was put on the list.
 *
 * `at` arrived at v3 slice 4, because the card now prints "lưu 15/09" and a
 * date nobody recorded cannot be printed. It is OPTIONAL and stays optional:
 * a list written by the older build is a list of bare ids, and the honest
 * reading of it is "saved, moment unknown" rather than a date invented at
 * parse time. The card leaves the stamp off for those.
 */
export interface WishEntry {
  id: ProductId;
  /** ISO, +07:00 like every other instant here. Absent on pre-v3 records. */
  at?: string;
}

export type Wishlist = WishEntry[];

export const WISHLIST_STORAGE_KEY = "brand.wishlist";
const SCHEMA_VERSION = 1;

/**
 * Newest first — the list reads as a history of what caught the eye.
 *
 * `at` is passed in rather than read off the clock here, for the same reason
 * every other module in `lib/` takes `now`: a function that reads the clock
 * cannot be tested at its edges.
 */
export function toggleWish(list: Wishlist, id: ProductId, at?: string): Wishlist {
  if (hasWish(list, id)) return list.filter((x) => x.id !== id);
  return [at ? { id, at } : { id }, ...list];
}

export function hasWish(list: Wishlist, id: ProductId): boolean {
  return list.some((x) => x.id === id);
}

/** When this style was saved, or nothing when the record predates the stamp. */
export function savedAt(list: Wishlist, id: ProductId): string | undefined {
  return list.find((x) => x.id === id)?.at;
}

export interface WishItem {
  product: Product;
  onHand: number;
  soldOut: boolean;
  /** Down to the last few, and the drop is still open to buy them in. */
  low: boolean;
  /** Buyable right now: something left, and its drop still open. */
  buyable: boolean;
  /** When it was saved, when the record carries it. */
  savedAt?: string;
}

export interface ResolvedWishlist {
  items: WishItem[];
  /** Ids whose product has left the catalog. Dropped, not shown. */
  unknown: ProductId[];
  buyable: WishItem[];
}

export function resolveWishlist(now: Date, list: Wishlist): ResolvedWishlist {
  const items: WishItem[] = [];
  const unknown: ProductId[] = [];

  for (const entry of list) {
    const product = byId.get(entry.id);
    if (!product) {
      unknown.push(entry.id);
      continue;
    }
    const drop = getDrop(product.dropNo);
    const open = drop ? dropState(drop, now) === "OPEN" : false;
    const left = onHand(product);
    const soldOut = isSoldOut(product);
    items.push({
      product,
      onHand: left,
      soldOut,
      low: open && !soldOut && left <= LOW_STOCK_AT,
      buyable: open && !soldOut,
      ...(entry.at ? { savedAt: entry.at } : {}),
    });
  }

  return { items, unknown, buyable: items.filter((i) => i.buyable) };
}

/**
 * The band above the list: what is about to disappear.
 *
 * One style gets named, because a name is actionable. Several get counted,
 * because a band listing four names is a band nobody reads. Nothing running
 * out means no band at all rather than a cheerful empty one.
 */
export function wishlistNotice(r: ResolvedWishlist): string | null {
  const low = r.items.filter((i) => i.low);
  if (low.length === 0) return null;
  if (low.length === 1) {
    const one = low[0]!;
    return `${one.product.name} còn ${one.onHand} chiếc`;
  }
  return `${low.length} mẫu còn dưới ${LOW_STOCK_AT + 1} chiếc`;
}

// ─────────────────────────────────────────────────────────────── storage
export function serializeWishlist(list: Wishlist): string {
  return JSON.stringify({
    v: SCHEMA_VERSION,
    ids: list.map((e) => (e.at ? { id: e.id, at: e.at } : e.id)),
  });
}

export function parseWishlist(raw: string | null): Wishlist {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    (parsed as { v?: unknown }).v !== SCHEMA_VERSION
  ) {
    return [];
  }

  const ids = (parsed as { ids?: unknown }).ids;
  if (!Array.isArray(ids)) return [];

  // Deduplicated on the way in: the same card twice is a rendering bug the
  // shopper sees, and the cheapest place to stop it is here.
  //
  // Two shapes are accepted, and the version is NOT bumped for the second
  // one. A bare id is what the build before v3 slice 4 wrote, and it is
  // still a perfectly good saved style — throwing the whole list away to
  // gain a timestamp would lose exactly what the shopper asked to keep. It
  // reads back without `at`, and the card prints no stamp for it.
  const seen = new Set<string>();
  const out: Wishlist = [];
  for (const v of ids) {
    const entry = readEntry(v);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push(entry);
  }
  return out;
}

function readEntry(v: unknown): WishEntry | null {
  if (typeof v === "string") return v ? { id: productId(v) } : null;
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  const id = (v as { id?: unknown }).id;
  if (typeof id !== "string" || !id) return null;
  const at = (v as { at?: unknown }).at;
  return typeof at === "string" && at ? { id: productId(id), at } : { id: productId(id) };
}
