import { cookies } from "next/headers";
import { demoNowMs } from "@/lib/clock";
import { listMyOrders } from "@/lib/db/orders";
import { INBOX_READ_COOKIE } from "@/lib/feed-inbox";
import { FeedShell, type FeedShellProps } from "./FeedChrome";

export type { FeedPage } from "./FeedChrome";

type FeedFrameProps = Omit<FeedShellProps, "orders" | "read" | "now"> & {
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
 * contract (`prototype/explore/feed/feed.js`, the head of the file). Since
 * slice 4b every shop screen wears it; the v3 `ShopFrame` went at slice 5.
 *
 * A Server Component, so a screen only wraps itself in it: it reads the two
 * things the account's inbox needs from the request — the signed-in
 * account's orders (`React.cache`d for the request) and the rows this device
 * has read (the `inbox_read` cookie, slice 4a) — so the bell's number is in
 * the first HTML, and hands the rest to its client half, `FeedShell`.
 */
export async function FeedFrame({ now, ...props }: FeedFrameProps) {
  const [orders, jar] = await Promise.all([listMyOrders(), cookies()]);
  return (
    <FeedShell
      {...props}
      orders={orders}
      read={jar.get(INBOX_READ_COOKIE)?.value ?? ""}
      now={now ?? demoNowMs()}
    />
  );
}
