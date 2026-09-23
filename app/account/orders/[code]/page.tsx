import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrdersScreen } from "@/components/account/OrdersScreen";
import { orderByCode } from "@/data/orders";
import { orderCode } from "@/data/types";
import { loadCatalog } from "@/lib/db/catalog";
import { requireMe } from "@/lib/db/profiles";
import { featuredDrop } from "@/lib/drop";
import { fixtureOrdersOf } from "@/lib/me";

export async function generateMetadata(
  props: PageProps<"/account/orders/[code]">,
): Promise<Metadata> {
  const { code } = await props.params;
  return { title: `Đơn ${code}`, robots: { index: false, follow: false } };
}

/**
 * The same list, with one order open under it.
 *
 * The code comes from the URL; WHO may see it is decided by the session,
 * which is read here on the server. A miss is a 404 rather than a refusal:
 * "bạn không có quyền" confirms that the order exists and belongs to
 * somebody (QĐ-16).
 *
 * The check happens TWICE, in two places, because an order can still be in
 * one of two until slice B2 moves them into Postgres:
 *
 * · a code the sample data knows, belonging to somebody else, is answered
 *   here — a real 404 status, before a byte of the order list is rendered;
 * · a code the sample data does not know may yet be an order placed in this
 *   browser (`brand.orders`), which only the browser can see, so that one is
 *   left to the screen and becomes a 404 after hydration.
 */
export default async function OrderPage(props: PageProps<"/account/orders/[code]">) {
  const { code } = await props.params;
  const me = await requireMe(`/account/orders/${code}`);

  if (
    orderByCode.has(orderCode(code)) &&
    !fixtureOrdersOf(me).some((order) => String(order.code) === code)
  ) {
    notFound();
  }

  const catalog = await loadCatalog();
  const { drop } = featuredDrop(catalog, undefined);
  return <OrdersScreen me={me} currentDropNo={drop.no} openCode={code} />;
}
