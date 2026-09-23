import type { DayPoint } from "@/lib/admin-metrics";
import { dayMonth } from "@/lib/datetime";
import { compactVnd, plainVnd, vnd } from "@/lib/money";

interface RevenueChartProps {
  points: DayPoint[];
  totalVnd: number;
  peak: DayPoint | null;
}

/** `2026-09-11` → `11/09`, without going through Date. */
function label(day: string): string {
  return dayMonth(`${day}T12:00:00+07:00`);
}

/** Five evenly spaced days along the bottom, first and last included. */
function axisIndexes(n: number): number[] {
  if (n <= 5) return Array.from({ length: n }, (_, i) => i);
  return [0, 1, 2, 3, 4].map((i) => (i === 4 ? n - 1 : Math.floor((i * (n - 1)) / 4)));
}

/**
 * Money taken per day, as bars — `.chart3` in the v3 mock.
 *
 * One series, one hue: honey-brown bars with the best day in full honey, so
 * the eye lands on it without a second colour entering the palette. Height is
 * the only quantitative channel; nothing here encodes anything in colour that
 * the bar does not already say.
 *
 * DAYS WITH NO SALES KEEP THEIR SLOT AND DRAW A HAIRLINE. Between two issues
 * this shop sells zero, and that flat stretch is the business, not missing
 * data — squeezing the empty days out would draw a continuous trade that
 * never happened, which is the single most misleading thing this chart could
 * do. The mock's own caption says as much.
 *
 * The bars are `aria-hidden` and every figure lives twice over in text: the
 * hero line states the total and names the best day, and the `<details>`
 * below holds every day in full. A bar chart nobody can read is not an
 * accessible chart with a caption; it is a picture with a caption.
 */
export function RevenueChart({ points, totalVnd, peak }: RevenueChartProps) {
  const top = peak?.vnd ?? 0;
  const first = points[0];
  const last = points.at(-1);
  const ticks = new Set(axisIndexes(points.length));

  return (
    <div className="bd">
      <div className="heroline">
        <b>{vnd(totalVnd)}</b>
        <span>
          {first && last ? `${label(first.day)} → ${label(last.day)}` : ""}
          {peak ? ` · ngày cao nhất ${label(peak.day)} · ${vnd(peak.vnd)}` : " · chưa có đơn nào"}
        </span>
      </div>

      <div
        className="chart3"
        role="img"
        aria-label={
          peak
            ? `Biểu đồ cột, doanh thu ${points.length} ngày. Cao nhất ngày ${label(peak.day)}: ${vnd(peak.vnd)}. Bảng số liệu đầy đủ ở ngay bên dưới.`
            : `Biểu đồ cột, doanh thu ${points.length} ngày. Chưa ngày nào ghi nhận doanh thu.`
        }
      >
        {points.map((p) => {
          const isPeak = peak !== null && p.day === peak.day;
          return (
            <i
              key={p.day}
              className={p.vnd === 0 ? "zero" : isPeak ? "hi" : undefined}
              style={p.vnd === 0 ? undefined : { height: `${(p.vnd / top) * 100}%` }}
            >
              {isPeak && <span className="peak">{compactVnd(p.vnd)}</span>}
            </i>
          );
        })}
      </div>

      <div className="axis" aria-hidden="true">
        {points.map((p, i) => (ticks.has(i) ? <span key={p.day}>{label(p.day)}</span> : null))}
      </div>

      <details className="daytable">
        <summary>Xem dạng bảng</summary>
        <table>
          <thead>
            <tr>
              <th>Ngày</th>
              <th className="right">Đơn</th>
              <th className="right">Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.day}>
                <td className="nw">{label(p.day)}</td>
                <td className="right">{p.orders}</td>
                <td className="right">{plainVnd(p.vnd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
