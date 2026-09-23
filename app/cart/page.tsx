import type { Metadata } from "next";
import { CartScreen } from "@/components/cart/CartScreen";
import { featuredDrop } from "@/lib/drop";

export const metadata: Metadata = { title: "Giỏ" };

/**
 * A server shell around a client screen.
 *
 * The cart itself lives in the browser, so the screen has to be a client
 * component — but page metadata and the issue's own facts do not, and
 * reading them here keeps the catalog out of the client bundle.
 */
export default function CartPage() {
  const { drop, state } = featuredDrop(undefined);

  return (
    <CartScreen
      dropNo={drop.no}
      dropClosesAt={drop.closesAt}
      dropIsOpen={state === "OPEN"}
    />
  );
}
