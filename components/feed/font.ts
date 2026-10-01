import { Mona_Sans } from "next/font/google";

/**
 * Mona Sans, the Feed round's one family (QĐ-32): 75% wide for display
 * (style names, the cover line, dates, countdowns, page titles), 100% for
 * the interface — `direction.json` → `type` in the mock.
 *
 * Self-hosted by next/font, so nothing calls Google at run time. Next's font
 * data gives Mona Sans a width axis (`wdth` 75–125) beside the weight (`wght`
 * 200–900); `axes: ["wdth"]` asks for both, so one variable file per subset
 * covers every width and weight the mock sets
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
 * Its own variable, `--font-mona`, which the Feed zone reads through
 * `--f-font` and Arc through its two type roles; since round v5 slice 6, when
 * the v3 pair went, the theme's `--font-sans` and `--font-display`
 * (`app/globals.css`) read it too. Applied by the Feed zone's root
 * (`feedFontClass`, `FeedScope.tsx`) and, since round v5 slice 0, by the root
 * layout's <html> too: the Arc back office sets its text in Mona Sans
 * (QĐ-38), and its layers portalled to <body> can only read a variable
 * defined at the top. DESIGN.md §3 records that every route, the back office
 * included, already preloaded these three files.
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
