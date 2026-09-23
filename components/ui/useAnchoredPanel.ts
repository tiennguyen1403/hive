"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDismissOnScroll, useEscapeLayer, useOutsidePointer } from "./layers";

/** Keep the panel this far from the edge of the viewport. */
export const GUTTER = 12;

/** The layout viewport — what the page is actually laid out in. */
const viewportW = () => document.documentElement.clientWidth;
const viewportH = () => document.documentElement.clientHeight;
/** Below this much room, prefer the other side of the anchor. */
const MIN_ROOM = 180;
/** A panel taller than this is a scroll area, not a menu. */
const MAX_PANEL = 360;

export interface PanelBox {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

/**
 * A panel anchored under a button: open state, placement, and every way it
 * should close.
 *
 * Shared by the form select and the table's menus rather than written twice.
 * The placement rules are subtle enough that two copies would drift:
 *
 * · `position: fixed`, not absolute. A row's menu lives inside the table's
 *   `.scroll`, and once `overflow-x` is not `visible` the vertical axis
 *   silently clips too — an absolutely-positioned menu on the last row is
 *   swallowed whole. Fixed escapes every ancestor's clipping box.
 * · Height is capped and the overflow scrolls. Menus in the prototype held
 *   four to ten items; a commune list holds 168 and renders 5,488px tall.
 * · Scrolling the page closes it, because a fixed panel cannot follow its
 *   button. Scrolling INSIDE it does not.
 */
export function useAnchoredPanel<A extends HTMLElement, P extends HTMLElement>() {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<PanelBox | null>(null);
  const anchorRef = useRef<A>(null);
  const panelRef = useRef<P>(null);

  const close = useCallback(() => setOpen(false), []);
  useEscapeLayer(open, close);
  useOutsidePointer(open, [anchorRef, panelRef], close);
  useDismissOnScroll(open, close, panelRef);

  const place = useCallback(() => {
    const a = anchorRef.current?.getBoundingClientRect();
    if (!a) return;
    // The LAYOUT viewport, not `window.inner*`: those include the classic
    // scrollbar, so a panel pushed against the right edge ended up with its
    // last 3px under it (measured at 390px in Chrome, v3 slice 2).
    const below = viewportH() - a.bottom - GUTTER;
    const above = a.top - GUTTER;
    const flip = below < MIN_ROOM && above > below;
    setBox({
      // -1 marks "flip above"; the real top needs the panel's height, which
      // is only known after it renders.
      top: flip ? -1 : a.bottom + 4,
      left: a.left,
      width: a.width,
      maxHeight: Math.min(MAX_PANEL, flip ? above : below),
    });
  }, []);

  const toggle = useCallback(() => {
    if (open) return close();
    place();
    setOpen(true);
  }, [open, close, place]);

  // Settle the position once the panel's real size is known.
  useEffect(() => {
    if (!open || !box) return;
    const p = panelRef.current?.getBoundingClientRect();
    const a = anchorRef.current?.getBoundingClientRect();
    if (!p || !a) return;
    let { top, left } = box;
    if (top === -1 || p.bottom > viewportH() - GUTTER) {
      top = a.top - p.height - 4;
    }
    if (p.right > viewportW() - GUTTER) {
      left = viewportW() - p.width - GUTTER;
    }
    left = Math.max(GUTTER, left);
    top = Math.max(GUTTER, top);
    if (top !== box.top || left !== box.left) setBox({ ...box, top, left });
  }, [open, box]);

  return { open, setOpen, box, anchorRef, panelRef, toggle, close, place };
}

/**
 * Arrow-key navigation inside an open panel.
 *
 * `scrollIntoView({block: "nearest"})` on every move is what makes a long
 * list usable from the keyboard — without it the focus ring walks off the
 * bottom of a capped panel and the shopper is arrowing blind.
 */
export function usePanelKeys(
  open: boolean,
  count: number,
  panelRef: React.RefObject<HTMLElement | null>,
) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) return;
    panelRef.current
      ?.querySelectorAll<HTMLElement>("[role^='menuitem']")
      [active]?.scrollIntoView({ block: "nearest" });
  }, [open, active, panelRef]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, onPick: (i: number) => void, onClose: () => void) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, count - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Home") {
        e.preventDefault();
        setActive(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActive(count - 1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPick(active);
      } else if (e.key === "Tab") {
        onClose();
      }
    },
    [active, count],
  );

  return { active, setActive, onKeyDown };
}
