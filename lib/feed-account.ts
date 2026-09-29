import { COLORS } from "@/data/colors";
import {
  ADDRESS_LABELS,
  type AddressLabel,
  type ColorKey,
  type Order,
  type OrderLine,
  type OrderState,
  type OrderStatus,
  type PaymentMethod,
  type Product,
} from "@/data/types";
import type { Catalog } from "./catalog";
import { CUSTOMER_CANCEL_REASON, OVERDUE_REASON } from "./customer-orders";
import { addDaysIso, clockLabel, dayMonth } from "./datetime";
import { canBuy, photoKeyOf, pictureOf } from "./feed";
import { FEED_PAYMENTS, feedDelivery } from "./feed-checkout";
import { isFixed, onHandOf } from "./inventory";
import { issueLabel } from "./lexicon";
import { phoneDigits } from "./lookup";
import { isRealPhotoKey } from "./photos";
import { RETURN_WINDOW_DAYS } from "./shipping";

/**
 * What the Feed's account screens print about orders and addresses (round v4
 * slice 3a): the approved mock's rules and words (`prototype/explore/feed/
 * account.js`, `orders.js`, `order.js`, `addresses.js`; the data layer's
 * `ORDER_STATES`, `ORDER_PHASES`, `orderGroups`, `returnUntil`) over the
 * app's own orders and address book. Pure, and safe for the browser: nothing
 * here reaches `data/regions.ts`.
 *
 * Every function that depends on the time is handed `now`: the server render
 * and the hydrating client must agree on it.
 */

const capitalise = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("vi") + s.slice(1) : s);

// ─────────────────────────────────────────────────────────── the state in words

/** The mock's names for the six states (`ORDER_STATES`): a COD order before the shop's call is "Chờ xác nhận". */
export const FEED_STATE_LABEL: Readonly<Record<OrderState, string>> = {
  AWAITING_TRANSFER: "Chờ chuyển khoản",
  RECEIVED: "Chờ xác nhận",
  PAID: "Đã thanh toán",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã huỷ",
};

/**
 * Why an order was cancelled, in the mock's words where it has them: the
 * shopper's own cancel reads "Bạn đã huỷ", the hold that ran out "Quá hạn
 * chuyển khoản". Any other reason — the shop's, in its own words — is kept as
 * the app has it, with a capital to start the line.
 */
export function cancelReasonText(reason: string): string {
  const r = reason.trim();
  const low = r.toLocaleLowerCase("vi");
  if (low === CUSTOMER_CANCEL_REASON) return "Bạn đã huỷ";
  if (low === OVERDUE_REASON) return "Quá hạn chuyển khoản";
  return capitalise(r);
}

/** "Chuyển khoản", "Thanh toán khi nhận (COD)", "Thẻ (nội địa, Visa)": the checkout's names (`PAYMENTS[].label`). */
export function paymentTitle(method: PaymentMethod): string {
  return FEED_PAYMENTS.find((p) => p.method === method)?.title ?? "";
}

/** "Giao tiêu chuẩn", "Giao nhanh nội thành" (`DELIVERY[].label`). */
export function deliveryTitle(method: Order["delivery"]): string {
  return feedDelivery(method).title;
}

// ─────────────────────────────────────────────────────────── the two filters

/** The orders list's phases (`ORDER_PHASES`): waiting for money, a call or the courier; delivered; cancelled. */
export type OrderPhase = "active" | "delivered" | "cancelled";

export const ORDER_PHASES: Readonly<Record<OrderPhase, string>> = {
  active: "Đang xử lý",
  delivered: "Đã giao",
  cancelled: "Đã huỷ",
};

export const PHASES: readonly OrderPhase[] = ["active", "delivered", "cancelled"];

/** The phase of the status the shopper sees (`orderPhase`; an overdue transfer is already cancelled here). */
export function orderPhase(status: OrderStatus): OrderPhase {
  if (status.state === "DELIVERED") return "delivered";
  if (status.state === "CANCELLED") return "cancelled";
  return "active";
}

/** What an order was bought from: an issue by its number, or the fixed line. */
export type OrderGroup = number | "fixed";

/** A line's group, from its style; nothing for a style the catalogue no longer has. */
export function lineGroup(catalog: Catalog, line: Pick<OrderLine, "productId">): OrderGroup | null {
  const p = catalog.byId.get(line.productId);
  if (!p) return null;
  return p.dropNo === null ? "fixed" : p.dropNo;
}

/** Newest issue first, the fixed line last (`orderGroups`). */
function byGroup(a: OrderGroup, b: OrderGroup): number {
  if (a === "fixed" || b === "fixed") return (a === "fixed" ? 1 : 0) - (b === "fixed" ? 1 : 0);
  return b - a;
}

/** Every group an order touches: `[5, "fixed"]` for an order of Số 05 styles and a fixed piece. */
export function orderGroups(catalog: Catalog, o: Pick<Order, "lines">): OrderGroup[] {
  const seen = new Set<OrderGroup>();
  for (const l of o.lines) {
    const g = lineGroup(catalog, l);
    if (g !== null) seen.add(g);
  }
  return [...seen].sort(byGroup);
}

/** The groups the shopper's orders touch, for the chips: the issues, newest first, then Cố định. */
export function groupsOfOrders(catalog: Catalog, orders: readonly Pick<Order, "lines">[]): OrderGroup[] {
  const seen = new Set<OrderGroup>();
  for (const o of orders) for (const g of orderGroups(catalog, o)) seen.add(g);
  return [...seen].sort(byGroup);
}

/** In the URL: `so-05`, `co-dinh`. */
export function groupSlug(g: OrderGroup): string {
  return g === "fixed" ? "co-dinh" : `so-${String(g).padStart(2, "0")}`;
}

/** On the chip and above the code: "Số 05", "Cố định". */
export function groupLabel(g: OrderGroup): string {
  return g === "fixed" ? "Cố định" : issueLabel(g);
}

export interface OrdersFilter {
  phase: OrderPhase | "all";
  group: OrderGroup | "all";
}

export const NO_FILTER: OrdersFilter = { phase: "all", group: "all" };

/** The v3 list's `?tab=` (slice v3 4), read as the phase it meant, so an old link still lands on it. */
const LEGACY_TAB: Readonly<Record<string, OrderPhase>> = {
  processing: "active",
  delivered: "delivered",
  cancelled: "cancelled",
};

type RawParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * `?phase=active|delivered|cancelled&group=so-05|…|co-dinh`, both kept in the
 * URL (QĐ-8). A group the shopper's orders do not touch, or a phase that is
 * not one, reads as "all", as the mock does.
 */
export function parseOrdersFilter(sp: RawParams, groups: readonly OrderGroup[]): OrdersFilter {
  const phase = one(sp.phase);
  const tab = one(sp.tab);
  const slug = one(sp.group);
  return {
    phase: (PHASES as readonly string[]).includes(phase) ? (phase as OrderPhase) : (LEGACY_TAB[tab] ?? "all"),
    group: groups.find((g) => groupSlug(g) === slug) ?? "all",
  };
}

/**
 * This page's own address, its query kept: where "Đăng nhập" and "Tạo tài
 * khoản" bring the shopper back to (`signInHref`, which keeps the search).
 */
export function pathWithQuery(path: string, sp: RawParams): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    for (const one of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, one);
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/** The filter as a query, the defaults left out: `phase=active&group=so-05`, or "". */
export function ordersQuery(f: OrdersFilter): string {
  const q = new URLSearchParams();
  if (f.phase !== "all") q.set("phase", f.phase);
  if (f.group !== "all") q.set("group", groupSlug(f.group));
  return q.toString();
}

/** The orders the two filters leave, in the order they came. */
export function filterOrders<T extends Order>(catalog: Catalog, orders: readonly T[], f: OrdersFilter): T[] {
  return orders.filter(
    (o) =>
      (f.phase === "all" || orderPhase(o.status) === f.phase) &&
      (f.group === "all" || orderGroups(catalog, o).includes(f.group)),
  );
}

/** "Không có đơn đang xử lý ở Số 05" — the combination that leaves nothing (`none`). */
export function noneLabel(f: OrdersFilter): string {
  const phase = f.phase === "all" ? "" : ` ${ORDER_PHASES[f.phase].toLocaleLowerCase("vi")}`;
  const group = f.group === "all" ? "" : ` ở ${groupLabel(f.group)}`;
  return `Không có đơn${phase}${group}`;
}

/** What a screen reader hears after a filter changes: "3 đơn", or the empty line. */
export function resultLabel(count: number, f: OrdersFilter): string {
  return count ? `${count} đơn` : noneLabel(f);
}

/** Newest first. */
export function newestFirst<T extends Pick<Order, "placedAt">>(orders: readonly T[]): T[] {
  return [...orders].sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
}

// ─────────────────────────────────────────────────────────── one order

/** The last moment to ask for a return: seven days from delivery (`returnUntil`, `RETURN_WINDOW_DAYS`). */
export function returnUntil(o: Order): string | null {
  return o.status.state === "DELIVERED" ? addDaysIso(o.status.deliveredAt, RETURN_WINDOW_DAYS) : null;
}

/** Whether the return window is still open (`canReturn`). */
export function canReturn(o: Order, now: Date): boolean {
  const until = returnUntil(o);
  return until !== null && now.getTime() < Date.parse(until);
}

/** Whether "Huỷ đơn" is offered: nobody has been paid yet (a transfer in its hold, a COD order before the call). */
export function canCancelOrder(o: Order): boolean {
  return o.status.state === "AWAITING_TRANSFER" || o.status.state === "RECEIVED";
}

/**
 * The note beside a ticket's state (`ticket`): the hold counting down, why it
 * was cancelled, the tracking code, or the return window's last day while it
 * is open.
 */
export type TicketNote =
  | { kind: "hold"; dueAt: string }
  | { kind: "reason"; text: string }
  | { kind: "tracking"; code: string }
  | { kind: "return"; day: string };

export function ticketNote(o: Order, now: Date): TicketNote | null {
  switch (o.status.state) {
    case "AWAITING_TRANSFER":
      return { kind: "hold", dueAt: o.status.dueAt };
    case "CANCELLED":
      return { kind: "reason", text: cancelReasonText(o.status.reason) };
    case "SHIPPING":
      return o.status.trackingCode ? { kind: "tracking", code: o.status.trackingCode } : null;
    case "DELIVERED": {
      const until = returnUntil(o);
      return until && canReturn(o, now) ? { kind: "return", day: dayMonth(until) } : null;
    }
    default:
      return null;
  }
}

/** One of the four steps, as Feed's story bars draw it: done, now (half), to come, or off (a cancelled order's). */
export interface OrderStep {
  label: string;
  /** When it happened, when the order records it. */
  at: string | null;
  state: "done" | "now" | "todo" | "off";
}

/**
 * When the order was paid, handed over and delivered, as far as it records:
 * the status's own moment for the state it is in, and `moments` (slice B10)
 * for the ones before it. An order without `moments` — read from a database
 * the B10 migration has not reached — still knows the one its status carries.
 */
function stepMoments(o: Order): { paidAt: string | null; shippedAt: string | null; deliveredAt: string | null } {
  const s = o.status;
  const m = o.moments;
  return {
    paidAt: s.state === "PAID" ? s.paidAt : (m?.paidAt ?? null),
    shippedAt: s.state === "SHIPPING" ? s.shippedAt : (m?.shippedAt ?? null),
    deliveredAt: s.state === "DELIVERED" ? s.deliveredAt : (m?.deliveredAt ?? null),
  };
}

/**
 * Đặt hàng, Thanh toán (Xác nhận for COD), Gửi hàng, Đã giao (`stepModel`);
 * a cancelled order: Đặt hàng, Đã huỷ, then two steps it never reached. The
 * first step not done is the one now: a COD order before the shop's call is
 * on "Xác nhận".
 *
 * Every step already passed carries its time, as the mock's do, wherever the
 * order recorded one (`stepMoments`); a moment nobody recorded is left out,
 * never guessed. COD's "Xác nhận" has none at all: the order is RECEIVED the
 * moment it is placed, and the shop's call is not recorded; a payment the
 * shop marked is not a confirmation, so it is not printed there either.
 */
export function orderSteps(o: Order): OrderStep[] {
  const s = o.status;
  if (s.state === "CANCELLED") {
    return [
      { label: "Đặt hàng", at: o.placedAt, state: "done" },
      { label: "Đã huỷ", at: s.cancelledAt, state: "off" },
      { label: "Gửi hàng", at: null, state: "off" },
      { label: "Đã giao", at: null, state: "off" },
    ];
  }
  const cod = o.payment === "COD";
  const moment = stepMoments(o);
  const shipped = s.state === "SHIPPING" || s.state === "DELIVERED";
  const steps: { label: string; at: string | null; done: boolean }[] = [
    { label: "Đặt hàng", at: o.placedAt, done: true },
    {
      label: cod ? "Xác nhận" : "Thanh toán",
      at: cod ? null : moment.paidAt,
      done: cod ? shipped : s.state === "PAID" || shipped,
    },
    { label: "Gửi hàng", at: moment.shippedAt, done: shipped },
    { label: "Đã giao", at: moment.deliveredAt, done: s.state === "DELIVERED" },
  ];
  let now = false;
  return steps.map(({ label, at, done }) => {
    if (done) return { label, at, state: "done" as const };
    if (!now) {
      now = true;
      return { label, at, state: "now" as const };
    }
    return { label, at, state: "todo" as const };
  });
}

/** "19:02 21/09": when a step happened (`at`). */
export function stepStamp(iso: string): string {
  return `${clockLabel(iso)} ${dayMonth(iso)}`;
}

/**
 * What "Mua lại" puts back in the basket (`buyAgain`): the lines whose style
 * is still sold, in a colour and size with anything left. The basket clamps
 * each to what is left.
 */
export function buyAgainLines(catalog: Catalog, o: Order, now: Date): OrderLine[] {
  return o.lines.filter((l) => {
    const p = catalog.byId.get(l.productId);
    return p !== undefined && canBuy(catalog, p, now) && onHandOf(p, l.color, l.size) > 0;
  });
}

// ─────────────────────────────────────────────────────────── an order's pieces as tiles

/**
 * A piece's picture (`tile`): a fixed style's flat drawing, or a photograph of
 * the style itself — Số 05's shots, an upload. A style whose frame is only a
 * borrowed stand-in (Số 03, Số 04) has none: the tile sets its name in type,
 * with its colour as a dot, as the mock draws a closed issue's style, and the
 * item is not a link (the mock links only the styles it draws).
 */
export function linePicture(p: Product | undefined, color: ColorKey): string | null {
  if (!p) return null;
  if (isFixed(p)) return pictureOf(p, color, "pack").src;
  return isRealPhotoKey(photoKeyOf(p, color)) ? pictureOf(p, color, "pack").src : null;
}

/** "SƯƠNG, rêu, size L", "KHÓI, đen, size M, 2 chiếc": a tile's name for a screen reader. */
export function tileLabel(name: string, color: ColorKey, size: string, qty: number): string {
  const c = (COLORS[color]?.label ?? color).toLocaleLowerCase("vi");
  return `${name}, ${c}, size ${size}${qty > 1 ? `, ${qty} chiếc` : ""}`;
}

// ─────────────────────────────────────────────────────────── the address book

/**
 * A new address takes the first of the three names (`ADDRESS_LABELS`, the
 * mock's `LABELS` in its order) that the book does not use yet, "Khác" once
 * all are.
 */
export function nextAddressLabel(taken: readonly string[]): AddressLabel {
  return ADDRESS_LABELS.find((l) => !taken.includes(l)) ?? "Khác";
}

/** What the address sheet sends: a new address (`id` null) or an edit, in the sheet's own fields. */
export interface AddressInput {
  id: string | null;
  label: AddressLabel;
  recipient: string;
  phone: string;
  provinceCode: string;
  wardCode: string;
  street: string;
  isDefault: boolean;
}

/**
 * What an address action answers: done (with the address's id, for the focus
 * that follows), the sheet's fields to correct, or one short sentence for a
 * toast.
 */
export type AddressResult =
  | { ok: true; id: string }
  | { ok: false; errors: Partial<Record<AddressField, string>>; message?: undefined }
  | { ok: false; message: string; errors?: undefined };

export type AddressField = "recipient" | "phone" | "province" | "ward" | "street";

/** The sheet's fields in its order: the first wrong one takes the focus. */
export const ADDRESS_FIELDS: readonly AddressField[] = ["recipient", "phone", "province", "ward", "street"];

export interface AddressFields {
  recipient: string;
  phone: string;
  provinceCode: string;
  wardCode: string;
  street: string;
}

/**
 * What is wrong with the address sheet, field by field, in the mock's words
 * (`addresses.js`: `check`). The commune is asked for once a province is
 * chosen. A phone number is read the way the rest of the app reads one
 * (`phoneDigits`: spaces, dots, dashes, +84), as the checkout does.
 */
export function feedAddressErrors(d: AddressFields): Partial<Record<AddressField, string>> {
  const e: Partial<Record<AddressField, string>> = {};
  if (d.recipient.trim().length < 2) e.recipient = "Nhập tên người nhận";
  const phone = d.phone.trim();
  if (!phone) e.phone = "Nhập số điện thoại";
  else if (!phoneDigits(phone)) e.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0";
  if (!d.provinceCode) e.province = "Chọn tỉnh / thành";
  else if (!d.wardCode) e.ward = "Chọn phường / xã";
  if (!d.street.trim()) e.street = "Nhập số nhà, đường";
  return e;
}

/** The first wrong field, in the sheet's order. */
export function firstWrongAddress(errors: Partial<Record<AddressField, string>>): AddressField | undefined {
  return ADDRESS_FIELDS.find((f) => errors[f]);
}

/** The default address first, the rest in the book's order (`render`). */
export function defaultFirst<T extends { isDefault: boolean }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

/** The shape of `addresses.id`: a uuid, as `gen_random_uuid()` writes one. */
const ADDRESS_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * An address's id as the browser sent it back — "Hoàn tác" names the address
 * it removed (slice B10) — or null for anything that cannot be one, so a
 * request carrying junk is answered without asking the database.
 */
export function readAddressId(value: unknown): string | null {
  return typeof value === "string" && ADDRESS_ID.test(value) ? value.toLowerCase() : null;
}

// ─────────────────────────────────────────────────────────── the guest lookup

export type LookupField = "code" | "phone";

/**
 * "Tra cứu đơn" without an account (`lookupForm`), checked in the mock's
 * words: "Nhập mã đơn", "Mã đơn có dạng DH-1499", "Nhập số điện thoại", "Số
 * điện thoại gồm 10 số, bắt đầu bằng 0". A valid pair leads to `/track`, the
 * code with its dash and the phone as its ten digits.
 */
export function lookupCheck(
  rawCode: string,
  rawPhone: string,
): { ok: true; href: string } | { ok: false; errors: Partial<Record<LookupField, string>> } {
  const code = rawCode.trim().toUpperCase();
  const phone = rawPhone.trim();
  const errors: Partial<Record<LookupField, string>> = {};
  if (!code) errors.code = "Nhập mã đơn";
  else if (!/^DH-?\d{3,6}$/.test(code)) errors.code = "Mã đơn có dạng DH-1499";
  const digits = phone.replace(/\D/g, "");
  if (!phone) errors.phone = "Nhập số điện thoại";
  else if (!/^0\d{9}$/.test(digits)) errors.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0";
  if (errors.code || errors.phone) return { ok: false, errors };
  const q = new URLSearchParams({ code: code.replace(/^DH(\d)/, "DH-$1"), phone: digits });
  return { ok: true, href: `/track?${q.toString()}` };
}
