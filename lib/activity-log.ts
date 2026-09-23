import { COLORS } from "@/data/colors";
import type { Drop, OrderState, PaymentMethod, Product } from "@/data/types";
import type { AdminOrder } from "./admin-orders";
import { cellDelta, type SimAction, type SimOverlay } from "./admin-sim";
import { orderItemsLabel } from "./admin-rows";
import type { Catalog } from "./catalog";
import { effectiveStatus } from "./customer-orders";
import { clockLabel, dateTimeLabel, dayMonth } from "./datetime";
import type { AdminEvent } from "./db/event-dto";
import { dropSummary } from "./inventory";
import { LEX, issueLabel } from "./lexicon";
import { vnd } from "./money";
import { TRANSFER_HOLD_HOURS, orderTotalVnd } from "./orders";
import { STATE_LABEL } from "./order-labels";

/**
 * "Nhật ký thao tác" — the back office's record, read out of the places the
 * truth lives.
 *
 * SINCE SLICE B3A THE RECORD IS A TABLE. Every order move — placed, paid,
 * handed over, delivered, cancelled by the shop, by the shopper or by the
 * twelve-hour clock, a note, a new address — and every reset writes a row of
 * `public.events` in the same transaction as the change itself, and
 * `reset_demo()` writes the sample's own history in by the rules this module
 * used to derive it with. So `logRows` reads events and states nothing it
 * could not point at a row for.
 *
 * Two things are still derived here, and say so:
 *
 *   · WHAT THE CLOCK DECIDED before anybody wrote it down. A transfer whose
 *     hold ran out is cancelled on every screen the moment it runs out
 *     (`effectiveStatus`), but the sweep that writes `ORDER_EXPIRED` runs at
 *     the next order or the daily health check. Until then this module reads
 *     it off the order, so the log never disagrees with the table beside it;
 *     once swept, the event takes the row's place. An issue opening and
 *     closing on its schedule is the same kind of fact (`scheduleRows`).
 *   · WHAT IS STILL SIMULATED. Stock adjustments, issues, teasers and codes
 *     move to Postgres in slice B3b; until then they live in this browser
 *     (`lib/admin-sim.ts`) and `simLogRows` reads them from there, so the
 *     "ghi nhật ký" their buttons promise stays true.
 *
 * WHO is "Cửa hàng" for the manager's hand, "Khách" for the shopper's, and
 * "Hệ thống" for the clock and for a reset a script ran. The screen prints
 * that under the table, because "Hệ thống" reading like a person is how
 * somebody ends up looking for who did it.
 *
 * WHAT IS NOT HERE, and why. A code running out of uses ("Hết lượt") is a
 * STATE the promotions table already reports; `usedCount` is a stored figure
 * with no redemption behind it, so the hour it was reached exists nowhere and
 * printing one would be inventing a fact (DESIGN.md §9 rule 1).
 */

export type LogAuthor = "Cửa hàng" | "Khách" | "Hệ thống";

/** What the row is about — the filter menu's choices, plus the demo's own reset. */
export type LogKind = "order" | "stock" | "promo" | "drop" | "demo";

export interface LogRow {
  /** Stable across renders so React can key on it. */
  id: string;
  at: string;
  kind: LogKind;
  author: LogAuthor;
  /** Shown bold: "Đã nhận tiền". */
  action: string;
  /** The quiet line under it: "đánh dấu tay". */
  detail?: string;
  /** "DH-2431 · Nguyễn Khả Vy" / "BỤI · Đen · L" / "Số 06". */
  subject: string;
  /** Where the subject leads, when it leads anywhere. */
  href?: string;
  /** Left of the arrow. Absent when the change has no "before". */
  before?: string;
  /** Right of the arrow, shown bold. Absent when nothing changed state. */
  after?: string;
  /** Everything after the change: an amount, a reference, a quote. */
  tail?: string;
}

/** `"18:52 · 20/09"` — the clock first, because the log is read down. */
export function logStamp(iso: string): string {
  return `${clockLabel(iso)} · ${dayMonth(iso)}`;
}

/** What a state is called in a sentence: "chờ chuyển khoản". */
function stateWord(state: OrderState): string {
  return STATE_LABEL[state].text.toLocaleLowerCase("vi");
}

const AUTHOR: Record<AdminEvent["actorRole"], LogAuthor> = {
  admin: "Cửa hàng",
  customer: "Khách",
  system: "Hệ thống",
};

/** How an order is being paid, mid-sentence. */
const PAYMENT_WORD: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "chuyển khoản",
  CARD: "thẻ",
  COD: "COD",
};

/** The order book, indexed once per call and handed down — no module state. */
type Book = Map<string, AdminOrder>;

function orderSubject(book: Book, code: string): { subject: string; href: string } {
  const name = book.get(code)?.owner?.name;
  return {
    subject: name ? `${code} · ${name}` : code,
    href: `/admin/orders/${code}`,
  };
}

function totalTail(book: Book, code: string): { tail?: string } {
  const order = book.get(code);
  return order ? { tail: vnd(orderTotalVnd(order)) } : {};
}

/** "CÁT ×1" — what was in the box. */
function itemsTail(catalog: Catalog, book: Book, code: string): { tail?: string } {
  const order = book.get(code);
  return order ? { tail: orderItemsLabel(catalog, order) } : {};
}

/** Newest first, ties on the id — larger first, which is the later one. */
function byNewest(a: LogRow, b: LogRow): number {
  return Date.parse(b.at) - Date.parse(a.at) || b.id.localeCompare(a.id);
}

/** Several lists of rows as one, newest first. */
export function mergeLogRows(...lists: LogRow[][]): LogRow[] {
  return lists.flat().sort(byNewest);
}

// ───────────────────────────────────────────────────────── what was recorded
/**
 * Every recorded event, plus the holds the clock has let go of that the sweep
 * has not written down yet, newest first.
 *
 * `orders` is the book as the database has it (`admin_orders()`); it names
 * the customer, prices the payment and lists what was in the box. `now`
 * decides which unswept holds have already run out.
 */
export function logRows(
  catalog: Catalog,
  events: AdminEvent[],
  orders: AdminOrder[],
  now: Date,
): LogRow[] {
  const book: Book = new Map(orders.map((o) => [String(o.code), o]));
  const rows = events.map((e) => eventRow(catalog, book, e));

  // The twelve-hour clock, read over the orders the database still has as
  // waiting: past the deadline they are cancelled on every screen already.
  for (const o of orders) {
    if (o.status.state !== "AWAITING_TRANSFER") continue;
    const status = effectiveStatus(o, now);
    if (status.state !== "CANCELLED") continue;
    rows.push(expiredRow(catalog, book, `due-${o.code}`, String(o.code), status.cancelledAt));
  }

  return rows.sort(byNewest);
}

/** The row id of an event: padded, so a later one sorts after an earlier one. */
const eventId = (id: number) => `ev-${String(id).padStart(12, "0")}`;

function expiredRow(catalog: Catalog, book: Book, id: string, code: string, at: string): LogRow {
  return {
    id,
    at,
    kind: "order",
    author: "Hệ thống",
    action: "Huỷ đơn",
    detail: `quá ${TRANSFER_HOLD_HOURS} giờ chưa chuyển khoản`,
    ...orderSubject(book, code),
    before: stateWord("AWAITING_TRANSFER"),
    after: stateWord("CANCELLED"),
    ...itemsTail(catalog, book, code),
  };
}

function eventRow(catalog: Catalog, book: Book, e: AdminEvent): LogRow {
  const id = eventId(e.id);
  const author = AUTHOR[e.actorRole];
  const from = (s: OrderState | undefined) => (s ? { before: stateWord(s) } : {});

  switch (e.kind) {
    case "ORDER_PLACED": {
      const payment = book.get(e.code)?.payment;
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        action: "Đặt đơn",
        ...(payment ? { detail: PAYMENT_WORD[payment] } : {}),
        ...orderSubject(book, e.code),
        ...(payment
          ? { after: stateWord(payment === "BANK_TRANSFER" ? "AWAITING_TRANSFER" : "RECEIVED") }
          : {}),
        ...totalTail(book, e.code),
      };
    }
    case "ORDER_PAID":
      // Only a transfer MATCHES, and only the system matches one: the
      // sample's history says so. A payment the manager confirms is a hand.
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        ...(e.actorRole === "system"
          ? { action: "Khớp chuyển khoản", detail: "tự động theo nội dung" }
          : { action: "Đã nhận tiền", detail: "đánh dấu tay" }),
        ...orderSubject(book, e.code),
        ...from(e.from),
        after: stateWord("PAID"),
        ...totalTail(book, e.code),
      };
    case "ORDER_SHIPPED":
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        action: "Bàn giao",
        ...orderSubject(book, e.code),
        ...from(e.from),
        after: stateWord("SHIPPING"),
        tail: e.carrier ? `${e.carrier} · ${e.trackingCode}` : e.trackingCode,
      };
    case "ORDER_DELIVERED":
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        action: "Giao thành công",
        detail: e.actorRole === "system" ? "theo ghi nhận của đơn" : "đánh dấu tay",
        ...orderSubject(book, e.code),
        before: stateWord("SHIPPING"),
        after: stateWord("DELIVERED"),
      };
    case "ORDER_CANCELLED":
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        action: "Huỷ đơn",
        detail: e.reason.toLocaleLowerCase("vi"),
        ...orderSubject(book, e.code),
        ...from(e.from),
        after: stateWord("CANCELLED"),
        ...itemsTail(catalog, book, e.code),
      };
    case "ORDER_CANCELLED_BY_CUSTOMER":
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        action: "Huỷ đơn",
        detail: "khách huỷ",
        ...orderSubject(book, e.code),
        ...from(e.from),
        after: stateWord("CANCELLED"),
        ...itemsTail(catalog, book, e.code),
      };
    case "ORDER_EXPIRED":
      return { ...expiredRow(catalog, book, id, e.code, e.at), author };
    case "ORDER_NOTE":
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        action: "Ghi chú nội bộ",
        ...orderSubject(book, e.code),
        tail: `"${e.text}"`,
      };
    case "ORDER_ADDRESS_EDITED":
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        action: "Sửa địa chỉ giao",
        detail: "trước khi bàn giao",
        ...orderSubject(book, e.code),
        before: e.before.line,
        after: e.after.line,
        tail: `"${e.reason}"`,
      };
    case "DEMO_RESET":
      return {
        id,
        at: e.at,
        kind: "demo",
        author,
        action: "Đặt lại dữ liệu mẫu",
        detail: `neo ${logStamp(e.anchor)}`,
        subject: "Dữ liệu mẫu",
      };
  }
}

// ─────────────────────────────────────────────────── what is still simulated
/**
 * The actions this browser recorded on what is still simulated — stock,
 * issues, teasers, codes — newest first. Slice B3b turns each kind into an
 * event and this function goes; until then these rows are what makes the
 * "ghi nhật ký" on those buttons true.
 */
export function simLogRows(
  catalog: Catalog,
  overlay: SimOverlay,
  products: readonly Product[],
): LogRow[] {
  return overlay.actions
    .map((a, i) => simRow(a, `sim-${String(i).padStart(6, "0")}`, products))
    .sort(byNewest);
}

function simRow(a: SimAction, id: string, products: readonly Product[]): LogRow {
  switch (a.kind) {
    case "INVENTORY_ADJUSTED": {
      const product = products.find((p) => String(p.id) === a.productId);
      const one = a.cells.length === 1 ? a.cells[0] : undefined;
      const name = product?.name ?? a.productId;
      const delta = cellDelta(a.cells);
      return {
        id,
        at: a.at,
        kind: "stock",
        author: "Cửa hàng",
        action: "Điều chỉnh tồn kho",
        detail: `lý do: ${a.reason.toLocaleLowerCase("vi")}`,
        subject: one
          ? `${name} · ${COLORS[one.color].label} · ${one.size}`
          : `${name} · ${a.cells.length} ô`,
        ...(product ? { href: `/admin/products/${product.id}` } : {}),
        ...(one ? { before: String(one.before), after: String(one.after) } : {}),
        tail: [
          one ? "" : `${delta > 0 ? "+" : ""}${delta} chiếc`,
          a.ref.trim() ? `tham chiếu ${a.ref.trim()}` : "",
          a.note.trim() ? `"${a.note.trim()}"` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }
    case "PROMO_ADDED":
      return {
        id,
        at: a.at,
        kind: "promo",
        author: "Cửa hàng",
        action: "Tạo mã",
        subject: a.code,
        href: "/admin/promotions",
        tail: `${dateTimeLabel(a.startsAt)} → ${dateTimeLabel(a.endsAt)}`,
      };
    case "PROMO_EDITED":
      return {
        id,
        at: a.at,
        kind: "promo",
        author: "Cửa hàng",
        action: a.nextCode === a.code ? "Sửa mã" : "Nhân bản mã",
        subject: a.code,
        href: "/admin/promotions",
        ...(a.nextCode === a.code ? {} : { before: a.code, after: a.nextCode }),
        tail: `${dateTimeLabel(a.startsAt)} → ${dateTimeLabel(a.endsAt)}`,
      };
    case "PROMO_LIMIT_RAISED":
      return {
        id,
        at: a.at,
        kind: "promo",
        author: "Cửa hàng",
        action: "Nâng giới hạn",
        subject: a.code,
        href: "/admin/promotions",
        before: `${a.before} lượt`,
        after: `${a.after} lượt`,
      };
    case "PROMO_PAUSED":
      return {
        id,
        at: a.at,
        kind: "promo",
        author: "Cửa hàng",
        action: a.paused ? "Tạm dừng mã" : "Tiếp tục mã",
        subject: a.code,
        href: "/admin/promotions",
        before: a.paused ? "đang chạy" : "tạm dừng",
        after: a.paused ? "tạm dừng" : "đang chạy",
        tail: a.paused
          ? "trang thanh toán từ chối từ giờ"
          : "trang thanh toán nhận lại từ giờ",
      };
    case "PROMO_ENDED":
      return {
        id,
        at: a.at,
        kind: "promo",
        author: "Cửa hàng",
        action: "Kết thúc sớm",
        subject: a.code,
        href: "/admin/promotions",
        after: dateTimeLabel(a.endsAt),
        tail: "giờ kết thúc = bây giờ",
      };
    case "DROP_ADDED":
      return {
        id,
        at: a.at,
        kind: "drop",
        author: "Cửa hàng",
        action: "Tạo số",
        subject: issueLabel(a.no),
        href: `/admin/drops/${String(a.no).padStart(2, "0")}`,
        tail: `mở ${dateTimeLabel(a.opensAt)} → đóng ${dateTimeLabel(a.closesAt)}`,
      };
    case "DROP_SCHEDULED": {
      // Closing early IS the closing hour moved to now, so the two are one
      // action and the log tells them apart by how far apart the two
      // instants are rather than by a flag nobody could derive.
      const early = Math.abs(Date.parse(a.closesAt) - Date.parse(a.at)) < 60_000;
      return {
        id,
        at: a.at,
        kind: "drop",
        author: "Cửa hàng",
        action: early ? "Đóng sớm" : "Sửa giờ",
        ...(early ? { detail: "giờ đóng đổi thành bây giờ" } : {}),
        subject: issueLabel(a.no),
        href: `/admin/drops/${String(a.no).padStart(2, "0")}`,
        after: dateTimeLabel(a.closesAt),
        ...(early ? {} : { tail: `mở ${dateTimeLabel(a.opensAt)}` }),
      };
    }
    case "TEASER_ADDED":
      return {
        id,
        at: a.at,
        kind: "drop",
        author: "Cửa hàng",
        action: "Thêm mẫu hé lộ",
        subject: issueLabel(a.no),
        href: `/admin/drops/${String(a.no).padStart(2, "0")}`,
        tail: `${a.name} · ${a.garment}`,
      };
  }
}

// ─────────────────────────────────────────────── what the schedule did
/**
 * An issue opens and closes on its own schedule. Both instants are stored
 * facts, so both are real events; nothing else about an issue is. Read at
 * `now`, so an issue that has not opened yet has no row.
 */
export function scheduleRows(
  catalog: Catalog,
  drops: readonly Drop[],
  products: readonly Product[],
  now: Date,
): LogRow[] {
  const rows: LogRow[] = [];
  for (const d of drops) {
    const summary = dropSummary(catalog, d.no, products);
    const href = `/admin/drops/${String(d.no).padStart(2, "0")}`;
    if (Date.parse(d.opensAt) <= now.getTime()) {
      rows.push({
        id: `open-${d.no}`,
        at: d.opensAt,
        kind: "drop",
        author: "Hệ thống",
        action: "Mở số",
        detail: "theo giờ mở đã đặt",
        subject: issueLabel(d.no),
        href,
        tail: `${summary.styles} mẫu · ${summary.cutUnits} chiếc đã cắt`,
      });
    }
    if (Date.parse(d.closesAt) <= now.getTime()) {
      rows.push({
        id: `close-${d.no}`,
        at: d.closesAt,
        kind: "drop",
        author: "Hệ thống",
        action: "Đóng số",
        detail: "theo giờ đóng đã đặt",
        subject: issueLabel(d.no),
        href,
        tail: `${summary.soldUnits} / ${summary.cutUnits} đã bán · còn ${summary.onHand}`,
      });
    }
  }
  return rows.sort(byNewest);
}

// ────────────────────────────────────────────────────────────────── filtering
/** The filter menu. "Hệ thống" asks about the HAND, not about the object. */
export type LogFilter = "all" | Exclude<LogKind, "demo"> | "system";

export const LOG_FILTERS: Array<{ value: LogFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "order", label: "Đơn hàng" },
  { value: "stock", label: "Tồn kho" },
  { value: "promo", label: "Mã giảm giá" },
  { value: "drop", label: LEX.t },
  { value: "system", label: "Hệ thống" },
];

export function inFilter(filter: LogFilter, row: LogRow): boolean {
  if (filter === "all") return true;
  if (filter === "system") return row.author === "Hệ thống";
  return row.kind === filter;
}

/** `?kind=` from the URL, or "all". An unlisted value is not honoured. */
export function logFilter(raw: string | string[] | undefined): LogFilter {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return LOG_FILTERS.some((f) => f.value === v) ? (v as LogFilter) : "all";
}

/** Rows stamped inside the last `days` days, counted back from `now`. */
export function withinDays(rows: LogRow[], days: number, now: Date): LogRow[] {
  const from = now.getTime() - days * 86_400_000;
  return rows.filter((r) => Date.parse(r.at) >= from);
}

/** Everything the row says, in one string — the search box reads this. */
export function logHaystack(row: LogRow): string {
  return [row.action, row.detail, row.subject, row.before, row.after, row.tail]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("vi");
}

/** "chờ chuyển khoản → đã thanh toán · 400.000₫", as one line of text. */
export function diffText(row: LogRow): string {
  const arrow = row.before && row.after ? `${row.before} → ${row.after}` : (row.after ?? "");
  return [arrow, row.tail].filter(Boolean).join(" · ");
}
