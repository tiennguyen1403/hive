import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/db/session";
import { ArcProductScreen } from "@/components/admin-arc/ArcProductScreen";
import { loadCatalog } from "@/lib/db/catalog";
import { kindOptions, dropOptions } from "@/lib/admin-options";
import { demoNow } from "@/lib/clock";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

const TITLE = { vi: "Thêm mẫu", en: "Add style" };

/** The screen's name in the title, in the page's language (round v6 slice E5); the layout adds "· Admin · HIVE". */
export async function generateMetadata(): Promise<Metadata> {
  return { title: picker(await getLocale())(TITLE) };
}

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
 *
 * Round v5 slice 5b: the screen is the Arc one (`ArcProductScreen`).
 */
export default async function AdminNewProductPage() {
  await requireAdmin("/admin/products/new");
  await connection();
  const locale = await getLocale();
  const now = demoNow();
  const catalog = await loadCatalog();
  const issues = dropOptions(catalog, now, { hideClosed: true });

  return (
    <ArcProductScreen
      mode="new"
      title={picker(locale)(TITLE)}
      kindOptions={kindOptions(catalog, locale)}
      dropOptions={dropOptions(catalog, now, { hideClosed: true, withFixed: true }, locale)}
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
  );
}
