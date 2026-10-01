import type { Drop } from "@/data/types";
import type { Catalog } from "./catalog";
import { dropState } from "./drop";

/**
 * "Số hiện tại": the issue the back office means when it says "this issue"
 * (round v5 slice 5a, the rule the user approved on 01/10/2026).
 *
 *   1. the issue selling now;
 *   2. between two issues, the one that closed last;
 *   3. before any issue has opened, the old reading, `catalog.currentDropNo`.
 *
 * It answers the overview ("Còn trong Số 05", "Bán chạy trong Số 05", "Sắp
 * hết") and the customer label "mới" wherever it is read: the customer panel
 * of an order, the customer table with its tab "Mới trong số 05", and a
 * customer's own page.
 *
 * WHY NOT `catalog.currentDropNo`. That one is the highest issue holding a
 * style, which is what a catalogue knows, not what the clock says. Adding a
 * style to the next issue, the default of the "Thêm mẫu" form, moved the
 * overview to an issue that had not opened ("Bán chạy trong Số 06" with
 * nothing sold) and the "mới" label with it, while the customer table and a
 * customer's page read the issue selling, or none. Read off the clock, every
 * screen names the same issue. `currentDropNo` itself stays as it was: the
 * rule below still reads it before any issue has opened, and so do tests.
 *
 * "Closed last" is by the closing hour, not by the number: since slice B14b
 * the two agree, and where an older calendar has them out of order the hour
 * is what the rule says.
 */
export function currentIssueNo(catalog: Catalog, now: Date): number {
  const selling = latest(catalog.drops.filter((d) => dropState(d, now) === "OPEN"), "opensAt");
  if (selling) return selling.no;
  const closed = latest(catalog.drops.filter((d) => dropState(d, now) === "CLOSED"), "closesAt");
  if (closed) return closed.no;
  return catalog.currentDropNo;
}

/**
 * The issue with the latest of two instants, the higher number on a tie.
 * Issues never share an hour since slice B14, so the tie is only a rule for
 * an impossible calendar, never a guess.
 */
function latest(drops: readonly Drop[], at: "opensAt" | "closesAt"): Drop | undefined {
  let best: Drop | undefined;
  for (const d of drops) {
    if (!best) {
      best = d;
      continue;
    }
    const by = Date.parse(d[at]) - Date.parse(best[at]);
    if (by > 0 || (by === 0 && d.no > best.no)) best = d;
  }
  return best;
}
