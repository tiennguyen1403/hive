import { COLORS, colorLabel } from "@/data/colors";
import type { Product } from "@/data/types";
import type { Catalog } from "./catalog";
import type { CsvRow } from "./csv";
import { isIssueStyle, onHand, soldOutSizes, soldUnits } from "./inventory";
import { pick, type Locale, type Pair } from "./i18n";
import { LEX, issueNo, styleName } from "./lexicon";
import { productText } from "./product-text";

/**
 * Every style the shop has as a spreadsheet: "Tải CSV" on the styles table,
 * the file `mau.csv`.
 *
 * Moved out of v3's `ProductsTable` (`components/admin/ProductsTable.tsx`)
 * word for word when the table moved to Arc (round v5 slice 5a), as rows
 * rather than a download, so the file can be tested; the screen hands them to
 * `downloadCsv`, as an issue's file does (`lib/issue-csv.ts`, slice 4). The v3
 * table and its own copy went at slice 6.
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

/** The same columns in English (round v6 slice E5). */
const PRODUCTS_CSV_HEADER_EN: readonly string[] = [
  "Style",
  "Type",
  "Fit",
  "Drop",
  "Price (VND)",
  "Colours",
  "Cut",
  "Sold",
  "Left",
  "Sizes sold out",
];

/** The file's name, as v3 gave it. */
export const PRODUCTS_CSV_NAME = "mau.csv";

const PRODUCTS_CSV_NAME_TEXT: Pair = { vi: PRODUCTS_CSV_NAME, en: "styles.csv" };

/** The file's name in one language. */
export function productsCsvName(locale: Locale = "vi"): string {
  return pick(PRODUCTS_CSV_NAME_TEXT, locale);
}

/** The header, then one row per style. */
export function productsCsvRows(
  catalog: Catalog,
  products: readonly Product[] = catalog.products,
  locale: Locale = "vi",
): CsvRow[] {
  if (locale === "en") return productsCsvRowsEn(products);
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

/**
 * The English file (round v6 slice E5): a style's words through `productText`
 * (its English where the database has one, else as stored), colours and the
 * fit in English, the drop as "D05". The numbers are the same.
 */
function productsCsvRowsEn(products: readonly Product[]): CsvRow[] {
  return [
    [...PRODUCTS_CSV_HEADER_EN],
    ...products.map((p) => {
      const words = productText(p, "en");
      return [
        styleName(words.name, p.dropNo, "en"),
        words.kind,
        p.fit === "OVERSIZE" ? "oversized" : "regular",
        p.dropNo === null ? "" : issueNo(p.dropNo),
        p.priceVnd,
        p.colors.map((c) => colorLabel(c, "en")).join(" · "),
        p.cutUnits ?? "",
        isIssueStyle(p) ? soldUnits(p) : "",
        onHand(p),
        soldOutSizes(p).join(" · ") || "—",
      ];
    }),
  ];
}
