"use client";

import { useEffect } from "react";

/**
 * A stack of dismissible layers, so Escape closes the TOP one and nothing
 * else.
 *
 * The prototype did this by checking each kind of layer in a fixed order
 * inside one key handler — menu, then picker, then sheet, then size popover.
 * That worked but encoded the ordering in a place nobody thinks to update,
 * and it got the order wrong once already. Here each layer registers itself
 * when it opens, so the order is simply the order they were opened in, and a
 * new kind of layer needs no edit anywhere.
 */
const stack: Array<() => void> = [];

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== "Escape" || stack.length === 0) return;
  e.stopPropagation();
  // Only the topmost. Escape inside a menu that is inside a sheet closes the
  // menu and leaves the sheet where it was — otherwise one key wipes out
  // work the shopper is in the middle of.
  stack[stack.length - 1]!();
}

/**
 * While `open`, put `onDismiss` on the Escape stack.
 *
 * `onDismiss` is read through a ref-like closure on every effect run, so a
 * component may pass a fresh function each render without churning the
 * listener.
 */
export function useEscapeLayer(open: boolean, onDismiss: () => void) {
  useEffect(() => {
    if (!open) return;
    const entry = () => onDismiss();
    if (stack.length === 0) {
      document.addEventListener("keydown", onKeyDown, true);
    }
    stack.push(entry);
    return () => {
      const i = stack.lastIndexOf(entry);
      if (i !== -1) stack.splice(i, 1);
      if (stack.length === 0) {
        document.removeEventListener("keydown", onKeyDown, true);
      }
    };
  }, [open, onDismiss]);
}

/** Close when a pointer goes down anywhere outside `refs`. */
export function useOutsidePointer(
  open: boolean,
  refs: Array<React.RefObject<HTMLElement | null>>,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const t = e.target as Node;
      if (refs.some((r) => r.current?.contains(t))) return;
      onDismiss();
    };
    // Capture phase: a click on another dropdown's button has to close this
    // one before that one opens, or two menus hang open at once.
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [open, refs, onDismiss]);
}

/**
 * Close on scroll.
 *
 * The menu is `position: fixed` — it has to be, to escape the clipping box
 * that `overflow-x:auto` silently creates on both axes. The cost is that it
 * does not follow its button when the page scrolls, so scrolling dismisses it
 * rather than leaving it stranded.
 */
export function useDismissOnScroll(
  open: boolean,
  onDismiss: () => void,
  /**
   * The panel itself. Scrolling INSIDE it must not dismiss it — a menu long
   * enough to need a scrollbar (34 provinces, 168 communes) is unusable
   * otherwise: the first wheel tick closes the thing you are trying to read.
   * `scroll` does not bubble, but a capture listener on window still sees it,
   * with the scrolling element as the target.
   */
  panel?: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const t = e.target;
      if (t instanceof Node && panel?.current?.contains(t)) return;
      onDismiss();
    };
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, onDismiss, panel]);
}
