import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderConfirmed } from "@/components/checkout/OrderConfirmed";
import { formatAddressLine } from "@/data/regions";
import { demoNow } from "@/lib/clock";
import { effectiveOrder } from "@/lib/customer-orders";
import { loadCatalog } from "@/lib/db/catalog";
import { findMyOrder, loadReceipt } from "@/lib/db/orders";
import { wayToShop } from "@/lib/drop";

export const metadata: Metadata = {
  title: "Đã nhận đơn",
  // A receipt is a name, a phone number and a home address. Nothing here
  // belongs in a search index.
  robots: { index: false, follow: false },
};

/**
 * The receipt of one order, where checkout lands.
 *
 * WHO may see it is decided here, on the server, before anything renders:
 * the signed-in account for its own orders, or the browser that placed the
 * order signed out, by the key it was handed in an httpOnly cookie
 * (`lib/db/orders.ts#loadReceipt`). Anybody else — another account, another
 * browser, a guessed number — gets a real 404, not a page that loads and then
 * empties: codes are short and sequential, and "bạn không có quyền" would
 * confirm the order exists (QĐ-16).
 *
 * `params` is a promise in Next 16 (`03-api-reference/03-file-conventions/
 * dynamic-routes.md`). The status is judged against the app's clock here, so
 * a transfer whose hold ran out reads as cancelled on first paint, and the
 * address line is built here because the commune list stays on the server.
 */
export default async function OrderReceiptPage(props: PageProps<"/order-confirmed/[code]">) {
  const { code } = await props.params;

  const found = await loadReceipt(code);
  if (!found) notFound();

  const [catalog, mine] = await Promise.all([loadCatalog(), findMyOrder(code)]);
  const order = effectiveOrder(found, demoNow());

  return (
    <OrderConfirmed
      order={order}
      addressLine={formatAddressLine(order.shipTo)}
      way={wayToShop(catalog)}
      inAccount={mine !== null}
    />
  );
}
