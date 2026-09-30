import { describe, it, expect } from "vitest";
import {
  FIXED_LOW_AT,
  LOW_STOCK_AT,
  dropSummary,
  fixedLowCells,
  isFixed,
  isIssueStyle,
  isRunningLow,
  lastSoldAtOf,
  productsInDrop,
  productsOnSale,
  soldOutSizes,
  soldUnits,
} from "./inventory";
import { buildCatalog } from "./catalog";
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

describe("the sold-out sizes each low card lists", () => {
  it("reads them off the stock table, not off a stored flag", () => {
    expect(soldOutSizes(FIXTURE_CATALOG.bySlug.get("s05-bui")!)).toEqual(["S", "M"]);
    expect(soldOutSizes(FIXTURE_CATALOG.bySlug.get("s05-suong")!)).toEqual(["S"]);
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
    // MUỐI has nothing left: gone, not low.
    expect(isRunningLow(FIXTURE_CATALOG.bySlug.get("s05-muoi")!)).toBe(false);
  });
});

describe("lastSoldAtOf", () => {
  it("reads the colour's moment, and null for a colour nobody bought", () => {
    const p = { lastSoldAt: { black: "2026-09-23T10:20:00+07:00", cream: null } };
    expect(lastSoldAtOf(p, "black")).toBe("2026-09-23T10:20:00+07:00");
    expect(lastSoldAtOf(p, "cream")).toBeNull();
  });

  it("reads null for a colour the catalogue did not date, and for a style that dates none", () => {
    expect(lastSoldAtOf({ lastSoldAt: { black: "2026-09-23T10:20:00+07:00" } }, "moss")).toBeNull();
    expect(lastSoldAtOf({}, "black")).toBeNull();
    // The fixture dates no sales: they are read off the orders by the database.
    const khoi = FIXTURE_CATALOG.byId.get("p-khoi" as never)!;
    for (const color of khoi.colors) expect(lastSoldAtOf(khoi, color)).toBeNull();
  });
});
