"use server";

import { revalidatePath } from "next/cache";
import { COLORS } from "@/data/colors";
import { productId, type ColorKey } from "@/data/types";
import {
  NO_CHANGE_MESSAGE,
  catalogFailureMessage,
  catalogFailureOf,
  checkAdjustment,
  colorLabelOf,
  cutTotal,
  dropSubject,
  failureDetail,
  isEmptyPatch,
  nextDropNo,
  overlapMessage,
  overlappingDrop,
  productPatch,
  readCells,
  readColorOrder,
  readDropNo,
  readNewProduct,
  readPhotoMap,
  readPromoDraft,
  readTeaser,
  readWindow,
  sameOrder,
  sameTerms,
  termsOf,
  type CatalogFailure,
  type CatalogMove,
} from "@/lib/catalog-admin";
import { demoNow } from "@/lib/clock";
import { dateTimeLabel, dayMonthYear, toVnIso } from "@/lib/datetime";
import { loadCatalog } from "@/lib/db/catalog";
import type { Json } from "@/lib/db/database.types";
import {
  photoKeyInUse,
  removeLoosePhotos,
  removeUploadedPhotos,
  storeUploadedPhoto,
} from "@/lib/db/photos";
import { getSupabase } from "@/lib/db/server";
import { requireAdmin } from "@/lib/db/session";
import { dropState } from "@/lib/drop";
import { PRODUCT_EDIT_REASON, cellDelta } from "@/lib/inventory-adjust";
import { LEX, issueNo } from "@/lib/lexicon";
import {
  MAX_UPLOAD_BYTES,
  isUploadedKey,
  uploadKey,
  uploadProblem,
  type UploadType,
} from "@/lib/photos";
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
  | "admin_update_product"
  | "admin_add_product"
  | "admin_set_product_photo"
  | "admin_reorder_colors";

/** What one call answered: its data, or the failure and what it was about. */
type Called<T> =
  | { ok: true; data: T }
  | { ok: false; failure: CatalogFailure; detail: string };

/**
 * Run one `admin_*` function and keep what it returned — the new style's id,
 * the photo a swap replaced — or the code it refused with and its DETAIL
 * (the colour, the issue in the way). A failure the database did not name is
 * logged for the server and reported to the screen only as "chưa lưu được".
 */
async function call<T = unknown>(fn: CatalogFunction, args: Record<string, unknown>): Promise<Called<T>> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (!error) return { ok: true, data: data as T };
  const failure = catalogFailureOf(error);
  if (failure === "UNAVAILABLE") console.error(`${fn}:`, error.message);
  return { ok: false, failure, detail: failureDetail(error) };
}

/** `call` for the functions that return nothing: null when it went through. */
async function run(fn: CatalogFunction, args: Record<string, unknown>): Promise<CatalogFailure | null> {
  const result = await call(fn, args);
  return result.ok ? null : result.failure;
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
  // Slice B3c: one issue at a time — the database refuses an overlap too, and
  // names the issue in the way the same way.
  const clash = overlappingDrop(catalog.drops, window.value);
  if (clash) return refused(overlapMessage(clash.no));

  const result = await call("admin_add_drop", {
    p_no: n,
    p_opens_at: window.value.opensAt,
    p_closes_at: window.value.closesAt,
    p_now: now(),
  });
  if (!result.ok) {
    const other = Number(result.detail);
    if (result.failure === "NOT_ALLOWED" && Number.isInteger(other) && other > 0) {
      return refused(overlapMessage(other));
    }
    return failed("ADD_DROP", result.failure, dropSubject(n));
  }

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
 *
 * SLICE B3c adds two optional fields, and two more steps after those two:
 *
 *   · `colors` — the band order, which must be exactly the colours the style
 *     has (colours are fixed when the cloth is cut, QĐ-27); the order it
 *     already has is not a change;
 *   · `photos` — colour → key, only for the colours whose photo changed (a
 *     borrowed frame or an upload's key from `uploadProductPhoto`).
 *
 * In this order: `admin_update_product` (the fields) → `admin_adjust_stock`
 * (the grid) → `admin_reorder_colors` (the band) → `admin_set_product_photo`
 * (each photo) → the replaced uploads nobody shows any more are removed from
 * the bucket. Each step is its own transaction, so when one fails the answer
 * names what IS saved and which step is not, and why; nothing before it is
 * undone.
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

  // The band order, when one was sent and it is not the one the style has.
  let order: ColorKey[] | null = null;
  if (fields.colors !== undefined) {
    const band = readColorOrder(fields.colors, product.colors);
    if (!band.ok) return refused(band.error);
    if (!sameOrder(band.value, product.colors)) order = band.value;
  }

  // The photos that change: a key equal to the colour's own is not a change.
  const sentPhotos = readPhotoMap(fields.photos, product.colors, catalog);
  if (!sentPhotos.ok) return refused(sentPhotos.error);
  const photos = product.colors.flatMap((color, i) => {
    const after = sentPhotos.value[color];
    const before = product.photoKeys[i] ?? "";
    return after && after !== before ? [{ color, before, after }] : [];
  });

  if (isEmptyPatch(patch) && cells.length === 0 && order === null && photos.length === 0) {
    return refused(NO_CHANGE_MESSAGE);
  }

  const at = now();
  const name = patch.name ?? product.name;
  // What went through, in the words the answer uses.
  const saved: string[] = [];
  const stop = (step: string, why: string): ActionState => {
    if (saved.length > 0) catalogMoved();
    return refused(saved.length > 0 ? `Đã lưu ${saved.join(", ")} ${name}; ${step} CHƯA lưu: ${why}` : why);
  };

  if (!isEmptyPatch(patch)) {
    const failure = await run("admin_update_product", {
      p_id: product.id,
      p_patch: patch as unknown as Json,
      p_now: at,
    });
    if (failure) {
      return failed("UPDATE_PRODUCT", failure, failure === "NOT_ALLOWED" ? (patch.slug ?? product.slug) : product.name);
    }
    saved.push("thông tin");
  }

  if (cells.length > 0) {
    const failure = await run("admin_adjust_stock", {
      p_product_id: product.id,
      p_cells: cells as unknown as Json,
      p_reason: PRODUCT_EDIT_REASON,
      p_ref: "",
      p_note: "",
      p_now: at,
    });
    if (failure) return stop("tồn kho", catalogFailureMessage("ADJUST_STOCK", failure, name));
    saved.push("tồn kho");
  }

  if (order !== null) {
    const failure = await run("admin_reorder_colors", {
      p_id: product.id,
      p_colors: order,
      p_now: at,
    });
    if (failure) return stop("thứ tự dải màu", catalogFailureMessage("REORDER_COLORS", failure, name));
    saved.push("thứ tự dải màu");
  }

  // Each photo, then the uploads they replaced — only once none of them is
  // shown anywhere any more (another style or a teaser may use the same one).
  const replaced: string[] = [];
  for (const p of photos) {
    const label = COLORS[p.color].label;
    const result = await call<string>("admin_set_product_photo", {
      p_id: product.id,
      p_color: p.color,
      p_photo_key: p.after,
      p_now: at,
    });
    if (!result.ok) {
      await removeLoosePhotos(replaced);
      return stop(`ảnh ${label}`, catalogFailureMessage("SET_PHOTO", result.failure, label));
    }
    saved.push(`ảnh ${label}`);
    replaced.push(result.data);
  }
  await removeLoosePhotos(replaced);

  catalogMoved();
  const parts = [
    ...(cells.length > 0 ? [`tồn kho ${signed(cellDelta(cells))} chiếc`] : []),
    ...(order !== null ? ["thứ tự dải màu"] : []),
    ...(photos.length > 0 ? [photoSummary(photos)] : []),
  ];
  return done(`Đã sửa mẫu ${name}${parts.map((p) => ` · ${p}`).join("")} · đã lưu`);
}

/**
 * "1 ảnh thật thay ảnh mượn, 1 ảnh thật mới" — what the photo swaps of one
 * save amounted to, by what each colour went from and to.
 */
function photoSummary(photos: ReadonlyArray<{ before: string; after: string }>): string {
  const count = (test: (p: { before: string; after: string }) => boolean) => photos.filter(test).length;
  const real = (key: string) => isUploadedKey(key);
  return [
    [count((p) => real(p.after) && !real(p.before)), "ảnh thật thay ảnh mượn"],
    [count((p) => real(p.after) && real(p.before)), "ảnh thật mới"],
    [count((p) => !real(p.after)), "ảnh mượn tạm"],
  ]
    .filter(([n]) => (n as number) > 0)
    .map(([n, what]) => `${n} ${what}`)
    .join(", ");
}

// ────────────────────────────────────────────────────── a new style (B3c)
/**
 * "Tạo mẫu": the form's draft — `{ name, kind, fit, slug?, priceVnd,
 * material, dropNo, colors, photos, cells }`, with `colors` in band order,
 * `photos` a borrowed key or an upload's for EVERY colour, `cells` the pieces
 * to cut per colour and size — read against the manager's catalogue
 * (`readNewProduct`), then written in one go by `admin_add_product()`.
 *
 * The family is the kind's, an empty address box becomes the name's segment
 * (`-2`, `-3` if taken), and an issue that has closed takes no new style. A
 * style for an issue that has not opened is created all the same — it is on
 * the back office's list at once and on the shop from the hour its issue
 * opens (`catalog_snapshot()`).
 *
 * Answers with the new style's id, so the form can go to its page.
 */
export async function createProduct(draft: unknown): Promise<ActionState & { id?: string }> {
  await requireAdmin("/admin/products/new");
  const catalog = await loadCatalog();
  const read = readNewProduct(draft, catalog);
  if (!read.ok) return refused(read.error);
  const input = read.value;

  const at = now();
  const drop = catalog.dropByNo.get(input.dropNo);
  if (!drop) return failed("ADD_PRODUCT", "NOT_FOUND", dropSubject(input.dropNo));
  if (dropState(drop, new Date(at)) === "CLOSED") {
    return failed("ADD_PRODUCT", "DROP_CLOSED", dropSubject(input.dropNo));
  }

  const result = await call<string>("admin_add_product", {
    p_input: input as unknown as Json,
    p_now: at,
  });
  if (!result.ok) {
    const subject =
      result.failure === "NOT_FOUND" || result.failure === "DROP_CLOSED"
        ? dropSubject(input.dropNo)
        : colorLabelOf(result.detail);
    return failed("ADD_PRODUCT", result.failure, subject);
  }

  catalogMoved();
  const uploaded = input.colors.filter((c) => isUploadedKey(c.photoKey)).length;
  return {
    ...done(
      `Đã tạo ${input.name} · ${input.colors.length} màu · ${cutTotal(input.cells)} chiếc` +
        (uploaded > 0 ? ` · ${uploaded} ảnh tải lên` : "") +
        " · đã lưu",
    ),
    id: result.data,
  };
}

// ────────────────────────────────────────────────────────── photos (B3c)
/**
 * One photo from the product form, already cropped to 4:5 and shrunk in the
 * browser: `form.get("file")` a WebP or a JPEG of at most 1,5 MB, and
 * `form.get("color")` the colour it is for — used only to word a refusal.
 *
 * The server does not trust the browser's word for what the file is: it
 * checks the size, the declared type AND the first bytes (`uploadProblem`),
 * then stores it in the `product-photos` bucket under a new random key with
 * the service role, and answers with the key. Nothing shows the photo yet —
 * `createProduct` or `updateProduct` does that — so nothing is revalidated.
 * Without `SUPABASE_SECRET_KEY` it says "không tải được" and stores nothing.
 */
export async function uploadProductPhoto(form: FormData): Promise<ActionState & { key?: string }> {
  await requireAdmin("/admin/products");
  if (!(form instanceof FormData)) return failed("UPLOAD_PHOTO", "UPLOAD_BAD");
  const color = form.get("color");
  const label = typeof color === "string" ? colorLabelOf(color) : "";

  const file = form.get("file");
  if (!(file instanceof Blob)) return failed("UPLOAD_PHOTO", "UPLOAD_BAD", label);
  // The size before the bytes: a file over the limit is not worth reading.
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) return failed("UPLOAD_PHOTO", "UPLOAD_BAD", label);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (uploadProblem(file.type, bytes.byteLength, bytes)) return failed("UPLOAD_PHOTO", "UPLOAD_BAD", label);

  const type = file.type as UploadType;
  const key = uploadKey(crypto.randomUUID(), type);
  if (!(await storeUploadedPhoto(key, bytes, type))) return failed("UPLOAD_PHOTO", "UNAVAILABLE", label);

  return { ...done(label ? `Đã tải ảnh ${label} lên` : "Đã tải ảnh lên"), key };
}

/**
 * Tidy up after a form: an uploaded photo that was never attached (the form
 * was closed, the file changed). Only a key of an upload's shape, and only
 * when no style's colour and no teaser shows it — a photo in use is kept and
 * the answer says so (the brief's `NO_CHANGE`). A key already gone is fine.
 */
export async function removeUploadedPhoto(key: unknown): Promise<ActionState> {
  await requireAdmin("/admin/products");
  if (!isUploadedKey(key)) return failed("UPLOAD_PHOTO", "BAD_INPUT");
  if (await photoKeyInUse(key)) return refused("Ảnh này đang dùng cho một mẫu — giữ lại, không xoá.");

  const { removed, failed: broke } = await removeUploadedPhotos([key]);
  if (broke) return refused("Chưa xoá được ảnh. Thử lại sau ít phút.");
  return done(removed > 0 ? "Đã bỏ ảnh vừa tải lên" : "Ảnh này đã không còn trên kho");
}
