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
import { SITE_NAME } from "@/lib/site";

/**
 * "Tổng quan · Quản trị · HIVE", "Overview · Admin · HIVE": the whole title,
 * `absolute` (round v6 slice R2, C3). This page sits in the admin layout's own
 * segment, and a layout's `title.template` applies to the segments below it,
 * not to a page of its own segment
 * (`03-api-reference/04-functions/generate-metadata.md`, "template"); the root
 * layout's "%s · HIVE" was the one that applied. "Quản trị" / "Admin" is the
 * layout's word for the back office.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return {
    title: { absolute: `${t({ vi: "Tổng quan", en: "Overview" })} · ${t({ vi: "Quản trị", en: "Admin" })} · ${SITE_NAME}` },
  };
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
