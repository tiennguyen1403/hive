import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { SearchScreen } from "@/components/feed/search/SearchScreen";

/** The query as the address carries it, trimmed; nothing when there is none. */
async function queryOf(props: PageProps<"/search">): Promise<string> {
  const sp = await props.searchParams;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  return (q ?? "").trim();
}

/** "hoodie · Tìm", as the mock titles a search; "Tìm" before one. The layout adds "· HIVE". */
export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const q = await queryOf(props);
  return { title: q ? `${q} · Tìm` : "Tìm" };
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
