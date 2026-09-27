import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { OrderConfirmedView } from "@/components/feed/order/OrderConfirmedView";
import { feedAddressLine } from "@/data/regions";
import { demoNowMs } from "@/lib/clock";
import { effectiveOrder } from "@/lib/customer-orders";
import { findMyOrder, loadReceipt } from "@/lib/db/orders";

export const metadata: Metadata = {
  title: "Đã đặt hàng",
  // A receipt is a name, a phone number and a home address. Nothing here
  // belongs in a search index.
  robots: { index: false, follow: false },
};

/**
 * The receipt of one order, where checkout lands — round v4 "Feed" (slice 2):
 * the approved mock's `prototype/explore/feed/order-confirmed.html`
 * (`OrderConfirmedView`). On the phone its bar is a cross back to the home
 * page (going back would land on a checkout with nothing left to pay for);
 * no tab bar, the light footer.
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
 * dynamic-routes.md`). The status is judged against the app's clock here — a
 * transfer whose hold ran out reads as cancelled on first paint — and the
 * page and the frame draw from that same instant; the address line is built
 * here because the commune list stays on the server.
 */
export default async function OrderReceiptPage(props: PageProps<"/order-confirmed/[code]">) {
  const { code } = await props.params;

  const found = await loadReceipt(code);
  if (!found) notFound();

  const mine = await findMyOrder(code);
  const now = demoNowMs();
  const order = effectiveOrder(found, new Date(now));

  return (
    <FeedFrame
      page="confirm"
      tabbar={false}
      foot="lite"
      now={now}
      mbar={{ back: "/", label: "Đóng, về trang chủ", close: true, hard: true }}
    >
      <OrderConfirmedView order={order} addressLine={feedAddressLine(order.shipTo)} inAccount={mine !== null} />
    </FeedFrame>
  );
}
