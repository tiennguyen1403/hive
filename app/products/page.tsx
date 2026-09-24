import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { ProductCard } from "@/components/product/ProductCard";
import { FamilyTabs } from "@/components/product/FamilyTabs";
import { FilterRail } from "@/components/product/FilterRail";
import { ListingControls } from "@/components/product/ListingControls";
import { SortControl } from "@/components/product/SortControl";
import { DropClock } from "@/components/shop/DropClock";
import { Empty } from "@/components/shop/Empty";
import { ShopFrame } from "@/components/shop/ShopFrame";
import type { Drop } from "@/data/types";
import type { Catalog } from "@/lib/catalog";
import { loadCatalog } from "@/lib/db/catalog";
import { dayMonth } from "@/lib/datetime";
import { dropBandLabel, dropState, featuredDrop } from "@/lib/drop";
import { dropSummary, productsInDrop } from "@/lib/inventory";
import {
  clearFilters,
  filterLabels,
  isFiltered,
  listingHref,
  parseListingQuery,
  runListingQuery,
  type ListingQuery,
} from "@/lib/catalog-query";
import { LEX, issueLabel, issueNo } from "@/lib/lexicon";
import { styleCountLabel } from "@/lib/money";
import { demoNow } from "@/lib/clock";

/**
 * "Số 05 · mười mẫu" — which issue this is and how big it is, both counted
 * rather than typed (`featuredDrop`, `styleCountLabel`). The layout's
 * template adds "· HIVE".
 */
export async function generateMetadata(): Promise<Metadata> {
  const catalog = await loadCatalog();
  const { drop } = featuredDrop(catalog, undefined);
  return {
    title: `${issueLabel(drop.no)} · ${styleCountLabel(productsInDrop(catalog, drop.no).length)}`,
  };
}

/**
 * The whole issue, filtered.
 *
 * Every filter is in `searchParams` and read here on the server, so the grid
 * that renders is the grid the URL describes — shareable, reloadable, and
 * correct after Back. `await props.searchParams` is not optional in Next 16:
 * it is a promise now, and reading it synchronously is gone.
 *
 * Two controls, one query. On a phone the chip row plus the filter sheet; on
 * a monitor the rail standing open beside the grid. Both write the same
 * query string, so neither can show something the other cannot reproduce.
 *
 * Styles that have sold out still appear. On an issue the empty shelf is
 * information: it says the cut was real and what went first.
 */
export default async function ProductsPage(props: PageProps<"/products">) {
  const sp = await props.searchParams;
  const query = parseListingQuery(sp);
  const catalog = await loadCatalog();

  const { drop, state } = featuredDrop(catalog, undefined);
  const pool = productsInDrop(catalog, drop.no);
  const shown = runListingQuery(pool, query);
  const summary = dropSummary(catalog, drop.no);
  const closed = state !== "OPEN";
  const no = issueNo(drop.no);
  const filtered = isFiltered(query) || Boolean(query.q);

  return (
    <ShopFrame
      // One family chosen narrows the bar to that word; none chosen lights
      // the issue link, because that is the listing being shown.
      activeFamily={query.families.length === 1 ? query.families[0] : undefined}
      activeDrop={query.families.length === 0}
    >
      <div className="wrap3">
        <div className="lhead">
          <div className="row1">
            <h1 className="big">
              {LEX.t} <span className="num">{no}</span>
            </h1>
            {/* Three facts about the issue itself, all arithmetic over the
                catalog: how many styles, how much of the cut is left, and
                how long the window has to run. */}
            <span className="meta">
              {pool.length} mẫu · {summary.onHand} / {summary.cutUnits} còn ·{" "}
              {state === "CLOSED" ? (
                `đã đóng ${dayMonth(drop.closesAt)}`
              ) : (
                <DropClock
                  drop={drop}
                  state={state}
                  initialLabel={dropBandLabel(drop, state)}
                />
              )}
            </span>
          </div>

          <FamilyTabs pool={pool} applied={query} path="/products" />
          <ListingControls applied={query} path="/products" pool={pool} />
        </div>

        <div className="listing3">
          <FilterRail pool={pool} applied={query} path="/products" />

          <div>
            <div className="listbar">
              <span>
                Hiện {shown.length} / {pool.length} mẫu
              </span>
              <SortControl applied={query} path="/products" />
            </div>

            {shown.length === 0 ? (
              <Empty
                icon="search"
                title="Không có mẫu nào khớp"
                text={`Đang lọc: ${filterLabels(query).join(" · ")}. ${issueLabel(
                  drop.no,
                )} có ${pool.length} mẫu — bỏ bớt một điều kiện để thấy lại chúng.`}
                action={
                  <ButtonLink
                    tone="ink"
                    icon="x"
                    href={listingHref("/products", clearFilters(query))}
                  >
                    Bỏ lọc
                  </ButtonLink>
                }
              />
            ) : (
              <>
                <div className="grid3">
                  {shown.map((p) => (
                    <ProductCard key={p.id} product={p} closed={closed} />
                  ))}
                </div>
                <ListEnd
                  catalog={catalog}
                  query={query}
                  filtered={filtered}
                  shown={shown.length}
                  total={pool.length}
                  onHand={summary.onHand}
                  cutUnits={summary.cutUnits}
                  drop={drop}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </ShopFrame>
  );
}

/**
 * The line that ends the grid.
 *
 * Unfiltered it says how much of the issue is on screen and how much of the
 * cut is still on the shelf, then offers the issues that have closed — both
 * halves arithmetic over the catalog. Filtered it says how many of the ten
 * survived the conditions, and offers the way back to all of them.
 */
function ListEnd({
  catalog,
  query,
  filtered,
  shown,
  total,
  onHand,
  cutUnits,
  drop,
}: {
  catalog: Catalog;
  query: ListingQuery;
  filtered: boolean;
  shown: number;
  total: number;
  onHand: number;
  cutUnits: number;
  drop: Drop;
}) {
  const now = demoNow();
  const past = [...catalog.drops]
    .sort((a, b) => b.no - a.no)
    .filter((d) => d.no !== drop.no && dropState(d, now) === "CLOSED");

  return (
    <p className="listend">
      {filtered ? (
        <>
          <span>
            Hiện {shown} / {total} mẫu
          </span>
          <Link className="lnk" href={listingHref("/products", clearFilters(query))}>
            Bỏ lọc
          </Link>
        </>
      ) : (
        <>
          <span>
            Đã hiện cả {total} mẫu · {onHand} / {cutUnits} còn
          </span>
          {/* Only issues the clock says are over, newest first, and the line
              disappears when there are none — the first issue a shop ever
              runs has nothing behind it. */}
          {past.length > 0 && (
            <span>
              Xem lại:{" "}
              {past.map((d, i) => (
                <span key={d.no}>
                  {i > 0 && " · "}
                  <Link className="lnk" href={`/so/${d.no}`}>
                    {issueLabel(d.no)}
                  </Link>
                </span>
              ))}
            </span>
          )}
        </>
      )}
    </p>
  );
}
