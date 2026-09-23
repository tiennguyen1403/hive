/**
 * The data contract for the whole storefront.
 *
 * There is no backend yet, so every one of these types is served from a local
 * fixture. That is temporary; the contract is not. When a real API arrives it
 * has to produce exactly these shapes, so treat this file as the wire format
 * rather than as convenience types for the mock:
 *
 *   · enum-like values are UPPER_SNAKE string literals, never free `string`
 *   · ids are branded, so a CustomerId cannot be passed where a ProductId goes
 *   · money is an integer count of đồng and every field says so in its name
 *   · nothing derivable is stored — `sold`, `remaining` and a drop's state are
 *     computed in `lib/`, because a stored copy is a copy that goes stale
 *
 * Vietnamese survives in exactly one place: fields whose value is shown to a
 * shopper as-is (`name`, `kind`, `material`, a colour's `label`). Everything
 * else is English.
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
  /** How many units were cut for this drop. Never restocked — that is the model. */
  cutUnits: number;
  dropNo: number;
  /**
   * When the last unit went — the shop's own record, for a style that is
   * over.
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
  stock: Stock;
  /**
   * Which borrowed photo stands in for each colour, in band order.
   * Placeholder plumbing: PRODUCT.md records that no real photography exists.
   * When real photos land this field goes away and nothing else moves.
   */
  photoKeys: string[];
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

// ──────────────────────────────────────────────────────────────────── orders
export type PaymentMethod = "BANK_TRANSFER" | "CARD" | "COD";

/**
 * Order state as a discriminated union rather than a flat enum, because the
 * states do not carry the same information: only a shipped order has a
 * tracking code, only a cancelled one has a reason. A flat enum would force
 * every consumer to handle `trackingCode?: string` on a pending order.
 */
export type OrderStatus =
  | { state: "AWAITING_TRANSFER"; dueAt: string }
  | { state: "PAID"; paidAt: string }
  | { state: "SHIPPING"; shippedAt: string; trackingCode: string }
  | { state: "DELIVERED"; deliveredAt: string }
  | { state: "CANCELLED"; cancelledAt: string; reason: string };

export type OrderState = OrderStatus["state"];

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
  customerId: CustomerId;
  lines: OrderLine[];
  status: OrderStatus;
  payment: PaymentMethod;
  shippingFeeVnd: number;
  discountVnd: number;
  /**
   * Frozen copy — the shopper's address book may change after the order
   * ships. Without the nickname: "Công ty" is how somebody files an address
   * in their own book, not something a courier reads.
   */
  shipTo: Omit<Address, "id" | "isDefault" | "label">;
  placedAt: string;
  promo?: PromoCode;
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
}
