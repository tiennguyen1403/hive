"use client";

import { Minus, Plus } from "lucide-react";
import styles from "./ArcCountField.module.css";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: each button is named by its own label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * A count with a − and a + beside it, for one cell of the stock grid (round
 * v5 slice 5a): v3's `.cell` of `InventoryAdjustSheet`, drawn with Arc's
 * tokens, as tall as Arc's small controls. Arc's free set has no number
 * field with steppers, so it is built here, the way `ArcPhotoPicker` was
 * (slice 4).
 *
 * It holds no rule of its own. The drawer says what a press or a typed digit
 * does (`lib/adjust-cell.ts`, `lib/restock.ts`) and hands the value back; the
 * field only draws it. Every part is named as in v3: "Bớt Đen S", "Đen S",
 * "Thêm Đen S", or for a restock "Nhập thêm Đen S, đang còn 3". A cell whose
 * value moved wears an ink edge, and its line under it (`describedBy`) is
 * read with it.
 *
 * Keyboard: the two buttons and the box are three Tab stops, as in v3. The
 * box shows Arc's input ring; a button shows the zone's ring inside its own
 * edge, where the field's border cannot cover it (QĐ-39). A button that can
 * do nothing more is disabled; it keeps its glyph, dimmed, because it has no
 * label to say so instead.
 */
export function ArcCountField({
  label,
  decrementLabel,
  incrementLabel,
  value,
  changed = false,
  canDecrement,
  canIncrement = true,
  describedBy,
  onStep,
  onType,
}: {
  /** The box's accessible name: "Đen S". */
  label: string;
  /** "Bớt Đen S". */
  decrementLabel: string;
  /** "Thêm Đen S". */
  incrementLabel: string;
  value: number;
  /** The value is not what the shelf holds: the field wears an ink edge. */
  changed?: boolean;
  canDecrement: boolean;
  canIncrement?: boolean;
  /** The id of the line under the field that says what changed. */
  describedBy?: string;
  /** A press of − (−1) or + (1). */
  onStep: (by: -1 | 1) => void;
  /** What was typed, as typed: the drawer reads the digits. */
  onType: (raw: string) => void;
}) {
  return (
    <span className={styles.field} data-changed={changed ? "" : undefined}>
      <button
        type="button"
        className={styles.step}
        aria-label={decrementLabel}
        disabled={!canDecrement}
        onClick={() => onStep(-1)}
      >
        <Minus {...ICON} />
      </button>
      <input
        className={styles.value}
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        aria-label={label}
        aria-describedby={describedBy}
        value={value}
        onChange={(e) => onType(e.target.value)}
      />
      <button
        type="button"
        className={styles.step}
        aria-label={incrementLabel}
        disabled={!canIncrement}
        onClick={() => onStep(1)}
      >
        <Plus {...ICON} />
      </button>
    </span>
  );
}
