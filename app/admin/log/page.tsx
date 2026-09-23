import { connection } from "next/server";
import { ActivityLogScreen } from "@/components/admin/ActivityLogScreen";
import { queryOf } from "@/lib/admin-url";
import { toVnIso } from "@/lib/datetime";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Nhật ký thao tác" };

/**
 * Everything the back office did, and everything the clock decided.
 *
 * Dynamic: half the rows are derived from the current instant — an unpaid
 * order past its deadline, an issue that has opened since the last build —
 * so a page rendered once would stop growing.
 */
export default async function AdminLogPage(props: PageProps<"/admin/log">) {
  await connection();
  const sp = await props.searchParams;
  return <ActivityLogScreen nowIso={toVnIso(demoNow())} query={queryOf(sp)} />;
}
