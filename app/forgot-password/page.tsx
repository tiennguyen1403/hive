import type { Metadata } from "next";
import { SignInView } from "@/components/feed/account/SignInView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { SIGN_TITLES, nextParam } from "@/lib/feed-sign-in";

export const metadata: Metadata = { title: SIGN_TITLES.forgot };

/**
 * "Quên mật khẩu", round v4 "Feed" (slice 3a): the mock's
 * `sign-in.html?mode=forgot` (`SignInView`). Nothing reaches a server: there
 * is no mail to send with yet (QĐ-35), so after a valid address the page says
 * the link could not be sent and that the feature is being prepared.
 */
export default async function ForgotPasswordPage(props: PageProps<"/forgot-password">) {
  const sp = await props.searchParams;
  return (
    <FeedFrame
      page="sign-in"
      tabbar={false}
      foot="none"
      mainClass="si-wrap"
      mbar={{ title: SIGN_TITLES.forgot, back: "/account", label: "Đóng", close: true, watch: "[data-ui='feed'] .si-title" }}
    >
      <SignInView mode="forgot" next={nextParam(sp.next)} />
    </FeedFrame>
  );
}
