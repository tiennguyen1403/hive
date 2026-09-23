import { connection } from "next/server";
import { DashboardScreen } from "@/components/admin/DashboardScreen";
import { windowDays } from "@/lib/admin-metrics";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { listAllOrders } from "@/lib/db/admin";
import { requireAdmin } from "@/lib/db/session";

export const metadata = { title: "Tổng quan" };

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
 */
export default async function AdminOverviewPage(props: PageProps<"/admin">) {
  await requireAdmin("/admin");
  await connection();
  const sp = await props.searchParams;
  const orders = await listAllOrders();

  return <DashboardScreen orders={orders} nowIso={toVnIso(demoNow())} days={windowDays(sp.days)} />;
}
