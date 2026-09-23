"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Ward } from "@/data/regions";

/**
 * Commune names in the browser, one province at a time.
 *
 * `data/wards.json` is 218KB of 3,321 communes and stays on the server
 * behind `/api/wards` (see the route's own note). Checkout needs the names
 * in two places — the dropdown in the new-address form, and the saved
 * addresses in the picker, which store a ward CODE and nothing else — so the
 * fetching lives here rather than being written twice.
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

/**
 * Resolve `(province, ward)` pairs to names, fetching each province once.
 *
 * Returns "" until the answer arrives, and the callers treat that as "not
 * known yet" rather than as "no ward": an address line is built by joining
 * the parts that ARE known, so a slow answer leaves the street and the city
 * on screen instead of an empty row.
 */
export function useWardLabels(provinceCodes: string[]): (
  provinceCode: string,
  wardCode: string,
) => string {
  const [labels, setLabels] = useState<Record<string, Record<string, string>>>({});
  const asked = useRef(new Set<string>());

  // A string, not the array: a fresh array on every render would restart the
  // effect on every render.
  const key = [...new Set(provinceCodes.filter(Boolean))].sort().join(",");

  useEffect(() => {
    if (!key) return;
    for (const code of key.split(",")) {
      if (asked.current.has(code)) continue;
      asked.current.add(code);

      fetch(`/api/wards?province=${encodeURIComponent(code)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data: { wards: Ward[] }) => {
          const map: Record<string, string> = {};
          for (const w of data.wards) map[w.code] = wardOptionLabel(w);
          setLabels((prev) => ({ ...prev, [code]: map }));
        })
        .catch(() => {
          // Let a failed province be asked for again on the next render
          // rather than remembering the failure forever.
          asked.current.delete(code);
        });
    }
  }, [key]);

  return useCallback(
    (provinceCode: string, wardCode: string) => labels[provinceCode]?.[wardCode] ?? "",
    [labels],
  );
}
