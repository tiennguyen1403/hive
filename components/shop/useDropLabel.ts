"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Drop, DropState } from "@/data/types";
import { dropBandLabel } from "@/lib/drop";
import { demoNow } from "@/lib/clock";

/**
 * "đóng sau 5 ngày 1 giờ", ticking.
 *
 * Shared by the drop band and the product page's stock line, because they
 * print the same sentence and a second copy of this effect would be a second
 * place for the clock to drift.
 *
 * Three things it has to get right:
 *
 * 1. **It starts from what the server rendered.** The first client render has
 *    to produce exactly `initialLabel` or React throws the tree away, so the
 *    state starts there and only then begins ticking on its own.
 * 2. **It recomputes from the deadline every tick** rather than decrementing
 *    a number it holds, so a tab backgrounded for an hour comes back correct
 *    instead of an hour behind.
 * 3. **When the deadline passes it asks the server for the page again**
 *    instead of relabelling itself. The drop's state is derived server-side
 *    from these same two instants, so the grid, the buttons and the copy have
 *    to turn over together. A line that alone said "đã đóng" over a page full
 *    of live buy buttons would be worse than no countdown.
 */
export function useDropLabel(
  drop: Drop,
  state: DropState,
  initialLabel: string,
): string {
  const router = useRouter();
  const [label, setLabel] = useState(initialLabel);

  useEffect(() => {
    if (state === "CLOSED") return;
    const deadline = Date.parse(state === "UPCOMING" ? drop.opensAt : drop.closesAt);

    const id = window.setInterval(() => {
      const now = demoNow();
      if (now.getTime() >= deadline) {
        window.clearInterval(id);
        router.refresh();
        return;
      }
      setLabel(dropBandLabel(drop, state, now));
    }, 1000);

    return () => window.clearInterval(id);
  }, [drop, state, router]);

  return label;
}
