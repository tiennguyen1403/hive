import type { ColorKey, Product, Size } from "@/data/types";
import type { Catalog } from "./catalog";
import { fitLabel } from "./catalog-query";
import { dropState } from "./drop";
import { firstColor, isGone, isLive, photoKeyOf, type PictureKind } from "./feed";
import { footDelivery, footPayments, homeMoment, lineIssue } from "./feed-home";
import { pick, picker, plural, type Locale } from "./i18n";
import { isFixed, isIssueStyle, isLowStock, onHand, productsInDrop, soldOutSizes, soldUnits } from "./inventory";
import { FIXED_WORD_TEXT, issueLabel } from "./lexicon";
import { vnd } from "./money";
import { lookbookUrl } from "./photos";
import { productText } from "./product-text";
import { COD_SURCHARGE_VND, RETURN_WINDOW_DAYS } from "./shipping";

/**
 * The Feed product page (round v4, slice 1b): what `/products/[slug]` prints
 * about one style, by the approved mock's rules (`prototype/explore/feed/
 * product.js`: `color0`, `kinds`, `stockMain`, `paintCta`, `sections`,
 * `others`), every fact from the catalogue and the clock. Pure; the time is
 * handed in, as in `lib/feed.ts`, so the server render and the hydrating
 * client agree.
 */

/**
 * The colour the page opens on: the one its address asks for (`?color=`, the
 * link from Yêu thích and Thông báo) when the style comes in it; otherwise
 * the first colour with anything left.
 */
export function pageColor(p: Product, asked: string | undefined): ColorKey {
  const want = asked?.trim();
  return want && (p.colors as readonly string[]).includes(want) ? (want as ColorKey) : firstColor(p);
}

/**
 * The story frame's photos for one colour: its packshot (a fixed style's
 * flat drawing), then — where the colour has one — the same colour worn. A
 * colour without a lookbook frame (a drawing, a borrowed frame, an upload)
 * has the one photo, and the frame then has no progress and no arrows.
 */
export function galleryKinds(p: Product, color: ColorKey): PictureKind[] {
  return lookbookUrl(photoKeyOf(p, color)) ? ["pack", "look"] : ["pack"];
}

/**
 * Where the style stands for the buy button:
 * · `open` — it can be bought now;
 * · `sold` — an issue's style with nothing left ("Đã hết");
 * · `empty` — a fixed style with an empty shelf: "tạm hết", it comes back;
 * · `over` — an issue's style whose issue is not selling: it has closed
 *   ("Số 05 đã đóng", the mock's words) or has not opened yet.
 * A sold-out style says so first, open or closed, as the mock's `paintCta`.
 */
export type BuyState =
  | { kind: "open" }
  | { kind: "sold" }
  | { kind: "empty" }
  | { kind: "over"; no: number; closed: boolean };

export function buyState(catalog: Catalog, p: Product, now: Date): BuyState {
  if (isGone(p)) return { kind: "sold" };
  if (p.dropNo === null) return onHand(p) > 0 ? { kind: "open" } : { kind: "empty" };
  if (isLive(catalog, p, now)) return { kind: "open" };
  const drop = catalog.dropByNo.get(p.dropNo);
  return { kind: "over", no: p.dropNo, closed: !drop || dropState(drop, now) === "CLOSED" };
}

/**
 * An issue's style whose issue is not selling — closed, or not open yet —
 * whether or not it sold out (the mock's `closedStyle`): the page shows it
 * without its sizes and without what is left of each colour, and tags it
 * "ĐÃ ĐÓNG" (or "SẮP MỞ"). Null for a fixed style and for one on sale.
 */
export function overIssue(catalog: Catalog, p: Product, now: Date): { no: number; closed: boolean } | null {
  if (p.dropNo === null || isLive(catalog, p, now)) return null;
  const drop = catalog.dropByNo.get(p.dropNo);
  return { no: p.dropNo, closed: !drop || dropState(drop, now) === "CLOSED" };
}

/**
 * The disabled button's words — a fact, not an instruction (conflict #6 the
 * user accepted); none while it sells. In English (round v6 slice E1) "Sold
 * out", "Out of stock", "Drop 05 closed", "Drop 06 hasn't opened yet".
 */
export function buyLabel(s: BuyState, locale: Locale = "vi"): string | null {
  const t = picker(locale);
  switch (s.kind) {
    case "open":
      return null;
    case "sold":
      return t({ vi: "Đã hết", en: "Sold out" });
    case "empty":
      return t({ vi: "Tạm hết", en: "Out of stock" });
    case "over": {
      const no = issueLabel(s.no, locale);
      return s.closed ? t({ vi: `${no} đã đóng`, en: `${no} closed` }) : t({ vi: `${no} chưa mở`, en: `${no} hasn't opened yet` });
    }
  }
}

/**
 * The line under the price (`stockMain`):
 * · `fixed` — the sizes gone in every colour, or "Đủ size";
 * · `sold` — "18/35 đã bán": an issue's style that sold out, or whose issue
 *   is no longer selling;
 * · `left` — "Còn 17 / 35 chiếc đã cắt", with the fire when three or fewer.
 */
export type MainStock =
  | { kind: "fixed"; gone: Size[] }
  | { kind: "sold"; sold: number; cut: number }
  | { kind: "left"; n: number; cut: number; low: boolean };

export function mainStock(catalog: Catalog, p: Product, now: Date): MainStock {
  if (!isIssueStyle(p)) return { kind: "fixed", gone: soldOutSizes(p) };
  if (isGone(p) || !isLive(catalog, p, now)) return { kind: "sold", sold: soldUnits(p), cut: p.cutUnits };
  return { kind: "left", n: onHand(p), cut: p.cutUnits, low: isLowStock(p) };
}

/**
 * The name of the style's print, where one of its construction lines names
 * it: `In "Bản đồ mòn" ở ngực trên` → "Bản đồ mòn". Read from `details`
 * (backend slice B6), which carries the garment brief's lines verbatim; the
 * catalogue has no separate field for it. A style whose print is described
 * rather than named (KHÓI's halftone smoke), and every style without
 * construction lines, has none — as the mock's own data has none for them.
 */
export function printOf(p: Pick<Product, "details">): string | null {
  for (const line of p.details) {
    const m = /^In\s+["“]([^"”]+)["”]/u.exec(line.trim());
    if (m) return m[1]!.trim();
  }
  return null;
}

export interface FactRow {
  label: string;
  value: string;
  /** A row that leads on: the whole row is the link. */
  href?: string;
  /**
   * `"vi"` on an English page for a value that is a Vietnamese name: the
   * print's, which stays as the garment brief names it (round v6 slice E1).
   */
  lang?: "vi";
}

/**
 * "Thông số": the material, the fit, and the print when the style has a named
 * one. In English (round v6 slice E1) "Material", "Fit", "Print": the material
 * through `productText`, the fit by the glossary. The print's name is read off
 * the Vietnamese lines, the only ones that name it as `In "…"`, and stays
 * Vietnamese, as the style names do.
 */
export function specRows(p: Product, locale: Locale = "vi"): FactRow[] {
  const t = picker(locale);
  const rows: FactRow[] = [
    { label: t({ vi: "Chất liệu", en: "Material" }), value: productText(p, locale).material },
    { label: t({ vi: "Form", en: "Fit" }), value: fitLabel(p.fit, locale) },
  ];
  const print = printOf(p);
  if (print) rows.push({ label: t({ vi: "Hình in", en: "Print" }), value: print, ...(locale === "en" ? { lang: "vi" as const } : {}) });
  return rows;
}

/**
 * "Giao hàng và đổi trả": each service with its days and fee, the free
 * delivery line (the footer's rows, `footDelivery`), the COD surcharge, the
 * return window — itself the link to Hỏi đáp's return group (`/faq#doi-tra`,
 * slice 4b), which is why this page's footer leaves its own "Đổi trả 7 ngày"
 * out — and the ways to pay, named as the footer names them ("Chuyển khoản,
 * Thẻ, COD"; in English "Bank transfer, Card, COD", round v6 slice E1).
 */
export function shipRows(locale: Locale = "vi"): FactRow[] {
  const t = picker(locale);
  return [
    ...footDelivery(locale),
    { label: t({ vi: "Phụ phí COD", en: "COD surcharge" }), value: vnd(COD_SURCHARGE_VND, locale) },
    {
      label: t({ vi: "Đổi trả", en: "Returns" }),
      value: t({ vi: `${RETURN_WINDOW_DAYS} ngày`, en: plural(RETURN_WINDOW_DAYS, "day", "days") }),
      href: "/faq#doi-tra",
    },
    {
      label: t({ vi: "Thanh toán", en: "Payment" }),
      value: footPayments(locale)
        .map((f) => f.label)
        .join(", "),
    },
  ];
}

/**
 * The line a style belongs to, as the page names and links it: the chip over
 * the name, the crumbs' middle step, the rail at the foot ("Cùng Số 05",
 * "Cùng Cố định", as the mock names them) with every other style of the line.
 *
 * The link is the shop's grid on that line (`/products?line=…`, as the mock
 * links `products.html?dong=…`) for the fixed line and for the issue the shop
 * shows — the one selling, else the last to close; an older issue is not a
 * line of the shop any more, so it leads to its own record, `/so/N`.
 */
export interface StyleLine {
  label: string;
  href: string;
  railTitle: string;
  others: Product[];
}

/** "Cùng Số 05"; in English "More from Drop 05" (round v6 slice E1). */
const railTitleOf = (label: string, locale: Locale): string =>
  pick({ vi: `Cùng ${label}`, en: `More from ${label}` }, locale);

export function styleLine(catalog: Catalog, p: Product, now: Date, locale: Locale = "vi"): StyleLine {
  if (isFixed(p)) {
    const label = pick(FIXED_WORD_TEXT, locale);
    return {
      label,
      href: "/products?line=fixed",
      railTitle: railTitleOf(label, locale),
      others: catalog.products.filter((x) => isFixed(x) && x.id !== p.id),
    };
  }
  const no = p.dropNo!;
  const shown = lineIssue(homeMoment(catalog, now));
  const label = issueLabel(no, locale);
  return {
    label,
    href: shown?.no === no ? `/products?line=${no}` : `/so/${no}`,
    railTitle: railTitleOf(label, locale),
    others: productsInDrop(catalog, no).filter((x) => x.id !== p.id),
  };
}
