import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";
import { HelpView } from "@/components/feed/help/HelpView";
import { loadCatalog } from "@/lib/db/catalog";
import { picker, type Locale, type Pair } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

/** The page's name: the glossary's "FAQ" in English (round v6 slice E3b). */
const TITLE: Pair = { vi: "Hỏi đáp", en: "FAQ" };

/** "Hỏi đáp" — the layout's template adds "· HIVE" — and what it answers, in the page's language. */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return {
    title: t(TITLE),
    description: t({
      vi: "Phí giao, hết size, chuyển khoản, đổi trả, chọn size.",
      en: "Delivery fees, sold-out sizes, bank transfer, returns, choosing a size.",
    }),
  };
}

/** The phone's bar: back to Tôi (the mock's `data-back`); the title once the page's own has scrolled away. */
function mbarOf(locale: Locale): FeedMbarProps {
  return { title: picker(locale)(TITLE), back: "/account", watch: "[data-ui='feed'] .b-title" };
}

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
  const [sp, , locale] = await Promise.all([props.searchParams, loadCatalog(), getLocale()]);
  return (
    <FeedFrame page="help" foot="lite" footSkip={["/faq"]} mainClass="b-wrap b-page" mbar={mbarOf(locale)}>
      <HelpView initial={first(sp.q)} />
    </FeedFrame>
  );
}
