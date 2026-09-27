"use client";

import { FeedShop } from "../FeedShop";
import { useHomeShop } from "./HomeTabs";

/**
 * Cửa hàng, the home page's second tab: the shop grid on the lines the
 * moment offers (the open issue first while it sells, the fixed line first
 * once it has closed), no title and no sort — as the mock's home calls
 * `F.shop()` — its state in the URL through the tabs.
 */
export function HomeShop() {
  const { lines, shop, setShop } = useHomeShop();
  return <FeedShop lines={lines} state={shop} onChange={setShop} h="h3" />;
}
