import { demoNowMs } from "@/lib/clock";
import { listMyOrders } from "@/lib/db/orders";
import { FeedShell, type FeedShellProps } from "./FeedChrome";

export type { FeedPage } from "./FeedChrome";

type FeedFrameProps = Omit<FeedShellProps, "orders" | "now"> & {
  /**
   * The instant the screen is drawn for. Pass the one the page itself used
   * to decide what to show (the home page's moment), so the frame and the
   * screen read the same clock; otherwise it is read here.
   */
  now?: number;
};

/**
 * The frame of every Feed screen (round v4, from slice 1a): the zone, the top
 * bar, the screen, the footer, the phone's tab bar — the mock's chrome
 * contract (`prototype/explore/feed/feed.js`, the head of the file). The v3
 * screens keep `ShopFrame` until their slice.
 *
 * A Server Component, so a screen only wraps itself in it: it reads the one
 * thing the chrome needs from the database — the signed-in account's orders,
 * which the bell's unread count is arithmetic over (the same list the
 * notifications page reads, `React.cache`d for the request) — and hands the
 * rest to its client half, `FeedShell`.
 */
export async function FeedFrame({ now, ...props }: FeedFrameProps) {
  const orders = await listMyOrders();
  return <FeedShell {...props} orders={orders} now={now ?? demoNowMs()} />;
}
