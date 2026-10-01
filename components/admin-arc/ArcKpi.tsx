import type { ReactNode } from "react";
import styles from "./ArcKpi.module.css";

/**
 * One figure of the Arc back office's overview (round v5 slice 2): what it
 * counts, the figure, and the line that says what it is made of. v3's `.kpi3`
 * tile (`components/admin/DashboardScreen.tsx`), drawn with Arc's tokens.
 *
 * Built here rather than taken from Arc. Arc's `MetricCard` rolls a plain
 * number, and these figures are strings already formatted ("14,2tr₫", "73
 * chiếc") whose line underneath can hold a link or a bar. Arc's docs send
 * that case to `stat-card`, which the free set does not have (brief v5 slice
 * 2, §3.2).
 *
 * `meter` draws the 4px bar under the line, filled to that share (0 to 100):
 * how much of an issue has sold. It is a picture of the line above it, so it
 * is hidden from assistive tech.
 *
 * `aligned` (round v5 slice 4) lines the card up with its siblings in a row
 * whose labels may wrap: the card spans three rows of the row's grid as a
 * subgrid (label, figure, the line and its bar), so every figure starts at
 * one height whatever a label next to it takes. The row is the parent's
 * grid, one row of cards with no gap between rows (`ArcDropsScreen`'s five).
 */
export function ArcKpi({
  label,
  value,
  meter,
  aligned = false,
  children,
}: {
  label: string;
  value: string;
  meter?: number;
  aligned?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.kpi} data-aligned={aligned ? "" : undefined}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {/* The line and its bar are one block: the third row of an aligned card. */}
      <div className={styles.foot}>
        <p className={styles.context}>{children}</p>
        {meter !== undefined && (
          <span className={styles.meter} aria-hidden="true">
            <span className={styles.fill} style={{ width: `${Math.min(100, Math.max(0, meter))}%` }} />
          </span>
        )}
      </div>
    </div>
  );
}
