"use client";

import { hasSales, type DayPoint } from "@/lib/admin-metrics";
import { dayMonth } from "@/lib/datetime";
import { compactVnd, plainVnd, vnd } from "@/lib/money";
import { BarChart, type BarChartDatum } from "@/registry/components/bar-chart/bar-chart";
import panel from "./ArcOrderScreen.module.css";
import styles from "./ArcRevenueChart.module.css";

/** `2026-09-11` → `11/09`, without going through Date (v3's `RevenueChart`). */
function label(day: string): string {
  return dayMonth(`${day}T12:00:00+07:00`);
}

/**
 * Which days name themselves under the bars: five evenly spaced, first and
 * last included, as v3's `RevenueChart` printed them (`axisIndexes`). Arc
 * leaves a bar without an `axisLabel` quiet, so at 30 days the axis reads
 * five dates and none of them touch.
 */
function axisIndexes(n: number): number[] {
  if (n <= 5) return Array.from({ length: n }, (_, i) => i);
  return [0, 1, 2, 3, 4].map((i) => (i === 4 ? n - 1 : Math.floor((i * (n - 1)) / 4)));
}

/**
 * Money taken per day, in the Arc back office's overview (round v5 slice 2):
 * v3's `RevenueChart` (`components/admin/RevenueChart.tsx`) word for word,
 * drawn with Arc's `BarChart`.
 *
 * The total line comes first, as in v3: the money, the days it covers, the
 * best day. Then Arc's chart, whose own headline is the average at rest and
 * the day under the pointer (or under the arrow keys) while somebody reads
 * along the bars. The headline and what a screen reader hears are exact
 * (`vnd`, "1.018.286₫"): rounded to "1tr₫" at that size the figure said
 * nothing. Only the narrow value axis is compact (`compactVnd`, through
 * `formatTick`, registry/PATCHES.md).
 *
 * DAYS WITH NO SALES KEEP THEIR SLOT. Between two issues this shop sells
 * zero, and that flat stretch is the business, not missing data: every day
 * of the range is a bar, zero or not. A range that took nothing at all has
 * no chart (`hasSales`): its axis would be cut into fractions of a đồng. The
 * total line says "chưa có đơn nào", as v3's did, and the table stays.
 *
 * The table under "Xem dạng bảng" prints every day in full, as v3's did;
 * Arc's chart also carries its own table for screen readers.
 */
export function ArcRevenueChart({
  points,
  totalVnd,
  peak,
}: {
  points: DayPoint[];
  totalVnd: number;
  peak: DayPoint | null;
}) {
  const first = points[0];
  const last = points.at(-1);
  const period = first && last ? `${label(first.day)} → ${label(last.day)}` : "";
  const ticks = new Set(axisIndexes(points.length));
  const data: BarChartDatum[] = points.map((p, i) => ({
    key: p.day,
    label: label(p.day),
    axisLabel: ticks.has(i) ? label(p.day) : undefined,
    value: p.vnd,
  }));

  return (
    <div className={styles.body}>
      <p className={styles.total}>
        <span className={styles.sum}>{vnd(totalVnd)}</span>
        <span className={styles.detail}>
          {period}
          {peak ? ` · ngày cao nhất ${label(peak.day)} · ${vnd(peak.vnd)}` : " · chưa có đơn nào"}
        </span>
      </p>

      {hasSales(points) && (
        <div className={styles.chart}>
          <BarChart
            data={data}
            label="Doanh thu"
            period={period}
            formatValue={vnd}
            formatTick={compactVnd}
            averageLabel="Trung bình mỗi ngày"
            valueLabel="Doanh thu"
            categoryLabel="Ngày"
          />
        </div>
      )}

      <details className={styles.days}>
        <summary>Xem dạng bảng</summary>
        <table className={panel.lines}>
          <thead>
            <tr>
              <th scope="col">Ngày</th>
              <th scope="col" className={panel.num}>
                Đơn
              </th>
              <th scope="col" className={panel.num}>
                Doanh thu
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.day}>
                <td className={panel.nowrap}>{label(p.day)}</td>
                <td className={panel.num}>{p.orders}</td>
                <td className={panel.num}>{plainVnd(p.vnd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
