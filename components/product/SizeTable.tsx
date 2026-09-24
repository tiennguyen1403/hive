"use client";

import { Tick } from "@/components/icon/Icon";
import { SIZES, type ColorKey, type Product, type Size } from "@/data/types";
import { isFixed, onHandOf } from "@/lib/inventory";

/** Under this many left, the count turns red. "còn 2" is a decision, "còn 3" is not. */
const URGENT_AT = 3;

interface SizeTableProps {
  product: Product;
  /** Counts are per colourway: "hết XL màu đen" is true where "hết XL" is not. */
  color: ColorKey;
  value: Size | null;
  onPick: (size: Size) => void;
  /** The issue has closed — the rows still say what is left, nothing is pressable. */
  frozen?: boolean;
  /** Names the group for assistive tech. */
  label: string;
}

/**
 * The size table — `prototype/v3/product.html`, `.sizes`. One row per size,
 * the count set on a dotted leader, a box at the end to tick.
 *
 * A TABLE and not a row of chips, because that is what it is: four rows, each
 * a size against a number, read down a column. The chip row the v2 page used
 * could not carry the count without either shrinking the type under the floor
 * or spilling onto two lines.
 *
 * One component, both surfaces. The ticket on the product page and the sheet
 * a card opens show the same four rows with the same counts, and two copies
 * would be two places for "hết" to drift from the stock table.
 *
 * A size with nothing left is drawn, struck through, and is not a control:
 * `.gone` carries no button behaviour and no tick box. Scarcity is content
 * (PRODUCT.md), so it is visible BEFORE the tap rather than as an error after
 * it.
 *
 * A FIXED style (v3 slice 11) prints no figure: a size is there or it is
 * "đã hết" — the user settled that a style brought back when it runs out
 * shows no stock on its page or in its sheet.
 */
export function SizeTable({
  product,
  color,
  value,
  onPick,
  frozen = false,
  label,
}: SizeTableProps) {
  const fixed = isFixed(product);
  return (
    <table className="sizes" aria-label={label}>
      <tbody>
        {SIZES.map((z) => {
          const left = onHandOf(product, color, z);
          const gone = left === 0;
          const on = z === value;
          const count = fixed ? (gone ? "đã hết" : "") : gone ? "hết" : `còn ${left}`;
          return (
            <tr key={z}>
              <td>
                <button
                  type="button"
                  className={gone ? "gone" : undefined}
                  aria-pressed={gone ? undefined : on}
                  aria-disabled={gone || frozen || undefined}
                  disabled={gone || frozen}
                  onClick={() => onPick(z)}
                >
                  {/* A bare `<b>`, not the mock's `.sz`: that class is the
                      v2 size CHIP in `forms.css` and would paint a honey
                      border and a white ground on this cell. */}
                  <b>{z}</b>
                  <span className="ld" aria-hidden="true" />
                  <span className={!fixed && left > 0 && left < URGENT_AT ? "left low" : "left"}>
                    {count}
                  </span>
                  {!gone && (
                    <span className="mk" aria-hidden="true">
                      <Tick />
                    </span>
                  )}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
