import { COLORS } from "@/data/colors";
import { SIZES, type ColorKey, type Fit, type Size } from "@/data/types";
import { FIXED_CHOICE } from "./admin-options";
import type { Catalog } from "./catalog";
import {
  MAX_PRICE_VND,
  MIN_PRICE_VND,
  borrowedPhotoKeys,
  catalogFailureMessage,
} from "./catalog-admin";
import { LEX, styleName } from "./lexicon";
import { vnd } from "./money";
import { PHOTO_KEYS, isUploadedKey } from "./photos";

/**
 * The rules of the style form (v3 slice 7) — what its save button says, what
 * the panel heads count, which file the photo box takes — kept out of the
 * component so they can be read and tested without a browser.
 *
 * The form itself is `components/admin/ProductForm.tsx`; the actions it calls
 * check every one of these again (`lib/catalog-admin.ts`). These exist so the
 * button can name what is missing BEFORE anything is sent, the way the
 * approved mock does (`prototype/v3/product-form.js`).
 */

/**
 * What a colour row shows for its photo:
 *
 * · `none`  — nothing yet (a new style only);
 * · `loan`  — one of the borrowed stand-ins, always labelled "mượn tạm";
 * · `saved` — a photo already uploaded and attached to the style (editing);
 * · `file`  — a file picked on this device and cropped, not uploaded until
 *             the form is saved.
 */
export type PhotoKind = "none" | "loan" | "saved" | "file";

/** Pieces per colour and size, as the form's grid holds them. */
export type CellGrid = Partial<Record<ColorKey, Partial<Record<Size, number>>>>;

/** The pieces one colour's row adds up to. */
export function rowTotal(cells: CellGrid, color: ColorKey): number {
  return SIZES.reduce((n, s) => n + (cells[color]?.[s] ?? 0), 0);
}

/** The whole grid, over the colours chosen. */
export function gridTotal(cells: CellGrid, colors: readonly ColorKey[]): number {
  return colors.reduce((n, c) => n + rowTotal(cells, c), 0);
}

/** Which colours still have no photo, which wear a borrowed one, which a picked file. */
export interface PhotoTally {
  missing: ColorKey[];
  loans: ColorKey[];
  files: ColorKey[];
}

export function photoTally(
  colors: readonly ColorKey[],
  kinds: Partial<Record<ColorKey, PhotoKind>>,
): PhotoTally {
  const of = (c: ColorKey) => kinds[c] ?? "none";
  return {
    missing: colors.filter((c) => of(c) === "none"),
    loans: colors.filter((c) => of(c) === "loan"),
    files: colors.filter((c) => of(c) === "file"),
  };
}

/**
 * The meta beside "Màu và ảnh": "chưa chọn màu", "3 màu · thiếu 1 ảnh",
 * "2 màu · 2 ảnh mượn tạm", "3 màu · đủ ảnh" — in that order of urgency.
 */
export function panelMeta(colors: readonly ColorKey[], tally: PhotoTally): string {
  const n = colors.length;
  if (n === 0) return "chưa chọn màu";
  if (tally.missing.length > 0) return `${n} màu · thiếu ${tally.missing.length} ảnh`;
  if (tally.loans.length > 0) return `${n} màu · ${tally.loans.length} ảnh mượn tạm`;
  return `${n} màu · đủ ảnh`;
}

/** A new style as the form holds it while it is being filled in. */
export interface NewStyleState {
  name: string;
  kind: string;
  fit: Fit | null;
  /**
   * The issue's number as the menu holds it; `FIXED_CHOICE` for "Cố định",
   * a style of no issue (v3 slice 12); empty when nothing is picked.
   */
  dropNo: string;
  priceVnd: number;
  material: string;
  colors: readonly ColorKey[];
  cells: CellGrid;
  photos: Partial<Record<ColorKey, PhotoKind>>;
}

/**
 * The first thing a new style still lacks, in the words the save button
 * shows, or null when it can be created. The order is the form's reading
 * order — name, kind, fit, issue, price, material, then the colours, the cut
 * for each and a photo for each — so the button always points at the
 * earliest gap. The brief's five (tên → giá → màu → số cắt → ảnh) keep their
 * order; kind, fit, issue and material sit where they are on the page,
 * because the action refuses a style without them too (`readNewProduct`),
 * and a button that lights up for a save the server will refuse says the
 * wrong thing.
 *
 * A fixed style (v3 slice 12) is never cut: its grid is headed "Tồn kho",
 * and the button asks for stock, not for a cut.
 */
export function newStyleBlocker(s: NewStyleState): string | null {
  if (s.name.trim() === "") return "Nhập tên mẫu";
  if (s.kind === "") return "Chọn loại";
  if (s.fit === null) return "Chọn form";
  if (s.dropNo === "") return `Chọn ${LEX.tl}`;
  if (s.priceVnd <= 0) return "Nhập giá bán";
  if (s.priceVnd < MIN_PRICE_VND) return `Giá tối thiểu ${vnd(MIN_PRICE_VND)}`;
  if (s.priceVnd > MAX_PRICE_VND) return `Giá tối đa ${vnd(MAX_PRICE_VND)}`;
  if (s.material.trim() === "") return "Nhập chất liệu";
  if (s.colors.length === 0) return "Chọn màu";
  const empty = s.colors.find((c) => rowTotal(s.cells, c) === 0);
  if (empty) return `Điền ${s.dropNo === FIXED_CHOICE ? "tồn kho" : "số cắt"} cho ${COLORS[empty].label}`;
  const bare = s.colors.find((c) => (s.photos[c] ?? "none") === "none");
  if (bare) return `Chọn ảnh cho ${COLORS[bare].label}`;
  return null;
}

/**
 * The files the photo box takes before anything is cropped or sent: JPG, PNG
 * or WebP up to 10 MB — the row's own caption. The browser crops and shrinks
 * the file itself, so what is uploaded is always a WebP or a JPEG well under
 * the server's 1,5 MB.
 */
export const PICK_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_PICK_BYTES = 10 * 1_048_576;

/** Why a picked file is refused, in the mock's words, or null when it is taken. */
export function pickProblem(file: { type: string; size: number }): string | null {
  if (!(PICK_TYPES as readonly string[]).includes(file.type)) return "Chỉ nhận JPG, PNG hoặc WebP";
  if (file.size > MAX_PICK_BYTES) return "Tệp quá 10 MB · chọn ảnh nhỏ hơn";
  return null;
}

/** `2516582` → `"2,4 MB"`, `48000` → `"47 KB"` — a picked file's size on its row. */
export function fileSizeLabel(bytes: number): string {
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1).replace(".", ",")} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

/**
 * The toast when a colour is dropped with pieces already typed for it —
 * "Đã bỏ Rêu · 12 chiếc đã điền xoá theo" — or null when the row was empty.
 */
export function droppedColorMessage(color: ColorKey, pieces: number): string | null {
  return pieces > 0 ? `Đã bỏ ${COLORS[color].label} · ${pieces} chiếc đã điền xoá theo` : null;
}

/** A borrowed stand-in the form can offer, and the style it is the photo of. */
export interface LoanPhoto {
  key: string;
  name: string;
}

/**
 * The borrowed stand-ins "Mượn tạm" offers: every one the catalogue wears
 * (`borrowedPhotoKeys`, which is also what the actions accept) EXCEPT the
 * uploads — an upload is another style's real photo, not a stand-in — in the
 * order `lib/photos.ts` lists the frames.
 *
 * Each is named after the style it is the photo OF ("ảnh của mẫu S05 – CÁT",
 * the name the back office shows since v3 slice 12): the first style whose
 * first colour wears it, else the first style wearing it at all, else the
 * teaser that does. Read from the catalogue, never typed.
 *
 * Only a key `lib/photos.ts` has a frame for (slice B5): the fixed styles
 * carry `flat-…` keys whose drawings do not exist yet, and until they do
 * each would show the hero frame under another style's name.
 */
export function loanPhotos(catalog: Catalog): LoanPhoto[] {
  const rank = (key: string) => {
    const i = PHOTO_KEYS.indexOf(key);
    return i < 0 ? PHOTO_KEYS.length : i;
  };
  return borrowedPhotoKeys(catalog)
    .filter((key) => !isUploadedKey(key) && PHOTO_KEYS.includes(key))
    .map((key) => ({ key, name: loanOwner(catalog, key) }))
    .sort((a, b) => rank(a.key) - rank(b.key));
}

function loanOwner(catalog: Catalog, key: string): string {
  const owner =
    catalog.products.find((p) => p.photoKeys[0] === key) ??
    catalog.products.find((p) => p.photoKeys.includes(key)) ??
    catalog.teasers.find((t) => t.photoKey === key);
  return owner ? styleName(owner.name, owner.dropNo) : "";
}

/**
 * The colours whose uploaded photo the server no longer has, read from a
 * refusal: "Ảnh Đen không còn trên kho, chọn lại" names one; the same
 * sentence without a colour names none and so means all of them. "Đặt lại
 * dữ liệu mẫu" empties the bucket, keys the form is still holding included —
 * the form drops those keys and uploads the files again.
 */
export function staleUploads(message: string | undefined, colors: readonly ColorKey[]): ColorKey[] {
  if (!message) return [];
  const named = colors.filter((c) =>
    message.includes(catalogFailureMessage("ADD_PRODUCT", "PHOTO_UNKNOWN", COLORS[c].label)),
  );
  if (named.length > 0) return named;
  return message.includes(catalogFailureMessage("ADD_PRODUCT", "PHOTO_UNKNOWN")) ? [...colors] : [];
}
