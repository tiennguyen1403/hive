import type { Metadata } from "next";
import { NotificationsScreen } from "@/components/account/NotificationsScreen";
import { loadCatalog } from "@/lib/db/catalog";
import { requireMe } from "@/lib/db/profiles";
import { dropCalendar } from "@/lib/drop";

export const metadata: Metadata = {
  title: "Thông báo",
  // An account page is personal and is rendered behind a server-side
  // session check. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

/**
 * Which issue a reminder can be set for is a calendar question, so it is
 * answered here rather than in the browser — the same reason the account
 * overview reads its codes on the server.
 */
export default async function NotificationsPage() {
  const me = await requireMe("/account/notifications");
  const catalog = await loadCatalog();
  const next = dropCalendar(catalog).upcoming;
  return <NotificationsScreen me={me} {...(next ? { nextDropNo: next.no } : {})} />;
}
