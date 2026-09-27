"use client";

import { useCallback, useState } from "react";
import { shopQuery, type ShopLine, type ShopState } from "@/lib/feed";
import { FeedShop } from "./FeedShop";

/**
 * `/products`, "Cửa hàng" (round v4, slice 1b): the shop grid with its title,
 * the count and the sort (`products.js`), on every line of the moment — "Tất
 * cả" too while an issue sells.
 *
 * The grid's state is in the URL (QĐ-8, the rule the user kept): the server
 * read it for the first render (`parseShopState`), and every change is
 * written back with `history.replaceState` — `?line=`, `?family=`, `?sort=`,
 * the defaults left out — which Next's router follows without a round trip,
 * so a reload or a shared link opens the same grid.
 */
export function ProductsShop({ lines, initial }: { lines: readonly ShopLine[]; initial: ShopState }) {
  const [state, setState] = useState<ShopState>(initial);

  const onChange = useCallback(
    (next: ShopState) => {
      setState(next);
      const q = shopQuery(next, lines);
      window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
    },
    [lines],
  );

  return <FeedShop lines={lines} state={state} onChange={onChange} title="Cửa hàng" sort h="h2" />;
}
