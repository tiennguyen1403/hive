import { COLORS, colorLabel } from "@/data/colors";
import {
  FAMILY_LABELS,
  familyLabel,
  type ColorKey,
  type Drop,
  type OrderState,
  type PaymentMethod,
  type Product,
} from "@/data/types";
import type { AdminOrder } from "./admin-orders";
import { orderItemsLabel } from "./admin-rows";
import { joinPhrases, phrase, plainText, stored, type Phrase, type Stored } from "./admin-text";
import { carrierPiece } from "./carrier";
import type { Catalog } from "./catalog";
import type { PromoTerms } from "./catalog-admin";
import { fitLabel } from "./catalog-query";
import { effectiveStatus } from "./customer-orders";
import { clockLabel, dateTimeLabel, dayMonth } from "./datetime";
import type { AdminEvent, ProductFields } from "./db/event-dto";
import { cancelReasonLabel } from "./feed-account";
import { pick, picker, plural, type Locale, type Pair } from "./i18n";
import { dropSummary } from "./inventory";
import { RESTOCK_REASON, isKnownStockReason, stockReasonLabel } from "./inventory-adjust";
import { LEX, issueLabel, lexicon, styleName, stylePrefix } from "./lexicon";
import { vnd } from "./money";
import { isRealPhotoKey } from "./photos";
import { productText } from "./product-text";
import { TRANSFER_HOLD_HOURS, orderTotalVnd, paysByTransfer } from "./orders";
import { STATE_LABEL, stateLabel } from "./order-labels";

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
 *
 * IN BOTH LANGUAGES since round v6 slice E4. The events table keeps a `kind`
 * and the values of the move, and every sentence is built here, so the log is
 * translated in code: each sentence below is a `{ vi, en }` pair, the
 * Vietnamese side the words the log has always said. A value the move kept as
 * somebody typed it — a note, the reason an address changed, a style's name at
 * that moment, a teaser's garment — is printed as stored, and on an English
 * page marked `lang="vi"` when it is Vietnamese (a `Phrase`,
 * `lib/admin-text.ts`). A reason, a carrier or a stock reason the app itself
 * offers goes through its English table (`cancelReasonLabel`, `carrierLabel`,
 * `stockReasonLabel`). The hand ("Ai") stays a Vietnamese key, which the
 * filter reads; the screen names it with `logAuthorLabel`.
 */

export type LogAuthor = "Cửa hàng" | "Khách" | "Hệ thống";

/** The three hands in both languages: "Shop", "Customer", "System". */
const AUTHOR_LABEL: Readonly<Record<LogAuthor, Pair>> = {
  "Cửa hàng": { vi: "Cửa hàng", en: "Shop" },
  "Khách": { vi: "Khách", en: "Customer" },
  "Hệ thống": { vi: "Hệ thống", en: "System" },
};

/** The hand, as the "Ai" column prints it in one language. */
export function logAuthorLabel(author: LogAuthor, locale: Locale = "vi"): string {
  return pick(AUTHOR_LABEL[author], locale);
}

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
  detail?: Phrase;
  /** "DH-2431 · Nguyễn Khả Vy" / "S05 – BỤI · Đen · L" / "Số 06". */
  subject: Phrase;
  /** Where the subject leads, when it leads anywhere. */
  href?: string;
  /** Left of the arrow. Absent when the change has no "before". */
  before?: Phrase;
  /** Right of the arrow, shown bold. Absent when nothing changed state. */
  after?: Phrase;
  /** Everything after the change: an amount, a reference, a quote. */
  tail?: Phrase;
}

/** `"18:52 · 20/09"` — the clock first, because the log is read down. In English `"18:52 · 20 Sep"`. */
export function logStamp(iso: string, locale: Locale = "vi"): string {
  return `${clockLabel(iso)} · ${dayMonth(iso, locale)}`;
}

/** What a state is called in a sentence: "chờ chuyển khoản"; in English "awaiting transfer". */
function stateWord(state: OrderState, locale: Locale): string {
  if (locale === "vi") return STATE_LABEL[state].text.toLocaleLowerCase("vi");
  return stateLabel(state, locale).text.toLocaleLowerCase("en");
}

const AUTHOR: Record<AdminEvent["actorRole"], LogAuthor> = {
  admin: "Cửa hàng",
  customer: "Khách",
  system: "Hệ thống",
};

/** How an order is being paid, mid-sentence. */
const PAYMENT_WORD: Record<PaymentMethod, Pair> = {
  BANK_TRANSFER: { vi: "chuyển khoản", en: "bank transfer" },
  CARD: { vi: "thẻ", en: "card" },
  COD: { vi: "COD", en: "COD" },
};

/** "Change of mind" → "change of mind": a label set inside a sentence. */
function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLocaleLowerCase("en") + s.slice(1) : s;
}

/** The order book, indexed once per call and handed down — no module state. */
type Book = Map<string, AdminOrder>;

function orderSubject(book: Book, code: string, locale: Locale): { subject: Phrase; href: string } {
  const name = book.get(code)?.owner?.name;
  return {
    subject: name ? phrase(`${code} · `, stored(name, locale)) : code,
    href: `/admin/orders/${code}`,
  };
}

function totalTail(book: Book, code: string, locale: Locale): { tail?: string } {
  const order = book.get(code);
  return order ? { tail: vnd(orderTotalVnd(order), locale) } : {};
}

/**
 * A style as the back office names it — "S05 – KHÓI", a fixed style's bare
 * name (v3 slice 12) — read from the catalogue by id, its name by
 * `productText` in English. A style the catalogue no longer has is named by
 * what the event kept, as stored, else by its id.
 */
function styleOf(
  catalog: Catalog,
  id: string,
  locale: Locale,
  kept?: { name?: string; dropNo?: number | null },
): Phrase {
  const p = catalog.byId.get(id as Product["id"]);
  if (p) return styleName(productText(p, locale).name, p.dropNo, locale);
  if (kept?.name) {
    if (locale === "vi") return kept.dropNo === undefined ? kept.name : styleName(kept.name, kept.dropNo);
    const name = stored(kept.name, locale);
    return kept.dropNo === undefined || kept.dropNo === null
      ? phrase(name)
      : phrase(`${stylePrefix(kept.dropNo, locale)} `, name);
  }
  return id;
}

/** "S05 – CÁT ×1" — what was in the box. */
function itemsTail(catalog: Catalog, book: Book, code: string, locale: Locale): { tail?: string } {
  const order = book.get(code);
  return order ? { tail: orderItemsLabel(catalog, order, locale) } : {};
}

/** A typed value in quotes, as stored: `"gọi khách"`. */
function quoted(text: string, locale: Locale): Phrase {
  return phrase('"', stored(text, locale), '"');
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
  locale: Locale = "vi",
): LogRow[] {
  const book: Book = new Map(orders.map((o) => [String(o.code), o]));
  const rows = events.map((e) => eventRow(catalog, book, e, locale));

  // The twelve-hour clock, read over the orders the database still has as
  // waiting: past the deadline they are cancelled on every screen already.
  for (const o of orders) {
    if (o.status.state !== "AWAITING_TRANSFER") continue;
    const status = effectiveStatus(o, now);
    if (status.state !== "CANCELLED") continue;
    rows.push(expiredRow(catalog, book, `due-${o.code}`, String(o.code), status.cancelledAt, locale));
  }

  return rows.sort(byNewest);
}

/** The row id of an event: padded, so a later one sorts after an earlier one. */
const eventId = (id: number) => `ev-${String(id).padStart(12, "0")}`;

function expiredRow(catalog: Catalog, book: Book, id: string, code: string, at: string, locale: Locale): LogRow {
  const t = picker(locale);
  return {
    id,
    at,
    kind: "order",
    author: "Hệ thống",
    action: t({ vi: "Huỷ đơn", en: "Order cancelled" }),
    detail: t({
      vi: `quá ${TRANSFER_HOLD_HOURS} giờ chưa chuyển khoản`,
      en: `no transfer within ${plural(TRANSFER_HOLD_HOURS, "hour", "hours")}`,
    }),
    ...orderSubject(book, code, locale),
    before: stateWord("AWAITING_TRANSFER", locale),
    after: stateWord("CANCELLED", locale),
    ...itemsTail(catalog, book, code, locale),
  };
}

/** What a style edit changed, field by field, as the log names each field. */
const PRODUCT_FIELD_LABEL: Record<keyof ProductFields, Pair> = {
  name: { vi: "tên", en: "name" },
  kind: { vi: "loại", en: "type" },
  family: { vi: "nhóm", en: "category" },
  slug: { vi: "mã địa chỉ", en: "slug" },
  priceVnd: { vi: "giá", en: "price" },
  material: { vi: "chất liệu", en: "material" },
  fit: { vi: "form", en: "fit" },
  dropNo: { vi: "số", en: "drop" },
};

/** One field's value as a sentence prints it; a typed one (name, kind, material, slug) as stored. */
function fieldValue(key: keyof ProductFields, fields: ProductFields, locale: Locale): Phrase {
  switch (key) {
    case "priceVnd":
      return fields.priceVnd === undefined ? "" : vnd(fields.priceVnd, locale);
    case "family":
      if (!fields.family) return "";
      return locale === "vi" ? FAMILY_LABELS[fields.family] : familyLabel(fields.family, locale);
    case "fit":
      if (locale === "vi") return fields.fit === "OVERSIZE" ? "oversize" : fields.fit === "REGULAR" ? "regular" : "";
      return fields.fit ? fitLabel(fields.fit, locale).toLocaleLowerCase("en") : "";
    case "dropNo":
      return fields.dropNo === undefined ? "" : issueLabel(fields.dropNo, locale);
    default:
      return phrase(stored(fields[key] ?? "", locale));
  }
}

/** "20:00 11/09 → 20:00 25/09" — a code's run. */
function termsWindow(t: PromoTerms, locale: Locale): string {
  return `${dateTimeLabel(t.startsAt, locale)} → ${dateTimeLabel(t.endsAt, locale)}`;
}

/**
 * What kind of photo a key is, the way the product form labels it: uploaded
 * or shipped with the app (`shot-…`, v3 slice 14), it is "ảnh thật".
 */
function photoWord(key: string, locale: Locale): string {
  const t = picker(locale);
  return isRealPhotoKey(key)
    ? t({ vi: "ảnh thật", en: "real photo" })
    : t({ vi: "ảnh mượn", en: "borrowed photo" });
}

/** "Đen · Kem" — a band order. */
function band(colors: readonly ColorKey[], locale: Locale): string {
  return colors.map((c) => (locale === "vi" ? COLORS[c].label : colorLabel(c, locale))).join(" · ");
}

/** "1 ảnh tải lên · 2 ảnh mượn" — where a new style's photos came from. */
function photoSources(uploaded: number, borrowed: number, locale: Locale): string {
  const t = picker(locale);
  return [
    uploaded > 0
      ? t({ vi: `${uploaded} ảnh tải lên`, en: plural(uploaded, "uploaded photo", "uploaded photos") })
      : "",
    borrowed > 0
      ? t({ vi: `${borrowed} ảnh mượn`, en: plural(borrowed, "borrowed photo", "borrowed photos") })
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** "+3 chiếc", "-2 chiếc"; in English "+3 units". */
function unitsDelta(delta: number, locale: Locale): string {
  const sign = delta > 0 ? "+" : "";
  return picker(locale)({ vi: `${sign}${delta} chiếc`, en: `${sign}${delta} ${delta === 1 || delta === -1 ? "unit" : "units"}` });
}

/**
 * A cancel reason in the log's quiet line: in Vietnamese the stored words in
 * lower case, as always; in English one of the shop's own in the table's words
 * ("change of mind"), any other as stored.
 */
function cancelReasonDetail(reason: string, locale: Locale): Phrase {
  if (locale === "vi") return reason.toLocaleLowerCase("vi");
  const english = cancelReasonLabel(reason, "en");
  return english === reason ? phrase(stored(reason, locale)) : lowerFirst(english);
}

/** A stock reason the same way: "lý do: hàng trả về"; in English "reason: returned". */
function stockReasonDetail(reason: string, locale: Locale): Phrase {
  if (locale === "vi") return `lý do: ${reason.toLocaleLowerCase("vi")}`;
  const piece: string | Stored = isKnownStockReason(reason)
    ? lowerFirst(stockReasonLabel(reason, "en"))
    : stored(reason, locale);
  return phrase("reason: ", piece);
}

function eventRow(catalog: Catalog, book: Book, e: AdminEvent, locale: Locale): LogRow {
  const t = picker(locale);
  const id = eventId(e.id);
  const author = AUTHOR[e.actorRole];
  const from = (s: OrderState | undefined) => (s ? { before: stateWord(s, locale) } : {});
  const issueHref = (no: number) => `/admin/drops/${String(no).padStart(2, "0")}`;

  switch (e.kind) {
    case "ORDER_PLACED": {
      const payment = book.get(e.code)?.payment;
      // The state `place_order()` wrote it in, read off the method: a transfer
      // and, since slice B7, a card order wait for the money; COD is taken.
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        action: t({ vi: "Đặt đơn", en: "Order placed" }),
        ...(payment ? { detail: t(PAYMENT_WORD[payment]) } : {}),
        ...orderSubject(book, e.code, locale),
        ...(payment
          ? { after: stateWord(paysByTransfer(payment) ? "AWAITING_TRANSFER" : "RECEIVED", locale) }
          : {}),
        ...totalTail(book, e.code, locale),
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
          ? {
              action: t({ vi: "Khớp chuyển khoản", en: "Transfer matched" }),
              detail: t({ vi: "tự động theo nội dung", en: "automatic, by reference" }),
            }
          : {
              action: t({ vi: "Đã nhận tiền", en: "Marked as paid" }),
              detail: t({ vi: "đánh dấu tay", en: "by hand" }),
            }),
        ...orderSubject(book, e.code, locale),
        ...from(e.from),
        after: stateWord("PAID", locale),
        ...totalTail(book, e.code, locale),
      };
    case "ORDER_SHIPPED":
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        action: t({ vi: "Bàn giao", en: "Handed over" }),
        ...orderSubject(book, e.code, locale),
        ...from(e.from),
        after: stateWord("SHIPPING", locale),
        tail: e.carrier ? phrase(carrierPiece(e.carrier, locale), ` · ${e.trackingCode}`) : e.trackingCode,
      };
    case "ORDER_DELIVERED":
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        action: t({ vi: "Giao thành công", en: "Delivered" }),
        detail:
          e.actorRole === "system"
            ? t({ vi: "theo ghi nhận của đơn", en: "as the order records it" })
            : t({ vi: "đánh dấu tay", en: "by hand" }),
        ...orderSubject(book, e.code, locale),
        before: stateWord("SHIPPING", locale),
        after: stateWord("DELIVERED", locale),
      };
    case "ORDER_CANCELLED":
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        action: t({ vi: "Huỷ đơn", en: "Order cancelled" }),
        detail: cancelReasonDetail(e.reason, locale),
        ...orderSubject(book, e.code, locale),
        ...from(e.from),
        after: stateWord("CANCELLED", locale),
        ...itemsTail(catalog, book, e.code, locale),
      };
    case "ORDER_CANCELLED_BY_CUSTOMER":
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        action: t({ vi: "Huỷ đơn", en: "Order cancelled" }),
        detail: t({ vi: "khách huỷ", en: "cancelled by the customer" }),
        ...orderSubject(book, e.code, locale),
        ...from(e.from),
        after: stateWord("CANCELLED", locale),
        ...itemsTail(catalog, book, e.code, locale),
      };
    case "ORDER_EXPIRED":
      return { ...expiredRow(catalog, book, id, e.code, e.at, locale), author };
    case "ORDER_NOTE":
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        action: t({ vi: "Ghi chú nội bộ", en: "Internal note" }),
        ...orderSubject(book, e.code, locale),
        tail: quoted(e.text, locale),
      };
    case "ORDER_ADDRESS_EDITED":
      return {
        id,
        at: e.at,
        kind: "order",
        author,
        action: t({ vi: "Sửa địa chỉ giao", en: "Delivery address changed" }),
        detail: t({ vi: "trước khi bàn giao", en: "before handover" }),
        ...orderSubject(book, e.code, locale),
        before: phrase(stored(e.before.line, locale)),
        after: phrase(stored(e.after.line, locale)),
        tail: quoted(e.reason, locale),
      };
    case "DEMO_RESET":
      return {
        id,
        at: e.at,
        kind: "demo",
        author,
        action: t({ vi: "Đặt lại dữ liệu mẫu", en: "Demo data reset" }),
        detail: t({ vi: `neo ${logStamp(e.anchor)}`, en: `anchored ${logStamp(e.anchor, "en")}` }),
        subject: t({ vi: "Dữ liệu mẫu", en: "Demo data" }),
      };

    // ── the catalogue (slice B3b) — the same sentences the simulation said
    case "INVENTORY_ADJUSTED": {
      const one = e.cells.length === 1 ? e.cells[0] : undefined;
      const name = styleOf(catalog, e.productId, locale);
      const cellSubject = one
        ? joinPhrases([name, locale === "vi" ? COLORS[one.color].label : colorLabel(one.color, locale), one.size], " · ")
        : joinPhrases(
            [name, t({ vi: `${e.cells.length} ô`, en: plural(e.cells.length, "variant", "variants") })],
            " · ",
          );
      const note = e.note.trim();
      // v3 slice 12: pieces brought back onto a fixed style read as that —
      // "Nhập thêm", the style, and how many went on the shelf.
      if (e.reason === RESTOCK_REASON) {
        return {
          id,
          at: e.at,
          kind: "stock",
          author,
          action: locale === "vi" ? RESTOCK_REASON : stockReasonLabel(RESTOCK_REASON, locale),
          subject: cellSubject,
          href: `/admin/products/${e.productId}`,
          ...(one ? { before: String(one.before), after: String(one.after) } : {}),
          tail: joinPhrases(
            [
              t({ vi: `+${e.delta} chiếc`, en: `+${plural(e.delta, "unit", "units")}` }),
              ...(note ? [quoted(note, locale)] : []),
            ],
            " · ",
          ),
        };
      }
      const ref = e.ref.trim();
      return {
        id,
        at: e.at,
        kind: "stock",
        author,
        action: t({ vi: "Điều chỉnh tồn kho", en: "Stock adjusted" }),
        detail: stockReasonDetail(e.reason, locale),
        subject: cellSubject,
        href: `/admin/products/${e.productId}`,
        ...(one ? { before: String(one.before), after: String(one.after) } : {}),
        tail: joinPhrases(
          [
            ...(one ? [] : [unitsDelta(e.delta, locale)]),
            ...(ref ? [locale === "vi" ? `tham chiếu ${ref}` : phrase("ref ", stored(ref, locale))] : []),
            ...(note ? [quoted(note, locale)] : []),
          ],
          " · ",
        ),
      };
    }
    case "PRODUCT_EDITED": {
      // One field: its before and after. Several: each one, in the tail.
      const keys = (Object.keys(e.after) as Array<keyof ProductFields>).filter(
        (k) => k in PRODUCT_FIELD_LABEL,
      );
      const name = styleOf(catalog, e.productId, locale, { name: e.after.name });
      const only = keys.length === 1 ? keys[0] : undefined;
      const label = (k: keyof ProductFields) => t(PRODUCT_FIELD_LABEL[k]);
      return {
        id,
        at: e.at,
        kind: "stock",
        author,
        action: t({ vi: "Sửa mẫu", en: "Style edited" }),
        detail: keys.map(label).join(", "),
        subject: name,
        href: `/admin/products/${e.productId}`,
        ...(only
          ? { before: fieldValue(only, e.before, locale), after: fieldValue(only, e.after, locale) }
          : {
              tail: joinPhrases(
                keys.map((k) =>
                  joinPhrases(
                    [`${label(k)} `, fieldValue(k, e.before, locale), " → ", fieldValue(k, e.after, locale)],
                    "",
                  ),
                ),
                " · ",
              ),
            }),
      };
    }
    // ── a style's own shape (slice B3c): created, a photo, the band order
    case "PRODUCT_ADDED": {
      const sources = photoSources(e.uploaded, e.borrowed, locale);
      const colours = t({ vi: `${e.colors.length} màu`, en: plural(e.colors.length, "colour", "colours") });
      return {
        id,
        at: e.at,
        kind: "stock",
        author,
        action: t({ vi: "Thêm mẫu", en: "Style added" }),
        ...(sources ? { detail: sources } : {}),
        subject: styleOf(catalog, e.productId, locale, { name: e.name, dropNo: e.dropNo }),
        href: `/admin/products/${e.productId}`,
        // A fixed style (slice B5) was created for no issue and cut nothing.
        tail:
          e.dropNo === null || e.cutUnits === null
            ? colours
            : `${issueLabel(e.dropNo, locale)} · ${colours} · ${t({
                vi: `${e.cutUnits} chiếc`,
                en: plural(e.cutUnits, "unit", "units"),
              })}`,
      };
    }
    case "PRODUCT_PHOTO_SET":
      return {
        id,
        at: e.at,
        kind: "stock",
        author,
        action: t({
          vi: `Thay ảnh ${COLORS[e.color].label}`,
          en: `${colorLabel(e.color, "en")} photo changed`,
        }),
        subject: styleOf(catalog, e.productId, locale),
        href: `/admin/products/${e.productId}`,
        before: photoWord(e.before, locale),
        after: photoWord(e.after, locale),
      };
    case "PRODUCT_COLORS_REORDERED":
      return {
        id,
        at: e.at,
        kind: "stock",
        author,
        action: t({ vi: "Đổi thứ tự màu", en: "Colour order changed" }),
        subject: styleOf(catalog, e.productId, locale),
        href: `/admin/products/${e.productId}`,
        before: band(e.before, locale),
        after: band(e.after, locale),
      };
    case "PROMO_ADDED":
      return {
        id,
        at: e.at,
        kind: "promo",
        author,
        action: t({ vi: "Tạo mã", en: "Code created" }),
        subject: e.promoCode,
        href: "/admin/promotions",
        tail: termsWindow(e.terms, locale),
      };
    case "PROMO_EDITED":
      return {
        id,
        at: e.at,
        kind: "promo",
        author,
        action: t({ vi: "Sửa mã", en: "Code edited" }),
        subject: e.promoCode,
        href: "/admin/promotions",
        tail: termsWindow(e.after, locale),
      };
    case "PROMO_LIMIT_RAISED": {
      const uses = (n: number) => t({ vi: `${n} lượt`, en: plural(n, "use", "uses") });
      return {
        id,
        at: e.at,
        kind: "promo",
        author,
        action: t({ vi: "Nâng giới hạn", en: "Limit raised" }),
        subject: e.promoCode,
        href: "/admin/promotions",
        before: e.before === null ? t({ vi: "không giới hạn", en: "no limit" }) : uses(e.before),
        after: uses(e.after),
      };
    }
    case "PROMO_PAUSED": {
      const running = t({ vi: "đang chạy", en: "running" });
      const paused = t({ vi: "tạm dừng", en: "paused" });
      return {
        id,
        at: e.at,
        kind: "promo",
        author,
        action: e.paused ? t({ vi: "Tạm dừng mã", en: "Code paused" }) : t({ vi: "Tiếp tục mã", en: "Code resumed" }),
        subject: e.promoCode,
        href: "/admin/promotions",
        before: e.paused ? running : paused,
        after: e.paused ? paused : running,
        tail: e.paused
          ? t({ vi: "trang thanh toán từ chối từ giờ", en: "checkout refuses it from now on" })
          : t({ vi: "trang thanh toán nhận lại từ giờ", en: "checkout accepts it again from now on" }),
      };
    }
    case "PROMO_ENDED":
      return {
        id,
        at: e.at,
        kind: "promo",
        author,
        action: t({ vi: "Kết thúc sớm", en: "Ended early" }),
        subject: e.promoCode,
        href: "/admin/promotions",
        before: dateTimeLabel(e.before, locale),
        after: dateTimeLabel(e.after, locale),
        tail: t({ vi: "giờ kết thúc = bây giờ", en: "end time = now" }),
      };
    case "DROP_ADDED": {
      const opens = dateTimeLabel(e.opensAt, locale);
      const closes = dateTimeLabel(e.closesAt, locale);
      return {
        id,
        at: e.at,
        kind: "drop",
        author,
        action: t({ vi: "Tạo số", en: "Drop created" }),
        subject: issueLabel(e.no, locale),
        href: issueHref(e.no),
        tail: t({ vi: `mở ${opens} → đóng ${closes}`, en: `opens ${opens} → closes ${closes}` }),
      };
    }
    case "DROP_SCHEDULED": {
      // Closing early IS the closing hour moved to now, so the two are one
      // action and the log tells them apart by how far apart the two
      // instants are rather than by a flag nobody could derive.
      const early = Math.abs(Date.parse(e.after.closesAt) - Date.parse(e.at)) < 60_000;
      const opens = dateTimeLabel(e.after.opensAt, locale);
      return {
        id,
        at: e.at,
        kind: "drop",
        author,
        action: early ? t({ vi: "Đóng sớm", en: "Closed early" }) : t({ vi: "Sửa giờ", en: "Times changed" }),
        ...(early ? { detail: t({ vi: "giờ đóng đổi thành bây giờ", en: "closing time moved to now" }) } : {}),
        subject: issueLabel(e.no, locale),
        href: issueHref(e.no),
        before: dateTimeLabel(e.before.closesAt, locale),
        after: dateTimeLabel(e.after.closesAt, locale),
        ...(early ? {} : { tail: t({ vi: `mở ${opens}`, en: `opens ${opens}` }) }),
      };
    }
    case "TEASER_ADDED":
      return {
        id,
        at: e.at,
        kind: "drop",
        author,
        action: t({ vi: "Thêm mẫu hé lộ", en: "Teaser added" }),
        subject: issueLabel(e.no, locale),
        href: issueHref(e.no),
        tail:
          locale === "vi"
            ? `${styleName(e.name, e.no)} · ${e.garment}`
            : phrase(`${stylePrefix(e.no, locale)} `, stored(e.name, locale), " · ", stored(e.garment, locale)),
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
  locale: Locale = "vi",
): LogRow[] {
  const t = picker(locale);
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
        action: t({ vi: "Mở số", en: "Drop opened" }),
        detail: t({ vi: "theo giờ mở đã đặt", en: "at the set opening time" }),
        subject: issueLabel(d.no, locale),
        href,
        tail: t({
          vi: `${summary.styles} mẫu · ${summary.cutUnits} chiếc đã cắt`,
          en: `${plural(summary.styles, "style", "styles")} · ${plural(summary.cutUnits, "unit", "units")} cut`,
        }),
      });
    }
    if (Date.parse(d.closesAt) <= now.getTime()) {
      rows.push({
        id: `close-${d.no}`,
        at: d.closesAt,
        kind: "drop",
        author: "Hệ thống",
        action: t({ vi: "Đóng số", en: "Drop closed" }),
        detail: t({ vi: "theo giờ đóng đã đặt", en: "at the set closing time" }),
        subject: issueLabel(d.no, locale),
        href,
        tail: t({
          vi: `${summary.soldUnits} / ${summary.cutUnits} đã bán · còn ${summary.onHand}`,
          en: `${summary.soldUnits} / ${summary.cutUnits} sold · ${summary.onHand} left`,
        }),
      });
    }
  }
  return rows.sort(byNewest);
}

// ────────────────────────────────────────────────────────────────── filtering
/** The filter menu. "Hệ thống" asks about the HAND, not about the object. */
export type LogFilter = "all" | Exclude<LogKind, "demo"> | "system";

/** The filter menu's choices in both languages; "Drops" is the glossary's word for the issues. */
const LOG_FILTER_TEXT: Array<{ value: LogFilter; label: Pair }> = [
  { value: "all", label: { vi: "Tất cả", en: "All" } },
  { value: "order", label: { vi: "Đơn hàng", en: "Orders" } },
  { value: "stock", label: { vi: "Tồn kho", en: "Stock" } },
  { value: "promo", label: { vi: "Mã giảm giá", en: "Discount codes" } },
  { value: "drop", label: { vi: LEX.t, en: lexicon("en").adm } },
  { value: "system", label: { vi: "Hệ thống", en: "System" } },
];

/** The filter menu's choices in one language. */
export function logFilters(locale: Locale = "vi"): Array<{ value: LogFilter; label: string }> {
  return LOG_FILTER_TEXT.map((f) => ({ value: f.value, label: pick(f.label, locale) }));
}

export const LOG_FILTERS: Array<{ value: LogFilter; label: string }> = logFilters("vi");

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
    .map((part) => plainText(part))
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("vi");
}

/** "chờ chuyển khoản → đã thanh toán · 400.000₫", as one line of text. */
export function diffText(row: LogRow): string {
  const before = plainText(row.before);
  const after = plainText(row.after);
  const arrow = before && after ? `${before} → ${after}` : after;
  return [arrow, plainText(row.tail)].filter(Boolean).join(" · ");
}
