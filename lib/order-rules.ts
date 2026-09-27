import type { OrderFailure } from "./order-payload";

/**
 * Two rules of placing an order that the checkout SCREEN needs, apart from the
 * checks `lib/order-payload.ts` runs on the server — which read the commune
 * list (`validateCheckout`, `data/regions.ts`) and would carry its 3,321
 * communes into the browser with them. `lib/order-payload.ts` re-exports both,
 * so every existing import still reads.
 */

/** The note column's own limit (`check (length(note) <= 500)`). */
export const MAX_NOTE_LENGTH = 500;

/**
 * Whether the screen should read the catalogue again after this failure:
 * the stock, the issue's window or the code's uses moved under the basket,
 * and the cart and the summary have to show what is true now. A visitor
 * refused for going too fast (`RATE_LIMITED`) moved nothing.
 */
export function failureMovesCatalog(failure: OrderFailure | "RATE_LIMITED"): boolean {
  return failure === "OUT_OF_STOCK" || failure === "DROP_CLOSED" || failure === "PROMO_INVALID";
}
