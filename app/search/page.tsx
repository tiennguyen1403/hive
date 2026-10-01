import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { SearchScreen } from "@/components/feed/search/SearchScreen";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

/** The query as the address carries it, trimmed; nothing when there is none. */
async function queryOf(props: PageProps<"/search">): Promise<string> {
  const sp = await props.searchParams;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  return (q ?? "").trim();
}

/**
 * "hoodie · Tìm", as the mock titles a search; "Tìm" before one. The layout
 * adds "· HIVE". In English (round v6 slice E1) "hoodie · Search", with the
 * site's description in the page's language; the screen keeps the tab's title
 * in step as the query changes (`SearchScreen`).
 */
export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const [q, locale] = await Promise.all([queryOf(props), getLocale()]);
  const t = picker(locale);
  const word = t({ vi: "Tìm", en: "Search" });
  return { title: q ? `${q} · ${word}` : word, description: t(SITE_DESCRIPTION_TEXT) };
}

/**
 * Search, round v4 "Feed" (slice 1b): the approved mock's
 * `prototype/explore/feed/search.html` (`SearchScreen`). The field is the
 * screen's own bar on the phone, where the brand bar would be; the tab bar
 * lights "Tìm". The query lives in the address (`?q=`), so a result page is a
 * link that can be sent, and the server draws it first.
 */
export default async function SearchPage(props: PageProps<"/search">) {
  const q = await queryOf(props);
  return (
    <FeedFrame page="search">
      {/* Keyed on the query: a link to another search starts the screen over on it. */}
      <SearchScreen key={q} initial={q} />
    </FeedFrame>
  );
}
