"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Empty } from "@/components/shop/Empty";
import { usePlacedOrders } from "@/components/shop/placed-order";
import { useSimOverlay } from "@/components/shop/sim-store";
import { Toast } from "@/components/shop/Toast";
import { ordersOf } from "@/data/orders";
import { formatAddressLine } from "@/data/regions";
import type { Customer } from "@/data/types";
import { shopOrders } from "@/lib/admin-sim";
import {
  ORDER_TABS,
  REFUND_NONE,
  effectiveOrder,
  refundNote,
  type OrderTabKey,
} from "@/lib/customer-orders";
import { LEX, issueNo } from "@/lib/lexicon";
import { trackedOfOrder, trackedOfPlaced, type TrackedOrder } from "@/lib/lookup";
import {
  deviceOrdersOf,
  orderRows,
  rowCount,
  rowsForTab,
  visibleDeviceOrder,
} from "@/lib/order-rows";
import { transferDeadlineIso } from "@/lib/placed-order";
import { AccountGuard } from "./AccountGuard";
import { OrderDetailScreen } from "./OrderDetailScreen";
import { OrderRow3 } from "./OrderRow3";
import { demoNow } from "@/lib/clock";

interface OrdersScreenProps {
  /** The issue selling now — the rows date themselves against it. */
  currentDropNo: number;
  /** `?tab=`, so a filtered list is a URL somebody can come back to (QĐ-8). */
  tab?: string;
  /** `/account/orders/[code]` — the order whose detail opens under the list. */
  openCode?: string;
}

/**
 * Order history — the fixtures' orders and the ones placed on this device,
 * in one list, newest first, with one of them open underneath.
 *
 * THE DETAIL IS NOT A SEPARATE PAGE. `/account/orders/DH-2430` renders this
 * same list with that row marked and its detail below, because the next
 * thing somebody does after reading one order is usually to open another —
 * and a page of its own would make that two taps and a scroll.
 *
 * The device order is marked rather than hidden or faked: it carries "lưu
 * trên thiết bị này" because it exists in no account on any other machine,
 * and losing that distinction is how a mock starts lying. The merge, the
 * ownership check and the counting are pure functions in
 * `lib/order-rows.ts`.
 *
 * The tab lives in the URL (QĐ-8), like the listing's filters.
 */
export function OrdersScreen({ currentDropNo, tab, openCode }: OrdersScreenProps) {
  const { orders: placed, ready } = usePlacedOrders();
  const { sim, ready: simReady } = useSimOverlay();
  const [toast, setToast] = useState<string | null>(null);

  // One instant for the whole render, so a deadline and the state derived
  // from it are judged against the same clock. Re-taken whenever either
  // store changes, which is also when a cancellation lands.
  const now = useMemo(() => demoNow(), [placed, sim]);
  const current: OrderTabKey =
    (ORDER_TABS.find((t) => t.key === tab)?.key as OrderTabKey | undefined) ?? "all";

  // Land on the order that was opened. `.sec.anchor` carries the
  // scroll-margin, so the heading does not end up under the sticky bar.
  useEffect(() => {
    if (!openCode || !ready) return;
    document.getElementById(openCode)?.scrollIntoView({ block: "start" });
  }, [openCode, ready]);

  return (
    <AccountGuard title="Đơn hàng" active="orders">
      {(me) => {
        const mine = shopOrders(ordersOf(me.id), sim);
        const rows = orderRows(mine, deviceOrdersOf(me.id, placed), now);
        const shown = rowsForTab(rows, current);
        const waiting = rows.filter((r) => r.state === "AWAITING_TRANSFER").length;

        return (
          <>
            <div className="pghead">
              <h1>Đơn hàng</h1>
              <span className="meta">
                {rows.length} đơn
                {waiting > 0 ? ` · ${waiting} chờ chuyển khoản` : ""}
              </span>
            </div>

            {rows.length > 0 && (
              <nav className="tabs3" aria-label="Lọc đơn" style={{ marginTop: 4 }}>
                {ORDER_TABS.map((t) => (
                  <Link
                    key={t.key}
                    href={t.key === "all" ? "/account/orders" : `/account/orders?tab=${t.key}`}
                    className={t.key === current ? "on" : undefined}
                    aria-current={t.key === current ? "page" : undefined}
                  >
                    {t.label}
                    <span className="cnt">{rowCount(rows, t.key)}</span>
                  </Link>
                ))}
              </nav>
            )}

            {rows.length === 0 ? (
              <Empty
                icon="bag"
                title="Chưa có đơn nào"
                text="Đơn đặt trên thiết bị này cũng hiện ở đây, với nhãn “lưu trên thiết bị này”."
                action={
                  <ButtonLink icon="grid" href="/products">
                    Xem {LEX.tl} {issueNo(currentDropNo)}
                  </ButtonLink>
                }
              />
            ) : shown.length === 0 ? (
              <p className="fine3">Không có đơn nào ở mục này.</p>
            ) : (
              <div className="rows3">
                {shown.map((row) => (
                  <OrderRow3
                    key={row.code}
                    row={row}
                    currentDropNo={currentDropNo}
                    open={row.code === openCode}
                  />
                ))}
              </div>
            )}

            {openCode && ready && simReady && (
              <OpenOrder
                me={me}
                code={openCode}
                orders={mine}
                placed={placed}
                now={now}
                onCancelled={setToast}
              />
            )}

            <Toast message={toast} onDone={() => setToast(null)} />
          </>
        );
      }}
    </AccountGuard>
  );
}

/**
 * The order behind the URL, in the one shape the detail renders.
 *
 * Two places to look, because an order lives in one of two: the fixtures and
 * `brand.orders`. Both are checked against the person asking — order codes
 * are short and sequential, and the page behind one holds a name, a phone
 * number and a home address (QĐ-16).
 *
 * A code that matches neither is a 404 rather than a message: "bạn không có
 * quyền" would confirm that the order exists and belongs to somebody.
 */
function OpenOrder({
  me,
  code,
  orders,
  placed,
  now,
  onCancelled,
}: {
  me: Customer;
  code: string;
  orders: ReturnType<typeof ordersOf>;
  placed: ReturnType<typeof usePlacedOrders>["orders"];
  now: Date;
  onCancelled: (message: string) => void;
}) {
  const found = orders.find((o) => o.code === code);
  if (found) {
    // The status the clock says it is in: an unpaid transfer past its hold
    // is a cancelled order, and it must read that way here, on the row above
    // it, in the tab counts and in the back office (`effectiveStatus`).
    const fixture = effectiveOrder(found, now);
    const tracked: TrackedOrder = trackedOfOrder(
      fixture,
      formatAddressLine(fixture.shipTo),
      now,
    );
    return (
      <OrderDetailScreen
        order={tracked}
        {...(fixture.status.state === "AWAITING_TRANSFER"
          ? { dueAt: fixture.status.dueAt }
          : {})}
        refund={refundNote(fixture)}
        onCancelled={onCancelled}
      />
    );
  }

  const device = visibleDeviceOrder(me.id, code, placed);
  if (device) {
    const tracked = trackedOfPlaced(device, now);
    return (
      <OrderDetailScreen
        order={tracked}
        {...(device.payment === "BANK_TRANSFER"
          ? { dueAt: transferDeadlineIso(device.placedAt) }
          : {})}
        // No device order has ever been paid, so a cancelled one never has
        // anything to refund. Same sentence as the fixtures', from the same
        // module.
        refund={tracked.state === "CANCELLED" ? REFUND_NONE : null}
        onCancelled={onCancelled}
      />
    );
  }

  notFound();
}
