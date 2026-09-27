import type { ColorKey, Drop, PaymentMethod, Product } from "@/data/types";
import type { Catalog } from "./catalog";
import { clockLabel, dayMonth, weekdayLabel } from "./datetime";
import { dropState, timeLeft } from "./drop";
import { firstColor, photoKeyOf } from "./feed";
import { dropSummary, isFixed, onHandByColor, productsInDrop } from "./inventory";
import { vnd } from "./money";
import { PAYMENT_LABEL } from "./order-labels";
import { lookbookUrl } from "./photos";
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

/** "02" · "10" · "thứ Sáu" · "20:00": a date block's four parts (the mock's `parts`). */
export interface DateParts {
  dd: string;
  mm: string;
  dow: string;
  time: string;
}

export function dateParts(iso: string): DateParts {
  const [dd = "", mm = ""] = dayMonth(iso).split("/");
  return { dd, mm, dow: weekdayLabel(iso), time: clockLabel(iso) };
}

/**
 * "4 ngày 00:57:57", or "00:57:57" inside the last day — the countdown the
 * mock ticks every second. Zero once the instant has passed.
 */
export function countdownText(iso: string, nowMs: number): string {
  const t = timeLeft(iso, new Date(nowMs));
  const two = (n: number) => String(n).padStart(2, "0");
  return `${t.days ? `${t.days} ngày ` : ""}${two(t.hours)}:${two(t.minutes)}:${two(t.seconds)}`;
}

// ─────────────────────────────────────────────────────────── issues

/** One issue's figures, counted from its styles. */
export interface IssueFacts {
  no: number;
  styles: number;
  cut: number;
  sold: number;
  left: number;
  /** "05/06 - 19/06", as the mock writes a run. */
  run: string;
  /** "RÊU, TRO, SÓNG, VỎ, MƯA, KHÔ". */
  names: string;
}

export function issueFacts(catalog: Catalog, drop: Drop): IssueFacts {
  const s = dropSummary(catalog, drop.no);
  return {
    no: drop.no,
    styles: s.styles,
    cut: s.cutUnits,
    sold: s.soldUnits,
    left: s.onHand,
    run: `${dayMonth(drop.opensAt)} - ${dayMonth(drop.closesAt)}`,
    names: productsInDrop(catalog, drop.no)
      .map((p) => p.name)
      .join(", "),
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
 * same-city courier of province 29, TP.HCM.
 */
export function footDelivery(): FootFact[] {
  const rows = DELIVERY_OPTIONS.map((o) => {
    const [name = o.label, days = ""] = o.label.split(" · ");
    const where = o.method === "EXPRESS" ? " TP.HCM" : "";
    return { label: `${name}${where}, ${days}`, value: vnd(o.feeVnd) };
  });
  return [...rows, { label: "Miễn phí giao từ", value: vnd(FREE_SHIPPING_FROM_VND) }];
}

/** "Thanh toán": the three ways, COD with its surcharge. */
export function footPayments(): FootFact[] {
  const order: PaymentMethod[] = ["BANK_TRANSFER", "CARD", "COD"];
  return order.map((m) => ({
    label: PAYMENT_LABEL[m],
    value: m === "COD" ? `+${vnd(COD_SURCHARGE_VND)}` : "",
  }));
}

/**
 * "Trợ giúp": the help pages that exist. "Bảng size" joins at slice 4, with
 * its route.
 */
export const FOOT_HELP: readonly { label: string; href: string }[] = [
  { label: "Hỏi đáp", href: "/faq" },
  { label: `Đổi trả ${RETURN_WINDOW_DAYS} ngày`, href: "/returns" },
  { label: "Tra cứu đơn", href: "/track" },
  { label: "Liên hệ", href: "/contact" },
];

/** The words under the next issue's silhouettes (the mock's `FACTS.teaser`). */
export const TEASER_NOTE = "Giá và số lượng công bố lúc mở.";
