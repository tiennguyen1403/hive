import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { OrderConfirmedEmpty } from "@/components/feed/order/OrderConfirmedView";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

/**
 * "Đã đặt hàng", in the page's language since round v6 slice E2 ("Order
 * placed"), with the site's description in it; the link card keeps the
 * layout's Vietnamese one (QĐ-40).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return {
    title: t({ vi: "Đã đặt hàng", en: "Order placed" }),
    description: t(SITE_DESCRIPTION_TEXT),
    // Nothing personal on this one, but it is the empty half of a personal
    // page and has nothing a search index wants.
    robots: { index: false, follow: false },
  };
}

/**
 * `/order-confirmed` without an order number, round v4 "Feed" (slice 2), in
 * the receipt's frame: the phone's bar closes to the home page, the light
 * footer, no tab bar.
 *
 * Until slice B2 this address showed the newest order kept in the browser.
 * Every receipt has its own address now — `/order-confirmed/<code>`, where
 * checkout lands — so this one is only reached by an old link, and leads to
 * the lookup instead.
 */
export default async function OrderConfirmedPage() {
  const t = picker(await getLocale());
  return (
    <FeedFrame
      page="confirm"
      tabbar={false}
      foot="lite"
      mbar={{ back: "/", label: t({ vi: "Đóng, về trang chủ", en: "Close, back to home" }), close: true, hard: true }}
    >
      <OrderConfirmedEmpty />
    </FeedFrame>
  );
}
