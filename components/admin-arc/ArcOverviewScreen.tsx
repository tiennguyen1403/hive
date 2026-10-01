"use client";

import { Check, Download, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useOptimistic, useState, useTransition } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { DropState } from "@/data/types";
import { markPaid } from "@/lib/actions/admin";
import {
  WINDOW_CHOICES,
  customerSplit,
  dropRanking,
  recentOrders,
  salesWindow,
  stockAlerts,
  type SellerRank,
  type WindowDays,
} from "@/lib/admin-metrics";
import type { AdminOrder } from "@/lib/admin-orders";
import { orderCustomer, queueRows } from "@/lib/admin-rows";
import { downloadCsv } from "@/lib/csv";
import { currentIssueNo } from "@/lib/current-issue";
import { effectiveOrder } from "@/lib/customer-orders";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { closesInLabel, dropState, opensInLabel } from "@/lib/drop";
import { LOW_STOCK_AT, dropSummary } from "@/lib/inventory";
import { LEX, issueLabel, issueNo, styleName } from "@/lib/lexicon";
import { compactVnd, plainVnd, vnd } from "@/lib/money";
import { STATE_LABEL } from "@/lib/order-labels";
import { orderTotalVnd } from "@/lib/orders";
import { photoUrl } from "@/lib/photos";
import { Badge, type BadgeTone } from "@/registry/components/badge/badge";
import { Button } from "@/registry/components/button/button";
import SegmentedControl from "@/registry/components/segmented-control/segmented-control";
import { ArcButtonLink } from "./ArcButtonLink";
import { ArcKpi } from "./ArcKpi";
import { CodeCell, TONE } from "./ArcOrderCells";
import panel from "./ArcOrderScreen.module.css";
import styles from "./ArcOverviewScreen.module.css";
import page from "./ArcPage.module.css";
import { ArcRevenueChart } from "./ArcRevenueChart";
import { useArcToast } from "./useArcToast";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/** "Kỳ xem": v3's three ranges, as segments (brief v5 slice 2, §3.2). */
const RANGES = WINDOW_CHOICES.map((n) => ({ value: String(n), label: `${n} ngày` }));

/** The issue's state beside its dates: v3's words, Arc's tones (brief §3.2). */
const ISSUE_STATE: Record<DropState, { text: string; tone: BadgeTone }> = {
  OPEN: { text: "Đang bán", tone: "success" },
  UPCOMING: { text: "Sắp mở", tone: "info" },
  CLOSED: { text: "Đã đóng", tone: "neutral" },
};

/**
 * A seller's bar, by what it says: the accent while the style sells, the
 * danger colour from 85% sold, and the whole track in ink once it is gone,
 * the one reading that means over (v3's `.meter.hot`, `.meter.gone`).
 */
function barState(r: SellerRank): "gone" | "hot" | undefined {
  if (r.left === 0) return "gone";
  return r.percent >= 85 ? "hot" : undefined;
}

/**
 * The back office's front page in the Arc frame (round v5 slice 2): v3's
 * `DashboardScreen` (`components/admin/DashboardScreen.tsx`) figure for figure
 * and word for word, drawn with Arc's parts.
 *
 * EVERY NUMBER HERE IS DERIVED from the order book in the database and the
 * catalogue, through `lib/` (`salesWindow`, `queueRows`, `dropSummary`,
 * `dropRanking`, `stockAlerts`, `customerSplit`); none is typed in. The
 * conversion rate and "so với kỳ trước" of the first mock stay gone, for
 * v3's reasons: nothing records a page view, and the window before this one
 * falls between two issues.
 *
 * THE RANGE IS IN THE ADDRESS (QĐ-8): 14 days is `/admin`, the others
 * `/admin?days=N`, pushed so Back returns to the range before. A new range
 * shows at once (`useOptimistic`): every figure is computed here from the
 * book the server already sent, and the render that follows the address
 * agrees with it.
 *
 * "Đã nhận tiền" in the queue writes to the database (`markPaid`). The row's
 * button says "Đang lưu…" while it goes, then "Đã lưu" until the answer's
 * render arrives with the order paid: it stays in the queue, now waiting to
 * be handed over, as in v3. The queue's first job carries the panel's one
 * primary button; the rest are secondary, because a queue is sorted into the
 * order it should be worked in.
 */
export function ArcOverviewScreen({
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
  const say = useArcToast();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  /**
   * The issue this page counts: the one selling, else the one that closed
   * last (slice 5a). Not the highest issue holding a style, which a style
   * added to the next issue would move.
   */
  const currentNo = currentIssueNo(catalog, now);
  const [range, setRange] = useOptimistic(days);
  const [, startNavigation] = useTransition();
  /** Rows just confirmed, kept disabled until the answer re-renders the queue. */
  const [done, setDone] = useState<string[]>([]);
  /** The row whose confirmation is on its way to the server. */
  const [busy, setBusy] = useState<string | null>(null);
  const [, startPaying] = useTransition();
  const ids = {
    revenue: useId(),
    queue: useId(),
    latest: useId(),
    best: useId(),
    low: useId(),
    customers: useId(),
  };

  // The book as the database has it, read through what the twelve-hour clock
  // has already decided about it.
  const orders = useMemo(() => book.map((o) => effectiveOrder(o, now)), [book, now]);
  const products = catalog.products;

  /** Show the range at once, then put it in the address: 14 is the bare `/admin`. */
  function pickRange(value: string) {
    const n = Number(value) as WindowDays;
    if (n === range) return;
    startNavigation(() => {
      setRange(n);
      router.push(n === 14 ? "/admin" : `/admin?days=${n}`, { scroll: false });
    });
  }

  /**
   * "Đã nhận tiền" on a queue row: `markPaid` → `admin_mark_paid()`. The
   * action revalidates the area, so the answer arrives with the queue already
   * redrawn; the toast says what the server said. After an `await` the
   * transition has to be restated (react.dev/reference/react/useTransition).
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

  const sales = salesWindow(now, orders, range);
  const queue = queueRows(catalog, orders, now);
  const awaiting = queue.filter((q) => q.action === "MARK_PAID").length;
  const toHandOver = queue.length - awaiting;
  const drop = catalog.dropByNo.get(currentNo);
  const state: DropState = drop ? dropState(drop, now) : "CLOSED";
  const summary = dropSummary(catalog, currentNo, products);
  const soldPercent =
    summary.cutUnits === 0 ? 0 : Math.round((summary.soldUnits / summary.cutUnits) * 100);
  const alerts = stockAlerts(catalog, currentNo, products);
  const ranking = dropRanking(catalog, currentNo, products);
  const latest = recentOrders(orders, 5);
  const split = customerSplit(now, orders, range, drop?.opensAt ?? nowIso);

  return (
    <div className={page.page}>
      <header className={page.header}>
        <div className={page.headRow}>
          <h1 className={page.title}>Tổng quan</h1>
          <div className={page.actions}>
            <Badge size="sm">Dữ liệu mẫu</Badge>
            <SegmentedControl
              label="Kỳ xem"
              options={RANGES}
              value={String(range)}
              onValueChange={pickRange}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                downloadCsv(`doanh-thu-${range}-ngay.csv`, [
                  ["Ngày", "Doanh thu (VND)", "Số đơn"],
                  ...sales.points.map((p) => [p.day, p.vnd, p.orders]),
                ])
              }
            >
              <Download {...ICON} />
              {`Tải CSV ${range} ngày`}
            </Button>
          </div>
        </div>
        {drop && (
          <p className={`${page.sub} ${styles.issue}`}>
            <span>
              {issueLabel(drop.no)} · {dayMonth(drop.opensAt)} → {dayMonth(drop.closesAt)}
            </span>
            <Badge tone={ISSUE_STATE[state].tone} size="sm">
              {ISSUE_STATE[state].text}
            </Badge>
            <span>
              {state === "OPEN"
                ? closesInLabel(drop.closesAt, now)
                : state === "UPCOMING"
                  ? opensInLabel(drop.opensAt, now)
                  : `đóng ${dayMonth(drop.closesAt)}`}
            </span>
          </p>
        )}
      </header>

      <div className={styles.kpis}>
        <ArcKpi label={`Doanh thu ${range} ngày`} value={compactVnd(sales.totalVnd)}>
          {vnd(sales.totalVnd)} · chỉ tính đơn đã thanh toán
        </ArcKpi>
        <ArcKpi label={`Đơn trong ${range} ngày`} value={String(sales.orders)}>
          {sales.orders > 0
            ? `trung bình ${vnd(sales.averageOrderVnd)} mỗi đơn · ${split.total} khách`
            : "chưa có đơn nào trong kỳ"}
        </ArcKpi>
        <ArcKpi label="Cần xử lý" value={String(queue.length)}>
          {awaiting} chờ tiền · {toHandOver} chờ bàn giao
          {queue.length > 0 && (
            <>
              {/* The separator stays on the line it ends (v3 slice 13). A
                  `Link`, not v3's bare `<a>`: the browser writes a bare hash
                  jump into the history without Next's state, and Back to that
                  entry from another screen changed the address and left the
                  other screen on view (measured 30/09). */}
              {" · "}
              <Link href="#queue">xử lý ngay</Link>
            </>
          )}
        </ArcKpi>
        <ArcKpi
          label={`Còn trong ${LEX.tl} ${issueNo(currentNo)}`}
          value={`${summary.onHand} chiếc`}
          meter={soldPercent}
        >
          {summary.soldUnits} / {summary.cutUnits} đã bán · {soldPercent}% · {summary.styles} mẫu
        </ArcKpi>
      </div>

      <section className={panel.panel} aria-labelledby={ids.revenue}>
        <div className={panel.panelHead}>
          <h2 id={ids.revenue} className={panel.panelTitle}>
            Doanh thu {range} ngày gần nhất
          </h2>
        </div>
        <ArcRevenueChart points={sales.points} totalVnd={sales.totalVnd} peak={sales.peak} />
      </section>

      {/* Two columns that stack on their own, as in v3: the work on the left,
          the stock and the customers on the right. Tab follows the columns. */}
      <div className={styles.split}>
        <div className={styles.column}>
          <section id="queue" className={panel.panel} aria-labelledby={ids.queue}>
            <div className={panel.panelHead}>
              <div className={panel.panelHeading}>
                <h2 id={ids.queue} className={panel.panelTitle}>
                  Cần xử lý
                </h2>
                <p className={panel.panelSub}>{queue.length} đơn</p>
              </div>
            </div>
            {queue.length === 0 ? (
              <p className={styles.none}>Không còn đơn nào chờ cửa hàng. Đơn mới sẽ hiện ở đây.</p>
            ) : (
              <ul className={styles.rows}>
                {queue.map((q, i) => {
                  const variant = i === 0 ? "primary" : "secondary";
                  const saved = done.includes(q.code);
                  return (
                    <li className={styles.job} key={q.code}>
                      <p className={styles.jobTitle}>
                        <CodeCell code={q.code} /> · {q.customer} · {vnd(q.totalVnd)}
                      </p>
                      {/* A separator ends the line it is on, never starts the
                          next (v3 slice 13). */}
                      <p className={styles.jobDetail}>
                        {q.standing}
                        {q.due && (
                          <>
                            {" · "}
                            {q.late ? <span className={styles.late}>{q.due}</span> : q.due}
                          </>
                        )}
                        {" · "}
                        {q.items}
                      </p>
                      <div className={styles.jobAction}>
                        {q.action === "MARK_PAID" ? (
                          <Button
                            variant={variant}
                            size="sm"
                            loading={busy === q.code}
                            disabled={(busy !== null && busy !== q.code) || saved}
                            onClick={() => confirmPaid(q.code)}
                          >
                            {busy === null && !saved ? <Check {...ICON} /> : null}
                            {busy === q.code ? "Đang lưu…" : saved ? "Đã lưu" : "Đã nhận tiền"}
                          </Button>
                        ) : (
                          /* The handover form lives on the order, because it
                             needs a tracking number. The link opens it there. */
                          <ArcButtonLink
                            variant={variant}
                            size="sm"
                            href={`/admin/orders/${q.code}?handover=1#handover`}
                          >
                            <Package {...ICON} />
                            Đóng gói và bàn giao
                          </ArcButtonLink>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={panel.panel} aria-labelledby={ids.latest}>
            <div className={panel.panelHead}>
              <h2 id={ids.latest} className={panel.panelTitle}>
                Đơn mới nhất
              </h2>
              <Link className={panel.textLink} href="/admin/orders">
                Xem tất cả
              </Link>
            </div>
            <table className={panel.lines}>
              <thead>
                <tr>
                  <th scope="col">Mã đơn</th>
                  <th scope="col">Khách</th>
                  <th scope="col">Thời gian</th>
                  <th scope="col" className={panel.num}>
                    Giá trị
                  </th>
                  <th scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((o) => {
                  const s = STATE_LABEL[o.status.state];
                  return (
                    <tr key={o.code}>
                      <td>
                        <CodeCell code={String(o.code)} />
                      </td>
                      <td className={panel.nowrap}>{orderCustomer(o)}</td>
                      <td className={panel.nowrap}>
                        {dayMonth(o.placedAt)} · {clockLabel(o.placedAt)}
                      </td>
                      <td className={panel.num}>{plainVnd(orderTotalVnd(o))}</td>
                      <td>
                        <Badge tone={TONE[s.tone]} size="sm">
                          {s.text}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>

        <div className={styles.column}>
          <section className={panel.panel} aria-labelledby={ids.best}>
            <div className={panel.panelHead}>
              <div className={panel.panelHeading}>
                <h2 id={ids.best} className={panel.panelTitle}>
                  Bán chạy trong {LEX.tl} {issueNo(currentNo)}
                </h2>
                <p className={panel.panelSub}>đã bán / đã cắt</p>
              </div>
            </div>
            <ol className={styles.ranking}>
              {ranking.slice(0, 5).map((r, i) => (
                <li className={styles.rank} key={r.product.id}>
                  <span className={styles.rankNo}>{i + 1}</span>
                  <Image
                    className={panel.thumb}
                    src={photoUrl(r.product.photoKeys[0]!, 120)}
                    alt=""
                    width={36}
                    height={45}
                  />
                  <span className={styles.name}>{styleName(r.product.name, r.product.dropNo)}</span>
                  <span className={styles.bar} data-state={barState(r)} aria-hidden="true">
                    <span className={styles.barFill} style={{ width: `${r.percent}%` }} />
                  </span>
                  <span className={styles.count}>
                    <b>{r.sold}</b> / {r.cut} · {r.left === 0 ? "hết" : `${r.percent}%`}
                  </span>
                </li>
              ))}
            </ol>
            <p className={styles.more}>
              <Link className={panel.textLink} href={`/admin/drops/${issueNo(currentNo)}`}>
                Xem cả {ranking.length} mẫu của {LEX.tl}
              </Link>
            </p>
          </section>

          <section className={panel.panel} aria-labelledby={ids.low}>
            <div className={panel.panelHead}>
              <div className={panel.panelHeading}>
                <h2 id={ids.low} className={panel.panelTitle}>
                  Sắp hết
                </h2>
                <p className={panel.panelSub}>{alerts.length} mẫu</p>
              </div>
            </div>
            {alerts.length === 0 ? (
              <p className={styles.none}>
                Chưa mẫu nào trong {LEX.tl} {issueNo(currentNo)} xuống tới {LOW_STOCK_AT} chiếc.
              </p>
            ) : (
              <ul className={styles.rows}>
                {alerts.map((a) => (
                  <li className={styles.alert} key={a.product.id}>
                    <Image
                      className={panel.thumb}
                      src={photoUrl(a.product.photoKeys[0]!, 120)}
                      alt=""
                      width={36}
                      height={45}
                    />
                    <span className={styles.alertText}>
                      <span className={styles.name}>{styleName(a.product.name, a.product.dropNo)}</span>
                      <span className={styles.note}>{a.note}</span>
                    </span>
                    <Badge tone={a.left === 0 ? "danger" : "warning"} size="sm">
                      {a.left === 0 ? "Hết" : `Còn ${a.left}`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={panel.panel} aria-labelledby={ids.customers}>
            <div className={panel.panelHead}>
              <div className={panel.panelHeading}>
                <h2 id={ids.customers} className={panel.panelTitle}>
                  Khách trong {range} ngày
                </h2>
                <p className={panel.panelSub}>
                  {split.total} khách đặt {sales.orders} đơn
                </p>
              </div>
            </div>
            {split.total === 0 ? (
              <p className={styles.none}>Chưa có đơn đã thanh toán nào trong kỳ này.</p>
            ) : (
              <>
                <span className={styles.share} aria-hidden="true">
                  <span
                    className={styles.shareFill}
                    style={{ width: `${(split.fresh / split.total) * 100}%` }}
                  />
                </span>
                <div className={styles.legend}>
                  <span>
                    <b>{split.fresh}</b> khách mới (tham gia trong {LEX.tl})
                  </span>
                  <span>
                    <b>{split.returning}</b> khách quay lại
                  </span>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
