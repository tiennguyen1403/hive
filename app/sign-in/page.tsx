import type { Metadata } from "next";
import { SignInScreen } from "@/components/account/SignInScreen";

export const metadata: Metadata = { title: "Đăng nhập" };

/**
 * `next` is read here and passed down, rather than pulled out of
 * `useSearchParams` in the client screen — that hook would drag the whole
 * tree out of the static shell and demand a Suspense boundary.
 */
export default async function SignInPage(props: PageProps<"/sign-in">) {
  const sp = await props.searchParams;
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  return <SignInScreen {...(raw ? { next: raw } : {})} />;
}
