import { connection } from "next/server";
import { AdminOrdersScreen } from "@/components/admin/AdminOrdersScreen";
import { queryOf } from "@/lib/admin-url";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { listAllOrders } from "@/lib/db/admin";
import { requireAdmin } from "@/lib/db/session";

export const metadata = { title: "Đơn hàng" };

/**
 * Every order in the book, newest first — the database's book since slice
 * B3a, the sample's twenty-four and whatever the demo's visitors ordered.
 *
 * `requireAdmin` first, on this page as on every admin page: the layout is
 * not a boundary (`02-guides/authentication.md`).
 *
 * Dynamic because the rows carry deadlines and ages — "hạn 08:05 · 22/09",
 * "chưa bàn giao · 3 ngày" — and a page built once would keep quoting the
 * clock it was built at. The filters are read HERE rather than with
 * `useSearchParams` in the screen: they already arrive as a prop on a dynamic
 * page, and taking them from the server keeps the first client render
 * identical to the HTML.
 */
export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  await requireAdmin("/admin/orders");
  await connection();
  const sp = await props.searchParams;
  const orders = await listAllOrders();
  return <AdminOrdersScreen orders={orders} nowIso={toVnIso(demoNow())} query={queryOf(sp)} />;
}
