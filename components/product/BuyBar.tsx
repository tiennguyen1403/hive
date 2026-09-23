"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icon/Icon";

interface BuyBarProps {
  /** The element the bar stands in for — `#buy-cta`. */
  watchId: string;
  /** "KHÓI" — the style, in the display face. */
  title: string;
  /** "390.000₫ · chưa chọn size". */
  detail: string;
  icon?: IconName;
  /** Shown on the button, and it names what pressing it does. */
  label: string;
  disabled?: boolean;
  onPress: () => void;
}

/**
 * The bar that rises once the real buy button has scrolled off the top.
 *
 * Phone only (`product.css` hides it from 900px, where the ticket is sticky
 * and the button never leaves). The two are never on screen at the same
 * time, so there is never a moment with two controls asking for the same tap.
 *
 * **A scroll listener, not an IntersectionObserver.** The observer only fires
 * when the element crosses the viewport edge, and a fast flick can carry the
 * button from below the fold to above it within one frame without ever
 * reporting a crossing — the bar then stays hidden all the way down the
 * page. Reading the rect on every scroll frame answers the real question,
 * "is it above me now", whatever route it took to get there.
 *
 * The read sits inside `requestAnimationFrame`, so a scroll that fires many
 * times per frame measures once, and the listener is `passive`, so it never
 * delays the scroll itself.
 *
 * v3 drops the thumbnail the v2 bar carried: the photo is what the page is
 * full of, and the bar's job is the name, the price and the button.
 */
export function BuyBar({
  watchId,
  title,
  detail,
  icon,
  label,
  disabled = false,
  onPress,
}: BuyBarProps) {
  const [show, setShow] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    const cta = document.getElementById(watchId);
    if (!cta) return;

    const check = () => {
      ticking.current = false;
      setShow(cta.getBoundingClientRect().bottom < 0);
    };
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(check);
    };

    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [watchId]);

  return (
    /* `aria-hidden` while it is off screen: the bar repeats a control that is
       already on the page, so a screen reader should meet it once — and
       `tabIndex={-1}` keeps Tab out of a button nobody can see. */
    <div className={show ? "buybar3 show" : "buybar3"} aria-hidden={!show}>
      <span className="who">
        <b>{title}</b>
        <span>{detail}</span>
      </span>
      <button
        type="button"
        className="btn"
        disabled={disabled}
        tabIndex={show ? undefined : -1}
        onClick={onPress}
      >
        {icon && <Icon name={icon} className="ic sm" />}
        {label}
      </button>
    </div>
  );
}
