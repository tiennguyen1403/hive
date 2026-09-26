import {
  type Drop,
  type Family,
  type Product,
  type Teaser,
  productId,
} from "./types";
import { issueCode } from "@/lib/lexicon";

/**
 * Simulated data. There is no real merchandise behind any of this — PRODUCT.md
 * records that the project has no real product names and no sales history.
 * Every admin screen that shows a number derived from here has to label it
 * "dữ liệu mô phỏng".
 *
 * Photos: each colourway names its photo in `photoKeys`, in band order. Số 05
 * wears its own (`shot-<style>-<colour>`, AI-made packshots with a lookbook
 * frame each — `lib/shots.ts`, v3 slice 14); Số 03 and 04 and the teasers
 * still borrow Unsplash frames; the fixed styles are flat drawings.
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
 * than carry the numbers around invisibly. Their photos are borrowed frames
 * — see `lib/photos.ts`.
 */
export const TEASERS: Teaser[] = [
  { slug: "s06-soi", name: "SỎI", kind: "Áo khoác dù", family: "JACKET", dropNo: 6, photoKey: "suong" },
  { slug: "s06-ngoi", name: "NGÓI", kind: "Áo hoodie in", family: "HOODIE", dropNo: 6, photoKey: "nguoi" },
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
 *
 * A row's `slug` is the style's STEM: the address it was first published
 * under, and what its id is made of. `CATALOG` below turns it into the
 * address the shop uses now — see there.
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
    photoKeys: ["shot-khoi-black", "shot-khoi-cream"],
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
    photoKeys: ["shot-bui-black", "shot-bui-grey"],
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
    photoKeys: ["shot-nguoi-black"],
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
    photoKeys: ["shot-nang-white", "shot-nang-cream", "shot-nang-moss"],
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
    photoKeys: ["shot-suong-black", "shot-suong-moss"],
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
    photoKeys: ["shot-muoi-black", "shot-muoi-grey"],
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
    photoKeys: ["shot-than-black", "shot-than-navy"],
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
    photoKeys: ["shot-cat-cream", "shot-cat-white", "shot-cat-brown"],
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
    photoKeys: ["shot-gio-white", "shot-gio-navy"],
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
    photoKeys: ["shot-da-moss", "shot-da-black"],
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

  // ── Fixed styles (slice B5) — no issue, no cut ──────────────────────────
  // Basics that belong to no issue: on sale at any hour, and a size that
  // runs out is brought back ("Nhập thêm"), so `dropNo` and `cutUnits` are
  // null and the stock is simply what is on the shelf. The eight, their
  // numbers and their order are the approved board's (`LINE` in
  // `prototype/v3/line/line-mock.js`, round 4, 25/09/2026), stock S·M·L·XL
  // per colour. The photos are flat drawings (`flat-<shape>-<colour>`), only
  // named here: until their files exist `photoUrl` falls back to the hero
  // frame, as it does for any key it does not know.
  {
    slug: "ao-thun-tron",
    name: "ÁO THUN TRƠN",
    kind: "Áo thun",
    family: "TEE",
    material: "Cotton 220gsm",
    fit: "REGULAR",
    priceVnd: 400_000,
    colors: ["white", "black", "grey"],
    cutUnits: null,
    dropNo: null,
    stock: {
      white: { S: 10, M: 14, L: 11, XL: 6 },
      black: { S: 8, M: 12, L: 9, XL: 5 },
      grey: { S: 6, M: 9, L: 7, XL: 4 },
    },
    photoKeys: ["flat-tee-white", "flat-tee-black", "flat-tee-grey"],
  },
  {
    slug: "ao-thun-tay-dai",
    name: "ÁO THUN TAY DÀI",
    kind: "Áo thun tay dài",
    family: "TEE",
    material: "Cotton 220gsm",
    fit: "REGULAR",
    priceVnd: 450_000,
    colors: ["black", "white"],
    cutUnits: null,
    dropNo: null,
    stock: {
      black: { S: 5, M: 8, L: 6, XL: 3 },
      white: { S: 6, M: 7, L: 5, XL: 3 },
    },
    photoKeys: ["flat-longsleeve-black", "flat-longsleeve-white"],
  },
  {
    slug: "hoodie-tron",
    name: "HOODIE TRƠN",
    kind: "Áo hoodie",
    family: "HOODIE",
    material: "Nỉ bông 340gsm",
    fit: "OVERSIZE",
    priceVnd: 750_000,
    colors: ["grey", "black", "cream"],
    cutUnits: null,
    dropNo: null,
    stock: {
      grey: { S: 5, M: 0, L: 4, XL: 2 },
      black: { S: 4, M: 0, L: 6, XL: 3 },
      cream: { S: 3, M: 0, L: 2, XL: 2 },
    },
    photoKeys: ["flat-hoodie-grey", "flat-hoodie-black", "flat-hoodie-cream"],
  },
  {
    slug: "ao-khoac-du",
    name: "ÁO KHOÁC DÙ",
    kind: "Áo khoác dù",
    family: "JACKET",
    material: "Dù 1 lớp",
    fit: "OVERSIZE",
    priceVnd: 850_000,
    colors: ["black", "navy"],
    cutUnits: null,
    dropNo: null,
    stock: {
      black: { S: 3, M: 5, L: 4, XL: 3 },
      navy: { S: 3, M: 4, L: 3, XL: 3 },
    },
    photoKeys: ["flat-jacket-black", "flat-jacket-navy"],
  },
  {
    slug: "gile-phao",
    name: "GILE PHAO",
    kind: "Áo gile phao",
    family: "VEST",
    material: "Dù chần bông",
    fit: "REGULAR",
    priceVnd: 750_000,
    colors: ["black"],
    cutUnits: null,
    dropNo: null,
    stock: { black: { S: 3, M: 5, L: 5, XL: 2 } },
    photoKeys: ["flat-vest-black"],
  },
  {
    slug: "so-mi-oxford",
    name: "SƠ MI OXFORD",
    kind: "Áo sơ mi oxford",
    family: "SHIRT",
    material: "Cotton oxford",
    fit: "REGULAR",
    priceVnd: 590_000,
    colors: ["white", "navy"],
    cutUnits: null,
    dropNo: null,
    stock: {
      white: { S: 4, M: 7, L: 6, XL: 3 },
      navy: { S: 3, M: 5, L: 4, XL: 3 },
    },
    photoKeys: ["flat-shirt-white", "flat-shirt-navy"],
  },
  {
    slug: "quan-kaki",
    name: "QUẦN KAKI",
    kind: "Quần kaki",
    family: "PANTS",
    material: "Kaki 280gsm",
    fit: "REGULAR",
    priceVnd: 650_000,
    colors: ["cream", "black"],
    cutUnits: null,
    dropNo: null,
    stock: {
      cream: { S: 3, M: 5, L: 4, XL: 3 },
      black: { S: 4, M: 7, L: 6, XL: 3 },
    },
    photoKeys: ["flat-trousers-cream", "flat-trousers-black"],
  },
  {
    slug: "quan-short-ni",
    name: "QUẦN SHORT NỈ",
    kind: "Quần short nỉ",
    family: "PANTS",
    material: "Nỉ da cá 300gsm",
    fit: "REGULAR",
    priceVnd: 450_000,
    colors: ["grey", "black"],
    cutUnits: null,
    dropNo: null,
    stock: {
      grey: { S: 5, M: 6, L: 5, XL: 0 },
      black: { S: 6, M: 9, L: 7, XL: 0 },
    },
    photoKeys: ["flat-shorts-grey", "flat-shorts-black"],
  },
];

/**
 * The id is prefixed rather than equal to the slug, so a call site that mixes
 * the two is visible in a log instead of silently working.
 *
 * SLICE B5 (25/09/2026): an issue's style is published with its issue in
 * front — `s05-khoi` — because a name can come back in a later issue and two
 * KHÓIs need two addresses. The id is still made from the STEM a row writes
 * (`p-khoi`), so every order line, every event and every test that names a
 * style by id reads exactly as before; only the address moved, and the shop
 * answers the old one with a permanent redirect (`legacySlugTarget`). A fixed
 * style's address is its stem as it is.
 */
export const CATALOG: Product[] = styles.map((s) => ({
  ...s,
  id: productId(`p-${s.slug}`),
  slug: s.dropNo === null ? s.slug : `${issueCode(s.dropNo).toLowerCase()}-${s.slug}`,
}));

export const byId = new Map(CATALOG.map((p) => [p.id, p]));
export const bySlug = new Map(CATALOG.map((p) => [p.slug, p]));
