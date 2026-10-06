import type { Metadata } from "next";
import { connection } from "next/server";
import { ArcCustomersScreen } from "@/components/admin-arc/ArcCustomersScreen";
import { queryOf } from "@/lib/admin-url";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { listAllOrders, listCustomers } from "@/lib/db/admin";
import { requireAdmin } from "@/lib/db/session";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

/** The screen's name in the title, in the page's language (round v6 slice E4); the layout adds "· Admin · HIVE". */
export async function generateMetadata(): Promise<Metadata> {
  return { title: picker(await getLocale())({ vi: "Khách hàng", en: "Customers" }) };
}

/**
 * Who has an account, and what their orders say about them.
 *
 * Since slice B3a the rows are `public.profiles` — the eight demo shoppers
 * and everybody who signed up — with their figures read off their own orders
 * in the database. `requireAdmin` first, as on every admin page. Dynamic,
 * because the label on each row is derived from their orders against the
 * clock — "mới trong số đang bán" only means something while one is open.
 *
 * Round v5 slice 3 draws it in the Arc frame (`ArcCustomersScreen`); the
 * reads here are unchanged.
 */
export default async function AdminCustomersPage(props: PageProps<"/admin/customers">) {
  await requireAdmin("/admin/customers");
  await connection();
  const sp = await props.searchParams;
  const [customers, orders] = await Promise.all([listCustomers(), listAllOrders()]);
  return (
    <ArcCustomersScreen
      customers={customers}
      orders={orders}
      nowIso={toVnIso(demoNow())}
      query={queryOf(sp)}
    />
  );
}
