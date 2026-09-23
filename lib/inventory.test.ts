import { describe, it, expect } from "vitest";
import {
  LOW_STOCK_AT,
  dropSummary,
  familyGroupsIn,
  familyKindsLabel,
  lowStockIn,
  onHand,
  soldOutSizes,
  soldUnits,
} from "./inventory";
import { styleCountLabel } from "./money";
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
    expect(low.map((p) => p.slug)).toEqual(["bui", "suong"]);
    expect(low.map((p) => onHand(p))).toEqual([2, 3]);
  });

  it("leaves out a style that has nothing left at all", () => {
    // MUỐI is at zero. Zero is not "sắp hết"; it is gone, and the card says
    // HẾT HÀNG instead of standing in a strip that means "hurry".
    expect(lowStockIn(FIXTURE_CATALOG, 5).some((p) => p.slug === "muoi")).toBe(false);
    expect(onHand(FIXTURE_CATALOG.bySlug.get("muoi")!)).toBe(0);
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
    expect(soldOutSizes(FIXTURE_CATALOG.bySlug.get("bui")!)).toEqual(["S", "M"]);
    expect(soldOutSizes(FIXTURE_CATALOG.bySlug.get("suong")!)).toEqual(["S"]);
  });
});

describe("familyGroupsIn · the 'Mua theo loại' tiles", () => {
  it("covers the open drop family by family", () => {
    expect(
      familyGroupsIn(FIXTURE_CATALOG, 5).map((g) => [g.family, g.styles, g.lead.slug]),
    ).toEqual([
      ["TEE", 3, "khoi"],
      ["HOODIE", 2, "bui"],
      ["JACKET", 2, "suong"],
      ["SHIRT", 1, "gio"],
      ["PANTS", 2, "muoi"],
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
    expect(familyKindsLabel([FIXTURE_CATALOG.bySlug.get("khoi")!, FIXTURE_CATALOG.bySlug.get("cat")!])).toBe(
      "oversize và tay lỡ",
    );
  });

  it("names the plain one rather than leaving a gap", () => {
    // "Áo hoodie" under a row titled Hoodie has nothing left once the family
    // name comes off, so it is called what it is next to the printed one.
    expect(familyKindsLabel([FIXTURE_CATALOG.bySlug.get("bui")!, FIXTURE_CATALOG.bySlug.get("nguoi")!])).toBe(
      "trơn và in",
    );
  });

  it("prints the whole kind when the family carries only one", () => {
    // "dệt" alone names nothing. The garment word that opens the kind comes
    // off, because the row is already titled Sơ mi.
    expect(familyKindsLabel([FIXTURE_CATALOG.bySlug.get("gio")!])).toBe("sơ mi dệt");
    expect(familyKindsLabel([FIXTURE_CATALOG.bySlug.get("muoi")!])).toBe("jogger");
  });

  it("reads as a list, with 'và' before the last", () => {
    const three = familyKindsLabel([
      FIXTURE_CATALOG.bySlug.get("khoi")!,
      FIXTURE_CATALOG.bySlug.get("nang")!,
      FIXTURE_CATALOG.bySlug.get("cat")!,
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
      const p = FIXTURE_CATALOG.bySlug.get(slug)!;
      return `${soldUnits(p)}/${p.cutUnits}`;
    };
    expect(["reu", "tro", "song", "vo", "mua", "kho"].map(line)).toEqual([
      "30/30",
      "40/40",
      "50/50",
      "25/25",
      "20/20",
      "35/35",
    ]);
  });
});
