import type { Metadata } from "next";
import { AccountNav } from "@/components/feed/account/AccountNav";
import { NotificationsView } from "@/components/feed/account/NotificationsView";
import { OutCard } from "@/components/feed/account/OutCard";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";
import { loadMe } from "@/lib/db/profiles";
import { picker, type Locale, type Pair } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

/** The page's name: the glossary's "Notifications" (round v6 slice E3a). */
const TITLE: Pair = { vi: "Thông báo", en: "Notifications" };

/**
 * "Thông báo" — the layout's template adds "· HIVE" — in the page's language,
 * with the site's description in it; the link card keeps the layout's
 * Vietnamese one (QĐ-40).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return {
    title: t(TITLE),
    description: t(SITE_DESCRIPTION_TEXT),
    // Somebody's own inbox. Nothing here belongs in a search index.
    robots: { index: false, follow: false },
  };
}

/**
 * The phone's bar: back to Tôi, the title once the page's own has scrolled
 * away, and "Đánh dấu đã đọc" while anything is unread.
 */
function mbarOf(locale: Locale): FeedMbarProps {
  return {
    title: picker(locale)(TITLE),
    back: "/account",
    watch: "[data-ui='feed'] .b-title",
    readAll: true,
  };
}

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
  const [me, locale] = await Promise.all([loadMe(), getLocale()]);
  const t = picker(locale);
  return (
    <FeedFrame page="notifications" foot="lite" mainClass="acc-layout" mbar={mbarOf(locale)}>
      <AccountNav on="notifications" signedIn={me !== null} locale={locale} />
      <div className="acc-main b-acc b-page">
        {me ? (
          <NotificationsView />
        ) : (
          <>
            <div className="b-head">
              <h1 className="b-title disp">{t(TITLE)}</h1>
            </div>
            <div className="b-gatewrap">
              <OutCard
                title={t({ vi: "Đăng nhập để xem thông báo", en: "Sign in to see notifications" })}
                id="out-notif"
                here="/account/notifications"
                locale={locale}
              />
            </div>
          </>
        )}
      </div>
    </FeedFrame>
  );
}
