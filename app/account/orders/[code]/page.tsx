import type { Metadata } from "next";
import { OrdersScreen } from "@/components/account/OrdersScreen";
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
 * The code comes from the URL; WHO may see it is decided in the browser,
 * because the session lives there. The screen checks the order against the
 * person signed in and turns a miss into a 404 — which also avoids
 * confirming that a code exists at all (QĐ-16).
 */
export default async function OrderPage(props: PageProps<"/account/orders/[code]">) {
  const { code } = await props.params;
  const { drop } = featuredDrop(undefined);
  return <OrdersScreen currentDropNo={drop.no} openCode={code} />;
}
