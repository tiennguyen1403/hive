import { COLORS } from "@/data/colors";
import { SIZES, type Product } from "@/data/types";
import type { Catalog } from "./catalog";
import type { CsvRow } from "./csv";
import { onHandOf, productsInDrop, soldUnits } from "./inventory";
import { issueNo, styleName } from "./lexicon";

/**
 * One issue as a spreadsheet: a row per style, colour and size ("Tải CSV số
 * này", and "Tải CSV" on an issue's row).
 *
 * Moved out of v3's `downloadIssueCsv` (`components/admin/AdminDropsScreen.tsx`)
 * word for word when the screen moved to Arc (round v5 slice 4), as rows
 * rather than a download, so the file can be tested; the screen hands them to
 * `downloadCsv`. The v3 screen keeps its own copy until the clean-up slice.
 *
 * The three style-level figures repeat down the rows, and their headers say
 * so — a flat file has no other way to carry two levels, and silently
 * printing a style's revenue against one size would read as that size's.
 */
export const ISSUE_CSV_HEADER: readonly string[] = [
  "Mẫu",
  "Loại",
  "Màu",
  "Size",
  "Còn (size × màu)",
  "Đã cắt (mẫu)",
  "Đã bán (mẫu)",
  "Doanh thu mẫu (VND)",
];

/** The header, then one row per style × colour × size, in catalogue order. */
export function issueCsvRows(
  catalog: Catalog,
  no: number,
  products: readonly Product[] = catalog.products,
): CsvRow[] {
  const rows: CsvRow[] = [[...ISSUE_CSV_HEADER]];
  for (const p of productsInDrop(catalog, no, products)) {
    for (const color of p.colors) {
      for (const size of SIZES) {
        rows.push([
          styleName(p.name, p.dropNo),
          p.kind,
          COLORS[color].label,
          size,
          onHandOf(p, color, size),
          p.cutUnits,
          soldUnits(p),
          p.priceVnd * soldUnits(p),
        ]);
      }
    }
  }
  return rows;
}

/** `so-05.csv`: the file's name, the issue's number as the shop writes it. */
export function issueCsvName(no: number): string {
  return `so-${issueNo(no)}.csv`;
}
