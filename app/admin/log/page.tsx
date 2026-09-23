import { connection } from "next/server";
import { ActivityLogScreen } from "@/components/admin/ActivityLogScreen";
import { queryOf } from "@/lib/admin-url";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { listAllOrders, listEvents } from "@/lib/db/admin";
import { requireAdmin } from "@/lib/db/session";

export const metadata = { title: "Nhật ký thao tác" };

/**
 * The log: every event the database recorded (slice B3a), plus what the
 * clock decided and what this browser still simulates.
 *
 * `requireAdmin` first, then the newest five hundred events — a day of the
 * demo is a few dozen, and the log starts again at every reset — and the
 * order book, which names each order's customer and what was in the box.
 *
 * Dynamic: some rows are derived from the current instant — an unpaid order
 * past its deadline before the sweep has written it down, an issue that
 * opened on schedule — so a page rendered once would stop growing.
 */
export default async function AdminLogPage(props: PageProps<"/admin/log">) {
  await requireAdmin("/admin/log");
  await connection();
  const sp = await props.searchParams;
  const [events, orders] = await Promise.all([listEvents({ limit: 500 }), listAllOrders()]);
  return (
    <ActivityLogScreen
      events={events}
      orders={orders}
      nowIso={toVnIso(demoNow())}
      query={queryOf(sp)}
    />
  );
}
