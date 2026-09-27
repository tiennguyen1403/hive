"use client";

import Link from "next/link";
import { useMe } from "@/components/account/MeContext";
import { useNotifCenter } from "@/components/account/notif-center";
import { useCart } from "@/components/cart/CartContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Order } from "@/data/types";
import { FOOT_HELP, footDelivery, footPayments } from "@/lib/feed-home";
import { FEED_ZONE, feedFontClass } from "./FeedScope";
import { FeedLogo } from "./FeedLogo";
import { FeedMbar, type FeedMbarProps } from "./FeedMbar";
import { FeedIcon, type FeedIconName } from "./icon/FeedIcon";
import { NowProvider } from "./now";
import { QuickAddProvider } from "./QuickAdd";
import { cx } from "./useReveal";

/**
 * Which screen a Feed frame holds: it decides the tab bar's lit tab, the top
 * bar's filled icon, and whether the phone shows the brand bar (a tab root)
 * or leaves the top to the screen's own bar — the search field (`.sbar`),
 * the product page's controls over its photo (`.pbar`), a pushed screen's
 * back arrow and title (`mbar`, the closed issues).
 */
export type FeedPage =
  | "home"
  | "products"
  | "product"
  | "search"
  | "archive"
  | "issue"
  | "cart"
  | "favorites"
  | "account"
  | "notifications"
  | "other";

/** The five tab bar destinations and the pages each one lights (`feed.js`: `TAB_OF`). */
const TAB_OF: Record<FeedPage, "home" | "search" | "fav" | "cart" | "me" | null> = {
  home: "home",
  products: "home",
  product: null,
  archive: "home",
  issue: "home",
  search: "search",
  cart: "cart",
  favorites: "fav",
  account: "me",
  notifications: "me",
  other: null,
};

/** The tab roots: the phone shows them the brand bar (`feed.js`: `ROOTS`). */
const ROOTS: readonly FeedPage[] = ["home", "products", "cart", "favorites", "account"];

export interface FeedShellProps {
  page: FeedPage;
  /** The top bar's middle: the home page's tabs. Other screens get the three links to them. */
  mid?: React.ReactNode;
  /** The whole footer, the light one (help links only), or none. */
  foot?: "full" | "lite" | "none";
  /** Help links the screen already carries (`/track` on the lookup page), left out of the footer. */
  footSkip?: readonly string[];
  /** The phone's bottom tab bar; screens with a bar of their own at the bottom turn it off. */
  tabbar?: boolean;
  /**
   * The screen brings a buy bar fixed to the phone's bottom edge in place of
   * the tab bar (the product page): the frame keeps room under the page for it.
   */
  buybar?: boolean;
  /** A pushed screen's bar on the phone: the back arrow and its title (`FeedMbar`). */
  mbar?: FeedMbarProps;
  /** The signed-in account's orders, from the server: the bell's unread count reads them. */
  orders: Order[];
  /** The render instant (`NowProvider`). */
  now: number;
  children: React.ReactNode;
}

/**
 * The Feed frame's client half (`FeedFrame` is the server half): the zone
 * root, which is the mock's <body> — a column at least a window tall, room
 * kept under it for the phone's tab bar — and in it the top bar, the screen,
 * the footer and the tab bar (`feed.js`: `renderChrome`, `footer`).
 *
 * The zone root takes `suppressHydrationWarning` for one attribute: the home
 * page's script writes `data-tab` on it before the first paint, from the
 * address's hash, so the right tab shows before React arrives.
 *
 * Every Feed control that opens a sheet finds the quick add here
 * (`QuickAddProvider`), inside the zone, so its <dialog>s inherit the zone's
 * tokens and type in the top layer too.
 */
export function FeedShell({
  page,
  mid,
  foot = "full",
  footSkip = [],
  tabbar = true,
  buybar = false,
  mbar,
  orders,
  now,
  children,
}: FeedShellProps) {
  return (
    <div
      {...FEED_ZONE}
      className={cx(feedFontClass, "feed-frame", tabbar && "has-tabbar", buybar && "has-buybar")}
      suppressHydrationWarning
    >
      <NowProvider now={now}>
        <QuickAddProvider>
          <FeedTop page={page} mid={mid} tabbar={tabbar} orders={orders} />
          {mbar && <FeedMbar {...mbar} />}
          <main id="main">{children}</main>
          {foot !== "none" && <FeedFooter lite={foot === "lite"} skip={footSkip} />}
          {tabbar && <FeedTabbar page={page} />}
        </QuickAddProvider>
      </NowProvider>
      {/* Without script nothing would ever reveal the cards that wait for it, nor bring back a bar title that
          waits for the page's own to scroll away. */}
      <noscript>
        <style>{"[data-ui=feed] .rv{opacity:1;transform:none}[data-ui=feed] .mbar.title-late .mbar-title{opacity:1}"}</style>
      </noscript>
    </div>
  );
}

const badge = (n: number) => (n > 99 ? "99+" : String(n));

/**
 * The top bar. On the phone the brand and the bell (the tab bar below carries
 * Giỏ with its count); from 900px the brand, the three shop tabs in the
 * middle and five icons — Tìm, Thông báo, Yêu thích, Giỏ with its count, Tôi.
 */
function FeedTop({
  page,
  mid,
  tabbar,
  orders,
}: {
  page: FeedPage;
  mid: React.ReactNode;
  tabbar: boolean;
  orders: Order[];
}) {
  const { units, ready: cartReady } = useCart();
  const me = useMe();
  const catalog = useCatalog();
  const { unread, ready: notifReady } = useNotifCenter(catalog, me, orders);
  const cart = cartReady ? units : 0;
  const bell = notifReady ? unread : 0;
  const tab = TAB_OF[page];
  const icon = (name: FeedIconName, on: boolean) => <FeedIcon name={on ? (`${name}-fill` as FeedIconName) : name} />;

  return (
    <header className="top" data-top={ROOTS.includes(page) ? "brand" : page}>
      <div className="top-in">
        <Link className="brand" href="/" aria-label="HIVE, trang chủ">
          <FeedLogo className="logo" />
        </Link>
        {mid ?? <LinkTabs page={page} />}
        <div className="acts">
          <Link
            className="ib only-desk"
            href="/search"
            aria-label="Tìm"
            aria-current={page === "search" ? "page" : undefined}
          >
            {icon("magnifying-glass", page === "search")}
          </Link>
          <Link
            className="ib"
            href="/account/notifications"
            aria-label={bell ? `Thông báo, ${bell} chưa đọc` : "Thông báo"}
            aria-current={page === "notifications" ? "page" : undefined}
          >
            {icon("bell", page === "notifications")}
            {bell > 0 && <span className="badge">{badge(bell)}</span>}
          </Link>
          <Link
            className="ib only-desk"
            href="/account/wishlist"
            aria-label="Yêu thích"
            aria-current={page === "favorites" ? "page" : undefined}
          >
            {icon("heart", page === "favorites")}
          </Link>
          <Link
            className={cx("ib", tabbar && "only-desk")}
            href="/cart"
            data-cart-link=""
            aria-label={cart ? `Giỏ, ${cart} món` : "Giỏ, đang trống"}
            aria-current={page === "cart" ? "page" : undefined}
          >
            {icon("bag", page === "cart")}
            {cart > 0 && <span className="badge">{badge(cart)}</span>}
          </Link>
          <Link
            className="ib only-desk"
            href="/account"
            aria-label="Tôi"
            aria-current={tab === "me" && page !== "notifications" ? "true" : undefined}
          >
            {icon("user", tab === "me" && page !== "notifications")}
          </Link>
        </div>
      </div>
    </header>
  );
}

/** The three shop tabs as links, for every screen but the home page (from 900px only). */
function LinkTabs({ page }: { page: FeedPage }) {
  return (
    <nav className="tabs links" aria-label="Trang chủ">
      <Link className="tab" href="/#bang-tin">
        <span>Bảng tin</span>
      </Link>
      <Link className="tab" href="/products" aria-current={page === "products" ? "page" : undefined}>
        <span>Cửa hàng</span>
      </Link>
      <Link className="tab" href="/#sap-mo">
        <span>Sắp mở</span>
      </Link>
    </nav>
  );
}

/** The phone's tab bar: Trang chủ, Tìm, Yêu thích, Giỏ with its count, Tôi. Gone from 900px. */
function FeedTabbar({ page }: { page: FeedPage }) {
  const { units, ready } = useCart();
  const cart = ready ? units : 0;
  const on = TAB_OF[page];
  const item = (key: NonNullable<typeof on>, href: string, icon: FeedIconName, label: string) => {
    const current = on === key;
    return (
      <Link
        className="tb"
        href={href}
        aria-current={current ? "page" : undefined}
        {...(key === "cart"
          ? { "data-cart-link": "", "aria-label": cart ? `Giỏ, ${cart} món` : "Giỏ, đang trống" }
          : {})}
      >
        <FeedIcon name={current ? (`${icon}-fill` as FeedIconName) : icon} />
        {key === "cart" && cart > 0 && <span className="badge">{badge(cart)}</span>}
        <span>{label}</span>
      </Link>
    );
  };
  return (
    <nav className="tabbar" aria-label="Điều hướng chính">
      {item("home", "/", "house", "Trang chủ")}
      {item("search", "/search", "magnifying-glass", "Tìm")}
      {item("fav", "/account/wishlist", "heart", "Yêu thích")}
      {item("cart", "/cart", "bag", "Giỏ")}
      {item("me", "/account", "user", "Tôi")}
    </nav>
  );
}

/**
 * The footer: the logo, "Trợ giúp", and — unless `lite` — "Giao hàng" and
 * "Thanh toán", every figure from `lib/shipping.ts` (`feed.js`: `footer`).
 * The mock's "Bảng size" link waits for its route (slice 4).
 */
export function FeedFooter({ lite = false, skip = [] }: { lite?: boolean; skip?: readonly string[] }) {
  return (
    <footer className={cx("foot", lite && "foot-lite")}>
      <div className="foot-in">
        <div className="foot-brand">
          <FeedLogo className="logo" />
          <span className="sr-only">HIVE</span>
        </div>
        <nav aria-labelledby="foot-help">
          <h2 id="foot-help">Trợ giúp</h2>
          <ul className="foot-links">
            {FOOT_HELP.filter((h) => !skip.includes(h.href)).map((h) => (
              <li key={h.href}>
                <Link href={h.href}>{h.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        {!lite && (
          <>
            <div>
              <h2>Giao hàng</h2>
              <ul className="foot-facts">
                {footDelivery().map((f) => (
                  <li key={f.label}>
                    <span>{f.label}</span>
                    {f.value && <b>{f.value}</b>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2>Thanh toán</h2>
              <ul className="foot-facts">
                {footPayments().map((f) => (
                  <li key={f.label}>
                    <span>{f.label}</span>
                    {f.value && <b>{f.value}</b>}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </footer>
  );
}
