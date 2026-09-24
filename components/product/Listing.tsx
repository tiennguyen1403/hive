import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { DropClock } from "@/components/shop/DropClock";
import { Empty } from "@/components/shop/Empty";
import type { Drop, DropState, Product } from "@/data/types";
import type { Catalog } from "@/lib/catalog";
import {
  clearFilters,
  filterLabels,
  isFiltered,
  listingHref,
  runListingQuery,
  type ListingQuery,
} from "@/lib/catalog-query";
import { demoNow } from "@/lib/clock";
import { dayMonth } from "@/lib/datetime";
import { dropBandLabel, dropState, issueHref } from "@/lib/drop";
import { dropSummary, type DropSummary } from "@/lib/inventory";
import { LEX, issueLabel, issueNo } from "@/lib/lexicon";
import { FamilyTabs } from "./FamilyTabs";
import { FilterRail } from "./FilterRail";
import { ListingControls } from "./ListingControls";
import { ProductCard } from "./ProductCard";
import { SortControl } from "./SortControl";

interface ListingProps {
  catalog: Catalog;
  /** What the URL asks for (QĐ-8): the filters, the order, never state. */
  query: ListingQuery;
  /** Where every tab, chip and sort writes the query back: `/products` or `/so/5`. */
  path: string;
  /** The styles listed, in catalogue order. */
  pool: Product[];
  /**
   * The issue this page IS (`/so/5`), with its head line — the issue's number,
   * how many styles, how much of the cut is left and its clock. Null on
   * `/products`, every style on sale of both kinds: no head, no count above
   * the tabs, and the issue's plate on the photos of its styles.
   */
  issue: { drop: Drop; state: DropState } | null;
}

/**
 * The listing, one component for its two pages (v3 slice 11).
 *
 * `/products` is every style on sale — the open issue's, its sold-out ones
 * included, and every fixed style — in one grid: the user asked for the
 * fixed styles to be "như là các mẫu khác thôi". `/so/5` is the open issue's
 * own page, the listing `/products` was until this slice. Same tabs, chips,
 * rail, sort, grid and end line; what differs is passed in, never copied.
 *
 * Every filter is in the URL and read on the server, so the grid that
 * renders is the grid the URL describes — shareable, reloadable, and correct
 * after Back. On a phone the chip row plus the filter sheet; on a monitor the
 * rail standing open beside the grid; both write the same query string.
 *
 * Styles that have sold out still appear. On an issue the empty shelf is
 * information: it says the cut was real and what went first.
 */
export function Listing({ catalog, query, path, pool, issue }: ListingProps) {
  const shown = runListingQuery(pool, query);
  const filtered = isFiltered(query) || Boolean(query.q);
  const summary = issue ? dropSummary(catalog, issue.drop.no) : null;
  const clear = listingHref(path, clearFilters(query));

  return (
    <div className="wrap3">
      <div className={issue ? "lhead" : "lhead bare"}>
        {issue && summary ? (
          <div className="row1">
            <h1 className="big">
              {LEX.t} <span className="num">{issueNo(issue.drop.no)}</span>
            </h1>
            {/* Three facts about the issue itself, all arithmetic over the
                catalog: how many styles, how much of the cut is left, and
                how long the window has to run. */}
            <span className="meta">
              {pool.length} mẫu · {summary.onHand} / {summary.cutUnits} còn ·{" "}
              {issue.state === "CLOSED" ? (
                `đã đóng ${dayMonth(issue.drop.closesAt)}`
              ) : (
                <DropClock
                  drop={issue.drop}
                  state={issue.state}
                  initialLabel={dropBandLabel(issue.drop, issue.state)}
                />
              )}
            </span>
          </div>
        ) : (
          // "Tất cả 18" on the first tab says what and how many; the page
          // keeps its heading for a screen reader.
          <h1 className="sr-only">Tất cả mẫu</h1>
        )}

        <FamilyTabs pool={pool} applied={query} path={path} />
        <ListingControls applied={query} path={path} pool={pool} issueNo={issue?.drop.no} />
      </div>

      <div className="listing3">
        <FilterRail pool={pool} applied={query} path={path} issueNo={issue?.drop.no} />

        <div>
          <div className="listbar">
            <span>
              Hiện {shown.length} / {pool.length} mẫu
            </span>
            <SortControl applied={query} path={path} />
          </div>

          {shown.length === 0 ? (
            <Empty
              icon="search"
              title="Không có mẫu nào khớp"
              text={`Đang lọc: ${filterLabels(query).join(" · ")}. ${
                issue
                  ? `${issueLabel(issue.drop.no)} có ${pool.length} mẫu`
                  : `${pool.length} mẫu đang bán`
              } — bỏ bớt một điều kiện để thấy lại chúng.`}
              action={
                <ButtonLink tone="ink" icon="x" href={clear}>
                  Bỏ lọc
                </ButtonLink>
              }
            />
          ) : (
            <>
              <div className="grid3">
                {shown.map((p) => (
                  /* The plate goes on an issue's style only where the grid
                     mixes the two kinds; on the issue's own page every
                     card is the issue's. */
                  <ProductCard key={p.id} product={p} plate={issue === null} />
                ))}
              </div>
              <ListEnd
                catalog={catalog}
                clear={clear}
                filtered={filtered}
                shown={shown.length}
                total={pool.length}
                summary={summary}
                current={issue?.drop.no}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The line that ends the grid.
 *
 * Unfiltered it says the whole pool is on screen — and, on an issue's page,
 * how much of its cut is still on the shelf — then offers the issues that
 * have closed. Filtered it says how many survived the conditions and offers
 * the way back to all of them. Every figure is arithmetic over the catalog.
 */
function ListEnd({
  catalog,
  clear,
  filtered,
  shown,
  total,
  summary,
  current,
}: {
  catalog: Catalog;
  clear: string;
  filtered: boolean;
  shown: number;
  total: number;
  /** The issue's own figures, on its page; null over every style on sale. */
  summary: DropSummary | null;
  current: number | undefined;
}) {
  const now = demoNow();
  const past = [...catalog.drops]
    .sort((a, b) => b.no - a.no)
    .filter((d) => d.no !== current && dropState(d, now) === "CLOSED");

  return (
    <p className="listend">
      {filtered ? (
        <>
          <span>
            Hiện {shown} / {total} mẫu
          </span>
          <Link className="lnk" href={clear}>
            Bỏ lọc
          </Link>
        </>
      ) : (
        <>
          <span>
            Đã hiện cả {total} mẫu
            {summary && ` · ${summary.onHand} / ${summary.cutUnits} còn`}
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
                  <Link className="lnk" href={issueHref(d.no)}>
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
