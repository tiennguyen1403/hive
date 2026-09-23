import { connection } from "next/server";
import { DashboardScreen } from "@/components/admin/DashboardScreen";
import { windowDays } from "@/lib/admin-metrics";
import { toVnIso } from "@/lib/datetime";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Tổng quan" };

/**
 * The overview, rendered fresh on every request.
 *
 * `connection()` before the clock is read: without it this page would
 * prerender at build time and "the last 14 days" would mean the last 14 days
 * before the build, silently, forever.
 *
 * The instant is handed down as a string instead of being read again in the
 * browser, because the screen is a client component (it merges what this
 * browser has done on top of the fixtures) and two clocks would mean two
 * different trees for React to reconcile.
 */
export default async function AdminOverviewPage(props: PageProps<"/admin">) {
  await connection();
  const sp = await props.searchParams;

  return <DashboardScreen nowIso={toVnIso(demoNow())} days={windowDays(sp.days)} />;
}
