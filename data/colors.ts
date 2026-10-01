import { pick, type Locale, type Pair } from "@/lib/i18n";
import type { Color, ColorKey } from "./types";

/**
 * The seven fabric colours, as static reference data.
 *
 * Deliberately NOT part of `Catalog`: the colour table is not something a
 * drop publishes and not something an admin edits — it is the palette the
 * whole shop is cut from, the same seven whether the catalogue comes from a
 * fixture or from Postgres. Keeping it out of `Catalog` also keeps it out of
 * the payload that crosses the server → client boundary on every page.
 *
 * `label` is shown to the shopper in Vietnamese. The key is code.
 *
 * In English since round v6 slice E1 (QĐ-40), by the user's glossary
 * (`tasks/plan.md`, "Thuật ngữ tiếng Anh"): each name is a `{ vi, en }` pair in
 * `COLOR_LABEL_TEXT`, `COLORS` keeps the Vietnamese side as its `label`, as
 * every screen has read it, and `colorLabel(key, locale)` gives either.
 */
export const COLOR_LABEL_TEXT: Readonly<Record<ColorKey, Pair>> = {
  black: { vi: "Đen", en: "Black" },
  cream: { vi: "Kem", en: "Cream" },
  grey: { vi: "Xám", en: "Grey" },
  moss: { vi: "Rêu", en: "Moss" },
  brown: { vi: "Nâu", en: "Brown" },
  white: { vi: "Trắng", en: "White" },
  navy: { vi: "Xanh than", en: "Navy" },
};

export const COLORS: Record<ColorKey, Color> = {
  black: { key: "black", label: COLOR_LABEL_TEXT.black.vi, hex: "#1C1C1C" },
  cream: { key: "cream", label: COLOR_LABEL_TEXT.cream.vi, hex: "#E6DFD1" },
  grey: { key: "grey", label: COLOR_LABEL_TEXT.grey.vi, hex: "#8C8C8C" },
  moss: { key: "moss", label: COLOR_LABEL_TEXT.moss.vi, hex: "#4A5240" },
  brown: { key: "brown", label: COLOR_LABEL_TEXT.brown.vi, hex: "#5C4536" },
  white: { key: "white", label: COLOR_LABEL_TEXT.white.vi, hex: "#F2F1ED" },
  navy: { key: "navy", label: COLOR_LABEL_TEXT.navy.vi, hex: "#2B3A52" },
};

/** A colour's name in one language: "Xanh than", or "Navy". */
export function colorLabel(key: ColorKey, locale: Locale = "vi"): string {
  return pick(COLOR_LABEL_TEXT[key], locale);
}
