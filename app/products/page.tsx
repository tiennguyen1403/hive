import type { Metadata } from "next";
import { Listing } from "@/components/product/Listing";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { parseListingQuery } from "@/lib/catalog-query";
import { loadCatalog } from "@/lib/db/catalog";
import { productsOnSale } from "@/lib/inventory";

/** "Tất cả mẫu" — the layout's template adds "· HIVE". */
export const metadata: Metadata = { title: "Tất cả mẫu" };

/**
 * Every style on sale, in one grid (v3 slice 11).
 *
 * The open issue's styles — its sold-out ones too, the issue is still the
 * one selling — and every fixed style, in catalogue order (`productsOnSale`).
 * Between two issues it is the fixed styles alone. The tabs, the chips, the
 * rail and "Hiện N / N mẫu" all count this pool; an issue's style wears its
 * plate on the photo, because here it stands among styles of both kinds.
 *
 * The issue itself has its own page, `/so/5`, the listing this address was
 * until this slice — the nav's plate and every "xem cả số" lead there.
 *
 * `await props.searchParams` is not optional in Next 16: it is a promise
 * now, and reading it synchronously is gone.
 */
export default async function ProductsPage(props: PageProps<"/products">) {
  const query = parseListingQuery(await props.searchParams);
  const catalog = await loadCatalog();
  const pool = productsOnSale(catalog);

  return (
    // One family chosen narrows the bar to that word. The plate is never
    // lit here: it leads to the issue's own page.
    <ShopFrame activeFamily={query.families.length === 1 ? query.families[0] : undefined}>
      <Listing catalog={catalog} query={query} path="/products" pool={pool} issue={null} />
    </ShopFrame>
  );
}
