import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrdersScreen } from "@/components/account/OrdersScreen";
import { loadCatalog } from "@/lib/db/catalog";
import { findMyOrder, listMyOrders } from "@/lib/db/orders";
import { requireMe } from "@/lib/db/profiles";
import { featuredDrop } from "@/lib/drop";

export async function generateMetadata(
  props: PageProps<"/account/orders/[code]">,
): Promise<Metadata> {
  const { code } = await props.params;
  return { title: `Đơn ${code}`, robots: { index: false, follow: false } };
}

/**
 * The same list, with one order open under it.
 *
 * The code comes from the URL; WHO may see it is decided on the server, by
 * the database: `findMyOrder` goes through row level security, so another
 * account's order, an order that does not exist and a string that is not a
 * code all come back as the same null — and the page answers each with a
 * real 404, before a byte of the list is rendered. A refusal would be
 * politer, and it would confirm that the order exists and belongs to
 * somebody (QĐ-16).
 *
 * Until slice B2 half of this check had to wait for the browser, because an
 * order could live in `localStorage`; every order is a row now, so there is
 * no second half.
 */
export default async function OrderPage(props: PageProps<"/account/orders/[code]">) {
  const { code } = await props.params;
  await requireMe(`/account/orders/${code}`);

  if (!(await findMyOrder(code))) notFound();

  const [catalog, orders] = await Promise.all([loadCatalog(), listMyOrders()]);
  const { drop } = featuredDrop(catalog, undefined);
  return <OrdersScreen orders={orders} currentDropNo={drop.no} openCode={code} />;
}
