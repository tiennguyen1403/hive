import { describe, it, expect } from "vitest";
import {
  FIXED_LOW_AT,
  LOW_STOCK_AT,
  dropSummary,
  familyGroupsIn,
  familyKindsLabel,
  fixedLowCells,
  isFixed,
  isIssueStyle,
  isRunningLow,
  lowStockIn,
  onHand,
  productsInDrop,
  productsOnSale,
  soldOutSizes,
  soldUnits,
} from "./inventory";
import { styleCountLabel } from "./money";
import { buildCatalog } from "./catalog";
import { teasersIn } from "@/data/catalog";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";

/**
 * The home page prints five figures and every one of them is arithmetic over
 * `data/catalog.ts`. These pin the arithmetic, not the wording: if a fixture
 * is edited the screen changes with it, and that is the point.
 *
 *   Số 05 — 10 styles, 181 cut, 73 on hand
 *   Số 04 — 6 styles, 200 cut, all sold
 *   Số 03 — 5 styles, 208 cut, all sold
 */

describe("dropSummary · the numbers under the section heading", () => {
  it("counts the open drop the way the hero prints it", () => {
    const s = dropSummary(FIXTURE_CATALOG, 5);
    expect(s.styles).toBe(10);
    expect(s.cutUnits).toBe(181);
    expect(s.onHand).toBe(73);
    expect(s.soldUnits).toBe(108);
  });

  it("counts a closed drop as sold out to the last unit", () => {
    expect(dropSummary(FIXTURE_CATALOG, 4)).toEqual({
      styles: 6,
      cutUnits: 200,
      soldUnits: 200,
      onHand: 0,
    });
    expect(dropSummary(FIXTURE_CATALOG, 3)).toEqual({
      styles: 5,
      cutUnits: 208,
      soldUnits: 208,
      onHand: 0,
    });
  });
});

describe("lowStockIn · the 'Sắp hết' strip", () => {
  it("names only the styles down to their last few, scarcest first", () => {
    const low = lowStockIn(FIXTURE_CATALOG, 5);
    expect(low.map((p) => p.slug)).toEqual(["s05-bui", "s05-suong"]);
    expect(low.map((p) => onHand(p))).toEqual([2, 3]);
  });

  it("leaves out a style that has nothing left at all", () => {
    // MUỐI is at zero. Zero is not "sắp hết"; it is gone, and the card says
    // HẾT HÀNG instead of standing in a strip that means "hurry".
    expect(lowStockIn(FIXTURE_CATALOG, 5).some((p) => p.slug === "s05-muoi")).toBe(false);
    expect(onHand(FIXTURE_CATALOG.bySlug.get("s05-muoi")!)).toBe(0);
  });

  it("stays silent on a drop whose shelf is empty", () => {
    expect(lowStockIn(FIXTURE_CATALOG, 4)).toEqual([]);
  });

  it("agrees with the threshold the card uses", () => {
    for (const p of lowStockIn(FIXTURE_CATALOG, 5)) expect(onHand(p)).toBeLessThanOrEqual(LOW_STOCK_AT);
  });
});

describe("the sold-out sizes each low card lists", () => {
  it("reads them off the stock table, not off a stored flag", () => {
    expect(soldOutSizes(FIXTURE_CATALOG.bySlug.get("s05-bui")!)).toEqual(["S", "M"]);
    expect(soldOutSizes(FIXTURE_CATALOG.bySlug.get("s05-suong")!)).toEqual(["S"]);
  });
});

describe("familyGroupsIn · the 'Mua theo loại' tiles", () => {
  it("covers the open drop family by family", () => {
    expect(
      familyGroupsIn(FIXTURE_CATALOG, 5).map((g) => [g.family, g.styles, g.lead.slug]),
    ).toEqual([
      ["TEE", 3, "s05-khoi"],
      ["HOODIE", 2, "s05-bui"],
      ["JACKET", 2, "s05-suong"],
      ["SHIRT", 1, "s05-gio"],
      ["PANTS", 2, "s05-muoi"],
    ]);
  });

  it("never draws a tile for a family the drop does not carry", () => {
    // Số 05 has no gile. A tile leading to an empty grid is worse than no
    // tile — the same rule `familiesIn` follows for the chips.
    expect(familyGroupsIn(FIXTURE_CATALOG, 5).some((g) => g.family === "VEST")).toBe(false);
    expect(familyGroupsIn(FIXTURE_CATALOG, 4).some((g) => g.family === "VEST")).toBe(true);
  });

  it("adds up to the drop's style count", () => {
    const total = familyGroupsIn(FIXTURE_CATALOG, 5).reduce((n, g) => n + g.styles, 0);
    expect(total).toBe(dropSummary(FIXTURE_CATALOG, 5).styles);
  });

  it("prices each row from the cheapest style in it", () => {
    expect(familyGroupsIn(FIXTURE_CATALOG, 5).map((g) => [g.family, g.fromVnd])).toEqual([
      ["TEE", 390_000],
      ["HOODIE", 890_000],
      ["JACKET", 1_350_000],
      ["SHIRT", 750_000],
      ["PANTS", 690_000],
    ]);
  });
});

describe("familyKindsLabel · the second line of a family row", () => {
  it("tells the styles of số 05 apart, family by family", () => {
    expect(familyGroupsIn(FIXTURE_CATALOG, 5).map((g) => g.kinds)).toEqual([
      "oversize, cơ bản và tay lỡ",
      "trơn và in",
      "dù và bomber",
      "sơ mi dệt",
      "jogger và cargo",
    ]);
  });

  it("drops the part the row's own title already says", () => {
    expect(familyKindsLabel([FIXTURE_CATALOG.bySlug.get("s05-khoi")!, FIXTURE_CATALOG.bySlug.get("s05-cat")!])).toBe(
      "oversize và tay lỡ",
    );
  });

  it("names the plain one rather than leaving a gap", () => {
    // "Áo hoodie" under a row titled Hoodie has nothing left once the family
    // name comes off, so it is called what it is next to the printed one.
    expect(familyKindsLabel([FIXTURE_CATALOG.bySlug.get("s05-bui")!, FIXTURE_CATALOG.bySlug.get("s05-nguoi")!])).toBe(
      "trơn và in",
    );
  });

  it("prints the whole kind when the family carries only one", () => {
    // "dệt" alone names nothing. The garment word that opens the kind comes
    // off, because the row is already titled Sơ mi.
    expect(familyKindsLabel([FIXTURE_CATALOG.bySlug.get("s05-gio")!])).toBe("sơ mi dệt");
    expect(familyKindsLabel([FIXTURE_CATALOG.bySlug.get("s05-muoi")!])).toBe("jogger");
  });

  it("reads as a list, with 'và' before the last", () => {
    const three = familyKindsLabel([
      FIXTURE_CATALOG.bySlug.get("s05-khoi")!,
      FIXTURE_CATALOG.bySlug.get("s05-nang")!,
      FIXTURE_CATALOG.bySlug.get("s05-cat")!,
    ]);
    expect(three).toBe("oversize, cơ bản và tay lỡ");
    expect(familyKindsLabel([])).toBe("");
  });
});

describe("counting styles in words · the covers and the buttons", () => {
  it("words the counts the three issues really have", () => {
    // "Xem mười mẫu" on the open cover, "Sáu mẫu…" on the closed one, "Hai
    // mẫu đã hé lộ" on the teaser — every one of them counted, not typed.
    expect(styleCountLabel(dropSummary(FIXTURE_CATALOG, 5).styles)).toBe("mười mẫu");
    expect(styleCountLabel(dropSummary(FIXTURE_CATALOG, 4).styles)).toBe("sáu mẫu");
    expect(styleCountLabel(teasersIn(6).length)).toBe("hai mẫu");
  });

  it("falls back to digits once the word stops being shorter", () => {
    expect(styleCountLabel(13)).toBe("13 mẫu");
  });
});

describe("what a closed card reports", () => {
  it("prints sold over cut for every style of số 04", () => {
    const line = (slug: string) => {
      const p = productsInDrop(FIXTURE_CATALOG, 4).find((x) => x.slug === slug)!;
      return `${soldUnits(p)}/${p.cutUnits}`;
    };
    expect(["s04-reu", "s04-tro", "s04-song", "s04-vo", "s04-mua", "s04-kho"].map(line)).toEqual([
      "30/30",
      "40/40",
      "50/50",
      "25/25",
      "20/20",
      "35/35",
    ]);
  });
});

// ─────────────────────────────────────────────── fixed styles (slice B5)
/** The fixture's own dates: Số 05 runs 11/09 20:00 → 25/09 20:00, Số 06 opens 02/10 20:00. */
const IN_05 = new Date("2026-09-20T18:50:00+07:00");
const BETWEEN = new Date("2026-09-28T12:00:00+07:00");
const IN_06 = new Date("2026-10-05T12:00:00+07:00");

const slugsOf = (ps: readonly { slug: string }[]) => ps.map((p) => p.slug);
const FIXED = FIXTURE_CATALOG.products.filter(isFixed);

describe("isFixed · a style that belongs to no issue", () => {
  it("is exactly the eight with no issue and no cut", () => {
    expect(FIXED).toHaveLength(8);
    for (const p of FIXTURE_CATALOG.products) {
      expect(isFixed(p)).toBe(p.dropNo === null);
      expect(isIssueStyle(p)).toBe(!isFixed(p));
    }
  });

  it("keeps a fixed style out of every issue's arithmetic", () => {
    for (const no of [3, 4, 5, 6]) {
      expect(productsInDrop(FIXTURE_CATALOG, no).some(isFixed)).toBe(false);
    }
    // The open issue's figures are the ones the prototype was signed off on.
    expect(dropSummary(FIXTURE_CATALOG, 5)).toEqual({
      styles: 10,
      cutUnits: 181,
      soldUnits: 108,
      onHand: 73,
    });
    expect(lowStockIn(FIXTURE_CATALOG, 5).some(isFixed)).toBe(false);
  });
});

describe("productsOnSale · 'Đang bán'", () => {
  it("is the open issue's ten — its sold-out one too — then the eight fixed styles", () => {
    const onSale = productsOnSale(FIXTURE_CATALOG, IN_05);
    expect(slugsOf(onSale)).toEqual([
      ...slugsOf(productsInDrop(FIXTURE_CATALOG, 5)),
      ...slugsOf(FIXED),
    ]);
    expect(onSale).toHaveLength(18);
    expect(slugsOf(onSale)).toContain("s05-muoi"); // nothing left, still the issue selling
  });

  it("keeps catalogue order, which puts the fixed styles after every issue's", () => {
    const onSale = productsOnSale(FIXTURE_CATALOG, IN_05);
    const order = FIXTURE_CATALOG.products.map((p) => p.id);
    const at = onSale.map((p) => order.indexOf(p.id));
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(onSale.slice(-8).every(isFixed)).toBe(true);
  });

  it("between two issues, is the fixed styles and nothing else", () => {
    expect(slugsOf(productsOnSale(FIXTURE_CATALOG, BETWEEN))).toEqual(slugsOf(FIXED));
  });

  it("never lists a closed issue's style, and an issue with no style adds none", () => {
    // Số 06 is open here and has no style yet — only the fixed styles are on sale.
    expect(slugsOf(productsOnSale(FIXTURE_CATALOG, IN_06))).toEqual(slugsOf(FIXED));
    expect(productsOnSale(FIXTURE_CATALOG, IN_05).some((p) => p.dropNo === 4)).toBe(false);
  });

  it("keeps a fixed style with an empty shelf: tạm hết, not gone", () => {
    const tee = FIXED[0]!;
    const empty = {
      ...tee,
      stock: Object.fromEntries(tee.colors.map((c) => [c, { S: 0, M: 0, L: 0, XL: 0 }])),
    };
    const catalog = buildCatalog({
      products: [empty],
      drops: [...FIXTURE_CATALOG.drops],
      teasers: [],
      promotions: [],
    });
    expect(productsOnSale(catalog, BETWEEN)).toEqual([empty]);
  });
});

describe("fixedLowCells · what a fixed style needs brought back", () => {
  const bySlug = (slug: string) => FIXTURE_CATALOG.bySlug.get(slug)!;

  it("flags a cell at two or fewer, a size at zero included", () => {
    expect(FIXED_LOW_AT).toBe(2);
    expect(fixedLowCells(bySlug("gile-phao"))).toEqual([{ color: "black", size: "XL", onHand: 2 }]);
  });

  it("lists them colour by colour in band order, then S to XL", () => {
    expect(fixedLowCells(bySlug("hoodie-tron"))).toEqual([
      { color: "grey", size: "M", onHand: 0 },
      { color: "grey", size: "XL", onHand: 2 },
      { color: "black", size: "M", onHand: 0 },
      { color: "cream", size: "M", onHand: 0 },
      { color: "cream", size: "L", onHand: 2 },
      { color: "cream", size: "XL", onHand: 2 },
    ]);
    expect(fixedLowCells(bySlug("quan-short-ni"))).toEqual([
      { color: "grey", size: "XL", onHand: 0 },
      { color: "black", size: "XL", onHand: 0 },
    ]);
  });

  it("is empty for a style with three or more in every cell", () => {
    expect(fixedLowCells(bySlug("ao-thun-tron"))).toEqual([]);
    expect(fixedLowCells(bySlug("ao-khoac-du"))).toEqual([]);
  });
});

describe("isRunningLow · 'Sắp hết' by each kind's own rule", () => {
  it("flags the three fixed styles the board flags, by cell", () => {
    expect(slugsOf(FIXED.filter(isRunningLow))).toEqual(["hoodie-tron", "gile-phao", "quan-short-ni"]);
  });

  it("keeps the issue's rule for an issue's style: the whole style at three or fewer", () => {
    expect(LOW_STOCK_AT).toBe(3);
    const issue5 = productsInDrop(FIXTURE_CATALOG, 5);
    expect(slugsOf(issue5.filter(isRunningLow))).toEqual(["s05-bui", "s05-suong"]);
    expect(slugsOf(lowStockIn(FIXTURE_CATALOG, 5))).toEqual(["s05-bui", "s05-suong"]);
    // MUỐI has nothing left: gone, not low.
    expect(isRunningLow(FIXTURE_CATALOG.bySlug.get("s05-muoi")!)).toBe(false);
  });
});
