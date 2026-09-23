"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AdminSheet } from "@/components/admin/AdminSheet";
import { AdminTop } from "@/components/admin/AdminTop";
import { DropFormModal, atDropHour, dropLengthDays } from "@/components/admin/DropFormModal";
import { TeaserFormSheet } from "@/components/admin/TeaserFormSheet";
import { useSim, useSimNow } from "@/components/admin/SimContext";
import { ActionMenu } from "@/components/admin/Table3";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CATALOG, DROPS, TEASERS } from "@/data/catalog";
import { SIZES } from "@/data/types";
import { stockAlerts } from "@/lib/admin-metrics";
import { DROP_STATE_LABEL, SIM_SUFFIX, simDropRows } from "@/lib/admin-rows";
import { isSimTeaser, nextDropNo, simDrops, simProducts, simTeasers } from "@/lib/admin-sim";
import { downloadCsv } from "@/lib/csv";
import { clockLabel, dateTimeLabel, dayMonth, dayMonthYear, toVnIso } from "@/lib/datetime";
import { closesInLabel, dropState, opensInLabel } from "@/lib/drop";
import {
  dropRevenueVnd,
  dropSummary,
  isSoldOut,
  onHand,
  onHandOf,
  productsInDrop,
  soldOutSizes,
  soldUnits,
} from "@/lib/inventory";
import { LEX, issueLabel, issueNo } from "@/lib/lexicon";
import { compactVnd, plainVnd, vnd } from "@/lib/money";
import { photoUrl } from "@/lib/photos";
import { soldOutTimes } from "@/lib/sold-out-times";
import { COLORS } from "@/data/catalog";
import { ORDERS } from "@/data/orders";
import { orderTotalVnd } from "@/lib/orders";
import { LOW_STOCK_AT } from "@/lib/inventory";
import { demoNow } from "@/lib/clock";

/**
 * Every issue the shop has run, and one of them open underneath.
 *
 * The detail sits BELOW the table rather than on a screen of its own — the
 * same shape the shopper's order list uses, so the row somebody clicked
 * stays visible while they read it. `/admin/drops/[no]` is the same screen
 * with a different row selected, which is why both routes render this.
 *
 * The figures are derived end to end — styles, units cut, units sold and
 * revenue all come out of `CATALOG` plus whatever this browser adjusted — so
 * this table cannot drift from what the shop itself shows. THE STATE IS
 * NEVER STORED: it is read off the two instants and the clock
 * (`lib/drop.ts`), which is why "đóng sớm" is a changed closing hour rather
 * than a fourth state, exactly as the mock's own footnote says.
 */
export function AdminDropsScreen({ no, nowIso }: { no: number | null; nowIso: string }) {
  const { sim, run } = useSim();
  const now = useSimNow(nowIso);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [closing, setClosing] = useState<number | null>(null);
  const [teasing, setTeasing] = useState<number | null>(null);

  const products = simProducts(CATALOG, sim);
  const drops = simDrops(DROPS, sim);
  const rows = simDropRows(drops, now).map((r) => ({
    ...r,
    styles: productsInDrop(r.no, products).length,
    cutUnits: dropSummary(r.no, products).cutUnits,
    soldUnits: dropSummary(r.no, products).soldUnits,
    onHand: dropSummary(r.no, products).onHand,
    revenueVnd: dropRevenueVnd(r.no, products),
  }));
  const newNo = nextDropNo(drops);

  /** Which issue is open below: the one asked for, else the one selling. */
  const openNo =
    no ??
    drops.find((d) => dropState(d, now) === "OPEN")?.no ??
    drops[0]?.no ??
    null;
  const drop = drops.find((d) => d.no === openNo);

  return (
    <>
      <AdminTop
        title={LEX.adm}
        sub="Trạng thái suy từ giờ mở và giờ đóng, không có cờ bật tắt"
      >
        <Button tone="sm" icon="plus" onClick={() => setCreating(true)}>
          Tạo {LEX.tl}
        </Button>
      </AdminTop>

      <div className="dt3">
        <table>
          <thead>
            <tr>
              <th>{LEX.t}</th>
              <th>Trạng thái</th>
              <th>Mở</th>
              <th>Đóng</th>
              <th className="right">Mẫu</th>
              <th className="right">Đã cắt</th>
              <th className="right">Đã bán</th>
              <th className="right">Doanh thu</th>
              <th style={{ width: 44 }}>
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const percent =
                r.cutUnits === 0 ? 0 : Math.round((r.soldUnits / r.cutUnits) * 100);
              const teasers = simTeasers(TEASERS, sim).filter((t) => t.dropNo === r.no).length;
              return (
                <tr key={r.no} className={r.no === openNo ? "on" : undefined}>
                  <td>
                    <b>
                      <Link href={`/admin/drops/${issueNo(r.no)}#detail`} scroll={false}>
                        {issueNo(r.no)}
                      </Link>
                    </b>
                  </td>
                  <td>
                    <Badge
                      tone={r.state === "OPEN" ? "ok" : r.state === "UPCOMING" ? "info" : "shut"}
                    >
                      {r.state === "OPEN" ? "Đang bán" : DROP_STATE_LABEL[r.state]}
                    </Badge>
                    {(r.simulated || r.rescheduled) && <span className="sub">{SIM_SUFFIX}</span>}
                  </td>
                  <td className="nw">
                    {clockLabel(drops.find((d) => d.no === r.no)!.opensAt)} ·{" "}
                    {dayMonth(drops.find((d) => d.no === r.no)!.opensAt)}
                  </td>
                  <td className="nw">
                    {clockLabel(drops.find((d) => d.no === r.no)!.closesAt)} ·{" "}
                    {dayMonth(drops.find((d) => d.no === r.no)!.closesAt)}
                  </td>
                  <td className="right">
                    {r.styles > 0 ? r.styles : teasers > 0 ? `${teasers} hé lộ` : "—"}
                  </td>
                  <td className="right">{r.cutUnits > 0 ? r.cutUnits : "—"}</td>
                  <td className="right">
                    {r.cutUnits > 0 ? `${r.soldUnits} · ${percent}%` : "—"}
                  </td>
                  <td className="right">{r.revenueVnd > 0 ? plainVnd(r.revenueVnd) : "—"}</td>
                  <td>
                    <ActionMenu
                      label={`Thao tác ${issueLabel(r.no)}`}
                      items={[
                        {
                          label: "Mở chi tiết",
                          icon: "eye",
                          href: `/admin/drops/${issueNo(r.no)}#detail`,
                        },
                        {
                          label: "Tải CSV",
                          icon: "export",
                          onRun: () => downloadIssueCsv(r.no, products),
                        },
                        ...(r.state === "OPEN"
                          ? [
                              {
                                label: "Đóng sớm",
                                icon: "clock" as const,
                                onRun: () => setClosing(r.no),
                              },
                            ]
                          : []),
                        ...(r.state === "UPCOMING"
                          ? [
                              {
                                label: "Sửa giờ",
                                icon: "calendar" as const,
                                onRun: () => setEditing(r.no),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {drop && (
        <IssueDetail
          no={drop.no}
          nowIso={nowIso}
          products={products}
          opensAt={drop.opensAt}
          closesAt={drop.closesAt}
          teasers={simTeasers(TEASERS, sim).filter((t) => t.dropNo === drop.no + 1)}
          onClose={() => setClosing(drop.no)}
          onTease={() => setTeasing(drop.no + 1)}
          simTeaser={(slug) => isSimTeaser(slug, sim)}
        />
      )}

      <DropFormModal
        open={creating}
        onClose={() => setCreating(false)}
        mode="create"
        no={newNo}
        opensAt={defaultOpening(nowIso)}
        closesAt={defaultClosing(nowIso)}
        onConfirm={(opensAt, closesAt) => {
          run(
            { kind: "DROP_ADDED", no: newNo, opensAt, closesAt },
            `Đã tạo ${LEX.tl} ${issueNo(newNo)} (sắp mở) · ghi nhật ký`,
          );
          setCreating(false);
        }}
      />

      <DropFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        mode="edit"
        no={editing ?? 0}
        opensAt={drops.find((d) => d.no === editing)?.opensAt ?? nowIso}
        closesAt={drops.find((d) => d.no === editing)?.closesAt ?? nowIso}
        onConfirm={(opensAt, closesAt) => {
          if (editing === null) return;
          run(
            { kind: "DROP_SCHEDULED", no: editing, opensAt, closesAt },
            `${issueLabel(editing)}: lịch đổi thành ${dayMonthYear(opensAt)} → ${dayMonthYear(closesAt)}`,
          );
          setEditing(null);
        }}
      />

      <AdminSheet
        open={closing !== null}
        onClose={() => setClosing(null)}
        title={`Đóng ${LEX.tl} ${issueNo(closing ?? 0)} sớm?`}
        sub={
          closing !== null && (
            <>
              Giờ đóng đổi từ {dateTimeLabel(drops.find((d) => d.no === closing)?.closesAt ?? "")}{" "}
              thành bây giờ. {dropSummary(closing, products).onHand} chiếc còn lại rời kệ; đơn đã
              đặt không bị ảnh hưởng. Cùng một cơ chế, không phải một trạng thái thứ tư.
            </>
          )
        }
        footer={
          <>
            <Button tone="ink sm" icon="back" onClick={() => setClosing(null)}>
              Giữ lịch
            </Button>
            <Button
              tone="sm"
              icon="clock"
              onClick={() => {
                if (closing === null) return;
                const d = drops.find((x) => x.no === closing);
                if (!d) return;
                run(
                  {
                    kind: "DROP_SCHEDULED",
                    no: closing,
                    opensAt: d.opensAt,
                    closesAt: toVnIso(demoNow()),
                  },
                  `Đã đóng ${LEX.tl} ${issueNo(closing)} lúc ${dateTimeLabel(toVnIso(demoNow()))} · ghi nhật ký`,
                );
                setClosing(null);
              }}
            >
              Đóng bây giờ
            </Button>
          </>
        }
      />

      <TeaserFormSheet
        open={teasing !== null}
        no={teasing ?? 0}
        onClose={() => setTeasing(null)}
        onConfirm={(action) => {
          run(action, `Đã thêm mẫu hé lộ ${action.name} · ghi nhật ký`);
          setTeasing(null);
        }}
      />
    </>
  );
}

/** One issue, style by style, under the table it was chosen from. */
function IssueDetail({
  no,
  nowIso,
  products,
  opensAt,
  closesAt,
  teasers,
  onClose,
  onTease,
  simTeaser,
}: {
  no: number;
  nowIso: string;
  products: typeof CATALOG;
  opensAt: string;
  closesAt: string;
  teasers: typeof TEASERS;
  onClose: () => void;
  onTease: () => void;
  /** Whether this teaser was announced in this browser rather than shipped. */
  simTeaser: (slug: string) => boolean;
}) {
  const now = new Date(nowIso);
  const state = dropState({ no, opensAt, closesAt }, now);
  const summary = dropSummary(no, products);
  const styles = productsInDrop(no, products).sort(
    (a, b) => soldUnits(b) - soldUnits(a) || a.name.localeCompare(b.name, "vi"),
  );
  const revenue = dropRevenueVnd(no, products);
  const soldPercent =
    summary.cutUnits === 0 ? 0 : Math.round((summary.soldUnits / summary.cutUnits) * 100);
  const alerts = stockAlerts(no, products);
  const gone = alerts.filter((a) => a.left === 0);
  const low = alerts.filter((a) => a.left > 0);
  /**
   * The orders in the SAMPLE that carry a style from this issue.
   *
   * `data/orders.ts` is twenty-four recent orders, not the ledger the 108
   * units sold imply, so this count and the revenue beside it come from
   * different places on purpose: revenue is arithmetic over the catalogue
   * (price × gone), this is a count of rows that really exist. Each KPI says
   * which, because averaging one by the other would invent an order value.
   */
  const issueOrders = ORDERS.filter((o) =>
    o.lines.some((l) => products.find((p) => p.id === l.productId)?.dropNo === no),
  );
  const booked = issueOrders.filter((o) =>
    ["PAID", "SHIPPING", "DELIVERED"].includes(o.status.state),
  );
  const orderCount = issueOrders.length;
  const averageVnd =
    booked.length === 0
      ? 0
      : Math.round(booked.reduce((n, o) => n + orderTotalVnd(o), 0) / booked.length);
  // When the shelf emptied, preferring what the orders can prove over what
  // the shop wrote down, and printing nothing when neither can say.
  const soldOut = soldOutTimes(styles, ORDERS, closesAt).filter((r) => isSoldOut(r.product));

  return (
    <section className="detail3" id="detail">
      <div className="hd">
        <h2>{issueLabel(no)}</h2>
        <span className="meta">
          {state === "OPEN"
            ? `đang bán · ${closesInLabel(closesAt, now).replace("đóng sau ", "")}`
            : state === "UPCOMING"
              ? opensInLabel(opensAt, now)
              : `đã đóng ${dayMonthYear(closesAt)}`}
        </span>
        <span className="acts">
          <Button tone="ink sm" icon="export" onClick={() => downloadIssueCsv(no, products)}>
            Tải CSV {LEX.tl} này
          </Button>
          {state === "OPEN" && (
            <Button tone="ink sm" icon="clock" onClick={onClose}>
              Đóng sớm
            </Button>
          )}
          {state === "CLOSED" && (
            <Link className="btn ink sm" href={`/so/${no}`}>
              Xem sổ {LEX.tl} {issueNo(no)}
            </Link>
          )}
        </span>
      </div>

      {summary.styles === 0 ? (
        <div className="dt3">
          <p className="none">
            {LEX.t} này chưa có mẫu nào. Mẫu, giá và số cắt được thêm ở Mẫu; số liệu xuất hiện ngay
            sau đó.
          </p>
        </div>
      ) : (
        <>
          <div className="kpis3 five">
            <div className="kpi3">
              <span className="k">Doanh thu</span>
              <b>{compactVnd(revenue)}</b>
              {vnd(revenue)} · theo giá niêm yết
            </div>
            <div className="kpi3">
              <span className="k">Đơn trong dữ liệu mẫu</span>
              <b>{orderCount}</b>
              {booked.length > 0
                ? `trung bình ${vnd(averageVnd)} mỗi đơn đã thanh toán`
                : "chưa có đơn đã thanh toán nào"}
            </div>
            <div className="kpi3">
              <span className="k">Đã bán</span>
              <b>
                {summary.soldUnits} / {summary.cutUnits}
              </b>
              {soldPercent}% · còn {summary.onHand}
              <div className="meter" aria-hidden="true">
                <i style={{ width: `${soldPercent}%` }} />
              </div>
            </div>
            <div className="kpi3">
              <span className="k">Hết hàng</span>
              <b>
                {gone.length} / {summary.styles}
              </b>
              {soldOut.length > 0
                ? soldOut
                    .map(
                      (r) =>
                        `${r.product.name}${r.soldOutAt ? ` · hết ${dayMonth(r.soldOutAt)}` : ""}`,
                    )
                    .join(" · ")
                : "chưa mẫu nào bán hết"}
            </div>
            <div className="kpi3">
              <span className="k">Còn dưới {LOW_STOCK_AT + 1} chiếc</span>
              <b>{low.length} mẫu</b>
              {low.length > 0
                ? low.map((a) => `${a.product.name} còn ${a.left}`).join(" · ")
                : "chưa mẫu nào xuống thấp"}
            </div>
          </div>

          <div className="dt3">
            <table>
              <thead>
                <tr>
                  <th>Mẫu</th>
                  <th>Loại</th>
                  <th className="right">Giá</th>
                  <th className="right">Đã cắt</th>
                  <th>Đã bán / còn</th>
                  <th>Size hết</th>
                  <th className="right">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {styles.map((p) => {
                  const sold = soldUnits(p);
                  const left = onHand(p);
                  const percent = p.cutUnits === 0 ? 0 : Math.round((sold / p.cutUnits) * 100);
                  const out = soldOutSizes(p);
                  return (
                    <tr key={p.id}>
                      <td>
                        <b className="nm">{p.name}</b>
                      </td>
                      <td>{p.kind}</td>
                      <td className="right">{plainVnd(p.priceVnd)}</td>
                      <td className="right">{p.cutUnits}</td>
                      <td>
                        <div className="cellmeter">
                          <div
                            className={
                              left === 0 ? "meter gone" : percent >= 85 ? "meter hot" : "meter"
                            }
                            aria-hidden="true"
                          >
                            <i style={{ width: `${percent}%` }} />
                          </div>
                          <span>
                            {sold} · {left === 0 ? "hết" : `còn ${left}`}
                          </span>
                        </div>
                      </td>
                      <td>{out.length === SIZES.length ? "tất cả" : out.join(" · ") || "—"}</td>
                      <td className="right">{plainVnd(p.priceVnd * sold)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="foot">
              <span>
                {summary.styles} mẫu · {summary.cutUnits} đã cắt · {summary.soldUnits} đã bán ·
                doanh thu theo giá niêm yết, chưa trừ mã giảm giá
              </span>
            </div>
          </div>

          <section className="panel3" style={{ marginTop: 16 }}>
            <h2>
              {issueLabel(no + 1)} · mẫu hé lộ
              <span className="meta">hiện ở trang chủ từ giờ tới khi mở</span>
            </h2>
            <div className="bd teasers">
              {teasers.length === 0 ? (
                <p className="none" style={{ padding: 0 }}>
                  Chưa hé lộ mẫu nào cho {LEX.tl} {issueNo(no + 1)}.
                </p>
              ) : (
                teasers.map((t) => (
                  <div className="t" key={t.slug}>
                    <Image src={photoUrl(t.photoKey, 120)} alt="" width={44} height={55} />
                    <div>
                      <b>{t.name}</b>
                      <div className="sub">
                        {t.kind} · giá công bố khi mở
                        {simTeaser(t.slug) ? ` · ${SIM_SUFFIX}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <Button tone="ink sm" icon="plus" onClick={onTease}>
                Thêm mẫu hé lộ
              </Button>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

/**
 * One issue as a spreadsheet: a row per style, colour and size.
 *
 * The three style-level figures repeat down the rows, and their headers say
 * so — a flat file has no other way to carry two levels, and silently
 * printing a style's revenue against one size would read as that size's.
 */
function downloadIssueCsv(no: number, products: typeof CATALOG) {
  const rows: Array<Array<string | number>> = [
    [
      "Mẫu",
      "Loại",
      "Màu",
      "Size",
      "Còn (size × màu)",
      "Đã cắt (mẫu)",
      "Đã bán (mẫu)",
      "Doanh thu mẫu (VND)",
    ],
  ];
  for (const p of productsInDrop(no, products)) {
    for (const color of p.colors) {
      for (const size of SIZES) {
        rows.push([
          p.name,
          p.kind,
          COLORS[color].label,
          size,
          onHandOf(p, color, size),
          p.cutUnits,
          soldUnits(p),
          p.priceVnd * soldUnits(p),
        ]);
      }
    }
  }
  downloadCsv(`so-${issueNo(no)}.csv`, rows);
}

/** A new issue opens a week out by default — a date, not a claim. */
function defaultOpening(nowIso: string): string {
  return atDay(nowIso, 7);
}

function defaultClosing(nowIso: string): string {
  return atDay(nowIso, 7 + dropLengthDays());
}

/** The shop's own opening hour, read off the issues it has already run. */
function atDay(nowIso: string, plusDays: number): string {
  return atDropHour(
    toVnIso(new Date(Date.parse(nowIso) + plusDays * 86_400_000)).slice(0, 10),
  );
}
