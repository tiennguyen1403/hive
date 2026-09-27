import { notFound, redirect } from "next/navigation";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { HomeCalendar } from "@/components/feed/home/HomeCalendar";
import { HomeFeed } from "@/components/feed/home/HomeFeed";
import { HomeShop } from "@/components/feed/home/HomeShop";
import { HOME_TAB_SCRIPT, HomePanel, HomeTabList, HomeTabs } from "@/components/feed/home/HomeTabs";
import { demoNowMs } from "@/lib/clock";
import { loadCatalog } from "@/lib/db/catalog";
import { dropState } from "@/lib/drop";
import { parseShopState, shopLines } from "@/lib/feed";
import { homeMoment, lineIssue } from "@/lib/feed-home";

/**
 * The home page, round v4 "Feed" (slice 1a): the approved mock's
 * `prototype/explore/feed/home.html` — three tabs switched in place (Bảng
 * tin, Cửa hàng, Sắp mở; `#bang-tin`, `#cua-hang`, `#sap-mo`) inside the Feed
 * frame, and in Bảng tin one of four moments read off the clock and the
 * calendar (`homeMoment`, `lib/feed-home.ts`).
 *
 * The server reads the clock once and hands the instant down (`FeedFrame`'s
 * `now`): the moment, the shop's lines and every countdown's first second
 * are drawn from it on both sides of hydration. The Cửa hàng tab's grid state
 * is in the query (`?line=`, `?family=`), so a reload opens the same grid;
 * the tab is in the hash, which a script puts on screen before the first
 * paint (`HOME_TAB_SCRIPT`).
 */
export default async function HomePage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const catalog = await loadCatalog();
  const nowMs = demoNowMs();
  const now = new Date(nowMs);

  // `?drop=N` is in browser histories and printed links from before the Feed round: a closed issue has had
  // a page of its own since v3 slice 4, an issue that never existed is a 404, and any other issue is this page.
  const asked = Number(Array.isArray(sp.drop) ? sp.drop[0] : sp.drop);
  if (Number.isFinite(asked)) {
    const one = catalog.dropByNo.get(asked);
    if (!one) notFound();
    if (dropState(one, now) === "CLOSED") redirect(`/so/${one.no}`);
  }

  const moment = homeMoment(catalog, now);
  const lines = shopLines(lineIssue(moment), moment.kind === "open", false);
  const shop = parseShopState(sp, lines);

  return (
    <HomeTabs lines={lines} initialShop={shop}>
      <FeedFrame page="home" mid={<HomeTabList />} now={nowMs}>
        <script dangerouslySetInnerHTML={{ __html: HOME_TAB_SCRIPT }} />
        <h1 className="sr-only">HIVE</h1>
        <HomePanel id="bang-tin">
          <HomeFeed />
        </HomePanel>
        <HomePanel id="cua-hang" className="panel-shop">
          <h2 className="sr-only">Cửa hàng</h2>
          <HomeShop />
        </HomePanel>
        <HomePanel id="sap-mo">
          <h2 className="sr-only">Sắp mở</h2>
          <HomeCalendar />
        </HomePanel>
      </FeedFrame>
    </HomeTabs>
  );
}
