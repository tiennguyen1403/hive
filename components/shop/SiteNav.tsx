"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon/Icon";
import { useCart } from "@/components/cart/CartContext";
import { useMe } from "@/components/account/MeContext";
import { useWishlist } from "@/components/account/WishlistContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { FAMILY_SHORT_LABELS, type Family } from "@/data/types";
import { closesInLabel, featuredDrop, opensInLabel } from "@/lib/drop";
import { issueLabel } from "@/lib/lexicon";
import { demoNow } from "@/lib/clock";

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
  /** Lights the "Số NN" link — the listing with no family narrowing it. */
  activeDrop?: boolean;
}

/**
 * The bar at the top of every shopper-facing page.
 *
 * What it has to say, in the order it says it: whose shop this is, what is
 * on sale, how long is left, and the four things a shopper reaches for.
 *
 * THE ISSUE STAMP is the only black cloth in the bar, and it is the same
 * material as the cover further down the page — so the chrome and the thing
 * it is announcing read as one object rather than as a header above a hero.
 * On the phone it says only WHICH issue; from 900px the countdown joins it
 * inside the stamp, where there is room for it.
 *
 * `activeFamily` is passed in by the page rather than read from the URL here.
 * `useSearchParams` in a component that sits on every route would drag the
 * whole tree out of the static shell for the sake of one underline.
 *
 * The countdown is the one thing rendered only in the browser. The server
 * frame is built once and can be served an hour later; a clock printed into
 * it would be an hour wrong, and React would throw the tree away on
 * hydration for disagreeing with it.
 */
export function SiteNav({ activeFamily, activeDrop = false }: SiteNavProps) {
  const { units, ready: cartReady } = useCart();
  const { list, ready: wishReady } = useWishlist();
  const me = useMe();
  const catalog = useCatalog();

  const { drop, state } = featuredDrop(catalog, undefined);
  const label = issueLabel(drop.no);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (state === "CLOSED") return;

    const tick = () => {
      const now = demoNow();
      setCountdown(
        state === "OPEN"
          ? closesInLabel(drop.closesAt, now)
          : opensInLabel(drop.opensAt, now),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [drop, state]);

  const wish = wishReady ? list.length : 0;
  const cart = cartReady ? units : 0;
  const stampTone = state === "OPEN" ? "" : state === "UPCOMING" ? " soon" : " shut";
  // An open issue is somewhere to shop; one that has not opened is the
  // teaser at the foot of the home page; one that has shut has its own
  // record at `/so/N` (v3 slice 4).
  const dropHref =
    state === "OPEN" ? "/products" : state === "CLOSED" ? `/so/${drop.no}` : "/#next";

  return (
    <header className="nav3">
      <div className="in">
        <Link className="wm nm" href="/">
          HIVE
        </Link>

        <nav className="links" aria-label="Danh mục">
          <Link
            className={activeDrop ? "on" : ""}
            href="/products"
            aria-current={activeDrop ? "page" : undefined}
          >
            {label}
          </Link>
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

        {/* Colour is never the only channel: the dot has a word beside it,
            and the word is the issue's own state rather than a tone. */}
        <Link className={`itag${stampTone}`} href={dropHref}>
          <i aria-hidden="true" />
          {label}
          <span className="cd">
            {countdown ? ` · ${countdown}` : state === "CLOSED" ? " · đã đóng" : ""}
          </span>
        </Link>

        <div className="icons">
          <Link className="ib" href="/search" aria-label="Tìm kiếm">
            <Icon name="search" className="ic" />
          </Link>

          <Link
            className="ib"
            href="/account/wishlist"
            aria-label={wish > 0 ? `Đã lưu, ${wish} mẫu` : "Đã lưu"}
          >
            <Icon name="heart" bulk={wish > 0} className="ic" />
            {wish > 0 && <b>{wish}</b>}
          </Link>

          {/* Where the account icon leads depends on who is here: sending a
              signed-out visitor to /account only to bounce them is a wasted
              tap. Since slice B1 the answer comes from the server with the
              page, so the icon is never briefly wrong. */}
          <Link
            className="ib"
            href={me ? "/account" : "/sign-in"}
            aria-label={me ? `Tài khoản của ${me.name}` : "Đăng nhập"}
          >
            <Icon name="user" bulk={me !== null} className="ic" />
          </Link>

          {/* The bag has no label beside it, so "there is something in here"
              has to be carried by more than colour: solid icon plus a
              number. */}
          <Link
            className="ib"
            href="/cart"
            aria-label={cart > 0 ? `Giỏ, ${cart} món` : "Giỏ, đang trống"}
          >
            <Icon name="bag" bulk={cart > 0} className="ic" />
            {cart > 0 && <b>{cart}</b>}
          </Link>
        </div>
      </div>
    </header>
  );
}
