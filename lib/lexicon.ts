
/**
 * One word for one concept, in one place.
 *
 * The shop sells in numbered issues. Until 22/09/2026 the interface called
 * an issue an "đợt" — correct, and the word every other Vietnamese shop
 * uses for a sale window, which is exactly why it carried nothing. The v3
 * round renamed it "Số": a magazine's issue number. It has a cover, a table
 * of contents, a publication date, and "hết số này là hết" needs no
 * explanation.
 *
 * The table is copied from `prototype/v3/v3.js` (`LEX.so`), the approved
 * mock, so the running app and the mock cannot drift.
 *
 * WHAT THIS DOES NOT RENAME. URLs stay English (`/admin/drops`), and so do
 * the identifiers in the code (`Drop`, `dropNo`, `dropState`) and the keys
 * in localStorage. A URL is an address and an identifier is a name; neither
 * is read by a shopper, and renaming them would break every bookmark and
 * every browser that already stores a cart.
 *
 * The one English word on a shopper-facing screen is SOLD OUT, stamped on a
 * photo of a style that has gone. It is streetwear's own convention, the
 * user settled it on 22/09, and in a sentence the shop still says "đã hết".
 */
export const LEX = {
  /** Capitalised, in front of a number: "Số 05". */
  t: "Số",
  /** Lower case, inside a sentence: "mỗi số cắt một lần". */
  tl: "số",
  /** Upper case, as a label above the number on a cover. */
  tu: "SỐ",
  /** The footer column that lists which issues are open, next and past. */
  cal: "Lịch ra số",
  /** The back office's own name for the list of them. */
  adm: "Các số",
  /** A section heading on the home page. */
  in: "Trong số này",
  /** The same, inside a sentence. */
  inl: "trong số này",
  next: "Số kế tiếp",
  prev: "Số trước",
} as const;

/**
 * The cover line the home page opens with — the only copy on that screen that
 * is not arithmetic over `data/` — and the v3 cover's lead under it.
 *
 * They live here, beside the lexicon, because they are the shop's own voice
 * rather than the home page's layout: when the wording changes, the change is
 * these strings and nothing else. The screen reads them; it never spells them
 * out inline.
 *
 * `headline` is "Cắt 1 lần. Không tái bản." since round v4 (the user's answer
 * on the Feed mock, round 4, 27/09/2026): the Feed home's story sets it on
 * its two lines (`coverLines`, `lib/feed-home.ts`). It names no count — the
 * v3 line said ten, the one figure on that page typed rather than counted.
 * `lead` belonged to the v3 cover and no Feed screen prints it.
 *
 * The share image (v3 slice 10, redrawn at v4 slice 1a) prints `headline`
 * too, as outlines drawn from it by `scripts/brand-assets.ts`: after changing
 * it, run that script once. Until then the build and the tests refuse the old
 * outlines (`lib/brand/share-image.ts`).
 */
export const HOME_COVER = {
  headline: "Cắt 1 lần. Không tái bản.",
  lead:
    "Mỗi mẫu cắt đúng một lần từ khổ vải đã đặt. Số còn lại của từng mẫu hiện ngay " +
    "bên dưới. Hết size là hết, không may thêm.",
} as const;

/**
 * The one sentence `/about` opens with.
 *
 * Beside `HOME_COVER` and for the same reason: it is the shop's own voice
 * rather than a page's layout, the user is still weighing the wording, and
 * when they settle it the change is this string and nothing else. It states
 * only rules this build really enforces — the window, the single cut, the
 * shelf running out. Everything else about the brand is still unwritten, and
 * `/about` says so in an empty slot marked "Đang chuẩn bị" (the Feed's way,
 * since round v4 slice 4b) instead of filling it in.
 *
 * "mỗi mẫu TRONG SỐ" since v3 slice 11: a fixed style belongs to no issue and
 * is brought back when a size runs out, so the single cut is the rule of an
 * issue's styles, not of every style the shop sells.
 *
 * "Số" capitalised inside the sentence since round v4 slice 4b: the Feed
 * writes it so wherever it names an issue ("Số mới", "Các Số đã đóng"), not
 * the v3 lower case `LEX.tl`. `/about` is the only screen that reads it.
 */
export const ABOUT_LEAD =
  `HIVE bán streetwear unisex theo ${LEX.t}: mỗi ${LEX.t} mở đúng giờ, ` +
  `mỗi mẫu trong ${LEX.t} cắt đúng một lần, hết là hết.`;

/**
 * The four rules `/about` states under its opening sentence, and the line
 * that says where they hold. The words the page has carried since v3
 * (the v3 component `FourRules`, which the v3 home page printed too), kept
 * as they were when the page moved into the Feed frame
 * (round v4 slice 4b, QĐ-34); here as data so the Feed page lays them out
 * itself rather than wearing the v3 component. "Số" is capitalised where it
 * names an issue, as the Feed writes it; "Số còn lại là số thật" and "số đo"
 * are a count and a measurement, not an issue, and keep their words.
 */
export const FOUR_RULES_SCOPE = `áp dụng cho mọi ${LEX.t}`;
export const FOUR_RULES: readonly { title: string; body: string }[] = [
  { title: "Cắt đúng một lần", body: `Mỗi mẫu cắt từ khổ vải đã đặt. Không may thêm giữa ${LEX.t}.` },
  { title: "Có giờ mở, giờ đóng", body: "Mở theo lịch công bố trước. Đóng khi hết hàng hoặc hết giờ." },
  { title: "Số còn lại là số thật", body: "Còn bao nhiêu chiếc hiện ngay trên lưới, không đợi bấm vào mới biết." },
  { title: "Một dải size cho tất cả", body: "Không chia nam nữ. Chọn theo form và số đo." },
];

/**
 * `"Số 05"` — the issue, named the way every screen names it.
 *
 * Two digits always: the numbers are read in a column (a calendar, a table,
 * a filter menu) and "Số 5" beside "Số 05" reads as two different things.
 */
export function issueLabel(no: number): string {
  return `${LEX.t} ${issueNo(no)}`;
}

/** `"05"` — just the padded number, for the places that set it in display type. */
export function issueNo(no: number): string {
  return String(no).padStart(2, "0");
}

/**
 * `"S05"` — an issue as a CODE, the prefix a style of that issue wears in
 * front of its name (slice B5, approved on the fixed-styles board, round 4).
 * Its lower case is also the prefix of the style's address: `s05-khoi`.
 */
export function issueCode(no: number): string {
  return `S${issueNo(no)}`;
}

/**
 * The name a style is shown under: `"S05 – KHÓI"` for a style of issue 05,
 * the bare name for a fixed style (`dropNo` null). A teaser goes through the
 * same function with its own issue.
 *
 * Made when it is shown, never stored: the `name` column stays "KHÓI", so a
 * style that moves to another issue is renamed by nothing. Between the code
 * and the dash is a NO-BREAK space (U+00A0), so "S05 –" never splits across
 * two lines; after the en dash (U+2013) an ordinary space, so a long name may
 * wrap there.
 */
export function styleName(name: string, dropNo: number | null): string {
  return dropNo === null ? name : `${stylePrefix(dropNo)} ${name}`;
}

/**
 * One entry of a LIST of styles — `"S05 – KHÓI ×1"` — held together as one
 * unit, so a list breaks between its entries and never inside one (v3 slice
 * 13). Measured before this at 390: "…S05 – SƯƠNG, S05 –" over "THAN", and
 * "S05 – KHÓI" over "×1".
 *
 * `shown` is the name as `styleName` gives it. The space after its dash
 * becomes a NO-BREAK space here, with a WORD JOINER (U+2060) in front of
 * it: UAX #14 (LB12a) still allows a break before a no-break space that
 * follows a dash, and the en dash is one (class BA) — measured, the list
 * kept breaking after "S05 –" with the no-break space alone. The space
 * before the count is a no-break space too. The spaces INSIDE a fixed
 * style's name are left alone, so "ÁO THUN TAY DÀI" can still wrap between
 * its words. A name standing on its own keeps the ordinary space
 * `styleName` gives it (DESIGN.md §3). The list's own ", " stays an
 * ordinary break.
 */
export function styleInList(shown: string, qty?: number): string {
  const held = shown.replace(/– /g, "–\u2060\u00a0");
  return qty === undefined ? held : `${held}\u00a0×${qty}`;
}

/**
 * `"S06 –"` — the part of `styleName` an issue gives, on its own: what the
 * back office's name field shows as a fixed segment in front of the typed
 * name (v3 slice 12, the fixed-styles board, round 4). The same no-break
 * space and en dash as the shown name, so the segment and the name the shop
 * prints can never drift apart.
 */
export function stylePrefix(no: number): string {
  return `${issueCode(no)} –`;
}

/**
 * "Cố định" — the back office's word for a style that belongs to no issue
 * (fixed-styles board, rounds 3–4, approved 25/09/2026): the first tab of the
 * styles table, the last choice of the issue menu, the read-only issue field
 * of such a style. Only the back office says it; a shopper sees a style.
 * Not in `LEX`, which is pinned to the shop's table in the v3 mock.
 */
export const FIXED_WORD = "Cố định";

/**
 * `"Áo thun oversize"` → `"áo thun oversize"` — a garment kind dropped into
 * the middle of a sentence.
 *
 * The card's count line reads "còn 17 · áo thun oversize" on the search
 * results and in the related row, where the kind stands where the size run
 * stands in a listing. It is a clause, not a title, so it takes the case a
 * clause takes.
 *
 * Only the FIRST letter is lowered. A kind is a phrase the fixtures own
 * (`Product.kind`) and nothing says a future one cannot carry a word that
 * has to keep its capital — a fabric brand, a collaboration. Lowering the
 * whole string would quietly rewrite it.
 */
export function kindInSentence(kind: string): string {
  const first = kind.slice(0, 1);
  return first.toLocaleLowerCase("vi") + kind.slice(1);
}
