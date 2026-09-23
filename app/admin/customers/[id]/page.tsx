import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CustomerScreen } from "@/components/admin/CustomerScreen";
import { ordersOfCustomer } from "@/lib/admin-customers";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { findCustomer, listAllOrders } from "@/lib/db/admin";
import { requireAdmin } from "@/lib/db/session";

export const metadata = { title: "Hồ sơ khách" };

/**
 * One customer, by the key the back office's links use: a demo shopper's
 * fixture handle (`/admin/customers/c-minhanh`) or a sign-up's uuid.
 *
 * `requireAdmin` first, then the profile and its address book from the
 * database; anything that names no shopper is a 404, decided here on the
 * server before a byte is rendered.
 */
export default async function AdminCustomerDetailPage(props: PageProps<"/admin/customers/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/customers/${id}`);
  await connection();

  const customer = await findCustomer(id);
  if (!customer) notFound();
  const orders = ordersOfCustomer(await listAllOrders(), customer);

  return <CustomerScreen customer={customer} orders={orders} nowIso={toVnIso(demoNow())} />;
}
