import {
  ADDRESS_LABELS,
  addressId,
  customerId,
  type Address,
  type AddressLabel,
} from "@/data/types";
import type { AdminCustomer } from "@/lib/admin-customers";
import { toVnIso } from "@/lib/datetime";
import type { Me } from "@/lib/me";
import { vnIso as exactVnIso } from "./event-dto";

/**
 * Postgres rows → the shapes in `data/types.ts`.
 *
 * Kept in a module of its own, WITHOUT `import "server-only"`, for the reason
 * slice B0b found the hard way: the marker does not resolve under vitest, so a
 * mapper that lives beside the query cannot be unit-tested. The query modules
 * (`profiles.ts`, `addresses.ts`) carry the marker; this one is pure and has
 * `account-dto.test.ts` beside it.
 */

/** Exactly the columns `profiles.ts` selects. */
export interface ProfileRow {
  id: string;
  handle: string | null;
  name: string;
  email: string;
  phone: string;
  joined_at: string;
}

/** Exactly the columns `addresses.ts` selects. */
export interface AddressRow {
  id: string;
  recipient: string;
  phone: string;
  line: string;
  province_code: string;
  ward_code: string;
  label: string;
  is_default: boolean;
}

/**
 * `timestamptz` comes back from PostgREST normalised to whatever offset the
 * connection is in — usually `+00:00`. Every formatter in `lib/datetime.ts`
 * reads the offset out of the TEXT rather than going through `Date`, on
 * purpose, so a UTC string would print a date seven hours early. `toVnIso`
 * puts the Vietnamese wall clock back, exactly as `catalog_snapshot()` does
 * for the catalogue's instants.
 */
function vnIso(raw: string): string {
  const t = Date.parse(raw);
  return Number.isNaN(t) ? raw : toVnIso(new Date(t));
}

/**
 * A nickname this build does not know is not a reason to lose an address:
 * everything a parcel needs is still there, and the label is the one field a
 * screen can supply a default for — the same one the form starts on. Same
 * rule `lib/address-book.ts#parseAddressBook` applies to stored entries.
 */
function labelOf(raw: string): AddressLabel {
  return (ADDRESS_LABELS as readonly string[]).includes(raw) ? (raw as AddressLabel) : "Nhà";
}

export function toMe(row: ProfileRow): Me {
  return {
    id: customerId(row.id),
    handle: row.handle ? customerId(row.handle) : null,
    name: row.name,
    email: row.email,
    phone: row.phone,
    joinedAt: vnIso(row.joined_at),
  };
}

export function toAddress(row: AddressRow): Address {
  return {
    id: addressId(row.id),
    recipient: row.recipient,
    phone: row.phone,
    line: row.line,
    provinceCode: row.province_code,
    wardCode: row.ward_code,
    label: labelOf(row.label),
    isDefault: row.is_default,
  };
}

/**
 * A profile as the back office lists it (slice B3a) — every account, read by
 * the manager through the admin read policy. To the second, like every other
 * instant the back office reads (`event-dto.ts#vnIso`).
 */
export function toAdminCustomer(row: ProfileRow): AdminCustomer {
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    email: row.email,
    phone: row.phone,
    joinedAt: exactVnIso(row.joined_at, `profile ${row.id}.joined_at`),
  };
}
