import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { ProductPage } from "@/components/feed/product/ProductPage";
import { legacySlugTarget } from "@/lib/catalog";
import { demoNowMs } from "@/lib/clock";
import { loadCatalog } from "@/lib/db/catalog";

// There is no `generateStaticParams` here. It used to pre-render all twenty-one
// styles, which was free while the catalogue was a fixture in the bundle;
// since slice B0b it would mean querying Postgres during `next build` and then
// serving stock figures frozen at deploy time. A style's remaining count is
// the one number on this page that must not be stale, so the page is rendered
// per request (`lib/db/catalog.ts` calls `connection()`), and an unknown slug
// still gets `notFound()` rather than an empty shell.
//
// SLICE B5: an issue's style is published as `s05-khoi` (a name can come back
// in a later issue), so the address a style had before — `/products/khoi` —
// answers with a PERMANENT redirect to the new one when exactly one style can
// be meant (`legacySlugTarget`). `permanentRedirect` rather than `redirect`:
// "In other contexts, `permanentRedirect` uses a 308 (Permanent Redirect)"
// (`node_modules/next/dist/docs/01-app/02-guides/redirecting.md`), and a moved
// address is permanent. It throws, so nothing after it runs.

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const catalog = await loadCatalog();
  const p = catalog.bySlug.get(slug);
  // An old address is redirected by the page below; its title is never shown.
  if (!p) return { title: "Không tìm thấy" };
  // The name as the Feed page prints it — "KHÓI", without its issue's code
  // (round v4, conflict #3 the user settled for the Feed) — as the mock titles it.
  return {
    title: p.name,
    description: `${p.kind} · ${p.material}`,
  };
}

/**
 * One style, round v4 "Feed" (slice 1b): the approved mock's
 * `prototype/explore/feed/product.html` — the story frame of the chosen
 * colour, the buying block (a buy bar on the phone in place of the tab bar, a
 * sticky column from 900px), "Chi tiết", "Thông số", "Giao hàng và đổi trả",
 * and the rest of its line as a rail (`ProductPage`).
 *
 * The footer is the light one (the page carries the delivery and payment
 * facts itself) without "Đổi trả 7 ngày": the page's own "Đổi trả · 7 ngày"
 * row is that link, to Hỏi đáp's return group (the mock's `data-foot-skip`).
 *
 * `?color=<key>` opens the page on a colour — the link from Yêu thích and the
 * notifications. `params` and `searchParams` are promises in Next 16.
 */
export default async function ProductRoute(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const catalog = await loadCatalog();
  const product = catalog.bySlug.get(slug);
  if (!product) {
    const moved = legacySlugTarget(catalog, slug);
    if (moved) permanentRedirect(`/products/${moved.slug}`);
    notFound();
  }
  const asked = Array.isArray(sp.color) ? sp.color[0] : sp.color;

  return (
    <FeedFrame page="product" tabbar={false} buybar foot="lite" footSkip={["/faq#doi-tra"]} now={demoNowMs()}>
      <ProductPage slug={product.slug} {...(asked ? { asked } : {})} />
    </FeedFrame>
  );
}
