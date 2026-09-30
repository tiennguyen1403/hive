import type { Metadata } from "next";
import { AccountNav } from "@/components/feed/account/AccountNav";
import { OutCard } from "@/components/feed/account/OutCard";
import { WishlistView } from "@/components/feed/account/WishlistView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { loadMe } from "@/lib/db/profiles";

export const metadata: Metadata = {
  title: "Yêu thích",
  // Somebody's own list. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

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
  const me = await loadMe();
  return (
    <FeedFrame page="favorites" mainClass="acc-layout">
      <AccountNav on="favorites" signedIn={me !== null} />
      <div className="acc-main b-acc b-favs b-page">
        {me ? (
          <WishlistView />
        ) : (
          <>
            <div className="b-head">
              <h1 className="b-title disp">Yêu thích</h1>
            </div>
            <div className="b-gatewrap">
              <OutCard title="Đăng nhập để xem mẫu đã lưu" id="out-favs" here="/account/wishlist" />
            </div>
          </>
        )}
      </div>
    </FeedFrame>
  );
}
