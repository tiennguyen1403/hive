import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { MAX_RESTOCK_PER_CELL, readRestockCells } from "./catalog-admin";
import {
  addOf,
  colorAdds,
  isThin,
  readAdd,
  restockButton,
  restockCells,
  restockTotal,
  withAdd,
  type RestockDraft,
} from "./restock";

const hoodie = FIXTURE_CATALOG.bySlug.get("hoodie-tron")!;

describe("readAdd · what a cell's box holds", () => {
  it("keeps the digits, as a whole number from 0 to 999", () => {
    expect(readAdd("5")).toBe(5);
    expect(readAdd("0012")).toBe(12);
    expect(readAdd("1.5")).toBe(15);
    expect(readAdd("-3")).toBe(3);
    expect(readAdd("")).toBe(0);
    expect(readAdd("abc")).toBe(0);
    expect(readAdd("1200")).toBe(MAX_RESTOCK_PER_CELL);
  });
});

describe("withAdd and addOf", () => {
  it("sets one cell, clamped to 0–999, leaving the rest alone", () => {
    let d: RestockDraft = {};
    d = withAdd(d, "grey", "M", 6);
    d = withAdd(d, "black", "M", 4);
    d = withAdd(d, "black", "M", -2);
    d = withAdd(d, "cream", "L", 5000);
    expect(addOf(d, "grey", "M")).toBe(6);
    expect(addOf(d, "black", "M")).toBe(0);
    expect(addOf(d, "cream", "L")).toBe(999);
    expect(addOf(d, "grey", "S")).toBe(0);
  });
});

describe("restockCells · what 'Nhập thêm' sends", () => {
  it("sends only the cells with something to add, each with the number the sheet showed", () => {
    // HOODIE TRƠN: grey 5·0·4·2, black 4·0·6·3, cream 3·0·2·2.
    let d: RestockDraft = {};
    d = withAdd(d, "cream", "M", 5);
    d = withAdd(d, "grey", "M", 6);
    d = withAdd(d, "grey", "XL", 3);
    d = withAdd(d, "black", "L", 0);
    expect(restockCells(hoodie, d)).toEqual([
      { color: "grey", size: "M", before: 0, add: 6 },
      { color: "grey", size: "XL", before: 2, add: 3 },
      { color: "cream", size: "M", before: 0, add: 5 },
    ]);
    expect(restockTotal(hoodie, d)).toBe(14);
    expect(colorAdds(hoodie, d, "grey")).toBe(9);
    expect(colorAdds(hoodie, d, "black")).toBe(0);
  });

  it("is exactly what the action reads", () => {
    const d = withAdd(withAdd({}, "grey", "M", 6), "cream", "XL", 999);
    expect(readRestockCells(restockCells(hoodie, d))).toEqual([
      { color: "grey", size: "M", before: 0, after: 6 },
      { color: "cream", size: "XL", before: 2, after: 1001 },
    ]);
  });

  it("ignores a colour the style does not come in", () => {
    const d = withAdd({}, "moss", "M", 4);
    expect(restockCells(hoodie, d)).toEqual([]);
    expect(restockTotal(hoodie, d)).toBe(0);
  });
});

describe("restockButton · the sheet's confirm says the job", () => {
  it("counts the pieces, or says what is missing", () => {
    expect(restockButton(14)).toEqual({ ready: true, label: "Nhập thêm 14 chiếc" });
    expect(restockButton(1)).toEqual({ ready: true, label: "Nhập thêm 1 chiếc" });
    expect(restockButton(0)).toEqual({ ready: false, label: "Nhập số cần thêm" });
  });
});

describe("isThin · a cell the grid marks red", () => {
  it("is two or fewer, the fixed style's own line", () => {
    expect(isThin(0)).toBe(true);
    expect(isThin(2)).toBe(true);
    expect(isThin(3)).toBe(false);
  });
});
