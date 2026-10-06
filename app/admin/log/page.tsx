import type { Metadata } from "next";
import { connection } from "next/server";
import { ArcLogScreen } from "@/components/admin-arc/ArcLogScreen";
import { queryOf } from "@/lib/admin-url";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { listAllOrders, listEvents } from "@/lib/db/admin";
import { requireAdmin } from "@/lib/db/session";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

/** The screen's name in the title, in the page's language (round v6 slice E4); the layout adds "· Admin · HIVE". */
export async function generateMetadata(): Promise<Metadata> {
  return { title: picker(await getLocale())({ vi: "Nhật ký thao tác", en: "Activity" }) };
}

/**
 * The log: every event the database recorded — the orders since slice B3a,
 * the catalogue since slice B3b — plus what the clock decided.
 *
 * `requireAdmin` first, then the newest five hundred events — a day of the
 * demo is a few dozen, and the log starts again at every reset — and the
 * order book, which names each order's customer and what was in the box.
 *
 * Dynamic: some rows are derived from the current instant — an unpaid order
 * past its deadline before the sweep has written it down, an issue that
 * opened on schedule — so a page rendered once would stop growing.
 *
 * Since round v5 slice 2 the screen is the Arc one (`ArcLogScreen`, in the
 * Arc frame); the reads are unchanged.
 */
export default async function AdminLogPage(props: PageProps<"/admin/log">) {
  await requireAdmin("/admin/log");
  await connection();
  const sp = await props.searchParams;
  const [events, orders] = await Promise.all([listEvents({ limit: 500 }), listAllOrders()]);
  return (
    <ArcLogScreen
      events={events}
      orders={orders}
      nowIso={toVnIso(demoNow())}
      query={queryOf(sp)}
    />
  );
}
