import { Mona_Sans } from "next/font/google";

/**
 * Mona Sans, the Feed round's one family (QĐ-32): 75% wide for display
 * (style names, the cover line, dates, countdowns, page titles), 100% for
 * the interface — `direction.json` → `type` in the mock.
 *
 * Self-hosted by next/font like the v3 pair, so nothing calls Google at run
 * time. Next's font data gives Mona Sans a width axis (`wdth` 75–125) beside
 * the weight (`wght` 200–900); `axes: ["wdth"]` asks for both, so one
 * variable file per subset covers every width and weight the mock sets
 * (`03-api-reference/02-components/font.md`, "axes"). `vietnamese` is
 * required: the style names and "Số" carry stacked marks.
 *
 * Upright only: the italic "HIVE" of the mock is not used (QĐ-33).
 *
 * The mock's own fallback stack, not next/font's metric-matched Arial (slice
 * 1a). Mona Sans has no "₫", so every price's đồng sign is drawn by the next
 * font in the stack. With next/font's automatic fallback ("Mona Sans
 * Fallback", `local(Arial)`) that font is Arial, whose "₫" is a small raised
 * đ; the mock's stack goes straight on to the system's face (its `--font`:
 * system-ui…), whose "₫" is the full-size, underlined sign the approved
 * screens show. Naming the fallbacks (`fallback`) is what makes next/font
 * leave its own out — measured on the build: `adjustFontFallback: false`
 * alone still wrote the Arial face.
 *
 * Its own variable, `--font-mona`: `--font-sans` and `--font-display` stay the
 * v3 pair's. Defined in this module and applied by the Feed zone's root
 * (`feedFontClass`, `FeedScope.tsx`), not by the root layout, so it is
 * preloaded only on the routes that render a Feed screen (same doc, "Using
 * Multiple Fonts": "This ensures the font is preloaded only when it's
 * rendered") and the back office loads nothing new.
 */
export const monaSans = Mona_Sans({
  subsets: ["latin", "latin-ext", "vietnamese"],
  axes: ["wdth"],
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
  variable: "--font-mona",
});
