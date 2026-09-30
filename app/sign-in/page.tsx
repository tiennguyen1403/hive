import type { Metadata } from "next";
import { SignInView } from "@/components/feed/account/SignInView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { demoAccounts } from "@/lib/demo-sign-in";
import { SIGN_TITLES, nextParam } from "@/lib/feed-sign-in";

export const metadata: Metadata = { title: SIGN_TITLES.in };

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
  const sp = await props.searchParams;
  return (
    <FeedFrame
      page="sign-in"
      tabbar={false}
      foot="none"
      mainClass="si-wrap"
      mbar={{ title: SIGN_TITLES.in, back: "/account", label: "Đóng", close: true, watch: "[data-ui='feed'] .si-title" }}
    >
      <SignInView mode="in" next={nextParam(sp.next)} demo={demoAccounts()} />
    </FeedFrame>
  );
}
