import { sizeChart } from "@/data/size-chart";
import type { Fit, Product, Size } from "@/data/types";
import type { Catalog } from "./catalog";
import { FIT_LABELS } from "./catalog-query";
import { canBuy } from "./feed";
import { homeMoment, lineIssue } from "./feed-home";
import { isFixed, productsInDrop } from "./inventory";
import { chartNumber, heightRange, isShorts, pantsChart } from "./pants-chart";

/**
 * Bảng size (round v4 slice 4b): the approved mock's
 * `prototype/explore/feed/size-guide.js` — the tops by fit and the trousers by
 * length, each chart with the styles on sale in it, and a row of heights that
 * picks the sizes that suit one in all four charts.
 *
 * The measurements are the product page's sheet's: the tops' from
 * `data/size-chart.ts`, the trousers' from `lib/pants-chart.ts`. Both are
 * simulated, and the page says so ("Số đo mô phỏng, cm"). Pure and safe for
 * the browser.
 */

/** The heights on the row of chips, in cm: 1m55 to 1m85 (the mock's `HEIGHTS`). */
export const GUIDE_HEIGHTS = [155, 160, 165, 170, 175, 180, 185] as const;
export type GuideHeight = (typeof GUIDE_HEIGHTS)[number];

export function isGuideHeight(n: number): n is GuideHeight {
  return (GUIDE_HEIGHTS as readonly number[]).includes(n);
}

/** `175` → `"1m75"`, as a chip names a height. */
export function heightName(cm: number): string {
  return `${Math.floor(cm / 100)}m${String(cm % 100).padStart(2, "0")}`;
}

/**
 * The sizes whose "Hợp chiều cao" takes in a height — the column is the same
 * in every chart (the trousers read it off the tops'), so one answer marks all
 * four: 175 → L; 165 → S and M, where two sizes meet.
 */
export function sizesForHeight(cm: number): Size[] {
  return sizeChart("OVERSIZE")
    .filter((r) => cm >= r.heightFrom && cm <= r.heightTo)
    .map((r) => r.size);
}

/** Where this device keeps the height last chosen (the mock's `F.store("height")`). */
export const GUIDE_HEIGHT_STORAGE_KEY = "brand.height";

/** A stored height, if it is still one of the chips; anything else is no height. */
export function parseGuideHeight(raw: string | null): GuideHeight | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && isGuideHeight(n) ? n : null;
}

/** One chart on the page. */
export interface GuideChart {
  /** "OVERSIZE", "REGULAR", "long", "short": the heading's id is `fit-<id>`, as the mock's. */
  id: string;
  /** "Áo oversize", "Quần short". */
  title: string;
  /** The table's caption, read aloud rather than shown: "Áo oversize, số đo mô phỏng, cm". */
  caption: string;
  /** The styles on sale now that this chart measures, in the shop's order. */
  names: string[];
  /** The columns after "Size". */
  head: string[];
  rows: { size: Size; cells: string[] }[];
  pants: boolean;
}

export interface SizeGuide {
  /** Oversize, then regular. */
  tops: GuideChart[];
  /** Long trousers, then shorts: each only while the shop has a pair of that length. */
  pants: GuideChart[];
}

const FITS: readonly Fit[] = ["OVERSIZE", "REGULAR"];
const TOP_HEAD = ["Ngang ngực", "Dài áo", "Ngang vai", "Hợp chiều cao"];
const PANTS_HEAD = ["Vòng eo", "Vòng mông", "Dài quần", "Ngang đùi", "Hợp chiều cao"];
const caption = (title: string) => `${title}, số đo mô phỏng, cm`;

/**
 * The four charts, with the names under each: what the shop's two lines hold
 * (the issue it shows — the one selling, else the last to close — and the
 * fixed line, the mock's `ISSUE_05.concat(FIXED)`), narrowed to what can be
 * bought now for the names (`canBuy`, the mock's `onSale`). A trousers chart
 * shows while the lines hold a pair of its length, bought out or not.
 */
export function sizeGuide(catalog: Catalog, now: Date): SizeGuide {
  const issue = lineIssue(homeMoment(catalog, now));
  const lines: Product[] = [...(issue ? productsInDrop(catalog, issue.no) : []), ...catalog.products.filter((p) => isFixed(p))];
  const onSale = lines.filter((p) => canBuy(catalog, p, now));

  const tops = FITS.map((fit): GuideChart => {
    const title = `Áo ${FIT_LABELS[fit].toLowerCase()}`;
    return {
      id: fit,
      title,
      caption: caption(title),
      names: onSale.filter((p) => p.fit === fit && p.family !== "PANTS").map((p) => p.name),
      head: TOP_HEAD,
      rows: sizeChart(fit).map((r) => ({
        size: r.size,
        cells: [r.chestFlat, r.length, r.shoulder].map((n) => chartNumber(n)).concat(heightRange(r.heightFrom, r.heightTo)),
      })),
      pants: false,
    };
  });

  const trousers = lines.filter((p) => p.family === "PANTS");
  const lengths = [
    { id: "long", title: "Quần dài", short: false },
    { id: "short", title: "Quần short", short: true },
  ];
  const pants = lengths.flatMap(({ id, title, short }): GuideChart[] => {
    const style = trousers.find((p) => isShorts(p) === short);
    if (!style) return [];
    return [
      {
        id,
        title,
        caption: caption(title),
        names: onSale.filter((p) => p.family === "PANTS" && isShorts(p) === short).map((p) => p.name),
        head: PANTS_HEAD,
        rows: pantsChart(style).map((r) => ({
          size: r.size,
          cells: [r.waist, r.hip, r.length, r.thigh].map((n) => chartNumber(n)).concat(heightRange(r.heightFrom, r.heightTo)),
        })),
        pants: true,
      },
    ];
  });

  return { tops, pants };
}
