import { COLORS } from "@/data/colors";
import type { Product } from "@/data/types";
import type { Catalog } from "./catalog";
import type { CsvRow } from "./csv";
import { isIssueStyle, onHand, soldOutSizes, soldUnits } from "./inventory";
import { LEX, issueNo, styleName } from "./lexicon";

/**
 * Every style the shop has as a spreadsheet: "Tải CSV" on the styles table,
 * the file `mau.csv`.
 *
 * Moved out of v3's `ProductsTable` (`components/admin/ProductsTable.tsx`)
 * word for word when the table moved to Arc (round v5 slice 5a), as rows
 * rather than a download, so the file can be tested; the screen hands them to
 * `downloadCsv`, as an issue's file does (`lib/issue-csv.ts`, slice 4). The v3
 * table keeps its own copy until the clean-up slice.
 *
 * One row per style, issue or fixed, in catalogue order, whatever tab the
 * table is on. A fixed style (slice B5) has no issue, no cut and so no "đã
 * bán": those cells are left empty rather than filled with a guess.
 */
export const PRODUCTS_CSV_HEADER: readonly string[] = [
  "Mẫu",
  "Loại",
  "Form",
  LEX.t,
  "Giá (VND)",
  "Màu",
  "Đã cắt",
  "Đã bán",
  "Còn",
  "Size hết",
];

/** The file's name, as v3 gave it. */
export const PRODUCTS_CSV_NAME = "mau.csv";

/** The header, then one row per style. */
export function productsCsvRows(
  catalog: Catalog,
  products: readonly Product[] = catalog.products,
): CsvRow[] {
  return [
    [...PRODUCTS_CSV_HEADER],
    ...products.map((p) => [
      styleName(p.name, p.dropNo),
      p.kind,
      p.fit === "OVERSIZE" ? "oversize" : "regular",
      p.dropNo === null ? "" : issueNo(p.dropNo),
      p.priceVnd,
      p.colors.map((c) => COLORS[c].label).join(" · "),
      p.cutUnits ?? "",
      isIssueStyle(p) ? soldUnits(p) : "",
      onHand(p),
      soldOutSizes(p).join(" · ") || "—",
    ]),
  ];
}
