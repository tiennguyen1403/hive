"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { backOrFollow } from "./back";
import { FeedIcon } from "./icon/FeedIcon";
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
  /** The link's name: "Quay lại" unless the screen says where it goes ("Về giỏ", "Đóng, về trang chủ"). */
  label?: string;
  /** A cross instead of the arrow: the receipt closes rather than going back. */
  close?: boolean;
  /**
   * A plain link to `back`, never the browser's history: the checkout's way
   * to the basket, and the receipt's close — going back from a receipt would
   * land on a checkout with nothing left to pay for.
   */
  hard?: boolean;
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
export function FeedMbar({ title, back, watch, label, close = false, hard = false }: FeedMbarProps) {
  const [on, setOn] = useState(false);

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
    <div className={cx("mbar", watch && "title-late", on && "title-on")}>
      <Link className="ib" href={back} aria-label={label ?? "Quay lại"} {...(hard ? {} : { onClick: backOrFollow })}>
        <FeedIcon name={close ? "x" : "caret-left"} />
      </Link>
      {title !== undefined && <p className="mbar-title">{title}</p>}
      <div className="mbar-acts" />
    </div>
  );
}
