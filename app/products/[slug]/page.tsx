import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/product/ProductView";
import { ProductCard } from "@/components/product/ProductCard";
import { ShopFrame } from "@/components/shop/ShopFrame";
import type { Product } from "@/data/types";
import type { Catalog } from "@/lib/catalog";
import { loadCatalog } from "@/lib/db/catalog";
import { dropBandLabel, dropState, getDrop } from "@/lib/drop";
import { productsInDrop } from "@/lib/inventory";
import { LEX, issueLabel, issueNo } from "@/lib/lexicon";

/** How many cards the related row holds: two phone rows, one desktop row. */
const RELATED = 4;

/** "Cùng tầm giá" — half as much again, or half as much. */
const NEAR_PRICE = 0.5;

// There is no `generateStaticParams` here any more. It used to pre-render all
// twenty-one styles, which was free while the catalogue was a fixture in the
// bundle; since slice B0b it would mean querying Postgres during `next build`
// and then serving stock figures frozen at deploy time. A style's remaining
// count is the one number on this page that must not be stale, so the page is
// rendered per request (`lib/db/catalog.ts` calls `connection()`), and an
// unknown slug still gets `notFound()` rather than an empty shell.

export async function generateMetadata(
  props: PageProps<"/products/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const catalog = await loadCatalog();
  const p = catalog.bySlug.get(slug);
  if (!p) return { title: "Không tìm thấy" };
  // "KHÓI · Số 05": the style, then the issue it was cut for. A shopper who
  // kept three tabs open is choosing between them by this line.
  return {
    title: `${p.name} · ${issueLabel(p.dropNo)}`,
    description: `${p.kind} · ${p.material}`,
  };
}

/**
 * One style.
 *
 * `params` is a promise in Next 16 — reading it synchronously is gone, not
 * deprecated. An unknown slug calls `notFound()` rather than rendering an
 * empty shell, so a mistyped or stale link gets a 404 and not a page that
 * looks broken.
 */
export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const catalog = await loadCatalog();
  const product = catalog.bySlug.get(slug);
  if (!product) notFound();

  // Every style in the fixtures belongs to an issue the fixtures also list,
  // so this cannot fail today; the page still refuses to invent a window for
  // a style whose issue record is missing rather than drawing a dead clock.
  const drop = getDrop(catalog, product.dropNo);
  if (!drop) notFound();

  const state = dropState(drop);
  const no = issueNo(product.dropNo);
  const related = relatedTo(catalog, product);

  return (
    <ShopFrame activeFamily={product.family}>
      <div className="wrap3">
        <ProductView
          product={product}
          drop={drop}
          state={state}
          initialLabel={dropBandLabel(drop, state)}
        />

        {related.length > 0 && (
          <section className="sec" aria-labelledby="h-rel">
            <div className="hd">
              <h2 id="h-rel">
                Cùng {LEX.tl} {no}
              </h2>
              <span className="meta">cùng loại, cùng tầm giá</span>
              <Link className="more" href="/products">
                Xem cả {productsInDrop(catalog, product.dropNo).length} mẫu
              </Link>
            </div>
            <div className="grid3 four">
              {related.map((p) => (
                /* The row is a mixture, so each card says what it IS where a
                   listing card would print its size run. */
                <ProductCard
                  key={p.id}
                  product={p}
                  kindCount
                  closed={state !== "OPEN"}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </ShopFrame>
  );
}

/**
 * The four styles under "Cùng số 05".
 *
 * Same family first, then whatever is within half again of this price, then
 * the rest of the issue to fill the row — the closest thing to a
 * recommendation the fixtures can honestly supply. There is no browsing
 * history, no "customers also bought" and no editorial pairing in this build,
 * and inventing one would be inventing evidence (DESIGN.md §9 rule 1).
 *
 * The third pass is what keeps the row a row: KHÓI at 390.000₫ has two
 * t-shirts near it and nothing else inside the price window, and a row of
 * two under a heading that promises four reads as a page that failed to
 * load. Catalog order inside each pass, so it does not reshuffle between two
 * renders of the same issue.
 */
function relatedTo(catalog: Catalog, product: Product): Product[] {
  const rest = productsInDrop(catalog, product.dropNo).filter((p) => p.id !== product.id);
  const near = (p: Product) =>
    p.priceVnd >= product.priceVnd * (1 - NEAR_PRICE) &&
    p.priceVnd <= product.priceVnd * (1 + NEAR_PRICE);

  const sameFamily = rest.filter((p) => p.family === product.family);
  const nearPrice = rest.filter((p) => p.family !== product.family && near(p));
  const others = rest.filter((p) => p.family !== product.family && !near(p));

  return [...sameFamily, ...nearPrice, ...others].slice(0, RELATED);
}
