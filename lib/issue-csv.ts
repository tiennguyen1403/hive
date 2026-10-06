import { COLORS, colorLabel } from "@/data/colors";
import { SIZES, type Product } from "@/data/types";
import type { Catalog } from "./catalog";
import type { CsvRow } from "./csv";
import { onHandOf, productsInDrop, soldUnits } from "./inventory";
import { pick, type Locale } from "./i18n";
import { issueNo, styleName } from "./lexicon";
import { productText } from "./product-text";

/**
 * One issue as a spreadsheet: a row per style, colour and size ("Tải CSV số
 * này", and "Tải CSV" on an issue's row).
 *
 * Moved out of v3's `downloadIssueCsv` (`components/admin/AdminDropsScreen.tsx`)
 * word for word when the screen moved to Arc (round v5 slice 4), as rows
 * rather than a download, so the file can be tested; the screen hands them to
 * `downloadCsv`. The v3 screen and its own copy went at slice 6.
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

/** The same columns in English (round v6 slice E5). */
const ISSUE_CSV_HEADER_EN: readonly string[] = [
  "Style",
  "Type",
  "Colour",
  "Size",
  "Left (size × colour)",
  "Cut (style)",
  "Sold (style)",
  "Style revenue (VND)",
];

/** The header, then one row per style × colour × size, in catalogue order. */
export function issueCsvRows(
  catalog: Catalog,
  no: number,
  products: readonly Product[] = catalog.products,
  locale: Locale = "vi",
): CsvRow[] {
  const en = locale === "en";
  const rows: CsvRow[] = [[...(en ? ISSUE_CSV_HEADER_EN : ISSUE_CSV_HEADER)]];
  for (const p of productsInDrop(catalog, no, products)) {
    // English: the style's words through `productText`, as the shop prints them.
    const words = en ? productText(p, "en") : null;
    for (const color of p.colors) {
      for (const size of SIZES) {
        rows.push([
          words ? styleName(words.name, p.dropNo, "en") : styleName(p.name, p.dropNo),
          words ? words.kind : p.kind,
          en ? colorLabel(color, "en") : COLORS[color].label,
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
export function issueCsvName(no: number, locale: Locale = "vi"): string {
  return pick({ vi: `so-${issueNo(no)}.csv`, en: `drop-${issueNo(no)}.csv` }, locale);
}
