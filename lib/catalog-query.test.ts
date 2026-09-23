import { describe, it, expect } from "vitest";
import {
  DEFAULT_SORT,
  PRICE_BANDS,
  SORT_KEYS,
  clearFilters,
  colorCounts,
  familyCounts,
  fitCounts,
  fold,
  isBandApplied,
  isFiltered,
  parseListingQuery,
  priceBandCounts,
  priceRangeOf,
  queryToSearchParams,
  runListingQuery,
  sizeCounts,
} from "./catalog-query";
import { productsInDrop } from "./inventory";
import { CATALOG } from "@/data/catalog";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { FAMILY_LABELS } from "@/data/types";

const DROP5 = productsInDrop(FIXTURE_CATALOG, 5);

describe("fold", () => {
  it("drops the tone marks a shopper will not type", () => {
    expect(fold("Áo khoác dù")).toBe("ao khoac du");
    expect(fold("NGUỘI")).toBe("nguoi");
  });

  it("folds đ to d — different job from sorting, where đ is its own letter", () => {
    // `compareByName` in data/regions.ts keeps đ after d because that is the
    // alphabet. A search box is not an alphabet: someone typing "du" on a
    // keyboard without đ still means "dù".
    expect(fold("Đen")).toBe("den");
    expect(fold("ĐỎ")).toBe("do");
  });

  it("collapses case and outer whitespace", () => {
    expect(fold("  HoOdIe ")).toBe("hoodie");
  });
});

// ───────────────────────────────────────────────────────────────── parsing
describe("parseListingQuery", () => {
  it("reads nothing out of an empty URL and lands on the default sort", () => {
    const q = parseListingQuery({});
    expect(q).toEqual({
      families: [],
      fits: [],
      sizes: [],
      colors: [],
      sort: DEFAULT_SORT,
    });
  });

  it("reads the family the nav's links carry", () => {
    expect(parseListingQuery({ family: "HOODIE" }).families).toEqual(["HOODIE"]);
    expect(parseListingQuery({ family: "TEE,PANTS" }).families).toEqual(["TEE", "PANTS"]);
  });

  it("drops a family that is not one of ours", () => {
    expect(parseListingQuery({ family: "SOCKS" }).families).toEqual([]);
    expect(parseListingQuery({ family: "hoodie" }).families).toEqual([]);
  });

  it("reads a comma-separated fit list", () => {
    expect(parseListingQuery({ fit: "OVERSIZE" }).fits).toEqual(["OVERSIZE"]);
    expect(parseListingQuery({ fit: "OVERSIZE,REGULAR" }).fits).toEqual([
      "OVERSIZE",
      "REGULAR",
    ]);
  });

  it("reads a repeated parameter as a list too, because a browser may send it that way", () => {
    expect(parseListingQuery({ size: ["M", "L"] }).sizes).toEqual(["M", "L"]);
  });

  it("throws away a value that is not one of ours instead of trusting the URL", () => {
    expect(parseListingQuery({ fit: "SLIM" }).fits).toEqual([]);
    expect(parseListingQuery({ size: "XXL,M" }).sizes).toEqual(["M"]);
    expect(parseListingQuery({ sort: "cheapest" }).sort).toBe(DEFAULT_SORT);
  });

  it("reads a price window", () => {
    const q = parseListingQuery({ min: "300000", max: "900000" });
    expect(q.minVnd).toBe(300_000);
    expect(q.maxVnd).toBe(900_000);
  });

  it("ignores a price that is not a number", () => {
    expect(parseListingQuery({ min: "cheap" }).minVnd).toBeUndefined();
  });

  it("swaps a backwards price window rather than returning nothing", () => {
    const q = parseListingQuery({ min: "900000", max: "300000" });
    expect(q.minVnd).toBe(300_000);
    expect(q.maxVnd).toBe(900_000);
  });

  it("keeps the search term as typed, so it can be shown back in the box", () => {
    expect(parseListingQuery({ q: "  Hoodie " }).q).toBe("Hoodie");
  });

  it("treats a blank search term as no search", () => {
    expect(parseListingQuery({ q: "   " }).q).toBeUndefined();
  });
});

describe("queryToSearchParams", () => {
  it("round-trips, so a filtered listing is a link someone can send", () => {
    const q = parseListingQuery({
      fit: "OVERSIZE",
      size: "M,L",
      min: "300000",
      max: "900000",
      sort: "price-asc",
      q: "hoodie",
    });
    expect(parseListingQuery(Object.fromEntries(queryToSearchParams(q)))).toEqual(q);
  });

  it("leaves the default sort out of the URL instead of pinning it there", () => {
    const q = parseListingQuery({ fit: "OVERSIZE" });
    expect(queryToSearchParams(q).toString()).toBe("fit=OVERSIZE");
  });

  it("produces an empty string for an unfiltered listing", () => {
    expect(queryToSearchParams(parseListingQuery({})).toString()).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────── filtering
describe("runListingQuery · filters", () => {
  it("returns every style when nothing is asked for", () => {
    expect(runListingQuery(DROP5, parseListingQuery({}))).toHaveLength(10);
  });

  it("keeps only the chosen fit", () => {
    const got = runListingQuery(DROP5, parseListingQuery({ fit: "REGULAR" }));
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((p) => p.fit === "REGULAR")).toBe(true);
  });

  it("keeps only the chosen family — the nav's five links have to land", () => {
    const got = runListingQuery(DROP5, parseListingQuery({ family: "HOODIE" }));
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((p) => p.family === "HOODIE")).toBe(true);
  });

  it("returns something for every family link in the nav", () => {
    // A nav link that lands on an empty grid is a dead control.
    for (const family of ["TEE", "HOODIE", "JACKET", "SHIRT", "PANTS"]) {
      expect(runListingQuery(DROP5, parseListingQuery({ family })).length).toBeGreaterThan(0);
    }
  });

  it("keeps a style only if the asked-for size is actually still there", () => {
    // BỤI has one L and one XL left. Filtering to S must not return it,
    // even though BỤI was cut in S.
    const got = runListingQuery(DROP5, parseListingQuery({ size: "S" }));
    expect(got.map((p) => p.slug)).not.toContain("bui");
  });

  it("treats several sizes as 'any of these', not 'all of these'", () => {
    const got = runListingQuery(DROP5, parseListingQuery({ size: "L,XL" }));
    expect(got.map((p) => p.slug)).toContain("bui");
  });

  it("keeps a style inside the price window, at both edges", () => {
    const got = runListingQuery(DROP5, parseListingQuery({ min: "390000", max: "890000" }));
    expect(got.map((p) => p.slug)).toContain("khoi"); // 390.000 — the floor
    expect(got.map((p) => p.slug)).toContain("bui"); // 890.000 — the ceiling
    expect(got.map((p) => p.slug)).not.toContain("nguoi"); // 1.290.000
  });

  it("matches a search term against the name", () => {
    const got = runListingQuery(DROP5, parseListingQuery({ q: "bui" }));
    expect(got.map((p) => p.slug)).toEqual(["bui"]);
  });

  it("matches a search term against the kind, ignoring tone marks", () => {
    const got = runListingQuery(DROP5, parseListingQuery({ q: "ao khoac" }));
    expect(got.every((p) => p.kind.includes("khoác"))).toBe(true);
    expect(got.length).toBeGreaterThan(0);
  });

  it("matches the material, because that is how people describe a hoodie", () => {
    const got = runListingQuery(DROP5, parseListingQuery({ q: "ni bong" }));
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((p) => fold(p.material).includes("ni bong"))).toBe(true);
  });

  it("returns nothing for a term that is in none of the styles", () => {
    expect(runListingQuery(DROP5, parseListingQuery({ q: "áo len" }))).toEqual([]);
  });

  it("applies every filter at once", () => {
    const got = runListingQuery(
      DROP5,
      parseListingQuery({ fit: "OVERSIZE", size: "L", max: "500000" }),
    );
    expect(got.every((p) => p.fit === "OVERSIZE" && p.priceVnd <= 500_000)).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────── sorting
describe("runListingQuery · sorting", () => {
  it("offers exactly the four orderings the sort menu lists, in that order", () => {
    expect([...SORT_KEYS]).toEqual(["newest", "low-stock", "price-asc", "price-desc"]);
  });

  it("puts the cheapest first on price-asc", () => {
    const got = runListingQuery(DROP5, parseListingQuery({ sort: "price-asc" }));
    const prices = got.map((p) => p.priceVnd);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("puts the dearest first on price-desc", () => {
    const got = runListingQuery(DROP5, parseListingQuery({ sort: "price-desc" }));
    const prices = got.map((p) => p.priceVnd);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  it("puts the nearly-gone first on low-stock, and the sold-out last of all", () => {
    // A style with nothing left is not "almost gone" — it is over. Leading
    // with it would fill the top of the grid with things nobody can buy.
    const got = runListingQuery(DROP5, parseListingQuery({ sort: "low-stock" }));
    const slugs = got.map((p) => p.slug);
    expect(slugs.indexOf("bui")).toBeLessThan(slugs.indexOf("khoi"));
    expect(slugs.at(-1)).toBe("muoi"); // the sold-out one
  });

  it("keeps catalog order on newest, which is the order the drop was laid out in", () => {
    const got = runListingQuery(DROP5, parseListingQuery({ sort: "newest" }));
    expect(got.map((p) => p.slug)).toEqual(DROP5.map((p) => p.slug));
  });

  it("does not reorder the array it was given", () => {
    const before = DROP5.map((p) => p.slug);
    runListingQuery(DROP5, parseListingQuery({ sort: "price-asc" }));
    expect(DROP5.map((p) => p.slug)).toEqual(before);
  });
});

// ──────────────────────────────────────────────────────────────── the counts
describe("the tallies behind every tab and chip", () => {
  it("counts the open drop's five families", () => {
    expect(familyCounts(DROP5)).toEqual([
      { value: "TEE", styles: 3 },
      { value: "HOODIE", styles: 2 },
      { value: "JACKET", styles: 2 },
      { value: "SHIRT", styles: 1 },
      { value: "PANTS", styles: 2 },
    ]);
  });

  it("adds every family count back up to the drop", () => {
    expect(familyCounts(DROP5).reduce((n, t) => n + t.styles, 0)).toBe(DROP5.length);
  });

  it("collapses the ten kinds of the open drop down to five families", () => {
    // "Áo hoodie" and "Áo hoodie in" are one family; so are "Áo thun" and
    // "Áo thun tay lỡ". Listed by kind the drop offers ten near-duplicate
    // tabs, four of which differ only by a cut. Inherited from the
    // `familiesIn` tests, which went with the function at slice 3.
    expect(new Set(DROP5.map((p) => p.kind)).size).toBe(10);
    expect(familyCounts(DROP5)).toHaveLength(5);
  });

  it("gives every family a label that is a prefix of its kinds", () => {
    // That is WHY searching a family label returns that family, so it is
    // worth pinning rather than leaving as a happy accident of how the
    // fixtures are worded. It already earned its keep: it caught "Áo gile"
    // filed under "Áo khoác".
    for (const p of CATALOG) {
      expect(fold(p.kind).startsWith(fold(FAMILY_LABELS[p.family]))).toBe(true);
    }
  });

  it("returns results for every family label it offers", () => {
    // These become the chips on the empty-search screen. A chip that leads
    // to another empty page is worse than no chip at all.
    for (const t of familyCounts(DROP5)) {
      const label = FAMILY_LABELS[t.value];
      expect(
        runListingQuery(DROP5, parseListingQuery({ q: label })).length,
        `chip "${label}" returned nothing`,
      ).toBeGreaterThan(0);
    }
  });

  it("leaves out a family the drop does not carry", () => {
    // VEST is in FAMILIES and in drop 04. A "Áo gile 0" tab would lead to an
    // empty grid.
    expect(familyCounts(DROP5).some((t) => t.value === "VEST")).toBe(false);
    expect(familyCounts(productsInDrop(FIXTURE_CATALOG, 4)).some((t) => t.value === "VEST")).toBe(true);
  });

  it("splits the drop by fit", () => {
    expect(fitCounts(DROP5)).toEqual([
      { value: "OVERSIZE", styles: 6 },
      { value: "REGULAR", styles: 4 },
    ]);
  });

  it("counts sizes by what is LEFT, not by what was cut", () => {
    expect(sizeCounts(DROP5)).toEqual([
      { value: "S", styles: 7 },
      { value: "M", styles: 8 },
      { value: "L", styles: 9 },
      { value: "XL", styles: 8 },
    ]);
  });

  it("agrees with the filter it labels", () => {
    // The number on the chip has to be the number of cards you get after
    // tapping it, or the chip is lying.
    for (const t of sizeCounts(DROP5)) {
      expect(
        runListingQuery(DROP5, parseListingQuery({ size: t.value })).length,
        `size ${t.value}`,
      ).toBe(t.styles);
    }
    for (const t of familyCounts(DROP5)) {
      expect(
        runListingQuery(DROP5, parseListingQuery({ family: t.value })).length,
        `family ${t.value}`,
      ).toBe(t.styles);
    }
    for (const t of colorCounts(DROP5)) {
      expect(
        runListingQuery(DROP5, parseListingQuery({ color: t.value })).length,
        `colour ${t.value}`,
      ).toBe(t.styles);
    }
  });

  it("lists the drop's colourways commonest first", () => {
    expect(colorCounts(DROP5).map((t) => [t.value, t.styles])).toEqual([
      ["black", 7],
      ["cream", 3],
      ["moss", 3],
      ["white", 3],
      ["grey", 2],
      ["navy", 2],
      ["brown", 1],
    ]);
  });

  it("splits the drop into three price bands that do not overlap", () => {
    expect(priceBandCounts(DROP5).map((b) => [b.id, b.styles])).toEqual([
      ["under-500k", 3],
      ["500k-1m", 4],
      ["over-1m", 3],
    ]);
    expect(priceBandCounts(DROP5).reduce((n, b) => n + b.styles, 0)).toBe(DROP5.length);
  });

  it("counts a band as the filter it writes into the URL", () => {
    for (const band of priceBandCounts(DROP5)) {
      const url: Record<string, string> = {};
      if (band.minVnd !== undefined) url.min = String(band.minVnd);
      if (band.maxVnd !== undefined) url.max = String(band.maxVnd);
      expect(runListingQuery(DROP5, parseListingQuery(url)).length, band.id).toBe(
        band.styles,
      );
    }
  });

  it("knows which band the URL is standing in", () => {
    const q = parseListingQuery({ min: "500000", max: "1000000" });
    expect(PRICE_BANDS.filter((b) => isBandApplied(q, b)).map((b) => b.id)).toEqual([
      "500k-1m",
    ]);
    expect(PRICE_BANDS.some((b) => isBandApplied(parseListingQuery({}), b))).toBe(false);
  });

  it("reports the drop's real price ends", () => {
    expect(priceRangeOf(DROP5)).toEqual({ minVnd: 390_000, maxVnd: 1_450_000 });
    expect(priceRangeOf([])).toBeUndefined();
  });
});

describe("catalog assumptions these tests rest on", () => {
  it("still has ten styles in the open drop and MUỐI sold out", () => {
    expect(DROP5).toHaveLength(10);
    expect(CATALOG.find((p) => p.slug === "muoi")?.dropNo).toBe(5);
  });
});
