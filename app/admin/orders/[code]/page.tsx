import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminOrderScreen } from "@/components/admin/AdminOrderScreen";
import { ordersOfCustomer } from "@/lib/admin-customers";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { findOrderAdmin, listAllOrders, orderEvents } from "@/lib/db/admin";
import { requireAdmin } from "@/lib/db/session";

export const metadata = { title: "Chi tiết đơn" };

/**
 * One order.
 *
 * `requireAdmin` first (the layout is not a boundary), then the order from
 * the database — the 404 is decided HERE, on the server, for a code that is
 * not one or not in the book (`DH-9999`). Its own events come with it: the
 * notes and the address history are read out of the log, and the customer
 * panel's figures out of that account's other orders.
 *
 * `?handover=1` is how the overview's queue and the row menu open this
 * screen with the handover form already up. It is a starting state, not a
 * filter, so nothing writes it back — and the screen only honours it for an
 * order the guard lets leave.
 */
export default async function AdminOrderDetailPage(props: PageProps<"/admin/orders/[code]">) {
  const { code } = await props.params;
  await requireAdmin(`/admin/orders/${code}`);
  await connection();
  const sp = await props.searchParams;

  const order = await findOrderAdmin(code);
  if (!order) notFound();

  const [events, book] = await Promise.all([orderEvents(String(order.code)), listAllOrders()]);
  const customerOrders = order.owner ? ordersOfCustomer(book, order.owner) : [];

  return (
    <AdminOrderScreen
      order={order}
      events={events}
      customerOrders={customerOrders}
      nowIso={toVnIso(demoNow())}
      openHandover={sp.handover === "1"}
    />
  );
}
