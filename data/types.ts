/**
 * The data contract for the whole storefront.
 *
 * These types were first served from local fixtures; since the backend slices
 * (QĐ-25) the catalogue, the accounts and the orders come out of Postgres, and
 * the fixtures in `data/` are what the database is seeded from. The contract
 * did not move: the database has to produce exactly these shapes, so treat
 * this file as the wire format rather than as convenience types:
 *
 *   · enum-like values are UPPER_SNAKE string literals, never free `string`
 *   · ids are branded, so a CustomerId cannot be passed where a ProductId goes
 *   · money is an integer count of đồng and every field says so in its name
 *   · nothing derivable is stored — `sold`, `remaining` and a drop's state are
 *     computed in `lib/`, because a stored copy is a copy that goes stale
 *
 * Vietnamese survives in exactly one place: fields whose value is shown to a
 * shopper as-is (`name`, `kind`, `material`, `details`, a colour's `label`).
 * Everything else is English. Since round v6 a style and a teaser also carry
 * those words in English, in `en` (`ProductEn`, `TeaserEn`).
 */

// ─────────────────────────────────────────────────────────────── branded ids
// A bare `string` id lets any id go anywhere. The brand is erased at runtime
// and costs nothing; it exists so the compiler rejects the mix-up.
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

export type ProductId = Brand<string, "ProductId">;
export type CustomerId = Brand<string, "CustomerId">;
export type AddressId = Brand<string, "AddressId">;
export type OrderCode = Brand<string, "OrderCode">;
export type PromoCode = Brand<string, "PromoCode">;

export const productId = (v: string) => v as ProductId;
export const customerId = (v: string) => v as CustomerId;
export const addressId = (v: string) => v as AddressId;
export const orderCode = (v: string) => v as OrderCode;
export const promoCode = (v: string) => v as PromoCode;

// ──────────────────────────────────────────────────────────── product basics
export const SIZES = ["S", "M", "L", "XL"] as const;
export type Size = (typeof SIZES)[number];

export const COLOR_KEYS = [
  "black",
  "cream",
  "grey",
  "moss",
  "brown",
  "white",
  "navy",
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

/** A fabric colour. `label` is shown to the shopper, so it stays Vietnamese. */
export interface Color {
  key: ColorKey;
  label: string;
  hex: string;
}

/**
 * What kind of garment it is, at the level a shopper browses by.
 *
 * Separate from `kind`, which is the full description shown on the card
 * ("Áo hoodie in", "Áo thun tay lỡ"). The open drop has nine distinct kinds
 * and four of them differ only by a cut, so `kind` is the wrong thing to
 * group or filter by. Deriving the family from `kind` by taking its first
 * words was tried and is wrong too: it turns "Áo sơ mi dệt" into "áo sơ".
 */
export const FAMILIES = ["TEE", "HOODIE", "JACKET", "VEST", "SHIRT", "PANTS"] as const;
export type Family = (typeof FAMILIES)[number];

/** Shown as-is. Each label is also a substring of every `kind` in its family,
 *  which is what lets a suggestion chip search for it and find something. */
export const FAMILY_LABELS: Record<Family, string> = {
  TEE: "Áo thun",
  HOODIE: "Áo hoodie",
  JACKET: "Áo khoác",
  VEST: "Áo gile",
  SHIRT: "Áo sơ mi",
  PANTS: "Quần",
};

/**
 * The same six, for a row where they stand side by side — the nav bar and
 * the home page's family tiles.
 *
 * "Áo hoodie · Áo khoác · Áo sơ mi" repeats "Áo" three times across one bar
 * and the repetition is the only thing the eye picks up. Shown as-is, and
 * kept beside `FAMILY_LABELS` so the two cannot drift into naming different
 * things.
 */
export const FAMILY_SHORT_LABELS: Record<Family, string> = {
  TEE: "Áo thun",
  HOODIE: "Hoodie",
  JACKET: "Khoác",
  VEST: "Gile",
  SHIRT: "Sơ mi",
  PANTS: "Quần",
};

export type Fit = "OVERSIZE" | "REGULAR";

/**
 * On-hand units, colour-major.
 *
 * Colour-major and not size-only: a shopper can switch colour inside the size
 * sheet, so "hết XL" is not true enough — "hết XL màu đen" is. Every colour in
 * `Product.colors` must appear here with all four sizes, zero included; the
 * catalog test enforces that, since a missing key and a zero look the same at
 * the call site but mean very different things.
 */
export type Stock = Partial<Record<ColorKey, Record<Size, number>>>;

/**
 * A style's words in English (round v6, slice B15), each beside the
 * Vietnamese field it translates. Every field is optional on its own, and a
 * missing one means "print the Vietnamese": the issues' styles keep their
 * Vietnamese `name`, a back-office edit drops the English of exactly the
 * field it changed (`admin_update_product`), and a style the back office
 * creates has none. Read it through `productText` (`lib/product-text.ts`).
 */
export interface ProductEn {
  name?: string;
  kind?: string;
  material?: string;
  /** Line for line with `details`, in the same order. */
  details?: readonly string[];
}

export interface Product {
  id: ProductId;
  /** URL segment. Shows up in the address bar, so it is Vietnamese and stable. */
  slug: string;
  /** Shown as-is. */
  name: string;
  /** Shown as-is, e.g. "Áo hoodie". The full description, not the family. */
  kind: string;
  /** What a shopper browses by. Not derivable from `kind` — see FAMILIES. */
  family: Family;
  /** Shown as-is, e.g. "Nỉ bông 380gsm". */
  material: string;
  fit: Fit;
  priceVnd: number;
  colors: ColorKey[];
  /**
   * How many units were cut for this issue. For an issue's style it is never
   * restocked — that is the model.
   *
   * Null for a FIXED style (slice B5): a basic that belongs to no issue, sells
   * at any hour and has sizes brought back when they run out ("Nhập thêm"),
   * so there is no cut to count against. `dropNo` and `cutUnits` are null
   * together or not at all; the database checks the pair.
   */
  cutUnits: number | null;
  /** The issue the style was cut for; null for a fixed style. */
  dropNo: number | null;
  /**
   * When the last unit went — the shop's own record, for a style that is
   * over. Never set on a fixed style: its shelf running out is "tạm hết",
   * not the end of it.
   *
   * NOT derivable from `ORDERS`: that file is an explicit recent SAMPLE, so
   * for most styles it accounts for a handful of the units cut and the hour
   * the shelf emptied is simply not in it. It is a fact the shop keeps, like
   * `cutUnits`, so it is kept here — and `lib/sold-out-times.ts` still
   * prefers to DERIVE it from paid orders where the orders can prove it,
   * falling back to this, and printing nothing when neither can answer.
   *
   * Only ever set on a style with nothing left, and only inside its own
   * issue's window; `catalog.test.ts` pins both.
   */
  soldOutAt?: string;
  /**
   * When each colour last sold (backend slice B12), for the Feed inbox's
   * "BỤI đen còn 1 chiếc": per colour the style comes in, the moment the most
   * recent order still in force that took a piece of it was placed — not a
   * cancelled order, nor a transfer past its hold — or null for a colour
   * nobody has bought. One instant per colour and nothing else about any
   * order: no code, no quantity, no buyer.
   *
   * Read off the orders by the database every time the catalogue is read
   * (`catalog_last_sold()`), never stored, so the fixture has none. Absent on
   * a style from the fixture or from a database the B12 migration has not
   * reached; a colour missing from it reads as null too. Read it with
   * `lastSoldAtOf` (`lib/inventory.ts`).
   */
  lastSoldAt?: Partial<Record<ColorKey, string | null>>;
  stock: Stock;
  /**
   * The photo of each colour, in band order: a key `lib/photos.ts` turns into
   * a URL — the style's own photograph shipped with the app (`shot-…`, Số 05
   * since v3 slice 14), one the back office uploaded (`up/…`), a fixed
   * style's flat drawing (`flat-…`), or a borrowed stand-in where no
   * photograph exists yet. The first colour's photo is the style's cover.
   */
  photoKeys: string[];
  /**
   * How the garment is made, one line each and shown as-is, in the order
   * they are printed: "Vai rơi, thân rộng", "Cổ bo gân 2,5 cm", where the
   * print sits (backend slice B6, for the Feed screens — the wide card on the
   * home page lists them, the product page has a "Chi tiết" section).
   *
   * Each line comes from the garment brief the style's photos were made from
   * (`tasks/anh-san-pham-prompt.md`), as the Feed mock prints it
   * (`prototype/explore/shared/data.js`): a fact about the cut, not copy
   * written to sell it. The mock prints them for Số 05 alone, so only Số 05
   * has any; every other style carries an empty list — written out, never
   * absent — and so does every style the back office creates, since its form
   * has no field for them.
   */
  details: string[];
  /** The English of `name`, `kind`, `material`, `details`; absent when there is none at all. */
  en?: ProductEn;
}

// ─────────────────────────────────────────────────────────────────── the drop
/**
 * A selling window. The state is NOT stored — `dropState()` derives it from
 * these two instants, so a drop cannot sit in the wrong state because someone
 * forgot to flip a flag.
 */
export interface Drop {
  no: number;
  opensAt: string;
  closesAt: string;
}

export type DropState = "UPCOMING" | "OPEN" | "CLOSED";

/**
 * A style announced for a drop that has not opened yet.
 *
 * Deliberately NOT a `Product`. A teaser has no price and no stock, because
 * neither has been published — the upcoming-drop screen says so in as many
 * words: "Giá và số lượng công bố đúng lúc mở". Forcing it into `Product`
 * would mean writing `priceVnd: 0` and an empty stock table, which read as
 * "free" and "sold out" at every call site that does not know better.
 */
export interface Teaser {
  slug: string;
  /** Shown as-is. */
  name: string;
  /** Shown as-is, e.g. "Áo khoác dù". */
  kind: string;
  family: Family;
  dropNo: number;
  photoKey: string;
  /**
   * When it was announced (backend slice B12), for the Feed inbox's "Số 06
   * công bố: SỎI và NGÓI": the moment the back office added it, or for a
   * sample teaser the fixture's own, authored by the mock's offset
   * (`TEASER_LEAD_HOURS` in `data/catalog.ts`) and moved by every reset with
   * the rest of the sample. Null when nobody recorded one — a teaser from a
   * database the B12 migration has not reached.
   */
  announcedAt: string | null;
  /** The English of `name` and `kind` (slice B15, as `ProductEn`); absent when there is none. */
  en?: TeaserEn;
}

/** A teaser's words in English; a missing field prints the Vietnamese. Read it through `teaserText`. */
export interface TeaserEn {
  name?: string;
  kind?: string;
}

// ───────────────────────────────────────────────────────────────── customers
/**
 * What an address is CALLED, and the only three names it can have.
 *
 * Three and not free text: the address book stores one of them and several
 * screens read it back (the picker's first line, the chips in the form), so
 * a typed "nhà riêng" would be a value nothing else in the app understands.
 *
 * It lives here rather than in `lib/account-form.ts` because it became a
 * DATA field at v3 slice 3 — `data/customers.ts` carries it. The form module
 * re-exports both names, so every existing import still reads.
 */
export const ADDRESS_LABELS = ["Nhà", "Công ty", "Khác"] as const;
export type AddressLabel = (typeof ADDRESS_LABELS)[number];

/**
 * Two tiers, not three. Since 1 July 2025 Vietnam has cấp tỉnh and cấp xã
 * only — the district level was abolished, so there is no `districtCode` to
 * store. See `data/regions.ts`.
 */
export interface Address {
  id: AddressId;
  recipient: string;
  phone: string;
  /** House number and street. */
  line: string;
  provinceCode: string;
  wardCode: string;
  /** "Nhà" · "Công ty" · "Khác" — what the shopper calls this place. */
  label: AddressLabel;
  isDefault: boolean;
}

export interface Customer {
  id: CustomerId;
  name: string;
  email: string;
  phone: string;
  addresses: Address[];
  joinedAt: string;
}

// ─────────────────────────────────────────────────── what an account keeps
// Slice B9. Four things the signed-in shopper keeps — saved styles, issue
// reminders, "Size của tôi" and the notification switches — which lived in
// `localStorage` until the Feed round moved them onto the account
// (`supabase/migrations/20260929120000_account_state.sql`). `getMyState()`
// (`lib/db/my-state.ts`) reads all four at once, and every write answers with
// the whole of it again.

/**
 * The four switches under "Nhận thông báo về", by the Feed mock's own keys
 * (`notifications.js`, PREFS): an order moving, a new issue, a saved style
 * running low, a code about to expire. All four start on.
 */
export const NOTIFY_KEYS = ["order", "drop", "wishlist", "promo"] as const;
export type NotifyKey = (typeof NOTIFY_KEYS)[number];
export type NotifySwitches = Record<NotifyKey, boolean>;

/** "Size của tôi" has two: one for tops (áo) and one for trousers (quần). */
export const SIZE_SLOTS = ["top", "bottom"] as const;
export type SizeSlot = (typeof SIZE_SLOTS)[number];

/**
 * Null is "not set" — the honest default, since a shop that guesses a size is
 * a shop that adds the wrong one to a cart.
 */
export type MySizes = Record<SizeSlot, Size | null>;

/**
 * One saved style: which one, in which of its colours, and when.
 *
 * `savedAt` is null when the moment is unknown: the styles the demo seed puts
 * on the first demo account were never saved by anybody at any recorded
 * instant (the mock lists them without one), in the same way `WishEntry.at`
 * in `lib/wishlist.ts` is absent on an entry older than the stamp.
 */
export interface Favorite {
  productId: ProductId;
  color: ColorKey;
  savedAt: string | null;
}

export interface MyState {
  /** Newest first, as the list reads. */
  favorites: Favorite[];
  /**
   * The issues this account asked to be told about, ascending — only those
   * that have not opened yet; an issue that has opened drops out by itself.
   */
  reminders: number[];
  sizes: MySizes;
  notify: NotifySwitches;
}

// ──────────────────────────────────────────────────────────────────── orders
export type PaymentMethod = "BANK_TRANSFER" | "CARD" | "COD";

/**
 * How the parcel travels. Defined here since slice B2, when it became a field
 * of `Order` and a column of `orders`; `lib/shipping.ts` re-exports it, so
 * every existing import still reads.
 */
export type DeliveryMethod = "STANDARD" | "EXPRESS";

/**
 * Order state as a discriminated union rather than a flat enum, because the
 * states do not carry the same information: only a shipped order has a
 * tracking code, only a cancelled one has a reason. A flat enum would force
 * every consumer to handle `trackingCode?: string` on a pending order.
 *
 * `RECEIVED` joined at slice B2: an order the shop has taken and nobody has
 * paid for yet — every COD order. Until then only an order kept in the
 * browser could be in it; now the database issues it, and calling such an
 * order `PAID` would be the screen claiming money changed hands. A card order
 * was RECEIVED too until slice B7; no card gateway is connected, so since B7
 * a card order pays by transfer and waits in `AWAITING_TRANSFER` like one
 * (`lib/orders.ts#paysByTransfer`).
 *
 * `carrier` joined `SHIPPING` at slice B3a, when the back office's handover
 * started writing to the database: the delivery service the parcel went by,
 * typed at handover (no shipping partner is signed, so it is one of the
 * services the shop sells, not a courier's name). Optional, because the
 * sample orders were handed over before anybody recorded one.
 */
export type OrderStatus =
  | { state: "AWAITING_TRANSFER"; dueAt: string }
  | { state: "RECEIVED" }
  | { state: "PAID"; paidAt: string }
  | { state: "SHIPPING"; shippedAt: string; trackingCode: string; carrier?: string }
  | { state: "DELIVERED"; deliveredAt: string }
  | { state: "CANCELLED"; cancelledAt: string; reason: string };

export type OrderState = OrderStatus["state"];

/**
 * When the order passed each step of its journey that has a moment of its
 * own — paid, handed to the courier, delivered — as far as the shop recorded
 * it. Backend slice B10, for the Feed order page, whose steps carry a time
 * under every one already passed (`stepModel` in
 * `prototype/explore/feed/account.js`).
 *
 * `status` keeps only the moment of the state the order is IN, so an order on
 * its way would forget when it was paid; this keeps them all, the current
 * one included. A step not passed has no moment, and neither does COD's
 * payment: it pays at the door. The sample orders in `data/orders.ts` carry
 * the steps they passed by one rule taken from the Feed mock's own orders,
 * written beside them. The placing is `placedAt`, a cancellation
 * `status.cancelledAt`.
 *
 * Optional on `Order`, and absent rather than `{}` when there is none, like
 * `promo`: an order read from a database from before B10 simply has none, and
 * a reader falls back to the status's own moment.
 */
export interface OrderMoments {
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface OrderLine {
  productId: ProductId;
  size: Size;
  color: ColorKey;
  qty: number;
  /** Price at the time of ordering — not looked up from the product now. */
  unitPriceVnd: number;
}

export interface Order {
  code: OrderCode;
  /**
   * The demo account the order belongs to, by its fixture id ('c-minhanh'),
   * or "" for an order placed signed out or by an account made through the
   * sign-up form. Never an auth uuid: an order read through the public lookup
   * must not carry its owner's account id with it.
   */
  customerId: CustomerId;
  lines: OrderLine[];
  status: OrderStatus;
  payment: PaymentMethod;
  delivery: DeliveryMethod;
  shippingFeeVnd: number;
  /** Cash-on-delivery handling, its own line on every receipt. 0 otherwise. */
  codFeeVnd: number;
  discountVnd: number;
  /**
   * Frozen copy — the shopper's address book may change after the order
   * ships. Without the nickname: "Công ty" is how somebody files an address
   * in their own book, not something a courier reads.
   */
  shipTo: Omit<Address, "id" | "isDefault" | "label">;
  /**
   * Where a confirmation would go: the e-mail typed at checkout, or null when
   * none was. Optional since slice B8, as the Feed checkout has it
   * ("tuỳ chọn"); no e-mail is sent yet (QĐ-35). Null rather than "" — the
   * column stores none as NULL — so a reader cannot print an empty line by
   * mistaking "" for an address.
   */
  email: string | null;
  /** What was typed for the courier at checkout, or "". */
  note: string;
  placedAt: string;
  promo?: PromoCode;
  /** Every step's recorded moment (slice B10); absent when none was. See `OrderMoments`. */
  moments?: OrderMoments;
}

// ──────────────────────────────────────────────────────────────── promotions
export type Promotion =
  | { code: PromoCode; kind: "PERCENT"; percent: number; maxDiscountVnd?: number } & PromoWindow
  | { code: PromoCode; kind: "AMOUNT"; amountVnd: number } & PromoWindow
  | { code: PromoCode; kind: "FREE_SHIPPING" } & PromoWindow;

export interface PromoWindow {
  startsAt: string;
  endsAt: string;
  /** Null means unlimited. */
  usageLimit: number | null;
  usedCount: number;
  minOrderVnd?: number;
  /**
   * Stopped by the shop without touching its dates (slice B3b): checkout
   * refuses the code until it is resumed, and the back office reads it as
   * "Tạm dừng". Pausing is not ending — one can be taken back — which is why
   * it is a flag and not a moved `endsAt`. Absent rather than `false` when the
   * code is running, like `minOrderVnd`: the fixture pauses nothing.
   */
  paused?: boolean;
}
