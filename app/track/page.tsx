import type { Metadata } from "next";
import { TrackView } from "@/components/feed/account/TrackView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";
import { loadMe } from "@/lib/db/profiles";
import { picker, type Locale, type Pair } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

/** The page's name: the glossary's "Track an order" in English (round v6 slice E2). */
const TITLE: Pair = { vi: "Tra cứu đơn", en: "Track an order" };

/**
 * "Tra cứu đơn" — the layout's template adds "· HIVE" — in the page's
 * language, with the site's description in it; the link card keeps the
 * layout's Vietnamese one (QĐ-40).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return {
    title: t(TITLE),
    description: t(SITE_DESCRIPTION_TEXT),
    // Somebody's order behind a code and a phone number. Nothing here belongs
    // in a search index.
    robots: { index: false, follow: false },
  };
}

/** The phone's bar: back to Tôi; the title once the page's own has scrolled away, or while an order stands. */
function mbarOf(locale: Locale): FeedMbarProps {
  return { title: picker(locale)(TITLE), back: "/account", watch: "[data-ui='feed'] .b-title" };
}

/** `?code=DH-1499` — one value, however the query happens to be written. */
function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * Tra cứu đơn, round v4 "Feed" (slice 4a): the approved mock's
 * `prototype/explore/feed/track.html` (`TrackView`) — one column in the
 * middle of the page, the light footer without its own "Tra cứu đơn", "Tôi"
 * lit in the tab bar.
 *
 * NOTHING IS LOOKED UP HERE. Each lookup spends one of the visitor's lookups
 * (slice B11, `lib/db/order-lookup.ts`), and a render may run again — on a
 * refresh, a revalidation, or a prefetch nobody asked for — so the page only
 * reads `code` and `phone` off the address and hands them down; the screen
 * looks them up once, when it mounts (`lookupOrderAction`). `searchParams` is
 * a promise in Next 16.
 */
export default async function TrackPage(props: PageProps<"/track">) {
  const [me, sp, locale] = await Promise.all([loadMe(), props.searchParams, getLocale()]);
  return (
    <FeedFrame page="track" foot="lite" footSkip={["/track"]} mainClass="b-wrap b-page p-track" mbar={mbarOf(locale)}>
      <TrackView code={first(sp.code)} phone={first(sp.phone)} signedIn={me !== null} />
    </FeedFrame>
  );
}
