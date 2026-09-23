import type { Metadata } from "next";
import { ProfileScreen } from "@/components/account/ProfileScreen";

export const metadata: Metadata = {
  title: "Thông tin cá nhân",
  // An account page is personal and renders client-side behind a session
  // check. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ProfileScreen />;
}
