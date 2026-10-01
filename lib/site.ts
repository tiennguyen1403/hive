import type { Pair } from "./i18n";

/**
 * The site as others name it: the document head, the link cards, the search
 * results, the phone's home screen. One place, so `app/layout.tsx` and
 * `app/manifest.ts` cannot drift apart.
 */

export const SITE_NAME = "HIVE";

/**
 * Description A (QĐ-31): the line under the name in a search result and on a
 * link card. It was `metadata.description` before the share card existed and
 * the user kept it for the card too.
 *
 * In both languages since round v6 slice E1: the shop's pages print the
 * English as their `description` when the page is English. The link card
 * (`openGraph`, and the Twitter card Next fills from it) keeps the Vietnamese
 * `SITE_DESCRIPTION`, as the share image does (QĐ-40).
 */
export const SITE_DESCRIPTION_TEXT: Pair = {
  vi: "Streetwear unisex bán theo số. Mỗi số cắt một lần.",
  en: "Unisex streetwear, sold in drops. Each drop is cut once.",
};

export const SITE_DESCRIPTION = SITE_DESCRIPTION_TEXT.vi;

/**
 * The ground, as the browser's own chrome wears it: `viewport.themeColor`,
 * and the manifest's theme and background. Since round v4 slice 1a the Feed's
 * ground, `#FCFCFD` (the mock's `<meta name="theme-color">`; `--f-bg`), on
 * every page: the browser's bar is one colour for the whole shop.
 */
export const THEME_COLOR = "#FCFCFD";

/**
 * The environment `siteOrigin` reads — `process.env`, or a stand-in in a
 * test. Only `VERCEL_PROJECT_PRODUCTION_URL` and `PORT` are looked at.
 */
export type OriginEnv = Readonly<Record<string, string | undefined>>;

/**
 * What every absolute URL in the head is built on (`metadataBase`): an
 * `og:image` has to be absolute for a link card to find it.
 *
 * Taken from the environment, not written down. On Vercel,
 * `VERCEL_PROJECT_PRODUCTION_URL` is the production domain (a system
 * variable, set on every deployment, previews included). Anywhere else the
 * shop is being served from this machine: `next start -p` puts its port in
 * `PORT`, and Next's own default is 3000.
 *
 * On a preview deployment Next points the share image at the preview's own
 * address whatever this says (`getSocialImageMetadataBaseFallback` in
 * `next/dist/lib/metadata/resolvers/resolve-url.js`, read on 16.3.5), so a
 * preview shows its own picture.
 */
export function siteOrigin(env: OriginEnv): URL {
  const host = env.VERCEL_PROJECT_PRODUCTION_URL;
  if (host) return new URL(`https://${host}`);
  return new URL(`http://localhost:${env.PORT || "3000"}`);
}
