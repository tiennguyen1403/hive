import type { Metadata } from "next";
import { CartScreen } from "@/components/cart/CartScreen";
import { loadCatalog } from "@/lib/db/catalog";
import { dropCalendar, featuredDrop } from "@/lib/drop";

export const metadata: Metadata = { title: "Giỏ" };

/**
 * A server shell around a client screen.
 *
 * The cart itself lives in the browser, so the screen has to be a client
 * component — but page metadata and the issue's own facts do not, and reading
 * them here keeps `data/catalog.ts` out of the client MODULE graph: what
 * crosses the boundary is the catalogue as data, through `CatalogProvider`.
 *
 * The issue the empty cart's sentence names is the one selling, else the
 * last one that closed (v3 slice 11). Between two issues the featured issue
 * is the one about to open, and "Số 06 đã đóng" would be false; the fixed
 * styles sell meanwhile, and the screen's way back leads to them.
 */
export default async function CartPage() {
  const catalog = await loadCatalog();
  const cal = dropCalendar(catalog);
  const named = cal.open ?? cal.closed ?? featuredDrop(catalog, undefined).drop;

  return (
    <CartScreen
      dropNo={named.no}
      dropClosesAt={named.closesAt}
      dropIsOpen={cal.open !== undefined}
    />
  );
}
