import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { OrderConfirmedEmpty } from "@/components/feed/order/OrderConfirmedView";

export const metadata: Metadata = {
  title: "Đã đặt hàng",
  // Nothing personal on this one, but it is the empty half of a personal
  // page and has nothing a search index wants.
  robots: { index: false, follow: false },
};

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
export default function OrderConfirmedPage() {
  return (
    <FeedFrame
      page="confirm"
      tabbar={false}
      foot="lite"
      mbar={{ back: "/", label: "Đóng, về trang chủ", close: true, hard: true }}
    >
      <OrderConfirmedEmpty />
    </FeedFrame>
  );
}
