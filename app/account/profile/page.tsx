import type { Metadata } from "next";
import { AccountNav } from "@/components/feed/account/AccountNav";
import { OutCard } from "@/components/feed/account/OutCard";
import { ProfileView } from "@/components/feed/account/ProfileView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";
import { loadMe } from "@/lib/db/profiles";
import { getSession } from "@/lib/db/session";
import { picker, type Locale, type Pair } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { PROFILE_SIGN_IN_TEXT } from "@/lib/my-state";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

/** The page's name: "Profile" in English (round v6 slice E3a). */
const TITLE: Pair = { vi: "Hồ sơ", en: "Profile" };

/**
 * "Hồ sơ" — the layout's template adds "· HIVE" — in the page's language,
 * with the site's description in it; the link card keeps the layout's
 * Vietnamese one (QĐ-40).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return {
    title: t(TITLE),
    description: t(SITE_DESCRIPTION_TEXT),
    // Somebody's name and phone. Nothing here belongs in a search index.
    robots: { index: false, follow: false },
  };
}

/** The phone's bar: back to Tôi, the title once the page's own has scrolled away. */
function mbarOf(locale: Locale): FeedMbarProps {
  return { title: picker(locale)(TITLE), back: "/account", watch: "[data-ui='feed'] [data-hero]" };
}

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
 *
 * Slice B16: an account made with Google gets no "Đổi mật khẩu" — it has no
 * password (`getSession().oauthOnly`; `loadMe` asks the same cached session).
 */
export default async function ProfilePage() {
  const [me, locale, session] = await Promise.all([loadMe(), getLocale(), getSession()]);
  const t = picker(locale);
  return (
    <FeedFrame page="profile" foot="lite" mainClass="acc-layout" mbar={mbarOf(locale)}>
      <AccountNav on="profile" signedIn={me !== null} locale={locale} />
      <div className="acc-main">
        {me ? (
          <ProfileView me={me} canChangePassword={!session?.oauthOnly} />
        ) : (
          <>
            <h1 className="acc-h1 disp" data-hero>
              {t(TITLE)}
            </h1>
            <OutCard title={t(PROFILE_SIGN_IN_TEXT)} id="out-pf" here="/account/profile" locale={locale} />
          </>
        )}
      </div>
    </FeedFrame>
  );
}
