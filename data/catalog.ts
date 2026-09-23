import {
  type Drop,
  type Family,
  type Product,
  type Teaser,
  productId,
} from "./types";

/**
 * Simulated data. There is no real merchandise behind any of this — PRODUCT.md
 * records that the project has no photography, no real product names and no
 * sales history. Every admin screen that shows a number derived from here has
 * to label it "dữ liệu mô phỏng".
 *
 * The figures themselves are carried over unchanged from the approved
 * prototype, and `catalog.test.ts` pins them against it style by style.
 *
 * The fabric colours used to sit at the top of this file. They moved to
 * `data/colors.ts`: the palette is static reference data rather than
 * something an issue publishes, and keeping it here made every screen that
 * only wanted a colour label import the whole catalogue.
 *
 * These lists are the SOURCE. Nothing outside `data/` reads them directly any
 * more — `data/fixture-catalog.ts` turns them into a `Catalog` value and
 * `lib/db/catalog.ts` is the one door the app comes through.
 */

// ─────────────────────────────────────────────────────────────────── drops
export const CURRENT_DROP_NO = 5;

export const DROPS: Drop[] = [
  { no: 3, opensAt: "2026-03-06T20:00:00+07:00", closesAt: "2026-03-20T20:00:00+07:00" },
  { no: 4, opensAt: "2026-06-05T20:00:00+07:00", closesAt: "2026-06-19T20:00:00+07:00" },
  { no: 5, opensAt: "2026-09-11T20:00:00+07:00", closesAt: "2026-09-25T20:00:00+07:00" },
  { no: 6, opensAt: "2026-10-02T20:00:00+07:00", closesAt: "2026-10-16T20:00:00+07:00" },
];

/**
 * Styles announced for a drop that has not opened.
 *
 * No price and no stock: "Giá và số lượng công bố đúng lúc mở" is what the
 * upcoming-drop screen promises, and the data has to keep that promise rather
 * than carry the numbers around invisibly. Photography is borrowed like
 * everywhere else — see `lib/photos.ts`.
 */
export const TEASERS: Teaser[] = [
  { slug: "soi", name: "SỎI", kind: "Áo khoác dù", family: "JACKET", dropNo: 6, photoKey: "suong" },
  { slug: "ngoi", name: "NGÓI", kind: "Áo hoodie in", family: "HOODIE", dropNo: 6, photoKey: "nguoi" },
];

export function teasersIn(dropNo: number): Teaser[] {
  return TEASERS.filter((t) => t.dropNo === dropNo);
}

// ───────────────────────────────────────────────────────────────── styles
/**
 * Every row spells out on-hand units per size AND per colour, zeros included.
 *
 * The prototype tracked stock by size alone, which let the size sheet say
 * "hết XL" but never "hết XL màu đen" — and the shopper can change colour
 * right there in the sheet. Splitting it was done at seed time on purpose:
 * once thirty-odd routes read this shape, changing it costs many times more.
 *
 * Per-size totals still add up to exactly what the prototype showed, so the
 * "còn N · S M L XL" line is unchanged for anyone not looking at colour.
 */
const styles: Array<Omit<Product, "id">> = [
  // ── Drop 05 — open ───────────────────────────────────────────────────
  {
    slug: "khoi",
    name: "KHÓI",
    kind: "Áo thun oversize",
    family: "TEE",
    material: "Cotton 250gsm",
    fit: "OVERSIZE",
    priceVnd: 390_000,
    colors: ["black", "cream"],
    cutUnits: 35,
    dropNo: 5,
    stock: {
      black: { S: 3, M: 4, L: 2, XL: 1 },
      cream: { S: 2, M: 2, L: 2, XL: 1 },
    },
    photoKeys: ["khoi", "reu"],
  },
  {
    slug: "bui",
    name: "BỤI",
    kind: "Áo hoodie",
    family: "HOODIE",
    material: "Nỉ bông 380gsm",
    fit: "OVERSIZE",
    priceVnd: 890_000,
    colors: ["black", "grey"],
    cutUnits: 18,
    dropNo: 5,
    stock: {
      black: { S: 0, M: 0, L: 1, XL: 0 },
      grey: { S: 0, M: 0, L: 0, XL: 1 },
    },
    photoKeys: ["bui", "tro"],
  },
  {
    slug: "nguoi",
    name: "NGUỘI",
    kind: "Áo hoodie in",
    family: "HOODIE",
    material: "Nỉ bông 380gsm",
    fit: "OVERSIZE",
    priceVnd: 1_290_000,
    colors: ["black"],
    cutUnits: 12,
    dropNo: 5,
    stock: { black: { S: 1, M: 2, L: 1, XL: 1 } },
    photoKeys: ["nguoi"],
  },
  {
    slug: "nang",
    name: "NẮNG",
    kind: "Áo thun",
    family: "TEE",
    material: "Cotton 220gsm",
    fit: "REGULAR",
    priceVnd: 450_000,
    colors: ["white", "cream", "moss"],
    cutUnits: 26,
    dropNo: 5,
    stock: {
      white: { S: 1, M: 2, L: 1, XL: 1 },
      cream: { S: 1, M: 1, L: 1, XL: 1 },
      moss: { S: 1, M: 1, L: 1, XL: 0 },
    },
    photoKeys: ["nang", "song", "vo"],
  },
  {
    slug: "suong",
    name: "SƯƠNG",
    kind: "Áo khoác dù",
    family: "JACKET",
    material: "Dù chống nước 2 lớp",
    fit: "OVERSIZE",
    priceVnd: 1_450_000,
    colors: ["black", "moss"],
    cutUnits: 8,
    dropNo: 5,
    stock: {
      black: { S: 0, M: 1, L: 0, XL: 1 },
      moss: { S: 0, M: 0, L: 1, XL: 0 },
    },
    photoKeys: ["suong", "mua"],
  },
  {
    slug: "muoi",
    name: "MUỐI",
    kind: "Quần jogger",
    family: "PANTS",
    material: "Nỉ da cá 320gsm",
    fit: "REGULAR",
    priceVnd: 690_000,
    colors: ["black", "grey"],
    cutUnits: 14,
    dropNo: 5,
    stock: {
      black: { S: 0, M: 0, L: 0, XL: 0 },
      grey: { S: 0, M: 0, L: 0, XL: 0 },
    },
    photoKeys: ["muoi", "kho"],
  },
  {
    slug: "than",
    name: "THAN",
    kind: "Áo khoác bomber",
    family: "JACKET",
    material: "Dù chần bông",
    fit: "OVERSIZE",
    priceVnd: 1_350_000,
    colors: ["black", "navy"],
    cutUnits: 10,
    dropNo: 5,
    stock: {
      black: { S: 1, M: 1, L: 1, XL: 0 },
      navy: { S: 0, M: 1, L: 1, XL: 1 },
    },
    photoKeys: ["than", "dat"],
  },
  {
    slug: "cat",
    name: "CÁT",
    kind: "Áo thun tay lỡ",
    family: "TEE",
    material: "Cotton 240gsm",
    fit: "OVERSIZE",
    priceVnd: 420_000,
    colors: ["cream", "white", "brown"],
    cutUnits: 31,
    dropNo: 5,
    stock: {
      cream: { S: 2, M: 2, L: 2, XL: 1 },
      white: { S: 1, M: 2, L: 1, XL: 1 },
      brown: { S: 1, M: 1, L: 1, XL: 0 },
    },
    photoKeys: ["cat", "lua", "reu"],
  },
  {
    slug: "gio",
    name: "GIÓ",
    kind: "Áo sơ mi dệt",
    family: "SHIRT",
    material: "Kate lụa",
    fit: "REGULAR",
    priceVnd: 750_000,
    colors: ["white", "navy"],
    cutUnits: 15,
    dropNo: 5,
    stock: {
      white: { S: 1, M: 2, L: 1, XL: 0 },
      navy: { S: 1, M: 1, L: 1, XL: 0 },
    },
    photoKeys: ["gio", "tro"],
  },
  {
    slug: "da",
    name: "ĐÁ",
    kind: "Quần cargo",
    family: "PANTS",
    material: "Kaki 320gsm",
    fit: "REGULAR",
    priceVnd: 980_000,
    colors: ["moss", "black"],
    cutUnits: 12,
    dropNo: 5,
    stock: {
      moss: { S: 0, M: 1, L: 1, XL: 1 },
      black: { S: 1, M: 1, L: 1, XL: 0 },
    },
    photoKeys: ["da", "song"],
  },

  // ── Drop 04 — closed, sold out ───────────────────────────────────────
  {
    slug: "reu",
    name: "RÊU",
    kind: "Áo khoác phao",
    family: "JACKET",
    material: "Dù chần lông vũ",
    fit: "OVERSIZE",
    priceVnd: 1_500_000,
    colors: ["moss"],
    cutUnits: 30,
    dropNo: 4,
    soldOutAt: "2026-06-17T18:15:00+07:00",
    stock: { moss: { S: 0, M: 0, L: 0, XL: 0 } },
    photoKeys: ["reu"],
  },
  {
    slug: "tro",
    name: "TRO",
    kind: "Áo hoodie zip",
    family: "HOODIE",
    material: "Nỉ bông 400gsm",
    fit: "OVERSIZE",
    priceVnd: 950_000,
    colors: ["grey", "black"],
    cutUnits: 40,
    dropNo: 4,
    soldOutAt: "2026-06-08T21:05:00+07:00",
    stock: {
      grey: { S: 0, M: 0, L: 0, XL: 0 },
      black: { S: 0, M: 0, L: 0, XL: 0 },
    },
    photoKeys: ["tro", "than"],
  },
  {
    slug: "song",
    name: "SÓNG",
    kind: "Áo thun in lưng",
    family: "TEE",
    material: "Cotton 250gsm",
    fit: "OVERSIZE",
    priceVnd: 430_000,
    colors: ["white"],
    cutUnits: 50,
    dropNo: 4,
    soldOutAt: "2026-06-06T14:20:00+07:00",
    stock: { white: { S: 0, M: 0, L: 0, XL: 0 } },
    photoKeys: ["song"],
  },
  {
    slug: "vo",
    name: "VỎ",
    kind: "Áo gile",
    family: "VEST",
    material: "Dù 2 lớp",
    fit: "REGULAR",
    priceVnd: 820_000,
    colors: ["black", "cream"],
    cutUnits: 25,
    dropNo: 4,
    soldOutAt: "2026-06-19T20:00:00+07:00",
    stock: {
      black: { S: 0, M: 0, L: 0, XL: 0 },
      cream: { S: 0, M: 0, L: 0, XL: 0 },
    },
    photoKeys: ["vo", "kho"],
  },
  {
    slug: "mua",
    name: "MƯA",
    kind: "Áo khoác dù dài",
    family: "JACKET",
    material: "Dù chống nước",
    fit: "OVERSIZE",
    priceVnd: 1_420_000,
    colors: ["black"],
    cutUnits: 20,
    dropNo: 4,
    soldOutAt: "2026-06-12T09:40:00+07:00",
    stock: { black: { S: 0, M: 0, L: 0, XL: 0 } },
    photoKeys: ["mua"],
  },
  {
    slug: "kho",
    name: "KHÔ",
    kind: "Quần short",
    family: "PANTS",
    material: "Kaki 280gsm",
    fit: "REGULAR",
    priceVnd: 520_000,
    colors: ["cream", "moss"],
    cutUnits: 35,
    dropNo: 4,
    soldOutAt: "2026-06-19T11:30:00+07:00",
    stock: {
      cream: { S: 0, M: 0, L: 0, XL: 0 },
      moss: { S: 0, M: 0, L: 0, XL: 0 },
    },
    photoKeys: ["kho", "reu"],
  },

  // ── Drop 03 — closed, sold out ───────────────────────────────────────
  // BÃO, MEN and VÔI reused the image keys of BỤI, NẮNG and SƯƠNG in the
  // prototype. Harmless there; here they get ids of their own.
  {
    slug: "dat",
    name: "ĐẤT",
    kind: "Quần jogger nỉ",
    family: "PANTS",
    material: "Nỉ da cá 320gsm",
    fit: "REGULAR",
    priceVnd: 680_000,
    colors: ["brown", "black"],
    cutUnits: 45,
    dropNo: 3,
    soldOutAt: "2026-03-14T19:30:00+07:00",
    stock: {
      brown: { S: 0, M: 0, L: 0, XL: 0 },
      black: { S: 0, M: 0, L: 0, XL: 0 },
    },
    photoKeys: ["dat", "than"],
  },
  {
    slug: "lua",
    name: "LỬA",
    kind: "Áo thun tay dài",
    family: "TEE",
    material: "Cotton 240gsm",
    fit: "REGULAR",
    priceVnd: 480_000,
    colors: ["black", "white"],
    cutUnits: 55,
    dropNo: 3,
    soldOutAt: "2026-03-08T22:10:00+07:00",
    stock: {
      black: { S: 0, M: 0, L: 0, XL: 0 },
      white: { S: 0, M: 0, L: 0, XL: 0 },
    },
    photoKeys: ["lua", "song"],
  },
  {
    slug: "bao",
    name: "BÃO",
    kind: "Áo hoodie cổ lọ",
    family: "HOODIE",
    material: "Nỉ bông 380gsm",
    fit: "OVERSIZE",
    priceVnd: 910_000,
    colors: ["grey"],
    cutUnits: 38,
    dropNo: 3,
    soldOutAt: "2026-03-11T13:05:00+07:00",
    stock: { grey: { S: 0, M: 0, L: 0, XL: 0 } },
    photoKeys: ["bui"],
  },
  {
    slug: "men",
    name: "MEN",
    kind: "Áo thun nhuộm",
    family: "TEE",
    material: "Cotton 250gsm",
    fit: "OVERSIZE",
    priceVnd: 460_000,
    colors: ["cream"],
    cutUnits: 42,
    dropNo: 3,
    soldOutAt: "2026-03-18T08:45:00+07:00",
    stock: { cream: { S: 0, M: 0, L: 0, XL: 0 } },
    photoKeys: ["nang"],
  },
  {
    slug: "voi",
    name: "VÔI",
    kind: "Áo khoác gió",
    family: "JACKET",
    material: "Dù 1 lớp",
    fit: "REGULAR",
    priceVnd: 790_000,
    colors: ["white", "grey"],
    cutUnits: 28,
    dropNo: 3,
    soldOutAt: "2026-03-20T20:00:00+07:00",
    stock: {
      white: { S: 0, M: 0, L: 0, XL: 0 },
      grey: { S: 0, M: 0, L: 0, XL: 0 },
    },
    photoKeys: ["suong", "vo"],
  },
];

/**
 * The id is prefixed rather than equal to the slug, so a call site that mixes
 * the two is visible in a log instead of silently working.
 */
export const CATALOG: Product[] = styles.map((s) => ({
  ...s,
  id: productId(`p-${s.slug}`),
}));

export const byId = new Map(CATALOG.map((p) => [p.id, p]));
export const bySlug = new Map(CATALOG.map((p) => [p.slug, p]));
