import type { AdminOrder } from "./admin-orders";
import { orderCustomer, orderItemsLabel } from "./admin-rows";
import type { Catalog } from "./catalog";
import type { CsvRow } from "./csv";
import { clockLabel, dayMonth } from "./datetime";
import { pick, type Locale, type Pair } from "./i18n";
import { adminPaymentDetail, orderStateLabel } from "./order-labels";
import { orderTotalVnd } from "./orders";

/**
 * The order book as a spreadsheet: "Tải CSV" on the orders table, the orders
 * the table shows (its tab, search and filters) as one file.
 *
 * Moved out of `ArcOrdersScreen` (round v6 slice E4) word for word, as rows
 * rather than a download, so the file can be tested — as the styles' file
 * (`lib/products-csv.ts`) and an issue's (`lib/issue-csv.ts`) already were.
 *
 * In both languages since slice E4: the headers, the state and the way of
 * paying in the page's language (the glossary's "Awaiting transfer", "Bank
 * transfer", "COD"), the date the English way, each style by `productText`;
 * the name and the phone number are printed as stored. Amounts go out as plain
 * numbers in both, so a spreadsheet can sum them (`lib/csv.ts`).
 *
 * Since slice B18 a card order Stripe has seen pays "Thẻ · Stripe", with
 * Stripe's payment intent once paid (`adminPaymentDetail`), and one waiting
 * for its money is "Chờ trả thẻ" (`orderStateLabel`); a sample card order
 * keeps plain "Thẻ".
 */
const HEADER: Readonly<Record<Locale, readonly string[]>> = {
  vi: ["Mã đơn", "Khách", "Điện thoại", "Thời gian", "Món", "Giá trị (VND)", "Thanh toán", "Trạng thái"],
  en: ["Order", "Customer", "Phone", "Placed", "Items", "Total (VND)", "Payment", "Status"],
};

/** The file's name: `don-hang.csv`, and `orders.csv` in English. */
const NAME: Pair = { vi: "don-hang.csv", en: "orders.csv" };

export function ordersCsvName(locale: Locale = "vi"): string {
  return pick(NAME, locale);
}

/** The header, then one row per order, in the order given. */
export function ordersCsvRows(catalog: Catalog, list: readonly AdminOrder[], locale: Locale = "vi"): CsvRow[] {
  return [
    [...HEADER[locale]],
    ...list.map((o) => [
      String(o.code),
      orderCustomer(o, locale),
      o.shipTo.phone,
      `${dayMonth(o.placedAt, locale)} ${clockLabel(o.placedAt)}`,
      orderItemsLabel(catalog, o, locale),
      orderTotalVnd(o),
      adminPaymentDetail(o, locale),
      orderStateLabel(o, locale).text,
    ]),
  ];
}
