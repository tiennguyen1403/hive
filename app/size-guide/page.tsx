import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";
import { SizeGuideView } from "@/components/feed/help/SizeGuideView";
import { loadCatalog } from "@/lib/db/catalog";
import { picker, type Locale, type Pair } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

/** The page's name: the glossary's "Size guide" in English (round v6 slice E3b). */
const TITLE: Pair = { vi: "Bảng size", en: "Size guide" };

/**
 * "Bảng size" — the layout's template adds "· HIVE" — in the page's language,
 * with the site's description in it, which is what the Vietnamese page has
 * always inherited; the link card keeps the layout's Vietnamese one (QĐ-40).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return { title: t(TITLE), description: t(SITE_DESCRIPTION_TEXT) };
}

/** The phone's bar: back to Hỏi đáp (the mock's `data-back`); the title once the page's own has scrolled away. */
function mbarOf(locale: Locale): FeedMbarProps {
  return { title: picker(locale)(TITLE), back: "/faq", watch: "[data-ui='feed'] .b-title" };
}

/**
 * Bảng size, round v4 "Feed" (slice 4b), a route of its own since this slice:
 * the approved mock's `prototype/explore/feed/size-guide.html`
 * (`SizeGuideView`) — the four charts the product page's sheet opens one at a
 * time, and the heights that mark them. Tôi lit in the tab bar (the mock's
 * `TAB_OF`), the whole footer without its own "Bảng size" (the mock's
 * `data-foot-skip="size-guide.html"`).
 *
 * The names under each chart are what sells now, read off the clock: the
 * catalogue is the request's (`loadCatalog`), and the frame hands the screen
 * the instant it was drawn at.
 */
export default async function SizeGuidePage() {
  const [, locale] = await Promise.all([loadCatalog(), getLocale()]);
  return (
    <FeedFrame page="size-guide" footSkip={["/size-guide"]} mainClass="b-wrap b-page" mbar={mbarOf(locale)}>
      <SizeGuideView />
    </FeedFrame>
  );
}
