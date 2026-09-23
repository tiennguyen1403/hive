import type { Metadata } from "next";
import { PasswordScreen } from "@/components/account/PasswordScreen";

export const metadata: Metadata = {
  title: "Đổi mật khẩu",
  // An account page is personal and renders client-side behind a session
  // check. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PasswordScreen />;
}
