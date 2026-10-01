import {
  type Drop,
  type Product,
  type Teaser,
  productId,
} from "./types";
import { addHoursIso } from "@/lib/datetime";
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
 * Construction lines (`details`, backend slice B6): only Số 05 has them. They
 * are the garment briefs its photos were made from
 * (`tasks/anh-san-pham-prompt.md`), copied word for word from the Feed mock
 * that prints them (`ISSUE_05[].details` in
 * `prototype/explore/shared/data.js`), and `catalog.test.ts` reads the mock
 * to prove it. The mock prints lines for Số 05 alone, so every other style
 * has an empty list.
 *
 * English (backend slice B15, round v6): every style and teaser carries `en`,
 * the British English of its `kind` and, for a style, its `material` and its
 * lines — translated line for line, in their order, with the print titles in
 * quotes kept as they are, like the names. Only the eight fixed styles have
 * an English `name`; the issues' styles and the teasers keep theirs
 * (`tasks/plan.md`, "Thuật ngữ tiếng Anh"). A style without lines has no
 * English ones either: `details_en` is null or holds a line.
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
 * How long before an issue opens its teasers are announced (backend slice
 * B12): fourteen days and eight hours.
 *
 * The one rule the sample's announcements are written by, taken from the Feed
 * mock's own inbox — "Số 06 công bố: SỎI và NGÓI" at 12:00 on 18/09
 * (`NOTIFICATIONS` in `prototype/explore/shared/data.js`) for an issue that
 * opens at 20:00 on 02/10 — and held to it by `catalog.test.ts`, which reads
 * the mock. Sample data authored by a stated rule, like the order moments of
 * slice B10 (`data/orders.ts`), not a number a screen derives (DESIGN.md §9
 * rule 1). A teaser the back office adds is announced when it is added.
 */
export const TEASER_LEAD_HOURS = 14 * 24 + 8;

/** An issue's announcement: its opening, `TEASER_LEAD_HOURS` earlier. */
function announcedFor(dropNo: number): string {
  const drop = DROPS.find((d) => d.no === dropNo);
  if (!drop) throw new Error(`a teaser for issue ${dropNo}, which DROPS does not have`);
  return addHoursIso(drop.opensAt, -TEASER_LEAD_HOURS);
}

/**
 * Styles announced for a drop that has not opened.
 *
 * No price and no stock: "Giá và số lượng công bố đúng lúc mở" is what the
 * upcoming-drop screen promises, and the data has to keep that promise rather
 * than carry the numbers around invisibly. Their photos are borrowed frames
 * — see `lib/photos.ts`. Both were announced together, when Số 06 was
 * (`announcedFor`).
 */
export const TEASERS: Teaser[] = [
  { slug: "s06-soi", name: "SỎI", kind: "Áo khoác dù", family: "JACKET", dropNo: 6, photoKey: "suong", announcedAt: announcedFor(6), en: { kind: "Nylon jacket" } },
  { slug: "s06-ngoi", name: "NGÓI", kind: "Áo hoodie in", family: "HOODIE", dropNo: 6, photoKey: "nguoi", announcedAt: announcedFor(6), en: { kind: "Printed hoodie" } },
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
    details: [
      "Vai rơi, thân rộng",
      "Tay ngắn rộng, dài tới trên khuỷu",
      "Cổ bo gân 2,5 cm",
      "In lụa dải khói halftone chéo từ gấu lên ngực",
    ],
    en: {
      kind: "Oversized tee",
      material: "Cotton 250gsm",
      details: [
        "Dropped shoulders, wide body",
        "Wide short sleeves, ending above the elbow",
        "2.5 cm ribbed neckband",
        "Screen-printed halftone smoke band running diagonally from hem to chest",
      ],
    },
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
    details: [
      "Mũ hai lớp đứng quanh cổ",
      "Dây rút dẹt, đầu kim loại",
      "Túi kangaroo",
      "Bo tay và gấu bản rộng",
      "In \"Bản đồ mòn\" ở ngực trên",
    ],
    en: {
      kind: "Hoodie",
      material: "Fleece 380gsm",
      details: [
        "Double-layer hood that stands up around the neck",
        "Flat drawcord, metal tips",
        "Kangaroo pocket",
        "Wide ribbed cuffs and hem",
        "\"Bản đồ mòn\" print on the upper chest",
      ],
    },
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
    details: [
      "Mũ hai lớp đứng quanh cổ",
      "Dây rút dẹt, đầu kim loại",
      "Túi kangaroo",
      "In \"Dư nhiệt\" ngang ngực trên",
    ],
    en: {
      kind: "Printed hoodie",
      material: "Fleece 380gsm",
      details: [
        "Double-layer hood that stands up around the neck",
        "Flat drawcord, metal tips",
        "Kangaroo pocket",
        "\"Dư nhiệt\" print across the upper chest",
      ],
    },
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
    details: [
      "Vai tra đúng đường vai",
      "Tay ngắn tới giữa bắp tay",
      "Cổ bo gân 1,5 cm",
      "In \"Mảng nắng\" ở ngực",
    ],
    en: {
      kind: "Tee",
      material: "Cotton 220gsm",
      details: [
        "Set-in shoulders on the natural shoulder line",
        "Short sleeves ending mid-bicep",
        "1.5 cm ribbed neckband",
        "\"Mảng nắng\" print on the chest",
      ],
    },
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
    details: [
      "Khoá kéo toàn thân dưới nẹp bấm",
      "Cổ đứng, mũ gắn liền",
      "Hai túi khoá kéo",
      "Đai dán chỉnh cổ tay",
      "Gấu dây rút có khoá chặn",
      "In \"Lớp sương\" ở vai và ngực",
    ],
    en: {
      kind: "Nylon jacket",
      material: "2-layer waterproof nylon",
      details: [
        "Full-length zip under a press-stud placket",
        "Stand collar, fixed hood",
        "Two zip pockets",
        "Hook-and-loop tabs to adjust the cuffs",
        "Drawcord hem with cord locks",
        "\"Lớp sương\" print on the shoulders and chest",
      ],
    },
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
    details: [
      "Cạp chun bọc, có dây rút",
      "Túi hai bên sườn",
      "Ống thuôn, bo gấu",
      "In \"Kết tinh\" dọc ống trái",
    ],
    en: {
      kind: "Joggers",
      material: "Terry 320gsm",
      details: [
        "Covered elastic waistband with a drawcord",
        "Side pockets",
        "Tapered legs, ribbed cuffs",
        "\"Kết tinh\" print down the left leg",
      ],
    },
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
    details: [
      "Chần ngang, mỗi đường cách 5 cm",
      "Cổ, tay và gấu bo gân",
      "Khoá kéo toàn thân",
      "Hai túi mổ xéo",
      "In \"Mạch than\" ở ngực trái",
    ],
    en: {
      kind: "Bomber jacket",
      material: "Quilted nylon",
      details: [
        "Horizontal quilting, lines 5 cm apart",
        "Ribbed collar, cuffs and hem",
        "Full-length zip",
        "Two slanted welt pockets",
        "\"Mạch than\" print on the left chest",
      ],
    },
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
    details: [
      "Vai rơi sâu, thân rộng và dài",
      "Tay rộng, dài tới khuỷu",
      "Cổ bo gân 2 cm",
      "In \"Vân xói\" ở thân trên",
    ],
    en: {
      kind: "Half-sleeve tee",
      material: "Cotton 240gsm",
      details: [
        "Deeply dropped shoulders, wide and long body",
        "Wide sleeves, ending at the elbow",
        "2 cm ribbed neckband",
        "\"Vân xói\" print on the upper body",
      ],
    },
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
    details: [
      "Cổ đức, nẹp cúc cùng màu",
      "Túi ốp ngực trái",
      "Tay dài, măng séc một cúc",
      "Gấu lượn",
      "In \"Luồng cắt\" ở thân phải",
    ],
    en: {
      kind: "Woven shirt",
      material: "Silky poly-cotton",
      details: [
        "Point collar, tonal button placket",
        "Patch pocket on the left chest",
        "Long sleeves, single-button cuffs",
        "Curved hem",
        "\"Luồng cắt\" print on the right front",
      ],
    },
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
    details: [
      "Đỉa quần, khoá kéo và cúc",
      "Túi chéo phía trước",
      "Túi hộp có nắp hai bên đùi",
      "In \"Mặt cắt\" ở ống phải",
    ],
    en: {
      kind: "Cargo trousers",
      material: "Twill 320gsm",
      details: [
        "Belt loops, zip and button",
        "Slanted front pockets",
        "Flapped cargo pockets on both thighs",
        "\"Mặt cắt\" print on the right leg",
      ],
    },
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
    details: [],
    en: { kind: "Puffer jacket", material: "Quilted down" },
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
    details: [],
    en: { kind: "Zip hoodie", material: "Fleece 400gsm" },
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
    details: [],
    en: { kind: "Back-printed tee", material: "Cotton 250gsm" },
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
    details: [],
    en: { kind: "Gilet", material: "2-layer nylon" },
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
    details: [],
    en: { kind: "Long nylon jacket", material: "Waterproof nylon" },
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
    details: [],
    en: { kind: "Shorts", material: "Twill 280gsm" },
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
    details: [],
    en: { kind: "Fleece joggers", material: "Terry 320gsm" },
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
    details: [],
    en: { kind: "Long-sleeve tee", material: "Cotton 240gsm" },
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
    details: [],
    en: { kind: "Funnel-neck hoodie", material: "Fleece 380gsm" },
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
    details: [],
    en: { kind: "Dyed tee", material: "Cotton 250gsm" },
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
    details: [],
    en: { kind: "Windbreaker", material: "Single-layer nylon" },
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
    details: [],
    en: { name: "PLAIN TEE", kind: "Tee", material: "Cotton 220gsm" },
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
    details: [],
    en: { name: "LONG-SLEEVE TEE", kind: "Long-sleeve tee", material: "Cotton 220gsm" },
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
    details: [],
    en: { name: "PLAIN HOODIE", kind: "Hoodie", material: "Fleece 340gsm" },
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
    details: [],
    en: { name: "NYLON JACKET", kind: "Nylon jacket", material: "Single-layer nylon" },
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
    details: [],
    en: { name: "PUFFER GILET", kind: "Puffer gilet", material: "Quilted nylon" },
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
    details: [],
    en: { name: "OXFORD SHIRT", kind: "Oxford shirt", material: "Cotton oxford" },
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
    details: [],
    en: { name: "CHINOS", kind: "Chinos", material: "Twill 280gsm" },
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
    details: [],
    en: { name: "FLEECE SHORTS", kind: "Fleece shorts", material: "Terry 300gsm" },
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
