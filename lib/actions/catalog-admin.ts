"use server";

import { revalidatePath } from "next/cache";
import { productId } from "@/data/types";
import {
  catalogFailureMessage,
  catalogFailureOf,
  checkAdjustment,
  dropSubject,
  isEmptyPatch,
  nextDropNo,
  productPatch,
  readCells,
  readDropNo,
  readPromoDraft,
  readTeaser,
  readWindow,
  sameTerms,
  termsOf,
  type CatalogFailure,
  type CatalogMove,
} from "@/lib/catalog-admin";
import { demoNow } from "@/lib/clock";
import { dateTimeLabel, dayMonthYear, toVnIso } from "@/lib/datetime";
import { loadCatalog } from "@/lib/db/catalog";
import type { Json } from "@/lib/db/database.types";
import { getSupabase } from "@/lib/db/server";
import { requireAdmin } from "@/lib/db/session";
import { dropState } from "@/lib/drop";
import { PRODUCT_EDIT_REASON, cellDelta } from "@/lib/inventory-adjust";
import { LEX, issueNo } from "@/lib/lexicon";
import { normalisePromoCode } from "@/lib/promotions";
import type { ActionState } from "./state";

/**
 * Everything the back office does to the CATALOGUE, since slice B3b — the
 * shelf, the issues, the teasers, the codes and the styles themselves.
 *
 * Each one is a PUBLIC ENDPOINT: "Server Functions are reachable via direct
 * POST requests, not just through your application's UI. Always verify
 * authentication and authorization inside every Server Function"
 * (`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`).
 * So each one, in this order — the same shape as the order actions of slice
 * B3a (`lib/actions/admin.ts`):
 *
 *   1. `requireAdmin()` — no session goes to sign in, a shopper's gets 404;
 *   2. reads its arguments as `unknown` and checks every one with the rules
 *      the sheets already apply, restated in `lib/catalog-admin.ts` against
 *      the catalogue as the database has it NOW (`loadCatalog()`), never as
 *      the browser remembered it;
 *   3. calls the `admin_*` function, which asks for the role again and holds
 *      the guard — the database decides what may move;
 *   4. revalidates everything (`revalidatePath('/', 'layout')`): a shelf, a
 *      price, an issue's hours and a code all show on the shop's own pages,
 *      and the page answering the action is already the new one
 *      (`02-guides/server-actions.md`, "A single response carries data and
 *      UI");
 *   5. returns an `ActionState`: `ok` and the sentence for the toast, or the
 *      sentence saying why not. Expected refusals are VALUES; no database
 *      text crosses back (`02-guides/data-security.md`, "Controlling return
 *      values").
 *
 * The clock is the real one (`toVnIso(demoNow())`), the only instant the
 * database accepts from a signed-in caller (`assert_now`).
 */

const now = () => toVnIso(demoNow());

const done = (message: string): ActionState => ({ errors: {}, ok: true, message });
const refused = (message: string): ActionState => ({ errors: { form: message } });
const failed = (move: CatalogMove, failure: CatalogFailure, subject = ""): ActionState =>
  refused(catalogFailureMessage(move, failure, subject));

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

type CatalogFunction =
  | "admin_adjust_stock"
  | "admin_add_drop"
  | "admin_schedule_drop"
  | "admin_add_teaser"
  | "admin_add_promo"
  | "admin_edit_promo"
  | "admin_pause_promo"
  | "admin_raise_promo_limit"
  | "admin_end_promo"
  | "admin_update_product";

/**
 * Run one `admin_*` function. Null when it went through, the failure when it
 * did not; a failure the database did not name is logged for the server and
 * reported to the screen only as "chưa lưu được".
 */
async function run(fn: CatalogFunction, args: Record<string, unknown>): Promise<CatalogFailure | null> {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc(fn as never, args as never);
  if (!error) return null;
  const failure = catalogFailureOf(error);
  if (failure === "UNAVAILABLE") console.error(`${fn}:`, error.message);
  return failure;
}

/** Every page shows the catalogue: the shop's, the account's, the back office's. */
function catalogMoved(): void {
  revalidatePath("/", "layout");
}

const signed = (n: number) => `${n > 0 ? "+" : ""}${n}`;

// ────────────────────────────────────────────────────────────── the shelf
/**
 * "Lưu điều chỉnh" in the stock sheet: the cells that moved, each with the
 * number the sheet was showing, a reason, a reference and a note. A shelf
 * that changed in the meantime comes back `STALE` — "Tồn kho đã đổi ở nơi
 * khác — tải lại rồi sửa tiếp" — and nothing is written.
 */
export async function adjustStock(
  id: unknown,
  cells: unknown,
  reason: unknown,
  ref: unknown,
  note: unknown,
): Promise<ActionState> {
  await requireAdmin("/admin/products");
  if (typeof id !== "string") return failed("ADJUST_STOCK", "NOT_FOUND");

  const catalog = await loadCatalog();
  const product = catalog.byId.get(productId(id));
  if (!product) return failed("ADJUST_STOCK", "NOT_FOUND");

  const moved = readCells(cells);
  if (!moved) return failed("ADJUST_STOCK", "BAD_INPUT");
  const why = text(reason);
  const reference = text(ref);
  const remark = text(note);
  const blocked = checkAdjustment(product, moved, why, reference, remark);
  if (blocked) return refused(blocked);

  const failure = await run("admin_adjust_stock", {
    p_product_id: product.id,
    p_cells: moved as unknown as Json,
    p_reason: why,
    p_ref: reference,
    p_note: remark,
    p_now: now(),
  });
  if (failure) return failed("ADJUST_STOCK", failure, product.name);

  catalogMoved();
  return done(`Đã điều chỉnh tồn kho ${product.name} · ${signed(cellDelta(moved))} chiếc · đã lưu`);
}

// ─────────────────────────────────────────────────────────────── the issues
/** "Tạo số": the next number, two instants. */
export async function addDrop(no: unknown, opensAt: unknown, closesAt: unknown): Promise<ActionState> {
  await requireAdmin("/admin/drops");
  const n = readDropNo(no);
  if (n === null) return failed("ADD_DROP", "BAD_INPUT");
  const window = readWindow(opensAt, closesAt);
  if (!window.ok) return refused(window.error);

  const catalog = await loadCatalog();
  if (n !== nextDropNo(catalog.drops)) return failed("ADD_DROP", "NOT_ALLOWED", dropSubject(n));

  const failure = await run("admin_add_drop", {
    p_no: n,
    p_opens_at: window.value.opensAt,
    p_closes_at: window.value.closesAt,
    p_now: now(),
  });
  if (failure) return failed("ADD_DROP", failure, dropSubject(n));

  catalogMoved();
  return done(`Đã tạo ${LEX.tl} ${issueNo(n)} (sắp mở) · đã lưu`);
}

/** "Sửa giờ": an issue's two instants, moved — any issue, in any state. */
export async function scheduleDrop(no: unknown, opensAt: unknown, closesAt: unknown): Promise<ActionState> {
  await requireAdmin("/admin/drops");
  const n = readDropNo(no);
  if (n === null) return failed("SCHEDULE_DROP", "NOT_FOUND");
  const window = readWindow(opensAt, closesAt);
  if (!window.ok) return refused(window.error);

  const failure = await run("admin_schedule_drop", {
    p_no: n,
    p_opens_at: window.value.opensAt,
    p_closes_at: window.value.closesAt,
    p_now: now(),
  });
  if (failure) return failed("SCHEDULE_DROP", failure, dropSubject(n));

  catalogMoved();
  return done(
    `${dropSubject(n)}: lịch đổi thành ${dayMonthYear(window.value.opensAt)} → ${dayMonthYear(window.value.closesAt)} · đã lưu`,
  );
}

/**
 * "Đóng sớm": `admin_schedule_drop()` with the closing hour set to now and
 * the opening hour the database already has — never one the browser sends.
 * Only an issue that is selling can close early.
 */
export async function closeDropNow(no: unknown): Promise<ActionState> {
  await requireAdmin("/admin/drops");
  const n = readDropNo(no);
  if (n === null) return failed("CLOSE_DROP", "NOT_FOUND");

  const catalog = await loadCatalog();
  const drop = catalog.dropByNo.get(n);
  if (!drop) return failed("CLOSE_DROP", "NOT_FOUND", dropSubject(n));

  const at = now();
  if (dropState(drop, new Date(at)) !== "OPEN") return failed("CLOSE_DROP", "NOT_ALLOWED", dropSubject(n));

  const failure = await run("admin_schedule_drop", {
    p_no: n,
    p_opens_at: drop.opensAt,
    p_closes_at: at,
    p_now: at,
  });
  if (failure) return failed("CLOSE_DROP", failure, dropSubject(n));

  catalogMoved();
  return done(`Đã đóng ${LEX.tl} ${issueNo(n)} lúc ${dateTimeLabel(at)} · đã lưu`);
}

// ────────────────────────────────────────────────────────────── the teasers
/**
 * "Thêm mẫu hé lộ": the issue, a name, a kind and a borrowed photo. The
 * family and the slug are derived here from the catalogue, never taken from
 * the browser.
 */
export async function addTeaser(draft: unknown): Promise<ActionState> {
  await requireAdmin("/admin/drops");
  const catalog = await loadCatalog();
  const read = readTeaser(draft, catalog);
  if (!read.ok) return refused(read.error);
  const t = read.value;
  if (!catalog.dropByNo.has(t.dropNo)) return failed("ADD_TEASER", "NOT_FOUND", dropSubject(t.dropNo));

  const failure = await run("admin_add_teaser", {
    p_slug: t.slug,
    p_name: t.name,
    p_garment: t.garment,
    p_family: t.family,
    p_drop_no: t.dropNo,
    p_photo_key: t.photoKey,
    p_now: now(),
  });
  if (failure) return failed("ADD_TEASER", failure, failure === "NOT_FOUND" ? dropSubject(t.dropNo) : t.name);

  catalogMoved();
  return done(`Đã thêm mẫu hé lộ ${t.name} · đã lưu`);
}

// ──────────────────────────────────────────────────────────────── the codes
/**
 * "Tạo mã", and "Nhân bản" — which IS a creation: a new code with the old
 * one's terms, starting at zero uses.
 */
export async function addPromo(draft: unknown, copyOf?: unknown): Promise<ActionState> {
  await requireAdmin("/admin/promotions");
  const read = readPromoDraft(draft);
  if (!read.ok) return refused(read.error);
  const { code, terms } = read.value;

  const catalog = await loadCatalog();
  if (catalog.promoByCode.has(code as never)) return failed("ADD_PROMO", "NOT_ALLOWED", code);

  const failure = await run("admin_add_promo", {
    p_terms: { code, ...terms } as unknown as Json,
    p_now: now(),
  });
  if (failure) return failed("ADD_PROMO", failure, code);

  catalogMoved();
  return done(
    typeof copyOf === "string" && copyOf !== ""
      ? `Đã nhân bản thành ${code} · đã lưu`
      : `Đã tạo mã ${code} · đã lưu`,
  );
}

/**
 * "Lưu" on an existing code: new terms, THE SAME CODE. Orders carry it, so a
 * renamed code would be a different code wearing an old one's history; the
 * sheet's code box is read-only when editing, and "Nhân bản" makes a new one.
 */
export async function editPromo(code: unknown, draft: unknown): Promise<ActionState> {
  await requireAdmin("/admin/promotions");
  const key = normalisePromoCode(text(code));
  const catalog = await loadCatalog();
  const current = catalog.promoByCode.get(key as never);
  if (!current) return failed("EDIT_PROMO", "NOT_FOUND", key);

  const read = readPromoDraft(draft);
  if (!read.ok) return refused(read.error);
  if (read.value.code !== key) return refused("Mã không đổi được — dùng “Nhân bản” để tạo mã mới.");
  if (sameTerms(termsOf(current), read.value.terms)) return refused("Chưa có thay đổi nào để lưu.");

  const failure = await run("admin_edit_promo", {
    p_code: key,
    p_terms: read.value.terms as unknown as Json,
    p_now: now(),
  });
  if (failure) return failed("EDIT_PROMO", failure, key);

  catalogMoved();
  return done(`Đã sửa ${key} · đã lưu`);
}

/** "Tạm dừng" / "Tiếp tục". Checkout refuses a paused code from the next order on. */
export async function pausePromo(code: unknown, paused: unknown): Promise<ActionState> {
  await requireAdmin("/admin/promotions");
  const key = normalisePromoCode(text(code));
  if (key === "") return failed("PAUSE_PROMO", "NOT_FOUND");
  if (typeof paused !== "boolean") return failed("PAUSE_PROMO", "BAD_INPUT", key);

  const failure = await run("admin_pause_promo", { p_code: key, p_paused: paused, p_now: now() });
  if (failure) return failed("PAUSE_PROMO", failure, key);

  catalogMoved();
  return done(
    paused
      ? `${key} đã tạm dừng · trang thanh toán từ chối từ giờ`
      : `${key} chạy lại · trang thanh toán nhận mã từ giờ`,
  );
}

/**
 * "Nâng giới hạn thêm 50": the new limit is read against the one the code
 * has NOW, and the database refuses one that is not higher — a second tab
 * that already raised it is told so rather than raising it twice.
 */
export async function raisePromoLimit(code: unknown, after: unknown): Promise<ActionState> {
  await requireAdmin("/admin/promotions");
  const key = normalisePromoCode(text(code));
  const catalog = await loadCatalog();
  const current = catalog.promoByCode.get(key as never);
  if (!current) return failed("RAISE_LIMIT", "NOT_FOUND", key);
  if (typeof after !== "number" || !Number.isInteger(after) || after < 1) {
    return failed("RAISE_LIMIT", "BAD_INPUT", key);
  }

  const failure = await run("admin_raise_promo_limit", { p_code: key, p_after: after, p_now: now() });
  if (failure) return failed("RAISE_LIMIT", failure, key);

  catalogMoved();
  const before = current.usageLimit === null ? "không giới hạn" : String(current.usageLimit);
  return done(`${key}: giới hạn ${before} → ${after} lượt · đã lưu`);
}

/** "Kết thúc sớm": the closing hour becomes now. Only a code that is running. */
export async function endPromo(code: unknown): Promise<ActionState> {
  await requireAdmin("/admin/promotions");
  const key = normalisePromoCode(text(code));
  if (key === "") return failed("END_PROMO", "NOT_FOUND");

  const failure = await run("admin_end_promo", { p_code: key, p_now: now() });
  if (failure) return failed("END_PROMO", failure, key);

  catalogMoved();
  return done(`Đã kết thúc sớm ${key} · giờ kết thúc = bây giờ · đã lưu`);
}

// ─────────────────────────────────────────────────────────────── the styles
/**
 * "Lưu thay đổi" on a style: its own fields, and the shelf in its grid.
 *
 * Two functions, in order, in ONE action: `admin_update_product()` for what
 * changed of the style, then — if the grid moved — `admin_adjust_stock()`
 * with the reason "Sửa mẫu" and the numbers the page was rendered with as
 * `before`. They are two transactions, so the second can fail after the first
 * went through; the answer then says plainly that the style's fields ARE
 * saved and the shelf is not, and why.
 *
 * The page stays where it is: `/admin/products/[id]` is keyed by the style's
 * id, which no edit changes — a new address segment moves the SHOP's page
 * (`/products/<slug>`), and the revalidation below re-renders this one with
 * the saved values in the same response.
 */
export async function updateProduct(id: unknown, form: unknown): Promise<ActionState> {
  await requireAdmin("/admin/products");
  if (typeof id !== "string") return failed("UPDATE_PRODUCT", "NOT_FOUND");

  const catalog = await loadCatalog();
  const product = catalog.byId.get(productId(id));
  if (!product) return failed("UPDATE_PRODUCT", "NOT_FOUND");

  const read = productPatch(product, form, catalog);
  if (!read.ok) return refused(read.error);
  const patch = read.value;

  // The grid's moved cells, when there are any: absent or an empty list means
  // the shelf was not touched; anything else has to read as cells.
  const fields = form as Record<string, unknown>;
  const sent = fields.cells;
  if (sent !== undefined && !Array.isArray(sent)) return failed("ADJUST_STOCK", "BAD_INPUT");
  const cells = Array.isArray(sent) && sent.length > 0 ? readCells(sent) : [];
  if (cells === null) return failed("ADJUST_STOCK", "BAD_INPUT");
  if (cells.length > 0) {
    const blocked = checkAdjustment(product, cells, PRODUCT_EDIT_REASON, "", "");
    if (blocked) return refused(blocked);
  }

  if (isEmptyPatch(patch) && cells.length === 0) return refused("Chưa có thay đổi nào để lưu.");

  const at = now();
  let saved = false;
  if (!isEmptyPatch(patch)) {
    const failure = await run("admin_update_product", {
      p_id: product.id,
      p_patch: patch as unknown as Json,
      p_now: at,
    });
    if (failure) {
      return failed("UPDATE_PRODUCT", failure, failure === "NOT_ALLOWED" ? (patch.slug ?? product.slug) : product.name);
    }
    saved = true;
  }

  const name = patch.name ?? product.name;
  if (cells.length > 0) {
    const failure = await run("admin_adjust_stock", {
      p_product_id: product.id,
      p_cells: cells as unknown as Json,
      p_reason: PRODUCT_EDIT_REASON,
      p_ref: "",
      p_note: "",
      p_now: at,
    });
    if (failure) {
      if (saved) catalogMoved();
      const why = catalogFailureMessage("ADJUST_STOCK", failure, name);
      return refused(saved ? `Đã lưu thông tin ${name}; tồn kho CHƯA lưu: ${why}` : why);
    }
  }

  catalogMoved();
  return done(
    cells.length > 0
      ? `Đã sửa mẫu ${name} · tồn kho ${signed(cellDelta(cells))} chiếc · đã lưu`
      : `Đã sửa mẫu ${name} · đã lưu`,
  );
}
