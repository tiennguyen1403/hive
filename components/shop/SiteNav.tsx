"use client";

import Link from "next/link";
import { Icon } from "@/components/icon/Icon";
import { useCart } from "@/components/cart/CartContext";
import { useMe } from "@/components/account/MeContext";
import { useWishlist } from "@/components/account/WishlistContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { NavLogo } from "@/components/shop/NavLogo";
import { FAMILY_SHORT_LABELS, type Family } from "@/data/types";
import { featuredDrop } from "@/lib/drop";
import { issueLabel, plateLabel } from "@/lib/lexicon";

/**
 * The five families the bar links to.
 *
 * Five and not six: no issue has carried a gile since 04, and a bar is the
 * one place where a link that usually leads nowhere costs more than it
 * earns. The words come from `FAMILY_SHORT_LABELS`, which the home page's
 * tiles read too, so a rename lands in both at once.
 */
const NAV_FAMILIES: Family[] = ["TEE", "HOODIE", "JACKET", "SHIRT", "PANTS"];

export interface SiteNavProps {
  /** Underlines one family link. The listing reads it out of `?family=`. */
  activeFamily?: Family | undefined;
  /**
   * Lights the issue plate: the listing with no family narrowing it, which
   * is where the plate leads. The plate took this over from the "Số NN"
   * link that headed the families until v3 slice 8. With no issue on sale
   * there is no plate to light, and the flag changes nothing.
   */
  activeDrop?: boolean;
}

/**
 * The bar at the top of every shopper-facing page.
 *
 * Three groups, read left to right and reached by Tab in the same order,
 * because that is the order they sit in here: whose shop this is (the logo),
 * what is on sale (the issue plate, then the five families), and the four
 * things a shopper reaches for. From 900px the middle group stands in the
 * middle of the bar; on the phone the families go and the plate stays beside
 * the logo.
 *
 * THE ISSUE PLATE is the only black cloth in the bar, the same material as
 * the cover further down the page, so the chrome and the thing it announces
 * read as one object. It is the link to the issue on sale, `/products`, and
 * it prints only WHICH issue. It is there ONLY while an issue is on sale
 * (the user, 24/09/2026: show the plate only while an issue is active):
 * before the next issue opens and after the last one shuts, the bar is the
 * logo, the families (from 900px) and the four buttons, and the cover and
 * the footer's calendar say what comes next. So the plate has one state and
 * one colour, honey letters on the cloth; `plateLabel()` still names it in
 * full ("Số 05, đang bán") for a screen reader and for the tooltip. The bar
 * keeps no clock; the cover, the listing's head line and the footer's
 * calendar say how long is left.
 *
 * `activeFamily` and `activeDrop` are passed in by the page rather than read
 * from the URL here. `useSearchParams` in a component that sits on every
 * route would drag the whole tree out of the static shell for the sake of one
 * underline.
 *
 * The two counts are the one thing only the browser can fill in: the saved
 * list and the bag live on the device, so the server frame draws no bubble
 * and the numbers arrive once their providers are `ready`.
 */
export function SiteNav({ activeFamily, activeDrop = false }: SiteNavProps) {
  const { units, ready: cartReady } = useCart();
  const { list, ready: wishReady } = useWishlist();
  const me = useMe();
  const catalog = useCatalog();

  // The same pick as the home page's cover: the issue selling now, else the
  // next one, else the last. Only the first gets a plate.
  const { drop, state } = featuredDrop(catalog, undefined);
  const onSale = state === "OPEN";

  const wish = wishReady ? list.length : 0;
  const cart = cartReady ? units : 0;

  return (
    <header className="nav3">
      <div className="in">
        <Link className="wm" href="/" aria-label="HIVE, trang chủ">
          <NavLogo />
        </Link>

        {onSale && (
          <Link
            className={activeDrop ? "itag on" : "itag"}
            href="/products"
            aria-label={plateLabel(drop.no, state)}
            title={plateLabel(drop.no, state)}
            aria-current={activeDrop ? "page" : undefined}
          >
            {issueLabel(drop.no)}
          </Link>
        )}

        <nav className="links" aria-label="Danh mục">
          {NAV_FAMILIES.map((f) => (
            <Link
              key={f}
              href={`/products?family=${f}`}
              className={activeFamily === f ? "on" : ""}
              aria-current={activeFamily === f ? "page" : undefined}
            >
              {FAMILY_SHORT_LABELS[f]}
            </Link>
          ))}
        </nav>

        {/* All four glyphs stay Linear whatever the count and whoever is
            signed in (24/09/2026). What changed is said by the honey bubble
            and by each link's name, never by the glyph. */}
        <div className="icons">
          <Link className="ib" href="/search" aria-label="Tìm kiếm">
            <Icon name="search" className="ic" />
          </Link>

          <Link
            className="ib"
            href="/account/wishlist"
            aria-label={wish > 0 ? `Đã lưu, ${wish} mẫu` : "Đã lưu"}
          >
            <Icon name="heart" className="ic" />
            {wish > 0 && <b>{wish}</b>}
          </Link>

          {/* Where the account icon leads depends on who is here: sending a
              signed-out visitor to /account only to bounce them is a wasted
              tap. Since slice B1 the answer comes from the server with the
              page, so the link is never briefly wrong. */}
          <Link
            className="ib"
            href={me ? "/account" : "/sign-in"}
            aria-label={me ? `Tài khoản của ${me.name}` : "Đăng nhập"}
          >
            <Icon name="user" className="ic" />
          </Link>

          {/* The bag has no label beside it, so "there is something in here"
              is carried by a number and by the link's name rather than by
              colour alone. */}
          <Link
            className="ib"
            href="/cart"
            aria-label={cart > 0 ? `Giỏ, ${cart} món` : "Giỏ, đang trống"}
          >
            <Icon name="bag" className="ic" />
            {cart > 0 && <b>{cart}</b>}
          </Link>
        </div>
      </div>
    </header>
  );
}
