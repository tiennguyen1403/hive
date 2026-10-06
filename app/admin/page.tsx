import type { Metadata } from "next";
import { connection } from "next/server";
import { ArcOverviewScreen } from "@/components/admin-arc/ArcOverviewScreen";
import { windowDays } from "@/lib/admin-metrics";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { listAllOrders } from "@/lib/db/admin";
import { requireAdmin } from "@/lib/db/session";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

/** The screen's name in the title, in the page's language (round v6 slice E4); the layout adds "· Admin · HIVE". */
export async function generateMetadata(): Promise<Metadata> {
  return { title: picker(await getLocale())({ vi: "Tổng quan", en: "Overview" }) };
}

/**
 * The overview, rendered fresh on every request.
 *
 * `requireAdmin` first — the layout above asked too, but a layout is not a
 * boundary (`02-guides/authentication.md`) — then the order book from the
 * database (slice B3a), which the layout has already read for its count and
 * `React.cache` hands over again for free.
 *
 * `connection()` before the clock is read: without it this page could be
 * prerendered and "the last 14 days" would mean the last 14 days before the
 * build. The instant travels down as a string so the screen, a client
 * component, draws exactly what the server sent on its first pass.
 *
 * Since round v5 slice 2 the screen is the Arc one (`ArcOverviewScreen`,
 * in the Arc frame); the reads are unchanged.
 */
export default async function AdminOverviewPage(props: PageProps<"/admin">) {
  await requireAdmin("/admin");
  await connection();
  const sp = await props.searchParams;
  const orders = await listAllOrders();

  return <ArcOverviewScreen orders={orders} nowIso={toVnIso(demoNow())} days={windowDays(sp.days)} />;
}
