"use client";

import { useState } from "react";
import { AdminTop } from "@/components/admin/AdminTop";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { PromoFormSheet, type PromoDraft } from "@/components/admin/PromoFormSheet";
import { useSim, useSimNow } from "@/components/admin/SimContext";
import { ActionMenu, Stabs } from "@/components/admin/Table3";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Promotion } from "@/data/types";
import { PROMO_KIND_LABEL, SIM_SUFFIX, promoState, promoValueLabel } from "@/lib/admin-rows";
import { simPromotions, type SimPromotion } from "@/lib/admin-sim";
import type { Query } from "@/lib/admin-url";
import { clockLabel, dayMonth, dayMonthYear, toVnIso } from "@/lib/datetime";
import { dropState } from "@/lib/drop";
import { LEX, issueNo } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { demoNow } from "@/lib/clock";

const PATH = "/admin/promotions";

/** How many uses "Nâng giới hạn" adds. One decision, one number. */
const RAISE_BY = 50;

type Standing = "LIVE" | "UPCOMING" | "PAUSED" | "ENDED" | "USED_UP";

const STANDING: Record<Standing, { label: string; tone: BadgeTone }> = {
  LIVE: { label: "Đang chạy", tone: "ok" },
  UPCOMING: { label: "Sắp chạy", tone: "info" },
  PAUSED: { label: "Tạm dừng", tone: "shut" },
  ENDED: { label: "Hết hạn", tone: "shut" },
  USED_UP: { label: "Hết lượt", tone: "hot" },
};

const TABS: Array<{ value: Standing | null; label: string }> = [
  { value: null, label: "Tất cả" },
  { value: "LIVE", label: STANDING.LIVE.label },
  { value: "UPCOMING", label: STANDING.UPCOMING.label },
  { value: "PAUSED", label: STANDING.PAUSED.label },
  { value: "ENDED", label: STANDING.ENDED.label },
  { value: "USED_UP", label: STANDING.USED_UP.label },
];

/**
 * Which of the five things a code is doing right now.
 *
 * Pausing is the only one that is not derived from the clock, and it wins:
 * a paused code is being refused at checkout whatever its dates say, and
 * hiding that behind "Đang chạy" would be the table contradicting the button
 * somebody just pressed. Everything else falls out of the window and the cap
 * (`promoState`), so ending a run early needs no flag — the closing hour
 * moves and the row follows.
 */
function standingOf(row: SimPromotion, now: Date): Standing {
  const state = promoState(row.promo, now);
  if (row.paused && state === "LIVE") return "PAUSED";
  return state === "LIVE"
    ? "LIVE"
    : state === "UPCOMING"
      ? "UPCOMING"
      : state === "USED_UP"
        ? "USED_UP"
        : "ENDED";
}

/**
 * The discount codes, and the six things an operator does to one.
 *
 * `usedCount` is the one figure on this screen that is a stored fixture
 * value rather than something derived — nothing in this build records a
 * redemption, so it could not be counted from anywhere. The line under the
 * title says so, and `data/promotions.ts` says it again.
 *
 * Every action here is real state on this browser: the badge changes, the
 * tab counts change, it survives a reload, the sidebar counts it and the
 * activity log gains a line. What it does not do is reach a server, because
 * there is none.
 */
export function AdminPromotionsScreen({ nowIso, query }: { nowIso: string; query: Query }) {
  const catalog = useCatalog();
  const { sim, run } = useSim();
  const now = useSimNow(nowIso);
  const [editing, setEditing] = useState<SimPromotion | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = simPromotions(catalog.promotions, sim).map((r) => ({
    row: r,
    standing: standingOf(r, now),
  }));
  const tab = (query.state as Standing | undefined) ?? null;
  const shown = tab ? rows.filter((r) => r.standing === tab) : rows;

  const counts = (s: Standing) => rows.filter((r) => r.standing === s).length;
  const summary = (["LIVE", "PAUSED", "ENDED", "USED_UP"] as Standing[])
    .filter((s) => counts(s) > 0)
    .map((s) => `${counts(s)} ${STANDING[s].label.toLocaleLowerCase("vi")}`)
    .join(" · ");

  /** The issue a copy of a code would run with: the next one not yet open. */
  const nextIssue = [...catalog.drops]
    .sort((a, b) => a.no - b.no)
    .find((d) => dropState(d, now) === "UPCOMING");

  const duplicateOf = (p: Promotion) =>
    nextIssue
      ? {
          code: `SO${issueNo(nextIssue.no)}`,
          startsAt: nextIssue.opensAt,
          endsAt: nextIssue.closesAt,
          label: `${LEX.tl} ${issueNo(nextIssue.no)}`,
        }
      : {
          code: `${p.code}-2`,
          startsAt: p.startsAt,
          endsAt: p.endsAt,
          label: "cùng khoảng thời gian",
        };

  const csvRows = [
    ["Mã", "Loại", "Giảm", "Điều kiện", "Bắt đầu", "Kết thúc", "Đã dùng", "Giới hạn", "Trạng thái"],
    ...rows.map(({ row, standing }) => [
      String(row.promo.code),
      PROMO_KIND_LABEL[row.promo.kind],
      promoValueLabel(row.promo),
      row.promo.minOrderVnd ? `Đơn từ ${row.promo.minOrderVnd}` : "—",
      dayMonthYear(row.promo.startsAt),
      dayMonthYear(row.promo.endsAt),
      row.promo.usedCount,
      row.promo.usageLimit ?? "không giới hạn",
      STANDING[standing].label,
    ]),
  ];

  return (
    <>
      <AdminTop
        title="Mã giảm giá"
        sub={`${summary} · số lượt đã dùng là dữ liệu mô phỏng`}
      >
        <ExportCsvButton label="Tải CSV" filename="ma-giam-gia.csv" rows={csvRows} />
        <Button tone="sm" icon="plus" onClick={() => setCreating(true)}>
          Tạo mã
        </Button>
      </AdminTop>

      <div className="dt3">
        <Stabs
          label="Trạng thái"
          param="state"
          active={tab}
          path={PATH}
          query={query}
          tabs={TABS.map((t) => ({
            value: t.value,
            label: t.label,
            count: t.value ? counts(t.value) : rows.length,
          }))}
        />
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Giảm</th>
              <th>Điều kiện</th>
              <th>Hiệu lực</th>
              <th>Lượt</th>
              <th>Trạng thái</th>
              <th style={{ width: 44 }}>
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ row, standing }) => {
              const p = row.promo;
              const code = String(p.code);
              const percent =
                p.usageLimit === null || p.usageLimit === 0
                  ? null
                  : Math.min(100, Math.round((p.usedCount / p.usageLimit) * 100));
              const live = standing === "LIVE";
              return (
                <tr key={code} className={live || standing === "UPCOMING" ? undefined : "paused"}>
                  <td>
                    <b className="nm" style={{ letterSpacing: ".04em" }}>
                      {code}
                    </b>
                    {(row.simulated || row.edited) && <span className="sub">{SIM_SUFFIX}</span>}
                  </td>
                  <td>{promoValueLabel(p)}</td>
                  <td>{p.minOrderVnd ? `Đơn từ ${vnd(p.minOrderVnd)}` : "Không điều kiện"}</td>
                  <td className="nw">{windowLabel(p)}</td>
                  <td>
                    {percent === null ? (
                      `${p.usedCount} · không giới hạn`
                    ) : (
                      <div className="cellmeter">
                        <div
                          className={percent >= 100 ? "meter gone" : "meter"}
                          aria-hidden="true"
                        >
                          <i style={{ width: `${percent}%` }} />
                        </div>
                        <span>
                          {p.usedCount} / {p.usageLimit}
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    <Badge tone={STANDING[standing].tone}>{STANDING[standing].label}</Badge>
                  </td>
                  <td>
                    <ActionMenu
                      label={`Thao tác ${code}`}
                      items={[
                        {
                          label: "Sửa",
                          icon: "edit",
                          onRun: () => setEditing(row),
                        },
                        ...(p.usageLimit !== null
                          ? [
                              {
                                label: `Nâng giới hạn thêm ${RAISE_BY}`,
                                icon: "plus" as const,
                                onRun: () =>
                                  run(
                                    {
                                      kind: "PROMO_LIMIT_RAISED",
                                      code,
                                      before: p.usageLimit!,
                                      after: p.usageLimit! + RAISE_BY,
                                    },
                                    `${code}: giới hạn ${p.usageLimit} → ${p.usageLimit! + RAISE_BY} lượt · ghi nhật ký`,
                                  ),
                              },
                            ]
                          : []),
                        {
                          label: "Nhân bản",
                          icon: "doc",
                          onRun: () => setEditing(row),
                        },
                        {
                          label: row.paused ? "Tiếp tục" : "Tạm dừng",
                          icon: row.paused ? "check" : "clock",
                          onRun: () =>
                            run(
                              { kind: "PROMO_PAUSED", code, paused: !row.paused },
                              row.paused
                                ? `${code} chạy lại · trang thanh toán nhận mã từ giờ`
                                : `${code} đã tạm dừng · trang thanh toán từ chối từ giờ`,
                            ),
                        },
                        ...(live
                          ? [
                              {
                                label: "Kết thúc sớm",
                                icon: "x" as const,
                                danger: true,
                                rule: true,
                                onRun: () =>
                                  run(
                                    { kind: "PROMO_ENDED", code, endsAt: toVnIso(demoNow()) },
                                    `Đã kết thúc sớm ${code} · giờ kết thúc = bây giờ · ghi nhật ký`,
                                  ),
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
        {shown.length === 0 ? (
          <p className="none">Không có mã nào trong nhóm này.</p>
        ) : (
          <div className="foot">
            <span>
              Hết lượt: mã còn hạn nhưng đã dùng hết số lượt, trang thanh toán đang từ chối mã này.
            </span>
          </div>
        )}
      </div>

      <PromoFormSheet
        open={editing !== null}
        promo={editing?.promo ?? null}
        standing={
          editing
            ? `${STANDING[standingOf(editing, now)].label} · ${editing.promo.usedCount}${
                editing.promo.usageLimit === null ? "" : ` / ${editing.promo.usageLimit}`
              } lượt`
            : undefined
        }
        taken={rows.map((r) => String(r.row.promo.code))}
        duplicate={editing ? duplicateOf(editing.promo) : undefined}
        onClose={() => setEditing(null)}
        onSave={(d) => {
          if (!editing) return;
          run(
            { kind: "PROMO_EDITED", code: String(editing.promo.code), nextCode: d.code, ...terms(d) },
            `Đã lưu ${d.code} · ghi nhật ký`,
          );
          setEditing(null);
        }}
        onDuplicate={(d) => {
          run({ kind: "PROMO_ADDED", ...d }, `Đã nhân bản thành ${d.code} · ghi nhật ký`);
          setEditing(null);
        }}
      />

      <PromoFormSheet
        open={creating}
        promo={null}
        taken={rows.map((r) => String(r.row.promo.code))}
        onClose={() => setCreating(false)}
        onSave={(d) => {
          run({ kind: "PROMO_ADDED", ...d }, `Đã tạo mã ${d.code} · ghi nhật ký`);
          setCreating(false);
        }}
      />
    </>
  );
}

/** Everything a `PROMO_EDITED` carries beyond the code it is keyed on. */
function terms(d: PromoDraft) {
  return {
    promoKind: d.promoKind,
    percent: d.percent,
    amountVnd: d.amountVnd,
    maxDiscountVnd: d.maxDiscountVnd,
    minOrderVnd: d.minOrderVnd,
    usageLimit: d.usageLimit,
    startsAt: d.startsAt,
    endsAt: d.endsAt,
  };
}

/**
 * "11/09 → 25/09", or the hours when a code lives inside one day.
 *
 * A two-hour opening promotion and a fortnight-long one are different offers,
 * and printing both as "11/09 → 11/09" would hide the one that matters.
 */
function windowLabel(p: Promotion): string {
  const sameDay = p.startsAt.slice(0, 10) === p.endsAt.slice(0, 10);
  return sameDay
    ? `${dayMonth(p.startsAt)} ${clockLabel(p.startsAt)} → ${clockLabel(p.endsAt)}`
    : `${dayMonth(p.startsAt)} → ${dayMonth(p.endsAt)}`;
}
