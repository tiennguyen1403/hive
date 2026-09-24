"use client";

import { useMemo, useState, useTransition } from "react";
import { AdminTop } from "@/components/admin/AdminTop";
import { useAdminToast } from "@/components/admin/AdminToast";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { PromoFormSheet } from "@/components/admin/PromoFormSheet";
import { ActionMenu, Stabs } from "@/components/admin/Table3";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Promotion } from "@/data/types";
import {
  addPromo,
  editPromo,
  endPromo,
  pausePromo,
  raisePromoLimit,
} from "@/lib/actions/catalog-admin";
import type { ActionState } from "@/lib/actions/state";
import { PROMO_KIND_LABEL, promoState, promoValueLabel, type PromoState } from "@/lib/admin-rows";
import type { Query } from "@/lib/admin-url";
import { clockLabel, dayMonth, dayMonthYear } from "@/lib/datetime";
import { dropState } from "@/lib/drop";
import { LEX, issueNo } from "@/lib/lexicon";
import { vnd } from "@/lib/money";

const PATH = "/admin/promotions";

/** How many uses "Nâng giới hạn" adds. One decision, one number. */
const RAISE_BY = 50;

type Standing = PromoState;

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
 * The discount codes, and the six things an operator does to one.
 *
 * Which of the five things a code is doing is `promoState` (`lib/admin-rows.ts`):
 * pausing is the only one not read off the clock, and it shows over what
 * would otherwise be "Đang chạy" — a paused code is being refused at
 * checkout whatever its dates say. Everything else falls out of the window
 * and the cap, so ending a run early needs no flag — the closing hour moves
 * and the row follows.
 *
 * `usedCount` is the one figure on this screen that is not derived here: the
 * sample codes carry the counts the fixture gave them, and every order placed
 * since spends one more use in the same transaction (`place_order()`). The
 * line under the title says so.
 *
 * Since slice B3b every action here is a row of `public.promotions` and an
 * event in the log: "Tạo mã" and "Nhân bản" are `admin_add_promo()`, "Sửa" is
 * `admin_edit_promo()` — the code itself never changes, so its box is
 * read-only when editing — "Tạm dừng"/"Tiếp tục", "Nâng giới hạn" and "Kết
 * thúc sớm" each have their own function. Checkout reads the same table.
 */
export function AdminPromotionsScreen({ nowIso, query }: { nowIso: string; query: Query }) {
  const catalog = useCatalog();
  const say = useAdminToast();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startAction] = useTransition();

  /**
   * Run one Server Action and say what the server answered. The action
   * revalidates everything, so the response that answers it already carries
   * the new table. After an `await` the transition has to be restated
   * (react.dev/reference/react/useTransition).
   */
  function act(call: () => Promise<ActionState>, after?: () => void) {
    if (pending) return;
    startAction(async () => {
      const result = await call();
      startAction(() => {
        if (result.ok) after?.();
        say(result.message ?? result.errors.form ?? "", result.ok ? "ok" : "error");
      });
    });
  }

  const rows = catalog.promotions.map((promo) => ({ promo, standing: promoState(promo, now) }));
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
    ...rows.map(({ promo, standing }) => [
      String(promo.code),
      PROMO_KIND_LABEL[promo.kind],
      promoValueLabel(promo),
      promo.minOrderVnd ? `Đơn từ ${promo.minOrderVnd}` : "—",
      dayMonthYear(promo.startsAt),
      dayMonthYear(promo.endsAt),
      promo.usedCount,
      promo.usageLimit ?? "không giới hạn",
      STANDING[standing].label,
    ]),
  ];

  const taken = rows.map((r) => String(r.promo.code));

  return (
    <>
      <AdminTop title="Mã giảm giá" sub={`${summary} · số lượt đã dùng gồm cả dữ liệu mẫu`}>
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
            {shown.map(({ promo: p, standing }) => {
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
                          onRun: () => setEditing(p),
                        },
                        ...(p.usageLimit !== null
                          ? [
                              {
                                label: `Nâng giới hạn thêm ${RAISE_BY}`,
                                icon: "plus" as const,
                                onRun: () => act(() => raisePromoLimit(code, p.usageLimit! + RAISE_BY)),
                              },
                            ]
                          : []),
                        {
                          label: "Nhân bản",
                          icon: "doc",
                          onRun: () => setEditing(p),
                        },
                        {
                          label: p.paused ? "Tiếp tục" : "Tạm dừng",
                          icon: p.paused ? "check" : "clock",
                          onRun: () => act(() => pausePromo(code, !p.paused)),
                        },
                        ...(live
                          ? [
                              {
                                label: "Kết thúc sớm",
                                icon: "x" as const,
                                danger: true,
                                rule: true,
                                onRun: () => act(() => endPromo(code)),
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
        pending={pending}
        promo={editing}
        standing={
          editing
            ? `${STANDING[promoState(editing, now)].label} · ${editing.usedCount}${
                editing.usageLimit === null ? "" : ` / ${editing.usageLimit}`
              } lượt`
            : undefined
        }
        taken={taken}
        duplicate={editing ? duplicateOf(editing) : undefined}
        onClose={() => {
          if (!pending) setEditing(null);
        }}
        onSave={(d) => {
          if (!editing) return;
          const code = String(editing.code);
          act(
            () => editPromo(code, d),
            () => setEditing(null),
          );
        }}
        onDuplicate={(d) => {
          if (!editing) return;
          const from = String(editing.code);
          act(
            () => addPromo(d, from),
            () => setEditing(null),
          );
        }}
      />

      <PromoFormSheet
        open={creating}
        pending={pending}
        promo={null}
        taken={taken}
        onClose={() => {
          if (!pending) setCreating(false);
        }}
        onSave={(d) =>
          act(
            () => addPromo(d),
            () => setCreating(false),
          )
        }
      />
    </>
  );
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
