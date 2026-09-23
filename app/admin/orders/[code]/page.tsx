import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminOrderScreen } from "@/components/admin/AdminOrderScreen";
import { ORDERS } from "@/data/orders";
import { orderCode as toOrderCode } from "@/data/types";
import { toVnIso } from "@/lib/datetime";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Chi tiết đơn" };

/**
 * One order.
 *
 * The 404 is decided HERE, on the server, against the fixtures: an order
 * that exists in no fixture cannot be conjured by anything this browser did
 * — the overlay moves orders between states, it never invents one
 * (`lib/admin-sim.ts`).
 *
 * `?handover=1` is how the overview's queue and the row menu open this
 * screen with the handover form already up. It is a starting state, not a
 * filter, so nothing writes it back.
 */
export default async function AdminOrderDetailPage(props: PageProps<"/admin/orders/[code]">) {
  await connection();
  const { code } = await props.params;
  const sp = await props.searchParams;
  const order = ORDERS.find((o) => o.code === toOrderCode(code));
  if (!order) notFound();

  return (
    <AdminOrderScreen
      code={String(order.code)}
      nowIso={toVnIso(demoNow())}
      openHandover={sp.handover === "1"}
    />
  );
}
