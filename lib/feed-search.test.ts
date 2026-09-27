import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { SEARCH_SUGGEST, searchPool, searchRail, searchStyles, suggestTerms } from "./feed-search";

const C = FIXTURE_CATALOG;
/** The fixture's calendar: Số 05 sells 11/09 20:00 → 25/09 20:00, Số 06 opens 02/10. */
const OPEN = new Date("2026-09-21T19:02:00+07:00");
/** Số 05 has closed and Số 06 is announced: the shop still shows Số 05 as its issue line. */
const AFTER = new Date("2026-09-28T19:02:00+07:00");
const names = (ps: { name: string }[]) => ps.map((p) => p.name);

describe("what a search looks through", () => {
  it("is the shop's issue line and the fixed line, never the older issues", () => {
    const pool = searchPool(C, OPEN);
    expect(pool).toHaveLength(18);
    expect(pool.every((p) => p.dropNo === 5 || p.dropNo === null)).toBe(true);
  });

  it("keeps the issue that just closed, which the shop still shows as a line", () => {
    const pool = searchPool(C, AFTER);
    expect(pool.filter((p) => p.dropNo === 5)).toHaveLength(10);
  });
});

describe("a query", () => {
  const pool = searchPool(C, OPEN);

  it("finds every style whose words it carries, accents and case aside", () => {
    expect(names(searchStyles(pool, "hoodie"))).toEqual(["BỤI", "NGUỘI", "HOODIE TRƠN"]);
    expect(names(searchStyles(pool, "HOODIE"))).toEqual(names(searchStyles(pool, "hoodie")));
    expect(names(searchStyles(pool, "suong"))).toEqual(["SƯƠNG"]);
    expect(names(searchStyles(pool, "ao thun tay dai"))).toEqual(["ÁO THUN TAY DÀI"]);
  });

  it("asks for every word, in any order", () => {
    expect(names(searchStyles(pool, "khoác áo"))).toEqual(names(searchStyles(pool, "áo khoác")));
    expect(names(searchStyles(pool, "áo khoác"))).toEqual(["SƯƠNG", "THAN", "ÁO KHOÁC DÙ"]);
  });

  it("reads the family, the fit and the print too", () => {
    expect(searchStyles(pool, "oversize").every((p) => p.fit === "OVERSIZE")).toBe(true);
    expect(searchStyles(pool, "oversize").length).toBeGreaterThan(5);
    expect(names(searchStyles(pool, "gile"))).toEqual(["GILE PHAO"]);
    expect(names(searchStyles(pool, "ban do mon"))).toEqual(["BỤI"]);
  });

  it("finds nothing for nothing", () => {
    expect(searchStyles(pool, "")).toEqual([]);
    expect(searchStyles(pool, "   ")).toEqual([]);
    expect(searchStyles(pool, "zzz")).toEqual([]);
  });
});

describe("the suggestions", () => {
  it("are the mock's five, each finding something while Số 05 sells and after", () => {
    expect(suggestTerms(searchPool(C, OPEN))).toEqual([...SEARCH_SUGGEST]);
    expect(suggestTerms(searchPool(C, AFTER))).toEqual([...SEARCH_SUGGEST]);
  });

  it("leave out a term that would find nothing", () => {
    const tees = searchPool(C, OPEN).filter((p) => p.family === "TEE");
    expect(suggestTerms(tees)).toEqual(["oversize", "cotton"]);
  });
});

describe("the rail under an empty search", () => {
  it("is the issue while it sells", () => {
    const r = searchRail(C, OPEN);
    expect(r.sub).toBe("Số 05");
    expect(r.href).toBe("/products?line=5");
    expect(r.items).toHaveLength(10);
  });

  it("is the fixed line between issues", () => {
    const r = searchRail(C, AFTER);
    expect(r.sub).toBe("Cố định");
    expect(r.href).toBe("/products?line=fixed");
    expect(r.items).toHaveLength(8);
  });
});
