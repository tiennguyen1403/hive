"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon/Icon";
import { Menu3 } from "@/components/ui/Menu3";
import { useAnchoredPanel, usePanelKeys } from "@/components/ui/useAnchoredPanel";
import {
  SORT_KEYS,
  SORT_LABELS,
  listingHref,
  type ListingQuery,
  type SortKey,
} from "@/lib/catalog-query";

interface SortControlProps {
  applied: ListingQuery;
  /** Where picking an order navigates — `/products` or `/search`. */
  path: string;
}

/**
 * Ordering, as a menu anchored under the button that opened it.
 *
 * The button REPORTS the order in force rather than naming one it would
 * switch to — which order you are looking at is the fact worth having on
 * screen, and a button labelled "Giá thấp đến cao" that is not sorting that
 * way is a button lying about the page.
 *
 * One control now, at both widths: the v3 list bar stands over the grid on a
 * phone as well, so the second copy that used to live in the chip row is
 * gone and with it the question of which of the two was telling the truth.
 *
 * The panel is `position:fixed` and portalled to `<body>` (`Menu3`). It has
 * to be: the control row above it is a scroll container, and `overflow-x:auto`
 * silently clips the vertical axis too, so an absolutely-positioned menu
 * would be swallowed whole. The cost of fixed is that it cannot follow its
 * button, so `useAnchoredPanel` closes it on scroll and flips it above the
 * button when the room below runs out.
 *
 * Picking writes to the URL (QĐ-8). The sort is part of the listing, so it
 * has to survive a reload and be there in a link sent to someone else.
 */
export function SortControl({ applied, path }: SortControlProps) {
  const router = useRouter();
  const panel = useAnchoredPanel<HTMLButtonElement, HTMLDivElement>();
  const keys = usePanelKeys(panel.open, SORT_KEYS.length, panel.panelRef);

  const items = SORT_KEYS.map((k) => ({
    value: k,
    label: SORT_LABELS[k],
    checked: applied.sort === k,
  }));

  function pick(value: string) {
    router.push(listingHref(path, { ...applied, sort: value as SortKey }));
    panel.close();
    panel.anchorRef.current?.focus();
  }

  return (
    <>
      <button
        ref={panel.anchorRef}
        type="button"
        className="sort"
        aria-haspopup="menu"
        aria-expanded={panel.open}
        aria-label={`Sắp xếp: ${SORT_LABELS[applied.sort]}`}
        onClick={panel.toggle}
        onKeyDown={(e) => {
          if (!panel.open) {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              panel.toggle();
            }
            return;
          }
          keys.onKeyDown(
            e,
            (i) => {
              const it = items[i];
              if (it) pick(it.value);
            },
            panel.close,
          );
        }}
      >
        <Icon name="sort" className="ic sm" />
        Sắp xếp <b>{SORT_LABELS[applied.sort]}</b>
      </button>

      {panel.open && panel.box && (
        <Menu3
          box={panel.box}
          panelRef={panel.panelRef}
          label="Sắp xếp"
          items={items}
          activeIndex={keys.active}
          onHover={keys.setActive}
          onPick={pick}
        />
      )}
    </>
  );
}
