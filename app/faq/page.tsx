import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";
import { HelpView } from "@/components/feed/help/HelpView";
import { loadCatalog } from "@/lib/db/catalog";

export const metadata: Metadata = {
  title: "Hỏi đáp",
  description: "Phí giao, hết size, chuyển khoản, đổi trả, chọn size.",
};

/** The phone's bar: back to Tôi (the mock's `data-back`); the title once the page's own has scrolled away. */
const MBAR: FeedMbarProps = { title: "Hỏi đáp", back: "/account", watch: "[data-ui='feed'] .b-title" };

/** `?q=cod` — one value, however the query happens to be written. */
function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * Hỏi đáp, round v4 "Feed" (slice 4b): the approved mock's
 * `prototype/explore/feed/help.html` (`HelpView`), in place of the v3 page
 * "Câu hỏi thường gặp" — Tôi lit in the tab bar, as the mock's `TAB_OF` has
 * `help: "me"`, and the light footer without the links to this page (the
 * mock's `data-foot-skip="help.html"`: "Hỏi đáp" and "Đổi trả 7 ngày").
 *
 * A search in the address (`?q=cod`) is drawn by the server first. The group
 * a hash names (`#doi-tra`) opens on the screen, since the server never sees
 * the hash. One answer follows the clock — when the next issue opens — so the
 * catalogue is the request's (`loadCatalog`) and the frame hands the screen
 * the instant it was drawn at. `searchParams` is a promise in Next 16.
 */
export default async function FaqPage(props: PageProps<"/faq">) {
  const [sp] = await Promise.all([props.searchParams, loadCatalog()]);
  return (
    <FeedFrame page="help" foot="lite" footSkip={["/faq"]} mainClass="b-wrap b-page" mbar={MBAR}>
      <HelpView initial={first(sp.q)} />
    </FeedFrame>
  );
}
