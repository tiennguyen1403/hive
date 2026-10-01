import {
  COLOR_KEYS,
  SIZES,
  type ColorKey,
  type DeliveryMethod,
  type PaymentMethod,
  type Size,
} from "@/data/types";
import { normalisePhone, validateCheckout, type CheckoutDraft } from "./checkout-form";
import { picker, type Locale } from "./i18n";
import { LEX, lexicon } from "./lexicon";
import { MAX_NOTE_LENGTH } from "./order-rules";
import { normalisePromoCode } from "./promotions";

/**
 * What checkout sends when "Đặt hàng" is pressed, what the server makes of
 * it, and what the shopper is told when the order cannot be placed.
 *
 * Pure, so the rules can be read and tested without a database or a request.
 * The Server Action (`lib/actions/orders.ts`) is the thin shell around it:
 * a file carrying `"use server"` may only export async functions, so the
 * shapes and the checks live here, beside it.
 *
 * TWO LAYERS, ON PURPOSE. `readPlaceOrderPayload` re-runs everything the
 * browser already checked — `validateCheckout()` with its ward list, the
 * size of the basket, the length of the note — because a Server Action is a
 * public endpoint and a request can arrive without going through the form.
 * `place_order()` then checks again what only the database can know: the
 * stock, the issue's window, the code's uses.
 */

/** Pieces per order. `place_order()` restates it as `max_units`. */
export const MAX_UNITS_PER_ORDER = 20;

// The note's limit and which failures move the catalogue live in `order-rules.ts` since v4 slice 2, where the
// checkout screen can read them without this module's commune list.
export { MAX_NOTE_LENGTH, failureMovesCatalog } from "./order-rules";

/** One line of the basket, as checkout sends it. */
export interface PlaceOrderLine {
  productId: string;
  color: ColorKey;
  size: Size;
  qty: number;
}

/**
 * What `place_order(p_input)` receives — field for field the JSON object the
 * migration reads. Nothing about money: the database prices the order itself.
 */
export interface PlaceOrderInput {
  lines: PlaceOrderLine[];
  recipient: string;
  phone: string;
  /** Null when none was typed — optional since slice B8; the column stores it so. */
  email: string | null;
  provinceCode: string;
  wardCode: string;
  line: string;
  note: string;
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  promoCode: string | null;
}

export type PayloadCheck =
  | { ok: true; input: PlaceOrderInput }
  | { ok: false; message: string };

// ─────────────────────────────────────────────────────────── the failures
/** The seven codes `place_order()` and `cancel_order()` raise, and nothing else. */
export const ORDER_ERROR_CODES = [
  "EMPTY_ORDER",
  "BAD_INPUT",
  "DROP_CLOSED",
  "OUT_OF_STOCK",
  "PROMO_INVALID",
  "NOT_OWNER",
  "NOT_CANCELLABLE",
] as const;

export type OrderErrorCode = (typeof ORDER_ERROR_CODES)[number];

/**
 * A failure the database named, or `UNAVAILABLE` for anything it did not —
 * a dropped connection, a bug. The second is never shown as its raw text:
 * a Postgres message names tables and constraints, and it would mean nothing
 * to a shopper anyway.
 */
export type OrderFailure = OrderErrorCode | "UNAVAILABLE";

/**
 * What "Đặt hàng" hands back to the screen: the order number, or a sentence
 * and why it was chosen. `INVALID` is a request this module refused before
 * the database saw it; `RATE_LIMITED` (slice B4b) is a visitor who placed too
 * many orders, or too many pieces, inside the window (`lib/rate-limit.ts`),
 * refused before `place_order()` ran. No key, no database text — only what
 * the UI renders.
 */
export type PlaceOrderResult =
  | { ok: true; code: string }
  | { ok: false; failure: OrderFailure | "INVALID" | "RATE_LIMITED"; message: string };

/** What "Huỷ đơn" hands back. */
export type CancelOrderResult = { ok: true } | { ok: false; message: string };

/** `raise exception using message = 'OUT_OF_STOCK'` arrives as SQLSTATE P0001. */
export function orderFailureOf(error: { code?: string; message?: string } | null): OrderFailure {
  if (!error) return "UNAVAILABLE";
  const message = error.message ?? "";
  return error.code === "P0001" && (ORDER_ERROR_CODES as readonly string[]).includes(message)
    ? (message as OrderErrorCode)
    : "UNAVAILABLE";
}

/**
 * The sentence for each way an order can fail to go through.
 *
 * Each one says what to do next, because the next move differs: another
 * size, another code, nothing at all.
 *
 * In both languages since round v6 slice E2, the action answering in the
 * request's language. The English is written without the long dash, as the
 * Feed prints every sentence (`feedSentence`).
 */
export function placeFailureMessage(failure: OrderFailure, locale: Locale = "vi"): string {
  const t = picker(locale);
  switch (failure) {
    case "OUT_OF_STOCK":
      return t({
        vi: "Một món vừa hết — mở giỏ để đổi size hoặc bỏ món.",
        en: "An item just sold out. Open your bag to change the size or remove it.",
      });
    case "DROP_CLOSED":
      return t({
        vi: `${LEX.t} đã đóng — món trong giỏ không còn bán.`,
        en: `The ${lexicon("en").tl} has closed. An item in your bag is no longer on sale.`,
      });
    case "PROMO_INVALID":
      return t({
        vi: "Mã giảm giá không còn dùng được cho đơn này — bỏ mã hoặc thử mã khác.",
        en: "The discount code no longer works for this order. Remove it or try another.",
      });
    case "EMPTY_ORDER":
      return t({
        vi: "Giỏ đang trống, nên chưa có đơn nào để đặt.",
        en: "Your bag is empty, so there is no order to place.",
      });
    case "BAD_INPUT":
      return t({
        vi: "Thông tin đơn chưa đúng — kiểm lại địa chỉ và giỏ rồi đặt lại.",
        en: "Some order details aren't right. Check the address and your bag, then try again.",
      });
    case "NOT_OWNER":
    case "NOT_CANCELLABLE":
    case "UNAVAILABLE":
      return t({
        vi: "Chưa đặt được đơn. Thử lại sau ít phút.",
        en: "Couldn't place the order. Try again in a few minutes.",
      });
  }
}

/** The same, for "Huỷ đơn". Somebody else's order and no order read alike (QĐ-16). */
export function cancelFailureMessage(failure: OrderFailure, locale: Locale = "vi"): string {
  const t = picker(locale);
  switch (failure) {
    case "NOT_OWNER":
      return t({ vi: "Không tìm thấy đơn này trong tài khoản.", en: "This order isn't in your account." });
    case "NOT_CANCELLABLE":
      return t({
        vi: "Đơn này không huỷ được nữa — liên hệ cửa hàng.",
        en: "This order can no longer be cancelled. Contact the shop.",
      });
    default:
      return t({
        vi: "Chưa huỷ được đơn. Thử lại sau ít phút.",
        en: "Couldn't cancel the order. Try again in a few minutes.",
      });
  }
}

// ─────────────────────────────────────────────────────────── the request
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const text = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * The basket, checked line by line. Null when anything about it is not what
 * the cart itself would have sent — the cart merges a choice into one line
 * (`lib/cart.ts#lineKey`) and never holds zero or a fraction of a piece.
 */
function readLines(raw: unknown): PlaceOrderLine[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_UNITS_PER_ORDER) return null;

  const lines: PlaceOrderLine[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item)) return null;
    const { productId, color, size, qty } = item;
    if (
      typeof productId !== "string" ||
      productId === "" ||
      typeof color !== "string" ||
      !(COLOR_KEYS as readonly string[]).includes(color) ||
      typeof size !== "string" ||
      !(SIZES as readonly string[]).includes(size) ||
      typeof qty !== "number" ||
      !Number.isInteger(qty) ||
      qty < 1
    ) {
      return null;
    }
    const key = `${productId}:${color}:${size}`;
    if (seen.has(key)) return null;
    seen.add(key);
    lines.push({ productId, color: color as ColorKey, size: size as Size, qty });
  }
  return lines;
}

/**
 * The request, re-read on the server. Whatever the browser validated, this
 * decides — and says, in the form's own words, the first thing that is
 * wrong. In the request's language since round v6 slice E2.
 */
export function readPlaceOrderPayload(raw: unknown, locale: Locale = "vi"): PayloadCheck {
  const t = picker(locale);
  if (!isRecord(raw) || !isRecord(raw.draft)) {
    return { ok: false, message: placeFailureMessage("BAD_INPUT", locale) };
  }

  const lines = readLines(raw.lines);
  if (lines === null) return { ok: false, message: placeFailureMessage("BAD_INPUT", locale) };
  if (lines.length === 0) return { ok: false, message: placeFailureMessage("EMPTY_ORDER", locale) };

  const units = lines.reduce((n, l) => n + l.qty, 0);
  if (units > MAX_UNITS_PER_ORDER) {
    return {
      ok: false,
      message: t({
        vi: `Mỗi đơn tối đa ${MAX_UNITS_PER_ORDER} chiếc.`,
        en: `An order takes up to ${MAX_UNITS_PER_ORDER} items.`,
      }),
    };
  }

  const d = raw.draft;
  const delivery = d.delivery === "EXPRESS" ? "EXPRESS" : d.delivery === "STANDARD" ? "STANDARD" : null;
  const payment =
    d.payment === "BANK_TRANSFER" || d.payment === "CARD" || d.payment === "COD" ? d.payment : null;
  if (delivery === null || payment === null) {
    return { ok: false, message: placeFailureMessage("BAD_INPUT", locale) };
  }

  // No `agreed` (slice B8): the Feed checkout has no box to tick, and a check
  // for one would record an agreement nobody gave. The e-mail is optional, and
  // like the note and the code, anything but a string reads as none.
  const draft: CheckoutDraft = {
    recipient: text(d.recipient),
    phone: text(d.phone),
    email: text(d.email),
    provinceCode: text(d.provinceCode),
    wardCode: text(d.wardCode),
    line: text(d.line),
    note: text(d.note),
    delivery,
    payment,
  };

  const errors = validateCheckout(draft, locale);
  const first = Object.values(errors).find((m) => typeof m === "string" && m !== "");
  if (first) return { ok: false, message: first };

  const note = draft.note.trim();
  if (note.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      message: t({
        vi: `Ghi chú tối đa ${MAX_NOTE_LENGTH} ký tự.`,
        en: `A note takes up to ${MAX_NOTE_LENGTH} characters.`,
      }),
    };
  }

  const promo = typeof raw.promoCode === "string" ? normalisePromoCode(raw.promoCode) : "";

  return {
    ok: true,
    input: {
      lines,
      recipient: draft.recipient.trim(),
      // Ten digits, however it was typed — the only form the column takes.
      phone: normalisePhone(draft.phone),
      // None typed is none: `place_order()` stores it as NULL.
      email: draft.email.trim() || null,
      provinceCode: draft.provinceCode,
      wardCode: draft.wardCode,
      line: draft.line.trim(),
      note,
      delivery,
      payment,
      promoCode: promo === "" ? null : promo,
    },
  };
}
