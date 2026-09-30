/**
 * What the app once kept on a device and no longer reads (round v4 slice 5).
 *
 * The v3 screens kept lists in the browser — saved styles, issue reminders,
 * the notification switches, which notifications were read, "để dành", the
 * guest's address book — that went with those screens (the account keeps the
 * first three since slice B9, and the Feed inbox its read marks in the
 * `inbox_read` cookie since slice 4a); the
 * session and the orders went to the server at slices B1 and B2, and the back
 * office's simulation to the database at B3b. Nothing reads these keys any
 * more, so left in place they would sit on the device for good — and
 * `brand.addresses` holds a guest's names, phone numbers and addresses, which
 * the app no longer shows and so no longer offers to delete.
 *
 * So the root layout's basket (`CartProvider`) forgets them once per visit,
 * from `localStorage` and `sessionStorage` both. The five keys still read —
 * `brand.cart`, `brand.promo`, `brand.searches`, `brand.height` and
 * `brand.adminCols` — are not in the list, and `device-storage.test.ts`
 * keeps it that way.
 */
export const RETIRED_KEYS = [
  "brand.wishlist",
  "brand.reminder",
  "brand.prefs",
  "brand.notif.read",
  "brand.later",
  "brand.addresses",
  "brand.session",
  "brand.orders",
  "brand.lastOrder",
  "brand.adminSim",
] as const;

/**
 * Removes every retired key from the storage `open` returns. Never throws.
 *
 * Handed a way to reach the storage rather than the storage itself, because
 * a browser that blocks storage (a policy, some private modes) throws on
 * `window.localStorage` itself, not only on its methods; both are caught
 * here, and a key that cannot be removed does not stop the next one.
 */
export function forgetRetiredKeys(open: () => Pick<Storage, "removeItem">): void {
  let storage: Pick<Storage, "removeItem">;
  try {
    storage = open();
  } catch {
    return;
  }
  for (const key of RETIRED_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      // Nothing kept there can be read either; move on.
    }
  }
}
