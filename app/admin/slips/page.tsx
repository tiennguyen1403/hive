import { connection } from "next/server";
import { SlipScreen } from "@/components/admin/SlipScreen";
import { toVnIso } from "@/lib/datetime";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Phiếu giao" };

/**
 * The delivery slips for one order or for a selection.
 *
 * `?codes=DH-2429,DH-2428` rather than a segment under `[code]`: the list
 * screen prints whatever is ticked, and a route that only ever took one
 * order would have made the bulk action a lie. The codes are used as a
 * filter over the order book, so an unknown one simply matches nothing.
 */
export default async function AdminSlipsPage(props: PageProps<"/admin/slips">) {
  await connection();
  const sp = await props.searchParams;
  const raw = Array.isArray(sp.codes) ? sp.codes[0] : sp.codes;
  const codes = (raw ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return <SlipScreen codes={codes} nowIso={toVnIso(demoNow())} />;
}
