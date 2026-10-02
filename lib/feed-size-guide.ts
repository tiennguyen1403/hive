import { sizeChart } from "@/data/size-chart";
import type { Fit, Product, Size } from "@/data/types";
import type { Catalog } from "./catalog";
import { FIT_LABELS, fitLabel } from "./catalog-query";
import { canBuy } from "./feed";
import { homeMoment, lineIssue } from "./feed-home";
import { pick, picker, type Locale, type Pair } from "./i18n";
import { isFixed, productsInDrop } from "./inventory";
import { chartNumber, heightRange, isShorts, pantsChart } from "./pants-chart";
import { nameLang, productText } from "./product-text";

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
 *
 * In English since round v6 slice E3b, as the product page's sheet has been
 * since slice E1: the columns by their English names, a decimal point, the
 * wearer's height in centimetres like every other figure of the chart, the
 * styles' names through `productText`.
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
 * `heightName` in one language (round v6 slice E3b; a sibling, since
 * `heightName` is handed to `.map`): in English `"175 cm"`, the unit held to
 * the number by a no-break space. "1m75" is a Vietnamese way of writing a
 * height, and in English the chart's own height column reads in centimetres
 * (`heightRange`).
 */
export function heightNameIn(cm: number, locale: Locale): string {
  return locale === "en" ? `${cm} cm` : heightName(cm);
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
  /**
   * English only (round v6 slice E3b): beside each of `names`, `"vi"` when the
   * name printed is the Vietnamese one (an issue's style, `nameLang`), so the
   * screen can mark it for a screen reader. Absent on a Vietnamese page.
   */
  nameLangs?: ("vi" | undefined)[];
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

/**
 * The columns after "Size", in both languages: the English are the product
 * page's sheet's since round v6 slice E1 (`QuickAdd`'s `GuidePanel`).
 */
export const TOP_HEAD_TEXT: Pair<readonly string[]> = {
  vi: ["Ngang ngực", "Dài áo", "Ngang vai", "Hợp chiều cao"],
  en: ["Chest", "Length", "Shoulder", "Height"],
};
export const PANTS_HEAD_TEXT: Pair<readonly string[]> = {
  vi: ["Vòng eo", "Vòng mông", "Dài quần", "Ngang đùi", "Hợp chiều cao"],
  en: ["Waist", "Hip", "Length", "Thigh", "Height"],
};

const CAPTION: Pair<(title: string) => string> = {
  vi: (title) => `${title}, số đo mô phỏng, cm`,
  en: (title) => `${title}, simulated measurements, cm`,
};

/**
 * How to measure a piece already worn, under the tops and under the trousers.
 * Each names the column to compare with by the name its header carries, so the
 * English reads "the Chest column" over a column headed "Chest".
 */
export function guideMeasure(kind: "tops" | "pants", locale: Locale = "vi"): string {
  const t = picker(locale);
  if (kind === "tops") {
    return t({
      vi: "Trải phẳng một chiếc áo đang mặc vừa, đo ngang ngực rồi so với cột Ngang ngực.",
      en: `Lay a top that fits you flat, measure across the chest, then compare with the ${TOP_HEAD_TEXT.en[0]} column.`,
    });
  }
  return t({
    vi:
      "Trải phẳng một chiếc quần đang mặc vừa: đo ngang cạp rồi nhân đôi để so với cột Vòng eo, đo từ cạp tới gấu " +
      "để so với cột Dài quần.",
    en:
      "Lay trousers that fit you flat: measure across the waistband and double it to compare with the " +
      `${PANTS_HEAD_TEXT.en[0]} column, then from waistband to hem for the ${PANTS_HEAD_TEXT.en[2]} column.`,
  });
}

/**
 * The four charts, with the names under each: what the shop's two lines hold
 * (the issue it shows — the one selling, else the last to close — and the
 * fixed line, the mock's `ISSUE_05.concat(FIXED)`), narrowed to what can be
 * bought now for the names (`canBuy`, the mock's `onSale`). A trousers chart
 * shows while the lines hold a pair of its length, bought out or not.
 */
export function sizeGuide(catalog: Catalog, now: Date, locale: Locale = "vi"): SizeGuide {
  const t = picker(locale);
  const issue = lineIssue(homeMoment(catalog, now));
  const lines: Product[] = [...(issue ? productsInDrop(catalog, issue.no) : []), ...catalog.products.filter((p) => isFixed(p))];
  const onSale = lines.filter((p) => canBuy(catalog, p, now));
  const caption = pick(CAPTION, locale);
  const num = (n: number) => chartNumber(n, locale);
  // The names a chart lists, and — on an English page — which of them are printed in Vietnamese.
  const named = (styles: readonly Product[]): Pick<GuideChart, "names" | "nameLangs"> => ({
    names: styles.map((p) => productText(p, locale).name),
    ...(locale === "en" ? { nameLangs: styles.map((p) => nameLang(p, locale)) } : {}),
  });

  const tops = FITS.map((fit): GuideChart => {
    const title = t({ vi: `Áo ${FIT_LABELS[fit].toLowerCase()}`, en: `${fitLabel(fit, "en")} tops` });
    return {
      id: fit,
      title,
      caption: caption(title),
      ...named(onSale.filter((p) => p.fit === fit && p.family !== "PANTS")),
      head: [...pick(TOP_HEAD_TEXT, locale)],
      rows: sizeChart(fit).map((r) => ({
        size: r.size,
        cells: [r.chestFlat, r.length, r.shoulder].map(num).concat(heightRange(r.heightFrom, r.heightTo, locale)),
      })),
      pants: false,
    };
  });

  const trousers = lines.filter((p) => p.family === "PANTS");
  const lengths = [
    { id: "long", title: t({ vi: "Quần dài", en: "Trousers" }), short: false },
    { id: "short", title: t({ vi: "Quần short", en: "Shorts" }), short: true },
  ];
  const pants = lengths.flatMap(({ id, title, short }): GuideChart[] => {
    const style = trousers.find((p) => isShorts(p) === short);
    if (!style) return [];
    return [
      {
        id,
        title,
        caption: caption(title),
        ...named(onSale.filter((p) => p.family === "PANTS" && isShorts(p) === short)),
        head: [...pick(PANTS_HEAD_TEXT, locale)],
        rows: pantsChart(style).map((r) => ({
          size: r.size,
          cells: [r.waist, r.hip, r.length, r.thigh].map(num).concat(heightRange(r.heightFrom, r.heightTo, locale)),
        })),
        pants: true,
      },
    ];
  });

  return { tops, pants };
}
