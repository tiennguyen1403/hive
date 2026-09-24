import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { RecentSearches } from "@/components/product/RecentSearches";
import { SearchBox } from "@/components/product/SearchBox";
import { Empty } from "@/components/shop/Empty";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { COLORS } from "@/data/colors";
import { FAMILY_SHORT_LABELS, type Product } from "@/data/types";
import { loadCatalog } from "@/lib/db/catalog";
import { productsOnSale } from "@/lib/inventory";
import {
  FIT_LABELS,
  colorCounts,
  familyCounts,
  fitCounts,
  parseListingQuery,
  runListingQuery,
} from "@/lib/catalog-query";

/**
 * "Tìm “áo”" — the term, because a tab kept open through three searches has
 * to say which one it is. The layout adds "· HIVE". It names no issue since
 * v3 slice 11: the search reads every style on sale, both kinds.
 */
export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const q = parseListingQuery(await props.searchParams).q;
  return { title: q ? `Tìm “${q}”` : "Tìm kiếm" };
}

/** How many colourways the "Có thể tìm" row offers before it is a wall. */
const COLOR_CHIPS = 2;

/**
 * Search, over every style on sale (v3 slice 11): the open issue's styles
 * and the fixed ones — `productsOnSale`, the same pool as `/products`.
 *
 * Not the archive: a closed issue's styles are dead ends, and a search that
 * returns them sends a shopper to a page with nothing to buy.
 *
 * The term lives in the URL, so a result page is a link that can be sent and
 * a Back returns to the previous search. What the box offers WHILE it is
 * being typed in is a different thing and never touches the URL until it is
 * chosen (`SearchBox`). Before anything is typed the page says nothing of
 * its own: the box has its placeholder and the chips below carry the counts.
 */
export default async function SearchPage(props: PageProps<"/search">) {
  const query = parseListingQuery(await props.searchParams);
  const catalog = await loadCatalog();

  const pool = productsOnSale(catalog);
  const results = query.q ? runListingQuery(pool, query) : [];

  return (
    <ShopFrame>
      <div className="wrap3 searchpage">
        <SearchBox initial={query.q ?? ""} pool={pool} />

        {!query.q ? null : results.length === 0 ? (
          /* The list of what the shop DOES have is the chip row below, not
             a sentence: five families inside one line read as a wall, and a
             sentence that lists them has to name all of them or it is not
             true. Chips can carry the full list; prose cannot. */
          <Empty
            icon="search"
            title={`Không có gì khớp “${query.q}”`}
            text="Thử tên mẫu, loại hoặc màu."
          />
        ) : (
          <>
            <p className="searchmeta">
              <span className="num">{results.length}</span>
              <span>
                mẫu khớp <b>“{query.q}”</b>
              </span>
            </p>
            {/* Exactly one hit takes a single column capped at 340px — a
                lone card at half the grid's width reads as a page that
                failed to load rather than as a page that found the thing
                (L7). */}
            <div className={results.length === 1 ? "grid3 single" : "grid3"}>
              {results.map((p) => (
                /* A result row is a mixture — the only thing these cards
                   have in common is the word that found them — so each one
                   says what it IS where a listing card prints its size run,
                   and an issue's style wears its plate. */
                <ProductCard key={p.id} product={p} kindCount plate />
              ))}
            </div>
          </>
        )}

        <Suggestions pool={pool} />
        <RecentSearches current={query.q} hits={results.length} />
      </div>
    </ShopFrame>
  );
}

/**
 * Terms that will actually return something, because they are lifted from
 * what is on sale. A suggestion chip that leads to an empty page is worse
 * than no suggestion — which is also why each one carries its count.
 *
 * Fit and colour are FILTERS rather than words in the text: searching for
 * "oversize" would only find the styles that happen to spell it in their
 * kind, so those chips go to the filter that actually means it.
 */
function Suggestions({ pool }: { pool: Product[] }) {
  return (
    <section className="sec" aria-labelledby="h-more">
      <div className="hd">
        <h2 id="h-more">Có thể tìm</h2>
        <span className="meta">đang bán</span>
      </div>
      <div className="chips3 wrapped">
        {familyCounts(pool).map((t) => (
          <Link key={t.value} className="chip3" href={`/products?family=${t.value}`}>
            {FAMILY_SHORT_LABELS[t.value]}
            <span className="cnt">{t.styles}</span>
          </Link>
        ))}
        {fitCounts(pool).map((t) => (
          <Link key={t.value} className="chip3" href={`/products?fit=${t.value}`}>
            {FIT_LABELS[t.value]}
            <span className="cnt">{t.styles}</span>
          </Link>
        ))}
        {colorCounts(pool)
          .slice(0, COLOR_CHIPS)
          .map((t) => (
            <Link key={t.value} className="chip3" href={`/products?color=${t.value}`}>
              <i className="dot" style={{ background: COLORS[t.value].hex }} aria-hidden="true" />
              {COLORS[t.value].label}
              <span className="cnt">{t.styles}</span>
            </Link>
          ))}
      </div>
    </section>
  );
}
