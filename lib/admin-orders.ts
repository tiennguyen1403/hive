import type { Order, OrderState } from "@/data/types";
import { effectiveStatus } from "./customer-orders";
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
 *   · AWAITING_TRANSFER → confirm the money arrived;
 *   · RECEIVED, COD     → hand it over: the money is collected at the door;
 *   · RECEIVED, card    → confirm the money: no gateway is connected, so the
 *                         shop checks by hand before anything ships;
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
 */
export function adminFailureMessage(move: AdminMove, failure: AdminFailure, code = ""): string {
  switch (failure) {
    case "NOT_ADMIN":
      return "Phiên quản trị đã hết — đăng nhập lại bằng tài khoản quản trị.";
    case "NOT_FOUND":
      return code ? `Không tìm thấy đơn ${code}.` : "Không tìm thấy đơn này.";
    case "NOT_ALLOWED":
      switch (move) {
        case "MARK_PAID":
          return `${code} không còn chờ tiền — tải lại trang để xem trạng thái mới.`;
        case "HAND_OVER":
          return `${code} chưa bàn giao được ở trạng thái này — tải lại trang để xem.`;
        case "MARK_DELIVERED":
          return `${code} không còn ở bước đang giao — tải lại trang để xem.`;
        case "CANCEL":
          return `${code} đã bàn giao hoặc đã đóng, không huỷ được nữa.`;
        case "EDIT_ADDRESS":
          return `${code} đã bàn giao hoặc đã đóng, không sửa địa chỉ được nữa.`;
        default:
          return "Thao tác này không còn làm được — tải lại trang để xem.";
      }
    case "BAD_INPUT":
      switch (move) {
        case "HAND_OVER":
          return "Mã vận đơn chỉ gồm chữ, số, dấu chấm và gạch ngang, tối đa 40 ký tự.";
        case "CANCEL":
          return "Chọn một lý do trước khi huỷ.";
        case "NOTE":
          return "Ghi chú trống hoặc quá dài — tối đa 500 ký tự.";
        case "EDIT_ADDRESS":
          return "Địa chỉ chưa đủ hoặc số điện thoại chưa đúng — kiểm lại các ô.";
        default:
          return "Thông tin gửi lên chưa hợp lệ.";
      }
    case "UNAVAILABLE":
      return "Chưa lưu được. Thử lại sau ít phút.";
  }
}

/**
 * "3 đơn → đã thanh toán · đã lưu", or with the ones that did not move.
 *
 * The bulk bar confirms each order on its own (one `admin_mark_paid()` per
 * code), so the sentence has to say how many went through and how many did
 * not — a single "đã lưu" over a half-failed batch would be a lie.
 */
export function bulkPaidMessage(done: number, failed: number): string {
  if (done === 0) return `Chưa đánh dấu được đơn nào · ${failed} đơn không còn chờ tiền`;
  return failed === 0
    ? `${done} đơn → đã thanh toán · đã lưu`
    : `${done} đơn → đã thanh toán · đã lưu · ${failed} đơn không đổi được, tải lại để xem`;
}
