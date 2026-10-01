import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { ProductsShop } from "@/components/feed/ProductsShop";
import { demoNowMs } from "@/lib/clock";
import { loadCatalog } from "@/lib/db/catalog";
import { parseShopState, shopLines } from "@/lib/feed";
import { homeMoment, lineIssue } from "@/lib/feed-home";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

/**
 * "Cửa hàng" — the layout's template adds "· HIVE". In the page's language
 * since round v6 slice E1 ("Shop"), with the site's description in it too;
 * the link card keeps the layout's Vietnamese one (QĐ-40).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return { title: t({ vi: "Cửa hàng", en: "Shop" }), description: t(SITE_DESCRIPTION_TEXT) };
}

/**
 * The shop, round v4 "Feed" (slice 1b): the approved mock's
 * `prototype/explore/feed/products.html` — "Cửa hàng", the line switch, the
 * family chips, the count and the sort (a sheet on the phone, a menu from the
 * chip on a desktop), the grid, and the empty grid's way to another line.
 *
 * Its lines follow the shop's moment, as the home page's Cửa hàng tab does
 * (`homeMoment`, `shopLines`): while an issue sells, "Tất cả", the issue (the
 * line a visit opens on) and the fixed line; once it has closed, the fixed
 * line first and the issue after it, shown closed. The server reads the clock
 * once and hands the instant down (`FeedFrame`'s `now`), so the lines, the
 * cards' stock lines and every state agree on both sides of hydration.
 *
 * The grid's state is in the query — `?line=`, `?family=`, `?sort=` — as on
 * the home tab (QĐ-8). `searchParams` is a promise in Next 16.
 */
export default async function ProductsPage(props: PageProps<"/products">) {
  const sp = await props.searchParams;
  const catalog = await loadCatalog();
  const nowMs = demoNowMs();
  const moment = homeMoment(catalog, new Date(nowMs));
  const lines = shopLines(lineIssue(moment), moment.kind === "open", true);
  const state = parseShopState(sp, lines);

  return (
    <FeedFrame page="products" now={nowMs}>
      <ProductsShop lines={lines} initial={state} />
    </FeedFrame>
  );
}
