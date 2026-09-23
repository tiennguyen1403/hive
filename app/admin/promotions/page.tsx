import { connection } from "next/server";
import { AdminPromotionsScreen } from "@/components/admin/AdminPromotionsScreen";
import { queryOf } from "@/lib/admin-url";
import { toVnIso } from "@/lib/datetime";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Mã giảm giá" };

/**
 * The discount codes.
 *
 * Dynamic, because "Đang chạy" and "Hết hạn" are the clock's answer about a
 * window, not a stored flag — the same rule the issues follow.
 */
export default async function AdminPromotionsPage(props: PageProps<"/admin/promotions">) {
  await connection();
  const sp = await props.searchParams;
  return <AdminPromotionsScreen nowIso={toVnIso(demoNow())} query={queryOf(sp)} />;
}
