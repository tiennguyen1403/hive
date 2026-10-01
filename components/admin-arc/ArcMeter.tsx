import styles from "./ArcMeter.module.css";

/**
 * The back office's 4px bar (round v5): a share filled from the left on the
 * muted ground. One component since slice 6, where five screens each drew
 * their own: a figure card's `meter` (`ArcKpi`), the overview's best sellers,
 * a discount code's uses, an issue's styles and the styles table's stock.
 *
 * `percent` is the filled share, 0 to 100, as the screen has worked it out.
 * `reading` is what the share means, and the words beside the bar always say
 * it too, so colour is never the only channel:
 * · none — the accent;
 * · `hot` — the danger colour (from 85% sold, or a cut running low);
 * · `gone` — the whole track in ink, the one reading that means over (sold
 *   out, or every use of a code spent).
 *
 * A picture of the words beside it, so hidden from assistive tech. The row
 * places it through `className` (a flex share, a gap above it).
 */
export function ArcMeter({
  percent,
  reading,
  className,
}: {
  percent: number;
  reading?: "hot" | "gone";
  className?: string;
}) {
  return (
    <span className={className ? `${styles.meter} ${className}` : styles.meter} data-state={reading} aria-hidden="true">
      <span className={styles.fill} style={{ width: `${percent}%` }} />
    </span>
  );
}
