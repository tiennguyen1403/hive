import type { Metadata } from "next";
import { AccountNav } from "@/components/feed/account/AccountNav";
import { OutCard } from "@/components/feed/account/OutCard";
import { WishlistView } from "@/components/feed/account/WishlistView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { loadMe } from "@/lib/db/profiles";
import { picker, type Pair } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

/** The page's name: the glossary's "Saved" (round v6 slice E3a). */
const TITLE: Pair = { vi: "Yêu thích", en: "Saved" };

/**
 * "Yêu thích" — the layout's template adds "· HIVE" — in the page's language,
 * with the site's description in it; the link card keeps the layout's
 * Vietnamese one (QĐ-40).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return {
    title: t(TITLE),
    description: t(SITE_DESCRIPTION_TEXT),
    // Somebody's own list. Nothing here belongs in a search index.
    robots: { index: false, follow: false },
  };
}

/**
 * Yêu thích, round v4 "Feed" (slice 3b): the approved mock's
 * `prototype/explore/feed/favorites.html` (`WishlistView`), in the account
 * frame ("Yêu thích" lit in the menu, the tab bar and the top bar's heart),
 * with the whole footer, as the mock has it. A tab root: on the phone the
 * brand bar.
 *
 * Saved styles need an account (the user's answer, round 4 of the mock):
 * signed out the page never shows a list, only the way in, "Đăng nhập để xem
 * mẫu đã lưu". Signed in, the list is the account's as the screen keeps it
 * (`MyStateProvider`, read with the root layout).
 */
export default async function WishlistPage() {
  const [me, locale] = await Promise.all([loadMe(), getLocale()]);
  const t = picker(locale);
  return (
    <FeedFrame page="favorites" mainClass="acc-layout">
      <AccountNav on="favorites" signedIn={me !== null} locale={locale} />
      <div className="acc-main b-acc b-favs b-page">
        {me ? (
          <WishlistView />
        ) : (
          <>
            <div className="b-head">
              <h1 className="b-title disp">{t(TITLE)}</h1>
            </div>
            <div className="b-gatewrap">
              <OutCard
                title={t({ vi: "Đăng nhập để xem mẫu đã lưu", en: "Sign in to see saved styles" })}
                id="out-favs"
                here="/account/wishlist"
                locale={locale}
              />
            </div>
          </>
        )}
      </div>
    </FeedFrame>
  );
}
