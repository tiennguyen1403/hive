import type { Metadata } from "next";
import { AccountNav } from "@/components/feed/account/AccountNav";
import { OutCard } from "@/components/feed/account/OutCard";
import { ProfileView } from "@/components/feed/account/ProfileView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";
import { loadMe } from "@/lib/db/profiles";
import { PROFILE_SIGN_IN } from "@/lib/my-state";

export const metadata: Metadata = {
  title: "Hồ sơ",
  // Somebody's name and phone. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

/** The phone's bar: back to Tôi, the title once the page's own has scrolled away. */
const MBAR: FeedMbarProps = { title: "Hồ sơ", back: "/account", watch: "[data-ui='feed'] [data-hero]" };

/**
 * Hồ sơ, round v4 "Feed" (slice 3b): the approved mock's
 * `prototype/explore/feed/profile.html` (`ProfileView`), in the account frame
 * ("Hồ sơ" lit in the menu), the light footer. `/account/profile#size` opens
 * it on "Size của tôi" (Tôi's size tile). The old `/account/password` leads
 * here: the password is changed in this page's sheet.
 *
 * Signed out, the page asks to sign in in place, "Đăng nhập để sửa hồ sơ",
 * as the mock does. Signed in, the account's name, phone and e-mail come from
 * the server (`loadMe`); its sizes from the root layout's `MyStateProvider`.
 */
export default async function ProfilePage() {
  const me = await loadMe();
  return (
    <FeedFrame page="profile" foot="lite" mainClass="acc-layout" mbar={MBAR}>
      <AccountNav on="profile" signedIn={me !== null} />
      <div className="acc-main">
        {me ? (
          <ProfileView me={me} />
        ) : (
          <>
            <h1 className="acc-h1 disp" data-hero>
              Hồ sơ
            </h1>
            <OutCard title={PROFILE_SIGN_IN} id="out-pf" here="/account/profile" />
          </>
        )}
      </div>
    </FeedFrame>
  );
}
