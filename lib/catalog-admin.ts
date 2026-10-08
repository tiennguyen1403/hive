import { COLORS, colorLabel } from "@/data/colors";
import {
  COLOR_KEYS,
  SIZES,
  type ColorKey,
  type Drop,
  type Family,
  type Fit,
  type Product,
  type Promotion,
  type Size,
} from "@/data/types";
import type { Catalog } from "./catalog";
import { toVnIso } from "./datetime";
import { picker, type Locale, type Pair } from "./i18n";
import { isFixed, onHandOf } from "./inventory";
import { RESTOCK_REASON, isStockReason, type InventoryCell } from "./inventory-adjust";
import { LEX, issueCode, issueLabel, styleName } from "./lexicon";
import { vnd } from "./money";
import { isUploadedKey } from "./photos";
import { productText } from "./product-text";
import { normalisePromoCode } from "./promotions";
import { asciiSlug } from "./teasers";

/**
 * The back office's side of the CATALOGUE, since slice B3b moved every move
 * on it into Postgres (`supabase/migrations/…_catalog_admin.sql`).
 *
 * Pure, like `lib/admin-orders.ts` is for the orders: the Server Actions
 * (`lib/actions/catalog-admin.ts`) read what the forms sent as `unknown` and
 * check it here, then the `admin_*` functions check the same things again —
 * a Server Action is a public endpoint, and so is a function the publishable
 * key can reach. What lives here is what both sides and the screens have to
 * agree on: what a form may send, what the next issue number is, what a
 * refusal says.
 *
 * Every limit restates one in the migration; the database tests and the
 * tests beside this file pin the pairs.
 */

// ─────────────────────────────────────────────────────────── the answers
/** What a check hands back: the value to send, or the sentence for the form. */
export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Checked<T> => ({ ok: true, value });
const no = <T>(error: string): Checked<T> => ({ ok: false, error });

/**
 * The codes the catalogue's `admin_*` functions raise, and nothing else.
 *
 * Slice B3c added five, for a new style and its photos — an issue that has
 * closed, no colour, a colour with nothing cut, a colour with no photo, a
 * photo that is not one. A taken address segment and "nothing to save" kept
 * the codes slice B3b gave them (`NOT_ALLOWED`, `BAD_INPUT`), and a missing
 * issue is `NOT_FOUND` as it is for a teaser: the move says which sentence.
 */
export const CATALOG_ERROR_CODES = [
  "NOT_ADMIN",
  "NOT_FOUND",
  "NOT_ALLOWED",
  "BAD_INPUT",
  "STALE",
  "DROP_CLOSED",
  "NO_COLORS",
  "COLOR_EMPTY",
  "PHOTO_MISSING",
  "PHOTO_UNKNOWN",
] as const;

export type CatalogErrorCode = (typeof CATALOG_ERROR_CODES)[number];

/**
 * A refusal the database named; `UPLOAD_BAD` for a file the server would not
 * store (checked in TypeScript, never raised by SQL); `UNAVAILABLE` for
 * anything nobody named.
 */
export type CatalogFailure = CatalogErrorCode | "UPLOAD_BAD" | "UNAVAILABLE";

/** `raise exception using message = 'STALE'` arrives as SQLSTATE P0001. */
export function catalogFailureOf(error: { code?: string; message?: string } | null): CatalogFailure {
  if (!error) return "UNAVAILABLE";
  const message = error.message ?? "";
  return error.code === "P0001" && (CATALOG_ERROR_CODES as readonly string[]).includes(message)
    ? (message as CatalogErrorCode)
    : "UNAVAILABLE";
}

/**
 * What a refusal is about, when the function said: `raise … using detail =`
 * arrives as `details` — the colour for `COLOR_EMPTY`, `PHOTO_MISSING` and
 * `PHOTO_UNKNOWN`, the issue in the way for an overlapping new one.
 */
export function failureDetail(error: { details?: string | null } | null): string {
  return typeof error?.details === "string" ? error.details : "";
}

/**
 * What kind of refusal it was, when the function said: `raise … using hint =`
 * arrives as `hint` (PostgREST sends it as null when there was none). Since
 * slice B14b, what the issue in DETAIL is to a refused window — `OVERLAP`,
 * `PREVIOUS` or `NEXT` (`calendarRefusal`).
 */
export function failureHint(error: { hint?: string | null } | null): string {
  return typeof error?.hint === "string" ? error.hint : "";
}

/** "Đen" for `black` ("Black" in English) — how a message names a colour the database named. */
export function colorLabelOf(key: string, locale: Locale = "vi"): string {
  return (COLOR_KEYS as readonly string[]).includes(key) ? colorLabel(key as ColorKey, locale) : "";
}

/** Every move the back office makes on the catalogue. */
export type CatalogMove =
  | "ADJUST_STOCK"
  | "RESTOCK"
  | "ADD_DROP"
  | "SCHEDULE_DROP"
  | "CLOSE_DROP"
  | "ADD_TEASER"
  | "ADD_PROMO"
  | "EDIT_PROMO"
  | "PAUSE_PROMO"
  | "RAISE_LIMIT"
  | "END_PROMO"
  | "UPDATE_PRODUCT"
  | "ADD_PRODUCT"
  | "SET_PHOTO"
  | "REORDER_COLORS"
  | "UPLOAD_PHOTO";

/** The sentence the brief fixed for a shelf that moved under the form. */
export const STALE_STOCK_TEXT: Pair = {
  vi: "Tồn kho đã đổi ở nơi khác. Tải lại rồi sửa tiếp",
  en: "Stock changed elsewhere. Reload, then edit again.",
};
export const STALE_STOCK_MESSAGE = STALE_STOCK_TEXT.vi;

/**
 * The same refusal said by the "Nhập thêm" sheet (v3 slice 12 fix): that
 * sheet reads the shelf again by itself and keeps the pieces typed, so
 * "tải lại rồi sửa tiếp" would ask for what already happened — what is left
 * is to look at the new numbers and send again. The adjustment sheet keeps
 * `STALE_STOCK_MESSAGE`.
 */
export const RESTOCK_STALE_TEXT: Pair = {
  vi: "Tồn kho vừa đổi ở nơi khác. Kiểm lại số rồi gửi",
  en: "Stock just changed elsewhere. Check the numbers, then send again.",
};
export const RESTOCK_STALE_MESSAGE = RESTOCK_STALE_TEXT.vi;

/**
 * The sentence for a move that did not go through, naming what to do next.
 * `subject` is what the move was about, as the screen names it: a style's
 * name, "Số 07", a code.
 *
 * `NOT_ALLOWED` almost always means somebody else got there first — another
 * tab took the issue number, raised the limit, paused the code — so the
 * sentence says to look again rather than to try again.
 *
 * Slice B3c: for a new style `subject` is the issue ("Số 04") when the issue
 * is the problem and the colour ("Đen") when a colour is; for a photo upload
 * it is the colour the photo was for, and the sentence says so first. Every
 * sentence the brief fixed is what comes back when there is no subject.
 */
export function catalogFailureMessage(
  move: CatalogMove,
  failure: CatalogFailure,
  subject = "",
  locale: Locale = "vi",
): string {
  // Round v6 slice E5: every sentence in the page's language; `subject` comes
  // already written in it ("Drop 07", "Black", a style's name as the shop prints it).
  const t = picker(locale);
  switch (failure) {
    case "NOT_ADMIN":
      return t({
        vi: "Phiên quản trị đã hết. Đăng nhập lại bằng tài khoản quản trị.",
        en: "Your admin session has ended. Sign in again with an admin account.",
      });
    case "UNAVAILABLE":
      if (move === "UPLOAD_PHOTO") {
        return subject
          ? t({
              vi: `Không tải được ảnh ${subject}. Thử lại sau ít phút.`,
              en: `Couldn't upload the photo for ${subject}. Try again in a few minutes.`,
            })
          : t({
              vi: "Không tải được ảnh. Thử lại sau ít phút.",
              en: "Couldn't upload the photo. Try again in a few minutes.",
            });
      }
      return t({ vi: "Chưa lưu được. Thử lại sau ít phút.", en: "Couldn't save. Try again in a few minutes." });
    case "STALE":
      return t(move === "RESTOCK" ? RESTOCK_STALE_TEXT : STALE_STOCK_TEXT);
    case "UPLOAD_BAD":
      return subject
        ? t({
            vi: `Không tải được ảnh ${subject}: tệp không phải WebP/JPEG hoặc nặng hơn 1,5 MB`,
            en: `Couldn't upload the photo for ${subject}: the file isn't WebP/JPEG, or is over 1.5 MB`,
          })
        : t({
            vi: "Tệp không phải WebP/JPEG hoặc nặng hơn 1,5 MB",
            en: "The file isn't WebP/JPEG, or is over 1.5 MB",
          });
    case "DROP_CLOSED":
      return t({
        vi: `${subject || LEX.t} đã đóng, không thêm mẫu vào đó`,
        en: `${subject || "The drop"} has closed, so no styles can be added to it`,
      });
    case "NO_COLORS":
      return t({ vi: "Chọn ít nhất một màu", en: "Choose at least one colour" });
    case "COLOR_EMPTY":
      return t({ vi: `Điền số cắt cho ${subject || "từng màu"}`, en: `Enter the cut for ${subject || "each colour"}` });
    case "PHOTO_MISSING":
      return t({ vi: `Chọn ảnh cho ${subject || "từng màu"}`, en: `Choose a photo for ${subject || "each colour"}` });
    case "PHOTO_UNKNOWN":
      return subject
        ? t({
            vi: `Ảnh ${subject} không còn trên kho, chọn lại`,
            en: `The photo for ${subject} is no longer stored, choose it again`,
          })
        : t({ vi: "Ảnh không còn trên kho, chọn lại", en: "The photo is no longer stored, choose it again" });
    case "NOT_FOUND":
      switch (move) {
        case "ADJUST_STOCK":
        case "RESTOCK":
        case "UPDATE_PRODUCT":
        case "REORDER_COLORS":
          return subject
            ? t({ vi: `Không tìm thấy mẫu ${subject}.`, en: `Style ${subject} not found.` })
            : t({ vi: "Không tìm thấy mẫu này.", en: "Style not found." });
        case "SET_PHOTO":
          return subject
            ? t({ vi: `Mẫu này không có màu ${subject}.`, en: `This style doesn't come in ${subject}.` })
            : t({ vi: "Không tìm thấy mẫu hoặc màu này.", en: "Style or colour not found." });
        case "ADD_PRODUCT":
          return subject
            ? t({ vi: `Chưa có ${subject}. Chọn số khác.`, en: `${subject} doesn't exist yet. Choose another drop.` })
            : t({
                vi: `Chưa có ${LEX.tl} này. Chọn ${LEX.tl} khác.`,
                en: "That drop doesn't exist yet. Choose another drop.",
              });
        case "SCHEDULE_DROP":
        case "CLOSE_DROP":
          return subject
            ? t({ vi: `Không tìm thấy ${subject}.`, en: `${subject} not found.` })
            : t({ vi: "Không tìm thấy số này.", en: "Drop not found." });
        case "ADD_TEASER":
          return subject
            ? t({ vi: `Chưa có ${subject} để hé lộ mẫu.`, en: `${subject} doesn't exist yet, so it can't have teasers.` })
            : t({ vi: "Chưa có số này để hé lộ mẫu.", en: "That drop doesn't exist yet, so it can't have teasers." });
        default:
          return subject
            ? t({ vi: `Không tìm thấy mã ${subject}.`, en: `Code ${subject} not found.` })
            : t({ vi: "Không tìm thấy mã này.", en: "Code not found." });
      }
    case "NOT_ALLOWED":
      switch (move) {
        case "ADD_DROP":
          return t({
            vi: `${subject || "Số này"} đã có. Tải lại trang để lấy số kế tiếp.`,
            en: `${subject || "This drop"} already exists. Reload the page for the next number.`,
          });
        case "CLOSE_DROP":
          return t({
            vi: `${subject || "Số này"} không còn mở. Tải lại trang để xem.`,
            en: `${subject || "This drop"} is no longer live. Reload the page to check.`,
          });
        case "ADD_TEASER":
          return t({ vi: `Mẫu hé lộ ${subject} đã có trong số này.`, en: `Teaser ${subject} is already in this drop.` });
        case "ADD_PROMO":
          return t({ vi: `Mã ${subject} đã có rồi.`, en: `Code ${subject} already exists.` });
        case "PAUSE_PROMO":
          return t({
            vi: `${subject} đã đổi trạng thái ở nơi khác. Tải lại trang để xem.`,
            en: `${subject} changed status elsewhere. Reload the page to check.`,
          });
        case "RAISE_LIMIT":
          return t({
            vi: `Giới hạn của ${subject} đã đổi ở nơi khác. Tải lại trang để xem.`,
            en: `The limit of ${subject} changed elsewhere. Reload the page to check.`,
          });
        case "END_PROMO":
          return t({
            vi: `${subject} không còn đang chạy. Tải lại trang để xem.`,
            en: `${subject} is no longer running. Reload the page to check.`,
          });
        case "UPDATE_PRODUCT":
          return t({
            vi: `Mã trên địa chỉ "${subject}" đã dùng cho mẫu khác.`,
            en: `The URL slug "${subject}" is already used by another style.`,
          });
        case "ADD_PRODUCT":
          return t(SLUG_TAKEN_TEXT);
        default:
          return t({
            vi: "Thao tác này không còn làm được. Tải lại trang để xem.",
            en: "This can no longer be done. Reload the page to check.",
          });
      }
    case "BAD_INPUT":
      switch (move) {
        case "ADJUST_STOCK":
          return t({
            vi: "Tồn kho gửi lên chưa hợp lệ: mỗi ô từ 0 trở lên, tổng không vượt số đã cắt, và cần một lý do.",
            en: "The stock sent isn't valid. Each cell is 0 or more, the total stays within the cut, and a reason is needed.",
          });
        case "RESTOCK":
          return t(RESTOCK_BAD_TEXT);
        case "ADD_DROP":
        case "SCHEDULE_DROP":
          return t(CLOSES_AFTER_OPENS_TEXT);
        case "CLOSE_DROP":
          return t({
            vi: "Chưa đóng được: giờ mở của số này chưa tới.",
            en: "Can't close yet: this drop hasn't opened.",
          });
        case "ADD_TEASER":
          return t({
            vi: "Cần tên, loại và một ảnh trong bộ ảnh mượn.",
            en: "A name, a type and one of the borrowed photos are needed.",
          });
        case "ADD_PROMO":
        case "EDIT_PROMO":
          return t(PROMO_BAD_TEXT);
        case "RAISE_LIMIT":
          return t({
            vi: "Giới hạn mới phải lớn hơn giới hạn hiện có.",
            en: "The new limit must be higher than the current one.",
          });
        case "UPDATE_PRODUCT":
        case "ADD_PRODUCT":
          return t(PRODUCT_BAD_TEXT);
        case "SET_PHOTO":
          // The only thing the form can send that the database calls a bad
          // input: the photo the colour already has.
          return t(NO_CHANGE_TEXT);
        case "REORDER_COLORS":
          return t({
            vi: "Thứ tự màu đã đổi ở nơi khác. Tải lại trang để xem.",
            en: "The colour order changed elsewhere. Reload the page to check.",
          });
        default:
          return t({ vi: "Thông tin gửi lên chưa hợp lệ.", en: "The submitted data isn't valid." });
      }
  }
}

/** A taken address segment, for a new style — the brief's `SLUG_TAKEN`. */
export const SLUG_TAKEN_TEXT: Pair = {
  vi: "Mã địa chỉ đã có mẫu khác dùng",
  en: "Another style already uses this URL slug",
};
export const SLUG_TAKEN_MESSAGE = SLUG_TAKEN_TEXT.vi;

/** A save that would change nothing — the brief's `NO_CHANGE`. */
export const NO_CHANGE_TEXT: Pair = { vi: "Chưa có thay đổi nào để lưu.", en: "No changes to save." };
export const NO_CHANGE_MESSAGE = NO_CHANGE_TEXT.vi;

/** A window that closes before it opens. */
const CLOSES_AFTER_OPENS_TEXT: Pair = {
  vi: "Ngày đóng phải sau ngày mở.",
  en: "The closing day must be after the opening day.",
};

/** A code's form that does not read. */
const PROMO_BAD_TEXT: Pair = {
  vi: "Điều kiện mã chưa hợp lệ. Kiểm lại các ô.",
  en: "The code's terms aren't valid. Check the fields.",
};

/** A style's form that does not read. */
const PRODUCT_BAD_TEXT: Pair = {
  vi: "Thông tin mẫu chưa hợp lệ. Kiểm lại các ô.",
  en: "The style's details aren't valid. Check the fields.",
};

/** Words more than one check says. */
const NAME_TEXT: Pair = { vi: "Nhập tên mẫu.", en: "Enter the style name." };
const KIND_TEXT: Pair = { vi: "Chọn loại.", en: "Choose a type." };
const FIT_TEXT: Pair = { vi: "Chọn form.", en: "Choose a fit." };
const MATERIAL_TEXT: Pair = { vi: "Nhập chất liệu.", en: "Enter the material." };

/**
 * A new or moved issue whose window runs into another one's (slice B14: "Sửa
 * giờ" too). In English "Overlaps Drop 06" (round v6 slice E5).
 */
export function overlapMessage(no: number, locale: Locale = "vi"): string {
  return picker(locale)({ vi: `Lịch chồng lên ${issueLabel(no)}`, en: `Overlaps ${issueLabel(no, "en")}` });
}

/**
 * Issue `no` on the wrong side of a neighbour (slice B14b), in the two
 * sentences the user approved on 01/10: "Số 07 phải mở sau khi Số 06 đóng"
 * when it opens before the previous issue `other` closes, "Số 06 phải đóng
 * trước khi Số 07 mở" when it closes after the next issue `other` opens.
 */
export function orderMessage(no: number, side: OrderSide, other: number, locale: Locale = "vi"): string {
  const t = picker(locale);
  return side === "PREVIOUS"
    ? t({
        vi: `${issueLabel(no)} phải mở sau khi ${issueLabel(other)} đóng`,
        en: `${issueLabel(no, "en")} must open after ${issueLabel(other, "en")} closes`,
      })
    : t({
        vi: `${issueLabel(no)} phải đóng trước khi ${issueLabel(other)} mở`,
        en: `${issueLabel(no, "en")} must close before ${issueLabel(other, "en")} opens`,
      });
}

/**
 * The sentence for a calendar refusal of `admin_add_drop()` or
 * `admin_schedule_drop()` about issue `no`, or null when the refusal is not
 * about the calendar.
 *
 * A calendar refusal is `NOT_ALLOWED` with the other issue's number in DETAIL
 * and, since slice B14b, what that issue is to the window in HINT: `OVERLAP`
 * (they share an instant — "Lịch chồng lên Số NN"), `PREVIOUS` or `NEXT`
 * (`orderMessage`). No HINT reads as an overlap: the only calendar refusal a
 * database without B14b raises. `NOT_ALLOWED` with no number is something
 * else — for "Tạo số", a number another tab took — and so is a HINT nobody
 * wrote.
 */
export function calendarRefusal(
  no: number,
  failure: CatalogFailure,
  detail: string,
  hint: string,
  locale: Locale = "vi",
): string | null {
  if (failure !== "NOT_ALLOWED" || !/^[1-9][0-9]*$/.test(detail)) return null;
  const other = Number(detail);
  switch (hint) {
    case "":
    case "OVERLAP":
      return overlapMessage(other, locale);
    case "PREVIOUS":
    case "NEXT":
      return orderMessage(no, hint, other, locale);
    default:
      return null;
  }
}

// ──────────────────────────────────────────────────────────── small reads
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** A whole number of pieces or đồng, as `public.json_count` accepts one. */
const INT_MAX = 2_147_483_647;
const isCount = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= INT_MAX;

/** The one shape every instant in this codebase is written in. */
const VN_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/;

export function isVnInstant(v: unknown): v is string {
  return typeof v === "string" && VN_ISO.test(v) && !Number.isNaN(Date.parse(v));
}

// ─────────────────────────────────────────────────────────────── the shelf
/** Longest reference and note an adjustment keeps — `admin_adjust_stock()`'s. */
export const MAX_REF = 200;
export const MAX_NOTE = 500;
/** Seven colours by four sizes. */
const MAX_CELLS = COLOR_KEYS.length * SIZES.length;
/** Nobody counts a shelf past this; the database refuses it too. */
const MAX_PIECES = 100_000;

/**
 * The cells a form sent, or null when they are not cells at all: each a
 * known colour and size, once, with whole numbers that are not negative and
 * an `after` that differs from its `before`.
 */
export function readCells(value: unknown): InventoryCell[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CELLS) return null;
  const cells: InventoryCell[] = [];
  for (const v of value) {
    if (!isRecord(v)) return null;
    const { color, size, before, after } = v;
    if (typeof color !== "string" || !(COLOR_KEYS as readonly string[]).includes(color)) return null;
    if (typeof size !== "string" || !(SIZES as readonly string[]).includes(size)) return null;
    if (!isCount(before) || !isCount(after) || before > MAX_PIECES || after > MAX_PIECES) return null;
    if (before === after) return null;
    if (cells.some((c) => c.color === color && c.size === size)) return null;
    cells.push({ color: color as ColorKey, size: size as Size, before, after });
  }
  return cells;
}

/** The style's whole shelf with these cells applied. */
function shelfAfter(product: Product, cells: readonly InventoryCell[]): number {
  let total = 0;
  for (const color of product.colors) {
    for (const size of SIZES) {
      const moved = cells.find((c) => c.color === color && c.size === size);
      total += moved ? moved.after : onHandOf(product, color, size);
    }
  }
  return total;
}

/**
 * Whether this adjustment of this style may be sent, or the sentence saying
 * why not: a colour the style comes in, a reason from the list, a reference
 * and a note that fit, and a shelf that stays within the cut.
 *
 * Slice B5: a fixed style has no cut, so nothing caps its shelf; and
 * "Nhập thêm" is for a fixed style only, every cell going up — the rules
 * `admin_adjust_stock()` applies, said before the button is pressed.
 */
export function checkAdjustment(
  product: Product,
  cells: readonly InventoryCell[],
  reason: string,
  ref: string,
  note: string,
  locale: Locale = "vi",
): string | null {
  const t = picker(locale);
  if (!isStockReason(reason)) return t({ vi: "Chọn lý do.", en: "Choose a reason." });
  if (ref.length > MAX_REF) {
    return t({ vi: `Tham chiếu tối đa ${MAX_REF} ký tự.`, en: `Reference: ${MAX_REF} characters at most.` });
  }
  if (note.length > MAX_NOTE) {
    return t({ vi: `Ghi chú tối đa ${MAX_NOTE} ký tự.`, en: `Note: ${MAX_NOTE} characters at most.` });
  }
  if (cells.some((c) => !product.colors.includes(c.color))) {
    return t({
      vi: `${styleName(product.name, product.dropNo)} không có màu này.`,
      en: `${styleName(productText(product, "en").name, product.dropNo, "en")} doesn't come in this colour.`,
    });
  }
  if (reason === RESTOCK_REASON && (!isFixed(product) || cells.some((c) => c.after <= c.before))) {
    return t(RESTOCK_BAD_TEXT);
  }
  if (product.cutUnits !== null && shelfAfter(product, cells) > product.cutUnits) {
    return t({ vi: `Không vượt ${product.cutUnits} đã cắt`, en: `Keep within the ${product.cutUnits} cut` });
  }
  return null;
}

// ─────────────────────────────────────────────── bringing sizes back (B5)
/** Most pieces one restock may add to one colour and size. */
export const MAX_RESTOCK_PER_CELL = 999;

/** A restock refused: not a fixed style, or a cell that does not go up by 1–999. */
export const RESTOCK_BAD_TEXT: Pair = {
  vi: "Nhập thêm chỉ cho mẫu cố định, mỗi ô thêm từ 1 đến 999 chiếc.",
  en: `Restocking is for Basics only, adding 1 to ${MAX_RESTOCK_PER_CELL} pieces per cell.`,
};
export const RESTOCK_BAD_MESSAGE = RESTOCK_BAD_TEXT.vi;

/**
 * "Nhập thêm", as the sheet sends it — `{ color, size, before, add }` per
 * cell: a known colour and size, once each, `before` the number the sheet was
 * showing and `add` a whole 1–999 — turned into the cells an adjustment
 * sends, `after = before + add`. Null when it is not that.
 */
export function readRestockCells(value: unknown): InventoryCell[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CELLS) return null;
  const cells: InventoryCell[] = [];
  for (const v of value) {
    if (!isRecord(v)) return null;
    const { color, size, before, add } = v;
    if (typeof color !== "string" || !(COLOR_KEYS as readonly string[]).includes(color)) return null;
    if (typeof size !== "string" || !(SIZES as readonly string[]).includes(size)) return null;
    if (!isCount(before) || before > MAX_PIECES) return null;
    if (!isCount(add) || add < 1 || add > MAX_RESTOCK_PER_CELL) return null;
    if (before + add > MAX_PIECES) return null;
    if (cells.some((c) => c.color === color && c.size === size)) return null;
    cells.push({ color: color as ColorKey, size: size as Size, before, after: before + add });
  }
  return cells;
}

/**
 * The cells a whole grid moved, for the product form: what it started from
 * (the shelf as the page was rendered) against what it holds now. Same shape
 * as the adjustment sheet's `changedCells`, so both saves send the same list.
 */
export function gridCells(
  colors: readonly ColorKey[],
  initial: Readonly<Record<string, Readonly<Record<string, number>>>>,
  current: Readonly<Record<string, Readonly<Record<string, number>>>>,
): InventoryCell[] {
  const cells: InventoryCell[] = [];
  for (const color of colors) {
    for (const size of SIZES) {
      const before = initial[color]?.[size] ?? 0;
      const after = current[color]?.[size] ?? 0;
      if (after !== before) cells.push({ color, size, before, after });
    }
  }
  return cells;
}

// ─────────────────────────────────────────────────────────────── the issues
/** The next issue number nobody has used — what "Tạo số" offers. */
export function nextDropNo(drops: readonly Pick<Drop, "no">[]): number {
  return drops.reduce((n, d) => Math.max(n, d.no), 0) + 1;
}

/** Two instants in the app's shape, the closing one after the opening one. */
export function readWindow(opensAt: unknown, closesAt: unknown, locale: Locale = "vi"): Checked<Omit<Drop, "no">> {
  const t = picker(locale);
  if (!isVnInstant(opensAt) || !isVnInstant(closesAt)) {
    return no(t({
      vi: "Nhập ngày mở và ngày đóng theo dạng dd/mm/yyyy.",
      en: "Enter the opening and closing days as dd/mm/yyyy.",
    }));
  }
  if (Date.parse(closesAt) <= Date.parse(opensAt)) return no(t(CLOSES_AFTER_OPENS_TEXT));
  return ok({ opensAt, closesAt });
}

/** An issue number as an address or a form sends it: a whole number above 0. */
export function readDropNo(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= INT_MAX
    ? value
    : null;
}

/** How long a new issue runs unless the manager moves its closing day. */
export const DROP_LENGTH_DAYS = 14;

/** `2026-10-16` plus `days`, as a Vietnamese calendar day. */
function dayPlus(isoDay: string, days: number): string {
  return toVnIso(new Date(Date.parse(`${isoDay}T12:00:00+07:00`) + days * 86_400_000)).slice(0, 10);
}

/**
 * The window "Tạo số" proposes (slice B3c): opening at the shop's own hour —
 * the one its issues already open at, 20:00 — on the day after the last one
 * closes, and closing fourteen days later. Never before tomorrow: a proposal
 * in the past would be an issue that opened before anybody made it.
 *
 * "The last one" is the one that closes last, which is the highest number in
 * any calendar the shop has run; reading the latest closing hour rather than
 * the number keeps the proposal clear of every issue even after one was
 * rescheduled past another. Until this slice the proposal was a week from
 * now, which could open Số 07 before Số 06 — `admin_add_drop` now refuses an
 * overlap outright.
 */
export function proposedWindow(drops: readonly Drop[], now: Date): Omit<Drop, "no"> {
  const hour = [...drops].sort((a, b) => a.no - b.no).at(-1)?.opensAt.slice(11, 16) ?? "20:00";
  const lastClose = drops.reduce((day, d) => (d.closesAt.slice(0, 10) > day ? d.closesAt.slice(0, 10) : day), "");
  const tomorrow = dayPlus(toVnIso(now).slice(0, 10), 1);
  const afterLast = lastClose ? dayPlus(lastClose, 1) : tomorrow;
  const opensDay = afterLast > tomorrow ? afterLast : tomorrow;
  return {
    opensAt: `${opensDay}T${hour}:00+07:00`,
    closesAt: `${dayPlus(opensDay, DROP_LENGTH_DAYS)}T${hour}:00+07:00`,
  };
}

/**
 * The first issue a new window would share an instant with, or undefined.
 * Open-inclusive, close-exclusive, like `dropState`: an issue opening the
 * instant another closes does not overlap it. `admin_add_drop` asks the same.
 */
export function overlappingDrop(
  drops: readonly Drop[],
  window: Omit<Drop, "no">,
): Drop | undefined {
  const opens = Date.parse(window.opensAt);
  const closes = Date.parse(window.closesAt);
  return [...drops]
    .sort((a, b) => a.no - b.no)
    .find((d) => Date.parse(d.opensAt) < closes && Date.parse(d.closesAt) > opens);
}

/**
 * "Sửa giờ" (slice B14): the first OTHER issue a moved window would share an
 * instant with, or undefined. `overlappingDrop`'s rule, with two differences:
 *
 *   · the issue being moved is not compared with itself — its old days are
 *     the ones it gives up;
 *   · a window that only NARROWS — opening no earlier and closing no later
 *     than `drop` does now — is never refused: it cannot make an overlap that
 *     was not there already. "Đóng sớm" is such a move (the closing hour
 *     brought to now), so it closes even on a calendar that already holds two
 *     issues at once.
 *
 * `admin_schedule_drop` asks the same.
 */
export function scheduleClash(
  drops: readonly Drop[],
  drop: Drop,
  window: Omit<Drop, "no">,
): Drop | undefined {
  if (narrows(drop, window)) return undefined;
  return overlappingDrop(
    drops.filter((d) => d.no !== drop.no),
    window,
  );
}

/**
 * Whether a window only NARROWS an issue's days — opens no earlier and closes
 * no later than `drop` does now. Such a move is never refused, by the overlap
 * rule (B14) or the order rule (B14b): it cannot make a clash that was not
 * there already.
 */
function narrows(drop: Drop, window: Omit<Drop, "no">): boolean {
  return (
    Date.parse(window.opensAt) >= Date.parse(drop.opensAt) &&
    Date.parse(window.closesAt) <= Date.parse(drop.closesAt)
  );
}

/**
 * Which neighbour a window is on the wrong side of (slice B14b), as
 * `admin_add_drop()` and `admin_schedule_drop()` say it in their HINT:
 * `PREVIOUS` when it opens before the previous issue closes, `NEXT` when it
 * closes after the next issue opens.
 */
export type OrderSide = "PREVIOUS" | "NEXT";

export interface OrderClash {
  side: OrderSide;
  /** The neighbour the window is on the wrong side of. */
  drop: Drop;
}

/**
 * The issues run in the order of their numbers (slice B14b): issue `no` with
 * this window opens no earlier than the PREVIOUS issue closes — the nearest
 * lower number there is — and closes no later than the NEXT one opens — the
 * nearest higher number. Opening the very instant the previous one closes,
 * or closing the instant the next one opens, is fine, as for an overlap.
 * Undefined when the window keeps the order, else the side it breaks and the
 * neighbour it breaks it with, the previous one first when it breaks both
 * (only possible on a calendar already out of order).
 *
 * Why: until this slice "Sửa giờ" could move Số 07 before Số 06 without the
 * two sharing an instant, and the eight places that assume the numbers run in
 * order (listed in `tasks/plan.md` after slice B14) — the calendar of issues,
 * the feed, the share image, `/so`, the opening reminders, the teasers on
 * "Các số", "Nhân bản" for a code, the overview — then said the wrong thing.
 *
 * One function for both moves:
 *
 *   · "Tạo số" — `no` is not in `drops` yet, and is always the highest
 *     number plus one, so only the previous issue counts;
 *   · "Sửa giờ" — `no` is in `drops`: it is not compared with itself, and a
 *     window that only narrows its days is never refused (`narrows`), so
 *     "Đóng sớm" closes even on a calendar already out of order.
 *
 * An overlap is a different refusal, asked first (`overlappingDrop`,
 * `scheduleClash`): a window that does both says the overlap.
 * `admin_add_drop` and `admin_schedule_drop` ask the same, in that order.
 */
export function orderClash(
  drops: readonly Drop[],
  no: number,
  window: Omit<Drop, "no">,
): OrderClash | undefined {
  const own = drops.find((d) => d.no === no);
  if (own && narrows(own, window)) return undefined;

  let previous: Drop | undefined;
  let next: Drop | undefined;
  for (const d of drops) {
    if (d.no < no && (!previous || d.no > previous.no)) previous = d;
    if (d.no > no && (!next || d.no < next.no)) next = d;
  }
  if (previous && Date.parse(window.opensAt) < Date.parse(previous.closesAt)) {
    return { side: "PREVIOUS", drop: previous };
  }
  if (next && Date.parse(window.closesAt) > Date.parse(next.opensAt)) {
    return { side: "NEXT", drop: next };
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────── the teasers
/** A teaser, as `admin_add_teaser()` takes it. */
export interface TeaserRow {
  slug: string;
  name: string;
  /** "Áo khoác dù" — `Teaser.kind`, named `garment` on the wire. */
  garment: string;
  family: Family;
  dropNo: number;
  photoKey: string;
}

/** Longest teaser name, and longest kind — the database's own limits. */
export const MAX_TEASER_NAME = 40;
const MAX_KIND = 80;

/**
 * The photos a teaser may borrow: every one the catalogue already uses, on a
 * style or on another teaser. There is no product photography (PRODUCT.md),
 * so a new key would be a broken image.
 */
export function borrowedPhotoKeys(catalog: Catalog): string[] {
  return [
    ...new Set([
      ...catalog.products.flatMap((p) => p.photoKeys),
      ...catalog.teasers.map((t) => t.photoKey),
    ]),
  ];
}

/** The family the catalogue files a kind under, or undefined for a new kind. */
export function familyOfKind(catalog: Catalog, kind: string): Family | undefined {
  return catalog.products.find((p) => p.kind === kind)?.family;
}

/**
 * "Thêm mẫu hé lộ", as the sheet sends it — the issue, a name, a kind the
 * catalogue uses and a borrowed photo — turned into the row to write. The
 * name is written in capitals like every style's; the family and the slug
 * are derived here, never taken from the browser.
 *
 * The slug is `slugFor(name, issue)` (v3 slice 12, the main session's
 * answer F.1 to slice B5): `s06-soi`, the pattern every issue's style and
 * every fixture teaser has, not a second one. The same teaser announced twice
 * is the same address, which the database refuses as taken.
 */
export function readTeaser(value: unknown, catalog: Catalog, locale: Locale = "vi"): Checked<TeaserRow> {
  const t = picker(locale);
  if (!isRecord(value)) return no(t({ vi: "Cần tên, loại và một ảnh.", en: "A name, a type and a photo are needed." }));
  const dropNo = readDropNo(value.dropNo);
  if (dropNo === null) return no(t({ vi: "Chọn số cho mẫu hé lộ.", en: "Choose a drop for the teaser." }));
  const name = text(value.name).toLocaleUpperCase("vi");
  if (name === "" || name.length > MAX_TEASER_NAME) return no(t(NAME_TEXT));
  const garment = text(value.garment);
  const family = familyOfKind(catalog, garment);
  if (garment === "" || garment.length > MAX_KIND || !family) return no(t(KIND_TEXT));
  const photoKey = text(value.photoKey);
  if (!borrowedPhotoKeys(catalog).includes(photoKey)) return no(t({ vi: "Chọn một ảnh.", en: "Choose a photo." }));
  return ok({ slug: slugFor(name, dropNo), name, garment, family, dropNo, photoKey });
}

// ───────────────────────────────────────────────────────────────── the codes
/** The three shapes a code can take. */
export type PromoKind = Promotion["kind"];

const PROMO_KINDS: readonly PromoKind[] = ["PERCENT", "AMOUNT", "FREE_SHIPPING"];

/**
 * A code's terms, the way `public.read_promo_terms()` normalises them: every
 * field present, "none" as null. The table write and the log's before/after
 * both use this shape, so "nothing changed" is one comparison.
 */
export interface PromoTerms {
  kind: PromoKind;
  percent: number | null;
  maxDiscountVnd: number | null;
  amountVnd: number | null;
  minOrderVnd: number | null;
  usageLimit: number | null;
  startsAt: string;
  endsAt: string;
}

/** Longest code the database takes. */
export const MAX_PROMO_CODE = 40;

/** The terms a code in the catalogue carries now. */
export function termsOf(p: Promotion): PromoTerms {
  return {
    kind: p.kind,
    percent: p.kind === "PERCENT" ? p.percent : null,
    maxDiscountVnd: p.kind === "PERCENT" ? (p.maxDiscountVnd ?? null) : null,
    amountVnd: p.kind === "AMOUNT" ? p.amountVnd : null,
    minOrderVnd: p.minOrderVnd ?? null,
    usageLimit: p.usageLimit,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
  };
}

export function sameTerms(a: PromoTerms, b: PromoTerms): boolean {
  return (Object.keys(a) as Array<keyof PromoTerms>).every((k) => a[k] === b[k]);
}

/**
 * The code form's draft — `PromoDraft` in `lib/promo-form.ts`,
 * where a cap or a minimum of 0 means "none" and a blank limit is null —
 * read into a code and its terms. Only the fields the kind carries survive:
 * the sheet keeps an amount in its state while the percentage tab is open,
 * and the table's check constraint would refuse a PERCENT row carrying one.
 */
export function readPromoDraft(value: unknown, locale: Locale = "vi"): Checked<{ code: string; terms: PromoTerms }> {
  const t = picker(locale);
  if (!isRecord(value)) return no(t(PROMO_BAD_TEXT));
  const code = normalisePromoCode(typeof value.code === "string" ? value.code : "");
  if (code === "" || code.length > MAX_PROMO_CODE) {
    return no(t({
      vi: "Nhập mã. Đây là thứ khách gõ ở ô giảm giá.",
      en: "Enter the code. It's what shoppers type in the discount box.",
    }));
  }

  const kind = value.promoKind;
  if (typeof kind !== "string" || !(PROMO_KINDS as readonly string[]).includes(kind)) {
    return no(t({ vi: "Chọn loại mã.", en: "Choose the code's type." }));
  }

  const { percent, amountVnd, maxDiscountVnd, minOrderVnd, usageLimit, startsAt, endsAt } = value;
  if (![percent, amountVnd, maxDiscountVnd, minOrderVnd].every(isCount)) {
    return no(t({
      vi: "Số tiền và phần trăm phải là số nguyên, không âm.",
      en: "Amounts and percentages must be whole numbers, not negative.",
    }));
  }
  if (usageLimit !== null && !(isCount(usageLimit) && usageLimit >= 1)) {
    return no(t({
      vi: "Giới hạn lượt để trống, hoặc từ 1 trở lên.",
      en: "Leave the use limit empty, or make it 1 or more.",
    }));
  }
  if (!isVnInstant(startsAt) || !isVnInstant(endsAt)) {
    return no(t({ vi: "Nhập thời gian theo dạng 20:00 11/09/2026.", en: "Enter times as 20:00 11/09/2026." }));
  }
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    return no(t({ vi: "Giờ kết thúc phải sau giờ bắt đầu.", en: "The end must be after the start." }));
  }

  const pct = percent as number;
  const amount = amountVnd as number;
  const cap = maxDiscountVnd as number;
  const min = minOrderVnd as number;

  if (kind === "PERCENT" && (pct < 1 || pct > 100)) {
    return no(t({ vi: "Phần trăm phải nằm giữa 1 và 100.", en: "The percentage must be between 1 and 100." }));
  }
  if (kind === "AMOUNT" && amount < 1) {
    return no(t({ vi: "Số tiền giảm phải lớn hơn 0.", en: "The discount must be more than 0." }));
  }

  return ok({
    code,
    terms: {
      kind: kind as PromoKind,
      percent: kind === "PERCENT" ? pct : null,
      maxDiscountVnd: kind === "PERCENT" && cap > 0 ? cap : null,
      amountVnd: kind === "AMOUNT" ? amount : null,
      minOrderVnd: min > 0 ? min : null,
      usageLimit: usageLimit as number | null,
      startsAt,
      endsAt,
    },
  });
}

// ────────────────────────────────────────────────────────────── the styles
/** What "Sửa mẫu" may change — `admin_update_product()`'s patch. Never the cut. */
export interface ProductPatch {
  name?: string;
  kind?: string;
  slug?: string;
  priceVnd?: number;
  material?: string;
  fit?: Fit;
  dropNo?: number;
}

/** The database's limits on a style's own fields. */
export const MAX_PRODUCT_NAME = 40;
export const MAX_SLUG = 80;
export const MAX_MATERIAL = 200;

const SLUG = /^[a-z0-9-]+$/;

export function isSlug(value: string): boolean {
  return value.length <= MAX_SLUG && SLUG.test(value);
}

/**
 * The product form, read against the style as the catalogue has it now:
 * every field checked, then only the ones that CHANGED kept — the patch the
 * database writes and the event keeps. The name is written in capitals like
 * every style's; an empty address segment is made from the name, as the
 * field's own help line promises ("Tự sinh từ tên nếu để trống") — by
 * `slugFor`, as a new style's is (v3 slice 12, answer F.2): the issue the form
 * names in front of it, none for a fixed style.
 */
export function productPatch(
  product: Product,
  value: unknown,
  catalog: Catalog,
  locale: Locale = "vi",
): Checked<ProductPatch> {
  const t = picker(locale);
  if (!isRecord(value)) return no(t(PRODUCT_BAD_TEXT));

  const name = text(value.name).toLocaleUpperCase("vi");
  if (name === "" || name.length > MAX_PRODUCT_NAME) return no(t(NAME_TEXT));

  const kind = text(value.kind);
  if (kind === "" || kind.length > MAX_KIND) return no(t(KIND_TEXT));

  // A style keeps its kind for good (slice B5): an issue's style may move to
  // another issue, a fixed style stays fixed and its form sends no issue.
  // `admin_update_product()` refuses the crossing either way (`BAD_INPUT`).
  // Read before the address, which an emptied box makes from it.
  let dropNo: number | null = null;
  if (isFixed(product)) {
    if (value.dropNo !== null && value.dropNo !== undefined) {
      return no(catalogFailureMessage("UPDATE_PRODUCT", "BAD_INPUT", "", locale));
    }
  } else {
    dropNo = readDropNo(value.dropNo);
    if (dropNo === null || !catalog.dropByNo.has(dropNo)) return no(t({ vi: "Chọn một số.", en: "Choose a drop." }));
  }

  const slug = text(value.slug) || slugFor(name, dropNo);
  if (!isSlug(slug)) {
    return no(t({
      vi: "Mã trên địa chỉ chỉ gồm chữ thường không dấu, số và gạch ngang.",
      en: "The URL slug takes only plain lower-case letters, digits and hyphens.",
    }));
  }
  if (catalog.products.some((p) => p.slug === slug && p.id !== product.id)) {
    return no(catalogFailureMessage("UPDATE_PRODUCT", "NOT_ALLOWED", slug, locale));
  }

  const priceVnd = value.priceVnd;
  if (!isCount(priceVnd) || priceVnd < 1) return no(t({ vi: "Nhập giá bán lớn hơn 0.", en: "Enter a price above 0." }));

  const material = text(value.material);
  if (material === "" || material.length > MAX_MATERIAL) return no(t(MATERIAL_TEXT));

  const fit = value.fit === undefined ? product.fit : value.fit;
  if (fit !== "OVERSIZE" && fit !== "REGULAR") return no(t(FIT_TEXT));

  const patch: ProductPatch = {};
  if (name !== product.name) patch.name = name;
  if (kind !== product.kind) patch.kind = kind;
  if (slug !== product.slug) patch.slug = slug;
  if (priceVnd !== product.priceVnd) patch.priceVnd = priceVnd;
  if (material !== product.material) patch.material = material;
  if (fit !== product.fit) patch.fit = fit;
  if (dropNo !== null && dropNo !== product.dropNo) patch.dropNo = dropNo;
  return ok(patch);
}

/** Whether a patch changes anything at all. */
export function isEmptyPatch(patch: ProductPatch): boolean {
  return Object.keys(patch).length === 0;
}

/** "Số 07" — how the messages above name an issue. */
export const dropSubject = (no: number, locale: Locale = "vi"): string => issueLabel(no, locale);

// ───────────────────────────────────────────────────────────── a new style
/**
 * The limits of a new style (slice B3c), each restated by
 * `admin_add_product()`: a price a shop would print, an address segment of
 * 2–40 characters that starts with a letter or a digit, one to seven colours
 * (the palette has seven), and at most 999 pieces in one colour and size.
 */
export const MIN_PRICE_VND = 1_000;
export const MAX_PRICE_VND = 99_999_999;
export const MAX_NEW_SLUG = 40;
export const MAX_COLORS = COLOR_KEYS.length;
export const MAX_CUT_PER_CELL = 999;

const NEW_SLUG = /^[a-z0-9][a-z0-9-]{1,39}$/;

/** Whether a segment is one a new style may take — shape only. */
export function isNewSlug(value: string): boolean {
  return NEW_SLUG.test(value);
}

/**
 * The address segment a name makes: "SỎI" → "soi", "ĐÁ CUỘI" → "da-cuoi" —
 * `asciiSlug`, cut to 40 characters. A name that leaves fewer than two
 * letters or digits gets "mau" in front of what it left ("mau" alone for
 * none), so the segment is always one the database takes. Empty only for an
 * empty name, so the form's placeholder can follow the name as it is typed.
 */
export function productSlug(name: string, max = MAX_NEW_SLUG): string {
  if (name.trim() === "") return "";
  const base = asciiSlug(name).slice(0, max).replace(/-+$/, "");
  if (base.length >= 2) return base;
  return base ? `mau-${base}` : "mau";
}

/**
 * The address segment "Tạo mẫu" makes when its box is left empty (slice B5):
 * a style of issue 06 is `s06-` and its name's segment — "SỎI" → `s06-soi` —
 * because a name can come back in a later issue and the address has to tell
 * the two apart; a fixed style (`dropNo` null) is its name's segment alone.
 * The name's part is cut so the whole stays within 40 characters. Empty for
 * an empty name, like `productSlug`. `uniqueSlug` then adds `-2`, `-3` when
 * it is taken, as before.
 */
export function slugFor(name: string, dropNo: number | null): string {
  if (dropNo === null) return productSlug(name);
  const prefix = `${issueCode(dropNo).toLowerCase()}-`;
  const base = productSlug(name, MAX_NEW_SLUG - prefix.length);
  return base === "" ? "" : `${prefix}${base}`;
}

/**
 * Whether a segment is taken: by another style's address, or by the id it
 * would make (`p-<slug>`) — a style whose address was edited keeps its old
 * id, and a new style cannot be given that id again.
 */
export function slugTaken(slug: string, catalog: Catalog): boolean {
  return catalog.products.some((p) => p.slug === slug || p.id === `p-${slug}`);
}

/**
 * `base` if nobody has it, else `base-2`, `base-3`, … — what an empty
 * address box becomes. The catalogue passed in has to be the manager's, which
 * holds the styles of issues that have not opened too.
 */
export function uniqueSlug(base: string, catalog: Catalog): string {
  if (!slugTaken(base, catalog)) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, MAX_NEW_SLUG - suffix.length).replace(/-+$/, "")}${suffix}`;
    if (!slugTaken(candidate, catalog)) return candidate;
  }
}

/**
 * Whether a photo key may be sent: a borrowed frame the catalogue uses
 * (`borrowedPhotoKeys`), or the shape of an upload. Whether an upload really
 * is in the bucket is the database's to say (`photo_key_ok`), not a form's.
 */
export function isPickablePhoto(key: string, catalog: Catalog): boolean {
  return isUploadedKey(key) || borrowedPhotoKeys(catalog).includes(key);
}

/**
 * The photos a form sent, colour → key, for the colours given: absent means
 * none; an empty key is left out (no photo chosen for that colour); a colour
 * the style does not have is a bad request; a key that is not a photo is
 * `PHOTO_UNKNOWN`'s sentence, naming the colour.
 */
export function readPhotoMap(
  value: unknown,
  colors: readonly ColorKey[],
  catalog: Catalog,
  locale: Locale = "vi",
): Checked<Partial<Record<ColorKey, string>>> {
  if (value === undefined || value === null) return ok({});
  if (!isRecord(value)) return no(catalogFailureMessage("ADD_PRODUCT", "BAD_INPUT", "", locale));
  const photos: Partial<Record<ColorKey, string>> = {};
  for (const [color, raw] of Object.entries(value)) {
    if (!(colors as readonly string[]).includes(color)) {
      return no(catalogFailureMessage("ADD_PRODUCT", "BAD_INPUT", "", locale));
    }
    if (raw !== undefined && raw !== null && typeof raw !== "string") {
      return no(catalogFailureMessage("ADD_PRODUCT", "BAD_INPUT", "", locale));
    }
    const key = text(raw);
    if (key === "") continue;
    if (!isPickablePhoto(key, catalog)) {
      return no(catalogFailureMessage("ADD_PRODUCT", "PHOTO_UNKNOWN", colorLabelOf(color, locale), locale));
    }
    photos[color as ColorKey] = key;
  }
  return ok(photos);
}

/**
 * A new band order for a style's colours: exactly the colours it has, each
 * once, in any order. Colours are fixed when the cloth is cut (QĐ-27) — this
 * never adds or drops one.
 */
export function readColorOrder(
  value: unknown,
  current: readonly ColorKey[],
  locale: Locale = "vi",
): Checked<ColorKey[]> {
  const bad = no<ColorKey[]>(picker(locale)({
    vi: "Thứ tự màu phải gồm đúng các màu của mẫu, chốt lúc cắt.",
    en: "The colour order must hold exactly the style's colours, fixed when it was cut.",
  }));
  if (!Array.isArray(value) || value.length !== current.length) return bad;
  const seen = new Set<string>();
  for (const c of value) {
    if (typeof c !== "string" || !(current as readonly string[]).includes(c) || seen.has(c)) return bad;
    seen.add(c);
  }
  return ok(value as ColorKey[]);
}

/** Whether two band orders are the same order. */
export function sameOrder(a: readonly ColorKey[], b: readonly ColorKey[]): boolean {
  return a.length === b.length && a.every((c, i) => c === b[i]);
}

/** Pieces to cut, colour by colour, all four sizes spelled out. */
export type CutGrid = Partial<Record<ColorKey, Record<Size, number>>>;

/** A new style exactly as `admin_add_product()` takes it. */
export interface NewProductInput {
  name: string;
  kind: string;
  /** Derived from the kind, never taken from the browser (`familyOfKind`). */
  family: Family;
  fit: Fit;
  slug: string;
  priceVnd: number;
  material: string;
  /** The issue it is cut for, or null for a fixed style (slice B5). */
  dropNo: number | null;
  /** Band order; one photo each, a borrowed key or an upload's. */
  colors: Array<{ color: ColorKey; photoKey: string }>;
  /** The pieces to cut — for a fixed style, the pieces it opens with. */
  cells: CutGrid;
}

/**
 * "Tạo mẫu", as the form sends it — `{ name, kind, fit, slug?, priceVnd,
 * material, dropNo, colors, photos, cells }` (the action's contract) — read
 * against the manager's catalogue into the document the database writes.
 *
 * Every field is checked with the sentence the form shows, in the form's
 * order; the name is written in capitals like every style's; the family
 * comes from the kind (a kind no style wears yet is refused — a new kind is
 * a later change); an empty address box becomes the name's segment, made
 * unique with `-2`, `-3`; a typed one that is taken is refused. The cut
 * grid is rebuilt from the colours chosen, four sizes each, so a colour the
 * form dropped cannot leave numbers behind. Whether the issue is still open
 * depends on the clock, so the action asks that (`DROP_CLOSED`).
 *
 * Slice B5: `dropNo: null` — sent as null, not left out — is a FIXED style,
 * one that belongs to no issue; its grid is the stock it opens with, and its
 * empty address box becomes the bare name's segment (`slugFor`).
 */
export function readNewProduct(value: unknown, catalog: Catalog, locale: Locale = "vi"): Checked<NewProductInput> {
  const t = picker(locale);
  const bad = no<NewProductInput>(catalogFailureMessage("ADD_PRODUCT", "BAD_INPUT", "", locale));
  if (!isRecord(value)) return bad;

  const name = text(value.name).toLocaleUpperCase("vi");
  if (name === "" || name.length > MAX_PRODUCT_NAME) return no(t(NAME_TEXT));

  const kind = text(value.kind);
  if (kind === "" || kind.length > MAX_KIND) return no(t(KIND_TEXT));
  const family = familyOfKind(catalog, kind);
  if (!family) return no(t({ vi: "Loại chưa có trong mục lục", en: "That type isn't in the catalogue" }));

  const fit = value.fit;
  if (fit !== "OVERSIZE" && fit !== "REGULAR") return no(t(FIT_TEXT));

  let dropNo: number | null = null;
  if (value.dropNo !== null) {
    dropNo = readDropNo(value.dropNo);
    if (dropNo === null || !catalog.dropByNo.has(dropNo)) return no(t({ vi: `Chọn một ${LEX.tl}.`, en: "Choose a drop." }));
  }

  const priceVnd = value.priceVnd;
  if (!isCount(priceVnd) || priceVnd < MIN_PRICE_VND || priceVnd > MAX_PRICE_VND) {
    return no(t({
      vi: "Nhập giá bán từ 1.000₫ đến 99.999.999₫.",
      en: `Enter a price from ${vnd(MIN_PRICE_VND, "en")} to ${vnd(MAX_PRICE_VND, "en")}.`,
    }));
  }

  const material = text(value.material);
  if (material === "" || material.length > MAX_MATERIAL) return no(t(MATERIAL_TEXT));

  // ── the colours, in band order
  const sent = value.colors;
  if (sent !== undefined && !Array.isArray(sent)) return bad;
  const colors = (Array.isArray(sent) ? sent : []) as unknown[];
  if (colors.length === 0) return no(catalogFailureMessage("ADD_PRODUCT", "NO_COLORS", "", locale));
  if (colors.length > MAX_COLORS) return bad;
  for (const [i, c] of colors.entries()) {
    if (typeof c !== "string" || !(COLOR_KEYS as readonly string[]).includes(c)) return bad;
    if (colors.indexOf(c) !== i) return bad;
  }
  const keys = colors as ColorKey[];

  // ── the cut, colour by colour: 0–999 a cell, at least one piece a colour
  const grid = value.cells;
  if (grid !== undefined && grid !== null && !isRecord(grid)) return bad;
  const cells: CutGrid = {};
  for (const color of keys) {
    const sizes = isRecord(grid) ? grid[color] : undefined;
    if (sizes !== undefined && sizes !== null && !isRecord(sizes)) return bad;
    const row = {} as Record<Size, number>;
    let pieces = 0;
    for (const size of SIZES) {
      const n = isRecord(sizes) && sizes[size] !== undefined ? sizes[size] : 0;
      if (!isCount(n) || n > MAX_CUT_PER_CELL) {
        return no(t({ vi: `Số cắt mỗi ô từ 0 đến ${MAX_CUT_PER_CELL}.`, en: `The cut per cell is 0 to ${MAX_CUT_PER_CELL}.` }));
      }
      row[size] = n;
      pieces += n;
    }
    if (pieces === 0) return no(catalogFailureMessage("ADD_PRODUCT", "COLOR_EMPTY", colorLabel(color, locale), locale));
    cells[color] = row;
  }

  // ── a photo for every colour
  const photos = readPhotoMap(value.photos, keys, catalog, locale);
  if (!photos.ok) return no(photos.error);
  for (const color of keys) {
    if (!photos.value[color]) {
      return no(catalogFailureMessage("ADD_PRODUCT", "PHOTO_MISSING", colorLabel(color, locale), locale));
    }
  }

  // ── the address segment
  const typed = text(value.slug);
  let slug: string;
  if (typed === "") {
    slug = uniqueSlug(slugFor(name, dropNo), catalog);
  } else {
    if (!isNewSlug(typed)) {
      return no(t({
        vi: "Mã trên địa chỉ gồm 2–40 chữ thường không dấu, số và gạch ngang.",
        en: `The URL slug is 2 to ${MAX_NEW_SLUG} plain lower-case letters, digits and hyphens.`,
      }));
    }
    if (slugTaken(typed, catalog)) return no(t(SLUG_TAKEN_TEXT));
    slug = typed;
  }

  return ok({
    name,
    kind,
    family,
    fit,
    slug,
    priceVnd,
    material,
    dropNo,
    colors: keys.map((color) => ({ color, photoKey: photos.value[color]! })),
    cells,
  });
}

/** Every piece a new style's grid cuts — its `cutUnits`. */
export function cutTotal(cells: CutGrid): number {
  let n = 0;
  for (const row of Object.values(cells)) for (const size of SIZES) n += row?.[size] ?? 0;
  return n;
}
