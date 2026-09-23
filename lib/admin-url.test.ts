import { describe, it, expect } from "vitest";
import {
  PER_PAGE_CHOICES,
  hrefWith,
  pageOf,
  paginate,
  perPageOf,
  queryOf,
} from "./admin-url";

describe("queryOf", () => {
  it("takes the first value of a repeated key", () => {
    expect(queryOf({ state: ["PAID", "SHIPPING"] })).toEqual({ state: "PAID" });
  });

  it("drops empty and missing keys", () => {
    expect(queryOf({ q: "", pay: undefined, state: "PAID" })).toEqual({ state: "PAID" });
  });
});

describe("hrefWith", () => {
  it("keeps every other filter when one changes", () => {
    expect(hrefWith("/admin/orders", { state: "PAID", pay: "COD" }, { page: 2 })).toBe(
      "/admin/orders?page=2&pay=COD&state=PAID",
    );
  });

  it("removes a key rather than writing it empty", () => {
    expect(hrefWith("/admin/orders", { state: "PAID" }, { state: null })).toBe("/admin/orders");
    expect(hrefWith("/admin/orders", { state: "PAID" }, { state: "" })).toBe("/admin/orders");
  });

  it("gives the same view the same address whatever order the keys arrived in", () => {
    expect(hrefWith("/x", { b: "2", a: "1" })).toBe(hrefWith("/x", { a: "1", b: "2" }));
  });

  it("escapes what a shopper typed", () => {
    expect(hrefWith("/admin/orders", {}, { q: "a&b=c" })).toBe("/admin/orders?q=a%26b%3Dc");
  });
});

describe("pages", () => {
  it("reads ?page= and refuses anything that is not a page", () => {
    expect(pageOf("3")).toBe(3);
    expect(pageOf("0")).toBe(1);
    expect(pageOf("-2")).toBe(1);
    expect(pageOf("abc")).toBe(1);
    expect(pageOf(undefined)).toBe(1);
  });

  it("offers ten, twenty-five and fifty rows", () => {
    expect(PER_PAGE_CHOICES).toEqual([10, 25, 50]);
    expect(perPageOf("25")).toBe(25);
    expect(perPageOf("13")).toBe(10);
    expect(perPageOf(undefined)).toBe(10);
  });

  it("cuts the list and reports where the page sits in it", () => {
    const rows = Array.from({ length: 24 }, (_, i) => i);
    const page = paginate(rows, 2, 10);
    expect(page.rows).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(page).toMatchObject({ page: 2, pages: 3, from: 11, to: 20, total: 24 });
  });

  it("lands on the last page rather than on an empty table", () => {
    const rows = Array.from({ length: 12 }, (_, i) => i);
    expect(paginate(rows, 9, 10).page).toBe(2);
  });

  it("survives an empty list", () => {
    expect(paginate([], 1, 10)).toMatchObject({ rows: [], pages: 1, from: 0, to: 0, total: 0 });
  });
});
