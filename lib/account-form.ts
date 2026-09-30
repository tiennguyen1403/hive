import type { AddressLabel } from "@/data/types";

/**
 * An address as the account's address book writes it (`lib/db/addresses.ts`,
 * `lib/actions/addresses.ts`).
 */
export interface AddressDraft {
  recipient: string;
  phone: string;
  provinceCode: string;
  wardCode: string;
  line: string;
  label: AddressLabel;
  isDefault: boolean;
}
