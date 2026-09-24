import { describe, it, expect } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { productsInDrop, productsOnSale } from "./inventory";
import { MAX_GROUPS, MAX_STYLES, matchRange, suggestFor } from "./suggest";

const pool = productsInDrop(FIXTURE_CATALOG, FIXTURE_CATALOG.currentDropNo);

describe("matchRange", () => {
  it("finds the term where it sits in the original text", () => {
    expect(matchRange("KHÓI", "kh")).toEqual([0, 2]);
    expect(matchRange("Áo thun oversize", "thun")).toEqual([3, 7]);
  });

  it("ignores accents in both directions", () => {
    // Typed without marks, found with them — and the range still points at
    // the accented letters, so the highlight lands on what is on screen.
    expect(matchRange("KHÓI", "khoi")).toEqual([0, 4]);
    expect(matchRange("Áo khoác dù", "khoac")).toEqual([3, 8]);
    expect(matchRange("Đen", "den")).toEqual([0, 3]);
  });

  it("keeps the spaces inside a term", () => {
    expect(matchRange("Áo thun oversize", "áo thun")).toEqual([0, 7]);
    expect(matchRange("Áothun", "áo thun")).toBeNull();
  });

  it("says no rather than guessing", () => {
    expect(matchRange("KHÓI", "zzz")).toBeNull();
    expect(matchRange("KHÓI", "  ")).toBeNull();
  });
});

describe("suggestFor", () => {
  it("stays shut under two characters", () => {
    const s = suggestFor(pool, "k");
    expect(s.styles).toHaveLength(0);
    expect(s.groups).toHaveLength(0);
    expect(s.fallback).toBe(false);
  });

  it("offers the style whose name carries the term, marked in the name as shown", () => {
    // The name on screen is "S05 – KHÓI" (v3 slice 11), so the mark sits
    // after the issue's code: characters 6 to 8.
    const s = suggestFor(pool, "kh");
    expect(s.styles[0]!.product.slug).toBe("s05-khoi");
    expect(s.styles[0]!.name).toBe("S05\u00a0– KHÓI");
    expect(s.styles[0]!.range).toEqual([6, 8]);
    expect(s.fallback).toBe(false);
  });

  it("offers the family behind the term, with its count and its cheapest", () => {
    const s = suggestFor(pool, "kh");
    const jacket = s.groups.find((g) => g.id === "family:JACKET");
    expect(jacket).toBeDefined();
    expect(jacket!.label).toBe("Khoác");
    expect(jacket!.styles).toBe(pool.filter((p) => p.family === "JACKET").length);
    expect(jacket!.fromVnd).toBe(
      Math.min(...pool.filter((p) => p.family === "JACKET").map((p) => p.priceVnd)),
    );
    expect(jacket!.href).toBe("/products?family=JACKET");
  });

  it("matches a colourway a style was cut in, without marking the name", () => {
    const s = suggestFor(pool, "xanh than");
    expect(s.styles.length).toBeGreaterThan(0);
    expect(s.styles.every((x) => x.range === null)).toBe(true);
    expect(s.styles.map((x) => x.product.slug)).toContain("s05-than");
  });

  it("never offers more than it has room for", () => {
    const s = suggestFor(pool, "áo");
    expect(s.styles.length).toBeLessThanOrEqual(MAX_STYLES);
    expect(s.groups.length).toBeLessThanOrEqual(MAX_GROUPS);
  });

  it("falls back to the biggest families when nothing matches", () => {
    const s = suggestFor(pool, "zzzz");
    expect(s.styles).toHaveLength(0);
    expect(s.fallback).toBe(true);
    expect(s.groups.length).toBeGreaterThan(0);
    expect(s.groups.every((g) => g.id.startsWith("family:"))).toBe(true);
    // Biggest first, and none of them marked — nothing was matched.
    const counts = s.groups.map((g) => g.styles);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
    expect(s.groups.every((g) => g.range === null)).toBe(true);
  });

  it("only offers what this issue actually carries", () => {
    const slugs = new Set(pool.map((p) => p.slug));
    for (const x of suggestFor(pool, "áo").styles) {
      expect(slugs.has(x.product.slug)).toBe(true);
    }
  });
});

// ───────────────────────────────────── the issue's code in the name (v3 slice 11)
describe("matchRange · spaces and dashes", () => {
  const KHOI = "S05\u00a0– KHÓI";

  it("reads a run of spaces and dashes as one space, as a shopper types it", () => {
    expect(matchRange(KHOI, "s05 khoi")).toEqual([0, KHOI.length]);
    expect(matchRange(KHOI, "S05 – KHÓI")).toEqual([0, KHOI.length]);
    expect(matchRange(KHOI, "s05-khoi")).toEqual([0, KHOI.length]);
    expect(matchRange(KHOI, KHOI)).toEqual([0, KHOI.length]);
  });

  it("marks the code alone, or the name alone, where each sits", () => {
    expect(matchRange(KHOI, "s05")).toEqual([0, 3]);
    expect(matchRange(KHOI, "khoi")).toEqual([6, 10]);
  });

  it("still wants the words apart, and a dash alone is no term", () => {
    expect(matchRange(KHOI, "s05khoi")).toBeNull();
    expect(matchRange(KHOI, "–")).toBeNull();
  });
});

describe("suggestFor · by the issue's code", () => {
  const onSale = productsOnSale(FIXTURE_CATALOG, new Date("2026-09-20T18:50:00+07:00"));

  it("offers the issue's styles for its code, the code marked", () => {
    const s = suggestFor(onSale, "s05");
    expect(s.styles).toHaveLength(MAX_STYLES);
    expect(s.styles.every((x) => x.product.dropNo === 5)).toBe(true);
    expect(s.styles.every((x) => x.name.startsWith("S05") && x.range?.join() === "0,3")).toBe(true);
  });

  it("finds one style by its code and name, however they are typed or pasted", () => {
    for (const term of ["S05 KHÓI", "s05 khoi", "S05 – KHÓI", "S05\u00a0– KHÓI"]) {
      const s = suggestFor(onSale, term);
      expect(s.styles.map((x) => x.product.slug), term).toEqual(["s05-khoi"]);
      expect(s.styles[0]!.range, term).toEqual([0, s.styles[0]!.name.length]);
    }
  });

  it("leaves a fixed style as it was: its name has no code in front", () => {
    const s = suggestFor(onSale, "ao thun tron");
    expect(s.styles.map((x) => [x.product.slug, x.name, x.range])).toEqual([
      ["ao-thun-tron", "ÁO THUN TRƠN", [0, 12]],
    ]);
  });
});
