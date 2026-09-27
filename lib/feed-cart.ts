import type { Catalog } from "./catalog";
import { cartSubtotalVnd, type ResolvedLine } from "./cart";
import { canBuy, isOver } from "./feed";
import { feedDeliveryWindow } from "./feed-checkout";
import { isFixed } from "./inventory";
import { issueLabel } from "./lexicon";
import { FREE_SHIPPING_FROM_VND, checkoutTotals } from "./shipping";

/**
 * The Feed's basket (round v4 slice 2): the approved mock's `cart.js` over the
 * app's cart (`lib/cart.ts`, which joins each line to the catalogue and judges
 * it). Pure; the screen is `components/feed/cart/CartView.tsx`.
 */

/**
 * What stands between a line and the checkout, in the order the mock asks
 * (`cart.js`: `problem`): its issue is no longer selling ("closed"), its size
 * has gone ("gone"), or fewer are left than it asks for ("short").
 *
 * `resolveCart` judges the same three and puts a sold-out size first; the Feed
 * names the closed issue first, because no other size of it can be bought
 * either. Whether a line is blocked at all is the same question either way.
 */
export type CartProblem = "closed" | "gone" | "short";

export function cartProblem(catalog: Catalog, l: ResolvedLine, now: Date): CartProblem | null {
  if (isOver(catalog, l.product, now)) return "closed";
  if (l.available === 0) return "gone";
  if (l.available < l.line.qty) return "short";
  return null;
}

/** A gone size of a style that still sells offers another size ("Chọn size khác"); otherwise the line can only go. */
export function canSwap(catalog: Catalog, l: ResolvedLine, now: Date): boolean {
  return cartProblem(catalog, l, now) === "gone" && canBuy(catalog, l.product, now);
}

/** The line in the error red under a blocked line, with its fix (`cart.js`: `row`). */
export function problemText(catalog: Catalog, l: ResolvedLine, now: Date): string | null {
  switch (cartProblem(catalog, l, now)) {
    case "closed":
      return `${l.product.dropNo === null ? "" : issueLabel(l.product.dropNo)} đã đóng. Xoá để thanh toán.`.trim();
    case "gone":
      return `Hết size ${l.line.size}. ${canSwap(catalog, l, now) ? "Đổi size" : "Xoá"} để thanh toán.`;
    case "short":
      return `Chỉ còn ${l.available}. Giảm số lượng để thanh toán.`;
    case null:
      return null;
  }
}

/** "Còn 2" beside the stepper: an issue's style with three or fewer left of that size, and nothing wrong with the line. */
export function lowLeft(catalog: Catalog, l: ResolvedLine, now: Date): number | null {
  if (cartProblem(catalog, l, now) || isFixed(l.product) || l.available > 3) return null;
  return l.available;
}

export interface CartSummary {
  /** Pieces in the basket, blocked lines included ("4 món"). */
  count: number;
  subtotalVnd: number;
  shippingFeeVnd: number;
  totalVnd: number;
  /** What is missing for free delivery, 0 once reached. */
  toFreeVnd: number;
  /** How far along the free-delivery bar is, 0 to 1. */
  freeShare: number;
  /** "Dự kiến nhận": the standard window from now. */
  window: string;
  /** A line needs fixing: "Thanh toán" stays inactive. */
  blocked: boolean;
  /** Something can be bought at all. */
  buyable: boolean;
}

/**
 * "Tóm tắt" (`cart.js`: `render`): what can be bought, delivered the standard
 * way — "Tạm tính", "Giao hàng" (free from `FREE_SHIPPING_FROM_VND`), "Dự kiến
 * nhận", "Tổng" — and how far the basket is from free delivery. A blocked line
 * is counted in the pieces but not in the money. No code is applied here: the
 * mock takes the code at checkout.
 */
export function cartSummary(catalog: Catalog, lines: readonly ResolvedLine[], now: Date, nowIso: string): CartSummary {
  const ok = lines.filter((l) => !cartProblem(catalog, l, now));
  const subtotalVnd = cartSubtotalVnd(ok);
  const t = checkoutTotals({ subtotalVnd, delivery: "STANDARD", payment: "BANK_TRANSFER" });
  return {
    count: lines.reduce((n, l) => n + l.line.qty, 0),
    subtotalVnd,
    shippingFeeVnd: t.shippingFeeVnd,
    totalVnd: t.totalVnd,
    toFreeVnd: Math.max(0, FREE_SHIPPING_FROM_VND - subtotalVnd),
    freeShare: Math.min(1, subtotalVnd / FREE_SHIPPING_FROM_VND),
    window: feedDeliveryWindow("STANDARD", nowIso),
    blocked: ok.length < lines.length,
    buyable: ok.length > 0,
  };
}
