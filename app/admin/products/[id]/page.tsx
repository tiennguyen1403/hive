import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/db/session";
import { AdminTop } from "@/components/admin/AdminTop";
import { ProductForm } from "@/components/admin/ProductForm";
import { ButtonLink } from "@/components/ui/Button";
import { SIZES, productId } from "@/data/types";
import { loadCatalog } from "@/lib/db/catalog";
import { dropOptions, kindOptions } from "@/lib/admin-options";
import { onHandOf } from "@/lib/inventory";
import { issueLabel } from "@/lib/lexicon";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Sửa mẫu" };

/**
 * One style, editable — and since slice B3b, saved (`updateProduct`).
 *
 * The grid shows what is LEFT per colour and size, and the line above it
 * reports what was cut — the difference being what sold. Both come from the
 * catalogue in the database (`loadCatalog()`) rather than from a second copy
 * of the numbers, and the numbers the grid starts from are what a save sends
 * as "before", so a shelf changed elsewhere in the meantime is refused.
 *
 * The address is the style's id, which no edit changes: a new address
 * segment moves the shop's page (`/products/<slug>`), not this one. The form
 * is keyed on the values it was rendered with, so the response that answers
 * a save — which re-renders this page — starts it again from what the
 * database now holds, photos and band order included (v3 slice 7).
 *
 * "Xem trên cửa hàng" opens the style's page as the shop draws it. A style of
 * an issue that has not opened is hidden from shoppers (slice B3c) but not
 * from the manager, so the link works for the one person who sees it here.
 */
export default async function AdminEditProductPage(props: PageProps<"/admin/products/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/products/${id}`);
  await connection();
  const catalog = await loadCatalog();
  const product = catalog.byId.get(productId(id));
  if (!product) notFound();

  const now = demoNow();
  const stock: Record<string, Record<string, number>> = {};
  for (const c of product.colors) {
    stock[c] = {};
    for (const s of SIZES) stock[c]![s] = onHandOf(product, c, s);
  }

  const values = {
    name: product.name,
    kind: product.kind,
    fit: product.fit,
    slug: product.slug,
    priceVnd: product.priceVnd,
    dropNo: product.dropNo,
    material: product.material,
    colors: [...product.colors],
    stock,
    photoKeys: [...product.photoKeys],
  };

  return (
    <>
      <AdminTop
        crumb={{ label: "Mẫu", href: "/admin/products", here: product.name }}
        title={product.name}
        sub={`${issueLabel(product.dropNo)} đã cắt ${product.cutUnits} chiếc. Lưới dưới là số còn lại theo từng màu và size.`}
      >
        <ButtonLink tone="ink sm" icon="eye" href={`/products/${product.slug}`}>
          Xem trên cửa hàng
        </ButtonLink>
      </AdminTop>
      <ProductForm
        key={JSON.stringify(values)}
        mode="edit"
        productId={product.id}
        kindOptions={kindOptions(catalog)}
        dropOptions={dropOptions(catalog, now)}
        cutUnits={product.cutUnits}
        values={values}
      />
    </>
  );
}
