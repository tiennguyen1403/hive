import type { Metadata } from "next";
import { PasswordScreen } from "@/components/account/PasswordScreen";
import { requireSession } from "@/lib/db/session";

export const metadata: Metadata = {
  title: "Đổi mật khẩu",
  // An account page is personal and is rendered behind a server-side
  // session check. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

export default async function Page() {
  // Nothing from the profile is shown here, so the session is enough — and
  // asking for it is what turns a signed-out visit into a detour through the
  // sign-in form rather than a form that cannot submit.
  await requireSession("/account/password");
  return <PasswordScreen />;
}
