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
 * A blank style.
 *
 * The kind and issue menus are DERIVED from the catalogue and the issue
 * list, not typed out here — a hard-coded list of kinds would drift the
 * first time somebody adds a style the menu has never heard of.
 *
 * It cannot be saved yet (slice B3b): a new style needs its colours and a
 * photo for each, and the approved form has no control for either. The page
 * stays — the products table links here — and the form's button says
 * "Tạo mẫu mới · đang chuẩn bị" with the reason beneath it.
 */
export default async function AdminNewProductPage() {
  await requireAdmin("/admin/products/new");
  await connection();
  const now = demoNow();
  const catalog = await loadCatalog();
  const drops = dropOptions(catalog, now);

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
          slug: "",
          priceVnd: 0,
          dropNo: Math.max(...drops.map((o) => Number(o.value))),
          material: "",
          colors: [],
          stock: {},
          photoKeys: [],
        }}
      />
    </>
  );
}
