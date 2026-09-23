import { connection } from "next/server";
import { CustomersTable } from "@/components/admin/CustomersTable";
import { queryOf } from "@/lib/admin-url";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { listAllOrders, listCustomers } from "@/lib/db/admin";
import { requireAdmin } from "@/lib/db/session";

export const metadata = { title: "Khách hàng" };

/**
 * Who has an account, and what their orders say about them.
 *
 * Since slice B3a the rows are `public.profiles` — the eight demo shoppers
 * and everybody who signed up — with their figures read off their own orders
 * in the database. `requireAdmin` first, as on every admin page. Dynamic,
 * because the label on each row is derived from their orders against the
 * clock — "mới trong số đang bán" only means something while one is open.
 */
export default async function AdminCustomersPage(props: PageProps<"/admin/customers">) {
  await requireAdmin("/admin/customers");
  await connection();
  const sp = await props.searchParams;
  const [customers, orders] = await Promise.all([listCustomers(), listAllOrders()]);
  return (
    <CustomersTable
      customers={customers}
      orders={orders}
      nowIso={toVnIso(demoNow())}
      query={queryOf(sp)}
    />
  );
}
