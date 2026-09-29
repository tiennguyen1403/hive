"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Order } from "@/data/types";
import { dayMonth } from "@/lib/datetime";
import {
  NO_FILTER,
  ORDER_PHASES,
  PHASES,
  filterOrders,
  groupLabel,
  groupSlug,
  groupsOfOrders,
  noneLabel,
  orderGroups,
  resultLabel,
  ticketNote,
  type OrderGroup,
  type OrdersFilter,
} from "@/lib/feed-account";
import { vnd } from "@/lib/money";
import { orderTotalVnd } from "@/lib/orders";
import { FeedClock } from "../FeedClock";
import { FeedIcon } from "../icon/FeedIcon";
import { useNow, useNowMs } from "../now";
import { cx } from "../useReveal";
import { StatusChip, Tile } from "./OrderBits";

interface OrdersViewProps {
  /** The account's orders, newest first, each with the status the clock says it is in (read on the server). */
  orders: Order[];
  /** The two filters as the URL had them (`parseOrdersFilter`). */
  initial: OrdersFilter;
}

/**
 * "Đơn hàng" (round v4 slice 3a): the approved mock's `orders.html` and
 * `orders.js` — every order in one list, newest first, each a ticket; above
 * it the phase (a segmented control) and the line it was bought from (chips),
 * both kept in the URL (QĐ-8) with `history.replaceState`, which Next's router
 * follows without a round trip. A ticket leaves out the line the list is
 * filtered by; a combination with nothing says so and offers to clear both;
 * a screen reader hears the count after each change.
 */
export function OrdersView({ orders, initial }: OrdersViewProps) {
  const catalog = useCatalog();
  const [filter, setFilter] = useState<OrdersFilter>(initial);
  const [result, setResult] = useState("");
  const chips = useRef<HTMLDivElement>(null);
  const all = useRef<HTMLButtonElement>(null);
  const groups = useMemo(() => groupsOfOrders(catalog, orders), [catalog, orders]);
  const shown = filterOrders(catalog, orders, filter);

  /** The view in the URL, beside anything else the address carries; an old `?tab=` gives way to `?phase=`. */
  function writeUrl(f: OrdersFilter) {
    const q = new URLSearchParams(window.location.search);
    q.delete("tab");
    if (f.phase === "all") q.delete("phase");
    else q.set("phase", f.phase);
    if (f.group === "all") q.delete("group");
    else q.set("group", groupSlug(f.group));
    const s = q.toString();
    const want = `${window.location.pathname}${s ? `?${s}` : ""}${window.location.hash}`;
    if (want !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(null, "", want);
    }
  }

  function change(next: OrdersFilter) {
    setFilter(next);
    setResult(resultLabel(filterOrders(catalog, orders, next).length, next));
    writeUrl(next);
  }

  // Once: the URL written as the list reads it, and a chip chosen in it brought into the row's view if it sits past
  // the phone's edge (`orders.js`).
  useEffect(() => {
    writeUrl(initial);
    const row = chips.current;
    const on = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (row && on) {
      const over = on.getBoundingClientRect().right - row.getBoundingClientRect().right + 16;
      if (over > 0) row.scrollLeft += over;
    }
    // Once, on arrival: later changes write the URL themselves.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (orders.length === 0) {
    return (
      <>
        <h1 className="acc-h1 disp" data-hero>
          Đơn hàng
        </h1>
        <div className="empty-state">
          <span className="empty-ic">
            <FeedIcon name="package" />
          </span>
          <p className="empty-title">Chưa có đơn nào</p>
          <Link className="btn btn-blue" href="/products">
            Xem Cửa hàng
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="acc-h1 disp" data-hero>
        Đơn hàng
      </h1>
      <div className="of">
        <div className="seg" role="group" aria-label="Trạng thái">
          <button
            ref={all}
            className="seg-btn"
            type="button"
            aria-pressed={filter.phase === "all"}
            onClick={() => change({ ...filter, phase: "all" })}
          >
            Tất cả
          </button>
          {PHASES.map((k) => (
            <button
              key={k}
              className="seg-btn"
              type="button"
              aria-pressed={filter.phase === k}
              onClick={() => change({ ...filter, phase: k })}
            >
              {ORDER_PHASES[k]}
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Dòng hàng" ref={chips}>
          <button
            className="chip"
            type="button"
            aria-pressed={filter.group === "all"}
            onClick={() => change({ ...filter, group: "all" })}
          >
            Mọi dòng hàng
          </button>
          {groups.map((g) => (
            <button
              key={groupSlug(g)}
              className="chip"
              type="button"
              aria-pressed={filter.group === g}
              onClick={() => change({ ...filter, group: g })}
            >
              {groupLabel(g)}
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {result}
      </p>
      <div className="og-list">
        {shown.length > 0 ? (
          shown.map((o) => (
            <Ticket key={o.code} order={o} groups={orderGroups(catalog, o).filter((g) => g !== filter.group)} />
          ))
        ) : (
          <div className="empty-state of-empty">
            <span className="empty-ic">
              <FeedIcon name="package" />
            </span>
            <p className="empty-title">{noneLabel(filter)}</p>
            <button
              className="btn btn-line"
              type="button"
              onClick={() => {
                change(NO_FILTER);
                all.current?.focus();
              }}
            >
              Bỏ lọc
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * One order as a ticket (`account.js`: `ticket`): what it was bought from, the
 * code in the display face and the total; the state with what it needs; the
 * pieces as tiles (four at most) and the day it was placed.
 */
function Ticket({ order: o, groups }: { order: Order; groups: OrderGroup[] }) {
  const catalog = useCatalog();
  const now = useNow();
  const nowMs = useNowMs();
  const note = ticketNote(o, now);
  const cancelled = o.status.state === "CANCELLED";

  return (
    <article className={cx("ticket", cancelled && "is-cancelled")}>
      <Link className="ticket-a" href={`/account/orders/${o.code}`}>
        <div className="ticket-top">
          {groups.length > 0 && <p className="ticket-grp">{groups.map(groupLabel).join(" · ")}</p>}
          <h3 className="ticket-code disp">{o.code}</h3>
          <p className="ticket-total">{vnd(orderTotalVnd(o))}</p>
        </div>
        <div className="ticket-mid">
          <StatusChip state={o.status.state} />
          {note && (
            <span className="ticket-note">
              {note.kind === "hold" && (
                <>
                  Giữ hàng còn <FeedClock until={note.dueAt} now={nowMs} tag="b" className="num" />
                </>
              )}
              {note.kind === "reason" && note.text}
              {note.kind === "tracking" && (
                <>
                  Mã vận đơn <b>{note.code}</b>
                </>
              )}
              {note.kind === "return" && (
                <>
                  Đổi trả tới <b>{note.day}</b>
                </>
              )}
            </span>
          )}
        </div>
        <div className="ticket-foot">
          <div className="tiles">
            {o.lines.slice(0, 4).map((l, i) => (
              <Tile key={`${l.productId}:${l.color}:${l.size}:${i}`} line={l} product={catalog.byId.get(l.productId)} alt />
            ))}
          </div>
          <p className="ticket-date">Đặt {dayMonth(o.placedAt)}</p>
        </div>
      </Link>
    </article>
  );
}
