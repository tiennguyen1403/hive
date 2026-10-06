import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArcCustomerScreen } from "@/components/admin-arc/ArcCustomerScreen";
import { ordersOfCustomer } from "@/lib/admin-customers";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { findCustomer, listAllOrders } from "@/lib/db/admin";
import { requireAdmin } from "@/lib/db/session";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

/** The screen's name in the title, in the page's language (round v6 slice E4); the layout adds "· Admin · HIVE". */
export async function generateMetadata(): Promise<Metadata> {
  return { title: picker(await getLocale())({ vi: "Hồ sơ khách", en: "Customer profile" }) };
}

/**
 * One customer, by the key the back office's links use: a demo shopper's
 * fixture handle (`/admin/customers/c-minhanh`) or a sign-up's uuid.
 *
 * `requireAdmin` first, then the profile and its address book from the
 * database; anything that names no shopper is a 404, decided here on the
 * server before a byte is rendered.
 *
 * Round v5 slice 3 draws it in the Arc frame (`ArcCustomerScreen`); the
 * reads here are unchanged.
 */
export default async function AdminCustomerDetailPage(props: PageProps<"/admin/customers/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/customers/${id}`);
  await connection();

  const customer = await findCustomer(id);
  if (!customer) notFound();
  const orders = ordersOfCustomer(await listAllOrders(), customer);

  return <ArcCustomerScreen customer={customer} orders={orders} nowIso={toVnIso(demoNow())} />;
}
