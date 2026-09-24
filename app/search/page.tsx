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
import { featuredDrop } from "@/lib/drop";
import { productsInDrop } from "@/lib/inventory";
import { LEX, issueLabel, issueNo } from "@/lib/lexicon";
import {
  FIT_LABELS,
  colorCounts,
  familyCounts,
  fitCounts,
  parseListingQuery,
  runListingQuery,
} from "@/lib/catalog-query";

/**
 * "Tìm “áo” · Số 05" — the term and the issue it was searched in, because a
 * tab kept open through three searches has to say which one it is. Both
 * halves are read, never typed: the issue comes off the clock through
 * `featuredDrop`, the word off `lib/lexicon.ts`. The layout adds "· HIVE".
 */
export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const sp = await props.searchParams;
  const q = parseListingQuery(sp).q;
  const catalog = await loadCatalog();
  const { drop } = featuredDrop(catalog, undefined);
  const issue = issueLabel(drop.no);
  return { title: q ? `Tìm “${q}” · ${issue}` : `Tìm kiếm · ${issue}` };
}

/** How many colourways the "Có thể tìm" row offers before it is a wall. */
const COLOR_CHIPS = 2;

/**
 * Search, over the open issue only.
 *
 * Searching the whole archive would return styles from issues that closed
 * months ago — every one of them a dead end. The issue is the shop.
 *
 * The term lives in the URL, so a result page is a link that can be sent and
 * a Back returns to the previous search. What the box offers WHILE it is
 * being typed in is a different thing and never touches the URL until it is
 * chosen (`SearchBox`).
 */
export default async function SearchPage(props: PageProps<"/search">) {
  const sp = await props.searchParams;
  const query = parseListingQuery(sp);
  const catalog = await loadCatalog();

  const { drop } = featuredDrop(catalog, undefined);
  const no = issueNo(drop.no);
  const pool = productsInDrop(catalog, drop.no);
  const results = query.q ? runListingQuery(pool, query) : [];

  return (
    <ShopFrame>
      <div className="wrap3 searchpage">
        <SearchBox initial={query.q ?? ""} pool={pool} />

        {!query.q ? (
          <p className="searchmeta">
            <span>
              {issueLabel(drop.no)} có {pool.length} mẫu. Gõ tên mẫu, loại hoặc màu.
            </span>
          </p>
        ) : results.length === 0 ? (
          /* The list of what the issue DOES have is the chip row below, not
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
                mẫu khớp <b>“{query.q}”</b> trong {LEX.tl} {no}
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
                   says what it IS where a listing card prints its size run. */
                <ProductCard key={p.id} product={p} kindCount />
              ))}
            </div>
          </>
        )}

        <Suggestions pool={pool} no={no} />
        <RecentSearches current={query.q} hits={results.length} />
      </div>
    </ShopFrame>
  );
}

/**
 * Terms that will actually return something, because they are lifted from
 * the issue itself. A suggestion chip that leads to an empty page is worse
 * than no suggestion — which is also why each one carries its count.
 *
 * Fit and colour are FILTERS rather than words in the text: searching for
 * "oversize" would only find the styles that happen to spell it in their
 * kind, so those chips go to the filter that actually means it.
 */
function Suggestions({ pool, no }: { pool: Product[]; no: string }) {
  return (
    <section className="sec" aria-labelledby="h-more">
      <div className="hd">
        <h2 id="h-more">Có thể tìm</h2>
        <span className="meta">
          loại, form, màu có trong {LEX.tl} {no}
        </span>
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
