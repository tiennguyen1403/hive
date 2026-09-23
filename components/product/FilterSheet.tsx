"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { COLORS } from "@/data/colors";
import {
  FAMILY_SHORT_LABELS,
  type ColorKey,
  type Family,
  type Fit,
  type Product,
  type Size,
} from "@/data/types";
import {
  FIT_LABELS,
  clearFilters,
  colorCounts,
  familyCounts,
  fitCounts,
  isBandApplied,
  isFiltered,
  listingHref,
  priceBandCounts,
  priceRangeOf,
  runListingQuery,
  sizeCounts,
  type ListingQuery,
  type PriceBand,
} from "@/lib/catalog-query";
import { LEX, issueLabel } from "@/lib/lexicon";
import { plainVnd, vnd } from "@/lib/money";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  /** What the URL currently says. The sheet opens showing exactly this. */
  applied: ListingQuery;
  /** Where the Apply button navigates — `/products` or `/search`. */
  path: string;
  /**
   * The styles the draft is counted against. Passed as data rather than as a
   * counting function: a server component cannot hand a closure to a client
   * one, and an array of products crosses the boundary as it is.
   */
  pool: Product[];
}

/**
 * The filter sheet — the phone's whole filter, the same five groups the
 * desktop rail stands open.
 *
 * It edits a DRAFT and only writes to the URL when "Xem N mẫu" is pressed.
 * Pushing a new URL on every chip tap would put a dozen entries in the back
 * stack for one decision, so Back would walk out of the shop one chip at a
 * time — and the sheet covers the grid, so those taps would land in the dark
 * anyway. (The rail does navigate per click: there the grid is beside it.)
 *
 * The Apply button counts what the draft would return, so the shopper knows
 * before they commit whether they have filtered themselves down to nothing.
 *
 * Sorting is NOT in here. The list bar carries the order at both widths in
 * v3, and a second control saying the same thing is one too many.
 */
export function FilterSheet({ open, onClose, applied, path, pool }: FilterSheetProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<ListingQuery>(applied);

  // Reopening after the URL moved on must not show the old draft.
  const [seen, setSeen] = useState(applied);
  if (seen !== applied) {
    setSeen(applied);
    setDraft(applied);
  }

  const n = runListingQuery(pool, draft).length;
  const range = priceRangeOf(pool);
  const no = pool[0]?.dropNo;

  function toggle<T extends Family | Fit | Size | ColorKey>(
    key: "families" | "fits" | "sizes" | "colors",
    v: T,
  ) {
    setDraft((d) => {
      const list = d[key] as T[];
      return {
        ...d,
        [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v],
      };
    });
  }

  function pickBand(band: PriceBand) {
    setDraft((d) => {
      const next = { ...d };
      delete next.minVnd;
      delete next.maxVnd;
      if (isBandApplied(d, band)) return next;
      if (band.minVnd !== undefined) next.minVnd = band.minVnd;
      if (band.maxVnd !== undefined) next.maxVnd = band.maxVnd;
      return next;
    });
  }

  function priceChange(which: "minVnd" | "maxVnd", raw: string) {
    const digits = raw.replace(/\D/g, "");
    setDraft((d) => {
      const next = { ...d };
      if (digits === "") delete next[which];
      else next[which] = Number(digits);
      return next;
    });
  }

  function apply() {
    router.push(listingHref(path, draft));
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} label="Lọc">
      <div className="grab" />

      <div className="fhead">
        <div>
          <h2>Lọc</h2>
          <div className="muted">
            {no !== undefined ? `${issueLabel(no)} · ` : ""}
            {pool.length} mẫu
          </div>
        </div>
        <button type="button" className="x" aria-label="Đóng" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>

      <div className="grp">
        <h4 id="f-family">Loại</h4>
        <div className="opts" role="group" aria-labelledby="f-family">
          {familyCounts(pool).map((t) => (
            <Chip3
              key={t.value}
              on={draft.families.includes(t.value)}
              count={t.styles}
              onClick={() => toggle("families", t.value)}
            >
              {FAMILY_SHORT_LABELS[t.value]}
            </Chip3>
          ))}
        </div>
      </div>

      <div className="grp">
        <h4 id="f-fit">Form</h4>
        <div className="opts" role="group" aria-labelledby="f-fit">
          {fitCounts(pool).map((t) => (
            <Chip3
              key={t.value}
              on={draft.fits.includes(t.value)}
              count={t.styles}
              onClick={() => toggle("fits", t.value)}
            >
              {FIT_LABELS[t.value]}
            </Chip3>
          ))}
        </div>
      </div>

      <div className="grp">
        <h4 id="f-size">Còn size</h4>
        <div className="opts" role="group" aria-labelledby="f-size">
          {sizeCounts(pool).map((t) => (
            <Chip3
              key={t.value}
              on={draft.sizes.includes(t.value)}
              count={t.styles}
              onClick={() => toggle("sizes", t.value)}
            >
              {t.value}
            </Chip3>
          ))}
        </div>
      </div>

      {/* The name sits beside the dot, always. Colour is never the only
          channel in this system, and "Xanh than" next to a dark circle is
          the difference between navy and black. */}
      <div className="grp">
        <h4 id="f-color">Màu</h4>
        <div className="opts" role="group" aria-labelledby="f-color">
          {colorCounts(pool).map((t) => (
            <Chip3
              key={t.value}
              on={draft.colors.includes(t.value)}
              count={t.styles}
              dot={COLORS[t.value].hex}
              onClick={() => toggle("colors", t.value)}
            >
              {COLORS[t.value].label}
            </Chip3>
          ))}
        </div>
      </div>

      <div className="grp">
        <h4 id="f-price">Khoảng giá</h4>
        <div className="opts" role="group" aria-labelledby="f-price">
          {priceBandCounts(pool).map((band) => (
            <Chip3
              key={band.id}
              on={isBandApplied(draft, band)}
              count={band.styles}
              onClick={() => pickBand(band)}
            >
              {band.label}
            </Chip3>
          ))}
        </div>
        {/* 44px boxes, so neither needs the `.inptap` wrapper the 40px ones
            wear — an `<input>` cannot carry the overlay itself. */}
        <div className="range">
          <input
            className="inp"
            type="text"
            inputMode="numeric"
            aria-label="Giá thấp nhất, đồng"
            placeholder="Từ"
            value={draft.minVnd === undefined ? "" : plainVnd(draft.minVnd)}
            onChange={(e) => priceChange("minVnd", e.target.value)}
          />
          <input
            className="inp"
            type="text"
            inputMode="numeric"
            aria-label="Giá cao nhất, đồng"
            placeholder="Đến"
            value={draft.maxVnd === undefined ? "" : plainVnd(draft.maxVnd)}
            onChange={(e) => priceChange("maxVnd", e.target.value)}
          />
        </div>
        {range && (
          <p className="foot">
            {LEX.t} này từ {vnd(range.minVnd)} đến {vnd(range.maxVnd)}
          </p>
        )}
      </div>

      <div className="sact">
        {/* No icon while the draft returns nothing: an icon names an action,
            and there is no grid to go and look at. */}
        <button type="button" className="btn" onClick={apply} disabled={n === 0}>
          {n === 0 ? "Không có mẫu nào" : <><Icon name="grid" className="ic sm" />Xem {n} mẫu</>}
        </button>
        {isFiltered(draft) && (
          <button
            type="button"
            className="clearall"
            onClick={() => setDraft(clearFilters(draft))}
          >
            Bỏ lọc
          </button>
        )}
      </div>
    </Sheet>
  );
}

/** One chip of a filter group, editing the draft rather than the URL. */
function Chip3({
  on,
  count,
  dot,
  onClick,
  children,
}: {
  on: boolean;
  count: number;
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
