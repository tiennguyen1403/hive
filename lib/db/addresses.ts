import "server-only";

import { cache } from "react";
import type { Address, AddressId } from "@/data/types";
import type { AddressDraft } from "@/lib/account-form";
import { toAddress } from "./account-dto";
import { getSupabase } from "./server";
import { getSession } from "./session";

/**
 * The address book, in Postgres.
 *
 * Until slice B1 the account's addresses were half fixture and half
 * `localStorage`, and every screen that showed them had to say which half it
 * was looking at. They are one thing now: rows in `public.addresses`, filtered
 * by row level security to the person asking. Nothing here passes an owner id
 * to the database — `auth.uid()` inside the policy is the owner, so a caller
 * cannot ask for somebody else's book by changing a parameter.
 *
 * The three writes that have to be atomic go through SQL functions
 * (`add_address`, `update_address`, `remove_address`, `set_default_address`):
 * "exactly one default" is a partial unique index, and clearing the old flag
 * and setting the new one is two statements that must not be interrupted.
 * "Hoàn tác" after a removal is a fifth, `restore_address` (slice B10).
 */

/** Newest last: `position` is the order the book was built in. */
export const listAddresses = cache(async (): Promise<Address[]> => {
  const session = await getSession();
  if (!session) return [];

  // The owner is named, not left to row level security: since slice B3a the
  // manager may read every book (the admin read policy), and the manager's
  // own address book is still only theirs.
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("addresses")
    .select("id, recipient, phone, line, province_code, ward_code, label, is_default")
    .eq("profile_id", session.userId)
    .order("position", { ascending: true });

  if (error || !data) return [];
  return data.map(toAddress);
});

/** One entry by id, or nothing — used by the edit form. RLS does the filtering. */
export async function findAddress(id: string): Promise<Address | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("addresses")
    .select("id, recipient, phone, line, province_code, ward_code, label, is_default")
    .eq("id", id)
    .eq("profile_id", session.userId)
    .maybeSingle();

  if (error || !data) return null;
  return toAddress(data);
}

export async function addAddress(draft: AddressDraft): Promise<AddressId | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("add_address", {
    p_recipient: draft.recipient.trim(),
    p_phone: draft.phone,
    p_line: draft.line.trim(),
    p_province_code: draft.provinceCode,
    p_ward_code: draft.wardCode,
    p_label: draft.label,
    p_default: draft.isDefault,
  });

  if (error || !data) return null;
  return data as AddressId;
}

/** False when the id is not this account's — which is also what "not found" looks like. */
export async function updateAddress(id: string, draft: AddressDraft): Promise<boolean> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("update_address", {
    p_id: id,
    p_recipient: draft.recipient.trim(),
    p_phone: draft.phone,
    p_line: draft.line.trim(),
    p_province_code: draft.provinceCode,
    p_ward_code: draft.wardCode,
    p_label: draft.label,
    p_default: draft.isDefault,
  });

  return !error && data === true;
}

/**
 * Since slice B10 the database keeps what it removed aside, the account's last
 * removal only, for `restoreAddress`.
 */
export async function removeAddress(id: string): Promise<boolean> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("remove_address", { p_id: id });
  return !error && data === true;
}

/**
 * "Hoàn tác" (slice B10): the account's last removal, if it is `id`, back in
 * the book as it was — its id, its place, its fields, its default role. Only
 * the id crosses; the rest is the row `remove_address` kept aside. The id it
 * went back under, or null when there is nothing of this account's to put back.
 */
export async function restoreAddress(id: string): Promise<AddressId | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("restore_address", { p_id: id });
  if (error || typeof data !== "string" || data === "") return null;
  return data as AddressId;
}

export async function setDefaultAddress(id: string): Promise<boolean> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("set_default_address", { p_id: id });
  return !error && data === true;
}
