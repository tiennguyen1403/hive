"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Empty } from "@/components/shop/Empty";
import { Toast, type ToastTone } from "@/components/shop/Toast";
import { formatAddressLine } from "@/data/regions";
import type { Order } from "@/data/types";
import {
  ORDER_TABS,
  effectiveOrder,
  refundNote,
  type OrderTabKey,
} from "@/lib/customer-orders";
import { wayToShop } from "@/lib/drop";
import { LEX, issueNo } from "@/lib/lexicon";
import { useCatalog } from "@/components/shop/CatalogContext";
import { trackedOfOrder } from "@/lib/lookup";
import { orderRows, rowCount, rowsForTab } from "@/lib/order-rows";
import { OrderDetailScreen } from "./OrderDetailScreen";
import { OrderRow3 } from "./OrderRow3";
import { demoNow } from "@/lib/clock";

interface OrdersScreenProps {
  /**
   * The account's orders, read on the SERVER (`listMyOrders()`): row level
   * security has already decided which ones are this person's, and the page
   * redirects when nobody is signed in.
   */
  orders: Order[];
  /** The issue selling now — the rows date themselves against it. */
  currentDropNo: number;
  /** `?tab=`, so a filtered list is a URL somebody can come back to (QĐ-8). */
  tab?: string;
  /**
   * `/account/orders/[code]` — the order whose detail opens under the list.
   * The page has already answered 404 for a code that is not this account's.
   */
  openCode?: string;
}

/**
 * Order history — every order of this account, newest first, with one of them
 * open underneath.
 *
 * THE DETAIL IS NOT A SEPARATE PAGE. `/account/orders/DH-2430` renders this
 * same list with that row marked and its detail below, because the next
 * thing somebody does after reading one order is usually to open another —
 * and a page of its own would make that two taps and a scroll.
 *
 * Since slice B2 the list has one source, the database, whoever placed the
 * order and from whichever browser; the counting and the rows are pure
 * functions in `lib/order-rows.ts`.
 *
 * The tab lives in the URL (QĐ-8), like the listing's filters.
 */
export function OrdersScreen({ orders, currentDropNo, tab, openCode }: OrdersScreenProps) {
  const catalog = useCatalog();
  // What "Huỷ đơn" answered, and whether it was a refusal (slice B4b).
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);

  // One instant for the whole render, so a deadline and the state derived
  // from it are judged against the same clock. Re-taken whenever the orders
  // change, which is also when a cancellation lands.
  const now = useMemo(() => demoNow(), [orders]);
  const current: OrderTabKey =
    (ORDER_TABS.find((t) => t.key === tab)?.key as OrderTabKey | undefined) ?? "all";

  // Land on the order that was opened. `.sec.anchor` carries the
  // scroll-margin, so the heading does not end up under the sticky bar.
  useEffect(() => {
    if (!openCode) return;
    document.getElementById(openCode)?.scrollIntoView({ block: "start" });
  }, [openCode]);

  const rows = orderRows(catalog, orders, now);
  const way = wayToShop(catalog, now);
  const shown = rowsForTab(rows, current);
  const waiting = rows.filter((r) => r.state === "AWAITING_TRANSFER").length;

  return (
    <>
      {/* The tab row under the heading already says "Tất cả 5", so the line
          says only what the tabs do not: how many transfers are still owed
          — and is not drawn when that is none (v3 slice 13). */}
      <div className="pghead">
        <h1>Đơn hàng</h1>
        {waiting > 0 && <span className="meta">{waiting} chờ chuyển khoản</span>}
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
          text="Đơn đặt khi đã đăng nhập hiện ở đây. Đơn đặt khi chưa đăng nhập tra cứu bằng mã đơn và số điện thoại."
          action={
            // The issue selling now, on its own page; every style on sale
            // when none is (v3 slice 11).
            <ButtonLink icon="grid" href={way.href}>
              {way.issueNo !== null ? `Xem ${LEX.tl} ${issueNo(way.issueNo)}` : "Xem tất cả mẫu"}
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

      {openCode && (
        <OpenOrder
          code={openCode}
          orders={orders}
          now={now}
          onDone={(message, tone) => setToast({ message, tone })}
        />
      )}

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "ok"}
        onDone={() => setToast(null)}
      />
    </>
  );
}

/**
 * The order behind the URL, in the one shape the detail renders.
 *
 * Found in the list the server already filtered: the page asked the database
 * for this code first and answered a real 404 when the account does not own
 * it (QĐ-16), so a miss here can only be the list and the page disagreeing
 * mid-flight — and then nothing is drawn rather than somebody else's order.
 */
function OpenOrder({
  code,
  orders,
  now,
  onDone,
}: {
  code: string;
  orders: Order[];
  now: Date;
  onDone: (message: string, tone: ToastTone) => void;
}) {
  const catalog = useCatalog();
  const found = orders.find((o) => o.code === code);
  if (!found) return null;

  // The status the clock says it is in: an unpaid transfer past its hold is
  // a cancelled order, and it must read that way here, on the row above it,
  // in the tab counts and in the back office (`effectiveStatus`).
  const order = effectiveOrder(found, now);
  return (
    <OrderDetailScreen
      order={trackedOfOrder(catalog, order, formatAddressLine(order.shipTo), now)}
      {...(order.status.state === "AWAITING_TRANSFER" ? { dueAt: order.status.dueAt } : {})}
      refund={refundNote(order)}
      onDone={onDone}
    />
  );
}
