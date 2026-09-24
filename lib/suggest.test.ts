import { describe, it, expect } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { productsInDrop } from "./inventory";
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

  it("offers the style whose name starts with the term, marked", () => {
    const s = suggestFor(pool, "kh");
    expect(s.styles[0]!.product.slug).toBe("s05-khoi");
    expect(s.styles[0]!.range).toEqual([0, 2]);
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
