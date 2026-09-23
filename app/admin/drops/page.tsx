import { connection } from "next/server";
import { AdminDropsScreen } from "@/components/admin/AdminDropsScreen";
import { toVnIso } from "@/lib/datetime";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Các số" };

/**
 * Every issue the shop has run, with the one that is selling open below it.
 *
 * Dynamic: an issue's state is the clock's answer, not a stored flag, so a
 * page built once would keep calling an open issue open long after it shut.
 */
export default async function AdminDropsPage() {
  await connection();
  return <AdminDropsScreen no={null} nowIso={toVnIso(demoNow())} />;
}
