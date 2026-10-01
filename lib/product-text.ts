import type { Product, Teaser } from "@/data/types";
import type { Locale } from "./i18n";

/**
 * The words of a style a screen prints, in one language (round v6, slice B15).
 *
 * The database holds them in Vietnamese, and beside them, in `en`, whatever
 * English there is: field by field, since an edit in the back office drops the
 * English of exactly the field it changed, and the issues' styles never had an
 * English name (`data/types.ts`, `ProductEn`). So each field falls back on its
 * own: the English where there is one, the Vietnamese where there is none —
 * which is also what a style the back office just created prints, in both
 * languages. Vietnamese asks nothing of `en`.
 *
 * Text written in code is translated where it stands (`lib/i18n.ts`); this is
 * the one door for text that comes out of the database.
 */
export interface ProductText {
  name: string;
  kind: string;
  material: string;
  details: readonly string[];
}

/** A teaser's words, the same way. */
export interface TeaserText {
  name: string;
  kind: string;
}

/** The English when there is some, else the Vietnamese. A blank one counts as none. */
function either(english: string | undefined, vietnamese: string): string {
  return english !== undefined && english.trim() !== "" ? english : vietnamese;
}

export function productText(
  product: Pick<Product, "name" | "kind" | "material" | "details" | "en">,
  locale: Locale,
): ProductText {
  if (locale === "vi" || product.en === undefined) {
    return { name: product.name, kind: product.kind, material: product.material, details: product.details };
  }
  const en = product.en;
  return {
    name: either(en.name, product.name),
    kind: either(en.kind, product.kind),
    material: either(en.material, product.material),
    // Lines go as a set: a translation is line for line, so half an English
    // list beside half a Vietnamese one would read as a fault.
    details: en.details !== undefined && en.details.length > 0 ? en.details : product.details,
  };
}

export function teaserText(teaser: Pick<Teaser, "name" | "kind" | "en">, locale: Locale): TeaserText {
  if (locale === "vi" || teaser.en === undefined) return { name: teaser.name, kind: teaser.kind };
  return { name: either(teaser.en.name, teaser.name), kind: either(teaser.en.kind, teaser.kind) };
}

/**
 * The `lang` an element holding nothing but a style's or a teaser's name
 * carries (round v6 slice E1): `"vi"` on an English page when the name printed
 * is the Vietnamese one — an issue's style (KHÓI, SỎI), or a fixed style whose
 * English the back office dropped — so a screen reader says it as Vietnamese;
 * nothing otherwise, and nothing at all on a Vietnamese page, whose `<html>`
 * says it already. Read off the same fallback `productText` and `teaserText`
 * take, so the two cannot disagree.
 */
export function nameLang(item: { en?: { name?: string } | undefined }, locale: Locale): "vi" | undefined {
  if (locale === "vi") return undefined;
  const english = item.en?.name;
  return english !== undefined && english.trim() !== "" ? undefined : "vi";
}
