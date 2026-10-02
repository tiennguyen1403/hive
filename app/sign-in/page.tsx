import type { Metadata } from "next";
import { SignInView } from "@/components/feed/account/SignInView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { demoAccounts } from "@/lib/demo-sign-in";
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
  return { title: signTitle("in", locale), description: picker(locale)(SITE_DESCRIPTION_TEXT) };
}

/**
 * "Đăng nhập", round v4 "Feed" (slice 3a): the approved mock's
 * `prototype/explore/feed/sign-in.html` (`SignInView`). On the phone no tab
 * bar and no footer, and a cross that closes the page — back to where the
 * shopper came from, or to Tôi when nothing came before (slice 3b, as the
 * mock's `data-back`; the home page until Tôi was a Feed screen); from 900px
 * the form beside a photo. Above the form, the demo's accounts ("Tài khoản
 * thử", the user's choice; `lib/demo-sign-in.ts`).
 *
 * `next` is read here and passed down rather than pulled out of
 * `useSearchParams`, which would drag the tree out of the static shell; it
 * rides in a hidden field so the Server Action gets it too, and the action
 * checks it again (`safeNext`), because a hidden field is a thing anyone can
 * edit.
 */
export default async function SignInPage(props: PageProps<"/sign-in">) {
  const [sp, locale] = await Promise.all([props.searchParams, getLocale()]);
  return (
    <FeedFrame
      page="sign-in"
      tabbar={false}
      foot="none"
      mainClass="si-wrap"
      mbar={{
        title: signTitle("in", locale),
        back: "/account",
        label: picker(locale)({ vi: "Đóng", en: "Close" }),
        close: true,
        watch: "[data-ui='feed'] .si-title",
      }}
    >
      <SignInView mode="in" next={nextParam(sp.next)} demo={demoAccounts()} />
    </FeedFrame>
  );
}
