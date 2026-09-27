"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "./useReveal";

interface FeedSheetProps {
  open: boolean;
  /** Asked to close: Escape, a tap on the backdrop, or any control marked `data-close`. */
  onClose: () => void;
  /** Once it has closed, the closing played out — where a following sheet opens. */
  onClosed?: () => void;
  /** The id of the sheet's title. */
  labelledBy: string;
  /** A variant, as a class: `at-bag` (the added sheet under the bag, from 900px), `drop` (the sort menu). */
  variant?: string | undefined;
  /** Where focus goes back to when it closes: the control that opened it. */
  back?: HTMLElement | null | undefined;
  /** Inline position, for the one variant that follows its opener (`drop`). */
  place?: { top: number; left: number } | undefined;
  children: React.ReactNode;
}

/**
 * A Feed sheet: a native modal <dialog> that springs up from the bottom on the
 * phone and is a centred dialog from 900px (`feed.js`: `makeSheet`,
 * `openSheet`, `closeSheet`). The browser gives the modal its focus trap, its
 * inert page and its top layer; the stylesheet gives the spring.
 *
 * Rendered inside the Feed zone, so it inherits the zone's tokens and Mona
 * Sans in the top layer too. While any sheet is open the page does not
 * scroll (`html:has(… dialog[open])`), and the scrollbar's width becomes the
 * body's padding so nothing shifts sideways.
 *
 * Closing plays the sheet down (or out) in 210ms before the dialog closes;
 * with reduced motion it closes at once. Focus goes back to `back`.
 */
export function FeedSheet({ open, onClose, onClosed, labelledBy, variant, back, place, children }: FeedSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const timer = useRef(0);

  // The latest callbacks, for the listeners attached once below.
  const latest = useRef({ onClose, onClosed, back });
  useEffect(() => {
    latest.current = { onClose, onClosed, back };
  });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      window.clearTimeout(timer.current);
      setClosing(false);
      if (!d.open) {
        if (!document.querySelector("dialog[open]")) {
          const bar = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
          document.documentElement.style.setProperty("--f-sw", `${bar}px`);
        }
        d.showModal();
        d.querySelector<HTMLElement>("[data-autofocus], input:checked")?.focus({ preventScroll: true });
      }
    } else if (d.open) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        d.close();
        return;
      }
      setClosing(true);
      timer.current = window.setTimeout(() => d.close(), 210);
    }
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      latest.current.onClose();
    };
    const onDialogClose = () => {
      setClosing(false);
      const to = latest.current.back;
      if (to && to.isConnected) to.focus({ preventScroll: true });
      latest.current.onClosed?.();
    };
    d.addEventListener("cancel", onCancel);
    d.addEventListener("close", onDialogClose);
    return () => {
      d.removeEventListener("cancel", onCancel);
      d.removeEventListener("close", onDialogClose);
      window.clearTimeout(timer.current);
    };
  }, []);

  function onClick(e: React.MouseEvent<HTMLDialogElement>) {
    const t = e.target as Element;
    if (t === e.currentTarget || t.closest("[data-close]")) onClose();
  }

  return (
    <dialog
      ref={ref}
      className={cx("sheet", variant, closing && "closing")}
      aria-labelledby={labelledBy}
      onClick={onClick}
      style={place ? { top: place.top, left: place.left } : undefined}
    >
      {children}
    </dialog>
  );
}
