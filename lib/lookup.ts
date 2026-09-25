import { COLORS } from "@/data/colors";
import type { Catalog } from "./catalog";
import type { DeliveryMethod, Order, OrderState, PaymentMethod, Size } from "@/data/types";
import { effectiveStatus, orderTimeline, type TimelineStep } from "./customer-orders";
import { orderSubtotalVnd, orderTotalVnd, orderUnits } from "./orders";
import { demoNow } from "./clock";
import { styleName } from "./lexicon";

/**
 * Looking an order up WITHOUT signing in — a code plus the phone number it
 * was placed with — and the one shape every order screen renders.
 *
 * Two things make the lookup safe enough to offer. Order codes are short and
 * sequential (`DH-2425`, `DH-2431`), so a code alone would hand a stranger
 * somebody's name, address and phone number — that is QĐ-16 again, with the
 * phone number standing in for the session. And the answer is the same
 * whichever of the two is wrong, so the screen never confirms that a code
 * exists.
 *
 * The matching itself happens in Postgres since slice B2
 * (`track_order()`, reached through `lib/db/orders.ts#trackOrder`): every
 * order is a row there, whoever placed it. What stays here is pure — reading
 * a code and a number the way people type them, and turning an `Order` into
 * what the screens print.
 */

// ─────────────────────────────────────────────────────────── normalisation
/**
 * `dh2425`, `2425`, ` DH-2425 ` → `DH-2425`.
 *
 * A code is read off an email or off the confirmation screen and typed by
 * hand, usually on a phone keyboard that capitalises nothing. Refusing a
 * lower-case code, or one typed without its prefix, would be the form being
 * fussy about punctuation at the only step that matters here.
 */
export function normaliseOrderCode(raw: string): string {
  const bare = raw.trim().toUpperCase().replace(/[\s.]/g, "");
  if (!bare) return "";
  if (/^\d+$/.test(bare)) return `DH-${bare}`;
  if (/^DH-?\d+$/.test(bare)) return `DH-${bare.replace(/^DH-?/, "")}`;
  return bare;
}

/**
 * The ten digits of a Vietnamese mobile, however it was written.
 *
 * Same reading as `normalisePhone` in `checkout-form.ts` and `formatPhone`
 * in `phone.ts` — spaces, dots, dashes and a `+84` prefix are punctuation.
 * Written again here rather than imported: `checkout-form.ts` pulls in
 * `data/regions.ts` and the 218KB of communes behind it, and this module is
 * read by a screen that needs none of it.
 */
export function phoneDigits(raw: string): string {
  const stripped = raw.replace(/[\s.\-()]/g, "");
  const local = stripped.replace(/^\+84/, "0").replace(/^84(?=\d{9}$)/, "0");
  return /^0\d{9}$/.test(local) ? local : "";
}

/** Two numbers are the same number when they are the same ten digits. */
export function samePhone(a: string, b: string): boolean {
  const left = phoneDigits(a);
  return left !== "" && left === phoneDigits(b);
}

/**
 * A code as the database issues it — `DH-` and four or more digits — which is
 * the only shape worth sending to it. Anything else cannot match a row, so
 * the question is not asked at all.
 */
export function isOrderCode(code: string): boolean {
  return /^DH-\d{4,}$/.test(code);
}

/**
 * What the form says when nothing matches.
 *
 * It names the code that was tried, because the usual cause is a typo in it,
 * and it says where to find the right one. It does NOT say whether the code
 * exists — that is the whole point of asking for the phone number.
 */
export function notFoundMessage(code: string): string {
  const shown = normaliseOrderCode(code) || "này";
  return `Không tìm thấy đơn ${shown} với số này. Kiểm lại mã trong email hoặc màn xác nhận.`;
}

/** `/track?code=DH-2425&phone=0908221447` — shareable, and the QR's target. */
export function trackHref(code: string, phone?: string): string {
  const q = new URLSearchParams({ code: normaliseOrderCode(code) });
  const digits = phone ? phoneDigits(phone) : "";
  if (digits) q.set("phone", digits);
  return `/track?${q.toString()}`;
}

// ────────────────────────────────────────────────── one shape for one screen
/**
 * An order as the screens print it: names and photos looked up, money
 * summed, the timeline derived.
 *
 * The detail under "Đơn hàng", the lookup and the printed bill all render
 * this, so the three cannot disagree about what an order says.
 */
export interface TrackedLine {
  name: string;
  kind: string;
  colorLabel: string;
  size: Size;
  qty: number;
  unitPriceVnd: number;
  photoKey: string;
}

export interface TrackStep extends Omit<TimelineStep, "state"> {
  /**
   * `late` is the fourth: a wait whose deadline has already passed. Nothing
   * produces it since slice B2 — an order past its hold arrives here already
   * cancelled (`effectiveStatus`) — but `.tl3 .m.late` still draws it.
   */
  state: "done" | "now" | "todo" | "late";
}

export interface TrackedOrder {
  code: string;
  placedAt: string;
  state: OrderState;
  units: number;
  lines: TrackedLine[];
  recipient: string;
  phone: string;
  addressLine: string;
  /** What was typed for the courier at checkout, or "". */
  note: string;
  delivery: DeliveryMethod;
  subtotalVnd: number;
  shippingFeeVnd: number;
  codFeeVnd: number;
  discountVnd: number;
  totalVnd: number;
  promo?: string;
  payment: PaymentMethod;
  /** The courier's number, on the states that have one. */
  trackingCode?: string;
  /**
   * The delivery service the handover recorded, beside the number (slice
   * B3a). Absent on the sample's parcels, which recorded none.
   */
  carrier?: string;
  steps: TrackStep[];
  /** Money has actually been received. False for a `RECEIVED` order. */
  paid: boolean;
}

/** Paid means received, not promised. COD and a card with no gateway are not. */
function isPaid(state: OrderState): boolean {
  return state === "PAID" || state === "SHIPPING" || state === "DELIVERED";
}

/** The last line of the summary box, in the fewest words that are true. */
export function totalRowLabel(state: OrderState): string {
  if (isPaid(state)) return "Đã thanh toán";
  if (state === "CANCELLED") return "Tổng đơn";
  return "Cần thanh toán";
}

/**
 * `"16/09 · 20:30"` → `"20:30 · 16/09"`.
 *
 * `eventStamp` puts the day first, and every v2 screen that reads a timeline
 * prints it that way. The v3 screens lead with the CLOCK — "đặt 20:30 ·
 * 16/09", "cập nhật 10:15 · 17/09" — because the heading beside the timeline
 * is about how fresh the last milestone is, and the hour is what answers
 * that. Swapped here, in one place, rather than by re-stamping
 * `orderTimeline`: that function feeds the account screens too, and one
 * screen showing two orders of the same two numbers is what this avoids.
 */
export function clockFirst(detail: string): string {
  return detail.replace(/(\d{2}\/\d{2}) · (\d{2}:\d{2})/g, "$2 · $1");
}

function restamp(step: TimelineStep): TrackStep {
  return step.detail ? { ...step, detail: clockFirst(step.detail) } : step;
}

/**
 * The account's timeline, stamped clock first.
 *
 * It is handed the order with the status the CLOCK says it is in
 * (`effectiveStatus`), so a transfer whose hold has run out arrives here
 * already cancelled and the timeline ends with "Đã huỷ — quá hạn chuyển
 * khoản" rather than a step marked late under a live deadline.
 */
function trackSteps(o: Order): TrackStep[] {
  // The milestone on the road used to add "đơn vị vận chuyển chưa nối, mốc
  // này cập nhật tay từ cửa hàng"; it went with the explanatory copy (v3
  // slice 13): the milestone is its stamp and the courier's number.
  return orderTimeline(o).map(restamp);
}

/**
 * An order in the screen's shape.
 *
 * `addressLine` is a PARAMETER: building it needs `data/regions.ts`, which
 * carries 3.321 communes and stays on the server. The page formats it there
 * and hands it in.
 */
export function trackedOfOrder(
  catalog: Catalog,
  base: Order,
  addressLine: string,
  now: Date = demoNow(),
): TrackedOrder {
  // The status the clock says it is in, not the one written down: an unpaid
  // transfer past its twelve hours is a cancelled order on every surface
  // that reads it (`effectiveStatus`).
  const status = effectiveStatus(base, now);
  const o: Order = status === base.status ? base : { ...base, status };
  const state = status.state;

  return {
    code: o.code,
    placedAt: o.placedAt,
    state,
    units: orderUnits(o),
    lines: o.lines.map((l): TrackedLine => {
      const p = catalog.byId.get(l.productId);
      return {
        // "S05 – KHÓI" for an issue's style (v3 slice 11): the name the shop
        // shows it under everywhere, on the receipt as on the card.
        name: p ? styleName(p.name, p.dropNo) : "—",
        kind: p?.kind ?? "",
        colorLabel: COLORS[l.color].label,
        size: l.size,
        qty: l.qty,
        unitPriceVnd: l.unitPriceVnd,
        photoKey: (p && (p.photoKeys[p.colors.indexOf(l.color)] ?? p.photoKeys[0])) ?? "hero",
      };
    }),
    recipient: o.shipTo.recipient,
    phone: o.shipTo.phone,
    addressLine,
    note: o.note,
    delivery: o.delivery,
    subtotalVnd: orderSubtotalVnd(o),
    shippingFeeVnd: o.shippingFeeVnd,
    codFeeVnd: o.codFeeVnd,
    discountVnd: o.discountVnd,
    totalVnd: orderTotalVnd(o),
    ...(o.promo ? { promo: o.promo } : {}),
    payment: o.payment,
    ...(status.state === "SHIPPING" ? { trackingCode: status.trackingCode } : {}),
    ...(status.state === "SHIPPING" && status.carrier ? { carrier: status.carrier } : {}),
    steps: trackSteps(o),
    paid: isPaid(state),
  };
}

/**
 * "10:15 · 17/09" — when the newest milestone that actually happened
 * happened, for the heading beside the timeline.
 *
 * The first two segments of that step's own detail, so it cannot drift from
 * the line below it. A step still ahead carries no stamp and a step that
 * never got one returns "" — the heading then simply leaves the meta off
 * rather than printing a date nothing recorded.
 */
export function lastUpdateLabel(steps: TrackStep[]): string {
  const stamped = steps.filter((s) => s.state !== "todo" && s.detail);
  const last = stamped[stamped.length - 1];
  return last?.detail ? last.detail.split(" · ").slice(0, 2).join(" · ") : "";
}
