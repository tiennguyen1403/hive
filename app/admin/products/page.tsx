import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/db/session";
import { ArcProductsScreen } from "@/components/admin-arc/ArcProductsScreen";
import { queryOf } from "@/lib/admin-url";
import { toVnIso } from "@/lib/datetime";
import { demoNow } from "@/lib/clock";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

/** The screen's name in the title, in the page's language (round v6 slice E5); the layout adds "· Admin · HIVE". */
export async function generateMetadata(): Promise<Metadata> {
  return { title: picker(await getLocale())({ vi: "Mẫu", en: "Styles" }) };
}

/**
 * The catalogue, issue by issue.
 *
 * Cut, sold and on-hand all come from `lib/inventory`, the same functions
 * the shop reads — so a figure here cannot disagree with the "còn 2" on a
 * product card. Dynamic, because which issue is open is the clock's answer.
 *
 * Round v5 slice 5a: the table is the Arc screen (`ArcProductsScreen`); the
 * style form under it followed in slice 5b (`ArcProductScreen`).
 */
export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  await requireAdmin("/admin/products");
  await connection();
  const sp = await props.searchParams;
  return <ArcProductsScreen nowIso={toVnIso(demoNow())} query={queryOf(sp)} />;
}
