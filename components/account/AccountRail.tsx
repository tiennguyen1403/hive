"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icon/Icon";
import { usePlacedOrders } from "@/components/shop/placed-order";
import { ordersOf } from "@/data/orders";
import type { Customer } from "@/data/types";
import { addressBookFor } from "@/lib/address-book";
import { initialsOf } from "@/lib/initials";
import { deviceOrdersOf } from "@/lib/order-rows";
import { formatPhone } from "@/lib/phone";
import { useCatalog } from "@/components/shop/CatalogContext";
import { resolveWishlist } from "@/lib/wishlist";
import { useAddressBook } from "./AddressBookContext";
import { useNotifCenter } from "./notif-center";
import { useSession } from "./SessionContext";
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
 * the book. A count that is written down is a count that goes wrong the
 * first time somebody uses the screen under it.
 *
 * Sign-out is a `<button>` among six `<a>`s on purpose. It does something
 * rather than going somewhere, and a link that logs you out is a link a
 * browser may prefetch.
 */
export function AccountRail({ me, active }: { me: Customer; active?: RailKey }) {
  const { signOut } = useSession();
  const catalog = useCatalog();
  const { list, ready: wishReady } = useWishlist();
  const { device, ready: bookReady } = useAddressBook();
  const { orders: placed } = usePlacedOrders();
  const { unread, ready: notifReady } = useNotifCenter(catalog, me);
  const router = useRouter();

  const orders = ordersOf(me.id).length + deviceOrdersOf(me.id, placed).length;
  // `ready` is false for one paint on each of these. Nothing beats a zero:
  // "0 mẫu đã lưu" is a claim, and it would be wrong for that paint.
  const saved = wishReady ? resolveWishlist(catalog, demoNow(), list).items.length : undefined;
  const addresses = bookReady ? addressBookFor(me, device).length : undefined;

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
              from breaking mid-run. */}
          <span>
            {me.email} · {formatPhone(me.phone)}
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
          {...(addresses !== undefined ? { count: addresses } : {})}
        >
          Địa chỉ
        </RailLink>
        <RailLink href="/account/profile" icon="edit" on={active === "profile"}>
          Hồ sơ
        </RailLink>
      </nav>

      <p className="out">
        <button
          type="button"
          className="lnk tap"
          style={{ fontSize: "var(--fs-sm)" }}
          onClick={() => {
            signOut();
            router.replace("/");
          }}
        >
          Đăng xuất
        </button>
      </p>
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
