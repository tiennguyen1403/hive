import { SIZES, type ColorKey, type Product, type Size } from "@/data/types";
import { MAX_RESTOCK_PER_CELL } from "./catalog-admin";
import { FIXED_LOW_AT, onHandOf } from "./inventory";

/**
 * "Nhập thêm" — the rules behind the restock grid (v3 slice 12).
 *
 * The sheet is `InventoryAdjustSheet` in its second mode, and these are that
 * mode's rules, pure and tested without a DOM (QĐ-9), the way
 * `lib/inventory-adjust.ts` holds the adjustment's. The grid is the same
 * COLOUR × SIZE; what differs is what a cell holds: not the shelf's new
 * number but how many pieces are ADDED to it — a whole number from 0 to 999,
 * starting at 0 — because bringing a size back is only ever upward, and the
 * database refuses anything else (`admin_adjust_stock()`, reason "Nhập thêm",
 * slice B5).
 */

/**
 * One cell of a restock, exactly as `restockProduct` takes it
 * (`readRestockCells`): `before` is the number the sheet was showing, so a
 * shelf that moved in the meantime is refused (`STALE`) rather than added to.
 */
export interface RestockCell {
  color: ColorKey;
  size: Size;
  before: number;
  add: number;
}

/** `draft[color][size]` — the pieces typed into each cell. */
export type RestockDraft = Record<string, Record<string, number>>;

/** A cell's box, read: the digits typed, as a whole number from 0 to 999. */
export function readAdd(raw: string): number {
  const n = Number(raw.replace(/\D/g, "")) || 0;
  return Math.min(MAX_RESTOCK_PER_CELL, n);
}

export function addOf(draft: RestockDraft, color: ColorKey, size: Size): number {
  return draft[color]?.[size] ?? 0;
}

/** The draft with one cell set, held to 0–999. */
export function withAdd(draft: RestockDraft, color: ColorKey, size: Size, value: number): RestockDraft {
  const n = Math.max(0, Math.min(MAX_RESTOCK_PER_CELL, Math.trunc(value)));
  return { ...draft, [color]: { ...(draft[color] ?? {}), [size]: n } };
}

/**
 * What "Nhập thêm" sends: every cell with something to add, in band order
 * then S → XL, each with the number on the shelf the sheet is showing.
 */
export function restockCells(product: Product, draft: RestockDraft): RestockCell[] {
  const cells: RestockCell[] = [];
  for (const color of product.colors) {
    for (const size of SIZES) {
      const add = addOf(draft, color, size);
      if (add > 0) cells.push({ color, size, before: onHandOf(product, color, size), add });
    }
  }
  return cells;
}

/** Every piece the draft adds, over the colours the style comes in. */
export function restockTotal(product: Product, draft: RestockDraft): number {
  return restockCells(product, draft).reduce((n, c) => n + c.add, 0);
}

/** The pieces one colour's row adds — the "Cộng" column's "(+N)". */
export function colorAdds(product: Product, draft: RestockDraft, color: ColorKey): number {
  return product.colors.includes(color) ? SIZES.reduce((n, s) => n + addOf(draft, color, s), 0) : 0;
}

/**
 * The confirm button: it counts what it will do — "Nhập thêm 14 chiếc" —
 * and while there is nothing to add it is disabled and says the job left,
 * "Nhập số cần thêm" (DESIGN.md §9 rule 3).
 */
export function restockButton(total: number): { ready: boolean; label: string } {
  return total > 0
    ? { ready: true, label: `Nhập thêm ${total} chiếc` }
    : { ready: false, label: "Nhập số cần thêm" };
}

/** A cell the grid prints in red: two or fewer left, the fixed style's own line (`FIXED_LOW_AT`). */
export function isThin(onHand: number): boolean {
  return onHand <= FIXED_LOW_AT;
}
