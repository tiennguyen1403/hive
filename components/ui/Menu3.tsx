"use client";

import { createPortal } from "react-dom";
import { Tick } from "@/components/icon/Icon";
import { type PanelBox } from "./useAnchoredPanel";

export interface Menu3Item {
  value: string;
  /** Shown as-is. */
  label: string;
  checked: boolean;
  /** Right-aligned secondary text — a count, a hint. */
  note?: string;
}

interface Menu3Props {
  box: PanelBox;
  panelRef: React.RefObject<HTMLDivElement | null>;
  /** Names the menu for assistive tech; not drawn. */
  label: string;
  items: Menu3Item[];
  activeIndex: number;
  onHover: (i: number) => void;
  onPick: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  /**
   * Floor for the panel's width. The form select passes its button's width so
   * the menu lines up under the field it belongs to; the sort control leaves
   * it out and keeps the 200px the CSS gives every menu.
   */
  minWidth?: number;
  /** Ties the panel to the button through `aria-controls`. */
  id?: string;
}

/**
 * The shop's dropdown menu, v3 — `prototype/v3/v3-pages.css`, `.menu3`.
 *
 * A separate component from the v2 back office's `TableMenu` (deleted at v3
 * slice 6), and never a variant of it: that one was a filter panel with a
 * heading, counts and a "clear" footer, sized for a data table on a 1280px
 * screen. This one is four lines of plain choice in the shop's own grammar —
 * a 1px ink border, no shadow, no heading, 40px rows (44 on a phone).
 *
 * **Portalled to `<body>`, so it inherits nothing from `.s`** (DESIGN.md §6).
 * Every rule for it in `sheet.css` therefore starts at `.menu3`, and the
 * panel declares its own font, size, line height and ink. It has to be
 * `position:fixed`: the listing's control row is a scroll container, and
 * `overflow-x:auto` clips the vertical axis too.
 *
 * The tick is `<Tick>`, whose viewBox is cropped to the ink — at a full
 * 24×24 the same glyph renders about 5px wide and reads as a speck.
 */
export function Menu3({
  box,
  panelRef,
  label,
  items,
  activeIndex,
  onHover,
  onPick,
  onKeyDown,
  minWidth,
  id,
}: Menu3Props) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      className="menu3"
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={{
        top: box.top,
        left: box.left,
        maxHeight: box.maxHeight,
        ...(minWidth ? { minWidth } : {}),
      }}
    >
      {items.map((it, i) => (
        <button
          key={it.value}
          type="button"
          role="menuitemradio"
          aria-checked={it.checked}
          className={it.checked ? "ticked" : undefined}
          data-active={i === activeIndex || undefined}
          onPointerEnter={() => onHover(i)}
          onClick={() => onPick(it.value)}
        >
          <span className="mk">{it.checked && <Tick />}</span>
          <span>{it.label}</span>
          {it.note && <em className="tally">{it.note}</em>}
        </button>
      ))}
    </div>,
    document.body,
  );
}
