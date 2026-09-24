import type { MetadataRoute } from "next";
import { SITE_NAME, THEME_COLOR } from "@/lib/site";

/**
 * The web app manifest (v3 slice 10, QĐ-31): what a phone uses when someone
 * adds HIVE to the home screen. `display: "browser"`: it opens as a tab like
 * any other; the shop does not install itself as an app.
 *
 * The icons are phone icon P2, drawn by `scripts/brand-assets.ts`:
 *   · purpose "any" — P2 as approved, the bee at scale(.9) on the honey
 *     square, the same drawing as `apple-icon.png`;
 *   · purpose "maskable" — the same drawing, the bee at scale(.879). A phone
 *     crops a maskable icon to its own shape and promises only the circle of
 *     80 % of the tile, so nothing may reach further than 40 % of a side from
 *     the centre: 400 of the tile's 1000 units. The bee reaches 454.74 units
 *     at scale 1 (the outer corners of the H's feet), 409.3 at .9 — outside —
 *     and 400 / 454.74 = 0.8796, taken down to 0.879: 399.7 units.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    start_url: "/",
    display: "browser",
    theme_color: THEME_COLOR,
    background_color: THEME_COLOR,
    icons: [
      { src: "/icons/hive-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/hive-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/hive-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/hive-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
