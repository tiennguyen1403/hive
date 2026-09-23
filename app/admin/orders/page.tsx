import { connection } from "next/server";
import { AdminOrdersScreen } from "@/components/admin/AdminOrdersScreen";
import { queryOf } from "@/lib/admin-url";
import { toVnIso } from "@/lib/datetime";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Đơn hàng" };

/**
 * Every order in the book, newest first.
 *
 * Dynamic because the rows carry deadlines and ages — "hạn 08:05 · 22/09",
 * "chưa bàn giao · 3 ngày" — and a page built once would keep quoting the
 * clock it was built at. The instant travels down as a string so the screen,
 * which is a client component (it merges what this browser has done), draws
 * exactly what the server sent on its first pass.
 *
 * The filters are read HERE rather than with `useSearchParams` in the
 * screen: they already arrive as a prop on a dynamic page, and taking them
 * from the server keeps the first client render identical to the HTML.
 */
export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  await connection();
  const sp = await props.searchParams;
  return <AdminOrdersScreen nowIso={toVnIso(demoNow())} query={queryOf(sp)} />;
}
