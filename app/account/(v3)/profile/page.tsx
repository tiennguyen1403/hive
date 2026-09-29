import type { Metadata } from "next";
import { ProfileScreen } from "@/components/account/ProfileScreen";
import { requireMe } from "@/lib/db/profiles";

export const metadata: Metadata = {
  title: "Thông tin cá nhân",
  // An account page is personal and is rendered behind a server-side
  // session check. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

export default async function Page() {
  const me = await requireMe("/account/profile");
  return <ProfileScreen me={me} />;
}
