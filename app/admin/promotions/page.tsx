import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/db/session";
import { ArcPromotionsScreen } from "@/components/admin-arc/ArcPromotionsScreen";
import { queryOf } from "@/lib/admin-url";
import { toVnIso } from "@/lib/datetime";
import { demoNow } from "@/lib/clock";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

/** The screen's name in the title, in the page's language (round v6 slice E5); the layout adds "· Admin · HIVE". */
export async function generateMetadata(): Promise<Metadata> {
  return { title: picker(await getLocale())({ vi: "Mã giảm giá", en: "Discount codes" }) };
}

/**
 * The discount codes.
 *
 * Dynamic, because "Đang chạy" and "Hết hạn" are the clock's answer about a
 * window, not a stored flag — the same rule the issues follow.
 *
 * Round v5 slice 3 draws it in the Arc frame (`ArcPromotionsScreen`, its form
 * an Arc drawer); the page itself is unchanged.
 */
export default async function AdminPromotionsPage(props: PageProps<"/admin/promotions">) {
  await requireAdmin("/admin/promotions");
  await connection();
  const sp = await props.searchParams;
  return <ArcPromotionsScreen nowIso={toVnIso(demoNow())} query={queryOf(sp)} />;
}
