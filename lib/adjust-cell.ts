import type { ColorKey, Product, Size } from "@/data/types";
import { canRaise, cellValue, draftTotal, withCell, type StockDraft } from "./inventory-adjust";

/**
 * One cell of "Điều chỉnh tồn kho": what its − and + buttons and its typed
 * digits do (round v5 slice 5a).
 *
 * v3's `step` and `type` (`components/admin/InventoryAdjustSheet.tsx`) rule
 * for rule, moved out of the component when the sheet became an Arc drawer,
 * so the one rule that matters reads and tests without a DOM: THE CUT IS THE
 * CEILING of an issue's style (`lib/inventory-adjust.ts`). The refusal is
 * said at the cell that was pressed or typed into, never on the save button
 * three fields away, and the drawer says it in a toast. A fixed style was
 * never cut, so nothing caps its shelf.
 */

/** A cell's next state: the draft, and the sentence to say when the cut refused it. */
export interface CellMove {
  draft: StockDraft;
  refused: string | null;
}

/** "Không vượt số đã cắt: 35", v3's toast. */
export function cutRefusal(cut: number): string {
  return `Không vượt số đã cắt: ${cut}`;
}

/**
 * A press of − (`by` −1) or + (`by` 1). One more past the cut is refused and
 * the cell stays as it was; one less is never refused, and a cell never goes
 * below nothing.
 */
export function stepCell(
  product: Product,
  draft: StockDraft,
  color: ColorKey,
  size: Size,
  by: number,
): CellMove {
  if (by > 0 && !canRaise(product, draft)) {
    return { draft, refused: cutRefusal(product.cutUnits ?? 0) };
  }
  return { draft: withCell(draft, color, size, cellValue(draft, color, size) + by), refused: null };
}

/**
 * Digits typed into the cell, read as a whole number of nothing or more.
 * When the shelf would then hold more than was cut, the cell is pulled down to
 * what the cut leaves it, and the refusal is said.
 */
export function typeCell(
  product: Product,
  draft: StockDraft,
  color: ColorKey,
  size: Size,
  raw: string,
): CellMove {
  const wanted = Math.max(0, Number(raw.replace(/\D/g, "")) || 0);
  const others = draftTotal(product, draft) - cellValue(draft, color, size);
  const cut = product.cutUnits;
  if (cut !== null && others + wanted > cut) {
    return { draft: withCell(draft, color, size, cut - others), refused: cutRefusal(cut) };
  }
  return { draft: withCell(draft, color, size, wanted), refused: null };
}
