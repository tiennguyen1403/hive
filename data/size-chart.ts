import { SIZES, type Fit, type Size } from "./types";

/**
 * Garment measurements, per fit, per size — the table behind "Bảng số đo".
 *
 * **Simulated, and the sheet says so out loud.** PRODUCT.md records that this
 * project has no merchandise and no spec sheets; the user settled on
 * 22/09/2026 that the size chart ships with simulated numbers carrying a
 * visible label rather than being left out, because the LAYOUT has to be
 * judged now and the real numbers drop straight into it later. The note in
 * `SizeGuideSheet` is part of the data contract, not decoration: change these
 * numbers for real ones and the note comes off with them.
 *
 * It lives in `data/` and not in the component for exactly that reason — it
 * is fixture data with a shape, the same as the catalog.
 *
 * The two fits are ONE table, one grade apart. "Oversize rộng hơn một size so
 * với form thường" is the sentence the product page prints, so an oversize S
 * has to measure what a regular M measures; anything else would make the page
 * contradict its own table. `REGULAR` is therefore derived, not typed twice.
 *
 * `chestFlat` is the garment laid flat and measured across, which is how a
 * Vietnamese size chart states it (and half of a circumference). `heightFrom`
 * / `heightTo` are the WEARER's, the one row in the table that is not a
 * measurement of the garment — it is the same for both fits, because how tall
 * someone is does not change with a cut.
 */
export interface SizeChartRow {
  size: Size;
  /** Across the chest, garment flat, cm. */
  chestFlat: number;
  /** Shoulder point to hem, cm. */
  length: number;
  /** Seam to seam across the back, cm. */
  shoulder: number;
  /** The wearer, in cm. */
  heightFrom: number;
  heightTo: number;
}

/** One grade: the step between S and M, and between a regular and an oversize. */
const GRADE = { chestFlat: 3, length: 3, shoulder: 3 } as const;

/** Oversize S, from `prototype/v3/product.html` — the approved mock's table. */
const OVERSIZE_BASE = { chestFlat: 54, length: 68, shoulder: 50 } as const;

/** The wearer's height per size, unchanged across fits. */
const HEIGHTS: Record<Size, [number, number]> = {
  S: [155, 165],
  M: [163, 172],
  L: [170, 180],
  XL: [178, 188],
};

export function sizeChart(fit: Fit): SizeChartRow[] {
  // A regular is one grade under the oversize of the same letter.
  const shift = fit === "OVERSIZE" ? 0 : -1;
  return SIZES.map((size, i) => {
    const step = i + shift;
    const [heightFrom, heightTo] = HEIGHTS[size];
    return {
      size,
      chestFlat: OVERSIZE_BASE.chestFlat + step * GRADE.chestFlat,
      length: OVERSIZE_BASE.length + step * GRADE.length,
      shoulder: OVERSIZE_BASE.shoulder + step * GRADE.shoulder,
      heightFrom,
      heightTo,
    };
  });
}

/** `"1m55 – 1m65"` — how a height range is written on a Vietnamese chart. */
export function heightLabel(row: SizeChartRow): string {
  return `${cm(row.heightFrom)} – ${cm(row.heightTo)}`;
}

function cm(n: number): string {
  return `${Math.floor(n / 100)}m${String(n % 100).padStart(2, "0")}`;
}
