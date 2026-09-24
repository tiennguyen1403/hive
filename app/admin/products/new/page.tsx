import { connection } from "next/server";
import { requireAdmin } from "@/lib/db/session";
import { AdminTop } from "@/components/admin/AdminTop";
import { ProductForm } from "@/components/admin/ProductForm";
import { loadCatalog } from "@/lib/db/catalog";
import { kindOptions, dropOptions } from "@/lib/admin-options";
import { LEX } from "@/lib/lexicon";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Thêm mẫu" };

/**
 * A blank style — created since v3 slice 7 (`createProduct`, slice B3c).
 *
 * The kind and issue menus are DERIVED from the catalogue and the issue
 * list, not typed out here — a hard-coded list of kinds would drift the
 * first time somebody adds a style the menu has never heard of. The issue
 * menu leaves out the ones that have closed, which take no new style, and
 * starts on the newest one left.
 *
 * Kind and fit start unchosen and the price starts empty: nobody has decided
 * them yet, and the save button says which is still missing.
 */
export default async function AdminNewProductPage() {
  await requireAdmin("/admin/products/new");
  await connection();
  const now = demoNow();
  const catalog = await loadCatalog();
  const drops = dropOptions(catalog, now, { hideClosed: true });

  return (
    <>
      <AdminTop
        crumb={{ label: "Mẫu", href: "/admin/products", here: "Thêm mẫu" }}
        title="Thêm mẫu"
        sub={`Số lượng điền ở đây là số sẽ cắt. Một ${LEX.tl} cắt một lần và không may thêm, nên con số này là toàn bộ số hàng sẽ tồn tại.`}
      />
      <ProductForm
        mode="new"
        kindOptions={kindOptions(catalog)}
        dropOptions={drops}
        values={{
          name: "",
          kind: "",
          fit: null,
          slug: "",
          priceVnd: 0,
          dropNo: drops.length > 0 ? Math.max(...drops.map((o) => Number(o.value))) : null,
          material: "",
          colors: [],
          stock: {},
          photoKeys: [],
        }}
      />
    </>
  );
}
