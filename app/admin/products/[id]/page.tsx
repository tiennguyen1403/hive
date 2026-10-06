import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/db/session";
import { ArcProductScreen } from "@/components/admin-arc/ArcProductScreen";
import { SIZES, productId } from "@/data/types";
import { loadCatalog } from "@/lib/db/catalog";
import { dropOptions, kindOptions } from "@/lib/admin-options";
import { picker, plural } from "@/lib/i18n";
import { onHandOf } from "@/lib/inventory";
import { issueLabel, styleName } from "@/lib/lexicon";
import { getLocale } from "@/lib/locale";
import { nameLang, productText } from "@/lib/product-text";
import { demoNow } from "@/lib/clock";

/** The screen's name in the title, in the page's language (round v6 slice E5); the layout adds "· Admin · HIVE". */
export async function generateMetadata(): Promise<Metadata> {
  return { title: picker(await getLocale())({ vi: "Sửa mẫu", en: "Edit style" }) };
}

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
 * is keyed on the values it was rendered with (`ArcProductScreen`), so the
 * response that answers a save — which re-renders this page — starts it
 * again from what the database now holds, photos and band order included
 * (v3 slice 7).
 *
 * "Xem trên cửa hàng" opens the style's page as the shop draws it. A style of
 * an issue that has not opened is hidden from shoppers (slice B3c) but not
 * from the manager, so the link works for the one person who sees it here.
 *
 * Round v5 slice 5b: the screen is the Arc one (`ArcProductScreen`).
 */
export default async function AdminEditProductPage(props: PageProps<"/admin/products/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/products/${id}`);
  await connection();
  const catalog = await loadCatalog();
  const product = catalog.byId.get(productId(id));
  if (!product) notFound();

  const locale = await getLocale();
  const t = picker(locale);
  const now = demoNow();
  const stock: Record<string, Record<string, number>> = {};
  for (const c of product.colors) {
    stock[c] = {};
    for (const s of SIZES) stock[c]![s] = onHandOf(product, c, s);
  }

  // The style as the back office names it (v3 slice 12): "S05 – KHÓI".
  // In English the name the shop prints (`productText`); the form below keeps
  // the stored words (brief v6 slice E5, B15).
  const shown = styleName(productText(product, locale).name, product.dropNo, locale);

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
    <ArcProductScreen
      mode="edit"
      title={shown}
      titleLang={nameLang(product, locale)}
      // An issue's style says how much of it was cut; a fixed style (slice
      // B5) was cut for no issue and has no line (v3 slice 13).
      sub={
        product.dropNo !== null && product.cutUnits !== null
          ? t({
              vi: `${issueLabel(product.dropNo)} đã cắt ${product.cutUnits} chiếc.`,
              en: `${plural(product.cutUnits, "piece", "pieces")} cut for ${issueLabel(product.dropNo, "en")}.`,
            })
          : undefined
      }
      shopHref={`/products/${product.slug}`}
      productId={product.id}
      kindOptions={kindOptions(catalog, locale)}
      dropOptions={dropOptions(catalog, now, {}, locale)}
      cutUnits={product.cutUnits ?? undefined}
      values={values}
    />
  );
}
