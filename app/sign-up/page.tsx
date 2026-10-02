import type { Metadata } from "next";
import { SignInView } from "@/components/feed/account/SignInView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { nextParam, signTitle } from "@/lib/feed-sign-in";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

/**
 * The mode's title — the layout's template adds "· HIVE" — in the page's
 * language since round v6 slice E3a, with the site's description in it; the
 * link card keeps the layout's Vietnamese one (QĐ-40).
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: signTitle("up", locale), description: picker(locale)(SITE_DESCRIPTION_TEXT) };
}

/**
 * "Tạo tài khoản", round v4 "Feed" (slice 3a): the mock's
 * `sign-in.html?mode=up` (`SignInView`) — a name, an email, a password;
 * signed up, the shopper lands where `next` says, as after signing in.
 */
export default async function SignUpPage(props: PageProps<"/sign-up">) {
  const [sp, locale] = await Promise.all([props.searchParams, getLocale()]);
  return (
    <FeedFrame
      page="sign-in"
      tabbar={false}
      foot="none"
      mainClass="si-wrap"
      mbar={{
        title: signTitle("up", locale),
        back: "/account",
        label: picker(locale)({ vi: "Đóng", en: "Close" }),
        close: true,
        watch: "[data-ui='feed'] .si-title",
      }}
    >
      <SignInView mode="up" next={nextParam(sp.next)} />
    </FeedFrame>
  );
}
