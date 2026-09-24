import { connection } from "next/server";
import { requireAdmin } from "@/lib/db/session";
import { AdminTop } from "@/components/admin/AdminTop";
import { ProductForm } from "@/components/admin/ProductForm";
import { loadCatalog } from "@/lib/db/catalog";
import { kindOptions, dropOptions } from "@/lib/admin-options";
import { demoNow } from "@/lib/clock";

export const metadata = { title: "Thêm mẫu" };

/**
 * A blank style — created since v3 slice 7 (`createProduct`, slice B3c).
 *
 * The kind and issue menus are DERIVED from the catalogue and the issue
 * list, not typed out here — a hard-coded list of kinds would drift the
 * first time somebody adds a style the menu has never heard of. The issue
 * menu leaves out the ones that have closed, which take no new style, and
 * starts on the newest one left; since v3 slice 12 it ends with "Cố định",
 * a style of no issue.
 *
 * Kind and fit start unchosen and the price starts empty: nobody has decided
 * them yet, and the save button says which is still missing. No sentence
 * under the heading (v3 slice 12): the form explains neither kind of style.
 */
export default async function AdminNewProductPage() {
  await requireAdmin("/admin/products/new");
  await connection();
  const now = demoNow();
  const catalog = await loadCatalog();
  const issues = dropOptions(catalog, now, { hideClosed: true });

  return (
    <>
      <AdminTop
        crumb={{ label: "Mẫu", href: "/admin/products", here: "Thêm mẫu" }}
        title="Thêm mẫu"
      />
      <ProductForm
        mode="new"
        kindOptions={kindOptions(catalog)}
        dropOptions={dropOptions(catalog, now, { hideClosed: true, withFixed: true })}
        values={{
          name: "",
          kind: "",
          fit: null,
          slug: "",
          priceVnd: 0,
          dropNo: issues.length > 0 ? Math.max(...issues.map((o) => Number(o.value))) : null,
          material: "",
          colors: [],
          stock: {},
          photoKeys: [],
        }}
      />
    </>
  );
}
