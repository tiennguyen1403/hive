import { COLORS } from "@/data/colors";
import { customerById } from "@/data/customers";
import type { Catalog } from "./catalog";
import type { Drop, Order, OrderState, Product } from "@/data/types";
import {
  cellDelta,
  simOrders,
  type SimAction,
  type SimOverlay,
} from "./admin-sim";
import { orderItemsLabel } from "./admin-rows";
import { TRANSFER_HOLD_HOURS } from "./placed-order";
import { OVERDUE_REASON, effectiveStatus } from "./customer-orders";
import { clockLabel, dateTimeLabel, dayMonth } from "./datetime";
import { dropSummary } from "./inventory";
import { LEX, issueLabel } from "./lexicon";
import { vnd } from "./money";
import { orderTotalVnd } from "./orders";
import { STATE_LABEL } from "./order-labels";

/**
 * "Nhật ký thao tác" — the back office's own record, read out of the two
 * places the truth already lives.
 *
 * NOTHING IS STORED FOR THIS SCREEN. A log table would be a second copy of
 * the same facts, and a second copy is a copy that goes stale: the day a
 * button forgot to write its line, the log would quietly stop being the
 * record. So every row here is DERIVED —
 *
 *   · from `brand.adminSim`, which is already an event log (`lib/admin-sim.ts`);
 *   · from the fixtures themselves, for the things nobody pressed: a transfer
 *     that matched, an issue that opened on its own schedule, an unpaid order
 *     the twelve-hour clock cancelled.
 *
 * WHO is therefore a fact about where a row came from rather than a field:
 * "Cửa hàng" for a recorded action, "Khách" for the one a shopper takes from
 * their own order screen, "Hệ thống" for anything derived from the clock and
 * the data. The screen prints that distinction under the table, because "Hệ
 * thống" reading like a person is how somebody ends up looking for who did it.
 *
 * WHAT IS NOT HERE, and why. A code running out of uses ("Hết lượt") is a
 * STATE the promotions table already reports; `usedCount` is a stored figure
 * with no redemption behind it, so the hour it was reached exists nowhere and
 * printing one would be inventing a fact (DESIGN.md §9 rule 1). Same for the
 * hour an issue was created: the fixtures record when one OPENS, not when
 * somebody scheduled it, so only issues created in this browser carry a "Tạo
 * số" row.
 */

export type LogAuthor = "Cửa hàng" | "Khách" | "Hệ thống";

/** What the row is about — the filter menu's five choices, minus "Hệ thống". */
export type LogKind = "order" | "stock" | "promo" | "drop";

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

/** The order book, indexed once per call and handed down — no module state. */
type Book = Map<string, Order>;

function orderSubject(book: Book, code: string): { subject: string; href: string } {
  const name = customerById.get(book.get(code)?.customerId as never)?.name;
  return {
    subject: name ? `${code} · ${name}` : code,
    href: `/admin/orders/${code}`,
  };
}

/**
 * Every operation this browser can account for, newest first.
 *
 * `orders`, `drops` and `products` are passed in rather than imported so the
 * module stays pure and the test can feed it three rows instead of the whole
 * fixture set. The screen hands it `ORDERS` and the catalogue's own drops and
 * products — overlaid with whatever this browser adjusted.
 */
export function logRows(
  catalog: Catalog,
  overlay: SimOverlay,
  fixtures: { orders: Order[]; drops: readonly Drop[]; products: readonly Product[] },
  now: Date,
): LogRow[] {
  const book: Book = new Map(fixtures.orders.map((o) => [String(o.code), o]));
  const rows = [
    ...fromOverlay(catalog, overlay, book, fixtures.products),
    ...fromFixtures(catalog, overlay, book, fixtures, now),
  ];

  // Newest first, and ties broken on the id so two events stamped at the
  // same minute do not swap places between renders.
  return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id));
}

// ─────────────────────────────────────────────────────────── what was pressed
function fromOverlay(
  catalog: Catalog,
  overlay: SimOverlay,
  book: Book,
  products: readonly Product[],
): LogRow[] {
  /** The state each order was in as the log is replayed forward. */
  const state = new Map<string, OrderState>(
    [...book.values()].map((o) => [String(o.code), o.status.state]),
  );
  const rows: LogRow[] = [];

  overlay.actions.forEach((a, i) => {
    const row = overlayRow(catalog, a, `sim-${i}`, state, book, products);
    if (row) rows.push(row);
  });
  return rows;
}

function overlayRow(
  catalog: Catalog,
  a: SimAction,
  id: string,
  state: Map<string, OrderState>,
  book: Book,
  products: readonly Product[],
): LogRow | null {
  switch (a.kind) {
    case "ORDER_PAID": {
      const before = state.get(a.code);
      state.set(a.code, "PAID");
      return {
        id,
        at: a.at,
        kind: "order",
        author: "Cửa hàng",
        action: "Đã nhận tiền",
        detail: "đánh dấu tay",
        ...orderSubject(book, a.code),
        ...(before ? { before: stateWord(before) } : {}),
        after: stateWord("PAID"),
        ...totalTail(book, a.code),
      };
    }
    case "ORDER_SHIPPED": {
      const before = state.get(a.code);
      state.set(a.code, "SHIPPING");
      return {
        id,
        at: a.at,
        kind: "order",
        author: "Cửa hàng",
        action: "Bàn giao",
        ...orderSubject(book, a.code),
        ...(before ? { before: stateWord(before) } : {}),
        after: stateWord("SHIPPING"),
        tail: `${a.carrier} · ${a.trackingCode}`,
      };
    }
    case "ORDER_CANCELLED": {
      const before = state.get(a.code);
      state.set(a.code, "CANCELLED");
      return {
        id,
        at: a.at,
        kind: "order",
        author: "Cửa hàng",
        action: "Huỷ đơn",
        detail: a.reason.toLocaleLowerCase("vi"),
        ...orderSubject(book, a.code),
        ...(before ? { before: stateWord(before) } : {}),
        after: stateWord("CANCELLED"),
        ...backOnShelfTail(catalog, book, a.code),
      };
    }
    case "ORDER_CANCELLED_BY_CUSTOMER": {
      const before = state.get(a.code);
      state.set(a.code, "CANCELLED");
      return {
        id,
        at: a.at,
        kind: "order",
        author: "Khách",
        action: "Huỷ đơn",
        detail: "khách huỷ",
        ...orderSubject(book, a.code),
        ...(before ? { before: stateWord(before) } : {}),
        after: stateWord("CANCELLED"),
        ...backOnShelfTail(catalog, book, a.code),
      };
    }
    case "ORDER_NOTE":
      return {
        id,
        at: a.at,
        kind: "order",
        author: "Cửa hàng",
        action: "Ghi chú nội bộ",
        ...orderSubject(book, a.code),
        tail: `"${a.text}"`,
      };
    case "ORDER_ADDRESS_EDITED":
      return {
        id,
        at: a.at,
        kind: "order",
        author: "Cửa hàng",
        action: "Sửa địa chỉ giao",
        detail: "trước khi bàn giao",
        ...orderSubject(book, a.code),
        before: a.before.line,
        after: a.after.line,
        tail: `"${a.reason}"`,
      };
    case "ORDER_CONFIRMATION_RESENT":
      return {
        id,
        at: a.at,
        kind: "order",
        author: "Cửa hàng",
        action: "Gửi lại xác nhận",
        detail: "chưa có máy chủ gửi, chỉ ghi",
        ...orderSubject(book, a.code),
        tail: `tới ${a.email}`,
      };
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

function totalTail(book: Book, code: string): { tail?: string } {
  const order = book.get(code);
  return order ? { tail: vnd(orderTotalVnd(order)) } : {};
}

/**
 * "CÁT ×1" — what was in the box.
 *
 * NOT "CÁT ×1 về kệ", which is what the mock wrote. Stock in this build is a
 * fixture field, not something derived from the order book, so cancelling an
 * order moves nothing on the shelf — and a log line saying it did would send
 * the operator looking for a unit that is not there. Putting it back is its
 * own action ("Điều chỉnh tồn kho"), with its own row.
 */
function backOnShelfTail(catalog: Catalog, book: Book, code: string): { tail?: string } {
  const order = book.get(code);
  return order ? { tail: orderItemsLabel(catalog, order) } : {};
}

// ───────────────────────────────────────────── what the clock and the data did
function fromFixtures(
  catalog: Catalog,
  overlay: SimOverlay,
  book: Book,
  fixtures: { orders: Order[]; drops: readonly Drop[]; products: readonly Product[] },
  now: Date,
): LogRow[] {
  const rows: LogRow[] = [];

  for (const o of fixtures.orders) {
    const code = String(o.code);
    const subject = orderSubject(book, code);
    switch (o.status.state) {
      case "PAID":
        // Only a transfer MATCHES: a card or a COD order reaches PAID some
        // other way, and naming the wrong mechanism is worse than silence.
        if (o.payment === "BANK_TRANSFER") {
          rows.push({
            id: `fix-paid-${code}`,
            at: o.status.paidAt,
            kind: "order",
            author: "Hệ thống",
            action: "Khớp chuyển khoản",
            detail: "tự động theo nội dung",
            ...subject,
            before: stateWord("AWAITING_TRANSFER"),
            after: stateWord("PAID"),
            tail: vnd(orderTotalVnd(o)),
          });
        }
        break;
      case "SHIPPING":
        rows.push({
          id: `fix-ship-${code}`,
          at: o.status.shippedAt,
          kind: "order",
          author: "Cửa hàng",
          action: "Bàn giao",
          ...subject,
          before: stateWord("PAID"),
          after: stateWord("SHIPPING"),
          tail: o.status.trackingCode,
        });
        break;
      case "DELIVERED":
        rows.push({
          id: `fix-done-${code}`,
          at: o.status.deliveredAt,
          kind: "order",
          author: "Hệ thống",
          action: "Giao thành công",
          detail: "theo ghi nhận của đơn",
          ...subject,
          before: stateWord("SHIPPING"),
          after: stateWord("DELIVERED"),
        });
        break;
      case "CANCELLED":
        rows.push(
          cancelRow(catalog, book, `fix-cancel-${code}`, o, o.status.cancelledAt, o.status.reason),
        );
        break;
      default:
        break;
    }
  }

  // The twelve-hour clock, read over the orders AS THIS BROWSER HAS THEM: an
  // order marked paid here never reached its deadline, so it gets no row.
  for (const o of simOrders(fixtures.orders, overlay)) {
    if (o.status.state !== "AWAITING_TRANSFER") continue;
    const status = effectiveStatus(o, now);
    if (status.state !== "CANCELLED") continue;
    rows.push(cancelRow(catalog, book, `due-${o.code}`, o, status.cancelledAt, OVERDUE_REASON));
  }

  // An issue opens and closes on its own schedule. Both instants are stored
  // facts, so both are real events; nothing else about an issue is.
  for (const d of fixtures.drops) {
    const summary = dropSummary(catalog, d.no, fixtures.products);
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

  return rows;
}

function cancelRow(
  catalog: Catalog,
  book: Book,
  id: string,
  o: Order,
  at: string,
  reason: string,
): LogRow {
  const overdue = reason.toLocaleLowerCase("vi") === OVERDUE_REASON;
  return {
    id,
    at,
    kind: "order",
    // Nobody pressed anything when the deadline passed. Any other reason was
    // a decision somebody made, whether or not this browser recorded it.
    author: overdue ? "Hệ thống" : "Cửa hàng",
    action: "Huỷ đơn",
    detail: overdue
      ? `quá ${TRANSFER_HOLD_HOURS} giờ chưa chuyển khoản`
      : reason.toLocaleLowerCase("vi"),
    ...orderSubject(book, String(o.code)),
    before: stateWord(overdue ? "AWAITING_TRANSFER" : o.status.state),
    after: stateWord("CANCELLED"),
    tail: orderItemsLabel(catalog, o),
  };
}

// ────────────────────────────────────────────────────────────────── filtering
/** The filter menu. "Hệ thống" asks about the HAND, not about the object. */
export type LogFilter = "all" | LogKind | "system";

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
