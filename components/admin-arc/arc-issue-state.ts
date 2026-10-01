import type { DropState } from "@/data/types";
import { DROP_STATE_LABEL } from "@/lib/admin-rows";
import type { BadgeTone } from "@/registry/components/badge/badge";

/**
 * An issue's state, as the back office badges it: v3's words ("Đang bán"
 * where the label says "Đang mở") with Arc's tones (briefs v5 slice 2 and 4,
 * §3.2). The overview reads it beside the issue's dates, the issues table on
 * every row; each kept a copy until round v5 slice 6.
 *
 * Its own small module rather than a neighbour of `TONE` in `ArcOrderCells`:
 * that file's address cell brings the commune list (`data/regions`) with it.
 */
export const ISSUE_STATE: Record<DropState, { text: string; tone: BadgeTone }> = {
  OPEN: { text: "Đang bán", tone: "success" },
  UPCOMING: { text: DROP_STATE_LABEL.UPCOMING, tone: "info" },
  CLOSED: { text: DROP_STATE_LABEL.CLOSED, tone: "neutral" },
};
