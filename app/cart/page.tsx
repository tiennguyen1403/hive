import type { Metadata } from "next";
import { CartView } from "@/components/feed/cart/CartView";
import { FeedFrame } from "@/components/feed/FeedFrame";

export const metadata: Metadata = { title: "Giỏ" };

/**
 * The basket, round v4 "Feed" (slice 2): the approved mock's
 * `prototype/explore/feed/cart.html` (`CartView`). A tab root: the phone
 * shows the brand bar and lights "Giỏ" in the tab bar; the footer is the
 * light one, as the mock's.
 *
 * The basket itself lives in the browser (`CartContext`), so the screen is a
 * client component inside the frame; the catalogue it is judged against comes
 * through `CatalogProvider` from the root layout.
 */
export default function CartPage() {
  return (
    <FeedFrame page="cart" foot="lite">
      <CartView />
    </FeedFrame>
  );
}
