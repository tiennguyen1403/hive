import type { Metadata } from "next";
import { CartView } from "@/components/feed/cart/CartView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

/**
 * "Giỏ" — the layout's template adds "· HIVE". In the page's language since
 * round v6 slice E2 ("Bag"), with the site's description in it too; the link
 * card keeps the layout's Vietnamese one (QĐ-40).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return { title: t({ vi: "Giỏ", en: "Bag" }), description: t(SITE_DESCRIPTION_TEXT) };
}

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
