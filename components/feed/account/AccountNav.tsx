import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { FeedIcon, type FeedIconName } from "../icon/FeedIcon";
import { SIGNED_OUT_HOME } from "./SignOut";

/** The account's pages, as the menu lists them. */
export type AccountNavKey = "account" | "orders" | "favorites" | "notifications" | "addresses" | "profile";

/** `feed.js`: `ACC_NAV`, pointed at the app's routes. */
const ITEMS: readonly [AccountNavKey, string, FeedIconName, string][] = [
  ["account", "/account", "user", "Tôi"],
  ["orders", "/account/orders", "package", "Đơn hàng"],
  ["favorites", "/account/wishlist", "heart", "Yêu thích"],
  ["notifications", "/account/notifications", "bell", "Thông báo"],
  ["addresses", "/account/addresses", "map-pin", "Địa chỉ"],
  ["profile", "/account/profile", "identification-card", "Hồ sơ"],
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
 * the mock's `signOut()` does (slice 3b; until then the home page).
 */
export function AccountNav({ on, signedIn }: { on: AccountNavKey; signedIn: boolean }) {
  return (
    <aside className="acc-nav">
      <nav className="acc-menu" aria-label="Tài khoản">
        {ITEMS.map(([key, href, icon, label]) => {
          const lit = on === key;
          return (
            <Link key={key} className="acc-item" href={href} aria-current={lit ? "page" : undefined}>
              <FeedIcon name={lit && FILLED.has(icon) ? (`${icon}-fill` as FeedIconName) : icon} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      {signedIn && (
        <form action={signOut}>
          <input type="hidden" name="next" value={SIGNED_OUT_HOME} />
          <button className="acc-item acc-out" type="submit">
            <FeedIcon name="sign-out" />
            <span>Đăng xuất</span>
          </button>
        </form>
      )}
    </aside>
  );
}
