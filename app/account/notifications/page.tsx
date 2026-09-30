import type { Metadata } from "next";
import { AccountNav } from "@/components/feed/account/AccountNav";
import { NotificationsView } from "@/components/feed/account/NotificationsView";
import { OutCard } from "@/components/feed/account/OutCard";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";
import { loadMe } from "@/lib/db/profiles";

export const metadata: Metadata = {
  title: "Thông báo",
  // Somebody's own inbox. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

/**
 * The phone's bar: back to Tôi, the title once the page's own has scrolled
 * away, and "Đánh dấu đã đọc" while anything is unread.
 */
const MBAR: FeedMbarProps = {
  title: "Thông báo",
  back: "/account",
  watch: "[data-ui='feed'] .b-title",
  readAll: true,
};

/**
 * Thông báo, round v4 "Feed" (slice 4a): the approved mock's
 * `prototype/explore/feed/notifications.html` (`NotificationsView`), in the
 * account frame — "Thông báo" lit in the menu, the bell lit in the top bar,
 * Tôi in the tab bar — with the light footer. It leaves the route group
 * `(v3)`, the last page that was in it.
 *
 * Signed out the page never shows an inbox, only the way in, "Đăng nhập để
 * xem thông báo", as the mock does. Signed in, the inbox is the one the frame
 * built for the bell (`InboxProvider`: the account's orders read by the frame,
 * what the account keeps read with the root layout), so the two cannot
 * disagree.
 */
export default async function NotificationsPage() {
  const me = await loadMe();
  return (
    <FeedFrame page="notifications" foot="lite" mainClass="acc-layout" mbar={MBAR}>
      <AccountNav on="notifications" signedIn={me !== null} />
      <div className="acc-main b-acc b-page">
        {me ? (
          <NotificationsView />
        ) : (
          <>
            <div className="b-head">
              <h1 className="b-title disp">Thông báo</h1>
            </div>
            <div className="b-gatewrap">
              <OutCard title="Đăng nhập để xem thông báo" id="out-notif" here="/account/notifications" />
            </div>
          </>
        )}
      </div>
    </FeedFrame>
  );
}
