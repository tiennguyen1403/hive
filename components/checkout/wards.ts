"use client";

import type { Ward } from "@/data/regions";

/**
 * Commune names in the browser, one province at a time.
 *
 * `data/wards.json` is 218KB of 3,321 communes and stays on the server
 * behind `/api/wards` (see the route's own note). The screens that ask it
 * for a province — the back office's address form (`ArcAddressForm`), the
 * Feed's checkout and address sheet — name each commune the one way, with
 * `wardOptionLabel`.
 */

/** Mirrors `wardLabel` in `data/regions.ts`, which is server-side only here. */
const PREFIX: Record<Ward["kind"], string> = {
  WARD: "Phường",
  COMMUNE: "Xã",
  SPECIAL_ZONE: "Đặc khu",
};

export function wardOptionLabel(w: Ward): string {
  return `${PREFIX[w.kind]} ${w.name}`;
}
