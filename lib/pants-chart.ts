import { SIZES, type Product, type Size } from "@/data/types";
import { sizeChart } from "@/data/size-chart";
import { feedTightRange } from "./feed-range";
import type { Locale } from "./i18n";

/**
 * The trousers' measurements, per size — the table the Feed product page's
 * "Bảng size" opens for a pair of trousers (round v4, slice 1b), where the
 * tops' table (`data/size-chart.ts`) would print chest widths for MUỐI.
 *
 * **Simulated, like the tops'.** There are no spec sheets (PRODUCT.md); the
 * figures are the approved mock's (`pantsChart` in
 * `prototype/explore/shared/data.js`), which the user accepted as reference
 * numbers on 27/09/2026, and the sheet labels them "Số đo mô phỏng" exactly as
 * it labels the tops'. Real numbers drop straight into this shape.
 *
 * Waist and hip are measured AROUND, the length from the waistband down, the
 * thigh ACROSS. Shorts have their own length (and a little more room at the
 * hip and thigh). The wearer's height per size is the tops' own column, so
 * one height picks both charts.
 */
export interface PantsChartRow {
  size: Size;
  /** Around the waistband, cm. */
  waist: number;
  /** Around the hip, cm. */
  hip: number;
  /** Waistband to hem, cm. */
  length: number;
  /** Across the thigh, garment flat, cm. */
  thigh: number;
  /** The wearer, in cm — the tops' figures. */
  heightFrom: number;
  heightTo: number;
}

/**
 * A pair of shorts: its kind says so ("Quần short", "Quần short nỉ"). The
 * mock also reads a fixed style's drawing shape; the app's styles carry no
 * shape, and the two shorts it sells both name themselves.
 */
export function isShorts(p: Pick<Product, "kind">): boolean {
  return /short/i.test(p.kind);
}

export function pantsChart(p: Pick<Product, "kind">): PantsChartRow[] {
  const short = isShorts(p);
  const tops = sizeChart("OVERSIZE");
  return SIZES.map((size, i) => ({
    size,
    waist: 70 + i * 4,
    hip: (short ? 98 : 96) + i * 4,
    length: short ? 46 + i * 2 : 98 + i * 2,
    thigh: (short ? 32 : 30) + i * 1.5,
    heightFrom: tops[i]!.heightFrom,
    heightTo: tops[i]!.heightTo,
  }));
}

/** A measurement as a Vietnamese chart writes it: `31,5`, `98`; in English `31.5` (round v6 slice E1). */
export function chartNumber(n: number, locale: Locale = "vi"): string {
  return locale === "en" ? String(n) : String(n).replace(".", ",");
}

/**
 * `1m55-1m65`, the wearer's height as the mock's charts print it: a Feed
 * range, held tight (`lib/feed-range.ts`). In English (round v6 slice E1)
 * `155-165`, in centimetres like every other cell of the chart, whose line
 * says "cm": "1m55" is a Vietnamese way of writing a height.
 */
export function heightRange(from: number, to: number, locale: Locale = "vi"): string {
  if (locale === "en") return feedTightRange(String(from), String(to));
  const m = (cm: number) => `${Math.floor(cm / 100)}m${String(cm % 100).padStart(2, "0")}`;
  return feedTightRange(m(from), m(to));
}
