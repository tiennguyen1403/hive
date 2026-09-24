"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon/Icon";
import { startWait } from "@/components/shop/WaitVeil";
import { COLORS } from "@/data/colors";
import type { ColorKey, Fit, Product, Size } from "@/data/types";
import {
  FIT_LABELS,
  colorCounts,
  fitCounts,
  isBandApplied,
  isFiltered,
  listingHref,
  priceBandCounts,
  sizeCounts,
  type ListingQuery,
  type PriceBand,
} from "@/lib/catalog-query";
import { FilterSheet } from "./FilterSheet";

interface ListingControlsProps {
  applied: ListingQuery;
  path: string;
  pool: Product[];
  /** The issue the pool is, on its own page; absent on `/products` (see `FilterSheet`). */
  issueNo?: number | undefined;
}

/** The two sizes worth a one-tap chip. The rest live in the sheet. */
const QUICK_SIZES: Size[] = ["S", "M"];

/**
 * The phone's control row: the way into the sheet, then the handful of
 * filters worth one tap.
 *
 * Shortcuts, not the whole filter — each chip writes a single value into the
 * URL and navigates; the sheet is where a combination gets built. Both end up
 * in the same query string, so a listing is always a link that can be shared
 * or reloaded (QĐ-8).
 *
 * The row scrolls sideways and fades at its right edge, which is the one
 * thing that says "there is more" without a control nobody can tap (L6). It
 * disappears at 900px, where the rail says all of this with room for the
 * groups the row has to leave out.
 *
 * Which chips: both fits, the two sizes above, the colourway the issue is
 * mostly made of, and the cheapest price band — every one of them counted off
 * the pool, and left out entirely when the issue has nothing behind it. A
 * chip that leads to an empty grid is worse than no chip.
 */
export function ListingControls({ applied, path, pool, issueNo }: ListingControlsProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const fits = fitCounts(pool);
  const sizes = sizeCounts(pool);
  const topColor = colorCounts(pool)[0];
  const band = priceBandCounts(pool)[0];

  // `/products#filter` opens the sheet on arrival — the same promise
  // `/products/s05-khoi#size` makes about the size guide. A link that names a
  // layer has to land on that layer, not at the top of the page under it.
  useEffect(() => {
    if (window.location.hash === "#filter") setSheetOpen(true);
  }, []);

  function go(next: ListingQuery) {
    // Same page, another filter: the wait veil's rule leaves it uncovered.
    const href = listingHref(path, next);
    startWait(href);
    router.push(href);
  }

  function toggleFit(fit: Fit) {
    const on = applied.fits.includes(fit);
    go({ ...applied, fits: on ? applied.fits.filter((f) => f !== fit) : [...applied.fits, fit] });
  }

  function toggleSize(s: Size) {
    const on = applied.sizes.includes(s);
    go({ ...applied, sizes: on ? applied.sizes.filter((x) => x !== s) : [...applied.sizes, s] });
  }

  function toggleColor(c: ColorKey) {
    const on = applied.colors.includes(c);
    go({
      ...applied,
      colors: on ? applied.colors.filter((x) => x !== c) : [...applied.colors, c],
    });
  }

  function toggleBand(b: PriceBand) {
    const next = { ...applied };
    delete next.minVnd;
    delete next.maxVnd;
    if (!isBandApplied(applied, b)) {
      if (b.minVnd !== undefined) next.minVnd = b.minVnd;
      if (b.maxVnd !== undefined) next.maxVnd = b.maxVnd;
    }
    go(next);
  }

  return (
    <>
      <div className="chips3" aria-label="Lọc nhanh">
        <button
          type="button"
          className={isFiltered(applied) ? "chip3 on" : "chip3"}
          onClick={() => setSheetOpen(true)}
        >
          <Icon name="filter" className="ic sm" />
          Lọc
        </button>

        {fits.map((t) => (
          <Chip3
            key={t.value}
            on={applied.fits.includes(t.value)}
            count={t.styles}
            onClick={() => toggleFit(t.value)}
          >
            {FIT_LABELS[t.value]}
          </Chip3>
        ))}

        {QUICK_SIZES.map((s) => {
          const t = sizes.find((x) => x.value === s);
          if (!t) return null;
          return (
            <Chip3
              key={s}
              on={applied.sizes.includes(s)}
              count={t.styles}
              onClick={() => toggleSize(s)}
            >
              Còn size {s}
            </Chip3>
          );
        })}

        {topColor && (
          <Chip3
            on={applied.colors.includes(topColor.value)}
            count={topColor.styles}
            dot={COLORS[topColor.value].hex}
            onClick={() => toggleColor(topColor.value)}
          >
            {COLORS[topColor.value].label}
          </Chip3>
        )}

        {band && (
          <Chip3
            on={isBandApplied(applied, band)}
            count={band.styles}
            onClick={() => toggleBand(band)}
          >
            {band.label}
          </Chip3>
        )}
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        applied={applied}
        path={path}
        pool={pool}
        issueNo={issueNo}
      />
    </>
  );
}

/**
 * One chip of the row. A `<button>` with `aria-pressed`, because it toggles
 * a filter rather than going somewhere — the rail's chips are links for the
 * opposite reason.
 */
function Chip3({
  on,
  count,
  dot,
  onClick,
  children,
}: {
  on: boolean;
  count: number;
  /** A colour swatch before the label, for a colourway chip. */
  dot?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={on ? "chip3 on" : "chip3"}
      aria-pressed={on}
      onClick={onClick}
    >
      {dot && <i className="dot" style={{ background: dot }} aria-hidden="true" />}
      {children}
      <span className="cnt">{count}</span>
    </button>
  );
}
