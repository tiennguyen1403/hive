"use server";

import { revalidatePath } from "next/cache";
import { findProvince, findWard } from "@/data/regions";
import { ADDRESS_LABELS, type AddressLabel } from "@/data/types";
import type { AddressDraft } from "@/lib/account-form";
import { normalisePhone } from "@/lib/checkout-form";
import * as book from "@/lib/db/addresses";
import { takeRate } from "@/lib/db/rate-limit";
import { requireSession } from "@/lib/db/session";
import { feedAddressErrors, readAddressId, type AddressField, type AddressResult } from "@/lib/feed-account";

/**
 * The address book's writes.
 *
 * Each one checks the session itself. A Server Action is a public endpoint —
 * "Always verify authentication and authorization inside every Server
 * Function" (`01-getting-started/07-mutating-data.md`) — and the id it is
 * sent is a number somebody can change in the devtools, so it is never
 * trusted: the SQL functions behind these filter on `auth.uid()`, and row
 * level security filters again underneath them. An id belonging to somebody
 * else comes back as "not found", which is also the only thing it should look
 * like (QĐ-16).
 *
 * `revalidatePath` and not `updateTag`: Cache Components are off in this
 * project, so the page reads the database on every request and what needs
 * clearing is the client router's copy of it
 * (`02-guides/caching-without-cache-components.md`).
 *
 * Slice B4b: each one spends a token of the visitor's `account` limit right
 * after the session check — thirty account writes per ten minutes, shared with
 * "Huỷ đơn" (`lib/db/rate-limit.ts`).
 */

const ADDRESS_PATHS = ["/account/addresses", "/account", "/checkout"] as const;

function refreshAddressScreens(): void {
  for (const path of ADDRESS_PATHS) revalidatePath(path);
}

function labelOf(raw: string): AddressLabel {
  return (ADDRESS_LABELS as readonly string[]).includes(raw) ? (raw as AddressLabel) : "Nhà";
}

// ──────────────────────────────────────────── the Feed's address book (round v4 slice 3a)
/**
 * The Feed's "Địa chỉ" (`prototype/explore/feed/addresses.js`): the sheet adds
 * and edits, the cards set the default and delete — and since slice B10
 * "Hoàn tác" puts a deleted address back where it was. Each one ANSWERS — the
 * sheet closes and the toast says what was done ("Đã thêm địa chỉ", "Đã xoá
 * Nhà"), or a toast says what was not, in the fewest words: nothing in the
 * address book fails silently any more (the open item "vài thao tác địa chỉ
 * lỗi im lặng", `tasks/plan.md`).
 *
 * The arguments arrive from the browser and are re-read as `unknown`. The
 * sheet's fields are judged by the mock's rules (`feedAddressErrors`), then
 * by what only the server knows: that the commune belongs to the province.
 */

const text = (v: unknown): string => (typeof v === "string" ? v : "");

/** A short sentence for a write the database refused or could not make. */
const NOT_SAVED = "Chưa lưu được địa chỉ";
const NOT_REMOVED = "Chưa xoá được địa chỉ";
const NOT_DEFAULT = "Chưa đặt được mặc định";
const NOT_FOUND = "Không tìm thấy địa chỉ này";
const NOT_RESTORED = "Chưa hoàn tác được";

/** "Lưu địa chỉ": a new address (`id` null) or an edit. */
export async function saveFeedAddress(input: unknown): Promise<AddressResult> {
  await requireSession("/account/addresses");

  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const recipient = text(raw.recipient).trim();
  const phoneTyped = text(raw.phone).trim();
  const provinceCode = text(raw.provinceCode);
  const wardCode = text(raw.wardCode);
  const street = text(raw.street).trim();

  const errors: Partial<Record<AddressField, string>> = feedAddressErrors({
    recipient,
    phone: phoneTyped,
    provinceCode,
    wardCode,
    street,
  });
  // What only the server can check: the codes are real, and the commune is the province's.
  if (!errors.province && provinceCode && !findProvince(provinceCode)) errors.province = "Chọn tỉnh / thành";
  if (!errors.province && !errors.ward && wardCode && !findWard(provinceCode, wardCode)) errors.ward = "Chọn phường / xã";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const pace = await takeRate("account");
  if (!pace.ok) return { ok: false, message: pace.message };

  const draft: AddressDraft = {
    recipient,
    // Stored as ten digits, however it was typed — the column will only take that shape.
    phone: normalisePhone(phoneTyped),
    provinceCode,
    wardCode,
    line: street,
    label: labelOf(text(raw.label)),
    isDefault: raw.isDefault === true,
  };

  const id = text(raw.id);
  if (id) {
    const done = await book.updateAddress(id, draft);
    if (!done) return { ok: false, message: NOT_FOUND };
    refreshAddressScreens();
    return { ok: true, id };
  }
  const made = await book.addAddress(draft);
  if (!made) return { ok: false, message: NOT_SAVED };
  refreshAddressScreens();
  return { ok: true, id: String(made) };
}

/** "Xoá". The database keeps the address aside for "Hoàn tác" (`restoreFeedAddress`). */
export async function removeFeedAddress(id: unknown): Promise<AddressResult> {
  await requireSession("/account/addresses");
  const pace = await takeRate("account");
  if (!pace.ok) return { ok: false, message: pace.message };
  const key = text(id);
  if (!key || !(await book.removeAddress(key))) return { ok: false, message: NOT_REMOVED };
  refreshAddressScreens();
  return { ok: true, id: key };
}

/**
 * "Hoàn tác" after "Xoá" (slice B10): the address just removed, back exactly
 * where it was — its place in the book, its id, and the default role if it
 * had it, which the address that took the role over gives back — as the
 * mock's `saveAddresses(before)` does. The browser sends which address and
 * nothing else: the database kept the row when it removed it, so nothing the
 * owner could not have typed decides where it lands (`restore_address`). An
 * id that is not one is refused before a token is spent; one that is not this
 * account's last removal is refused by the database, in the same words.
 */
export async function restoreFeedAddress(id: unknown): Promise<AddressResult> {
  await requireSession("/account/addresses");
  const key = readAddressId(id);
  if (!key) return { ok: false, message: NOT_RESTORED };
  const pace = await takeRate("account");
  if (!pace.ok) return { ok: false, message: pace.message };
  const back = await book.restoreAddress(key);
  if (!back) return { ok: false, message: NOT_RESTORED };
  refreshAddressScreens();
  return { ok: true, id: String(back) };
}

/** "Đặt mặc định". */
export async function makeFeedDefault(id: unknown): Promise<AddressResult> {
  await requireSession("/account/addresses");
  const pace = await takeRate("account");
  if (!pace.ok) return { ok: false, message: pace.message };
  const key = text(id);
  if (!key || !(await book.setDefaultAddress(key))) return { ok: false, message: NOT_DEFAULT };
  refreshAddressScreens();
  return { ok: true, id: key };
}
