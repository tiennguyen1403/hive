import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminDropsScreen } from "@/components/admin/AdminDropsScreen";
import { toVnIso } from "@/lib/datetime";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Chi tiết số" };

/**
 * The same table, with one issue open underneath it.
 *
 * The number is padded in the address — `/admin/drops/05`, the way the shop
 * writes it everywhere else — but read as a number, so `/admin/drops/5`
 * works too rather than 404-ing on a link somebody typed by hand. Anything
 * that is not a number at all is not an issue.
 */
export default async function AdminDropDetailPage(props: PageProps<"/admin/drops/[no]">) {
  await connection();
  const { no } = await props.params;
  const parsed = Number(no);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();

  return <AdminDropsScreen no={parsed} nowIso={toVnIso(demoNow())} />;
}
