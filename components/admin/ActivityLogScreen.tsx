"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { AdminTop } from "@/components/admin/AdminTop";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { SearchBox } from "@/components/admin/AdminOrdersScreen";
import { ChipMenu, ToggleChip } from "@/components/admin/Table3";
import { Empty } from "@/components/shop/Empty";
import { useCatalog } from "@/components/shop/CatalogContext";
import {
  LOG_FILTERS,
  diffText,
  inFilter,
  logFilter,
  logHaystack,
  logRows,
  logStamp,
  mergeLogRows,
  scheduleRows,
  withinDays,
} from "@/lib/activity-log";
import type { AdminOrder } from "@/lib/admin-orders";
import { hrefWith, type Query } from "@/lib/admin-url";
import type { AdminEvent } from "@/lib/db/event-dto";
import { LEX } from "@/lib/lexicon";

const PATH = "/admin/log";

/**
 * How far back "the recent past" reaches on this screen.
 *
 * Named because it is written three times — the chip, its count and the
 * line under the table — and three copies of one number is how two of them
 * end up disagreeing. It is NOT `RETURN_WINDOW_DAYS`, which happens to be
 * seven as well: that one is a promise to a shopper, this one is how much
 * log a shop looks at.
 */
const LOG_WINDOW_DAYS = 7;

/**
 * "Nhật ký thao tác" — every operation the shop can account for.
 *
 * The record is the `events` table: every move on an order — the shop's, the
 * shopper's, the twelve-hour clock's (slice B3a) — every move on the
 * catalogue — the shelf, a style, an issue, a teaser, a code (slice B3b) —
 * and every reset is a row written in the same transaction as the change, and
 * the sample's own history is written in by `reset_demo()`. Beside it, one
 * thing read rather than stored, and saying so: what the clock has decided
 * that nobody wrote down yet (an issue opening on schedule, a hold that ran
 * out before the sweep). `lib/activity-log.ts` holds the rules and is tested
 * without a DOM.
 *
 * "Ai" is the hand that acted: "Cửa hàng" for the manager, "Khách" for the
 * shopper, "Hệ thống" for the clock and for a reset a script ran. The line
 * under the table says that out loud, because "Hệ thống" reading like a
 * person is how somebody ends up looking for who did it.
 */
export function ActivityLogScreen({
  events,
  orders,
  nowIso,
  query,
}: {
  /** The log, newest first, from the database. */
  events: AdminEvent[];
  /** The order book, which names each order's customer and contents. */
  orders: AdminOrder[];
  nowIso: string;
  query: Query;
}) {
  const catalog = useCatalog();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);

  const all = mergeLogRows(
    logRows(catalog, events, orders, now),
    scheduleRows(catalog, catalog.drops, catalog.products, now),
  );
  const filter = logFilter(query.kind);
  const today = query.today === "1";
  const week = query.week === "1";
  const text = (query.q ?? "").trim().toLocaleLowerCase("vi");

  const byKind = all.filter((r) => inFilter(filter, r));
  const windowed = today
    ? withinDays(byKind, 1, now)
    : week
      ? withinDays(byKind, LOG_WINDOW_DAYS, now)
      : byKind;
  const rows = text ? windowed.filter((r) => logHaystack(r).includes(text)) : windowed;

  const csvRows = [
    ["Lúc", "Thao tác", "Chi tiết", "Đối tượng", "Trước → sau", "Ai"],
    ...rows.map((r) => [
      logStamp(r.at),
      r.action,
      r.detail ?? "",
      r.subject,
      diffText(r),
      r.author,
    ]),
  ];

  return (
    <>
      <AdminTop title="Nhật ký thao tác">
        <ExportCsvButton label="Tải CSV" filename="nhat-ky.csv" rows={csvRows} />
      </AdminTop>

      <div className="dt3 log3">
        <div className="bar tools">
          <ChipMenu
            label="Loại thao tác"
            active={filter === "all" ? null : filter}
            options={LOG_FILTERS.map((f) => ({
              value: f.value === "all" ? null : f.value,
              label: f.label,
              note: String(all.filter((r) => inFilter(f.value, r)).length),
            }))}
            hrefFor={(v) => hrefWith(PATH, query, { kind: v })}
          />
          <ToggleChip
            label="Hôm nay"
            count={withinDays(byKind, 1, now).length}
            on={today}
            href={hrefWith(PATH, query, { today: today ? null : "1", week: null })}
          />
          <ToggleChip
            label={`${LOG_WINDOW_DAYS} ngày`}
            count={withinDays(byKind, LOG_WINDOW_DAYS, now).length}
            on={week}
            href={hrefWith(PATH, query, { week: week ? null : "1", today: null })}
          />
          <span className="fill" />
          <SearchBox
            value={query.q ?? ""}
            placeholder="Tìm mã đơn, mã giảm giá, mẫu"
            label="Tìm trong nhật ký"
            onSubmit={(v) => router.replace(hrefWith(PATH, query, { q: v || null }))}
          />
        </div>

        {rows.length === 0 ? (
          <div className="empty3">
            <Empty
              icon="doc"
              title="Chưa có thao tác nào"
              text={`Mọi thao tác trên đơn hàng, tồn kho, ${LEX.tl} và mã giảm giá hiện ở đây, kèm việc khách tự làm và việc suy từ đồng hồ và dữ liệu.`}
            />
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Lúc</th>
                  <th>Thao tác</th>
                  <th>Đối tượng</th>
                  <th>Trước → sau</th>
                  <th>Ai</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="nw">{logStamp(r.at)}</td>
                    <td>
                      <div className="what">
                        <b>{r.action}</b>
                        {r.detail && <span>{r.detail}</span>}
                      </div>
                    </td>
                    <td>
                      {r.href ? <Link href={r.href}>{r.subject}</Link> : r.subject}
                    </td>
                    <td>
                      <div className="diff">
                        {r.before && r.after ? (
                          <>
                            {r.before} → <b>{r.after}</b>
                          </>
                        ) : (
                          r.after && <b>{r.after}</b>
                        )}
                        {r.tail && (
                          <>
                            {(r.before || r.after) && " · "}
                            {r.tail}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="nw">{r.author}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="foot">
              <span>
                {rows.length} thao tác
                {today ? " hôm nay" : week ? ` trong ${LOG_WINDOW_DAYS} ngày` : ""} · “Hệ
                thống” là việc suy từ đồng hồ và dữ liệu, không ai bấm
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
