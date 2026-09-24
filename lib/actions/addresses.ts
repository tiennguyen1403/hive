"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADDRESS_LABELS, type AddressLabel } from "@/data/types";
import { validateAddressForm, type AddressDraft } from "@/lib/account-form";
import { normalisePhone } from "@/lib/checkout-form";
import * as book from "@/lib/db/addresses";
import { takeRate } from "@/lib/db/rate-limit";
import { requireSession } from "@/lib/db/session";
import type { ActionState } from "./state";

/**
 * The address book's four writes.
 *
 * Each one checks the session itself. A Server Action is a public endpoint —
 * "Always verify authentication and authorization inside every Server
 * Function" (`01-getting-started/07-mutating-data.md`) — and the id in the
 * form is a number somebody can change in the devtools, so it is never
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
 * "Huỷ đơn" (`lib/db/rate-limit.ts`). `saveAddress` says so in the form; the
 * other three answer nothing by design (a form posting with no state, a step
 * of checkout that must not stop the order), so a refused one simply leaves
 * the book as it was.
 */

const ADDRESS_PATHS = ["/account/addresses", "/account", "/checkout"] as const;

function refreshAddressScreens(): void {
  for (const path of ADDRESS_PATHS) revalidatePath(path);
}

const field = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

function labelOf(raw: string): AddressLabel {
  return (ADDRESS_LABELS as readonly string[]).includes(raw) ? (raw as AddressLabel) : "Nhà";
}

/** The form, re-read on the server. Whatever the browser validated, this decides. */
function draftOf(form: FormData): AddressDraft {
  return {
    recipient: field(form, "recipient"),
    // Stored as ten digits, however it was typed — the column will only take
    // that shape (`phone ~ '^0[0-9]{9}$'`).
    phone: normalisePhone(field(form, "phone")) || field(form, "phone"),
    provinceCode: field(form, "provinceCode"),
    wardCode: field(form, "wardCode"),
    line: field(form, "line"),
    label: labelOf(field(form, "label")),
    isDefault: field(form, "isDefault") === "on",
  };
}

/**
 * Add, or edit the one named by `id`.
 *
 * One action for both because the form is one form: which of the two it is
 * depends on a hidden field, and the server decides what that field means.
 */
export async function saveAddress(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireSession("/account/addresses");

  const pace = await takeRate("account");
  if (!pace.ok) return { errors: { form: pace.message } };

  const draft = draftOf(form);
  const found = validateAddressForm(draft);
  const errors: Record<string, string> = {};
  for (const [key, message] of Object.entries(found)) if (message) errors[key] = message;
  if (Object.keys(errors).length > 0) return { errors };

  const id = field(form, "id");
  if (id) {
    const done = await book.updateAddress(id, draft);
    if (!done) return { errors: { form: "Không tìm thấy địa chỉ này trong sổ của bạn." } };
  } else {
    const made = await book.addAddress(draft);
    if (!made) return { errors: { form: "Chưa lưu được địa chỉ. Thử lại sau ít phút." } };
  }

  refreshAddressScreens();
  redirect("/account/addresses");
}

/**
 * "Lưu địa chỉ này vào sổ", from the checkout form.
 *
 * Takes the draft rather than a `FormData` because checkout is not a form
 * posting to this: it validates, places the order and navigates, and the
 * address is one of the things it does on the way. React serialises the
 * argument, so it is re-read and re-validated here exactly like any other
 * submission — and silently dropped if it does not pass, because the order is
 * the thing the shopper pressed for and a half-typed address must not stop it.
 */
export async function rememberAddress(draft: AddressDraft): Promise<void> {
  await requireSession("/checkout");

  if (!(await takeRate("account")).ok) return;

  const clean: AddressDraft = {
    recipient: String(draft.recipient ?? ""),
    phone: normalisePhone(String(draft.phone ?? "")) || String(draft.phone ?? ""),
    provinceCode: String(draft.provinceCode ?? ""),
    wardCode: String(draft.wardCode ?? ""),
    line: String(draft.line ?? ""),
    label: labelOf(String(draft.label ?? "")),
    isDefault: draft.isDefault === true,
  };
  if (Object.keys(validateAddressForm(clean)).length > 0) return;

  await book.addAddress(clean);
  refreshAddressScreens();
}

export async function removeAddress(form: FormData): Promise<void> {
  await requireSession("/account/addresses");
  if (!(await takeRate("account")).ok) return;
  const id = field(form, "id");
  if (id) await book.removeAddress(id);
  refreshAddressScreens();
}

export async function makeDefault(form: FormData): Promise<void> {
  await requireSession("/account/addresses");
  if (!(await takeRate("account")).ok) return;
  const id = field(form, "id");
  if (id) await book.setDefaultAddress(id);
  refreshAddressScreens();
}
