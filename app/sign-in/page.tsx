import type { Metadata } from "next";
import { SignInView, type DemoAccounts } from "@/components/feed/account/SignInView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { CUSTOMERS } from "@/data/customers";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import { SIGN_TITLES, nextParam } from "@/lib/feed-sign-in";

export const metadata: Metadata = { title: SIGN_TITLES.in };

/**
 * The published demo accounts, or nothing.
 *
 * `DEMO_PASSWORD` lives in the environment, and only a Server Component may
 * touch `process.env` (QĐ-25). It is a PUBLIC password — the page prints it,
 * because a demo whose account nobody can open is a demo nobody can look at —
 * but a password written into a committed file is a habit, so it comes from
 * the environment even here. Unset means no box: a shortcut that cannot do
 * what it says is not drawn. Slice B3a added the back office's account beside
 * the shopper's, on the same password (`lib/demo-admin.ts`).
 */
function demoAccounts(): DemoAccounts | null {
  const password = process.env.DEMO_PASSWORD;
  return password ? { email: CUSTOMERS[0]!.email, adminEmail: DEMO_ADMIN.email, password } : null;
}

/**
 * "Đăng nhập", round v4 "Feed" (slice 3a): the approved mock's
 * `prototype/explore/feed/sign-in.html` (`SignInView`). On the phone no tab
 * bar and no footer, and a cross that closes the page — back to where the
 * shopper came from, or to the home page when nothing came before; from 900px
 * the form beside a photo. Above the form, the demo's accounts ("Tài khoản
 * thử", the user's choice).
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
      mbar={{ title: SIGN_TITLES.in, back: "/", label: "Đóng", close: true, watch: "[data-ui='feed'] .si-title" }}
    >
      <SignInView mode="in" next={nextParam(sp.next)} demo={demoAccounts()} />
    </FeedFrame>
  );
}
