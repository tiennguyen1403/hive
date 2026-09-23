import type { Metadata } from "next";
import { OrdersScreen } from "@/components/account/OrdersScreen";
import { loadCatalog } from "@/lib/db/catalog";
import { listMyOrders } from "@/lib/db/orders";
import { requireMe } from "@/lib/db/profiles";
import { featuredDrop } from "@/lib/drop";

export const metadata: Metadata = {
  title: "Đơn hàng",
  // An account page is personal and is rendered behind a server-side
  // session check. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

/**
 * `?tab=` — which slice of their own orders is a URL, not component state.
 *
 * The orders are read here, on the server, and row level security is what
 * makes them this account's (`listMyOrders()`); the screen only draws them.
 */
export default async function OrdersPage(props: PageProps<"/account/orders">) {
  await requireMe("/account/orders");
  const sp = await props.searchParams;
  const tab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const [catalog, orders] = await Promise.all([loadCatalog(), listMyOrders()]);
  const { drop } = featuredDrop(catalog, undefined);
  return <OrdersScreen orders={orders} currentDropNo={drop.no} {...(tab ? { tab } : {})} />;
}
