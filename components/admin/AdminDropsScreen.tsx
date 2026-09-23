"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AdminSheet } from "@/components/admin/AdminSheet";
import { AdminTop } from "@/components/admin/AdminTop";
import { useAdminToast } from "@/components/admin/AdminToast";
import { DropFormModal, atDropHour, dropLengthDays } from "@/components/admin/DropFormModal";
import { TeaserFormSheet } from "@/components/admin/TeaserFormSheet";
import { ActionMenu } from "@/components/admin/Table3";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SIZES, type Product, type Teaser } from "@/data/types";
import { teasersIn, type Catalog } from "@/lib/catalog";
import { addDrop, addTeaser, closeDropNow, scheduleDrop } from "@/lib/actions/catalog-admin";
import type { ActionState } from "@/lib/actions/state";
import { stockAlerts } from "@/lib/admin-metrics";
import { DROP_STATE_LABEL, dropRows } from "@/lib/admin-rows";
import { nextDropNo } from "@/lib/catalog-admin";
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
import { COLORS } from "@/data/colors";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { AdminOrder } from "@/lib/admin-orders";
import { orderTotalVnd } from "@/lib/orders";
import { LOW_STOCK_AT } from "@/lib/inventory";

/**
 * Every issue the shop has run, and one of them open underneath.
 *
 * The detail sits BELOW the table rather than on a screen of its own — the
 * same shape the shopper's order list uses, so the row somebody clicked
 * stays visible while they read it. `/admin/drops/[no]` is the same screen
 * with a different row selected, which is why both routes render this.
 *
 * The figures are derived end to end — styles, units cut, units sold and
 * revenue all come out of the catalogue the database holds — so this table
 * cannot drift from what the shop itself shows. THE STATE IS NEVER STORED:
 * it is read off the two instants and the clock (`lib/drop.ts`), which is
 * why "đóng sớm" is a changed closing hour rather than a fourth state,
 * exactly as the mock's own footnote says.
 *
 * Since slice B3b every button here writes Postgres: "Tạo số" is
 * `admin_add_drop()`, "Sửa giờ" and "Đóng sớm" are `admin_schedule_drop()`,
 * "Thêm mẫu hé lộ" is `admin_add_teaser()`. "Sửa giờ" is offered on every
 * issue, whatever its state — the function moves any issue's two instants,
 * and it is also how an issue closed early opens again.
 */
export function AdminDropsScreen({
  no,
  nowIso,
  orders,
}: {
  no: number | null;
  nowIso: string;
  /**
   * The order book, from the database since slice B3a: what an issue's
   * order count and its sold-out hours are read from.
   */
  orders: AdminOrder[];
}) {
  const catalog = useCatalog();
  const say = useAdminToast();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [closing, setClosing] = useState<number | null>(null);
  const [teasing, setTeasing] = useState<number | null>(null);
  const [pending, startAction] = useTransition();

  /**
   * Run one Server Action and say what the server answered. The action
   * revalidates everything, so the response that answers it already carries
   * the new table. After an `await` the transition has to be restated
   * (react.dev/reference/react/useTransition).
   */
  function act(call: () => Promise<ActionState>, after: () => void) {
    if (pending) return;
    startAction(async () => {
      const result = await call();
      startAction(() => {
        if (result.ok) after();
        say(result.message ?? result.errors.form ?? "");
      });
    });
  }

  const products = catalog.products;
  // Newest number first, the order the table reads in.
  const drops = [...catalog.drops].sort((a, b) => b.no - a.no);
  const rows = dropRows(catalog, drops, now);
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
              const teasers = r.teasers;
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
                          onRun: () => downloadIssueCsv(catalog, r.no, products),
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
                        {
                          label: "Sửa giờ",
                          icon: "calendar" as const,
                          onRun: () => setEditing(r.no),
                        },
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
          orders={orders}
          products={products}
          opensAt={drop.opensAt}
          closesAt={drop.closesAt}
          teasers={teasersIn(catalog, drop.no + 1)}
          canTease={catalog.dropByNo.has(drop.no + 1)}
          onClose={() => setClosing(drop.no)}
          onTease={() => setTeasing(drop.no + 1)}
        />
      )}

      <DropFormModal
        open={creating}
        pending={pending}
        onClose={() => {
          if (!pending) setCreating(false);
        }}
        mode="create"
        no={newNo}
        opensAt={defaultOpening(catalog, nowIso)}
        closesAt={defaultClosing(catalog, nowIso)}
        onConfirm={(opensAt, closesAt) =>
          act(
            () => addDrop(newNo, opensAt, closesAt),
            () => setCreating(false),
          )
        }
      />

      <DropFormModal
        open={editing !== null}
        pending={pending}
        onClose={() => {
          if (!pending) setEditing(null);
        }}
        mode="edit"
        no={editing ?? 0}
        opensAt={drops.find((d) => d.no === editing)?.opensAt ?? nowIso}
        closesAt={drops.find((d) => d.no === editing)?.closesAt ?? nowIso}
        onConfirm={(opensAt, closesAt) => {
          if (editing === null) return;
          const n = editing;
          act(
            () => scheduleDrop(n, opensAt, closesAt),
            () => setEditing(null),
          );
        }}
      />

      <AdminSheet
        open={closing !== null}
        onClose={() => {
          if (!pending) setClosing(null);
        }}
        title={`Đóng ${LEX.tl} ${issueNo(closing ?? 0)} sớm?`}
        sub={
          closing !== null && (
            <>
              Giờ đóng đổi từ {dateTimeLabel(drops.find((d) => d.no === closing)?.closesAt ?? "")}{" "}
              thành bây giờ. {dropSummary(catalog, closing, products).onHand} chiếc còn lại rời kệ; đơn đã
              đặt không bị ảnh hưởng. Cùng một cơ chế, không phải một trạng thái thứ tư.
            </>
          )
        }
        footer={
          <>
            <Button tone="ink sm" icon="back" disabled={pending} onClick={() => setClosing(null)}>
              Giữ lịch
            </Button>
            <Button
              tone="sm"
              {...(pending ? {} : { icon: "clock" as const })}
              disabled={pending}
              onClick={() => {
                if (closing === null) return;
                const n = closing;
                act(
                  () => closeDropNow(n),
                  () => setClosing(null),
                );
              }}
            >
              {pending ? "Đang lưu…" : "Đóng bây giờ"}
            </Button>
          </>
        }
      />

      <TeaserFormSheet
        open={teasing !== null}
        pending={pending}
        no={teasing ?? 0}
        onClose={() => {
          if (!pending) setTeasing(null);
        }}
        onConfirm={(draft) =>
          act(
            () => addTeaser(draft),
            () => setTeasing(null),
          )
        }
      />
    </>
  );
}

/** One issue, style by style, under the table it was chosen from. */
function IssueDetail({
  no,
  nowIso,
  orders,
  products,
  opensAt,
  closesAt,
  teasers,
  canTease,
  onClose,
  onTease,
}: {
  no: number;
  nowIso: string;
  orders: AdminOrder[];
  products: readonly Product[];
  opensAt: string;
  closesAt: string;
  teasers: Teaser[];
  /**
   * The next issue exists, so a teaser can be announced for it. When it does
   * not, "Thêm mẫu hé lộ" would be a button the database refuses — it is not
   * drawn (DESIGN.md §9 rule 3).
   */
  canTease: boolean;
  onClose: () => void;
  onTease: () => void;
}) {
  const catalog = useCatalog();
  const now = new Date(nowIso);
  const state = dropState({ no, opensAt, closesAt }, now);
  const summary = dropSummary(catalog, no, products);
  const styles = productsInDrop(catalog, no, products).sort(
    (a, b) => soldUnits(b) - soldUnits(a) || a.name.localeCompare(b.name, "vi"),
  );
  const revenue = dropRevenueVnd(catalog, no, products);
  const soldPercent =
    summary.cutUnits === 0 ? 0 : Math.round((summary.soldUnits / summary.cutUnits) * 100);
  const alerts = stockAlerts(catalog, no, products);
  const gone = alerts.filter((a) => a.left === 0);
  const low = alerts.filter((a) => a.left > 0);
  /**
   * The orders in the book that carry a style from this issue.
   *
   * The book is the sample's twenty-four recent orders plus whatever the
   * demo's visitors ordered (the database, since slice B3a) — not the ledger
   * the 108 units sold imply, so this count and the revenue beside it come
   * from different places on purpose: revenue is arithmetic over the
   * catalogue (price × gone), this is a count of rows that really exist. Each
   * KPI says which, because averaging one by the other would invent an order
   * value.
   */
  const issueOrders = orders.filter((o) =>
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
  const soldOut = soldOutTimes(styles, orders, closesAt).filter((r) => isSoldOut(r.product));

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
          <Button tone="ink sm" icon="export" onClick={() => downloadIssueCsv(catalog, no, products)}>
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
                      <div className="sub">{t.kind} · giá công bố khi mở</div>
                    </div>
                  </div>
                ))
              )}
              {canTease && (
                <Button tone="ink sm" icon="plus" onClick={onTease}>
                  Thêm mẫu hé lộ
                </Button>
              )}
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
function downloadIssueCsv(catalog: Catalog, no: number, products: readonly Product[]) {
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
  for (const p of productsInDrop(catalog, no, products)) {
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
function defaultOpening(catalog: Catalog, nowIso: string): string {
  return atDay(catalog, nowIso, 7);
}

function defaultClosing(catalog: Catalog, nowIso: string): string {
  return atDay(catalog, nowIso, 7 + dropLengthDays(catalog));
}

/** The shop's own opening hour, read off the issues it has already run. */
function atDay(catalog: Catalog, nowIso: string, plusDays: number): string {
  return atDropHour(
    catalog,
    toVnIso(new Date(Date.parse(nowIso) + plusDays * 86_400_000)).slice(0, 10),
  );
}
