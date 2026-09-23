import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CustomerScreen } from "@/components/admin/CustomerScreen";
import { customerById } from "@/data/customers";
import { customerId as toCustomerId } from "@/data/types";
import { toVnIso } from "@/lib/datetime";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Hồ sơ khách" };

/**
 * One customer.
 *
 * The 404 is decided HERE, on the server, against the fixtures: the overlay
 * records what the shop did to orders, never a person it invented.
 */
export default async function AdminCustomerDetailPage(props: PageProps<"/admin/customers/[id]">) {
  await connection();
  const { id } = await props.params;
  if (!customerById.has(toCustomerId(id))) notFound();

  return <CustomerScreen id={id} nowIso={toVnIso(demoNow())} />;
}
