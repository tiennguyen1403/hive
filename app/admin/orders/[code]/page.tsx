import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArcOrderScreen } from "@/components/admin-arc/ArcOrderScreen";
import { ordersOfCustomer } from "@/lib/admin-customers";
import { awaitsCardPayment } from "@/lib/card-checkout";
import { demoNow } from "@/lib/clock";
import { effectiveOrder } from "@/lib/customer-orders";
import { toVnIso } from "@/lib/datetime";
import { findOrderAdmin, listAllOrders, orderEvents } from "@/lib/db/admin";
import { reconcileCardOrder } from "@/lib/db/card-payments";
import { requireAdmin } from "@/lib/db/session";

/**
 * The order's code is the title, "DH-2429 · Quản trị · HIVE" through the
 * layout's template (round v6 slice R2, N2), so orders open in several tabs
 * tell themselves apart. The code is the found order's own, never the
 * address's: a code that is not an order in the book is a 404 here as in the
 * page (`notFound()` may be called in `generateMetadata`,
 * `03-api-reference/04-functions/generate-metadata.md`), and its title says
 * nothing of what was typed. `requireAdmin` first, as the page asks: the book
 * is read with the manager's session, and anybody else is sent to sign in or
 * answered 404 before it is read.
 */
export async function generateMetadata(props: PageProps<"/admin/orders/[code]">): Promise<Metadata> {
  const { code } = await props.params;
  await requireAdmin(`/admin/orders/${code}`);
  const found = await findOrderAdmin(code);
  if (!found) notFound();
  return { title: String(found.code) };
}

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

  const found = await findOrderAdmin(code);
  if (!found) notFound();

  // A card order still waiting is checked against Stripe before it is drawn
  // (slice B18, `reconcileCardOrder`; `/order-confirmed/[code]` says why it
  // is done while rendering). Only when the clock still reads it as waiting:
  // past its hold it is cancelled, and Stripe is not asked. The book is
  // cached for the request, so the order is patched into it by hand; its
  // events are read after, and so include the payment's own.
  const now = demoNow();
  const order = awaitsCardPayment(effectiveOrder(found, now)) ? await reconcileCardOrder(found) : found;

  const [events, all] = await Promise.all([orderEvents(String(order.code)), listAllOrders()]);
  const book = order === found ? all : all.map((o) => (o.code === order.code ? order : o));
  const customerOrders = order.owner ? ordersOfCustomer(book, order.owner) : [];

  // The Arc screen since round v5 slice 1; the admin layout wraps it in the
  // Arc frame.
  return (
    <ArcOrderScreen
      order={order}
      events={events}
      customerOrders={customerOrders}
      nowIso={toVnIso(now)}
      openHandover={sp.handover === "1"}
    />
  );
}
