import type { Metadata } from "next";
import { SignInView } from "@/components/feed/account/SignInView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { SIGN_TITLES, nextParam } from "@/lib/feed-sign-in";

export const metadata: Metadata = { title: SIGN_TITLES.up };

/**
 * "Tạo tài khoản", round v4 "Feed" (slice 3a): the mock's
 * `sign-in.html?mode=up` (`SignInView`) — a name, an email, a password;
 * signed up, the shopper lands where `next` says, as after signing in.
 */
export default async function SignUpPage(props: PageProps<"/sign-up">) {
  const sp = await props.searchParams;
  return (
    <FeedFrame
      page="sign-in"
      tabbar={false}
      foot="none"
      mainClass="si-wrap"
      mbar={{ title: SIGN_TITLES.up, back: "/account", label: "Đóng", close: true, watch: "[data-ui='feed'] .si-title" }}
    >
      <SignInView mode="up" next={nextParam(sp.next)} />
    </FeedFrame>
  );
}
