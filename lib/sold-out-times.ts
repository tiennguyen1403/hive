import type { Order, Product } from "@/data/types";
import { isSoldOut, soldUnits, type IssueStyle } from "./inventory";

/**
 * "Hết lúc nào" — when each style of a closed issue ran out, read off the
 * orders that paid for it.
 *
 * The archive page (`/so/[no]`) is a RECORD, so every column on it has to be
 * a fact somebody could check. Two of the three are arithmetic over the
 * catalog (how many were cut, how many went). The third is this one, and it
 * is the only thing on that page that can fail to exist — which is why it is
 * a module with a test rather than a line in a component.
 *
 * The rule: walk the orders that were really PAID for, oldest first, adding
 * up units per style; the order that takes the count to the size of the cut
 * is the one that emptied the shelf, and its own instant is the answer. A
 * cancelled order is not in the walk — its units went back on the shelf,
 * which is exactly what `DH-2310` and `DH-2313` did.
 *
 THREE SOURCES, IN THIS ORDER. The orders first, because an instant two
 * screens can both check beats one somebody typed. Then the shop's own
 * record — `Product.soldOutAt`, a fact it keeps the way it keeps `cutUnits`
 * — because `data/orders.ts` is an explicit recent SAMPLE and for most
 * styles it accounts for a handful of the units cut, so the hour the shelf
 * emptied is simply not in it. Then nothing: the row carries no instant, the
 * screen prints "—", and a line under the table says why. Inventing a
 * plausible hour would be the exact thing DESIGN.md §9 rule 1 forbids, on
 * the one page whose whole purpose is the record.
 */

/** Money really arrived. A cancelled order took nothing off the shelf. */
const PAID_STATES = new Set(["PAID", "SHIPPING", "DELIVERED"]);

export interface SoldOutRow {
  product: Product;
  /** Units gone, from the catalog: cut minus what is on hand. */
  soldUnits: number;
  cutUnits: number;
  /** When the last unit went. Absent when neither source can say. */
  soldOutAt?: string;
  /** Which of the two answered — the row does not print it, the note does. */
  source?: "orders" | "book";
  /** That last unit went at or after the issue's closing hour. */
  atClose: boolean;
  /** Units the paid orders in the sample actually account for. */
  accountedUnits: number;
}

export function soldOutTimes(
  // An issue's styles only (`productsInDrop`): a fixed style has no cut to
  // run out of, and never runs out for good (slice B5).
  products: readonly IssueStyle[],
  orders: Order[],
  closesAt: string,
): SoldOutRow[] {
  const paid = orders
    .filter((o) => PAID_STATES.has(o.status.state))
    .sort((a, b) => Date.parse(a.placedAt) - Date.parse(b.placedAt));

  const closeMs = Date.parse(closesAt);

  return products.map((product) => {
    const sold = soldUnits(product);
    let running = 0;
    let at: string | undefined;

    for (const order of paid) {
      const units = order.lines
        .filter((l) => l.productId === product.id)
        .reduce((n, l) => n + l.qty, 0);
      if (units === 0) continue;
      running += units;
      // Only a style that really has nothing left can have run OUT. One with
      // stock on the shelf never reached a last unit, whatever the orders say.
      if (at === undefined && isSoldOut(product) && running >= product.cutUnits) {
        at = order.placedAt;
      }
    }

    // The orders proved it, or the shop's book says it, or nobody can.
    const fromBook = isSoldOut(product) ? product.soldOutAt : undefined;
    const answer = at ?? fromBook;
    const source = at ? "orders" : fromBook ? "book" : undefined;

    return {
      product,
      soldUnits: sold,
      cutUnits: product.cutUnits,
      ...(answer ? { soldOutAt: answer } : {}),
      ...(source ? { source } : {}),
      atClose: answer !== undefined && Date.parse(answer) >= closeMs,
      accountedUnits: running,
    };
  });
}

/**
 * Whether anything on the table has an hour at all.
 *
 * The screen counts the rows that do NOT (it names the number in its note),
 * so this is the archive page's question asked the other way round — kept
 * because the back office asks it that way at slice 5 ("Hết hàng · MUỐI ·
 * hết 19/09"), and pinned by the test either way.
 */
export function anySoldOutTime(rows: SoldOutRow[]): boolean {
  return rows.some((r) => r.soldOutAt !== undefined);
}
