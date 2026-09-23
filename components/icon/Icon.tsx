import {
  ICON_NAMES,
  INK,
  INK_DUO,
  INK_FALLBACK,
  PATHS_BULK,
  PATHS_LINEAR,
  type IconName,
} from "./paths";

export type { IconName };

/**
 * Names that are MARKS, not glyphs. They must not be placed beside other
 * icons at the same declared size, because the declared size is not what
 * anyone sees.
 *
 * Measured in the browser with getBBox(), long axis of the ink in the
 * 24-unit viewBox:
 *
 *   check       8.5    ← the outlier
 *   minus/plus  12     a matched pair; a stepper's two halves agree
 *   arrows      15.84  narrower on purpose, and they read fine
 *   typical     20
 *
 * In a FULL 24-unit box that puts check's ink at 6.38 × 4.24px in an 18px
 * frame, filling 8.4% of the box against a typical 62-69%. `OPTICAL` below
 * crops the frame to 6.5/11 so the size is honest again — but the name stays
 * on this list, because a tick is still a MARK: it belongs inside a box that
 * something was ticked in, not beside a word. `<Tick>` is how it gets there.
 *
 * Iconsax draws `check` as a small tick floating in the middle of its
 * canvas, because it is meant to sit inside a checkbox. Next to `search` it
 * renders at 43% the size and reads as a mistake — which is exactly what
 * prompted this list.
 *
 * Scaling it up is not the fix: the stroke scales with it, and at a
 * comparable ink size the line comes out 3.5px, heavier than the 12px label
 * beside it. The fix is `<Tick>`, whose viewBox is cropped to the ink so the
 * CSS size IS the visible size and the stroke stays around 1.8px.
 *
 * For a check-shaped glyph that belongs beside a label, use `confirm`
 * (Iconsax TickCircle), which is drawn on the normal grid.
 */
export const MARK_NAMES = ["check"] as const satisfies readonly IconName[];

export type MarkName = (typeof MARK_NAMES)[number];

/** Every name that is safe to render beside other icons at one size. */
export const GLYPH_NAMES = ICON_NAMES.filter(
  (n): n is Exclude<IconName, MarkName> =>
    !(MARK_NAMES as readonly string[]).includes(n),
);

/**
 * OPTICAL SIZE — the glyphs whose ink is far smaller than their frame.
 *
 * Iconsax draws every glyph in a 24-unit cell, but `plus`, `minus` and
 * `check` are drawn to sit INSIDE something else — a stepper's box, a
 * checkbox — so their ink fills roughly half the cell. Rendered at the same
 * declared size as `search` or `bag` they read as smaller icons, which is
 * what the cart's `−` and `+` looked like next to their own 13px label.
 *
 * Scaling them up is not the fix: the stroke scales with the glyph, and at a
 * matching ink size the line comes out heavier than the text beside it. The
 * fix is to CROP THE FRAME to the ink, so the CSS size IS the visible size
 * and the 1.5 stroke is untouched. Same idea as `<Tick>` below, and the same
 * table the v3 mock carries (`OPTICAL` in `prototype/v3/v3.js`).
 *
 * `[origin, size]` of a square viewBox. Linear only: the Bulk glyphs are
 * filled shapes drawn corner to corner and need no help.
 */
export const OPTICAL = {
  plus: [4, 16],
  minus: [4, 16],
  check: [6.5, 11],
} as const satisfies Partial<Record<IconName, readonly [number, number]>>;

/** The full Iconsax cell, for every glyph the table does not crop. */
const FULL_FRAME = [0, 24] as const;

/** Which square this glyph is drawn in: cropped for the three above, 24 otherwise. */
export function frameOf(name: IconName, bulk = false): readonly [number, number] {
  return (!bulk && (OPTICAL as Record<string, readonly [number, number]>)[name]) || FULL_FRAME;
}

/** `"0 0 24 24"`, or `"4 4 16 16"` / `"6.5 6.5 11 11"` for a cropped glyph. */
export function viewBoxOf(name: IconName, bulk = false): string {
  const [origin, size] = frameOf(name, bulk);
  return `${origin} ${origin} ${size} ${size}`;
}

/**
 * The two custom properties that let CSS trim an icon's transparent margins
 * out of the layout box, as fractions of the glyph's OWN frame.
 *
 * Pulled out of the component so it can be checked without a DOM: the test
 * compares all 102 variants against what the approved prototype emitted, and
 * these four decimal places are the contract — round differently and every
 * icon shifts by a fraction of a pixel.
 *
 * The three cropped glyphs are measured against the cropped square, because
 * `1em` on the SVG is now that square. Measuring them against 24 would trim
 * margins that are no longer in the box.
 */
export function inkVars(name: IconName, bulk = false) {
  const [x, width] = (bulk ? INK_DUO : INK)[name] ?? INK_FALLBACK;
  const [origin, size] = frameOf(name, bulk);
  return {
    "--il": ((x - origin) / size).toFixed(4),
    "--ir": ((origin + size - x - width) / size).toFixed(4),
  };
}

interface IconProps {
  name: IconName;
  /**
   * Bulk (duotone) instead of Linear. Reserved for an ON state, a current
   * selection, or a moment worth pausing on — an empty state, an order
   * received. Solid-versus-hollow is the channel that carries the state; it
   * does not need a colour channel on top.
   */
  bulk?: boolean;
  className?: string;
  /**
   * Icons are decoration by default and hidden from assistive tech, because
   * the label beside them already says it. Pass a label only for an icon
   * standing alone with no text — an icon-only button.
   */
  label?: string;
}

/**
 * An Iconsax glyph in the system's SVG shell.
 *
 * Colour is INHERITED, always. An icon is the same colour as the text beside
 * it; to change it, set `color` on whatever contains them both. There is no
 * colour prop on purpose.
 *
 * Every icon carries `--il` / `--ir`: the transparent margin to its left and
 * right as a fraction of the 24×24 box. Where an icon sits beside text, CSS
 * uses those to trim the emptiness out of the layout box so a declared `gap`
 * is the gap you actually see. Where an icon stands alone, they are ignored —
 * there the square box IS the 44px touch target.
 */
export function Icon({ name, bulk = false, className, label }: IconProps) {
  const cls = ["ic", bulk && "duo", className].filter(Boolean).join(" ");

  return (
    <svg
      className={cls}
      viewBox={viewBoxOf(name, bulk)}
      fill="none"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={inkVars(name, bulk) as React.CSSProperties}
      dangerouslySetInnerHTML={{
        __html: bulk ? PATHS_BULK[name] : PATHS_LINEAR[name],
      }}
    />
  );
}

/**
 * The check mark used as a MARK INSIDE A BOX — a menu item's tick, a
 * checkbox, a completed step.
 *
 * Its viewBox is cropped to the ink (`7.75 9.17 8.5 5.66`) rather than left
 * at 24×24. Iconsax's check occupies 8.5 of 24 units across and 5.66 of 24
 * down, so inside a full-size box the declared size is not the size anyone
 * sees: at 14px the mark renders about 5px wide and reads as a speck.
 * Cropped, the CSS width IS the visible width, and the stylesheet that owns
 * each surface sets the real numbers (`sheet.css` for a menu tick,
 * `forms.css` for a checkbox, `checkout.css` for a completed step).
 *
 * This is the ONLY way the check should reach a screen. `<Icon name="check" />`
 * puts the same tick in a full 24×24 box, where it renders at 43% the size of
 * its neighbours — see MARK_NAMES above.
 */
export function Tick({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="7.75 9.17 8.5 5.66"
      fill="none"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS_LINEAR.check }}
    />
  );
}
