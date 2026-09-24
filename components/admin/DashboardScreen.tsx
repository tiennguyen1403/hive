"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AdminTop } from "@/components/admin/AdminTop";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { useAdminToast } from "@/components/admin/AdminToast";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";
import { useCatalog } from "@/components/shop/CatalogContext";
import { markPaid } from "@/lib/actions/admin";
import type { AdminOrder } from "@/lib/admin-orders";
import {
  WINDOW_CHOICES,
  customerSplit,
  dropRanking,
  recentOrders,
  salesWindow,
  stockAlerts,
  type WindowDays,
} from "@/lib/admin-metrics";
import { orderCustomer, queueRows } from "@/lib/admin-rows";
import { effectiveOrder } from "@/lib/customer-orders";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { closesInLabel, dropState, opensInLabel } from "@/lib/drop";
import { LOW_STOCK_AT, dropSummary } from "@/lib/inventory";
import { LEX, issueLabel, issueNo, styleName } from "@/lib/lexicon";
import { compactVnd, plainVnd, vnd } from "@/lib/money";
import { STATE_LABEL } from "@/lib/order-labels";
import { orderTotalVnd } from "@/lib/orders";
import { photoUrl } from "@/lib/photos";

/**
 * The back office's front page.
 *
 * EVERY NUMBER HERE IS DERIVED — from the order book in the database (slice
 * B3a) and the catalogue, which the database holds too (the shelf and the
 * issues since slice B3b). The approved mock drew this screen
 * with invented figures — page views, a conversion rate, "+12% so với kỳ
 * trước" — and PRODUCT.md forbids presenting invented sales as real, so:
 *
 *   · the conversion rate is GONE. Nothing in this codebase records a page
 *     view. In its place "Cần xử lý", which is both real and the thing
 *     somebody opening this screen actually wants.
 *   · "so với kỳ trước" is GONE too: the fourteen days before this window
 *     fall between two issues and took nothing, so the percentage would
 *     divide by zero. The chart shows that gap directly, which says it
 *     better.
 *
 * `nowIso` comes from the server rather than from `demoNow()` here. The page
 * is dynamic, so it is the current instant either way — but taking it as a
 * prop means the first client render is identical to the HTML that was sent,
 * which is what keeps hydration quiet and the clock honest.
 */
export function DashboardScreen({
  orders: book,
  nowIso,
  days,
}: {
  /** The order book, from the database (`admin_orders()`). */
  orders: AdminOrder[];
  nowIso: string;
  days: WindowDays;
}) {
  const catalog = useCatalog();
  const currentDropNo = catalog.currentDropNo;
  const say = useAdminToast();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  /** Rows just confirmed, kept disabled until the answer re-renders the queue. */
  const [done, setDone] = useState<string[]>([]);
  /** The row whose confirmation is on its way to the server. */
  const [busy, setBusy] = useState<string | null>(null);
  const [, startPaying] = useTransition();

  // The book as the database has it, read through what the twelve-hour clock
  // has already decided about it.
  const orders = book.map((o) => effectiveOrder(o, now));
  const products = catalog.products;

  /**
   * "Đã nhận tiền" on a queue row: `markPaid` → `admin_mark_paid()`. The
   * action revalidates the area, so the answer arrives with the queue already
   * one row shorter; the toast says what the server said.
   */
  function confirmPaid(code: string) {
    if (busy) return;
    setBusy(code);
    startPaying(async () => {
      const result = await markPaid([code]);
      startPaying(() => {
        setBusy(null);
        if (result.ok) setDone((d) => [...d, code]);
        say(result.message ?? result.errors.form ?? "", result.ok ? "ok" : "error");
      });
    });
  }

  const window = salesWindow(now, orders, days);
  const queue = queueRows(catalog, orders, now);
  const awaiting = queue.filter((q) => q.action === "MARK_PAID").length;
  const toHandOver = queue.length - awaiting;
  const drop = catalog.dropByNo.get(currentDropNo);
  const state = drop ? dropState(drop, now) : "CLOSED";
  const summary = dropSummary(catalog, currentDropNo, products);
  const soldPercent =
    summary.cutUnits === 0 ? 0 : Math.round((summary.soldUnits / summary.cutUnits) * 100);
  const alerts = stockAlerts(catalog, currentDropNo, products);
  const ranking = dropRanking(catalog, currentDropNo, products);
  const latest = recentOrders(orders, 5);
  const split = customerSplit(now, orders, days, drop?.opensAt ?? nowIso);

  return (
    <>
      <AdminTop
        title="Tổng quan"
        sub={
          drop && (
            <>
              <span>
                {issueLabel(drop.no)} · {dayMonth(drop.opensAt)} → {dayMonth(drop.closesAt)}
              </span>
              <Badge tone={state === "OPEN" ? "ok" : state === "UPCOMING" ? "info" : "shut"}>
                {state === "OPEN" ? "Đang bán" : state === "UPCOMING" ? "Sắp mở" : "Đã đóng"}
              </Badge>
              <span>
                {state === "OPEN"
                  ? closesInLabel(drop.closesAt, now)
                  : state === "UPCOMING"
                    ? opensInLabel(drop.opensAt, now)
                    : `đóng ${dayMonth(drop.closesAt)}`}
              </span>
            </>
          )
        }
      >
        {/* Links, not buttons: the range is part of what the screen is
            showing, so it belongs in the address bar where Back and a
            reload can both find it (QĐ-8). */}
        <span className="seg3" role="group" aria-label="Kỳ xem">
          {WINDOW_CHOICES.map((n) => (
            <Link
              key={n}
              href={n === 14 ? "/admin" : `/admin?days=${n}`}
              className={n === days ? "on" : undefined}
              aria-current={n === days ? "true" : undefined}
            >
              {n} ngày
            </Link>
          ))}
        </span>
        <ExportCsvButton
          label={`Tải CSV ${days} ngày`}
          filename={`doanh-thu-${days}-ngay.csv`}
          rows={[
            ["Ngày", "Doanh thu (VND)", "Số đơn"],
            ...window.points.map((p) => [p.day, p.vnd, p.orders]),
          ]}
        />
      </AdminTop>

      <div className="kpis3">
        <div className="kpi3">
          <span className="k">Doanh thu {days} ngày</span>
          <b>{compactVnd(window.totalVnd)}</b>
          {vnd(window.totalVnd)} · chỉ tính đơn đã thanh toán
        </div>
        <div className="kpi3">
          <span className="k">Đơn trong {days} ngày</span>
          <b>{window.orders}</b>
          {window.orders > 0
            ? `trung bình ${vnd(window.averageOrderVnd)} mỗi đơn · ${split.total} khách`
            : "chưa có đơn nào trong kỳ"}
        </div>
        <div className="kpi3">
          <span className="k">Cần xử lý</span>
          <b>{queue.length}</b>
          {awaiting} chờ tiền · {toHandOver} chờ bàn giao
          {queue.length > 0 && (
            <>
              {" · "}
              <a href="#queue">xử lý ngay</a>
            </>
          )}
        </div>
        <div className="kpi3">
          <span className="k">
            Còn trong {LEX.tl} {issueNo(currentDropNo)}
          </span>
          <b>{summary.onHand} chiếc</b>
          {summary.soldUnits} / {summary.cutUnits} đã bán · {soldPercent}% · {summary.styles} mẫu
          <div className="meter" aria-hidden="true">
            <i style={{ width: `${soldPercent}%` }} />
          </div>
        </div>
      </div>

      <section className="panel3">
        <h2>
          Doanh thu {days} ngày gần nhất
          <span className="meta">cột trống = ngày không có đơn đã thanh toán</span>
        </h2>
        <RevenueChart points={window.points} totalVnd={window.totalVnd} peak={window.peak} />
      </section>

      <div className="split3">
        <section className="panel3" id="queue">
          <h2>
            Cần xử lý
            <span className="meta">
              {queue.length} đơn · việc của cửa hàng, không phải của khách hay bên vận chuyển
            </span>
          </h2>
          <div className="bd queue3">
            {queue.length === 0 ? (
              <p className="none">Không còn đơn nào chờ cửa hàng. Đơn mới sẽ hiện ở đây.</p>
            ) : (
              queue.map((q, i) => (
                <div className="q" key={q.code}>
                  <b>
                    <Link href={`/admin/orders/${q.code}`}>{q.code}</Link> · {q.customer} ·{" "}
                    {vnd(q.totalVnd)}
                  </b>
                  <span className="sub">
                    {q.standing}
                    {q.due && (
                      <>
                        {" · "}
                        {q.late ? <span className="late">{q.due}</span> : q.due}
                      </>
                    )}
                    {" · "}
                    {q.items}
                  </span>
                  {/* ONE HONEY BUTTON IN THE PANEL, and it is the top row.
                      The queue is already sorted into the order it should be
                      worked, so "one primary action per screen" means the
                      first job — the rest carry the ink outline. Five honey
                      buttons down a list is a list of equals, which is the
                      opposite of what a queue says, and on this screen they
                      were also competing with the chart, the badges and the
                      stamp for the same colour. */}
                  <span className="act">
                    {q.action === "MARK_PAID" ? (
                      <Button
                        tone={i === 0 ? "sm" : "ink sm"}
                        {...(busy === q.code || done.includes(q.code)
                          ? {}
                          : { icon: "check" as const })}
                        disabled={busy !== null || done.includes(q.code)}
                        onClick={() => confirmPaid(q.code)}
                      >
                        {busy === q.code
                          ? "Đang lưu…"
                          : done.includes(q.code)
                            ? "Đã lưu"
                            : "Đã nhận tiền"}
                      </Button>
                    ) : (
                      /* The handover form lives on the order, because it
                         needs a tracking number. The link opens it there. */
                      <ButtonLink
                        tone={i === 0 ? "sm" : "ink sm"}
                        icon="box"
                        href={`/admin/orders/${q.code}?handover=1#handover`}
                      >
                        Đóng gói và bàn giao
                      </ButtonLink>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel3">
          <h2>
            Bán chạy trong {LEX.tl} {issueNo(currentDropNo)}
            <span className="meta">đã bán / đã cắt</span>
          </h2>
          <div className="bd rank3">
            {ranking.slice(0, 5).map((r, i) => (
              <div className="r" key={r.product.id}>
                <span className="no">{i + 1}</span>
                <Image
                  src={photoUrl(r.product.photoKeys[0]!, 120)}
                  alt=""
                  width={36}
                  height={45}
                />
                <b>{styleName(r.product.name, r.product.dropNo)}</b>
                <div
                  className={
                    r.left === 0 ? "meter gone" : r.percent >= 85 ? "meter hot" : "meter"
                  }
                  aria-hidden="true"
                >
                  <i style={{ width: `${r.percent}%` }} />
                </div>
                <span className="n">
                  <b>{r.sold}</b> / {r.cut} · {r.left === 0 ? "hết" : `${r.percent}%`}
                </span>
              </div>
            ))}
            <p className="fine3">
              <Link className="lnk" href={`/admin/drops/${issueNo(currentDropNo)}`}>
                Xem cả {ranking.length} mẫu của {LEX.tl}
              </Link>
            </p>
          </div>
        </section>
      </div>

      <div className="split3">
        <section className="panel3">
          <h2>
            Đơn mới nhất
            <Link className="more" href="/admin/orders">
              Xem tất cả
            </Link>
          </h2>
          <table>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách</th>
                <th>Thời gian</th>
                <th className="right">Giá trị</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((o) => {
                const s = STATE_LABEL[o.status.state];
                return (
                  <tr key={o.code}>
                    <td>
                      <Link href={`/admin/orders/${o.code}`}>{o.code}</Link>
                    </td>
                    <td className="nw">{orderCustomer(o)}</td>
                    <td className="nw">
                      {dayMonth(o.placedAt)} · {clockLabel(o.placedAt)}
                    </td>
                    <td className="right">{plainVnd(orderTotalVnd(o))}</td>
                    <td>
                      <Badge tone={s.tone}>{s.text}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <div>
          <section className="panel3">
            <h2>
              Sắp hết<span className="meta">{alerts.length} mẫu</span>
            </h2>
            <div className="bd rank3">
              {alerts.length === 0 ? (
                <p className="none">
                  Chưa mẫu nào trong {LEX.tl} {issueNo(currentDropNo)} xuống tới {LOW_STOCK_AT}{" "}
                  chiếc.
                </p>
              ) : (
                alerts.map((a) => (
                  <div className="r two" key={a.product.id}>
                    <Image
                      src={photoUrl(a.product.photoKeys[0]!, 120)}
                      alt=""
                      width={36}
                      height={45}
                    />
                    <span>
                      <b>{styleName(a.product.name, a.product.dropNo)}</b>
                      <span className="sub">{a.note}</span>
                    </span>
                    <Badge tone={a.left === 0 ? "hot" : "warn"}>
                      {a.left === 0 ? "Hết" : `Còn ${a.left}`}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel3">
            <h2>
              Khách trong {days} ngày
              <span className="meta">
                {split.total} khách đặt {window.orders} đơn
              </span>
            </h2>
            <div className="bd">
              {split.total === 0 ? (
                <p className="none">Chưa có đơn đã thanh toán nào trong kỳ này.</p>
              ) : (
                <>
                  <div className="meter" style={{ height: 8, marginTop: 0 }} aria-hidden="true">
                    <i style={{ width: `${(split.fresh / split.total) * 100}%` }} />
                  </div>
                  <div className="axis">
                    <span>
                      <b>{split.fresh}</b> khách mới (tham gia trong {LEX.tl})
                    </span>
                    <span>
                      <b>{split.returning}</b> khách quay lại
                    </span>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      <p className="fine3">
        <Icon name="info" className="ic sm" /> Dữ liệu mẫu: {book.length} đơn, {summary.styles}{" "}
        mẫu · mọi thao tác lưu trên máy chủ ·{" "}
        <Link className="lnk" href="/admin/log">
          Chi tiết
        </Link>
      </p>
    </>
  );
}
