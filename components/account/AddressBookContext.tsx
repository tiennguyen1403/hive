"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AddressDraft } from "@/lib/account-form";
import {
  ADDRESS_BOOK_STORAGE_KEY,
  parseAddressBook,
  removeAddress,
  saveAddress,
  serializeAddressBook,
  type SavedAddress,
} from "@/lib/address-book";

interface AddressBookApi {
  /** Only what this device saved. The account's own come from the customer. */
  device: SavedAddress[];
  ready: boolean;
  save: (draft: AddressDraft, id?: string) => string;
  remove: (id: string) => void;
}

const Ctx = createContext<AddressBookApi | null>(null);

/**
 * Addresses saved on this device.
 *
 * Kept out of the session provider because it is not account state: there is
 * no server to hold an address book on, so what somebody saves here is
 * theirs and lives in this browser. Every screen that shows it says so.
 *
 * Checkout reads the default from here, which is the promise the approved
 * address screen makes: "Địa chỉ mặc định được điền sẵn ở bước thanh toán."
 */
export function AddressBookProvider({ children }: { children: React.ReactNode }) {
  const [device, setDevice] = useState<SavedAddress[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setDevice(parseAddressBook(window.localStorage.getItem(ADDRESS_BOOK_STORAGE_KEY)));
    } catch {
      // A device that cannot remember still gets a working form.
    }
    setReady(true);
  }, []);

  /**
   * The write is gated on `ready`, a STATE value, not on a ref.
   *
   * With a ref the guard flips synchronously inside the read effect, so the
   * write effect — which runs in the same commit — sees "loaded" while
   * `device` is still the empty starting value, and saves that empty value
   * over what was in storage. It usually self-heals on the next render, but
   * a navigation inside that window makes the empty write the one that
   * survives. `ready` lands in the same batch as the data, so the write
   * effect first runs on a commit that already has both.
   */
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(ADDRESS_BOOK_STORAGE_KEY, serializeAddressBook(device));
    } catch {
      // Losing persistence must not break the page in front of them.
    }
  }, [device, ready]);

  const save = useCallback((draft: AddressDraft, id?: string) => {
    // `crypto.randomUUID` would be a new id on every attempt; here each call
    // IS a distinct address, so a fresh id per save is exactly right.
    const key = id ?? `addr-${Date.now().toString(36)}`;
    setDevice((list) => saveAddress(list, draft, key));
    return key;
  }, []);

  const remove = useCallback((id: string) => {
    setDevice((list) => removeAddress(list, id));
  }, []);

  const value = useMemo<AddressBookApi>(
    () => ({ device, ready, save, remove }),
    [device, ready, save, remove],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAddressBook(): AddressBookApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAddressBook must be used inside <AddressBookProvider>");
  return ctx;
}
