import type { Metadata } from "next";
import { AccountNav } from "@/components/feed/account/AccountNav";
import { LookupForm } from "@/components/feed/account/LookupForm";
import { OrdersView } from "@/components/feed/account/OrdersView";
import { OutCard } from "@/components/feed/account/OutCard";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";
import { demoNowMs } from "@/lib/clock";
import { effectiveOrder } from "@/lib/customer-orders";
import { loadCatalog } from "@/lib/db/catalog";
import { listMyOrders } from "@/lib/db/orders";
import { loadMe } from "@/lib/db/profiles";
import { groupsOfOrders, newestFirst, parseOrdersFilter, pathWithQuery } from "@/lib/feed-account";

export const metadata: Metadata = {
  title: "Đơn hàng",
  // Somebody's own orders. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

/** The phone's bar: back to Tôi, the title once the page's own has scrolled away. */
const MBAR: FeedMbarProps = { title: "Đơn hàng", back: "/account", watch: "[data-ui='feed'] [data-hero]" };

/**
 * "Đơn hàng", round v4 "Feed" (slice 3a): the approved mock's
 * `prototype/explore/feed/orders.html` (`OrdersView`), in the account frame —
 * the menu beside it from 900px (`AccountNav`), the light footer.
 *
 * Signed out, the page draws its own way in rather than sending the visitor
 * to sign in (as the mock does): "Đăng nhập để xem đơn" and the guest lookup,
 * the footer's "Tra cứu đơn" left out since the page carries it.
 *
 * Signed in, the orders are read here — row level security makes them this
 * account's (`listMyOrders`) — each with the status the clock says it is in
 * (an unpaid transfer past its hold reads as cancelled, `effectiveOrder`),
 * judged at the one instant the frame draws with. The two filters come from
 * the URL (`?phase=`, `?group=`, and the v3 list's `?tab=`); `searchParams` is
 * a promise in Next 16.
 */
export default async function OrdersPage(props: PageProps<"/account/orders">) {
  const [me, sp] = await Promise.all([loadMe(), props.searchParams]);
  const now = demoNowMs();

  if (!me) {
    return (
      <FeedFrame page="orders" foot="lite" footSkip={["/track"]} mainClass="acc-layout" now={now} mbar={MBAR}>
        <AccountNav on="orders" signedIn={false} />
        <div className="acc-main">
          <h1 className="acc-h1 disp" data-hero>
            Đơn hàng
          </h1>
          <OutCard title="Đăng nhập để xem đơn" id="out-orders" here={pathWithQuery("/account/orders", sp)} />
          <LookupForm id="orders" />
        </div>
      </FeedFrame>
    );
  }

  const [catalog, mine] = await Promise.all([loadCatalog(), listMyOrders()]);
  const at = new Date(now);
  const orders = newestFirst(mine.map((o) => effectiveOrder(o, at)));
  const initial = parseOrdersFilter(sp, groupsOfOrders(catalog, orders));

  return (
    <FeedFrame page="orders" foot="lite" mainClass="acc-layout" now={now} mbar={MBAR}>
      <AccountNav on="orders" signedIn />
      <div className="acc-main">
        <OrdersView orders={orders} initial={initial} />
      </div>
    </FeedFrame>
  );
}
