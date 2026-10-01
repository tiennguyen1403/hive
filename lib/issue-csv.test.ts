import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { SIZES } from "@/data/types";
import { toCsv } from "./csv";
import { productsInDrop } from "./inventory";
import { ISSUE_CSV_HEADER, issueCsvName, issueCsvRows } from "./issue-csv";
import { styleName } from "./lexicon";

/**
 * An issue's CSV (round v5 slice 4), moved from v3's `downloadIssueCsv`: the
 * header v3 wrote, then one row per style × colour × size, the style's three
 * figures repeated down its rows.
 */
describe("issueCsvRows", () => {
  const rows = issueCsvRows(FIXTURE_CATALOG, 5);

  it("opens with v3's header, word for word", () => {
    expect(rows[0]).toEqual([
      "Mẫu",
      "Loại",
      "Màu",
      "Size",
      "Còn (size × màu)",
      "Đã cắt (mẫu)",
      "Đã bán (mẫu)",
      "Doanh thu mẫu (VND)",
    ]);
    expect(rows[0]).toEqual([...ISSUE_CSV_HEADER]);
  });

  it("has one row for every style of the issue, in each of its colours, in each size", () => {
    const styles = productsInDrop(FIXTURE_CATALOG, 5);
    const expected = styles.reduce((n, p) => n + p.colors.length * SIZES.length, 0);
    expect(rows.length - 1).toBe(expected);
    // Every row is one of the issue's styles, one of its colours, one size.
    for (const row of rows.slice(1)) {
      expect(styles.map((p) => styleName(p.name, p.dropNo))).toContain(row[0]);
      expect(SIZES).toContain(row[3]);
    }
  });

  it("puts what is left of the cell, and the style's cut, sales and revenue, on each row", () => {
    // The name as every screen shows it: a no-break space holds "S05 –" together.
    const khoi = "S05\u00a0– KHÓI";
    expect(styleName("KHÓI", 5)).toBe(khoi);
    // KHÓI, the first style of Số 05: black S has 3 left; 35 cut, 17 left, so 18 sold at 390.000.
    expect(rows[1]).toEqual([khoi, "Áo thun oversize", "Đen", "S", 3, 35, 18, 7_020_000]);
    // Its cream XL, the last of its eight rows.
    expect(rows[8]).toEqual([khoi, "Áo thun oversize", "Kem", "XL", 1, 35, 18, 7_020_000]);
    expect(rows[9]![0]).not.toBe(khoi);
  });

  it("writes numbers raw, so the file can be summed", () => {
    // `toCsv` turns the no-break space into an ordinary one (v3 slice 13).
    expect(toCsv(rows.slice(0, 2)).split("\r\n")[1]).toBe("S05 – KHÓI,Áo thun oversize,Đen,S,3,35,18,7020000");
  });

  it("is the header alone for an issue with no style yet", () => {
    expect(issueCsvRows(FIXTURE_CATALOG, 6)).toEqual([[...ISSUE_CSV_HEADER]]);
  });
});

describe("issueCsvName", () => {
  it("names the file after the issue, two digits, as v3 did", () => {
    expect(issueCsvName(5)).toBe("so-05.csv");
    expect(issueCsvName(12)).toBe("so-12.csv");
  });
});
