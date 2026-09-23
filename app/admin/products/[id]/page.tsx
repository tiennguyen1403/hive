import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminTop } from "@/components/admin/AdminTop";
import { ProductForm } from "@/components/admin/ProductForm";
import { byId } from "@/data/catalog";
import { SIZES, productId } from "@/data/types";
import { dropOptions, kindOptions } from "@/lib/admin-options";
import { onHandOf } from "@/lib/inventory";
import { issueLabel } from "@/lib/lexicon";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Sửa mẫu" };

/**
 * One style, editable.
 *
 * The grid shows what is LEFT per colour and size, and the line above it
 * reports what was cut — the difference being what sold. Both come from the
 * catalogue rather than from a second copy of the numbers.
 */
export default async function AdminEditProductPage(props: PageProps<"/admin/products/[id]">) {
  await connection();
  const { id } = await props.params;
  const product = byId.get(productId(id));
  if (!product) notFound();

  const now = demoNow();
  const stock: Record<string, Record<string, number>> = {};
  for (const c of product.colors) {
    stock[c] = {};
    for (const s of SIZES) stock[c]![s] = onHandOf(product, c, s);
  }

  return (
    <>
      <AdminTop
        crumb={{ label: "Mẫu", href: "/admin/products", here: product.name }}
        title={product.name}
        sub={`${issueLabel(product.dropNo)} đã cắt ${product.cutUnits} chiếc. Lưới dưới là số còn lại theo từng màu và size.`}
      />
      <ProductForm
        mode="edit"
        kindOptions={kindOptions()}
        dropOptions={dropOptions(now)}
        cutUnits={product.cutUnits}
        values={{
          name: product.name,
          kind: product.kind,
          slug: product.slug,
          priceVnd: product.priceVnd,
          dropNo: product.dropNo,
          material: product.material,
          colors: [...product.colors],
          stock,
          photoKeys: [...product.photoKeys],
        }}
      />
    </>
  );
}
