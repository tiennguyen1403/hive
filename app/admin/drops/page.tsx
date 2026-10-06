import type { Metadata } from "next";
import { connection } from "next/server";
import { ArcDropsScreen } from "@/components/admin-arc/ArcDropsScreen";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { listAllOrders } from "@/lib/db/admin";
import { requireAdmin } from "@/lib/db/session";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

/** The screen's name in the title, in the page's language (round v6 slice E5); the layout adds "· Admin · HIVE". */
export async function generateMetadata(): Promise<Metadata> {
  return { title: picker(await getLocale())({ vi: "Các số", en: "Drops" }) };
}

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
 *
 * Round v5 slice 4 draws it in the Arc frame (`ArcDropsScreen`, its three
 * forms Arc dialogs); the reads here are unchanged.
 */
export default async function AdminDropsPage() {
  await requireAdmin("/admin/drops");
  await connection();
  const orders = await listAllOrders();
  return <ArcDropsScreen no={null} nowIso={toVnIso(demoNow())} orders={orders} />;
}
