import { SIZES, type ColorKey, type Product, type Size } from "@/data/types";
import { onHandOf } from "./inventory";

/**
 * "Điều chỉnh tồn kho" — the rules behind the size × colour grid.
 *
 * Pure, and tested without a DOM (QĐ-9). The sheet is a shell over these
 * functions, the same split the cart uses, because the one rule that matters
 * here is arithmetic and not layout: **a shelf can never hold more than was
 * cut**. An issue is cut once and never restocked; a back office that could
 * raise the on-hand count past `cutUnits` would be a back office that can
 * sew, and every figure downstream — "108 / 181 đã bán", the drop's revenue,
 * the shopper's "còn 2" — is `cut − onHand` and would start lying.
 *
 * What the grid DOES move is units on hand: a return goes back on the shelf,
 * a stocktake corrects a miscount, breakage takes a piece off. All three are
 * real things that happen to cloth after it is cut.
 *
 * Since slice B3b the save is `admin_adjust_stock()` in Postgres, which
 * applies the same ceiling and refuses a cell whose `before` is no longer the
 * shelf's own number (`STALE`) — the rules below are what the sheet can say
 * before the button is pressed, the database is what decides.
 */

/**
 * One cell of the grid that moved: what the form was showing, and what it
 * was set to. `before` travels to the database so that a shelf somebody else
 * changed in the meantime is refused rather than overwritten.
 */
export interface InventoryCell {
  color: ColorKey;
  size: Size;
  before: number;
  after: number;
}

/** How many units an adjustment added (or removed) across every cell. */
export function cellDelta(cells: readonly InventoryCell[]): number {
  return cells.reduce((n, c) => n + (c.after - c.before), 0);
}

/** `draft[color][size]` — what the grid currently holds. */
export type StockDraft = Record<string, Record<string, number>>;

/** The grid as the catalogue has it right now. */
export function draftOf(product: Product): StockDraft {
  const draft: StockDraft = {};
  for (const color of product.colors) {
    draft[color] = {};
    for (const size of SIZES) draft[color]![size] = onHandOf(product, color, size);
  }
  return draft;
}

export function cellValue(draft: StockDraft, color: ColorKey, size: Size): number {
  return draft[color]?.[size] ?? 0;
}

export function withCell(
  draft: StockDraft,
  color: ColorKey,
  size: Size,
  value: number,
): StockDraft {
  return { ...draft, [color]: { ...(draft[color] ?? {}), [size]: Math.max(0, value) } };
}

/** Units on hand in one colour, as the grid has it. */
export function colorTotal(product: Product, draft: StockDraft, color: ColorKey): number {
  return SIZES.reduce((n, s) => n + cellValue(draft, color, s), 0);
}

/** Units on hand across the whole style, as the grid has it. */
export function draftTotal(product: Product, draft: StockDraft): number {
  return product.colors.reduce((n, c) => n + colorTotal(product, draft, c), 0);
}

/**
 * Every cell that moved, with what it was and what it became.
 *
 * This is exactly the list `admin_adjust_stock()` takes and the
 * `INVENTORY_ADJUSTED` event keeps, so nothing is restated on the way.
 */
export function changedCells(product: Product, draft: StockDraft): InventoryCell[] {
  const cells: InventoryCell[] = [];
  for (const color of product.colors) {
    for (const size of SIZES) {
      const before = onHandOf(product, color, size);
      const after = cellValue(draft, color, size);
      if (after !== before) cells.push({ color, size, before, after });
    }
  }
  return cells;
}

/**
 * Whether one more unit may go on this shelf.
 *
 * Asked at the CELL, before the number changes, so the refusal lands on the
 * control that was pressed rather than on a save button three fields away.
 */
export function canRaise(product: Product, draft: StockDraft): boolean {
  return draftTotal(product, draft) < product.cutUnits;
}

/** How many units past the cut the grid currently stands. 0 when it is fine. */
export function overCutBy(product: Product, draft: StockDraft): number {
  return Math.max(0, draftTotal(product, draft) - product.cutUnits);
}

/** What the shop is correcting. Required, and it goes into the log. */
export const ADJUST_REASONS = [
  "Hàng trả về",
  "Kiểm kê lệch",
  "Hư hỏng",
  "Khác",
] as const;

export type AdjustReason = (typeof ADJUST_REASONS)[number];

/**
 * Every reason the database accepts for a change to the shelf: the sheet's
 * four, and "Sửa mẫu" — what the product form's own grid saves under
 * (slice B3b), so the log can tell an edit of the style from a correction
 * of the shelf. Not offered in the sheet's menu: nobody adjusting stock from
 * the table is editing the style. `admin_adjust_stock()` restates the list.
 */
export const PRODUCT_EDIT_REASON = "Sửa mẫu";

export const STOCK_REASONS: readonly string[] = [...ADJUST_REASONS, PRODUCT_EDIT_REASON];

export function isStockReason(value: string): boolean {
  return STOCK_REASONS.includes(value);
}

/**
 * Why the save button is not offered yet, or null when it is.
 *
 * The button is DISABLED rather than hidden and it says the job that is
 * left, because "Lưu điều chỉnh" that silently does nothing is the dead
 * button DESIGN.md §9 rule 3 forbids.
 */
export function saveBlocker(
  product: Product,
  draft: StockDraft,
  reason: string | null,
): string | null {
  if (changedCells(product, draft).length === 0) return "Chưa có thay đổi";
  if (!reason) return "Chọn lý do";
  if (overCutBy(product, draft) > 0) return `Không vượt ${product.cutUnits} đã cắt`;
  return null;
}

/**
 * "+1 · hàng trả về DH-2419" — what one changed cell says under itself.
 *
 * The reference is part of the sentence when there is one, because a return
 * without an order number is a claim nobody can check later.
 */
export function deltaLabel(cell: InventoryCell, reason: string | null, ref: string): string {
  const delta = cell.after - cell.before;
  const sign = delta > 0 ? `+${delta}` : String(delta);
  const tail = [reason?.toLowerCase(), ref.trim()].filter(Boolean).join(" ");
  return tail ? `${sign} · ${tail}` : sign;
}
