import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";
import { SizeGuideView } from "@/components/feed/help/SizeGuideView";
import { loadCatalog } from "@/lib/db/catalog";

export const metadata: Metadata = { title: "Bảng size" };

/** The phone's bar: back to Hỏi đáp (the mock's `data-back`); the title once the page's own has scrolled away. */
const MBAR: FeedMbarProps = { title: "Bảng size", back: "/faq", watch: "[data-ui='feed'] .b-title" };

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
  await loadCatalog();
  return (
    <FeedFrame page="size-guide" footSkip={["/size-guide"]} mainClass="b-wrap b-page" mbar={MBAR}>
      <SizeGuideView />
    </FeedFrame>
  );
}
