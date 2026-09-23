import { connection } from "next/server";
import { CustomersTable } from "@/components/admin/CustomersTable";
import { queryOf } from "@/lib/admin-url";
import { toVnIso } from "@/lib/datetime";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Khách hàng" };

/**
 * Who has bought.
 *
 * Personal data, simulated but shaped like the real thing. Dynamic, because
 * the label on each row is derived from their orders against the clock —
 * "mới trong số đang bán" only means something while one is open.
 */
export default async function AdminCustomersPage(props: PageProps<"/admin/customers">) {
  await connection();
  const sp = await props.searchParams;
  return <CustomersTable nowIso={toVnIso(demoNow())} query={queryOf(sp)} />;
}
