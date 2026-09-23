import type { Metadata } from "next";
import { SignInScreen } from "@/components/account/SignInScreen";
import { CUSTOMERS } from "@/data/customers";

export const metadata: Metadata = { title: "Đăng nhập" };

/**
 * `next` is read here and passed down, rather than pulled out of
 * `useSearchParams` in the client screen — that hook would drag the whole
 * tree out of the static shell and demand a Suspense boundary.
 *
 * The demo account is read here too, for a harder reason: `DEMO_PASSWORD`
 * lives in the environment, and only a Server Component may touch
 * `process.env` (QĐ-25). It is a PUBLIC password — the screen prints it,
 * because a demo whose account nobody can open is a demo nobody can look at
 * — but a password written into a committed file is a habit, so it comes
 * from the environment even here. Unset means no button and no line: a
 * control that cannot do what it says is not rendered (DESIGN.md §9 rule 3).
 */
export default async function SignInPage(props: PageProps<"/sign-in">) {
  const sp = await props.searchParams;
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  const demoPassword = process.env.DEMO_PASSWORD;

  return (
    <SignInScreen
      {...(raw ? { next: raw } : {})}
      {...(demoPassword ? { demoEmail: CUSTOMERS[0]!.email, demoPassword } : {})}
    />
  );
}
