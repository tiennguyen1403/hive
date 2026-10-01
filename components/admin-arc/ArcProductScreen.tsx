"use client";

import { Eye } from "lucide-react";
import { Badge } from "@/registry/components/badge/badge";
import { Breadcrumb } from "@/registry/components/breadcrumb/breadcrumb";
import { ArcButtonLink } from "./ArcButtonLink";
import page from "./ArcPage.module.css";
import { ArcProductForm, type ProductFormValues } from "./ArcProductForm";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * "Thêm mẫu" and a style's own page in the Arc frame (round v5 slice 5b): the
 * way back to the styles table, the heading strip of the zone's pages
 * (`ArcPage.module.css`), then the form (`ArcProductForm`).
 *
 * As v3: a new style has no line under its heading; an issue's style says
 * how much of it was cut ("Số 05 đã cắt 35 chiếc."), a fixed style was cut
 * for no issue and has no line. A style being edited links to its page on
 * the shop, in the same tab: a style of an issue that has not opened is
 * hidden from shoppers (slice B3c) but not from the manager.
 *
 * The form is keyed on the values it was given, so the response that answers
 * a save, which re-renders this page, starts it again from what the database
 * now holds, photos and band order included (v3 slice 7).
 */
export function ArcProductScreen({
  mode,
  title,
  sub,
  shopHref,
  productId,
  values,
  kindOptions,
  dropOptions,
  cutUnits,
}: {
  mode: "new" | "edit";
  /** "Thêm mẫu", or the style as the back office names it: "S05 – KHÓI". */
  title: string;
  /** The line under the heading, when there is one. */
  sub?: string;
  /** The style's page on the shop, for a style being edited. */
  shopHref?: string;
  productId?: string;
  values: ProductFormValues;
  kindOptions: { value: string; label: string; note?: string }[];
  dropOptions: { value: string; label: string; note?: string }[];
  cutUnits?: number;
}) {
  return (
    <div className={page.page}>
      <div className={page.masthead}>
        <Breadcrumb
          ariaLabel="Đường dẫn"
          items={[{ label: "Mẫu", href: "/admin/products" }, { label: title }]}
        />
        <header className={page.header}>
          <div className={page.headRow}>
            <div className={page.titleRow}>
              <h1 className={page.title}>{title}</h1>
            </div>
            <div className={page.actions}>
              <Badge size="sm">Dữ liệu mẫu</Badge>
              {shopHref && (
                <ArcButtonLink variant="secondary" size="sm" href={shopHref}>
                  <Eye {...ICON} />
                  Xem trên cửa hàng
                </ArcButtonLink>
              )}
            </div>
          </div>
          {sub && <p className={page.sub}>{sub}</p>}
        </header>
      </div>
      <ArcProductForm
        key={JSON.stringify(values)}
        mode={mode}
        productId={productId}
        values={values}
        kindOptions={kindOptions}
        dropOptions={dropOptions}
        cutUnits={cutUnits}
      />
    </div>
  );
}
