"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { backOrFollow } from "./back";
import { FeedIcon } from "./icon/FeedIcon";
import { cx } from "./useReveal";

export interface FeedMbarProps {
  /** The screen's name on the bar ("Các Số đã đóng", "Số 04"). */
  title: string;
  /** Where the arrow leads when there is no page of the shop to go back to. */
  back: string;
  /**
   * The screen's own big title, as a selector: while it is on screen the bar
   * shows no title of its own, and the bar's title fades in once it has
   * scrolled away (`title-late`, `title-on` — `archive.js`, `issue.js`).
   */
  watch?: string;
}

/**
 * A pushed screen's bar on the phone (`feed.js`: `renderMbar`): the back
 * arrow and the screen's name, sticky at the top where a tab root has the
 * brand bar. Gone from 900px, where the top bar carries the screen.
 *
 * With `watch`, the title is hidden from the server render on (`title-late`),
 * so it never shows and then fades on hydration; the frame's `<noscript>`
 * rule shows it where no script will ever watch the big one.
 */
export function FeedMbar({ title, back, watch }: FeedMbarProps) {
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
      <Link className="ib" href={back} aria-label="Quay lại" onClick={backOrFollow}>
        <FeedIcon name="caret-left" />
      </Link>
      <p className="mbar-title">{title}</p>
      <div className="mbar-acts" />
    </div>
  );
}
