import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { ArchiveList } from "@/components/feed/issue/ArchiveList";
import { demoNowMs } from "@/lib/clock";
import { loadCatalog } from "@/lib/db/catalog";
import { ARCHIVE_TITLE } from "@/lib/feed-issue";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

/**
 * "Các Số đã đóng" — the layout adds "· HIVE". In the page's language since
 * round v6 slice E1 ("Closed drops"), with the site's description in it.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return { title: t(ARCHIVE_TITLE), description: t(SITE_DESCRIPTION_TEXT) };
}

/**
 * The closed issues, round v4 "Feed" (slice 1b): the approved mock's
 * `prototype/explore/feed/archive.html` (`ArchiveList`), a route of its own
 * since this slice — the home page's "Đã đóng" leads here with "Xem tất cả",
 * and each issue to `/so/N`.
 *
 * Which issues have closed is read off the clock: the server reads it once
 * and hands the instant down (`FeedFrame`'s `now`). The catalogue read is the
 * request-time read (`connection()` in `lib/db/catalog.ts`), so the page is
 * never prerendered with a frozen clock.
 */
export default async function ArchivePage() {
  const [, locale] = await Promise.all([loadCatalog(), getLocale()]);
  const title = picker(locale)(ARCHIVE_TITLE);
  return (
    <FeedFrame page="archive" now={demoNowMs()} mbar={{ title, back: "/", watch: "[data-ui='feed'] .b-title" }}>
      <div className="b-wrap b-page">
        <ArchiveList />
      </div>
    </FeedFrame>
  );
}
