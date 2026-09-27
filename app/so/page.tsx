import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { ArchiveList } from "@/components/feed/issue/ArchiveList";
import { demoNowMs } from "@/lib/clock";
import { loadCatalog } from "@/lib/db/catalog";

/** "Các Số đã đóng" — the layout adds "· HIVE". */
export const metadata: Metadata = { title: "Các Số đã đóng" };

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
  await loadCatalog();
  return (
    <FeedFrame page="archive" now={demoNowMs()} mbar={{ title: "Các Số đã đóng", back: "/", watch: "[data-ui='feed'] .b-title" }}>
      <div className="b-wrap b-page">
        <ArchiveList />
      </div>
    </FeedFrame>
  );
}
