"use client";

import type { Drop, DropState } from "@/data/types";
import { useDropLabel } from "./useDropLabel";

/**
 * The same ticking sentence the drop band carries — "đóng sau 5 ngày 1 giờ" —
 * with no box around it, for the middle of a line of prose.
 *
 * The product page's stock line ends in it: "Còn 17 / 35 chiếc đã cắt · số
 * 05 đóng sau 5 ngày 1 giờ". A band there would be a second status strip
 * under the price; the fact belongs in the sentence that already states the
 * numbers.
 */
export function DropClock({
  drop,
  state,
  initialLabel,
}: {
  drop: Drop;
  state: DropState;
  /** As the server rendered it — the first client render must match. */
  initialLabel: string;
}) {
  const label = useDropLabel(drop, state, initialLabel);
  return <>{label}</>;
}
