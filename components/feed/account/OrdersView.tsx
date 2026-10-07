"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Order } from "@/data/types";
import { dayMonth } from "@/lib/datetime";
import {
  NO_FILTER,
  PHASES,
  filterOrders,
  groupLabelIn,
  groupSlug,
  groupsOfOrders,
  noneLabel,
  orderGroups,
  orderPhaseLabel,
  resultLabel,
  ticketNote,
  type OrderGroup,
  type OrdersFilter,
} from "@/lib/feed-account";
import { picker } from "@/lib/i18n";
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
 *
 * In the page's language since round v6 slice E3a: "Orders", "All",
 * "Ongoing", "Delivered", "Cancelled", "All lines", Drop 05 and Basics. The
 * count a screen reader hears is kept as the filter it counted and worded at
 * render, so a switch of language rewords it too.
 */
export function OrdersView({ orders, initial }: OrdersViewProps) {
  const catalog = useCatalog();
  const locale = useLocale();
  const t = picker(locale);
  const [filter, setFilter] = useState<OrdersFilter>(initial);
  const [result, setResult] = useState<{ count: number; filter: OrdersFilter } | null>(null);
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
    setResult({ count: filterOrders(catalog, orders, next).length, filter: next });
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

  const title = t({ vi: "Đơn hàng", en: "Orders" });

  if (orders.length === 0) {
    return (
      <>
        <h1 className="acc-h1 disp" data-hero>
          {title}
        </h1>
        <div className="empty-state">
          <span className="empty-ic">
            <FeedIcon name="package" />
          </span>
          <p className="empty-title">{t({ vi: "Chưa có đơn nào", en: "No orders yet" })}</p>
          <Link className="btn btn-blue" href="/products">
            {t({ vi: "Xem Cửa hàng", en: "Go to Shop" })}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="acc-h1 disp" data-hero>
        {title}
      </h1>
      <div className="of">
        <div className="seg" role="group" aria-label={t({ vi: "Trạng thái", en: "Status" })}>
          <button
            ref={all}
            className="seg-btn"
            type="button"
            aria-pressed={filter.phase === "all"}
            onClick={() => change({ ...filter, phase: "all" })}
          >
            {t({ vi: "Tất cả", en: "All" })}
          </button>
          {PHASES.map((k) => (
            <button
              key={k}
              className="seg-btn"
              type="button"
              aria-pressed={filter.phase === k}
              onClick={() => change({ ...filter, phase: k })}
            >
              {orderPhaseLabel(k, locale)}
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label={t({ vi: "Dòng hàng", en: "Line" })} ref={chips}>
          <button
            className="chip"
            type="button"
            aria-pressed={filter.group === "all"}
            onClick={() => change({ ...filter, group: "all" })}
          >
            {t({ vi: "Mọi dòng hàng", en: "All lines" })}
          </button>
          {groups.map((g) => (
            <button
              key={groupSlug(g)}
              className="chip"
              type="button"
              aria-pressed={filter.group === g}
              onClick={() => change({ ...filter, group: g })}
            >
              {groupLabelIn(g, locale)}
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {result ? resultLabel(result.count, result.filter, locale) : ""}
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
            <p className="empty-title">{noneLabel(filter, locale)}</p>
            <button
              className="btn btn-line"
              type="button"
              onClick={() => {
                change(NO_FILTER);
                all.current?.focus();
              }}
            >
              {t({ vi: "Bỏ lọc", en: "Clear filters" })}
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
 * pieces as tiles (four at most) and the day it was placed. In English
 * (round v6 slice E3a) "Reserved for", "Tracking no.", "Returns until",
 * "Ordered 21 Sep".
 */
function Ticket({ order: o, groups }: { order: Order; groups: OrderGroup[] }) {
  const catalog = useCatalog();
  const locale = useLocale();
  const t = picker(locale);
  const now = useNow();
  const nowMs = useNowMs();
  const note = ticketNote(o, now, locale);
  const cancelled = o.status.state === "CANCELLED";

  return (
    <article className={cx("ticket", cancelled && "is-cancelled")}>
      <Link className="ticket-a" href={`/account/orders/${o.code}`}>
        <div className="ticket-top">
          {groups.length > 0 && <p className="ticket-grp">{groups.map((g) => groupLabelIn(g, locale)).join(" · ")}</p>}
          <h3 className="ticket-code disp">{o.code}</h3>
          <p className="ticket-total">{vnd(orderTotalVnd(o), locale)}</p>
        </div>
        <div className="ticket-mid">
          <StatusChip state={o.status.state} payment={o.payment} />
          {note && (
            <span className="ticket-note">
              {note.kind === "hold" &&
                t<React.ReactNode>({
                  vi: (
                    <>
                      Giữ hàng còn <FeedClock until={note.dueAt} now={nowMs} tag="b" className="num" />
                    </>
                  ),
                  en: (
                    <>
                      Reserved for <FeedClock until={note.dueAt} now={nowMs} tag="b" className="num" />
                    </>
                  ),
                })}
              {note.kind === "reason" && note.text}
              {note.kind === "tracking" &&
                t<React.ReactNode>({
                  vi: (
                    <>
                      Mã vận đơn <b>{note.code}</b>
                    </>
                  ),
                  en: (
                    <>
                      Tracking no. <b>{note.code}</b>
                    </>
                  ),
                })}
              {note.kind === "return" &&
                t<React.ReactNode>({
                  vi: (
                    <>
                      Đổi trả tới <b>{note.day}</b>
                    </>
                  ),
                  en: (
                    <>
                      Returns until <b>{note.day}</b>
                    </>
                  ),
                })}
            </span>
          )}
        </div>
        <div className="ticket-foot">
          <div className="tiles">
            {o.lines.slice(0, 4).map((l, i) => (
              <Tile key={`${l.productId}:${l.color}:${l.size}:${i}`} line={l} product={catalog.byId.get(l.productId)} alt />
            ))}
          </div>
          <p className="ticket-date">
            {t<React.ReactNode>({
              vi: <>Đặt {dayMonth(o.placedAt)}</>,
              en: `Ordered ${dayMonth(o.placedAt, "en")}`,
            })}
          </p>
        </div>
      </Link>
    </article>
  );
}
