"use client";

import { useCallback, useEffect, useState } from "react";

export const ADMIN_COLS_KEY = "brand.adminCols";

/**
 * Which optional columns the operator wants to see.
 *
 * ON THE DEVICE, not in the URL — unlike every other control on these tables
 * (QĐ-8). A tab, a filter and a page number describe WHAT THE SCREEN IS
 * SHOWING, so they belong in an address somebody can copy; which columns are
 * drawn is a preference of the person sitting there, and carrying it in the
 * address would paste somebody else's layout into every shared link.
 *
 * Read after mount, never during render: the page is server-rendered, and
 * reading `localStorage` while rendering would hydrate into a different tree
 * (the same rule the cart and the wishlist follow).
 */
export function useAdminCols(defaults: string[]) {
  const [cols, setCols] = useState<string[]>(defaults);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ADMIN_COLS_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
        setCols(parsed as string[]);
      }
    } catch {
      // A browser that refuses storage still gets the default columns.
    }
  }, []);

  const toggle = useCallback((key: string) => {
    setCols((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        window.localStorage.setItem(ADMIN_COLS_KEY, JSON.stringify(next));
      } catch {
        // Losing the preference must not break the table in front of them.
      }
      return next;
    });
  }, []);

  return { cols, toggle };
}
