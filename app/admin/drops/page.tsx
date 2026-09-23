import { connection } from "next/server";
import { AdminDropsScreen } from "@/components/admin/AdminDropsScreen";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { listAllOrders } from "@/lib/db/admin";
import { requireAdmin } from "@/lib/db/session";

export const metadata = { title: "Các số" };

/**
 * Every issue the shop has run, with the one that is selling open below it.
 *
 * `requireAdmin` first, as on every admin page. The issue's order figures
 * are read off the order book in the database (slice B3a); the issues
 * themselves, their styles and teasers are the catalogue the database holds
 * (slice B3b), and every button on the screen writes there.
 *
 * Dynamic: an issue's state is the clock's answer, not a stored flag, so a
 * page built once would keep calling an open issue open long after it shut.
 */
export default async function AdminDropsPage() {
  await requireAdmin("/admin/drops");
  await connection();
  const orders = await listAllOrders();
  return <AdminDropsScreen no={null} nowIso={toVnIso(demoNow())} orders={orders} />;
}
