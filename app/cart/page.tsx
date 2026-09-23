import type { Metadata } from "next";
import { CartScreen } from "@/components/cart/CartScreen";
import { loadCatalog } from "@/lib/db/catalog";
import { featuredDrop } from "@/lib/drop";

export const metadata: Metadata = { title: "Giỏ" };

/**
 * A server shell around a client screen.
 *
 * The cart itself lives in the browser, so the screen has to be a client
 * component — but page metadata and the issue's own facts do not, and reading
 * them here keeps `data/catalog.ts` out of the client MODULE graph: what
 * crosses the boundary is the catalogue as data, through `CatalogProvider`.
 */
export default async function CartPage() {
  const catalog = await loadCatalog();
  const { drop, state } = featuredDrop(catalog, undefined);

  return (
    <CartScreen
      dropNo={drop.no}
      dropClosesAt={drop.closesAt}
      dropIsOpen={state === "OPEN"}
    />
  );
}
