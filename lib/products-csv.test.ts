import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { toCsv } from "./csv";
import { styleName } from "./lexicon";
import { PRODUCTS_CSV_HEADER, PRODUCTS_CSV_NAME, productsCsvRows } from "./products-csv";

/**
 * The styles' CSV (round v5 slice 5a), moved from v3's `ProductsTable`: the
 * header v3 wrote, then one row per style, every style the shop has, issue or
 * fixed, in catalogue order. A fixed style has no issue, no cut and so no
 * "đã bán": those three cells stay empty, as in v3.
 */
describe("productsCsvRows", () => {
  const rows = productsCsvRows(FIXTURE_CATALOG);
  const named = (shown: string) => rows.find((r) => r[0] === shown);

  it("opens with v3's header, word for word", () => {
    expect(rows[0]).toEqual([
      "Mẫu",
      "Loại",
      "Form",
      "Số",
      "Giá (VND)",
      "Màu",
      "Đã cắt",
      "Đã bán",
      "Còn",
      "Size hết",
    ]);
    expect(rows[0]).toEqual([...PRODUCTS_CSV_HEADER]);
  });

  it("has one row per style, every style the shop has, in catalogue order", () => {
    expect(rows.length - 1).toBe(FIXTURE_CATALOG.products.length);
    expect(rows.slice(1).map((r) => r[0])).toEqual(
      FIXTURE_CATALOG.products.map((p) => styleName(p.name, p.dropNo)),
    );
  });

  it("writes an issue's style with its issue, its cut and what has sold", () => {
    // KHÓI of Số 05: 35 cut, 17 on the shelf, so 18 sold; no size gone.
    expect(named(styleName("KHÓI", 5))).toEqual([
      styleName("KHÓI", 5),
      "Áo thun oversize",
      "oversize",
      "05",
      390_000,
      "Đen · Kem",
      35,
      18,
      17,
      "—",
    ]);
    // MUỐI of Số 05 is gone in every size.
    expect(named(styleName("MUỐI", 5))?.slice(-3)).toEqual([14, 0, "S · M · L · XL"]);
  });

  it("leaves a fixed style's issue, cut and sold empty rather than guessing", () => {
    expect(named("HOODIE TRƠN")).toEqual([
      "HOODIE TRƠN",
      "Áo hoodie",
      "oversize",
      "",
      750_000,
      "Xám · Đen · Kem",
      "",
      "",
      31,
      "M",
    ]);
    expect(named("GILE PHAO")?.[2]).toBe("regular");
  });

  it("writes numbers raw, so the file can be summed", () => {
    const line = toCsv([rows[0]!, named(styleName("KHÓI", 5))!]).split("\r\n")[1];
    // `toCsv` turns the no-break space of "S05 –" into an ordinary one (v3 slice 13).
    expect(line).toBe("S05 – KHÓI,Áo thun oversize,oversize,05,390000,Đen · Kem,35,18,17,—");
  });

  it("is named mau.csv, as in v3", () => {
    expect(PRODUCTS_CSV_NAME).toBe("mau.csv");
  });
});
