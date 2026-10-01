import { monaSans } from "./font";

/**
 * The attribute that turns the Feed zone on. Every Feed token (`--f-*`,
 * `app/globals.css`) and every Feed rule (`app/styles/feed/*.css`) is
 * declared under `[data-ui="feed"]`, so nothing outside an element carrying it
 * changes by a pixel. The frame's root carries it (`FeedChrome`), and the back
 * office (the Arc zone, `data-ui="admin"`) never does.
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
