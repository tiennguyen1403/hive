import type { ColorKey, DeliveryMethod, Drop, PaymentMethod, Product } from "@/data/types";
import type { Catalog } from "./catalog";
import { clockLabel, dayAndMonth, weekdayLabel } from "./datetime";
import { dropState, timeLeft } from "./drop";
import { firstColor, photoKeyOf } from "./feed";
import { feedDayRange, feedTight } from "./feed-range";
import { pick, picker, pluralNoun, type Locale, type Pair } from "./i18n";
import { dropSummary, isFixed, onHandByColor, productsInDrop } from "./inventory";
import { vnd } from "./money";
import { paymentLabel } from "./order-labels";
import { lookbookUrl } from "./photos";
import { nameLang, productText } from "./product-text";
import { COD_SURCHARGE_VND, DELIVERY_OPTIONS, FREE_SHIPPING_FROM_VND, RETURN_WINDOW_DAYS } from "./shipping";

/**
 * The Feed home page (round v4, slice 1a): which of its four moments the
 * shop is in, and the facts each block of it prints. The layout is the
 * approved mock's (`prototype/explore/feed/home.js`); every fact comes from
 * the catalogue and the clock, never from the mock's fixtures.
 */

/**
 * How long the issue that has just closed leads Bảng tin between two
 * issues — the length of the return window (the user, round 4 of the mock).
 * After it the fixed line leads.
 */
export const LEAD_DAYS = 7;

const DAY_MS = 86_400_000;

/**
 * The four moments, as the mock's `?state=` names them — read here off the
 * clock and the calendar, as `featuredDrop` reads them (an open issue first,
 * then the next announced one, then the last to close):
 *
 * · `open` — an issue is selling. `next` is the one announced after it, if
 *   any; `closed` every issue that has shut, newest first.
 * · `upcoming` — nothing sells and the next issue is announced. `last` is
 *   the issue that closed most recently; `closed` the ones before it.
 * · `recap` — between two issues, nothing announced, less than `LEAD_DAYS`
 *   since `last` closed; `closed` the ones before it.
 * · `quiet` — the same gap from `LEAD_DAYS` on; `closed` every issue that has
 *   shut, the last first.
 */
export type HomeMoment =
  | { kind: "open"; issue: Drop; next: Drop | undefined; closed: Drop[] }
  | { kind: "upcoming"; next: Drop; last: Drop | undefined; closed: Drop[] }
  | { kind: "recap"; last: Drop; closed: Drop[] }
  | { kind: "quiet"; closed: Drop[] };

export function homeMoment(catalog: Catalog, now: Date): HomeMoment {
  const byNo = [...catalog.drops].sort((a, b) => a.no - b.no);
  const open = byNo.find((d) => dropState(d, now) === "OPEN");
  const next = byNo.find((d) => dropState(d, now) === "UPCOMING");
  const shut = byNo.filter((d) => dropState(d, now) === "CLOSED").reverse();
  if (open) return { kind: "open", issue: open, next, closed: shut };
  const last = shut[0];
  if (next) return { kind: "upcoming", next, last, closed: shut.slice(1) };
  if (last && now.getTime() - Date.parse(last.closesAt) < LEAD_DAYS * DAY_MS) {
    return { kind: "recap", last, closed: shut.slice(1) };
  }
  return { kind: "quiet", closed: shut };
}

/**
 * The issue the shop's issue line shows: the one selling, else the last to
 * close. The mock's "Số 05" in every moment.
 */
export function lineIssue(m: HomeMoment): Drop | undefined {
  switch (m.kind) {
    case "open":
      return m.issue;
    case "upcoming":
    case "recap":
      return m.last;
    case "quiet":
      return m.closed[0];
  }
}

// ─────────────────────────────────────────────────────────── the story

/**
 * The cover line in the two lines the story sets it on: every sentence but
 * the last, then the last ("Cắt 1 lần." / "Không tái bản.").
 */
export function coverLines(text: string): string[] {
  const sentences = text.trim().split(/(?<=[.!?…])\s+/u);
  if (sentences.length < 2) return sentences;
  return [sentences.slice(0, -1).join(" "), sentences[sentences.length - 1]!];
}

/**
 * The picture an issue's story wears, chosen as the mock chose it: Số 05's
 * is NGUỘI's black lookbook frame (`feed/BRIEF.md`, "Home, phone"). An
 * editorial choice, not a fact, so it is written down here, by the colour's
 * photo key; an issue without one — or whose chosen style has gone from the
 * catalogue — wears its first style's lookbook frame, or its first photo.
 */
export const STORY_COVER: Readonly<Record<number, string>> = { 5: "shot-nguoi-black" };

export interface StoryPicture {
  product: Product;
  color: ColorKey;
  /** The lookbook frame, when the colour has one; otherwise the packshot is shown. */
  look: boolean;
}

export function storyPicture(catalog: Catalog, no: number): StoryPicture | undefined {
  const styles = productsInDrop(catalog, no);
  const chosen = STORY_COVER[no];
  if (chosen) {
    for (const p of styles) {
      const i = p.photoKeys.indexOf(chosen);
      if (i >= 0 && p.colors[i]) return { product: p, color: p.colors[i]!, look: lookbookUrl(chosen) !== null };
    }
  }
  for (const p of styles) {
    const color = p.colors.find((c) => lookbookUrl(photoKeyOf(p, c)) !== null);
    if (color) return { product: p, color, look: true };
  }
  const first = styles[0];
  return first ? { product: first, color: firstColor(first), look: false } : undefined;
}

/**
 * The fixed line's lead (the quiet moment): its first style, in black when it
 * has black left — a flat drawing reads at that size only when it is solid.
 */
export function fixedLead(catalog: Catalog): { product: Product; color: ColorKey } | undefined {
  const first = catalog.products.find((p) => isFixed(p));
  if (!first) return undefined;
  const color = first.colors.includes("black") && onHandByColor(first, "black") > 0 ? "black" : firstColor(first);
  return { product: first, color };
}

// ─────────────────────────────────────────────────────────── the clock

/**
 * "02" · "10" · "thứ Sáu" · "20:00": a date block's four parts (the mock's
 * `parts`). In English (round v6 slice E1) "2" · "Oct" · "Friday" · "20:00":
 * the glossary's day without a leading zero, the month by name — the screen
 * prints the Vietnamese month as "Thg 10" and the English one as it is.
 */
export interface DateParts {
  dd: string;
  mm: string;
  dow: string;
  time: string;
}

export function dateParts(iso: string, locale: Locale = "vi"): DateParts {
  const { day, month } = dayAndMonth(iso, locale);
  return { dd: day, mm: month, dow: weekdayLabel(iso, locale), time: clockLabel(iso) };
}

/**
 * "4 ngày 00:57:57", or "00:57:57" inside the last day — the countdown the
 * mock ticks every second. Zero once the instant has passed. In English
 * "4 days 00:57:57", "1 day 00:57:57" (round v6 slice E1).
 */
export function countdownText(iso: string, nowMs: number, locale: Locale = "vi"): string {
  const t = timeLeft(iso, new Date(nowMs));
  const two = (n: number) => String(n).padStart(2, "0");
  const days = locale === "en" ? `${t.days} ${pluralNoun(t.days, "day", "days")} ` : `${t.days} ngày `;
  return `${t.days ? days : ""}${two(t.hours)}:${two(t.minutes)}:${two(t.seconds)}`;
}

// ─────────────────────────────────────────────────────────── issues

/** One issue's figures, counted from its styles. */
export interface IssueFacts {
  no: number;
  styles: number;
  cut: number;
  sold: number;
  left: number;
  /**
   * "05/06 - 19/06": the run with the mock's hyphen, the two days never
   * parted (`feedDayRange`, `lib/feed-range.ts`: no-break spaces and a word
   * joiner, the no-break rule the user kept on 27/09).
   */
  run: string;
  /** "RÊU, TRO, SÓNG, VỎ, MƯA, KHÔ". */
  names: string;
  /**
   * `"vi"` on an English page when every name in `names` is a Vietnamese one
   * (`nameLang`, round v6 slice E1): the list then carries `lang="vi"`. Absent
   * on a Vietnamese page.
   */
  namesLang?: "vi";
}

/**
 * An issue's figures. In English (round v6 slice E1) the run is written the
 * English way ("5 Jun - 19 Jun") and the names come through `productText`
 * (an issue's styles keep their Vietnamese names, so the list is marked
 * `namesLang`).
 */
export function issueFacts(catalog: Catalog, drop: Drop, locale: Locale = "vi"): IssueFacts {
  const s = dropSummary(catalog, drop.no);
  const styles = productsInDrop(catalog, drop.no);
  const allVi = styles.length > 0 && styles.every((p) => nameLang(p, locale) === "vi");
  return {
    no: drop.no,
    styles: s.styles,
    cut: s.cutUnits,
    sold: s.soldUnits,
    left: s.onHand,
    run: feedDayRange(drop.opensAt, drop.closesAt, locale),
    names: styles.map((p) => productText(p, locale).name).join(", "),
    ...(allVi ? { namesLang: "vi" as const } : {}),
  };
}

// ─────────────────────────────────────────────────────────── the footer

export interface FootFact {
  label: string;
  /** "30.000₫", "+15.000₫", or nothing. */
  value: string;
}

/**
 * "Giao hàng": each service with its days and fee, then the free-delivery
 * line — `lib/shipping.ts`'s figures in the mock's words. Express is the
 * same-city courier of province 29, TP.HCM. The days are a Feed range, "2-4
 * ngày" with the mock's hyphen held tight (`feedTight`); the v3 label itself
 * keeps its en dash, since a handover stores it as the order's carrier.
 *
 * In English (round v6) each service has its English name (`SERVICE_EN`) and
 * the same days, the label's own figures with their unit in English
 * (`daysEn`); the amounts are written the English way, "30,000₫".
 */
export function footDelivery(locale: Locale = "vi"): FootFact[] {
  const t = picker(locale);
  const rows = DELIVERY_OPTIONS.map((o) => {
    const [name = o.label, days = ""] = o.label.split(" · ");
    const where = o.method === "EXPRESS" ? " TP.HCM" : "";
    const label = t({
      vi: `${name}${where}, ${feedTight(days)}`,
      en: `${SERVICE_EN[o.method]}, ${feedTight(daysEn(days))}`,
    });
    return { label, value: vnd(o.feeVnd, locale) };
  });
  return [
    ...rows,
    { label: t({ vi: "Miễn phí giao từ", en: "Free delivery from" }), value: vnd(FREE_SHIPPING_FROM_VND, locale) },
  ];
}

/**
 * A delivery service's name in English. The Vietnamese one is read off its
 * label in `lib/shipping.ts`, which a handover stores as the order's carrier
 * and so stays as it is; the express one names its city, as the Vietnamese
 * line adds "TP.HCM".
 */
const SERVICE_EN: Record<DeliveryMethod, string> = {
  STANDARD: "Standard delivery",
  EXPRESS: "Express delivery in HCMC",
};

/**
 * "2–4 ngày" → "2–4 days", "24 giờ" → "24 hours": the figures a label quotes,
 * with the unit in English (the plural by the last figure). Anything else is
 * left as written rather than guessed at.
 */
function daysEn(days: string): string {
  const m = /^(\d+)(?:\s*–\s*(\d+))?\s+(ngày|giờ)$/u.exec(days.trim());
  if (!m) return days;
  const last = Number(m[2] ?? m[1]);
  const unit = m[3] === "ngày" ? pluralNoun(last, "day", "days") : pluralNoun(last, "hour", "hours");
  return `${m[1]}${m[2] ? `–${m[2]}` : ""} ${unit}`;
}

/**
 * The footer names cash on delivery by its short name in both languages,
 * "COD", as the Vietnamese one does: the English "Cash on delivery (COD)"
 * took two lines in the payment column from 900 to 1199px (the main
 * session, round v6 slice E0). The checkout still names it in full
 * (`paymentLabel`).
 */
const FOOT_COD: Pair = { vi: "COD", en: "COD" };

/** "Thanh toán": the three ways, COD with its surcharge. */
export function footPayments(locale: Locale = "vi"): FootFact[] {
  const order: PaymentMethod[] = ["BANK_TRANSFER", "CARD", "COD"];
  return order.map((m) => ({
    label: m === "COD" ? pick(FOOT_COD, locale) : paymentLabel(m, locale),
    value: m === "COD" ? `+${vnd(COD_SURCHARGE_VND, locale)}` : "",
  }));
}

/**
 * "Trợ giúp": the mock's five help links, in its order (`feed.js`: `HELP`,
 * `HELP_HREF`, `WORDS`). "Đổi trả 7 ngày" opens Hỏi đáp's return group: the
 * Feed has no returns page of its own, and `/returns` leads there too (the
 * user, 30/09). "Bảng size" since slice 4b, with its route.
 *
 * In both languages since round v6: `footHelp(locale)`, with `FOOT_HELP` the
 * Vietnamese side. The English names are the glossary's ("FAQ", "Track an
 * order", "Size guide", "Contact"); the returns link counts its days as the
 * Vietnamese one does.
 */
const FOOT_HELP_TEXT: readonly { label: Pair; href: string }[] = [
  { label: { vi: "Hỏi đáp", en: "FAQ" }, href: "/faq" },
  { label: { vi: `Đổi trả ${RETURN_WINDOW_DAYS} ngày`, en: `${RETURN_WINDOW_DAYS}-day returns` }, href: "/faq#doi-tra" },
  { label: { vi: "Tra cứu đơn", en: "Track an order" }, href: "/track" },
  { label: { vi: "Bảng size", en: "Size guide" }, href: "/size-guide" },
  { label: { vi: "Liên hệ", en: "Contact" }, href: "/contact" },
];

/** The footer's help links in one language. */
export function footHelp(locale: Locale = "vi"): { label: string; href: string }[] {
  return FOOT_HELP_TEXT.map((h) => ({ label: pick(h.label, locale), href: h.href }));
}

export const FOOT_HELP: readonly { label: string; href: string }[] = footHelp("vi");

/**
 * Whether a screen leaves a help link out of its footer because it already
 * carries what the link leads to (the mock's `data-foot-skip`, `skipped`): an
 * entry with a hash drops that one link (`/faq#doi-tra` on a style's page,
 * which has its own "Đổi trả" row); an entry without one drops every link to
 * that page (`/faq` on Hỏi đáp drops "Đổi trả 7 ngày" too).
 */
export function footSkipped(href: string, skip: readonly string[]): boolean {
  return skip.some((x) => x === href || (!x.includes("#") && x === href.split(/[?#]/)[0]));
}

/** The words under the next issue's silhouettes (the mock's `FACTS.teaser`), in both languages since round v6 slice E1. */
export const TEASER_NOTE_TEXT: Pair = {
  vi: "Giá và số lượng công bố lúc mở.",
  en: "Price and quantity announced at opening.",
};

export const TEASER_NOTE = TEASER_NOTE_TEXT.vi;
