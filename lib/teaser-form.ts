import { FAMILY_LABELS, type Family } from "@/data/types";
import type { Catalog } from "./catalog";
import { PHOTO_KEYS, isUploadedKey } from "./photos";

/**
 * The pure parts of "Thêm mẫu hé lộ": what the form sends, the kinds it
 * offers, the photos it offers, and what the button says is still missing.
 *
 * Moved out of v3's `TeaserFormSheet` (`components/admin/TeaserFormSheet.tsx`)
 * word for word when the form moved to Arc (round v5 slice 4), as the code
 * form's parts went to `lib/promo-form.ts` in slice 3. The v3 file keeps its
 * own copy until the clean-up slice retires it. `teaserName` and
 * `teaserBlocker` are v3's two inline rules, named so they can be tested.
 */

/**
 * What the form sends: the issue, a name, a kind and a photo. The family and
 * the slug are the server's to derive (`lib/catalog-admin.ts#readTeaser`) —
 * the browser is never asked for either.
 */
export interface TeaserDraft {
  dropNo: number;
  name: string;
  garment: string;
  photoKey: string;
}

/** One kind in the menu, with its family as the note at the row's end ("Áo khoác dù", "Áo khoác"). */
export interface KindOption {
  value: string;
  label: string;
  note: string;
}

/** The kinds the catalogue actually uses, so the menu cannot invent one. */
export function kindOptions(catalog: Catalog): KindOption[] {
  const seen = new Map<string, Family>();
  for (const p of catalog.products) seen.set(p.kind, p.family);
  return [...seen].sort((a, b) => a[0].localeCompare(b[0], "vi")).map(([kind, family]) => ({
    value: kind,
    label: kind,
    note: FAMILY_LABELS[family],
  }));
}

/**
 * The photos this build can offer — the ones the catalogue already borrows.
 *
 * PRODUCT.md records that there is no product photography at all, so an
 * upload box would be a control with nowhere to put a file. Choosing from
 * the borrowed set is the honest version of the same decision.
 *
 * Slice B3c added real photos, uploaded from the style form. Those are
 * another style's photo, not a stand-in, so they are left out (v3 slice 7):
 * the set stays the borrowed frames and nothing else. Slice B5's fixed styles
 * carry `flat-…` keys whose drawings do not exist yet; until they do each
 * would show the hero frame, so only a key `lib/photos.ts` has a frame for
 * is offered.
 */
export function photoKeys(catalog: Catalog): string[] {
  return [...new Set(catalog.products.flatMap((p) => p.photoKeys))].filter(
    (k) => !isUploadedKey(k) && PHOTO_KEYS.includes(k),
  );
}

/** The name as it is sent and shown: trimmed, in capitals, like every style's. */
export function teaserName(typed: string): string {
  return typed.trim().toLocaleUpperCase("vi");
}

/** The first thing still missing, in v3's words, so the button can name it; null when nothing is. */
export function teaserBlocker(name: string, kind: string | null, photo: string | null): string | null {
  return !name ? "Nhập tên mẫu" : !kind ? "Chọn loại" : !photo ? "Chọn ảnh" : null;
}
