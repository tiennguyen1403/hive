import type { Metadata } from "next";
import { OrdersScreen } from "@/components/account/OrdersScreen";
import { loadCatalog } from "@/lib/db/catalog";
import { featuredDrop } from "@/lib/drop";

export const metadata: Metadata = {
  title: "Đơn hàng",
  // An account page is personal and renders client-side behind a session
  // check. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

/** `?tab=` — which slice of their own orders is a URL, not component state. */
export default async function OrdersPage(props: PageProps<"/account/orders">) {
  const sp = await props.searchParams;
  const tab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const catalog = await loadCatalog();
  const { drop } = featuredDrop(catalog, undefined);
  return <OrdersScreen currentDropNo={drop.no} {...(tab ? { tab } : {})} />;
}
