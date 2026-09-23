import { connection } from "next/server";
import { SlipScreen } from "@/components/admin/SlipScreen";
import { demoNow } from "@/lib/clock";
import { effectiveOrder } from "@/lib/customer-orders";
import { toVnIso } from "@/lib/datetime";
import { listAllOrders, listEvents } from "@/lib/db/admin";
import { requireAdmin } from "@/lib/db/session";
import { addressEditReason } from "@/lib/order-notes";

export const metadata = { title: "Phiếu giao" };

/**
 * The delivery slips for one order or for a selection.
 *
 * `?codes=DH-2429,DH-2428` rather than a segment under `[code]`: the list
 * screen prints whatever is ticked, and a route that only ever took one
 * order would have made the bulk action a lie. The codes are used as a
 * filter over the order book — the database's since slice B3a — so an
 * unknown one simply matches nothing. With no codes, what is waiting to be
 * packed: every paid order.
 *
 * The address on a slip is the one the parcel carries: an address the shop
 * edited has already replaced the order's copy, and the log says why, so the
 * reason is looked up here and printed beside it.
 */
export default async function AdminSlipsPage(props: PageProps<"/admin/slips">) {
  await requireAdmin("/admin/slips");
  await connection();
  const sp = await props.searchParams;
  const raw = Array.isArray(sp.codes) ? sp.codes[0] : sp.codes;
  const codes = (raw ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const now = demoNow();
  const [book, edits] = await Promise.all([
    listAllOrders(),
    listEvents({ kind: "ORDER_ADDRESS_EDITED", limit: 500 }),
  ]);
  const orders = (
    codes.length > 0
      ? book.filter((o) => codes.includes(String(o.code)))
      : book.filter((o) => effectiveOrder(o, now).status.state === "PAID")
  ).map((o) => effectiveOrder(o, now));

  // Oldest first, so the last edit of each order is the one that sticks.
  const history = [...edits].reverse();
  const reasons: Record<string, string> = {};
  for (const o of orders) {
    const reason = addressEditReason(history, String(o.code));
    if (reason) reasons[String(o.code)] = reason;
  }

  return <SlipScreen orders={orders} editReasons={reasons} nowIso={toVnIso(now)} />;
}
