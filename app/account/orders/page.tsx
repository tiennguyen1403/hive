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
import { picker, type Locale, type Pair } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

/** The page's name: "Orders" in English (round v6 slice E3a). */
const TITLE: Pair = { vi: "Đơn hàng", en: "Orders" };

/**
 * "Đơn hàng" — the layout's template adds "· HIVE" — in the page's language,
 * with the site's description in it; the link card keeps the layout's
 * Vietnamese one (QĐ-40).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return {
    title: t(TITLE),
    description: t(SITE_DESCRIPTION_TEXT),
    // Somebody's own orders. Nothing here belongs in a search index.
    robots: { index: false, follow: false },
  };
}

/** The phone's bar: back to Tôi, the title once the page's own has scrolled away. */
function mbarOf(locale: Locale): FeedMbarProps {
  return { title: picker(locale)(TITLE), back: "/account", watch: "[data-ui='feed'] [data-hero]" };
}

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
  const [me, sp, locale] = await Promise.all([loadMe(), props.searchParams, getLocale()]);
  const now = demoNowMs();
  const t = picker(locale);
  const mbar = mbarOf(locale);

  if (!me) {
    return (
      <FeedFrame page="orders" foot="lite" footSkip={["/track"]} mainClass="acc-layout" now={now} mbar={mbar}>
        <AccountNav on="orders" signedIn={false} locale={locale} />
        <div className="acc-main">
          <h1 className="acc-h1 disp" data-hero>
            {t(TITLE)}
          </h1>
          <OutCard
            title={t({ vi: "Đăng nhập để xem đơn", en: "Sign in to see your orders" })}
            id="out-orders"
            here={pathWithQuery("/account/orders", sp)}
            locale={locale}
          />
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
    <FeedFrame page="orders" foot="lite" mainClass="acc-layout" now={now} mbar={mbar}>
      <AccountNav on="orders" signedIn locale={locale} />
      <div className="acc-main">
        <OrdersView orders={orders} initial={initial} />
      </div>
    </FeedFrame>
  );
}
