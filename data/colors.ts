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
 * `label` is shown to the shopper, so it stays Vietnamese. The key is code.
 */
export const COLORS: Record<ColorKey, Color> = {
  black: { key: "black", label: "Đen", hex: "#1C1C1C" },
  cream: { key: "cream", label: "Kem", hex: "#E6DFD1" },
  grey: { key: "grey", label: "Xám", hex: "#8C8C8C" },
  moss: { key: "moss", label: "Rêu", hex: "#4A5240" },
  brown: { key: "brown", label: "Nâu", hex: "#5C4536" },
  white: { key: "white", label: "Trắng", hex: "#F2F1ED" },
  navy: { key: "navy", label: "Xanh than", hex: "#2B3A52" },
};
