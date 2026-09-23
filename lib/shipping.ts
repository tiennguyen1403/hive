import type { DeliveryMethod, PaymentMethod, Promotion } from "@/data/types";
import { addDaysIso, shortRangeLabel } from "./datetime";
import { promoDiscountVnd } from "./orders";

/**
 * What delivery costs, and what the shopper owes at the end.
 *
 * Every number here is also printed somewhere the shopper reads it — on the
 * product page ("2–4 ngày · 30.000₫ · miễn phí từ 1.000.000₫"), beside the
 * delivery choices, and on the payment rows. Keeping them in one module is
 * what stops the promise on one screen from drifting away from the charge on
 * another.
 */

/**
 * Defined in `data/types.ts` since slice B2, when it became a field of
 * `Order`; re-exported so every import from here still reads.
 *
 * The four figures below are restated as constants in `place_order()`
 * (`supabase/migrations/…_orders.sql`), because the database prices an order
 * itself. `lib/db/orders.dbtest.ts` places the same baskets through both and
 * fails the moment the two disagree.
 */
export type { DeliveryMethod };

export const STANDARD_FEE_VND = 30_000;
export const EXPRESS_FEE_VND = 45_000;
export const FREE_SHIPPING_FROM_VND = 1_000_000;
export const COD_SURCHARGE_VND = 15_000;

/**
 * How long after delivery an exchange is still on the table.
 *
 * Seven days is a promise this build already makes in four places — the
 * cart's row of commitments, the consent line at checkout, the product
 * page and the footer — so it is a term the shop is committed to rather
 * than a number invented for a policy page. It lives here with the other
 * terms so the page that states it and the notification that counts down
 * to it cannot drift apart. What is still unwritten is the CONDITIONS
 * (tags, who pays the return leg, discounted styles); `/returns` says so
 * in a `.prep` block rather than filling them in.
 */
export const RETURN_WINDOW_DAYS = 7;

/**
 * TP. Hồ Chí Minh, as `data/regions.ts` codes it. Express is a same-city
 * courier run, not a national service. `shipping.test.ts` pins the code to
 * the name so a renumbered fixture cannot quietly move express to another
 * city.
 */
export const EXPRESS_PROVINCE_CODE = "29";

export interface DeliveryOption {
  method: DeliveryMethod;
  /** Shown as-is. */
  label: string;
  /** Read after the delivery date, so it opens in lower case. */
  note: string;
  /** What is true about the hour of the day, when anything is. */
  when?: string;
  feeVnd: number;
  /**
   * How long the courier quotes, in days from the order. The two ends are
   * equal when the service promises one day.
   *
   * The delivery date is DERIVED from these and the clock, on every screen
   * that prints one — the cart summary, the two delivery rows and the
   * receipt. Before this they were a literal in the confirmation component,
   * so the cart and the receipt could disagree about the same parcel.
   */
  leadDays: readonly [number, number];
}

export const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    method: "STANDARD",
    label: "Giao tiêu chuẩn · 2–4 ngày",
    note: "giao bởi đối tác vận chuyển",
    feeVnd: STANDARD_FEE_VND,
    leadDays: [2, 4],
  },
  {
    method: "EXPRESS",
    // "nội thành" moved into the label at v3 slice 3, from the approved
    // mock: the one thing worth knowing before reading any further is that
    // this service does not leave the city.
    label: "Giao nhanh nội thành · 24 giờ",
    note: "chỉ nội thành TP. Hồ Chí Minh",
    when: "trong giờ hành chính",
    feeVnd: EXPRESS_FEE_VND,
    leadDays: [1, 1],
  },
];

/**
 * "Tiêu chuẩn" · "Nhanh nội thành" — the method named inside a row of a
 * receipt, where the full label ("Giao tiêu chuẩn · 2–4 ngày") would repeat
 * the delivery window printed beside it.
 */
export function deliveryShortLabel(method: DeliveryMethod): string {
  return method === "STANDARD" ? "Tiêu chuẩn" : "Nhanh nội thành";
}

export function deliveryOption(method: DeliveryMethod): DeliveryOption {
  const found = DELIVERY_OPTIONS.find((o) => o.method === method);
  if (!found) throw new Error(`no delivery option for ${method}`);
  return found;
}

/**
 * When the parcel is expected, as two instants.
 *
 * Counted from the order, not from today: the receipt is reopened days later
 * and has to keep quoting the window the shopper was promised when they
 * paid.
 */
export function deliveryWindow(
  method: DeliveryMethod,
  fromIso: string,
): { fromIso: string; toIso: string } {
  const [first, last] = deliveryOption(method).leadDays;
  return { fromIso: addDaysIso(fromIso, first), toIso: addDaysIso(fromIso, last) };
}

/** `"22/09 – 24/09"`, or `"21/09"` for a one-day service. */
export function deliveryWindowLabel(method: DeliveryMethod, fromIso: string): string {
  const w = deliveryWindow(method, fromIso);
  return shortRangeLabel(w.fromIso, w.toIso);
}

/**
 * Free shipping is a threshold on the STANDARD service only.
 *
 * Paying for speed is not a volume discount: the approved checkout prints
 * 45.000₫ beside the express row on a basket of 1.340.000₫, where standard
 * is already free.
 */
export function shippingFeeVnd(method: DeliveryMethod, subtotalVnd: number): number {
  if (method === "EXPRESS") return EXPRESS_FEE_VND;
  return subtotalVnd >= FREE_SHIPPING_FROM_VND ? 0 : STANDARD_FEE_VND;
}

/** Express only exists where the courier runs it. No province chosen yet, no express. */
export function isDeliveryAvailable(
  method: DeliveryMethod,
  provinceCode: string | undefined,
): boolean {
  if (method === "STANDARD") return true;
  return provinceCode === EXPRESS_PROVINCE_CODE;
}

export interface CheckoutInput {
  subtotalVnd: number;
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  promo?: Promotion;
}

export interface CheckoutTotals {
  subtotalVnd: number;
  shippingFeeVnd: number;
  /** Cash-on-delivery handling. Zero on every other method. */
  codFeeVnd: number;
  discountVnd: number;
  totalVnd: number;
}

/**
 * The summary box, computed once.
 *
 * The COD fee is its own line rather than folded into shipping, because it is
 * not a delivery charge — it is what the courier takes for handling cash, and
 * the payment row already promises it in words ("Thu thêm 15.000₫ phí thu
 * hộ"). A fee that is promised in words and then hidden inside another number
 * is the kind of surprise PRODUCT.md rules out.
 */
export function checkoutTotals({
  subtotalVnd,
  delivery,
  payment,
  promo,
}: CheckoutInput): CheckoutTotals {
  const shipping = shippingFeeVnd(delivery, subtotalVnd);
  const codFeeVnd = payment === "COD" ? COD_SURCHARGE_VND : 0;
  const discountVnd = promoDiscountVnd(promo, subtotalVnd, shipping);

  return {
    subtotalVnd,
    shippingFeeVnd: shipping,
    codFeeVnd,
    discountVnd,
    totalVnd: Math.max(0, subtotalVnd + shipping + codFeeVnd - discountVnd),
  };
}
