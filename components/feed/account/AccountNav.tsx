import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { picker, type Locale, type Pair } from "@/lib/i18n";
import { FeedIcon, type FeedIconName } from "../icon/FeedIcon";
import { SIGNED_OUT_HOME } from "./SignOut";

/** The account's pages, as the menu lists them. */
export type AccountNavKey = "account" | "orders" | "favorites" | "notifications" | "addresses" | "profile";

/**
 * `feed.js`: `ACC_NAV`, pointed at the app's routes. In English (round v6
 * slice E3a) the glossary's "Account", "Saved", "Notifications", and "Orders",
 * "Addresses", "Profile".
 */
const ITEMS: readonly [AccountNavKey, string, FeedIconName, Pair][] = [
  ["account", "/account", "user", { vi: "Tôi", en: "Account" }],
  ["orders", "/account/orders", "package", { vi: "Đơn hàng", en: "Orders" }],
  ["favorites", "/account/wishlist", "heart", { vi: "Yêu thích", en: "Saved" }],
  ["notifications", "/account/notifications", "bell", { vi: "Thông báo", en: "Notifications" }],
  ["addresses", "/account/addresses", "map-pin", { vi: "Địa chỉ", en: "Addresses" }],
  ["profile", "/account/profile", "identification-card", { vi: "Hồ sơ", en: "Profile" }],
];

/** The glyphs that fill on the lit item (`feed.js`: `FILLED`); the pin and the card have no filled weight here. */
const FILLED: ReadonlySet<FeedIconName> = new Set<FeedIconName>(["user", "package", "heart", "bell"]);

/**
 * The account menu (`feed.js`: `renderAccNav`): the left column of the
 * account pages from 900px (`.acc-layout`), gone on the phone, which reaches
 * the same pages from Tôi. The page's own item is lit — an order's page lights
 * "Đơn hàng" (`ACC_OF`) — and "Đăng xuất" closes the list while signed in.
 * Signed out, the page itself offers the way in, so the menu does not.
 *
 * No state and no script: the links are links, and "Đăng xuất" is a form
 * posting the Server Action that signs out — landing on Tôi, signed out, as
 * the mock's `signOut()` does (slice 3b; until then the home page). In the
 * page's language since round v6 slice E3a, which the page hands down.
 */
export function AccountNav({ on, signedIn, locale }: { on: AccountNavKey; signedIn: boolean; locale: Locale }) {
  const t = picker(locale);
  return (
    <aside className="acc-nav">
      <nav className="acc-menu" aria-label={t({ vi: "Tài khoản", en: "Account" })}>
        {ITEMS.map(([key, href, icon, label]) => {
          const lit = on === key;
          return (
            <Link key={key} className="acc-item" href={href} aria-current={lit ? "page" : undefined}>
              <FeedIcon name={lit && FILLED.has(icon) ? (`${icon}-fill` as FeedIconName) : icon} />
              <span>{t(label)}</span>
            </Link>
          );
        })}
      </nav>
      {signedIn && (
        <form action={signOut}>
          <input type="hidden" name="next" value={SIGNED_OUT_HOME} />
          <button className="acc-item acc-out" type="submit">
            <FeedIcon name="sign-out" />
            <span>{t({ vi: "Đăng xuất", en: "Sign out" })}</span>
          </button>
        </form>
      )}
    </aside>
  );
}
