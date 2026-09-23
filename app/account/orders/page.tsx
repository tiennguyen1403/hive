import type { Metadata } from "next";
import { OrdersScreen } from "@/components/account/OrdersScreen";
import { loadCatalog } from "@/lib/db/catalog";
import { requireMe } from "@/lib/db/profiles";
import { featuredDrop } from "@/lib/drop";

export const metadata: Metadata = {
  title: "Đơn hàng",
  // An account page is personal and is rendered behind a server-side
  // session check. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

/** `?tab=` — which slice of their own orders is a URL, not component state. */
export default async function OrdersPage(props: PageProps<"/account/orders">) {
  const me = await requireMe("/account/orders");
  const sp = await props.searchParams;
  const tab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const catalog = await loadCatalog();
  const { drop } = featuredDrop(catalog, undefined);
  return <OrdersScreen me={me} currentDropNo={drop.no} {...(tab ? { tab } : {})} />;
}
