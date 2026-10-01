import type { DropState } from "@/data/types";
import { DROP_STATE_TEXT } from "@/lib/admin-rows";
import { pick, type Locale, type Pair } from "@/lib/i18n";
import type { BadgeTone } from "@/registry/components/badge/badge";

/**
 * An issue's state, as the back office badges it: v3's words ("Đang bán"
 * where the label says "Đang mở") with Arc's tones (briefs v5 slice 2 and 4,
 * §3.2). The overview reads it beside the issue's dates, the issues table on
 * every row; each kept a copy until round v5 slice 6.
 *
 * Its own small module rather than a neighbour of `TONE` in `ArcOrderCells`:
 * that file's address cell brings the commune list (`data/regions`) with it.
 *
 * In both languages since round v6 (QĐ-40): "Đang bán" is "Live" in English,
 * as the glossary has it — never "On sale". `ISSUE_STATE` stays the
 * Vietnamese side; `issueState(state, locale)` gives either.
 */
const ISSUE_STATE_TEXT: Record<DropState, { text: Pair; tone: BadgeTone }> = {
  OPEN: { text: { vi: "Đang bán", en: "Live" }, tone: "success" },
  UPCOMING: { text: DROP_STATE_TEXT.UPCOMING, tone: "info" },
  CLOSED: { text: DROP_STATE_TEXT.CLOSED, tone: "neutral" },
};

/** An issue's state in one language, with its Arc tone. */
export function issueState(state: DropState, locale: Locale = "vi"): { text: string; tone: BadgeTone } {
  const { text, tone } = ISSUE_STATE_TEXT[state];
  return { text: pick(text, locale), tone };
}

export const ISSUE_STATE: Record<DropState, { text: string; tone: BadgeTone }> = {
  OPEN: issueState("OPEN"),
  UPCOMING: issueState("UPCOMING"),
  CLOSED: issueState("CLOSED"),
};
