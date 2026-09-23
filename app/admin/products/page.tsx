import { connection } from "next/server";
import { ProductsTable } from "@/components/admin/ProductsTable";
import { queryOf } from "@/lib/admin-url";
import { toVnIso } from "@/lib/datetime";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Mẫu" };

/**
 * The catalogue, issue by issue.
 *
 * Cut, sold and on-hand all come from `lib/inventory`, the same functions
 * the shop reads — so a figure here cannot disagree with the "còn 2" on a
 * product card. Dynamic, because which issue is open is the clock's answer.
 */
export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  await connection();
  const sp = await props.searchParams;
  return <ProductsTable nowIso={toVnIso(demoNow())} query={queryOf(sp)} />;
}
