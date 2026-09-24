import { COLORS } from "@/data/colors";
import {
  FAMILY_LABELS,
  type ColorKey,
  type Drop,
  type OrderState,
  type PaymentMethod,
  type Product,
} from "@/data/types";
import type { AdminOrder } from "./admin-orders";
import { orderItemsLabel } from "./admin-rows";
import type { Catalog } from "./catalog";
import type { PromoTerms } from "./catalog-admin";
import { effectiveStatus } from "./customer-orders";
import { clockLabel, dateTimeLabel, dayMonth } from "./datetime";
import type { AdminEvent, ProductFields } from "./db/event-dto";
import { dropSummary } from "./inventory";
import { RESTOCK_REASON } from "./inventory-adjust";
import { LEX, issueLabel, styleName } from "./lexicon";
import { vnd } from "./money";
import { isUploadedKey } from "./photos";
import { TRANSFER_HOLD_HOURS, orderTotalVnd } from "./orders";
import { STATE_LABEL } from "./order-labels";

/**
 * "Nhật ký thao tác" — the back office's record, read out of the places the
 * truth lives.
 *
 * THE RECORD IS A TABLE. Every order move — placed, paid, handed over,
 * delivered, cancelled by the shop, by the shopper or by the twelve-hour
 * clock, a note, a new address (slice B3a) — every move on the catalogue — a
 * shelf adjusted, a style edited, an issue created or rescheduled, a teaser,
 * a code created, edited, paused, raised or ended (slice B3b), a style
 * created, a colour's photo swapped, a band reordered (slice B3c) — and every
 * reset writes a row of `public.events` in the same transaction as the change
 * itself, and `reset_demo()` writes the sample's own history in by the rules
 * this module used to derive it with. So `logRows` reads events and states
 * nothing it could not point at a row for.
 *
 * One thing is still derived here, and says so: WHAT THE CLOCK DECIDED before
 * anybody wrote it down. A transfer whose hold ran out is cancelled on every
 * screen the moment it runs out (`effectiveStatus`), but the sweep that
 * writes `ORDER_EXPIRED` runs at the next order or the daily health check.
 * Until then this module reads it off the order, so the log never disagrees
 * with the table beside it; once swept, the event takes the row's place. An
 * issue opening and closing on its schedule is the same kind of fact
 * (`scheduleRows`).
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
  /** "DH-2431 · Nguyễn Khả Vy" / "S05 – BỤI · Đen · L" / "Số 06". */
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

/**
 * A style as the back office names it — "S05 – KHÓI", a fixed style's bare
 * name (v3 slice 12) — read from the catalogue by id. A style the catalogue
 * no longer has is named by what the event kept, else by its id.
 */
function styleOf(
  catalog: Catalog,
  id: string,
  kept?: { name?: string; dropNo?: number | null },
): string {
  const p = catalog.byId.get(id as Product["id"]);
  if (p) return styleName(p.name, p.dropNo);
  if (kept?.name) return kept.dropNo === undefined ? kept.name : styleName(kept.name, kept.dropNo);
  return id;
}

/** "S05 – CÁT ×1" — what was in the box. */
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

/** What a style edit changed, field by field, as the log names each field. */
const PRODUCT_FIELD_LABEL: Record<keyof ProductFields, string> = {
  name: "tên",
  kind: "loại",
  family: "nhóm",
  slug: "mã địa chỉ",
  priceVnd: "giá",
  material: "chất liệu",
  fit: "form",
  dropNo: "số",
};

/** One field's value as a sentence prints it. */
function fieldValue(key: keyof ProductFields, fields: ProductFields): string {
  switch (key) {
    case "priceVnd":
      return fields.priceVnd === undefined ? "" : vnd(fields.priceVnd);
    case "family":
      return fields.family ? FAMILY_LABELS[fields.family] : "";
    case "fit":
      return fields.fit === "OVERSIZE" ? "oversize" : fields.fit === "REGULAR" ? "regular" : "";
    case "dropNo":
      return fields.dropNo === undefined ? "" : issueLabel(fields.dropNo);
    default:
      return fields[key] ?? "";
  }
}

/** "20:00 11/09 → 20:00 25/09" — a code's run. */
function termsWindow(t: PromoTerms): string {
  return `${dateTimeLabel(t.startsAt)} → ${dateTimeLabel(t.endsAt)}`;
}

/** What kind of photo a key is, the way the product form labels it. */
function photoWord(key: string): string {
  return isUploadedKey(key) ? "ảnh thật" : "ảnh mượn";
}

/** "Đen · Kem" — a band order. */
function band(colors: readonly ColorKey[]): string {
  return colors.map((c) => COLORS[c].label).join(" · ");
}

/** "1 ảnh tải lên · 2 ảnh mượn" — where a new style's photos came from. */
function photoSources(uploaded: number, borrowed: number): string {
  return [
    uploaded > 0 ? `${uploaded} ảnh tải lên` : "",
    borrowed > 0 ? `${borrowed} ảnh mượn` : "",
  ]
    .filter(Boolean)
    .join(" · ");
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

    // ── the catalogue (slice B3b) — the same sentences the simulation said
    case "INVENTORY_ADJUSTED": {
      const one = e.cells.length === 1 ? e.cells[0] : undefined;
      const name = styleOf(catalog, e.productId);
      // v3 slice 12: pieces brought back onto a fixed style read as that —
      // "Nhập thêm", the style, and how many went on the shelf.
      if (e.reason === RESTOCK_REASON) {
        return {
          id,
          at: e.at,
          kind: "stock",
          author,
          action: RESTOCK_REASON,
          subject: one
            ? `${name} · ${COLORS[one.color].label} · ${one.size}`
            : `${name} · ${e.cells.length} ô`,
          href: `/admin/products/${e.productId}`,
          ...(one ? { before: String(one.before), after: String(one.after) } : {}),
          tail: [`+${e.delta} chiếc`, e.note.trim() ? `"${e.note.trim()}"` : ""]
            .filter(Boolean)
            .join(" · "),
        };
      }
      return {
        id,
        at: e.at,
        kind: "stock",
        author,
        action: "Điều chỉnh tồn kho",
        detail: `lý do: ${e.reason.toLocaleLowerCase("vi")}`,
        subject: one
          ? `${name} · ${COLORS[one.color].label} · ${one.size}`
          : `${name} · ${e.cells.length} ô`,
        href: `/admin/products/${e.productId}`,
        ...(one ? { before: String(one.before), after: String(one.after) } : {}),
        tail: [
          one ? "" : `${e.delta > 0 ? "+" : ""}${e.delta} chiếc`,
          e.ref.trim() ? `tham chiếu ${e.ref.trim()}` : "",
          e.note.trim() ? `"${e.note.trim()}"` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }
    case "PRODUCT_EDITED": {
      // One field: its before and after. Several: each one, in the tail.
      const keys = (Object.keys(e.after) as Array<keyof ProductFields>).filter(
        (k) => k in PRODUCT_FIELD_LABEL,
      );
      const name = styleOf(catalog, e.productId, { name: e.after.name });
      const only = keys.length === 1 ? keys[0] : undefined;
      return {
        id,
        at: e.at,
        kind: "stock",
        author,
        action: "Sửa mẫu",
        detail: keys.map((k) => PRODUCT_FIELD_LABEL[k]).join(", "),
        subject: name,
        href: `/admin/products/${e.productId}`,
        ...(only
          ? { before: fieldValue(only, e.before), after: fieldValue(only, e.after) }
          : {
              tail: keys
                .map((k) => `${PRODUCT_FIELD_LABEL[k]} ${fieldValue(k, e.before)} → ${fieldValue(k, e.after)}`)
                .join(" · "),
            }),
      };
    }
    // ── a style's own shape (slice B3c): created, a photo, the band order
    case "PRODUCT_ADDED": {
      const sources = photoSources(e.uploaded, e.borrowed);
      return {
        id,
        at: e.at,
        kind: "stock",
        author,
        action: "Thêm mẫu",
        ...(sources ? { detail: sources } : {}),
        subject: styleOf(catalog, e.productId, { name: e.name, dropNo: e.dropNo }),
        href: `/admin/products/${e.productId}`,
        // A fixed style (slice B5) was created for no issue and cut nothing.
        tail:
          e.dropNo === null || e.cutUnits === null
            ? `${e.colors.length} màu`
            : `${issueLabel(e.dropNo)} · ${e.colors.length} màu · ${e.cutUnits} chiếc`,
      };
    }
    case "PRODUCT_PHOTO_SET":
      return {
        id,
        at: e.at,
        kind: "stock",
        author,
        action: `Thay ảnh ${COLORS[e.color].label}`,
        subject: styleOf(catalog, e.productId),
        href: `/admin/products/${e.productId}`,
        before: photoWord(e.before),
        after: photoWord(e.after),
      };
    case "PRODUCT_COLORS_REORDERED":
      return {
        id,
        at: e.at,
        kind: "stock",
        author,
        action: "Đổi thứ tự màu",
        subject: styleOf(catalog, e.productId),
        href: `/admin/products/${e.productId}`,
        before: band(e.before),
        after: band(e.after),
      };
    case "PROMO_ADDED":
      return {
        id,
        at: e.at,
        kind: "promo",
        author,
        action: "Tạo mã",
        subject: e.promoCode,
        href: "/admin/promotions",
        tail: termsWindow(e.terms),
      };
    case "PROMO_EDITED":
      return {
        id,
        at: e.at,
        kind: "promo",
        author,
        action: "Sửa mã",
        subject: e.promoCode,
        href: "/admin/promotions",
        tail: termsWindow(e.after),
      };
    case "PROMO_LIMIT_RAISED":
      return {
        id,
        at: e.at,
        kind: "promo",
        author,
        action: "Nâng giới hạn",
        subject: e.promoCode,
        href: "/admin/promotions",
        before: e.before === null ? "không giới hạn" : `${e.before} lượt`,
        after: `${e.after} lượt`,
      };
    case "PROMO_PAUSED":
      return {
        id,
        at: e.at,
        kind: "promo",
        author,
        action: e.paused ? "Tạm dừng mã" : "Tiếp tục mã",
        subject: e.promoCode,
        href: "/admin/promotions",
        before: e.paused ? "đang chạy" : "tạm dừng",
        after: e.paused ? "tạm dừng" : "đang chạy",
        tail: e.paused
          ? "trang thanh toán từ chối từ giờ"
          : "trang thanh toán nhận lại từ giờ",
      };
    case "PROMO_ENDED":
      return {
        id,
        at: e.at,
        kind: "promo",
        author,
        action: "Kết thúc sớm",
        subject: e.promoCode,
        href: "/admin/promotions",
        before: dateTimeLabel(e.before),
        after: dateTimeLabel(e.after),
        tail: "giờ kết thúc = bây giờ",
      };
    case "DROP_ADDED":
      return {
        id,
        at: e.at,
        kind: "drop",
        author,
        action: "Tạo số",
        subject: issueLabel(e.no),
        href: `/admin/drops/${String(e.no).padStart(2, "0")}`,
        tail: `mở ${dateTimeLabel(e.opensAt)} → đóng ${dateTimeLabel(e.closesAt)}`,
      };
    case "DROP_SCHEDULED": {
      // Closing early IS the closing hour moved to now, so the two are one
      // action and the log tells them apart by how far apart the two
      // instants are rather than by a flag nobody could derive.
      const early = Math.abs(Date.parse(e.after.closesAt) - Date.parse(e.at)) < 60_000;
      return {
        id,
        at: e.at,
        kind: "drop",
        author,
        action: early ? "Đóng sớm" : "Sửa giờ",
        ...(early ? { detail: "giờ đóng đổi thành bây giờ" } : {}),
        subject: issueLabel(e.no),
        href: `/admin/drops/${String(e.no).padStart(2, "0")}`,
        before: dateTimeLabel(e.before.closesAt),
        after: dateTimeLabel(e.after.closesAt),
        ...(early ? {} : { tail: `mở ${dateTimeLabel(e.after.opensAt)}` }),
      };
    }
    case "TEASER_ADDED":
      return {
        id,
        at: e.at,
        kind: "drop",
        author,
        action: "Thêm mẫu hé lộ",
        subject: issueLabel(e.no),
        href: `/admin/drops/${String(e.no).padStart(2, "0")}`,
        tail: `${styleName(e.name, e.no)} · ${e.garment}`,
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
