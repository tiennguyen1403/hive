"use server";

import { revalidatePath } from "next/cache";
import { findWard } from "@/data/regions";
import {
  adminDoneMessage,
  adminFailureMessage,
  adminFailureOf,
  bulkPaidMessage,
  isCancelReason,
  isCarrier,
  isSampleOrderJson,
  isTrackingCode,
  normaliseTrackingCode,
  realAddressMessage,
  type AdminFailure,
  type AdminMove,
} from "@/lib/admin-orders";
import { normalisePhone } from "@/lib/checkout-form";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import type { Json } from "@/lib/db/database.types";
import { toOrder } from "@/lib/db/order-dto";
import { purgeUploadedPhotos } from "@/lib/db/photos";
import { takeRate, tidyRateHits } from "@/lib/db/rate-limit";
import { getSupabase } from "@/lib/db/server";
import { requireAdmin } from "@/lib/db/session";
import { pick, plural, type Locale } from "@/lib/i18n";
import { getActionLocale } from "@/lib/locale";
import { isOrderCode } from "@/lib/lookup";
import type { RateBucket } from "@/lib/rate-limit";
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
 *      exactly as the admin pages answer (`lib/db/session.ts`); then, since
 *      slice B4b, a token of the visitor's `admin` limit (120 per ten
 *      minutes; the reset also `reset`, three per ten minutes), refused with
 *      the wait as the toast's sentence (`lib/db/rate-limit.ts`) — the back
 *      office is open to anybody on the public demo;
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
 * Every sentence is in the visitor's language since round v6 slice E4: each
 * action reads it once (`getActionLocale()`, `lib/locale.ts`) and hands it to
 * the rate limit (`takeRate(…, locale)`), the refusal (`adminFailureMessage`)
 * and the toast (`adminDoneMessage`, `bulkPaidMessage`). What it writes to the
 * database never changes with the language: a cancel reason is one of the four
 * Vietnamese ones, a carrier the service's Vietnamese label.
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
const refused = (move: AdminMove, failure: AdminFailure, code = "", locale: Locale = "vi"): ActionState => ({
  errors: { form: adminFailureMessage(move, failure, code, locale) },
});

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/**
 * Slice B4b: the visitor's back-office limits — `admin`, and whatever else the
 * move spends. Null when every token was there; the refusal, as the toast's
 * sentence, when one was not.
 *
 * One `takeRate` per bucket, in order, the first refusal answering and a token
 * already spent staying spent — `takeRates`' rule — each with the visitor's
 * language, so the refusal is in it too (round v6 slice E4).
 */
async function overLimit(locale: Locale, ...extra: RateBucket[]): Promise<ActionState | null> {
  for (const bucket of ["admin", ...extra] as RateBucket[]) {
    const verdict = await takeRate(bucket, 1, locale);
    if (!verdict.ok) return { errors: { form: verdict.message } };
  }
  return null;
}

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
  const locale = await getActionLocale();
  const limited = await overLimit(locale);
  if (limited) return limited;

  if (
    !Array.isArray(codes) ||
    codes.length === 0 ||
    codes.length > MAX_BULK ||
    !codes.every((c) => typeof c === "string" && isOrderCode(c))
  ) {
    return refused("MARK_PAID", "BAD_INPUT", "", locale);
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
    return failure ? refused("MARK_PAID", failure, code, locale) : done(adminDoneMessage("MARK_PAID", code, locale));
  }
  const message = bulkPaidMessage(paid, unique.length - paid, locale);
  return paid > 0 ? done(message) : { errors: { form: message } };
}

// ──────────────────────────────────────────────────────────── the parcel
/**
 * "Xác nhận bàn giao": the courier service, the tracking number, and an
 * optional line for the shopper, which becomes a note on the order.
 */
export async function handOver(code: unknown, form: unknown): Promise<ActionState> {
  await requireAdmin("/admin/orders");
  const locale = await getActionLocale();
  const limited = await overLimit(locale);
  if (limited) return limited;
  if (typeof code !== "string" || !isOrderCode(code)) return refused("HAND_OVER", "NOT_FOUND", "", locale);

  const fields = record(form);
  const carrier = text(fields.carrier);
  const tracking = normaliseTrackingCode(text(fields.trackingCode));
  const note = text(fields.note);
  if (!isCarrier(carrier) || !isTrackingCode(tracking) || note.length > MAX_NOTE) {
    return refused("HAND_OVER", "BAD_INPUT", code, locale);
  }

  const failure = await run("admin_hand_over", {
    p_code: code,
    p_carrier: carrier,
    p_tracking_code: tracking,
    p_note: note,
    p_now: now(),
  });
  if (failure) return refused("HAND_OVER", failure, code, locale);

  orderMoved();
  return done(adminDoneMessage("HAND_OVER", code, locale, { tracking }));
}

/** "Đã giao": the parcel arrived. No courier reports it, so the shop does. */
export async function markDelivered(code: unknown): Promise<ActionState> {
  await requireAdmin("/admin/orders");
  const locale = await getActionLocale();
  const limited = await overLimit(locale);
  if (limited) return limited;
  if (typeof code !== "string" || !isOrderCode(code)) return refused("MARK_DELIVERED", "NOT_FOUND", "", locale);

  const failure = await run("admin_mark_delivered", { p_code: code, p_now: now() });
  if (failure) return refused("MARK_DELIVERED", failure, code, locale);

  orderMoved();
  return done(adminDoneMessage("MARK_DELIVERED", code, locale));
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
  const locale = await getActionLocale();
  const limited = await overLimit(locale);
  if (limited) return limited;
  if (typeof code !== "string" || !isOrderCode(code)) return refused("CANCEL", "NOT_FOUND", "", locale);

  // The reason arrives as the dialog's value, one of the four Vietnamese ones,
  // whatever language its label was shown in; it is stored as it is.
  const why = text(reason);
  const internal = text(note);
  if (!isCancelReason(why) || internal.length > MAX_NOTE) return refused("CANCEL", "BAD_INPUT", code, locale);

  const failure = await run("admin_cancel_order", {
    p_code: code,
    p_reason: why,
    p_note: internal,
    p_now: now(),
  });
  if (failure) return refused("CANCEL", failure, code, locale);

  revalidatePath("/", "layout");
  await closeCardPageAfterCancel(code);
  return done(adminDoneMessage("CANCEL", code, locale, { reason: why }));
}

/**
 * Slice B18: once the database has cancelled an order, a card order's Stripe
 * page stops taking money (`closeCardCheckout`, `lib/db/card-payments.ts`). The
 * order is read back with the manager's own client (`order_json()`, which the
 * admin read policy opens), and the Stripe half is loaded for a card order
 * only. Best effort: anything that fails is logged, and the cancellation and
 * its toast stand.
 */
async function closeCardPageAfterCancel(code: string): Promise<void> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc("order_json", { p_code: code });
    if (error || !data) return;
    const order = toOrder(data);
    if (order.payment !== "CARD") return;
    const { closeCardCheckout } = await import("@/lib/db/card-payments");
    await closeCardCheckout(order);
  } catch (error) {
    console.error("cancelOrderAdmin (card page):", error instanceof Error ? error.message : error);
  }
}

// ─────────────────────────────────────────────────────────────── the notes
/** "Thêm" under the internal notes. Nothing about the order changes. */
export async function noteOrder(code: unknown, body: unknown): Promise<ActionState> {
  await requireAdmin("/admin/orders");
  const locale = await getActionLocale();
  const limited = await overLimit(locale);
  if (limited) return limited;
  if (typeof code !== "string" || !isOrderCode(code)) return refused("NOTE", "NOT_FOUND", "", locale);

  const note = text(body);
  if (note === "" || note.length > MAX_NOTE) return refused("NOTE", "BAD_INPUT", code, locale);

  const failure = await run("admin_note_order", { p_code: code, p_text: note, p_now: now() });
  if (failure) return refused("NOTE", failure, code, locale);

  revalidatePath("/admin", "layout");
  return done(adminDoneMessage("NOTE", code, locale));
}

// ───────────────────────────────────────────────────────────── the address
/**
 * "Lưu địa chỉ": the new delivery address and why. The ward is checked
 * against the province here — the list lives in `data/regions.ts`, not in
 * Postgres — and everything else again in `admin_edit_address()`.
 *
 * A REAL CUSTOMER'S ORDER IS REFUSED (QĐ-44, slice B17). The back office
 * shows that address masked and offers no "Sửa" on it; this is the same answer
 * for a direct call. The order is read through the manager's own session —
 * `order_json()`, which the admin read policy lets see every row — and only
 * its `customerId` is looked at (`isSampleOrderJson`). No order at all (null)
 * goes on to `admin_edit_address()`, which answers NOT_FOUND itself; a read
 * that fails is "chưa lưu được", never a write.
 */
export async function editAddress(code: unknown, form: unknown): Promise<ActionState> {
  await requireAdmin("/admin/orders");
  const locale = await getActionLocale();
  const limited = await overLimit(locale);
  if (limited) return limited;
  if (typeof code !== "string" || !isOrderCode(code)) return refused("EDIT_ADDRESS", "NOT_FOUND", "", locale);

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
    return refused("EDIT_ADDRESS", "BAD_INPUT", code, locale);
  }

  const supabase = await getSupabase();
  const found = await supabase.rpc("order_json", { p_code: code });
  if (found.error) {
    console.error("order_json:", found.error.message);
    return refused("EDIT_ADDRESS", "UNAVAILABLE", code, locale);
  }
  if (found.data !== null && !isSampleOrderJson(found.data)) {
    return { errors: { form: realAddressMessage(code, locale) } };
  }

  const failure = await run("admin_edit_address", {
    p_code: code,
    p_ship_to: shipTo as unknown as Json,
    p_reason: reason,
    p_now: now(),
  });
  if (failure) return refused("EDIT_ADDRESS", failure, code, locale);

  orderMoved();
  return done(adminDoneMessage("EDIT_ADDRESS", code, locale));
}

// ─────────────────────────────────────────────────────────────── the reset
/**
 * "Đặt lại dữ liệu mẫu": the database puts the sample shop back, anchored on
 * the most recent 18:50 in Vietnam (`demo_anchor()`), and logs who did it.
 * Every page reads something it rebuilt, so everything is revalidated.
 *
 * Slice B3c: then every uploaded photo goes too (`purgeUploadedPhotos`, the
 * function the daily cron of slice B4 calls the same way). The sample's
 * catalogue uses borrowed frames only, so after the reset no row shows an
 * upload and each one is an object nobody links to. The database part has
 * already happened when the bucket is emptied, so a bucket that cannot be
 * emptied does not undo it: the answer says so and the server log says why.
 */
export async function resetDemo(): Promise<ActionState> {
  await requireAdmin("/admin");
  // Round v6 slice E0: the toast speaks the visitor's language (the
  // `hive-lang` cookie); since slice E4 the rate limit's refusal does too.
  const locale = await getActionLocale();
  const limited = await overLimit(locale, "reset");
  if (limited) return limited;

  const supabase = await getSupabase();
  const anchor = await supabase.rpc("demo_anchor");
  if (anchor.error) {
    console.error("demo_anchor:", anchor.error.message);
    return refused("RESET", "UNAVAILABLE", "", locale);
  }
  const { error } = await supabase.rpc("reset_demo", { p_anchor: anchor.data });
  if (error) {
    const failure = adminFailureOf(error);
    if (failure === "UNAVAILABLE") console.error("reset_demo:", error.message);
    return refused("RESET", failure, "", locale);
  }

  let photos = "";
  try {
    const removed = await purgeUploadedPhotos();
    if (removed > 0) {
      photos = pick(
        {
          vi: ` · đã xoá ${removed} ảnh tải lên`,
          en: ` · ${plural(removed, "uploaded photo", "uploaded photos")} deleted`,
        },
        locale,
      );
    }
    // Slice B4b: the bucket is empty again, so the day's photo count
    // (`upload_global`) describes photos that are gone. Only after a purge
    // that went through — a bucket still full keeps its count.
    await tidyRateHits(["upload_global"]);
  } catch (e) {
    console.error("reset: uploaded photos left in the bucket:", e instanceof Error ? e.message : e);
    photos = pick({ vi: " · ảnh tải lên chưa xoá được", en: " · uploaded photos not deleted" }, locale);
  }

  revalidatePath("/", "layout");
  return done(
    pick(
      {
        vi: `Đã đặt lại dữ liệu mẫu · đơn hàng, tồn kho và nhật ký về như ban đầu${photos}`,
        en: `Demo data reset · orders, stock and activity are back to the start${photos}`,
      },
      locale,
    ),
  );
}
