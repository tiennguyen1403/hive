"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useEscapeLayer } from "./layers";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Names the dialog for assistive tech. */
  label: string;
  /**
   * 680px instead of 520 from 900px — the back office's two-column forms
   * (`.panel.wide` in the mock). On a phone it changes nothing: the sheet is
   * edge to edge either way.
   */
  wide?: boolean;
  /**
   * A variant of the panel, as a class (DESIGN.md §6: a variant is a class,
   * never a position) — `crop` is the style form's 720px crop sheet.
   */
  variant?: string;
  children: React.ReactNode;
}

/**
 * The bottom sheet: scrim, panel, and the four things a dialog owes its user.
 *
 * 1. Escape closes THIS sheet and nothing above it — see `useEscapeLayer`.
 *    A menu open inside the sheet takes the key first.
 * 2. The page behind does not scroll while it is open. Without that, a swipe
 *    aimed at the sheet drags the page and the sheet sits still.
 * 3. Focus goes in on open and comes back to the opener on close. Coming back
 *    matters more than going in: lose it and a keyboard user is dumped at the
 *    top of the document with no idea where they were.
 * 4. Tab stays inside while it is open.
 *
 * Rendered through a portal to `document.body`. The sheet is `position:fixed`
 * but the card that opens it is inside a grid with its own stacking context,
 * and a fixed element inside a transformed ancestor is positioned against
 * that ancestor, not the viewport.
 */
export function Sheet({ open, onClose, label, wide = false, variant, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEscapeLayer(open, onClose);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;

    // Lock the page. Padding replaces the scrollbar's width so the layout
    // behind does not jump sideways as it disappears.
    const { body } = document;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    panelRef.current?.focus();

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      openerRef.current?.focus();
    };
  }, [open]);

  // Keep Tab inside. Re-read the focusable list on each Tab rather than
  // caching it: the size sheet rewrites its own buttons as the colour
  // changes, and a cached list would point at elements that are gone.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="sheetwrap">
      <div className="scrim" onClick={onClose} />
      <div
        ref={panelRef}
        className={["s sheetbody", wide && "wide", variant].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
