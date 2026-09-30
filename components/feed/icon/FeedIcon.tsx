import { FEED_ICON_PATHS, type FeedIconName } from "./paths";

export type { FeedIconName };

interface FeedIconProps {
  /**
   * A Phosphor glyph. The regular weight is the name (`heart`); a glyph in
   * its on-state is the `-fill` name (`heart-fill`), as the mock swaps them —
   * the state picks the name, there is no weight prop.
   */
  name: FeedIconName;
  /**
   * The box size and any placement, from the stylesheet that owns the
   * surface (`.btn .i` 20px, `.chip .i` 18px…); unstyled, the box is 24px.
   */
  className?: string;
  /**
   * Icons are decoration and hidden from assistive tech, because the words
   * beside them already say it. Pass a label only for an icon that stands
   * alone with no text.
   */
  label?: string;
}

/**
 * A Phosphor glyph for the Feed screens (round v4, QĐ-32). The back office
 * keeps Iconsax through `components/icon/`.
 *
 * Drawn the way the mock draws it (`icon()` in `prototype/explore/feed/feed.js`):
 * a square box, 24px unless the surface sizes it, the glyph filling the box
 * edge to edge on Phosphor's 256-unit grid, painted in the text colour. The
 * mock paints through a CSS mask; this is the same path filled with
 * `currentColor`, so an icon is always the colour of the words beside it —
 * to change it, set `color` on whatever contains both.
 *
 * The class is `i`, the mock's own name, so a rule ported from the mock
 * (`.btn .i{ width:20px; height:20px }`) sizes it unchanged. It has no
 * effect outside the Feed zone (`[data-ui="feed"]`, `app/globals.css`).
 */
export function FeedIcon({ name, className, label }: FeedIconProps) {
  return (
    <svg
      className={className ? `i ${className}` : "i"}
      viewBox="0 0 256 256"
      fill="currentColor"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={FEED_ICON_PATHS[name]} />
    </svg>
  );
}
