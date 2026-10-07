import { COLORS, colorLabel } from "@/data/colors";
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
import { CARD_OVERDUE_REASON, CUSTOMER_CANCEL_REASON, OVERDUE_REASON } from "./customer-orders";
import { addDaysIso, clockLabel, dateTimeLabel, dayMonth } from "./datetime";
import { canBuy, photoKeyOf, pictureOf } from "./feed";
import { feedDelivery, feedPayments } from "./feed-checkout";
import { pick, pickAll, picker, plural, type Locale, type Pair } from "./i18n";
import { isFixed, onHandOf } from "./inventory";
import { FIXED_WORD_TEXT, issueLabel } from "./lexicon";
import { phoneDigits, trackHref } from "./lookup";
import { lookupWords } from "./order-lookup";
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

/**
 * The mock's names for the six states (`ORDER_STATES`): a COD order before the
 * shop's call is "Chờ xác nhận". In English (round v6 slice E3a) the
 * glossary's order states, as `stateLabel` has them (`lib/order-labels.ts`),
 * but for that one: "Awaiting confirmation", what the order waits for, as the
 * Vietnamese says it. "Order received" is the English of the back office's
 * "Đã nhận đơn" (`STATE_LABEL`), the state's own name, and stays there.
 */
export const FEED_STATE_LABEL_TEXT: Readonly<Record<OrderState, Pair>> = {
  AWAITING_TRANSFER: { vi: "Chờ chuyển khoản", en: "Awaiting transfer" },
  RECEIVED: { vi: "Chờ xác nhận", en: "Awaiting confirmation" },
  PAID: { vi: "Đã thanh toán", en: "Paid" },
  SHIPPING: { vi: "Đang giao", en: "Shipping" },
  DELIVERED: { vi: "Đã giao", en: "Delivered" },
  CANCELLED: { vi: "Đã huỷ", en: "Cancelled" },
};

export const FEED_STATE_LABEL: Readonly<Record<OrderState, string>> = pickAll(FEED_STATE_LABEL_TEXT, "vi");

/**
 * A card order waiting for its money (slice B18, QĐ-46): it pays on Stripe's
 * page, so it waits for a card payment, not a transfer — the same name the
 * back office gives it (`orderStateLabel`, `lib/order-labels.ts`).
 */
export const CARD_AWAITING_TEXT: Pair = { vi: "Chờ trả thẻ", en: "Awaiting card payment" };

/**
 * One state's name in one language — for one order, by how it is paid when
 * that is given: a card order waiting for its money is "Chờ trả thẻ".
 */
export function feedStateLabel(state: OrderState, locale: Locale = "vi", payment?: PaymentMethod): string {
  if (state === "AWAITING_TRANSFER" && payment === "CARD") return pick(CARD_AWAITING_TEXT, locale);
  return pick(FEED_STATE_LABEL_TEXT[state], locale);
}

/**
 * Every reason the app itself writes into `orders.cancel_reason`, in English
 * (round v6 slice E2): the back office's four (`CANCEL_REASONS`,
 * `lib/admin-orders.ts`), the hold that ran out (`OVERDUE_REASON`; a card
 * order's, `CARD_OVERDUE_REASON`, since slice B18) and the shopper's own
 * cancel (`CUSTOMER_CANCEL_REASON`). Keyed by the stored Vietnamese in lower
 * case — the sample writes the overdue one both ways, "Quá hạn chuyển khoản"
 * and "quá hạn chuyển khoản". The column keeps the Vietnamese; it is
 * translated where it is printed.
 */
const CANCEL_REASON_EN: Readonly<Record<string, string>> = {
  "khách đổi ý": "Change of mind",
  [OVERDUE_REASON]: "Transfer overdue",
  [CARD_OVERDUE_REASON]: "Payment overdue",
  "hết hàng thật": "Out of stock",
  "khác": "Other",
  [CUSTOMER_CANCEL_REASON]: "Cancelled by the customer",
};

/** How a stored reason is looked up: composed, trimmed, lower case. */
const reasonKey = (reason: string) => reason.normalize("NFC").trim().toLocaleLowerCase("vi");

/**
 * A stored reason in one language: in Vietnamese as it was stored; in English
 * the table's words, ignoring case, or — for a reason that is not one of the
 * app's own — exactly as it was stored.
 */
export function cancelReasonLabel(reason: string, locale: Locale = "vi"): string {
  if (locale === "vi") return reason;
  return CANCEL_REASON_EN[reasonKey(reason)] ?? reason;
}

/**
 * Why an order was cancelled, in the mock's words where it has them: the
 * shopper's own cancel reads "Bạn đã huỷ", the hold that ran out "Quá hạn
 * chuyển khoản" — a card order's "Quá hạn thanh toán" since slice B18. Any
 * other reason — the shop's, in its own words — is kept as the app has it,
 * with a capital to start the line. In English (round v6 slice E2) "You
 * cancelled", "Transfer overdue", "Payment overdue", or the reason by
 * `cancelReasonLabel`.
 */
export function cancelReasonText(reason: string, locale: Locale = "vi"): string {
  const r = reason.trim();
  const low = r.toLocaleLowerCase("vi");
  if (locale === "en") return low === CUSTOMER_CANCEL_REASON ? "You cancelled" : cancelReasonLabel(r, "en");
  if (low === CUSTOMER_CANCEL_REASON) return "Bạn đã huỷ";
  if (low === OVERDUE_REASON) return "Quá hạn chuyển khoản";
  if (low === CARD_OVERDUE_REASON) return "Quá hạn thanh toán";
  return capitalise(r);
}

/**
 * "Chuyển khoản", "Thanh toán khi nhận (COD)", "Thẻ (Visa, Mastercard)": the
 * checkout's names (`PAYMENTS[].label`); in English the checkout's English
 * ("Bank transfer", "Cash on delivery (COD)", "Card (Visa, Mastercard)"). The
 * card's name is the one the user chose for Stripe's test mode (QĐ-46).
 */
export function paymentTitle(method: PaymentMethod, locale: Locale = "vi"): string {
  return feedPayments(locale).find((p) => p.method === method)?.title ?? "";
}

/** "Giao tiêu chuẩn", "Giao nhanh nội thành" (`DELIVERY[].label`); in English "Standard delivery", "Express city delivery". */
export function deliveryTitle(method: Order["delivery"], locale: Locale = "vi"): string {
  return feedDelivery(method, locale).title;
}

// ─────────────────────────────────────────────────────────── the two filters

/** The orders list's phases (`ORDER_PHASES`): waiting for money, a call or the courier; delivered; cancelled. */
export type OrderPhase = "active" | "delivered" | "cancelled";

/** The phases' names in both languages; "Ongoing" for the orders still moving (round v6 slice E3a). */
export const ORDER_PHASES_TEXT: Readonly<Record<OrderPhase, Pair>> = {
  active: { vi: "Đang xử lý", en: "Ongoing" },
  delivered: { vi: "Đã giao", en: "Delivered" },
  cancelled: { vi: "Đã huỷ", en: "Cancelled" },
};

export const ORDER_PHASES: Readonly<Record<OrderPhase, string>> = pickAll(ORDER_PHASES_TEXT, "vi");

/** A phase's name in one language. */
export function orderPhaseLabel(phase: OrderPhase, locale: Locale = "vi"): string {
  return pick(ORDER_PHASES_TEXT[phase], locale);
}

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

/**
 * On the chip and above the code: "Số 05", "Cố định". One parameter: the
 * orders list maps over it (`groups.map(groupLabel)`); the language is
 * `groupLabelIn`'s.
 */
export function groupLabel(g: OrderGroup): string {
  return groupLabelIn(g, "vi");
}

/** The same in one language (round v6 slice E2): "Drop 05", "Basics" in English. */
export function groupLabelIn(g: OrderGroup, locale: Locale): string {
  return g === "fixed" ? pick(FIXED_WORD_TEXT, locale) : issueLabel(g, locale);
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

/** The orders the two filters leave, in the order they came. */
export function filterOrders<T extends Order>(catalog: Catalog, orders: readonly T[], f: OrdersFilter): T[] {
  return orders.filter(
    (o) =>
      (f.phase === "all" || orderPhase(o.status) === f.phase) &&
      (f.group === "all" || orderGroups(catalog, o).includes(f.group)),
  );
}

/**
 * "Không có đơn đang xử lý ở Số 05" — the combination that leaves nothing
 * (`none`); in English "No ongoing Drop 05 orders", "No Basics orders", "No
 * cancelled orders": the line it shares with the Vietnamese at 390 ("No
 * cancelled orders in Drop 05" left "05" alone on a second line).
 */
export function noneLabel(f: OrdersFilter, locale: Locale = "vi"): string {
  if (locale === "en") {
    const words = ["No"];
    if (f.phase !== "all") words.push(orderPhaseLabel(f.phase, "en").toLocaleLowerCase("en"));
    if (f.group !== "all") words.push(groupLabelIn(f.group, "en"));
    return [...words, "orders"].join(" ");
  }
  const phase = f.phase === "all" ? "" : ` ${ORDER_PHASES[f.phase].toLocaleLowerCase("vi")}`;
  const group = f.group === "all" ? "" : ` ở ${groupLabel(f.group)}`;
  return `Không có đơn${phase}${group}`;
}

/** What a screen reader hears after a filter changes: "3 đơn", or the empty line; in English "3 orders", "1 order". */
export function resultLabel(count: number, f: OrdersFilter, locale: Locale = "vi"): string {
  if (!count) return noneLabel(f, locale);
  return locale === "en" ? plural(count, "order", "orders") : `${count} đơn`;
}

/** Newest first. */
export function newestFirst<T extends Pick<Order, "placedAt">>(orders: readonly T[]): T[] {
  return [...orders].sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
}

// ─────────────────────────────────────────────────────────── one order

/*
 * `returnUntil`, `canReturn` and `orderSteps` take only the fields they read
 * (round v4 slice 4a), so the guest lookup's order (`LookedUpOrder`) reads
 * with them too.
 */

/** The last moment to ask for a return: seven days from delivery (`returnUntil`, `RETURN_WINDOW_DAYS`). */
export function returnUntil(o: Pick<Order, "status">): string | null {
  return o.status.state === "DELIVERED" ? addDaysIso(o.status.deliveredAt, RETURN_WINDOW_DAYS) : null;
}

/** Whether the return window is still open (`canReturn`). */
export function canReturn(o: Pick<Order, "status">, now: Date): boolean {
  const until = returnUntil(o);
  return until !== null && now.getTime() < Date.parse(until);
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

export function ticketNote(o: Order, now: Date, locale: Locale = "vi"): TicketNote | null {
  switch (o.status.state) {
    case "AWAITING_TRANSFER":
      return { kind: "hold", dueAt: o.status.dueAt };
    case "CANCELLED":
      return { kind: "reason", text: cancelReasonText(o.status.reason, locale) };
    case "SHIPPING":
      return o.status.trackingCode ? { kind: "tracking", code: o.status.trackingCode } : null;
    case "DELIVERED": {
      const until = returnUntil(o);
      return until && canReturn(o, now) ? { kind: "return", day: dayMonth(until, locale) } : null;
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
function stepMoments(o: Pick<Order, "status" | "moments">): {
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
} {
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
 *
 * In English (round v6 slice E2) "Ordered", "Payment" ("Confirmation" for
 * COD), "Dispatch", "Delivered"; a cancelled order's second step "Cancelled"
 * (`STEP_TEXT`).
 */
export function orderSteps(
  o: Pick<Order, "status" | "placedAt" | "payment" | "moments">,
  locale: Locale = "vi",
): OrderStep[] {
  const w = pickAll(STEP_TEXT, locale);
  const s = o.status;
  if (s.state === "CANCELLED") {
    return [
      { label: w.placed, at: o.placedAt, state: "done" },
      { label: w.cancelled, at: s.cancelledAt, state: "off" },
      { label: w.shipped, at: null, state: "off" },
      { label: w.delivered, at: null, state: "off" },
    ];
  }
  const cod = o.payment === "COD";
  const moment = stepMoments(o);
  const shipped = s.state === "SHIPPING" || s.state === "DELIVERED";
  const steps: { label: string; at: string | null; done: boolean }[] = [
    { label: w.placed, at: o.placedAt, done: true },
    {
      label: cod ? w.confirmed : w.paid,
      at: cod ? null : moment.paidAt,
      done: cod ? shipped : s.state === "PAID" || shipped,
    },
    { label: w.shipped, at: moment.shippedAt, done: shipped },
    { label: w.delivered, at: moment.deliveredAt, done: s.state === "DELIVERED" },
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

/**
 * The steps' names, in both languages. The step an order waits on is drawn as
 * "now", so the two in the middle are named for what happens there —
 * "Payment", "Confirmation", "Dispatch", as the Vietnamese says "Thanh toán",
 * "Gửi hàng" — never as done ("Paid") before they are.
 */
const STEP_TEXT = {
  placed: { vi: "Đặt hàng", en: "Ordered" },
  paid: { vi: "Thanh toán", en: "Payment" },
  confirmed: { vi: "Xác nhận", en: "Confirmation" },
  shipped: { vi: "Gửi hàng", en: "Dispatch" },
  delivered: { vi: "Đã giao", en: "Delivered" },
  cancelled: { vi: "Đã huỷ", en: "Cancelled" },
} as const satisfies Record<string, Pair>;

/** "19:02 21/09": when a step happened (`at`); in English "19:02, 21 Sep", as a moment is written there (`dateTimeLabel`). */
export function stepStamp(iso: string, locale: Locale = "vi"): string {
  return locale === "en" ? dateTimeLabel(iso, "en") : `${clockLabel(iso)} ${dayMonth(iso)}`;
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

/**
 * "SƯƠNG, rêu, size L", "KHÓI, đen, size M, 2 chiếc": a tile's name for a
 * screen reader; in English "SƯƠNG, moss, size L", "KHÓI, black, size M, 2
 * pieces" (round v6 slice E3a). `name` is the one the screen prints.
 */
export function tileLabel(name: string, color: ColorKey, size: string, qty: number, locale: Locale = "vi"): string {
  const c = (COLORS[color] ? colorLabel(color, locale) : color).toLocaleLowerCase(locale);
  if (locale === "en") return `${name}, ${c}, size ${size}${qty > 1 ? `, ${plural(qty, "piece", "pieces")}` : ""}`;
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

/**
 * The three names in English (round v6 slice E3a): "Home", "Work", "Other".
 * The book stores the Vietnamese one (`ADDRESS_LABELS`, `addresses.label`)
 * and a form sends it; only what is printed changes.
 */
export const ADDRESS_LABEL_TEXT: Readonly<Record<AddressLabel, Pair>> = {
  "Nhà": { vi: "Nhà", en: "Home" },
  "Công ty": { vi: "Công ty", en: "Work" },
  "Khác": { vi: "Khác", en: "Other" },
};

/** An address's name as a screen prints it, in one language; one the app does not know is printed as stored. */
export function addressLabelText(label: string, locale: Locale = "vi"): string {
  const pair = (ADDRESS_LABEL_TEXT as Readonly<Record<string, Pair | undefined>>)[label];
  return pair ? pick(pair, locale) : label;
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
 * (`phoneDigits`: spaces, dots, dashes, +84), as the checkout does. In
 * English since round v6 slice E3a, the checkout's English where the checkout
 * asks the same (`feedFormErrors`).
 */
export function feedAddressErrors(d: AddressFields, locale: Locale = "vi"): Partial<Record<AddressField, string>> {
  const w = pickAll(ADDRESS_ERROR_TEXT, locale);
  const e: Partial<Record<AddressField, string>> = {};
  if (d.recipient.trim().length < 2) e.recipient = w.recipient;
  const phone = d.phone.trim();
  if (!phone) e.phone = w.phoneMissing;
  else if (!phoneDigits(phone)) e.phone = w.phoneShape;
  if (!d.provinceCode) e.province = w.province;
  else if (!d.wardCode) e.ward = w.ward;
  if (!d.street.trim()) e.street = w.street;
  return e;
}

/**
 * The address sheet's sentences in both languages; the province's and the
 * commune's also answer a code the server cannot find (`saveFeedAddress`).
 */
export const ADDRESS_ERROR_TEXT = {
  recipient: { vi: "Nhập tên người nhận", en: "Enter the recipient's name" },
  phoneMissing: { vi: "Nhập số điện thoại", en: "Enter a phone number" },
  phoneShape: { vi: "Số điện thoại gồm 10 số, bắt đầu bằng 0", en: "Phone numbers have 10 digits, starting with 0" },
  province: { vi: "Chọn tỉnh / thành", en: "Choose province / city" },
  ward: { vi: "Chọn phường / xã", en: "Choose ward / commune" },
  street: { vi: "Nhập số nhà, đường", en: "Enter house number and street" },
} as const satisfies Record<string, Pair>;

/**
 * What an address write answers when it did not happen, in a toast, in both
 * languages (round v6 slice E3a): the action words it in the request's
 * language, the sheet falls back on `notSaved`.
 */
export const ADDRESS_ANSWER_TEXT = {
  notSaved: { vi: "Chưa lưu được địa chỉ", en: "Couldn't save the address" },
  notRemoved: { vi: "Chưa xoá được địa chỉ", en: "Couldn't delete the address" },
  notDefault: { vi: "Chưa đặt được mặc định", en: "Couldn't set the default" },
  notFound: { vi: "Không tìm thấy địa chỉ này", en: "Couldn't find this address" },
  notRestored: { vi: "Chưa hoàn tác được", en: "Couldn't undo" },
} as const satisfies Record<string, Pair>;

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
 * code with its dash — and since slice B19 nothing else: the number never
 * rides in an address (`trackHref`); the form hands it to the lookup's page
 * itself. The sentences are the lookup's own (`LOOKUP_TEXT`), in both
 * languages since round v6 slice E2.
 */
export function lookupCheck(
  rawCode: string,
  rawPhone: string,
  locale: Locale = "vi",
): { ok: true; href: string } | { ok: false; errors: Partial<Record<LookupField, string>> } {
  const words = lookupWords(locale);
  const code = rawCode.trim().toUpperCase();
  const phone = rawPhone.trim();
  const errors: Partial<Record<LookupField, string>> = {};
  if (!code) errors.code = words.codeMissing;
  else if (!/^DH-?\d{3,6}$/.test(code)) errors.code = words.codeShape;
  const digits = phone.replace(/\D/g, "");
  if (!phone) errors.phone = words.phoneMissing;
  else if (!/^0\d{9}$/.test(digits)) errors.phone = words.phoneShape;
  if (errors.code || errors.phone) return { ok: false, errors };
  return { ok: true, href: trackHref(code) };
}
