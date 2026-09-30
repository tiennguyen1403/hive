import type { Metadata } from "next";
import { AccountNav } from "@/components/feed/account/AccountNav";
import { MeOut } from "@/components/feed/account/MeOut";
import { MeView } from "@/components/feed/account/MeView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { feedAddressLine } from "@/data/regions";
import { demoNowMs } from "@/lib/clock";
import { effectiveOrder } from "@/lib/customer-orders";
import { listAddresses } from "@/lib/db/addresses";
import { listMyOrders } from "@/lib/db/orders";
import { loadMe } from "@/lib/db/profiles";
import { demoAccounts } from "@/lib/demo-sign-in";
import { newestFirst } from "@/lib/feed-account";

export const metadata: Metadata = {
  title: "Tôi",
  // Somebody's own account. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

/**
 * Tôi, round v4 "Feed" (slice 3b): the approved mock's
 * `prototype/explore/feed/account.html` and `me.js`, in the account frame —
 * the menu beside it from 900px (`AccountNav`), the light footer. A tab root:
 * on the phone the brand bar and the tab bar, "Tôi" lit.
 *
 * Signed out, the page draws its own way in rather than sending the visitor
 * to sign in (`MeOut`): the dark card and the guest lookup on the phone, the
 * sign-in form itself beside "Chưa có tài khoản" from 900px; the footer's
 * "Tra cứu đơn" left out, since the page carries the lookup.
 *
 * Signed in, the orders and the address book are read here — row level
 * security makes them this account's — each order with the status the clock
 * says it is in (`effectiveOrder`), judged at the one instant the frame draws
 * with; the default address's line is built here, where the communes are.
 * What the account keeps (saved styles, the reminder, Size của tôi) the
 * screen reads from the root layout's `MyStateProvider`.
 */
export default async function AccountPage() {
  const me = await loadMe();
  const now = demoNowMs();

  if (!me) {
    return (
      <FeedFrame page="account" foot="lite" footSkip={["/track"]} mainClass="acc-layout" now={now}>
        <AccountNav on="account" signedIn={false} />
        <div className="acc-main">
          <MeOut demo={demoAccounts()} />
        </div>
      </FeedFrame>
    );
  }

  const [mine, book] = await Promise.all([listMyOrders(), listAddresses()]);
  const at = new Date(now);
  const orders = newestFirst(mine.map((o) => effectiveOrder(o, at)));
  const home = book.find((a) => a.isDefault) ?? book[0];

  return (
    <FeedFrame page="account" foot="lite" mainClass="acc-layout" now={now}>
      <AccountNav on="account" signedIn />
      <div className="acc-main">
        <MeView me={me} orders={orders} address={home ? { label: home.label, line: feedAddressLine(home) } : null} />
      </div>
    </FeedFrame>
  );
}
