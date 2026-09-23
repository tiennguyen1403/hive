"use server";

import { revalidatePath } from "next/cache";
import { findWard } from "@/data/regions";
import {
  adminFailureMessage,
  adminFailureOf,
  bulkPaidMessage,
  isCancelReason,
  isCarrier,
  isTrackingCode,
  normaliseTrackingCode,
  type AdminFailure,
  type AdminMove,
} from "@/lib/admin-orders";
import { normalisePhone } from "@/lib/checkout-form";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import type { Json } from "@/lib/db/database.types";
import { getSupabase } from "@/lib/db/server";
import { requireAdmin } from "@/lib/db/session";
import { isOrderCode } from "@/lib/lookup";
import type { ActionState } from "./state";

/**
 * Everything the back office does to an order, since slice B3a — and the
 * reset.
 *
 * Each one is a PUBLIC ENDPOINT: "Server Functions are reachable via direct
 * POST requests, not just through your application's UI. Always verify
 * authentication and authorization inside every Server Function"
 * (`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`).
 * So each one, in this order:
 *
 *   1. `requireAdmin()` — no session goes to sign in, a shopper's gets 404,
 *      exactly as the admin pages answer (`lib/db/session.ts`);
 *   2. reads its arguments as `unknown` and checks every one: the order code,
 *      the reason against the four the sheet offers, the carrier against the
 *      services the shop sells, the tracking number against what a label can
 *      carry, the ward against the province (`data/regions.ts`, which the
 *      database does not have);
 *   3. calls the `admin_*` function, which asks for the role a fourth time
 *      and applies the state guard — the database decides what may move;
 *   4. revalidates what the move changed, so the page answering the action
 *      is already the new one (`02-guides/server-actions.md`, "A single
 *      response carries data and UI");
 *   5. returns an `ActionState`: `ok` and the sentence for the toast, or the
 *      sentence saying why not. Expected refusals are VALUES; nothing a
 *      shopper or a stale screen can cause is thrown. No database text crosses
 *      back — only the sentence (`02-guides/data-security.md`, "Controlling
 *      return values").
 *
 * The clock is the real one (`toVnIso(demoNow())`), which is the only
 * instant the database accepts from a signed-in caller.
 */

const MAX_BULK = 50;
const MAX_NOTE = 500;
const MAX_REASON = 200;
const MAX_NAME = 100;
const MAX_LINE = 200;

const now = () => toVnIso(demoNow());

const done = (message: string): ActionState => ({ errors: {}, ok: true, message });
const refused = (move: AdminMove, failure: AdminFailure, code = ""): ActionState => ({
  errors: { form: adminFailureMessage(move, failure, code) },
});

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Run one `admin_*` function. Null when it went through, the failure when it
 * did not; a failure the database did not name is logged for the server and
 * reported to the screen only as "chưa lưu được".
 */
async function run(
  fn: "admin_mark_paid" | "admin_hand_over" | "admin_mark_delivered" | "admin_cancel_order" | "admin_note_order" | "admin_edit_address",
  args: Record<string, unknown>,
): Promise<AdminFailure | null> {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc(fn as never, args as never);
  if (!error) return null;
  const failure = adminFailureOf(error);
  if (failure === "UNAVAILABLE") console.error(`${fn}:`, error.message);
  return failure;
}

/** The pages a move on an order changes: the back office, and the shopper's own. */
function orderMoved(): void {
  revalidatePath("/admin", "layout");
  revalidatePath("/account", "layout");
  revalidatePath("/track");
}

// ───────────────────────────────────────────────────────────── the money
/**
 * "Đã nhận tiền", for one order or for the bulk bar's selection.
 *
 * One `admin_mark_paid()` per code, each in its own transaction: an order
 * somebody else confirmed a second ago must not stop the other four, and the
 * answer says how many went through.
 */
export async function markPaid(codes: unknown): Promise<ActionState> {
  await requireAdmin("/admin/orders");

  if (
    !Array.isArray(codes) ||
    codes.length === 0 ||
    codes.length > MAX_BULK ||
    !codes.every((c) => typeof c === "string" && isOrderCode(c))
  ) {
    return refused("MARK_PAID", "BAD_INPUT");
  }

  const unique = [...new Set(codes as string[])];
  const at = now();
  let paid = 0;
  let failure: AdminFailure | null = null;
  for (const code of unique) {
    const result = await run("admin_mark_paid", { p_code: code, p_now: at });
    if (result) failure = result;
    else paid += 1;
  }

  if (paid > 0) orderMoved();

  if (unique.length === 1) {
    const code = unique[0]!;
    return failure ? refused("MARK_PAID", failure, code) : done(`${code} → đã thanh toán · đã lưu`);
  }
  const message = bulkPaidMessage(paid, unique.length - paid);
  return paid > 0 ? done(message) : { errors: { form: message } };
}

// ──────────────────────────────────────────────────────────── the parcel
/**
 * "Xác nhận bàn giao": the courier service, the tracking number, and an
 * optional line for the shopper, which becomes a note on the order.
 */
export async function handOver(code: unknown, form: unknown): Promise<ActionState> {
  await requireAdmin("/admin/orders");
  if (typeof code !== "string" || !isOrderCode(code)) return refused("HAND_OVER", "NOT_FOUND");

  const fields = record(form);
  const carrier = text(fields.carrier);
  const tracking = normaliseTrackingCode(text(fields.trackingCode));
  const note = text(fields.note);
  if (!isCarrier(carrier) || !isTrackingCode(tracking) || note.length > MAX_NOTE) {
    return refused("HAND_OVER", "BAD_INPUT", code);
  }

  const failure = await run("admin_hand_over", {
    p_code: code,
    p_carrier: carrier,
    p_tracking_code: tracking,
    p_note: note,
    p_now: now(),
  });
  if (failure) return refused("HAND_OVER", failure, code);

  orderMoved();
  return done(`${code} → đang giao · ${tracking} · khách thấy mã này ở tra cứu đơn và Đơn hàng`);
}

/** "Đã giao": the parcel arrived. No courier reports it, so the shop does. */
export async function markDelivered(code: unknown): Promise<ActionState> {
  await requireAdmin("/admin/orders");
  if (typeof code !== "string" || !isOrderCode(code)) return refused("MARK_DELIVERED", "NOT_FOUND");

  const failure = await run("admin_mark_delivered", { p_code: code, p_now: now() });
  if (failure) return refused("MARK_DELIVERED", failure, code);

  orderMoved();
  return done(`${code} → đã giao · đã lưu`);
}

// ─────────────────────────────────────────────────────────── calling off
/**
 * "Huỷ đơn", with one of the four reasons and an optional internal note. The
 * pieces go back on the shelf in the same transaction, so the catalogue every
 * page reads has moved: everything is revalidated, as B2 does for the
 * shopper's own cancellation.
 */
export async function cancelOrderAdmin(
  code: unknown,
  reason: unknown,
  note: unknown,
): Promise<ActionState> {
  await requireAdmin("/admin/orders");
  if (typeof code !== "string" || !isOrderCode(code)) return refused("CANCEL", "NOT_FOUND");

  const why = text(reason);
  const internal = text(note);
  if (!isCancelReason(why) || internal.length > MAX_NOTE) return refused("CANCEL", "BAD_INPUT", code);

  const failure = await run("admin_cancel_order", {
    p_code: code,
    p_reason: why,
    p_note: internal,
    p_now: now(),
  });
  if (failure) return refused("CANCEL", failure, code);

  revalidatePath("/", "layout");
  return done(`${code} đã huỷ · lý do: ${why.toLocaleLowerCase("vi")} · hàng về kệ`);
}

// ─────────────────────────────────────────────────────────────── the notes
/** "Thêm" under the internal notes. Nothing about the order changes. */
export async function noteOrder(code: unknown, body: unknown): Promise<ActionState> {
  await requireAdmin("/admin/orders");
  if (typeof code !== "string" || !isOrderCode(code)) return refused("NOTE", "NOT_FOUND");

  const note = text(body);
  if (note === "" || note.length > MAX_NOTE) return refused("NOTE", "BAD_INPUT", code);

  const failure = await run("admin_note_order", { p_code: code, p_text: note, p_now: now() });
  if (failure) return refused("NOTE", failure, code);

  revalidatePath("/admin", "layout");
  return done("Đã thêm ghi chú · đã lưu");
}

// ───────────────────────────────────────────────────────────── the address
/**
 * "Lưu địa chỉ": the new delivery address and why. The ward is checked
 * against the province here — the list lives in `data/regions.ts`, not in
 * Postgres — and everything else again in `admin_edit_address()`.
 */
export async function editAddress(code: unknown, form: unknown): Promise<ActionState> {
  await requireAdmin("/admin/orders");
  if (typeof code !== "string" || !isOrderCode(code)) return refused("EDIT_ADDRESS", "NOT_FOUND");

  const fields = record(form);
  const shipTo = {
    recipient: text(fields.recipient),
    phone: normalisePhone(text(fields.phone)),
    line: text(fields.line),
    provinceCode: text(fields.provinceCode),
    wardCode: text(fields.wardCode),
  };
  const reason = text(fields.reason);
  if (
    shipTo.recipient === "" ||
    shipTo.recipient.length > MAX_NAME ||
    shipTo.phone === "" ||
    shipTo.line === "" ||
    shipTo.line.length > MAX_LINE ||
    !findWard(shipTo.provinceCode, shipTo.wardCode) ||
    reason === "" ||
    reason.length > MAX_REASON
  ) {
    return refused("EDIT_ADDRESS", "BAD_INPUT", code);
  }

  const failure = await run("admin_edit_address", {
    p_code: code,
    p_ship_to: shipTo as unknown as Json,
    p_reason: reason,
    p_now: now(),
  });
  if (failure) return refused("EDIT_ADDRESS", failure, code);

  orderMoved();
  return done(`Đã sửa địa chỉ giao ${code} · đã lưu`);
}

// ─────────────────────────────────────────────────────────────── the reset
/**
 * "Đặt lại dữ liệu mẫu": the database puts the sample shop back, anchored on
 * the most recent 18:50 in Vietnam (`demo_anchor()`), and logs who did it.
 * Every page reads something it rebuilt, so everything is revalidated.
 */
export async function resetDemo(): Promise<ActionState> {
  await requireAdmin("/admin");

  const supabase = await getSupabase();
  const anchor = await supabase.rpc("demo_anchor");
  if (anchor.error) {
    console.error("demo_anchor:", anchor.error.message);
    return refused("RESET", "UNAVAILABLE");
  }
  const { error } = await supabase.rpc("reset_demo", { p_anchor: anchor.data });
  if (error) {
    const failure = adminFailureOf(error);
    if (failure === "UNAVAILABLE") console.error("reset_demo:", error.message);
    return refused("RESET", failure);
  }

  revalidatePath("/", "layout");
  return done("Đã đặt lại dữ liệu mẫu · đơn hàng, tồn kho và nhật ký về như ban đầu");
}
