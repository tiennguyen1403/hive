"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icon/Icon";
import { usePlacedOrders } from "@/components/shop/placed-order";
import { initialsOf } from "@/lib/initials";
import { deviceOrdersOf } from "@/lib/order-rows";
import { formatPhone } from "@/lib/phone";
import { useCatalog } from "@/components/shop/CatalogContext";
import { resolveWishlist } from "@/lib/wishlist";
import { signOut } from "@/lib/actions/auth";
import { fixtureOrdersOf, type Me } from "@/lib/me";
import { useNotifCenter } from "./notif-center";
import { useWishlist } from "./WishlistContext";
import { demoNow } from "@/lib/clock";

/** Which door this screen is behind. */
export type RailKey =
  | "home"
  | "orders"
  | "notifications"
  | "wishlist"
  | "addresses"
  | "profile";

/**
 * Which of the six the current URL is behind.
 *
 * Read here rather than passed down by each page: the rail moved into
 * `app/account/layout.tsx` at slice B1, and a layout does not know which
 * child is rendering. `usePathname` costs this component the static shell,
 * which it had already left — every account screen reads a session cookie.
 */
function railKeyOf(path: string): RailKey | undefined {
  if (path === "/account") return "home";
  if (path.startsWith("/account/orders")) return "orders";
  if (path.startsWith("/account/notifications")) return "notifications";
  if (path.startsWith("/account/wishlist")) return "wishlist";
  if (path.startsWith("/account/addresses")) return "addresses";
  // The password screen is reached from the profile and belongs to it.
  if (path.startsWith("/account/profile") || path.startsWith("/account/password")) {
    return "profile";
  }
  return undefined;
}

/**
 * The account's six doors — a row that scrolls on a phone, a column from
 * 900px.
 *
 * The v2 rail did not exist below 900px at all, and the phone reached the
 * same places through rows on the account screen itself. v3 keeps one
 * control: the row scrolls past the page gutter, which is how a phone says
 * "there is more this way" without a second navigation pattern.
 *
 * Every number beside a door is COUNTED, not typed: orders from the fixtures
 * plus whatever was placed in this browser, unread notifications from
 * `lib/notifications.ts`, saved styles from the device list, addresses from
 * the book in Postgres — that last one counted on the server and passed in,
 * because a Client Component cannot read a database. A count that is written
 * down is a count that goes wrong the first time somebody uses the screen
 * under it.
 *
 * Sign-out is a form and not a link on purpose: it does something rather than
 * going somewhere, a link that logs you out is a link a browser may prefetch,
 * and the something is now a Server Action that clears a cookie the browser
 * cannot touch.
 */
export function AccountRail({ me, addressCount }: { me: Me; addressCount?: number }) {
  const catalog = useCatalog();
  const { list, ready: wishReady } = useWishlist();
  const { orders: placed } = usePlacedOrders();
  const { unread, ready: notifReady } = useNotifCenter(catalog, me);
  const active = railKeyOf(usePathname());

  const orders = fixtureOrdersOf(me).length + deviceOrdersOf(me.id, placed).length;
  // `ready` is false for one paint here. Nothing beats a zero: "0 mẫu đã lưu"
  // is a claim, and it would be wrong for that paint.
  const saved = wishReady ? resolveWishlist(catalog, demoNow(), list).items.length : undefined;

  return (
    <aside className="acctrail3">
      <div className="who">
        <span className="ava" aria-hidden="true">
          {initialsOf(me.name)}
        </span>
        <span className="txt">
          <b>{me.name}</b>
          {/* One token: the email and the number are read together, and the
              non-breaking spaces inside the number (lib/phone.ts) keep it
              from breaking mid-run. An account made a minute ago has no
              number yet — the first order is where one comes from — so the
              separator goes with it rather than trailing into nothing. */}
          <span>
            {me.email}
            {me.phone ? ` · ${formatPhone(me.phone)}` : ""}
          </span>
        </span>
      </div>

      <nav aria-label="Tài khoản">
        <RailLink href="/account" icon="user" on={active === "home"}>
          Tổng quan
        </RailLink>
        <RailLink href="/account/orders" icon="bag" on={active === "orders"} count={orders}>
          Đơn hàng
        </RailLink>
        <RailLink
          href="/account/notifications"
          icon="bell"
          on={active === "notifications"}
          {...(notifReady ? { count: unread, dot: unread > 0 } : {})}
        >
          Thông báo
        </RailLink>
        <RailLink
          href="/account/wishlist"
          icon="heart"
          on={active === "wishlist"}
          {...(saved !== undefined ? { count: saved } : {})}
        >
          Đã lưu
        </RailLink>
        <RailLink
          href="/account/addresses"
          icon="pin"
          on={active === "addresses"}
          {...(addressCount !== undefined ? { count: addressCount } : {})}
        >
          Địa chỉ
        </RailLink>
        <RailLink href="/account/profile" icon="edit" on={active === "profile"}>
          Hồ sơ
        </RailLink>
      </nav>

      {/* A div and not a `<p>`: a form is flow content and a paragraph may
          only hold phrasing content. `.out` is a class, so the spacing rule
          in account.css lands either way. */}
      <div className="out">
        <form action={signOut}>
          <button type="submit" className="lnk tap" style={{ fontSize: "var(--fs-sm)" }}>
            Đăng xuất
          </button>
        </form>
      </div>
    </aside>
  );
}

function RailLink({
  href,
  icon,
  on,
  count,
  dot,
  children,
}: {
  href: string;
  icon: IconName;
  on: boolean;
  count?: number;
  /** Something unread behind this door. Said with a dot AND with the count. */
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={on ? "on" : undefined} aria-current={on ? "page" : undefined}>
      <Icon name={icon} className="ic sm" />
      {children}
      {dot && <span className="dotn" aria-hidden="true" />}
      {count !== undefined && count > 0 && <span className="cnt">{count}</span>}
    </Link>
  );
}
