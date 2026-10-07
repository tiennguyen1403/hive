"use client";

import { Check, Download, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useOptimistic, useState, useTransition } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
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
import { guestSuffix, orderCustomerName, queueRows } from "@/lib/admin-rows";
import { storedLang } from "@/lib/admin-text";
import { downloadCsv } from "@/lib/csv";
import { currentIssueNo } from "@/lib/current-issue";
import { effectiveOrder } from "@/lib/customer-orders";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { closesInLabel, dropState, opensInLabel } from "@/lib/drop";
import { picker, plural, type Locale } from "@/lib/i18n";
import { LOW_STOCK_AT, dropSummary } from "@/lib/inventory";
import { LEX, issueLabel, issueNo, styleName } from "@/lib/lexicon";
import { compactVnd, plainVnd, vnd } from "@/lib/money";
import { orderStateLabel } from "@/lib/order-labels";
import { orderTotalVnd } from "@/lib/orders";
import { photoUrl } from "@/lib/photos";
import { nameLang, productText } from "@/lib/product-text";
import { Badge } from "@/registry/components/badge/badge";
import { Button } from "@/registry/components/button/button";
import SegmentedControl from "@/registry/components/segmented-control/segmented-control";
import { ArcButtonLink } from "./ArcButtonLink";
import { ArcKpi } from "./ArcKpi";
import { ArcMeter } from "./ArcMeter";
import { CodeCell, TONE } from "./ArcOrderCells";
import panel from "./ArcOrderScreen.module.css";
import styles from "./ArcOverviewScreen.module.css";
import page from "./ArcPage.module.css";
import { ArcRevenueChart } from "./ArcRevenueChart";
import { issueState } from "./arc-issue-state";
import { useArcToast } from "./useArcToast";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/** "Kỳ xem": v3's three ranges, as segments (brief v5 slice 2, §3.2); "14 days" in English. */
function rangesIn(locale: Locale) {
  return WINDOW_CHOICES.map((n) => ({ value: String(n), label: picker(locale)({ vi: `${n} ngày`, en: `${n} days` }) }));
}

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
 *
 * In the page's language since round v6 slice E4 (`useLocale()`): the figures
 * the English way ("1.2M₫", "1,018,286₫"), the glossary's states and "Low
 * stock", a style by `productText` with the English code; the file
 * "revenue-14-days.csv". A customer's name is printed as stored, said in
 * Vietnamese on an English page. The Vietnamese markup is unchanged.
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
  const locale = useLocale();
  const t = picker(locale);
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
  const queue = queueRows(catalog, orders, now, locale);
  const awaiting = queue.filter((q) => q.action === "MARK_PAID").length;
  const toHandOver = queue.length - awaiting;
  const drop = catalog.dropByNo.get(currentNo);
  const state: DropState = drop ? dropState(drop, now) : "CLOSED";
  const summary = dropSummary(catalog, currentNo, products);
  const soldPercent =
    summary.cutUnits === 0 ? 0 : Math.round((summary.soldUnits / summary.cutUnits) * 100);
  const alerts = stockAlerts(catalog, currentNo, products, locale);
  const ranking = dropRanking(catalog, currentNo, products);
  const latest = recentOrders(orders, 5);
  /** The order a queue row is about, for its customer's name on an English page. */
  const orderOf = (code: string) => orders.find((o) => String(o.code) === code);
  const split = customerSplit(now, orders, range, drop?.opensAt ?? nowIso);

  return (
    <div className={page.page}>
      <header className={page.header}>
        <div className={page.headRow}>
          <h1 className={page.title}>{t({ vi: "Tổng quan", en: "Overview" })}</h1>
          <div className={page.actions}>
            <Badge size="sm">{t({ vi: "Dữ liệu mẫu", en: "Demo data" })}</Badge>
            <SegmentedControl
              label={t({ vi: "Kỳ xem", en: "Period" })}
              options={rangesIn(locale)}
              value={String(range)}
              onValueChange={pickRange}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                downloadCsv(t({ vi: `doanh-thu-${range}-ngay.csv`, en: `revenue-${range}-days.csv` }), [
                  t({ vi: ["Ngày", "Doanh thu (VND)", "Số đơn"], en: ["Day", "Revenue (VND)", "Orders"] }),
                  ...sales.points.map((p) => [p.day, p.vnd, p.orders]),
                ])
              }
            >
              <Download {...ICON} />
              {t({ vi: `Tải CSV ${range} ngày`, en: `Download ${range}-day CSV` })}
            </Button>
          </div>
        </div>
        {drop && (
          <p className={`${page.sub} ${styles.issue}`}>
            <span>
              {issueLabel(drop.no, locale)} · {dayMonth(drop.opensAt, locale)} → {dayMonth(drop.closesAt, locale)}
            </span>
            <Badge tone={issueState(state, locale).tone} size="sm">
              {issueState(state, locale).text}
            </Badge>
            <span>
              {state === "OPEN"
                ? closesInLabel(drop.closesAt, now, locale)
                : state === "UPCOMING"
                  ? opensInLabel(drop.opensAt, now, locale)
                  : t({ vi: `đóng ${dayMonth(drop.closesAt)}`, en: `closed ${dayMonth(drop.closesAt, locale)}` })}
            </span>
          </p>
        )}
      </header>

      <div className={styles.kpis}>
        <ArcKpi label={t({ vi: `Doanh thu ${range} ngày`, en: `${range}-day revenue` })} value={compactVnd(sales.totalVnd, locale)}>
          {t<React.ReactNode>({
            vi: <>{vnd(sales.totalVnd)} · chỉ tính đơn đã thanh toán</>,
            en: `${vnd(sales.totalVnd, locale)} · paid orders only`,
          })}
        </ArcKpi>
        <ArcKpi label={t({ vi: `Đơn trong ${range} ngày`, en: `Orders in ${range} days` })} value={String(sales.orders)}>
          {sales.orders > 0
            ? t({
                vi: `trung bình ${vnd(sales.averageOrderVnd)} mỗi đơn · ${split.total} khách`,
                en: `${vnd(sales.averageOrderVnd, locale)} average per order · ${plural(split.total, "customer", "customers")}`,
              })
            : t({ vi: "chưa có đơn nào trong kỳ", en: "no orders in this period" })}
        </ArcKpi>
        <ArcKpi label={t({ vi: "Cần xử lý", en: "To process" })} value={String(queue.length)}>
          {t<React.ReactNode>({
            vi: (
              <>
                {awaiting} chờ tiền · {toHandOver} chờ bàn giao
              </>
            ),
            en: `${awaiting} awaiting payment · ${toHandOver} to hand over`,
          })}
          {queue.length > 0 && (
            <>
              {/* The separator stays on the line it ends (v3 slice 13). A
                  `Link`, not v3's bare `<a>`: the browser writes a bare hash
                  jump into the history without Next's state, and Back to that
                  entry from another screen changed the address and left the
                  other screen on view (measured 30/09). */}
              {" · "}
              <Link href="#queue">{t({ vi: "xử lý ngay", en: "process now" })}</Link>
            </>
          )}
        </ArcKpi>
        <ArcKpi
          label={t({ vi: `Còn trong ${LEX.tl} ${issueNo(currentNo)}`, en: `Left in ${issueLabel(currentNo, locale)}` })}
          value={t({ vi: `${summary.onHand} chiếc`, en: plural(summary.onHand, "unit", "units") })}
          meter={soldPercent}
        >
          {t<React.ReactNode>({
            vi: (
              <>
                {summary.soldUnits} / {summary.cutUnits} đã bán · {soldPercent}% · {summary.styles} mẫu
              </>
            ),
            en: `${summary.soldUnits} / ${summary.cutUnits} sold · ${soldPercent}% · ${plural(summary.styles, "style", "styles")}`,
          })}
        </ArcKpi>
      </div>

      <section className={panel.panel} aria-labelledby={ids.revenue}>
        <div className={panel.panelHead}>
          <h2 id={ids.revenue} className={panel.panelTitle}>
            {t<React.ReactNode>({ vi: <>Doanh thu {range} ngày gần nhất</>, en: `Revenue, last ${range} days` })}
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
                  {t({ vi: "Cần xử lý", en: "To process" })}
                </h2>
                <p className={panel.panelSub}>
                  {t<React.ReactNode>({ vi: <>{queue.length} đơn</>, en: plural(queue.length, "order", "orders") })}
                </p>
              </div>
            </div>
            {queue.length === 0 ? (
              <p className={styles.none}>
                {t({
                  vi: "Không còn đơn nào chờ cửa hàng. Đơn mới sẽ hiện ở đây.",
                  en: "No orders are waiting on the shop. New ones will show here.",
                })}
              </p>
            ) : (
              <ul className={styles.rows}>
                {queue.map((q, i) => {
                  const variant = i === 0 ? "primary" : "secondary";
                  const saved = done.includes(q.code);
                  const who = locale === "en" ? orderOf(q.code) : undefined;
                  return (
                    <li className={styles.job} key={q.code}>
                      {who ? (
                        <p className={styles.jobTitle}>
                          <CodeCell code={q.code} /> ·{" "}
                          <span lang={storedLang(orderCustomerName(who).name, locale)}>{orderCustomerName(who).name}</span>
                          {orderCustomerName(who).guest ? ` · ${guestSuffix(locale)}` : ""} · {vnd(q.totalVnd, locale)}
                        </p>
                      ) : (
                        <p className={styles.jobTitle}>
                          <CodeCell code={q.code} /> · {q.customer} · {vnd(q.totalVnd)}
                        </p>
                      )}
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
                            {busy === q.code
                              ? t({ vi: "Đang lưu…", en: "Saving…" })
                              : saved
                                ? t({ vi: "Đã lưu", en: "Saved" })
                                : t({ vi: "Đã nhận tiền", en: "Mark as paid" })}
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
                            {t({ vi: "Đóng gói và bàn giao", en: "Pack and hand over" })}
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
                {t({ vi: "Đơn mới nhất", en: "Latest orders" })}
              </h2>
              <Link className={panel.textLink} href="/admin/orders">
                {t({ vi: "Xem tất cả", en: "View all" })}
              </Link>
            </div>
            <table className={panel.lines}>
              <thead>
                <tr>
                  <th scope="col">{t({ vi: "Mã đơn", en: "Order" })}</th>
                  <th scope="col">{t({ vi: "Khách", en: "Customer" })}</th>
                  <th scope="col">{t({ vi: "Thời gian", en: "Placed" })}</th>
                  <th scope="col" className={panel.num}>
                    {t({ vi: "Giá trị", en: "Total" })}
                  </th>
                  <th scope="col">{t({ vi: "Trạng thái", en: "Status" })}</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((o) => {
                  const s = orderStateLabel(o, locale);
                  const { name, guest } = orderCustomerName(o);
                  return (
                    <tr key={o.code}>
                      <td>
                        <CodeCell code={String(o.code)} />
                      </td>
                      {locale === "en" ? (
                        <td className={panel.nowrap}>
                          <span lang={storedLang(name, locale)}>{name}</span>
                          {guest ? ` · ${guestSuffix(locale)}` : ""}
                        </td>
                      ) : (
                        <td className={panel.nowrap}>{guest ? `${name} · ${guestSuffix(locale)}` : name}</td>
                      )}
                      <td className={panel.nowrap}>
                        {dayMonth(o.placedAt, locale)} · {clockLabel(o.placedAt)}
                      </td>
                      <td className={panel.num}>{plainVnd(orderTotalVnd(o), locale)}</td>
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
                  {t<React.ReactNode>({
                    vi: (
                      <>
                        Bán chạy trong {LEX.tl} {issueNo(currentNo)}
                      </>
                    ),
                    en: `Best sellers in ${issueLabel(currentNo, locale)}`,
                  })}
                </h2>
                <p className={panel.panelSub}>{t({ vi: "đã bán / đã cắt", en: "sold / cut" })}</p>
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
                  <span className={styles.name} lang={nameLang(r.product, locale)}>
                    {styleName(productText(r.product, locale).name, r.product.dropNo, locale)}
                  </span>
                  <ArcMeter percent={r.percent} reading={barState(r)} />
                  <span className={styles.count}>
                    <b>{r.sold}</b> / {r.cut} · {r.left === 0 ? t({ vi: "hết", en: "sold out" }) : `${r.percent}%`}
                  </span>
                </li>
              ))}
            </ol>
            <p className={styles.more}>
              <Link className={panel.textLink} href={`/admin/drops/${issueNo(currentNo)}`}>
                {t<React.ReactNode>({
                  vi: (
                    <>
                      Xem cả {ranking.length} mẫu của {LEX.tl}
                    </>
                  ),
                  en: `View all ${plural(ranking.length, "style", "styles")} in the drop`,
                })}
              </Link>
            </p>
          </section>

          <section className={panel.panel} aria-labelledby={ids.low}>
            <div className={panel.panelHead}>
              <div className={panel.panelHeading}>
                <h2 id={ids.low} className={panel.panelTitle}>
                  {t({ vi: "Sắp hết", en: "Low stock" })}
                </h2>
                <p className={panel.panelSub}>
                  {t<React.ReactNode>({ vi: <>{alerts.length} mẫu</>, en: plural(alerts.length, "style", "styles") })}
                </p>
              </div>
            </div>
            {alerts.length === 0 ? (
              <p className={styles.none}>
                {t<React.ReactNode>({
                  vi: (
                    <>
                      Chưa mẫu nào trong {LEX.tl} {issueNo(currentNo)} xuống tới {LOW_STOCK_AT} chiếc.
                    </>
                  ),
                  en: `No style in ${issueLabel(currentNo, locale)} is down to ${plural(LOW_STOCK_AT, "unit", "units")} yet.`,
                })}
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
                      <span className={styles.name} lang={nameLang(a.product, locale)}>
                        {styleName(productText(a.product, locale).name, a.product.dropNo, locale)}
                      </span>
                      <span className={styles.note}>{a.note}</span>
                    </span>
                    <Badge tone={a.left === 0 ? "danger" : "warning"} size="sm">
                      {a.left === 0
                        ? t({ vi: "Hết", en: "Sold out" })
                        : t({ vi: `Còn ${a.left}`, en: `${a.left} left` })}
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
                  {t<React.ReactNode>({ vi: <>Khách trong {range} ngày</>, en: `Customers in ${range} days` })}
                </h2>
                <p className={panel.panelSub}>
                  {t<React.ReactNode>({
                    vi: (
                      <>
                        {split.total} khách đặt {sales.orders} đơn
                      </>
                    ),
                    en: `${plural(split.total, "customer", "customers")} placed ${plural(sales.orders, "order", "orders")}`,
                  })}
                </p>
              </div>
            </div>
            {split.total === 0 ? (
              <p className={styles.none}>
                {t({ vi: "Chưa có đơn đã thanh toán nào trong kỳ này.", en: "No paid orders in this period yet." })}
              </p>
            ) : (
              <>
                <span className={styles.share} aria-hidden="true">
                  <span
                    className={styles.shareFill}
                    style={{ width: `${(split.fresh / split.total) * 100}%` }}
                  />
                </span>
                <div className={styles.legend}>
                  {locale === "vi" ? (
                    <>
                      <span>
                        <b>{split.fresh}</b> khách mới (tham gia trong {LEX.tl})
                      </span>
                      <span>
                        <b>{split.returning}</b> khách quay lại
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        <b>{split.fresh}</b> new (joined during the drop)
                      </span>
                      <span>
                        <b>{split.returning}</b> returning
                      </span>
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
