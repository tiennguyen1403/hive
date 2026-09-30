import { COLORS } from "@/data/colors";
import type {
  ColorKey,
  Favorite,
  MyState,
  Order,
  Product,
  ProductId,
  Size,
  SizeSlot,
} from "@/data/types";
import type { Catalog } from "./catalog";
import { dayMonth, dayMonthYear } from "./datetime";
import { dropCalendar, dropState } from "./drop";
import { canBuy, firstColor, isGone, isLive, isOver, sizesIn } from "./feed";
import { canReturn, linePicture, returnUntil } from "./feed-account";
import { dateParts } from "./feed-home";
import { PASSWORD_LENGTH } from "./feed-sign-in";
import { isFixed, isSoldOut, onHandByColor, LOW_STOCK_AT } from "./inventory";
import { issueLabel } from "./lexicon";
import { DEFAULT_NOTIFY } from "./my-state";

/**
 * What the Feed prints about the shopper's own things (round v4 slice 3b):
 * Tôi, Hồ sơ, Yêu thích, and the heart, "Nhắc tôi" and "Size của tôi" on
 * every Feed screen — the approved mock's rules and words
 * (`prototype/explore/feed/me.js`, `profile.js`, `favorites.js`, and in
 * `feed.js` the parts `favorites`, `reminders`, `mySize`, `sizeLabel`,
 * `askSignIn`) over the account the database keeps (slice B9, `MyState`).
 *
 * Pure and safe for the browser, like `lib/feed-account.ts`: the screens draw
 * from it, the optimistic updates are made with it, and the password
 * sheet's action checks with the very rules the sheet checks with. Every
 * function that depends on the time is handed `now`.
 */

// ─────────────────────────────────────────────────────────── the state, before the server answers

/**
 * What a signed-in account keeps when the read failed (`getMyState()` answers
 * null for it as well as for nobody): nothing saved yet, as far as the screen
 * can tell. The first write answers with the real state.
 */
export const EMPTY_MY_STATE: MyState = {
  favorites: [],
  reminders: [],
  sizes: { top: null, bottom: null },
  notify: DEFAULT_NOTIFY,
};

/** Whether a style is saved, in any of its colours (the mock's `favorites.has`). */
export function isSaved(state: MyState | null, id: ProductId): boolean {
  return state !== null && state.favorites.some((f) => f.productId === id);
}

/**
 * The heart pressed on a style that is not saved: it goes to the top of the
 * list, in the colour shown (the mock's `favorites.add`). One already saved
 * stays where it is — the database answers the same (`save_favorite`).
 */
export function withFavorite(state: MyState, id: ProductId, color: ColorKey): MyState {
  if (isSaved(state, id)) return state;
  return { ...state, favorites: [{ productId: id, color, savedAt: null }, ...state.favorites] };
}

/** The filled heart: the style off the list (`favorites.remove`). */
export function withoutFavorite(state: MyState, id: ProductId): MyState {
  if (!isSaved(state, id)) return state;
  return { ...state, favorites: state.favorites.filter((f) => f.productId !== id) };
}

/**
 * "Hoàn tác": the style just unsaved, back where it stood (`favorites.save(before)`).
 * The database puts back the row it kept aside (`restore_favorite`); this is
 * the same place, drawn before it answers.
 */
export function withFavoriteBack(state: MyState, fav: Favorite, at: number): MyState {
  if (isSaved(state, fav.productId)) return state;
  const list = [...state.favorites];
  list.splice(Math.max(0, Math.min(at, list.length)), 0, fav);
  return { ...state, favorites: list };
}

/** Whether "Nhắc tôi" is on for an issue (`reminders.has`). */
export function hasReminder(state: MyState | null, no: number): boolean {
  return state !== null && state.reminders.includes(no);
}

/** "Nhắc tôi" turned on or off; the list stays ascending, each issue once, as `my_state()` answers it. */
export function withReminder(state: MyState, no: number, on: boolean): MyState {
  const rest = state.reminders.filter((n) => n !== no);
  return { ...state, reminders: on ? [...rest, no].sort((a, b) => a - b) : rest };
}

/** A size of "Size của tôi" chosen, or forgotten ("Bỏ chọn"). */
export function withSize(state: MyState, slot: SizeSlot, size: Size | null): MyState {
  return { ...state, sizes: { ...state.sizes, [slot]: size } };
}

// ─────────────────────────────────────────────────────────── Size của tôi

/** Trousers read the size kept for quần, everything else the one for áo (the mock's `mySize`). */
export function sizeSlotOf(p: Pick<Product, "family">): SizeSlot {
  return p.family === "PANTS" ? "bottom" : "top";
}

/** The remembered size for this style, or none — and none at all while signed out. */
export function mySizeOf(state: MyState | null, p: Pick<Product, "family">): Size | null {
  return state ? state.sizes[sizeSlotOf(p)] : null;
}

/** "áo" · "quần", as Hồ sơ's toasts say them. */
export const SIZE_SLOT_WORD: Readonly<Record<SizeSlot, string>> = { top: "áo", bottom: "quần" };

/** The toast after a size is picked or cleared on Hồ sơ: "Size áo: L", "Đã bỏ size quần" (`profile.js`). */
export function sizeToast(slot: SizeSlot, size: Size | null): string {
  return size ? `Size ${SIZE_SLOT_WORD[slot]}: ${size}` : `Đã bỏ size ${SIZE_SLOT_WORD[slot]}`;
}

// ─────────────────────────────────────────────────────────── Tôi: who

/** "03/2026": the month the account was made (`monthYear`). */
export function memberSince(iso: string): string {
  return dayMonthYear(iso).slice(3);
}

// ─────────────────────────────────────────────────────────── Tôi: the order that needs the shopper now

/**
 * What "Đơn hàng" on Tôi shows (`me.js`), from the account's orders newest
 * first, each already in the state the clock says it is in:
 *
 * · `none` — no order at all: "Chưa có đơn nào";
 * · `live` — the order that needs the shopper (a transfer awaited, a card
 *   order's too, else a COD order before the shop's call), and beside it the
 *   parcel on its way (shipping, else paid): either may be missing, not both;
 * · `return` — nothing running: the delivered order whose return window
 *   closes soonest, while it is open;
 * · `quiet` — none of those: "Không có đơn đang xử lý".
 */
export type MeNow =
  | { kind: "none" }
  | { kind: "live"; primary: Order | null; moving: Order | null }
  | { kind: "return"; order: Order; until: string }
  | { kind: "quiet" };

export function meNow(orders: readonly Order[], now: Date): MeNow {
  if (orders.length === 0) return { kind: "none" };
  const first = (state: Order["status"]["state"]) => orders.find((o) => o.status.state === state) ?? null;
  const primary = first("AWAITING_TRANSFER") ?? first("RECEIVED");
  const moving = first("SHIPPING") ?? first("PAID");
  if (primary || moving) return { kind: "live", primary, moving };
  const open = orders
    .filter((o) => canReturn(o, now))
    .map((o) => ({ order: o, until: returnUntil(o)! }))
    .sort((a, b) => Date.parse(a.until) - Date.parse(b.until));
  return open[0] ? { kind: "return", ...open[0] } : { kind: "quiet" };
}

// ─────────────────────────────────────────────────────────── Tôi: the four tiles

/** The colour a saved style is kept in: the one saved, while the style still comes in it; else the card's. */
export function savedColor(p: Product, fav: Pick<Favorite, "color">): ColorKey {
  return p.colors.includes(fav.color) ? fav.color : firstColor(p);
}

/** A saved style and the catalogue's style behind it, the ones the catalogue no longer has left out. */
export interface SavedStyle {
  fav: Favorite;
  product: Product;
  color: ColorKey;
}

export function savedStyles(catalog: Catalog, favorites: readonly Favorite[]): SavedStyle[] {
  const out: SavedStyle[] = [];
  for (const fav of favorites) {
    const product = catalog.byId.get(fav.productId);
    if (product) out.push({ fav, product, color: savedColor(product, fav) });
  }
  return out;
}

/** How many saved styles the Yêu thích tile shows (`favTile`: `favs.slice(0, 4)`). */
export const FAV_TILE_MAX = 4;

/**
 * One picture of the Yêu thích tile: the saved colour's packshot, a fixed
 * style's flat drawing, or — for a style whose frame is only borrowed (Số 03,
 * Số 04) — an empty plate, as the mock leaves a style it has no photo of.
 * "ĐÃ HẾT" when that colour has nothing left.
 */
export interface FavThumb {
  product: Product;
  color: ColorKey;
  src: string | null;
  flat: boolean;
  sold: boolean;
}

export function favThumbs(saved: readonly SavedStyle[]): FavThumb[] {
  return saved.slice(0, FAV_TILE_MAX).map(({ product, color }) => {
    const src = linePicture(product, color);
    const flat = isFixed(product);
    return { product, color, src, flat, sold: !flat && src !== null && onHandByColor(product, color) === 0 };
  });
}

/**
 * The one stock fact worth a glance on the tile: among the styles it shows, the
 * saved colour of a style still selling with three or fewer left, fewest first
 * — "BỤI đen còn 1" (`favTile`'s `alert`). Nothing otherwise.
 */
export function favAlert(catalog: Catalog, saved: readonly SavedStyle[], now: Date): string | null {
  const low = saved
    .slice(0, FAV_TILE_MAX)
    .filter(({ product }) => !isFixed(product) && isLive(catalog, product, now))
    .map(({ product, color }) => ({ product, color, n: onHandByColor(product, color) }))
    .filter((x) => x.n > 0 && x.n <= LOW_STOCK_AT)
    .sort((a, b) => a.n - b.n)[0];
  if (!low) return null;
  return `${low.product.name} ${COLORS[low.color].label.toLocaleLowerCase("vi")} còn ${low.n}`;
}

/**
 * The Nhắc tile (`remindTile`): the first issue asked about, as a date block
 * and "20:00 thứ Sáu, qua app" — the app is the one channel there is
 * (QĐ-35) — or, with none, whether there is an issue to ask about at all.
 */
export type RemindTile =
  | { kind: "set"; no: number; title: string; dd: string; mm: string; line: string }
  | { kind: "none"; text: string };

export function remindTile(catalog: Catalog, reminders: readonly number[], now: Date): RemindTile {
  for (const no of reminders) {
    const drop = catalog.dropByNo.get(no);
    if (!drop || dropState(drop, now) !== "UPCOMING") continue;
    const p = dateParts(drop.opensAt);
    return { kind: "set", no, title: `Nhắc ${issueLabel(no)}`, dd: p.dd, mm: p.mm, line: `${p.time} ${p.dow}, qua app` };
  }
  return { kind: "none", text: dropCalendar(catalog, now).upcoming ? "Chưa bật nhắc" : "Chưa có Số mới" };
}

// ─────────────────────────────────────────────────────────── Yêu thích

/**
 * The line under a saved style's price (`favorites.js`: `stock`), for the
 * colour it was saved in: "Còn N" (the fire at three or fewer), "Hết màu xám"
 * when that colour has gone but the style has not, "Đã đóng 25/09" once its
 * issue has closed. Nothing for a style sold out altogether (its stamp says
 * it), for a fixed style with the colour on the shelf, or for a style whose
 * issue has not opened.
 */
export type WishStock =
  | { kind: "left"; n: number; low: boolean }
  | { kind: "gone"; color: string }
  | { kind: "closed"; day: string };

export function wishStock(catalog: Catalog, p: Product, color: ColorKey, now: Date): WishStock | null {
  const left = onHandByColor(p, color);
  if (!left) return isSoldOut(p) ? null : { kind: "gone", color: COLORS[color].label.toLocaleLowerCase("vi") };
  if (isFixed(p)) return null;
  if (!isLive(catalog, p, now)) {
    const drop = p.dropNo === null ? undefined : catalog.dropByNo.get(p.dropNo);
    return drop && dropState(drop, now) === "CLOSED" ? { kind: "closed", day: dayMonth(drop.closesAt) } : null;
  }
  return { kind: "left", n: left, low: left <= LOW_STOCK_AT };
}

/**
 * One saved style on Yêu thích (`favorites.js`: `card`):
 *
 * · `type` — a style of an older issue with no photo of its own: its name set
 *   in type, the kind and the price, nothing to buy;
 * · `style` — the saved colour's packshot (a fixed style's flat drawing), the
 *   ĐÃ HẾT stamp on a style sold out, the colour and kind, the price, the
 *   stock line, and the four sizes of that colour while it can be bought.
 */
export type WishCard =
  | { kind: "type"; product: Product; fav: Favorite }
  | {
      kind: "style";
      product: Product;
      fav: Favorite;
      color: ColorKey;
      href: string;
      fixed: boolean;
      sold: boolean;
      closed: boolean;
      stock: WishStock | null;
      /** Every size of the colour with what is left of it; null when nothing can be added. */
      sizes: { size: Size; n: number }[] | null;
    };

export function wishCard(catalog: Catalog, s: SavedStyle, now: Date): WishCard {
  const { product: p, fav, color } = s;
  const fixed = isFixed(p);
  if (!fixed && linePicture(p, color) === null) return { kind: "type", product: p, fav };
  const buyable = canBuy(catalog, p, now) && onHandByColor(p, color) > 0;
  return {
    kind: "style",
    product: p,
    fav,
    color,
    href: `/products/${p.slug}?color=${color}`,
    fixed,
    sold: isGone(p),
    closed: isOver(catalog, p, now),
    stock: wishStock(catalog, p, color, now),
    sizes: buyable ? sizesIn(p, color) : null,
  };
}

/** "Size L", "Size M, còn 2", "Size S, hết": a size button's name for a screen reader (`sizes`). */
export function wishSizeLabel(size: Size, n: number): string {
  if (n === 0) return `Size ${size}, hết`;
  return n <= 2 ? `Size ${size}, còn ${n}` : `Size ${size}`;
}

// ─────────────────────────────────────────────────────────── Hồ sơ: the password sheet

/** The sheet's three fields, by the mock's names (`profile.js`: `current`, `next`, `again`). */
export interface PasswordSheet {
  current: string;
  next: string;
  again: string;
}

export type PasswordField = keyof PasswordSheet;

/** The sheet's order: the first wrong field takes the focus. */
export const PASSWORD_FIELDS: readonly PasswordField[] = ["current", "next", "again"];

/**
 * What is wrong with "Đổi mật khẩu", in the mock's words: "Nhập mật khẩu hiện
 * tại", "Mật khẩu mới từ 8 ký tự", "Hai mật khẩu mới chưa khớp". The length
 * alone is asked of the new password, as the sign-up asks it — the v3 rules
 * "có cả chữ và số" and "khác mật khẩu cũ" are gone. Passwords are read as
 * typed, spaces and all.
 */
export function passwordSheetErrors(d: PasswordSheet): Partial<Record<PasswordField, string>> {
  const e: Partial<Record<PasswordField, string>> = {};
  if (!d.current) e.current = "Nhập mật khẩu hiện tại";
  if (d.next.length < PASSWORD_LENGTH) e.next = `Mật khẩu mới từ ${PASSWORD_LENGTH} ký tự`;
  if (!d.again || d.again !== d.next) e.again = "Hai mật khẩu mới chưa khớp";
  return e;
}

/** The first wrong field, in the sheet's order. */
export function firstWrongPassword(errors: Partial<Record<PasswordField, string>>): PasswordField | undefined {
  return PASSWORD_FIELDS.find((f) => errors[f]);
}

/** The line after a current password the auth server refused (the mock draws none; the shortest words). */
export const PASSWORD_WRONG = "Mật khẩu hiện tại chưa đúng";

/** The toast once the password has changed (`profile.js`). */
export const PASSWORD_CHANGED = "Đã đổi mật khẩu";
