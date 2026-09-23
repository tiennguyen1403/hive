import Link from "next/link";
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
  colorCounts,
  familyCounts,
  fitCounts,
  isBandApplied,
  listingHref,
  priceBandCounts,
  priceRangeOf,
  sizeCounts,
  type ListingQuery,
} from "@/lib/catalog-query";
import { LEX } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { PriceFilterForm } from "./PriceFilterForm";

interface FilterRailProps {
  pool: Product[];
  applied: ListingQuery;
  path: string;
}

/**
 * The desktop filter rail: every group the phone's sheet holds, open at once
 * because there is room for it.
 *
 * Each control is a LINK that writes the URL and navigates (QĐ-8). No draft,
 * no apply button — on a monitor the grid is beside the rail, so the result
 * of a click is visible in the same glance, and a draft would make the
 * shopper commit to something they can already see.
 *
 * That is the one real difference from the sheet, and it is deliberate: on a
 * phone the sheet covers the grid, so a tap there would be a jump into the
 * dark, and pushing a URL per tap would fill the back stack with a dozen
 * entries for one decision.
 *
 * Every count comes off the pool through `lib/catalog-query.ts`. A value
 * nothing in the issue matches is left out rather than drawn with a zero.
 */
export function FilterRail({ pool, applied, path }: FilterRailProps) {
  const range = priceRangeOf(pool);

  return (
    <aside className="rail3" aria-label="Lọc">
      <Group title="Loại">
        {familyCounts(pool).map((t) => (
          <ChipLink
            key={t.value}
            on={applied.families.includes(t.value)}
            href={listingHref(path, { ...applied, families: toggle(applied.families, t.value) })}
            count={t.styles}
          >
            {FAMILY_SHORT_LABELS[t.value]}
          </ChipLink>
        ))}
      </Group>

      <Group title="Form">
        {fitCounts(pool).map((t) => (
          <ChipLink
            key={t.value}
            on={applied.fits.includes(t.value)}
            href={listingHref(path, { ...applied, fits: toggle(applied.fits, t.value) })}
            count={t.styles}
          >
            {FIT_LABELS[t.value]}
          </ChipLink>
        ))}
      </Group>

      <Group title="Còn size">
        {sizeCounts(pool).map((t) => (
          <ChipLink
            key={t.value}
            on={applied.sizes.includes(t.value)}
            href={listingHref(path, { ...applied, sizes: toggle(applied.sizes, t.value) })}
            count={t.styles}
          >
            {t.value}
          </ChipLink>
        ))}
      </Group>

      {/* The name sits beside the dot, always. Colour is never the only
          channel in this system, and "Xanh than" next to a dark circle is
          the difference between navy and black. */}
      <Group title="Màu">
        {colorCounts(pool).map((t) => (
          <ChipLink
            key={t.value}
            on={applied.colors.includes(t.value)}
            href={listingHref(path, { ...applied, colors: toggle(applied.colors, t.value) })}
            count={t.styles}
            dot={COLORS[t.value].hex}
          >
            {COLORS[t.value].label}
          </ChipLink>
        ))}
      </Group>

      <div className="grp">
        <h4>Khoảng giá</h4>
        <div className="opts">
          {priceBandCounts(pool).map((band) => {
            const on = isBandApplied(applied, band);
            return (
              <ChipLink
                key={band.id}
                on={on}
                count={band.styles}
                href={listingHref(
                  path,
                  on
                    ? withoutPrice(applied)
                    : {
                        ...withoutPrice(applied),
                        ...(band.minVnd !== undefined ? { minVnd: band.minVnd } : {}),
                        ...(band.maxVnd !== undefined ? { maxVnd: band.maxVnd } : {}),
                      },
                )}
              >
                {band.label}
              </ChipLink>
            );
          })}
        </div>
        <PriceFilterForm applied={applied} path={path} />
        {/* The real ends of the issue, so a window typed by hand starts from
            what is actually on the shelf. */}
        {range && (
          <p className="foot">
            {LEX.t} này từ {vnd(range.minVnd)} đến {vnd(range.maxVnd)}
          </p>
        )}
      </div>
    </aside>
  );
}

/** One titled block of chips. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grp">
      <h4>{title}</h4>
      <div className="opts">{children}</div>
    </div>
  );
}

function ChipLink({
  href,
  on,
  count,
  dot,
  children,
}: {
  href: string;
  on: boolean;
  count: number;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    /* `aria-current`, not `aria-pressed`: this is a link, and `aria-pressed`
       is only defined on a button. Both say "this one is applied"; only one
       of them is legal here. */
    <Link className={on ? "chip3 on" : "chip3"} aria-current={on || undefined} href={href}>
      {dot && <i className="dot" style={{ background: dot }} aria-hidden="true" />}
      {children}
      <span className="cnt">{count}</span>
    </Link>
  );
}

/** In or out — the same value twice means "take it off again". */
function toggle<T extends Family | Fit | Size | ColorKey>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function withoutPrice(q: ListingQuery): ListingQuery {
  const next = { ...q };
  delete next.minVnd;
  delete next.maxVnd;
  return next;
}
