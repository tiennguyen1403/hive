"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { picker, type Pair } from "@/lib/i18n";
import { backOrFollow } from "./back";
import { FeedLogo } from "./FeedLogo";
import { FeedIcon } from "./icon/FeedIcon";
import { ReadAllButton } from "./inbox";
import { cx } from "./useReveal";

export interface FeedMbarProps {
  /** The screen's name on the bar ("Các Số đã đóng", "Số 04", "Thanh toán"); none on the receipt's bar. */
  title?: string;
  /** Where the arrow leads when there is no page of the shop to go back to. */
  back: string;
  /**
   * The screen's own big title, as a selector: while it is on screen the bar
   * shows no title of its own, and the bar's title fades in once it has
   * scrolled away (`title-late`, `title-on` — `archive.js`, `issue.js`).
   */
  watch?: string;
  /**
   * The link's name: "Quay lại" ("Back" in English, round v6) unless the
   * screen says where it goes ("Về giỏ", "Đóng, về trang chủ").
   */
  label?: string;
  /** A cross instead of the arrow: the receipt closes rather than going back. */
  close?: boolean;
  /**
   * A plain link to `back`, never the browser's history: the checkout's way
   * to the basket, and the receipt's close — going back from a receipt would
   * land on a checkout with nothing left to pay for.
   */
  hard?: boolean;
  /**
   * Thông báo's bar (slice 4a): "Đánh dấu đã đọc" on its right while anything
   * on the page is unread (`notifications.js`: `acts`).
   */
  readAll?: boolean;
}

// ─────────────────────────────────────────── a screen that keeps the bar's title on (slice 4a)
/*
 * Tra cứu đơn keeps its title on the bar while an order stands where the form
 * was: the page's own heading is then only for assistive tech, and the order's
 * code is the heading on screen (`track.js`: `watchTitle(hero, has)`). The
 * screen sits below the bar, in the page, so it says so through this store.
 */
let titleForced = false;
const titleListeners = new Set<() => void>();

function forceTitle(on: boolean): void {
  if (titleForced === on) return;
  titleForced = on;
  for (const l of titleListeners) l();
}

function subscribeTitle(changed: () => void): () => void {
  titleListeners.add(changed);
  return () => titleListeners.delete(changed);
}

/** Keep the phone bar's title on while `on`, and let it go when the screen leaves. */
export function useMbarTitle(on: boolean): void {
  useEffect(() => {
    forceTitle(on);
  }, [on]);
  useEffect(() => () => forceTitle(false), []);
}

/**
 * A pushed screen's bar on the phone (`feed.js`: `renderMbar`, and the bars
 * `checkout.html` and `order-confirmed.html` bring themselves): the back arrow
 * — or the receipt's cross — and the screen's name, sticky at the top where a
 * tab root has the brand bar. Gone from 900px, where the top bar carries the
 * screen.
 *
 * With `watch`, the title is hidden from the server render on (`title-late`),
 * so it never shows and then fades on hydration; the frame's `<noscript>`
 * rule shows it where no script will ever watch the big one.
 */
export function FeedMbar({ title, back, watch, label, close = false, hard = false, readAll = false }: FeedMbarProps) {
  const t = picker(useLocale());
  const [on, setOn] = useState(false);
  const forced = useSyncExternalStore(subscribeTitle, () => titleForced, () => false);

  useEffect(() => {
    if (!watch || typeof IntersectionObserver === "undefined") {
      setOn(true);
      return;
    }
    const big = document.querySelector(watch);
    if (!big) {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(([en]) => setOn(!en!.isIntersecting), { rootMargin: "-56px 0px 0px 0px" });
    io.observe(big);
    return () => io.disconnect();
  }, [watch]);

  return (
    <div className={cx("mbar", watch && "title-late", (on || forced) && "title-on")}>
      <Link
        className="ib"
        href={back}
        aria-label={label ?? t({ vi: "Quay lại", en: "Back" })}
        {...(hard ? {} : { onClick: backOrFollow })}
      >
        <FeedIcon name={close ? "x" : "caret-left"} />
      </Link>
      {title !== undefined && <p className="mbar-title">{title}</p>}
      <div className="mbar-acts">{readAll && <ReadAllButton />}</div>
    </div>
  );
}

/**
 * The logo's name as a link home (round v6: in both languages), on every top
 * bar (`FeedChrome`) and on the 404's bar below.
 */
export const HOME_LINK: Pair = { vi: "HIVE, trang chủ", en: "HIVE, home" };

/**
 * The 404's own bar on the phone (`404.html`: `.mbar.b-mbar`): the logo
 * alone, like a tab root's, back to the home page — the black-and-white
 * lockup (QĐ-33) where the mock sets its italic word.
 */
export function FeedBrandBar() {
  const t = picker(useLocale());
  return (
    <div className="mbar b-mbar">
      <Link className="brand" href="/" aria-label={t(HOME_LINK)}>
        <FeedLogo className="logo" />
      </Link>
    </div>
  );
}
