import type { Order, OrderState } from "@/data/types";
import { effectiveStatus } from "./customer-orders";
import { cancelReasonLabel } from "./feed-account";
import { picker, plural, type Locale } from "./i18n";
import { DELIVERY_OPTIONS } from "./shipping";

/**
 * The back office's side of an order, since slice B3a moved every move the
 * shop makes on one into Postgres (`supabase/migrations/…_admin.sql`).
 *
 * Pure, like every rule module: the DAL (`lib/db/admin.ts`) fetches, the
 * Server Actions (`lib/actions/admin.ts`) write, and this file holds what both
 * sides and the screens have to agree on — which moves an order allows, what
 * a form may send, and what the shop is told when a move goes through or
 * does not.
 */

// ───────────────────────────────────────────────────────────── the shapes
/**
 * The account an order belongs to, as the back office reads it.
 *
 * `id` is the auth uuid, which `Order.customerId` deliberately never carries
 * (an order read through the public lookup must not bring its owner's
 * account id along). The manager may know it: it is how an order placed by a
 * real sign-up — who has no fixture handle — finds its customer.
 */
export interface OrderOwner {
  id: string;
  /** "c-minhanh" for a demo shopper, null for somebody who signed up. */
  handle: string | null;
  /** Shown as-is. */
  name: string;
  email: string;
  /** Ten digits starting with zero, or "". */
  phone: string;
  joinedAt: string;
}

/** An order and whose it is — null for one placed signed out. */
export type AdminOrder = Order & { owner: OrderOwner | null };

/** The frozen delivery address an order carries. */
export type ShipTo = Order["shipTo"];

// ─────────────────────────────────────────── sample or real (QĐ-44, B17)
/**
 * Whether an order is part of the sample: copied from `seed_orders` by
 * `reset_demo()`, or placed by a sample account — a visitor who pressed "Đăng
 * nhập thử" and ordered. Anything else — a guest's order, an order of an
 * account somebody signed up for — belongs to a real person, and the public
 * back office shows it masked (`lib/admin-mask.ts`).
 *
 * Read off `customerId`, which is `orders.customer_handle` as `order_json()`
 * writes it, and that column is written by exactly the two doors the rule
 * names: `reset_demo()` copies it from `seed_orders` (every sample order has
 * one — `data/orders.ts` cannot build an order without its customer), and
 * `place_order()` copies the placing profile's handle, which only a sample
 * account has. A guest's and a real account's order carry none. It is frozen
 * at placement, so nothing done to an account later turns its orders into
 * sample ones; when in doubt, an order reads as real, which masks it.
 */
export function isSampleOrder(o: Pick<Order, "customerId">): boolean {
  return String(o.customerId) !== "";
}

/**
 * The same question asked of a raw `order_json()` document (the address
 * edit's guard in `lib/actions/admin.ts`), without reading the rest of it:
 * a sample order is one whose `customerId` is a non-empty string. Anything
 * else — a real order, or a document not shaped like one — answers false.
 */
export function isSampleOrderJson(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const id = (value as Record<string, unknown>).customerId;
  return typeof id === "string" && id !== "";
}

/**
 * Why "Sửa địa chỉ" refuses a real customer's order (QĐ-44): the order
 * screen does not offer the edit there, so only a direct call ever reads it.
 */
export function realAddressMessage(code: string, locale: Locale = "vi"): string {
  return picker(locale)({
    vi: `${code} là đơn của khách thật, không sửa địa chỉ được.`,
    en: `${code} is a real customer's order. Its address can't be changed.`,
  });
}

// ───────────────────────────────────────────────────────────── the guard
/**
 * The next move on an order, and whose hand it is in: the SQL guard read as a
 * to-do list, so the screen draws the one button that will work (DESIGN.md §9
 * rule 3) and the queue lists exactly the orders waiting on the shop.
 *
 * Read through `effectiveStatus`: a transfer whose twelve hours ran out is
 * cancelled here, as on every screen — and the database refuses to confirm,
 * ship, re-address or cancel it for the same reason.
 *
 *   · AWAITING_TRANSFER → confirm the money arrived — a transfer, or a card
 *                         order, which pays by transfer since slice B7;
 *   · RECEIVED, COD     → hand it over: the money is collected at the door;
 *   · RECEIVED, card    → a card order taken before B7: confirm the money by
 *                         hand before anything ships;
 *   · PAID              → hand it over;
 *   · SHIPPING          → record the delivery (no courier reports it);
 *   · DELIVERED, CANCELLED → nothing is left to do.
 */
export type NextMove = "MARK_PAID" | "HAND_OVER" | "MARK_DELIVERED";

export function nextMove(o: Order, now: Date): NextMove | null {
  const state = effectiveStatus(o, now).state;
  switch (state) {
    case "AWAITING_TRANSFER":
      return "MARK_PAID";
    case "RECEIVED":
      return o.payment === "COD" ? "HAND_OVER" : "MARK_PAID";
    case "PAID":
      return "HAND_OVER";
    case "SHIPPING":
      return "MARK_DELIVERED";
    default:
      return null;
  }
}

/** The states the shop may still cancel or re-address from: nothing has left. */
const BEFORE_HANDOVER: readonly OrderState[] = ["AWAITING_TRANSFER", "RECEIVED", "PAID"];

/** `admin_cancel_order()`'s guard. The pieces go back on the shelf. */
export function canCancel(o: Order, now: Date): boolean {
  return BEFORE_HANDOVER.includes(effectiveStatus(o, now).state);
}

/** `admin_edit_address()`'s guard: the same edge — before the parcel leaves. */
export function canEditAddress(o: Order, now: Date): boolean {
  return canCancel(o, now);
}

/** Money has actually been received on this order — not merely promised. */
export function isPaidFor(o: Order): boolean {
  const s = o.status.state;
  // A COD order in transit has collected nothing yet; it pays at the door.
  if (s === "SHIPPING") return o.payment !== "COD";
  return s === "PAID" || s === "DELIVERED";
}

// ─────────────────────────────────────────────────────────── the forms
/**
 * Why the shop cancels, in its own words — four, fixed (user, 22/09). The
 * shopper is shown the one chosen, on their own order screen.
 */
export const CANCEL_REASONS = [
  "Khách đổi ý",
  "Quá hạn chuyển khoản",
  "Hết hàng thật",
  "Khác",
] as const;

export function isCancelReason(value: string): boolean {
  return (CANCEL_REASONS as readonly string[]).includes(value);
}

/**
 * The delivery services the shop sells — what a handover records as the
 * carrier, because no courier has been signed (`lib/shipping.ts`).
 */
export function isCarrier(value: string): boolean {
  return DELIVERY_OPTIONS.some((o) => o.label === value);
}

/** Longest tracking number a label carries, in characters. */
export const MAX_TRACKING_LENGTH = 40;

/** A tracking number as the shop typed it, the way the database stores it. */
export function normaliseTrackingCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Letters, digits, dots and dashes — what couriers print — and not empty.
 * The same pattern `admin_hand_over()` checks.
 */
export function isTrackingCode(code: string): boolean {
  return code.length <= MAX_TRACKING_LENGTH && /^[A-Z0-9][A-Z0-9.-]*$/.test(code);
}

// ──────────────────────────────────────────────────────── what went wrong
/** The codes the `admin_*` functions raise, and nothing else. */
export const ADMIN_ERROR_CODES = ["NOT_ADMIN", "NOT_FOUND", "NOT_ALLOWED", "BAD_INPUT"] as const;

export type AdminErrorCode = (typeof ADMIN_ERROR_CODES)[number];

/** A refusal the database named, or `UNAVAILABLE` for anything it did not. */
export type AdminFailure = AdminErrorCode | "UNAVAILABLE";

/** `raise exception using message = 'NOT_ALLOWED'` arrives as SQLSTATE P0001. */
export function adminFailureOf(error: { code?: string; message?: string } | null): AdminFailure {
  if (!error) return "UNAVAILABLE";
  const message = error.message ?? "";
  return error.code === "P0001" && (ADMIN_ERROR_CODES as readonly string[]).includes(message)
    ? (message as AdminErrorCode)
    : "UNAVAILABLE";
}

/** Every move the back office writes to the database. */
export type AdminMove =
  | "MARK_PAID"
  | "HAND_OVER"
  | "MARK_DELIVERED"
  | "CANCEL"
  | "NOTE"
  | "EDIT_ADDRESS"
  | "RESET";

/**
 * The sentence for a move that did not go through, naming what to do next.
 *
 * `NOT_ALLOWED` almost always means the order moved on while the screen was
 * open — somebody else confirmed it, the hold ran out — so the sentence says
 * to look again rather than to try again.
 *
 * In both languages since round v6 slice E0 (QĐ-40), where the reset of the
 * sample data (`resetDemo`) asks for it in the visitor's language; the order
 * screens pass theirs when they move to English.
 */
export function adminFailureMessage(move: AdminMove, failure: AdminFailure, code = "", locale: Locale = "vi"): string {
  const t = picker(locale);
  switch (failure) {
    case "NOT_ADMIN":
      return t({
        vi: "Phiên quản trị đã hết — đăng nhập lại bằng tài khoản quản trị.",
        en: "Your admin session has ended. Sign in again with an admin account.",
      });
    case "NOT_FOUND":
      return code
        ? t({ vi: `Không tìm thấy đơn ${code}.`, en: `Order ${code} not found.` })
        : t({ vi: "Không tìm thấy đơn này.", en: "Order not found." });
    case "NOT_ALLOWED":
      switch (move) {
        case "MARK_PAID":
          return t({
            vi: `${code} không còn chờ tiền — tải lại trang để xem trạng thái mới.`,
            en: `${code} is no longer awaiting payment. Reload the page to see its status.`,
          });
        case "HAND_OVER":
          return t({
            vi: `${code} chưa bàn giao được ở trạng thái này — tải lại trang để xem.`,
            en: `${code} can't be handed over in this state. Reload the page to check.`,
          });
        case "MARK_DELIVERED":
          return t({
            vi: `${code} không còn ở bước đang giao — tải lại trang để xem.`,
            en: `${code} is no longer shipping. Reload the page to check.`,
          });
        case "CANCEL":
          return t({
            vi: `${code} đã bàn giao hoặc đã đóng, không huỷ được nữa.`,
            en: `${code} has been handed over or closed and can no longer be cancelled.`,
          });
        case "EDIT_ADDRESS":
          return t({
            vi: `${code} đã bàn giao hoặc đã đóng, không sửa địa chỉ được nữa.`,
            en: `${code} has been handed over or closed. Its address can no longer be changed.`,
          });
        default:
          return t({
            vi: "Thao tác này không còn làm được — tải lại trang để xem.",
            en: "This can no longer be done. Reload the page to check.",
          });
      }
    case "BAD_INPUT":
      switch (move) {
        case "HAND_OVER":
          return t({
            vi: "Mã vận đơn chỉ gồm chữ, số, dấu chấm và gạch ngang, tối đa 40 ký tự.",
            en: "A tracking number can only contain letters, digits, dots and hyphens, up to 40 characters.",
          });
        case "CANCEL":
          return t({ vi: "Chọn một lý do trước khi huỷ.", en: "Choose a reason before cancelling." });
        case "NOTE":
          return t({
            vi: "Ghi chú trống hoặc quá dài — tối đa 500 ký tự.",
            en: "The note is empty or longer than 500 characters.",
          });
        case "EDIT_ADDRESS":
          return t({
            vi: "Địa chỉ chưa đủ hoặc số điện thoại chưa đúng — kiểm lại các ô.",
            en: "The address is incomplete or the phone number is wrong. Check the fields.",
          });
        default:
          return t({ vi: "Thông tin gửi lên chưa hợp lệ.", en: "The submitted data isn't valid." });
      }
    case "UNAVAILABLE":
      return t({ vi: "Chưa lưu được. Thử lại sau ít phút.", en: "Couldn't save. Try again in a few minutes." });
  }
}

/**
 * "3 đơn → đã thanh toán · đã lưu", or with the ones that did not move.
 *
 * The bulk bar confirms each order on its own (one `admin_mark_paid()` per
 * code), so the sentence has to say how many went through and how many did
 * not — a single "đã lưu" over a half-failed batch would be a lie. In English
 * since round v6 slice E4.
 */
export function bulkPaidMessage(done: number, failed: number, locale: Locale = "vi"): string {
  if (locale === "en") return bulkPaidMessageEn(done, failed);
  if (done === 0) return `Chưa đánh dấu được đơn nào · ${failed} đơn không còn chờ tiền`;
  return failed === 0
    ? `${done} đơn → đã thanh toán · đã lưu`
    : `${done} đơn → đã thanh toán · đã lưu · ${failed} đơn không đổi được, tải lại để xem`;
}

/**
 * The same three sentences in English (round v6 slice E4): "3 orders → paid ·
 * saved", the state in the glossary's word, each count with its own noun.
 */
function bulkPaidMessageEn(done: number, failed: number): string {
  const orders = (n: number) => plural(n, "order", "orders");
  if (done === 0) return `No order marked as paid · ${orders(failed)} no longer awaiting payment`;
  return failed === 0
    ? `${orders(done)} → paid · saved`
    : `${orders(done)} → paid · saved · ${orders(failed)} couldn't change, reload to check`;
}

/**
 * The toast of a move that went through, in the page's language (round v6 slice
 * E4). The Vietnamese sentences are the ones the actions have always said,
 * word for word; `reason` is the stored Vietnamese cancel reason, which the
 * English side names by the shop's table (`cancelReasonLabel`, slice E2).
 */
export function adminDoneMessage(
  move: "MARK_PAID" | "HAND_OVER" | "MARK_DELIVERED" | "CANCEL" | "NOTE" | "EDIT_ADDRESS",
  code: string,
  locale: Locale = "vi",
  detail: { tracking?: string; reason?: string } = {},
): string {
  const t = picker(locale);
  switch (move) {
    case "MARK_PAID":
      return t({ vi: `${code} → đã thanh toán · đã lưu`, en: `${code} → paid · saved` });
    case "HAND_OVER":
      return t({
        vi: `${code} → đang giao · ${detail.tracking} · khách thấy mã này ở tra cứu đơn và Đơn hàng`,
        en: `${code} → shipping · ${detail.tracking} · the customer sees this number in Track an order and Orders`,
      });
    case "MARK_DELIVERED":
      return t({ vi: `${code} → đã giao · đã lưu`, en: `${code} → delivered · saved` });
    case "CANCEL": {
      const reason = detail.reason ?? "";
      return t({
        vi: `${code} đã huỷ · lý do: ${reason.toLocaleLowerCase("vi")} · hàng về kệ`,
        en: `${code} cancelled · reason: ${lowerFirst(cancelReasonLabel(reason, "en"))} · items back in stock`,
      });
    }
    case "NOTE":
      return t({ vi: "Đã thêm ghi chú · đã lưu", en: "Note added · saved" });
    case "EDIT_ADDRESS":
      return t({ vi: `Đã sửa địa chỉ giao ${code} · đã lưu`, en: `Delivery address of ${code} changed · saved` });
  }
}

/** "Change of mind" → "change of mind": a label set inside a sentence. */
function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLocaleLowerCase("en") + s.slice(1) : s;
}
