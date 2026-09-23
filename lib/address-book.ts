import { ADDRESS_LABELS } from "@/data/types";
import type { AddressDraft } from "./account-form";

/**
 * The GUEST address book: what this browser has saved, for somebody who is
 * not signed in.
 *
 * It used to be two sources — the fixture customer's addresses overlaid
 * with whatever `localStorage` held — and every screen that showed it had
 * to say which half each row came from. Slice B1 gave an account a real
 * book in Postgres (`lib/db/addresses.ts`), so the merge went with the
 * fixture: signed in, the book is the account's; signed out, it is this
 * one, and "lưu trên thiết bị này" is still exactly true of it.
 */

export type AddressSource = "account" | "device";

export interface SavedAddress extends AddressDraft {
  id: string;
  source: AddressSource;
}

export const ADDRESS_BOOK_STORAGE_KEY = "brand.addresses";
const SCHEMA_VERSION = 1;

/** The one checkout prefills. Falls back to the first rather than to none. */
export function defaultAddress(book: SavedAddress[]): SavedAddress | undefined {
  return book.find((a) => a.isDefault) ?? book[0];
}

/**
 * Add or replace one entry.
 *
 * A new default clears the old one. Two addresses both claiming to be the
 * one checkout prefills is a question with two answers.
 */
export function saveAddress(
  list: SavedAddress[],
  draft: AddressDraft,
  id: string,
): SavedAddress[] {
  const entry: SavedAddress = { ...draft, id, source: "device" };
  const next = list.some((a) => a.id === id)
    ? list.map((a) => (a.id === id ? entry : a))
    : [...list, entry];
  return draft.isDefault ? next.map((a) => ({ ...a, isDefault: a.id === id })) : next;
}

export function removeAddress(list: SavedAddress[], id: string): SavedAddress[] {
  return list.filter((a) => a.id !== id);
}

// ─────────────────────────────────────────────────────────────── storage
export function serializeAddressBook(list: SavedAddress[]): string {
  return JSON.stringify({ v: SCHEMA_VERSION, list });
}

export function parseAddressBook(raw: string | null): SavedAddress[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!isRecord(parsed) || parsed.v !== SCHEMA_VERSION || !Array.isArray(parsed.list)) {
    return [];
  }
  // A record written before the label existed — or one carrying a word this
  // build does not know — is NOT dropped: everything a parcel needs is still
  // there, and the nickname is the one field a screen can supply a default
  // for. It falls back to the same value the form starts on.
  return parsed.list.filter(isSaved).map((a) => ({
    ...a,
    label: (ADDRESS_LABELS as readonly string[]).includes(a.label) ? a.label : "Nhà",
  }));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Every field a shipping label needs, checked one by one. A half-built
 * address is a parcel that does not arrive, so a partial entry is dropped
 * rather than shown.
 */
function isSaved(v: unknown): v is SavedAddress {
  if (!isRecord(v)) return false;
  // `label` is not on this list: it has a safe default (above), and dropping
  // a whole address over a missing nickname loses a real street address.
  const strings = ["id", "recipient", "phone", "provinceCode", "wardCode", "line"];
  return (
    strings.every((k) => typeof v[k] === "string" && (v[k] as string).length > 0) &&
    typeof v.isDefault === "boolean" &&
    (v.source === "device" || v.source === "account")
  );
}
