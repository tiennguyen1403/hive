"use client";

import { useId } from "react";
import { Icon } from "@/components/icon/Icon";
import { Menu3 } from "./Menu3";
import { useAnchoredPanel, usePanelKeys } from "./useAnchoredPanel";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  /** Right-aligned secondary text — a count, a hint. */
  note?: string;
}

interface SelectProps<T extends string> {
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Shown when nothing is chosen yet. */
  placeholder?: string;
  /** Labels the button for assistive tech when no visible <label> does. */
  ariaLabel?: string;
  /** Lands on the button, so a visible `<label htmlFor>` can bind to it. */
  id?: string;
  className?: string;
  disabled?: boolean;
  /** Menu width; defaults to matching the button. */
  menuMinWidth?: number;
}

/**
 * The system's dropdown — never a native `<select>`.
 *
 * A native select is fine on a phone, where the OS picker beats anything a
 * page can draw. On desktop it is the one control the browser styles itself,
 * so it sits among the system's own controls looking like it wandered in
 * from another site. Every dropdown in this app is this component.
 *
 * TWO PARTS, both shared. The BUTTON keeps the input skin — it stands beside
 * Name, Price and Số nhà, so it has to look like the box next to it, not
 * like a filter chip. The PANEL is `Menu3`, the same menu the listing's sort
 * control opens (v3 slice 2): white ground, a 1px ink rule, no shadow, 40px
 * rows (44 on a phone), the chosen row in 600 with a honey tick. It used to
 * carry its own `.selm` skin from v2 — pale gold hover, honey-brown labels,
 * a drop shadow — which read as a leftover from another design the moment it
 * opened over a v3 form. That skin went with the rest of the v2 CSS at slice
 * 6. One menu now, one place to change it.
 *
 * Placement, dismissal and arrow keys come from `useAnchoredPanel` /
 * `usePanelKeys`, so a province list of 34 and a commune list of 168 behave
 * exactly like every other menu: fixed position (the field may sit inside a
 * scroll container, and `overflow-x` clips the vertical axis too), capped
 * height with its own scroll, flipped above the button when the room below
 * runs out, and closed by Escape, an outside press or a page scroll.
 */
export function Select<T extends string>({
  options,
  value,
  onChange,
  placeholder = "Chọn",
  ariaLabel,
  id,
  className = "",
  disabled = false,
  menuMinWidth,
}: SelectProps<T>) {
  const panel = useAnchoredPanel<HTMLButtonElement, HTMLDivElement>();
  const keys = usePanelKeys(panel.open, options.length, panel.panelRef);
  const menuId = useId();

  const chosen = options.findIndex((o) => o.value === value);
  const items = options.map((o) => ({
    value: o.value,
    label: o.label,
    checked: o.value === value,
    ...(o.note ? { note: o.note } : {}),
  }));

  function pick(next: string) {
    onChange(next as T);
    panel.close();
    panel.anchorRef.current?.focus();
  }

  function toggle() {
    if (disabled) return;
    // Open ON the current choice, so the first arrow key moves from where
    // the shopper already is rather than from the top of 168 communes.
    if (!panel.open) keys.setActive(chosen >= 0 ? chosen : 0);
    panel.toggle();
  }

  const label = chosen >= 0 ? options[chosen]!.label : placeholder;

  return (
    <span className="selwrap">
      <button
        ref={panel.anchorRef}
        id={id}
        type="button"
        /* `inp sel selbtn` is not decoration: `.inp` supplies display:flex,
           the height and the border, `.sel` the space-between. With `selbtn`
           alone the button falls back to inline-block and the chevron drops
           onto its own line. */
        className={`inp sel selbtn ${className}`.trim()}
        aria-haspopup="menu"
        aria-expanded={panel.open}
        aria-controls={panel.open ? menuId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={(e) => {
          if (!panel.open) {
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
              e.preventDefault();
              toggle();
            }
            return;
          }
          keys.onKeyDown(
            e,
            (i) => {
              const o = options[i];
              if (o) pick(o.value);
            },
            panel.close,
          );
        }}
      >
        {/* `data-ph` marks the label as the PLACEHOLDER rather than a
            choice — the v3 form rows tint it with the secondary ink, the way
            an empty text box tints its own placeholder.

            An ATTRIBUTE and not a class, after `.ph` was tried and measured:
            `.s .ph` is the 4:5 photo frame in `cards.css`, so the span took
            `aspect-ratio:4/5` and came out 226×283px — tall enough to cover
            the field below it and swallow its clicks. */}
        <span className="t" data-ph={chosen >= 0 ? undefined : ""}>
          {label}
        </span>
        <Icon name="down" className="" />
      </button>

      {panel.open && panel.box && (
        <Menu3
          id={menuId}
          box={panel.box}
          panelRef={panel.panelRef}
          label={ariaLabel ?? placeholder}
          items={items}
          activeIndex={keys.active}
          onHover={keys.setActive}
          onPick={pick}
          minWidth={menuMinWidth ?? panel.box.width}
        />
      )}
    </span>
  );
}
