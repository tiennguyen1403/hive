import type { Metadata } from "next";
import Link from "next/link";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { FeedIcon, type FeedIconName } from "@/components/feed/icon/FeedIcon";
import { picker, type Pair } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

/** The page's name: "Not found" in English (round v6 slice E3b). */
const TITLE: Pair = { vi: "Không tìm thấy", en: "Not found" };

/**
 * "Không tìm thấy" — the layout's template adds "· HIVE" — in the page's
 * language, with the site's description in it, which is what the Vietnamese
 * page has always inherited. Next resolves a `not-found` file's own
 * `generateMetadata` as it does a page's (`collectMetadata`,
 * `next/dist/lib/metadata/resolve-metadata.js`).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return { title: t(TITLE), description: t(SITE_DESCRIPTION_TEXT) };
}

/** The three ways back (`404.html`), each its glyph before and an arrow after: the glossary's names in English. */
const WAYS: readonly (readonly [string, FeedIconName, Pair])[] = [
  ["/", "newspaper", { vi: "Bảng tin", en: "Feed" }],
  ["/products", "storefront", { vi: "Cửa hàng", en: "Shop" }],
  ["/track", "package", { vi: "Tra cứu đơn", en: "Track an order" }],
];

/**
 * The 404, round v4 "Feed" (slice 4a): the approved mock's
 * `prototype/explore/feed/404.html` for the whole app — every address that
 * matches no route, and every `notFound()` without a page of its own (the
 * order's "Không tìm thấy đơn" keeps its own, slice 3b). "Không tìm thấy",
 * then Bảng tin, Cửa hàng and Tra cứu đơn as three large ways back; the light
 * footer and the tab bar, nothing lit; on the phone a bar with the logo alone.
 *
 * Next answers 404 and asks search engines to leave the page out by itself
 * (`03-api-reference/04-functions/not-found.md`). In the page's language
 * since round v6 slice E3b ("Not found"; "Feed", "Shop", "Track an order").
 */
export default async function NotFound() {
  const t = picker(await getLocale());
  return (
    <FeedFrame page="other" foot="lite" mainClass="b-wrap b-page" mbar="brand">
      <div className="b-nf">
        <h1 className="b-nf-title disp">{t(TITLE)}</h1>
        <nav className="b-nf-links" aria-label={t({ vi: "Về lại", en: "Go back" })}>
          {WAYS.map(([href, icon, label]) => (
            <Link key={href} href={href}>
              <FeedIcon name={icon} />
              <span className="disp">{t(label)}</span>
              <FeedIcon name="arrow-right" className="i-arrow-right" />
            </Link>
          ))}
        </nav>
      </div>
    </FeedFrame>
  );
}
