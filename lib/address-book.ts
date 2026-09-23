import type { Customer } from "@/data/types";
import { ADDRESS_LABELS } from "@/data/types";
import type { AddressDraft } from "./account-form";

/**
 * The address book: the ones the account came with, plus the ones this
 * device has saved.
 *
 * Two sources on purpose. The seeded addresses belong to the fixture
 * customer and cannot be written to — there is no server behind them. What
 * somebody adds here is theirs and lives in `localStorage`, which is a real
 * place, so the screen can say "lưu trên thiết bị này" and mean it.
 *
 * A device entry sharing a seeded entry's id REPLACES it. That is what
 * editing a seeded address does: the original stays in the fixture, the
 * overlay wins on screen. Showing both would leave the shopper looking at
 * two versions of one place.
 */

export type AddressSource = "account" | "device";

export interface SavedAddress extends AddressDraft {
  id: string;
  source: AddressSource;
}

export const ADDRESS_BOOK_STORAGE_KEY = "brand.addresses";
const SCHEMA_VERSION = 1;

/**
 * Whatever the account shipped with, in a shape the screens can render.
 *
 * The label is the address's OWN (`data/customers.ts`) since v3 slice 3.
 * Before that every seeded entry was stamped "Nhà", so an account holding
 * two of them showed "Nhà · Trần Minh Anh · 0912 345 678" twice and the
 * picker gave no way to tell one from the other.
 */
function seeded(customer: Customer): SavedAddress[] {
  return customer.addresses.map((a) => ({
    id: a.id,
    recipient: a.recipient,
    phone: a.phone,
    provinceCode: a.provinceCode,
    wardCode: a.wardCode,
    line: a.line,
    label: a.label,
    isDefault: a.isDefault,
    source: "account" as const,
  }));
}

export function addressBookFor(customer: Customer, device: SavedAddress[]): SavedAddress[] {
  const overlay = new Map(device.map((a) => [a.id, a]));
  const merged = seeded(customer).map((a) => overlay.get(a.id) ?? a);
  const usedIds = new Set(merged.map((a) => a.id));
  const book = [...merged, ...device.filter((a) => !usedIds.has(a.id))];

  /**
   * One default across the WHOLE book, not one per source.
   *
   * `saveAddress` clears the flag inside the device list, but the seeded
   * address carries `isDefault` from the fixture and is not in that list —
   * so both survived, and `defaultAddress` returned the seeded one. Saving
   * a new default then looked like it had done nothing: the address screen
   * showed two "Mặc định" badges and checkout still prefilled the old one.
   *
   * A device choice wins, because it is the one somebody actually made.
   */
  const chosen = book.find((a) => a.source === "device" && a.isDefault);
  if (!chosen) return book;
  return book.map((a) => ({ ...a, isDefault: a.id === chosen.id }));
}

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
