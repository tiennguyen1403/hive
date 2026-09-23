import type { Metadata } from "next";
import { OrderConfirmedEmpty } from "@/components/checkout/OrderConfirmed";
import { loadCatalog } from "@/lib/db/catalog";
import { featuredDrop } from "@/lib/drop";

export const metadata: Metadata = {
  title: "Đã nhận đơn",
  // Nothing personal on this one, but it is the empty half of a personal
  // page and has nothing a search index wants.
  robots: { index: false, follow: false },
};

/**
 * `/order-confirmed` without an order number.
 *
 * Until slice B2 this address showed the newest order kept in the browser.
 * Every receipt has its own address now — `/order-confirmed/<code>`, where
 * checkout lands — so this one is only reached by an old link, and says
 * where an order can be found instead.
 */
export default async function OrderConfirmedPage() {
  const catalog = await loadCatalog();
  const { drop } = featuredDrop(catalog, undefined);
  return <OrderConfirmedEmpty dropNo={drop.no} />;
}
