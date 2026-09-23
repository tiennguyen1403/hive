import { COLORS, byId } from "@/data/catalog";
import { customerById } from "@/data/customers";
import { orderByCode } from "@/data/orders";
import type { Order, PaymentMethod, Size } from "@/data/types";
import { orderCode as asOrderCode } from "@/data/types";
import { effectiveStatus, orderTimeline, type TimelineStep } from "./customer-orders";
import { orderSubtotalVnd, orderTotalVnd, orderUnits } from "./orders";
import { deviceState, deviceTimeline, type RowState } from "./order-rows";
import { transferDeadlineIso, type PlacedOrder } from "./placed-order";
import { demoNow } from "./clock";

/**
 * Looking an order up WITHOUT signing in — a code plus the phone number it
 * was placed with.
 *
 * Two things make this safe enough to offer. Order codes are short and
 * sequential (`DH-2425`, `DH-2431`), so a code alone would hand a stranger
 * somebody's name, address and phone number — that is QĐ-16 again, with the
 * phone number standing in for the session. And the answer is the same
 * whichever of the two is wrong, so the screen never confirms that a code
 * exists.
 *
 * Two places to look, because an order lives in one of two: the fixtures
 * (placed before this build existed, with a courier behind them) and
 * `brand.orders`, this browser's own. Neither is reachable from the other —
 * the fixtures are server-side data, the device list is `localStorage` — so
 * the lookup is split in two and the screen asks both.
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

// ──────────────────────────────────────────────────────────── the two finds
/** A fixture order, but only for somebody holding the number it was placed with. */
export function findFixtureOrder(code: string, phone: string): Order | undefined {
  const wanted = normaliseOrderCode(code);
  if (!wanted || !phoneDigits(phone)) return undefined;

  const order = orderByCode.get(asOrderCode(wanted));
  if (!order) return undefined;

  // The order's own `shipTo` number first — it is what was written on the
  // parcel — then the account's, for an order shipped to someone else.
  const customer = customerById.get(order.customerId);
  const numbers = [order.shipTo.phone, customer?.phone ?? ""];
  return numbers.some((n) => samePhone(phone, n)) ? order : undefined;
}

/** An order placed in THIS browser, matched the same way. */
export function findDeviceOrder(
  code: string,
  phone: string,
  placed: PlacedOrder[],
): PlacedOrder | undefined {
  const wanted = normaliseOrderCode(code);
  if (!wanted || !phoneDigits(phone)) return undefined;
  return placed.find((p) => p.code === wanted && samePhone(phone, p.phone));
}

export type LookupHit =
  | { source: "fixture"; order: Order }
  | { source: "device"; order: PlacedOrder };

/**
 * Both places, fixtures first.
 *
 * A device order can carry a code the fixtures already use —
 * `nextOrderCode` is minutes-based and wraps — and the fixture is the one
 * with a history behind it, the same tie-break `orderRows` makes.
 */
export function lookupOrder(
  code: string,
  phone: string,
  placed: PlacedOrder[] = [],
): LookupHit | null {
  const fixture = findFixtureOrder(code, phone);
  if (fixture) return { source: "fixture", order: fixture };

  const device = findDeviceOrder(code, phone, placed);
  return device ? { source: "device", order: device } : null;
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
 * A found order, whichever of the two it came from.
 *
 * The screen renders ONE shape. The fixtures and the device list disagree
 * about almost everything — one stores product ids and a status union, the
 * other stores a frozen copy — and reconciling that in the markup would be
 * two code paths through every panel.
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
  /** `late` is the fourth: a wait whose deadline has already passed. */
  state: "done" | "now" | "todo" | "late";
}

export interface TrackedOrder {
  code: string;
  placedAt: string;
  state: RowState;
  units: number;
  lines: TrackedLine[];
  recipient: string;
  phone: string;
  addressLine: string;
  /** What was typed for the courier. The fixtures never carried one. */
  note: string;
  subtotalVnd: number;
  shippingFeeVnd: number;
  codFeeVnd: number;
  discountVnd: number;
  totalVnd: number;
  promo?: string;
  payment: PaymentMethod;
  /** The courier's number, on the states that have one. */
  trackingCode?: string;
  steps: TrackStep[];
  /** Money has actually been received. False for every device order. */
  paid: boolean;
  /** Placed in this browser, so it exists nowhere else. */
  onDevice: boolean;
}

/** Paid means received, not promised. COD and a card with no gateway are not. */
function isPaid(state: RowState): boolean {
  return state === "PAID" || state === "SHIPPING" || state === "DELIVERED";
}

/** The last line of the summary box, in the fewest words that are true. */
export function totalRowLabel(state: RowState): string {
  if (isPaid(state)) return "Đã thanh toán";
  if (state === "CANCELLED") return "Tổng đơn";
  return "Cần thanh toán";
}

/**
 * The courier has not been connected, so every milestone after despatch is
 * typed in by the shop. The timeline says so where it matters rather than
 * implying a tracking feed nobody is sending.
 */
const HAND_UPDATED = "đơn vị vận chuyển chưa nối, mốc này cập nhật tay từ cửa hàng";

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
 * The fixtures' timeline, plus the one thing this screen knows that the
 * account's version does not: a parcel "đang giao" is only as current as the
 * last hand update.
 *
 * It is handed the order with the status the CLOCK says it is in
 * (`effectiveStatus`), so a transfer whose hold has run out arrives here
 * already cancelled and the timeline ends with "Đã huỷ — quá hạn chuyển
 * khoản" rather than a step marked late under a live deadline. The `late`
 * state stays in the type for the device orders below, whose deadline is
 * the only thing that can still move.
 */
function fixtureSteps(o: Order): TrackStep[] {
  return orderTimeline(o).map(restamp).map((step): TrackStep => {
    if (o.status.state === "SHIPPING" && step.state === "now") {
      return { ...step, detail: `${step.detail} · ${HAND_UPDATED}` };
    }
    return step;
  });
}

/** The device order's shorter timeline, with the same late rule. */
function deviceSteps(p: PlacedOrder, now: Date): TrackStep[] {
  const overdue = now.getTime() >= Date.parse(transferDeadlineIso(p.placedAt));
  return deviceTimeline(p, now).map(restamp).map((step): TrackStep =>
    step.title === "Chờ chuyển khoản" && overdue ? { ...step, state: "late" } : step,
  );
}

/**
 * A fixture order in the screen's shape.
 *
 * `addressLine` is a PARAMETER: building it needs `data/regions.ts`, which
 * carries 3.321 communes and stays on the server. The page formats it there
 * and hands it in.
 */
export function trackedOfOrder(
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
      const p = byId.get(l.productId);
      return {
        name: p?.name ?? "—",
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
    note: "",
    subtotalVnd: orderSubtotalVnd(o),
    shippingFeeVnd: o.shippingFeeVnd,
    codFeeVnd: 0,
    discountVnd: o.discountVnd,
    totalVnd: orderTotalVnd(o),
    ...(o.promo ? { promo: o.promo } : {}),
    payment: o.payment,
    ...(status.state === "SHIPPING" ? { trackingCode: status.trackingCode } : {}),
    steps: fixtureSteps(o),
    paid: isPaid(state),
    onDevice: false,
  };
}

/** An order placed in this browser, in the same shape. */
export function trackedOfPlaced(p: PlacedOrder, now: Date = demoNow()): TrackedOrder {
  const state = deviceState(p, now);

  return {
    code: p.code,
    placedAt: p.placedAt,
    state,
    units: p.lines.reduce((n, l) => n + l.qty, 0),
    lines: p.lines.map((l) => ({
      name: l.name,
      kind: l.kind,
      colorLabel: l.colorLabel,
      size: l.size,
      qty: l.qty,
      unitPriceVnd: l.unitPriceVnd,
      photoKey: l.photoKey,
    })),
    recipient: p.recipient,
    phone: p.phone,
    addressLine: p.addressLine,
    note: p.note,
    subtotalVnd: p.subtotalVnd,
    shippingFeeVnd: p.shippingFeeVnd,
    codFeeVnd: p.codFeeVnd,
    discountVnd: p.discountVnd,
    totalVnd: p.totalVnd,
    ...(p.promo ? { promo: p.promo } : {}),
    payment: p.payment,
    steps: deviceSteps(p, now),
    // No server took any money, so no device order is ever paid. Saying
    // otherwise would be the screen inventing a payment.
    paid: false,
    onDevice: true,
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
