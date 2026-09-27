import { monaSans } from "./font";

/**
 * The attribute that turns the Feed zone on. Every Feed token (`--f-*`,
 * `app/globals.css`) and every Feed rule (`app/styles/feed/*.css`) is
 * declared under `[data-ui="feed"]`, so nothing outside an element carrying it
 * changes by a pixel.
 */
export const FEED_ZONE = { "data-ui": "feed" } as const;

/**
 * The class a Feed zone root also needs: it defines `--font-mona`, which the
 * zone's `--f-font` reads. A layer portalled out of the zone (a toast on
 * `document.body`) carries both — `{...FEED_ZONE}` and this class — on its
 * own root. A `<dialog>` rendered inside the zone needs neither: it inherits
 * them from where it sits in the tree, top layer or not.
 */
export const feedFontClass = monaSans.variable;

interface FeedScopeProps {
  children: React.ReactNode;
  /** The screen's own frame class, beside the zone's. */
  className?: string;
}

/**
 * The root of a Feed screen (round v4). Wrap a route in it — or give the
 * frame's own root element `{...FEED_ZONE}` and `feedFontClass` — and the
 * Feed tokens, Mona Sans and the Feed rules apply inside it and nowhere else.
 * The v3 screens and the back office (`.s.v3`, `.s.adm3`) never carry it.
 *
 * It sets the zone's ground, ink and type (the mock's `body` rule) and no
 * layout: the column, the bars and the footer are the frame's.
 */
export function FeedScope({ children, className }: FeedScopeProps) {
  return (
    <div {...FEED_ZONE} className={className ? `${feedFontClass} ${className}` : feedFontClass}>
      {children}
    </div>
  );
}
