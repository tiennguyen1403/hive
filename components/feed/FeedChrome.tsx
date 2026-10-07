"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";
import { useLocale } from "@/components/i18n/LocaleContext";
import type { Order } from "@/data/types";
import { setLocale } from "@/lib/actions/locale";
import { footDelivery, footHelp, footPayments, footSkipped } from "@/lib/feed-home";
import { LOCALE_PARAM, picker, plural, type Locale, type Pair } from "@/lib/i18n";
import { FEED_ZONE, feedFontClass } from "./FeedScope";
import { FeedLogo } from "./FeedLogo";
import { FeedBrandBar, FeedMbar, HOME_LINK, type FeedMbarProps } from "./FeedMbar";
import { FeedIcon, type FeedIconName } from "./icon/FeedIcon";
import { FeedToastProvider } from "./FeedToast";
import { InboxProvider, useInbox } from "./inbox";
import { NowProvider } from "./now";
import { QuickAddProvider } from "./QuickAdd";
import { cx } from "./useReveal";

/**
 * Which screen a Feed frame holds: it decides the tab bar's lit tab, the top
 * bar's filled icon, and whether the phone shows the brand bar (a tab root)
 * or leaves the top to the screen's own bar — the search field (`.sbar`),
 * the product page's controls over its photo (`.pbar`), a pushed screen's
 * back arrow and title (`mbar`: the closed issues, the checkout, the receipt).
 * The checkout's top bar from 900px is its own (`feed.js`: `PAGE ===
 * "checkout"`): its name in the middle and the way back to the basket.
 * Slice 3a adds the account's pushed screens — the orders, one order, the
 * address book — and the sign-in page: each lights Tôi, and on the phone
 * each has its own bar. Slice 3b adds Hồ sơ, pushed from Tôi the same way;
 * Tôi and Yêu thích are tab roots. Slice 4a adds Thông báo (its own bar; Tôi
 * lit below, the bell lit above, not Tôi) and Tra cứu đơn (Tôi lit, as the
 * mock's `TAB_OF` has `track: "me"`); the 404 is "other", nothing lit.
 * Slice 4b adds Hỏi đáp, Bảng size and Liên hệ, which light Tôi as the mock's
 * `help`, `size-guide` and `contact` do, and Giới thiệu, which the mock has no
 * page for: nothing lit. Round v6 slice P adds Quyền riêng tư, in Giới thiệu's
 * frame and with no mock either: nothing lit.
 */
export type FeedPage =
  | "home"
  | "products"
  | "product"
  | "search"
  | "archive"
  | "issue"
  | "cart"
  | "checkout"
  | "confirm"
  | "favorites"
  | "account"
  | "orders"
  | "order"
  | "addresses"
  | "profile"
  | "sign-in"
  | "notifications"
  | "track"
  | "help"
  | "size-guide"
  | "contact"
  | "about"
  | "privacy"
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
  checkout: null,
  confirm: null,
  favorites: "fav",
  account: "me",
  orders: "me",
  order: "me",
  addresses: "me",
  profile: "me",
  "sign-in": "me",
  notifications: "me",
  track: "me",
  help: "me",
  "size-guide": "me",
  contact: "me",
  about: null,
  privacy: null,
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
  /**
   * Help links the screen already carries, left out of the footer (the mock's
   * `data-foot-skip`, `footSkipped`): `/track` on the lookup page; `/faq` on
   * Hỏi đáp, which drops its return group's link too; `/faq#doi-tra` on a
   * style's page, which drops that one link.
   */
  footSkip?: readonly string[];
  /** The phone's bottom tab bar; screens with a bar of their own at the bottom turn it off. */
  tabbar?: boolean;
  /**
   * The screen brings a buy bar fixed to the phone's bottom edge in place of
   * the tab bar (the product page): the frame keeps room under the page for it.
   */
  buybar?: boolean;
  /**
   * A pushed screen's bar on the phone: the back arrow and its title
   * (`FeedMbar`) — or, for the 404, the logo alone (`"brand"`, `FeedBrandBar`).
   */
  mbar?: FeedMbarProps | "brand";
  /**
   * A class on the page's <main>, where the mock gives its own: the account
   * pages' `acc-layout` (the menu beside the page from 900px), the sign-in
   * page's `si-wrap` (the form beside a photo).
   */
  mainClass?: string;
  /** The signed-in account's orders, from the server: the inbox, and so the bell, reads them (`InboxProvider`). */
  orders: Order[];
  /** The rows read on this device, as the server found them in the cookie (`INBOX_READ_COOKIE`). */
  read: string;
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
 * tokens and type in the top layer too. The account's inbox is built here
 * too, once (`InboxProvider`, slice 4a): the bell above and Thông báo below
 * read the same rows.
 */
export function FeedShell({
  page,
  mid,
  foot = "full",
  footSkip = [],
  tabbar = true,
  buybar = false,
  mbar,
  mainClass,
  orders,
  read,
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
        <InboxProvider orders={orders} read={read}>
          <FeedToastProvider>
            <QuickAddProvider>
              <FeedTop page={page} mid={mid} tabbar={tabbar} />
              {mbar === "brand" ? <FeedBrandBar /> : mbar && <FeedMbar {...mbar} />}
              <main id="main" className={mainClass}>
                {children}
              </main>
              {foot !== "none" && <FeedFooter lite={foot === "lite"} skip={footSkip} />}
              {tabbar && <FeedTabbar page={page} />}
            </QuickAddProvider>
          </FeedToastProvider>
        </InboxProvider>
      </NowProvider>
      {/* Without script nothing would ever reveal the cards that wait for it, nor bring back a bar title that
          waits for the page's own to scroll away. Each selector is as specific as the rule it undoes
          (`.rv:not(.in)` in feed.css, `.mbar.title-late .mbar-title` in more.css) and wins by coming later; a bare
          `.rv` lost to `.rv:not(.in)` and the cards stayed invisible (round v6). */}
      <noscript>
        <style>{"[data-ui=feed] .rv:not(.in){opacity:1;transform:none}[data-ui=feed] .mbar.title-late .mbar-title{opacity:1}"}</style>
      </noscript>
    </div>
  );
}

const badge = (n: number) => (n > 99 ? "99+" : String(n));

/*
 * The chrome's words in both languages (round v6 slice E0, QĐ-40): each
 * `{ vi, en }` pair is written where it is printed, and the English is the
 * glossary's (`tasks/plan.md`, "Thuật ngữ tiếng Anh") wherever it has the
 * word. The few the frame prints in more than one place are named here, and
 * the logo's name as a link home (`HOME_LINK`) beside the 404's bar, which
 * prints it too.
 */

/** Giỏ, with its count or empty: the top bar's bag, the checkout's way back, the tab bar's bag. */
const bagLabel = (count: number): Pair =>
  count
    ? { vi: `Giỏ, ${count} món`, en: `Bag, ${plural(count, "item", "items")}` }
    : { vi: "Giỏ, đang trống", en: "Bag, empty" };

/** Each language's name in itself, for the switch's screen-reader name. */
const LANGUAGE_NAME: Record<Locale, string> = { vi: "Tiếng Việt", en: "English" };

/**
 * The language switch (round v6 slice E0, QĐ-40): first among the top bar's
 * icons, on every Feed screen's top bar — the checkout's own included — on
 * the phone as from 900px (the user approved the place on 01/10/2026). It
 * shows the code of the language it switches TO ("EN" while the page is
 * Vietnamese), and a screen reader hears that language's name in that
 * language, "English" or "Tiếng Việt", with its `lang`.
 *
 * A form posting the Server Action `setLocale`. With script the action sets
 * the cookie and the page is redrawn in place — the basket, a half-typed
 * form, an open sheet stay as they were; without script the browser posts
 * the form and the answer is the page in the other language. The button is
 * an `.ib`, the icons' own 44px box with their hover and ring, its text set
 * by `.ib-lang` (feed.css).
 */
function LangSwitch() {
  const to: Locale = useLocale() === "vi" ? "en" : "vi";
  return (
    <form action={setLocale} className="lang-form">
      <input type="hidden" name={LOCALE_PARAM} value={to} />
      <button className="ib ib-lang" type="submit" lang={to} aria-label={LANGUAGE_NAME[to]}>
        {to.toUpperCase()}
      </button>
    </form>
  );
}

/**
 * The top bar. On the phone the brand and the bell (the tab bar below carries
 * Giỏ with its count); from 900px the brand, the three shop tabs in the
 * middle and five icons — Tìm, Thông báo, Yêu thích, Giỏ with its count, Tôi.
 * The bell counts the account's unread rows (`useInbox`, slice 4a); signed
 * out it has no number (`feed.js`: `paintBell`). The language switch stands
 * before the icons (round v6 slice E0).
 */
function FeedTop({ page, mid, tabbar }: { page: FeedPage; mid: React.ReactNode; tabbar: boolean }) {
  const { units, ready: cartReady } = useCart();
  const { unread: bell } = useInbox();
  const t = picker(useLocale());
  const cart = cartReady ? units : 0;
  const tab = TAB_OF[page];
  const icon = (name: FeedIconName, on: boolean) => <FeedIcon name={on ? (`${name}-fill` as FeedIconName) : name} />;
  const cartLabel = t(bagLabel(cart));

  // The checkout's own bar: its name where the tabs would be, and the basket to go back to — no shop icons to wander
  // off by while paying (`feed.js`: `PAGE === "checkout"`).
  if (page === "checkout") {
    return (
      <header className="top" data-top={page}>
        <div className="top-in">
          <Link className="brand" href="/" aria-label={t(HOME_LINK)}>
            <FeedLogo className="logo" />
          </Link>
          <p className="top-title">{t({ vi: "Thanh toán", en: "Checkout" })}</p>
          <div className="acts">
            <LangSwitch />
            <Link className="top-back" href="/cart" data-cart-link="" aria-label={cartLabel}>
              <FeedIcon name="bag" />
              <span>{t({ vi: "Giỏ", en: "Bag" })}</span>
              {cart > 0 && <span className="badge">{badge(cart)}</span>}
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="top" data-top={ROOTS.includes(page) ? "brand" : page}>
      <div className="top-in">
        <Link className="brand" href="/" aria-label={t(HOME_LINK)}>
          <FeedLogo className="logo" />
        </Link>
        {mid ?? <LinkTabs page={page} />}
        <div className="acts">
          <LangSwitch />
          <Link
            className="ib only-desk"
            href="/search"
            aria-label={t({ vi: "Tìm", en: "Search" })}
            aria-current={page === "search" ? "page" : undefined}
          >
            {icon("magnifying-glass", page === "search")}
          </Link>
          <Link
            className="ib"
            href="/account/notifications"
            aria-label={
              bell
                ? t({ vi: `Thông báo, ${bell} chưa đọc`, en: `Notifications, ${bell} unread` })
                : t({ vi: "Thông báo", en: "Notifications" })
            }
            aria-current={page === "notifications" ? "page" : undefined}
          >
            {icon("bell", page === "notifications")}
            {bell > 0 && <span className="badge">{badge(bell)}</span>}
          </Link>
          <Link
            className="ib only-desk"
            href="/account/wishlist"
            aria-label={t({ vi: "Yêu thích", en: "Saved" })}
            aria-current={page === "favorites" ? "page" : undefined}
          >
            {icon("heart", page === "favorites")}
          </Link>
          <Link
            className={cx("ib", tabbar && "only-desk")}
            href="/cart"
            data-cart-link=""
            aria-label={cartLabel}
            aria-current={page === "cart" ? "page" : undefined}
          >
            {icon("bag", page === "cart")}
            {cart > 0 && <span className="badge">{badge(cart)}</span>}
          </Link>
          <Link
            className="ib only-desk"
            href="/account"
            aria-label={t({ vi: "Tôi", en: "Account" })}
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
  const t = picker(useLocale());
  return (
    <nav className="tabs links" aria-label={t({ vi: "Trang chủ", en: "Home" })}>
      <Link className="tab" href="/#bang-tin">
        <span>{t({ vi: "Bảng tin", en: "Feed" })}</span>
      </Link>
      <Link className="tab" href="/products" aria-current={page === "products" ? "page" : undefined}>
        <span>{t({ vi: "Cửa hàng", en: "Shop" })}</span>
      </Link>
      <Link className="tab" href="/#sap-mo">
        <span>{t({ vi: "Sắp mở", en: "Coming soon" })}</span>
      </Link>
    </nav>
  );
}

/** The phone's tab bar: Trang chủ, Tìm, Yêu thích, Giỏ with its count, Tôi. Gone from 900px. */
function FeedTabbar({ page }: { page: FeedPage }) {
  const { units, ready } = useCart();
  const t = picker(useLocale());
  const cart = ready ? units : 0;
  const on = TAB_OF[page];
  const item = (key: NonNullable<typeof on>, href: string, icon: FeedIconName, label: string) => {
    const current = on === key;
    return (
      <Link
        className="tb"
        href={href}
        aria-current={current ? "page" : undefined}
        {...(key === "cart" ? { "data-cart-link": "", "aria-label": t(bagLabel(cart)) } : {})}
      >
        <FeedIcon name={current ? (`${icon}-fill` as FeedIconName) : icon} />
        {key === "cart" && cart > 0 && <span className="badge">{badge(cart)}</span>}
        <span>{label}</span>
      </Link>
    );
  };
  return (
    <nav className="tabbar" aria-label={t({ vi: "Điều hướng chính", en: "Main navigation" })}>
      {item("home", "/", "house", t({ vi: "Trang chủ", en: "Home" }))}
      {item("search", "/search", "magnifying-glass", t({ vi: "Tìm", en: "Search" }))}
      {item("fav", "/account/wishlist", "heart", t({ vi: "Yêu thích", en: "Saved" }))}
      {item("cart", "/cart", "bag", t({ vi: "Giỏ", en: "Bag" }))}
      {item("me", "/account", "user", t({ vi: "Tôi", en: "Account" }))}
    </nav>
  );
}

/**
 * The footer: the logo, "Trợ giúp" — the mock's five help links and, since
 * round v6 slice P, "Quyền riêng tư", less the ones the screen already
 * carries (`footSkipped`) — and, unless `lite`,
 * "Giao hàng" and "Thanh toán", every figure from `lib/shipping.ts`
 * (`feed.js`: `footer`). In the page's language since round v6: the help
 * links, the delivery and payment rows come from `lib/feed-home.ts` in it,
 * each row keyed by its place so a switch redraws the same rows.
 */
export function FeedFooter({ lite = false, skip = [] }: { lite?: boolean; skip?: readonly string[] }) {
  const locale = useLocale();
  const t = picker(locale);
  return (
    <footer className={cx("foot", lite && "foot-lite")}>
      <div className="foot-in">
        <div className="foot-brand">
          <FeedLogo className="logo" />
          <span className="sr-only">HIVE</span>
        </div>
        <nav aria-labelledby="foot-help">
          <h2 id="foot-help">{t({ vi: "Trợ giúp", en: "Help" })}</h2>
          <ul className="foot-links">
            {footHelp(locale)
              .filter((h) => !footSkipped(h.href, skip))
              .map((h) => (
                <li key={h.href}>
                  <Link href={h.href}>{h.label}</Link>
                </li>
              ))}
          </ul>
        </nav>
        {!lite && (
          <>
            <div>
              <h2>{t({ vi: "Giao hàng", en: "Delivery" })}</h2>
              <ul className="foot-facts">
                {footDelivery(locale).map((f, i) => (
                  <li key={i}>
                    <span>{f.label}</span>
                    {f.value && <b>{f.value}</b>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2>{t({ vi: "Thanh toán", en: "Payment" })}</h2>
              <ul className="foot-facts">
                {footPayments(locale).map((f, i) => (
                  <li key={i}>
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
