import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ArcDropsScreen } from "@/components/admin-arc/ArcDropsScreen";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { listAllOrders } from "@/lib/db/admin";
import { loadCatalog } from "@/lib/db/catalog";
import { requireAdmin } from "@/lib/db/session";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

/** The screen's name in the title, in the page's language (round v6 slice E5); the layout adds "· Admin · HIVE". */
export async function generateMetadata(): Promise<Metadata> {
  return { title: picker(await getLocale())({ vi: "Chi tiết số", en: "Drop details" }) };
}

/**
 * The same table, with one issue open underneath it.
 *
 * The number is padded in the address — `/admin/drops/05`, the way the shop
 * writes it everywhere else — but read as a number, so `/admin/drops/5`
 * works too rather than 404-ing on a link somebody typed by hand. Anything
 * that is not a number at all is not an issue, and neither is a number the
 * catalogue has no issue for: 404, as an order's page answers a code that is
 * not an order, rather than the table of issues with nothing open under it
 * (round v6 slice R2, F22). `requireAdmin` first, as on every admin page.
 *
 * Round v5 slice 4 draws it in the Arc frame (`ArcDropsScreen`); the reads
 * here are unchanged.
 */
export default async function AdminDropDetailPage(props: PageProps<"/admin/drops/[no]">) {
  const { no } = await props.params;
  await requireAdmin(`/admin/drops/${no}`);
  await connection();
  const parsed = Number(no);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  const catalog = await loadCatalog();
  if (!catalog.dropByNo.has(parsed)) notFound();

  const orders = await listAllOrders();
  return <ArcDropsScreen no={parsed} nowIso={toVnIso(demoNow())} orders={orders} />;
}
