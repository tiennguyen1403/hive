"use client";

import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import type { Family } from "@/data/types";

interface ShopFrameProps {
  children: React.ReactNode;
  /**
   * A 600px column from 900px up, and the column IS the gutter — for screens
   * that are one narrow thing (the confirmation, a search) rather than a
   * layout. See `.narrow` in desktop.css.
   */
  narrow?: boolean;
  /** Underlines one family link in the bar. */
  activeFamily?: Family | undefined;
  /**
   * Lights the issue plate in the bar: the listing with no family narrowing
   * it, which is where the plate leads. The bar has a plate only while an
   * issue is on sale (see `SiteNavProps`).
   */
  activeDrop?: boolean;
}

/**
 * The frame every shopper-facing route sits in: the bar, the screen, the
 * footer — in that order, in a column at least a viewport tall.
 *
 * It exists because those three were assembled by hand on each route, and
 * the assembly went wrong in two measurable ways (L1, L2): the footer had
 * reached 6 of 27 routes, and a short screen left half the viewport blank
 * under its last line. A frame cannot forget the footer, and `.s.v3` makes
 * `main` take the slack so the footer lands on the bottom edge.
 *
 * A client component, because half the screens it wraps are ("use client"
 * cannot import a server component). Nothing in here reads the URL: the two
 * `active` flags are passed down by the page, so the bar does not pull every
 * route out of the static shell to underline one word.
 */
export function ShopFrame({ children, narrow, activeFamily, activeDrop }: ShopFrameProps) {
  return (
    <div className="s v3">
      <SiteNav activeFamily={activeFamily} activeDrop={activeDrop} />
      <main className={narrow ? "narrow" : undefined}>{children}</main>
      <SiteFooter />
    </div>
  );
}
