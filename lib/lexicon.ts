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
 * The two lines the home page opens with — the only copy on that screen that
 * is not arithmetic over `data/`.
 *
 * They live here, beside the lexicon, because they are the shop's own voice
 * rather than the home page's layout: the user is still weighing the wording
 * (four candidates were on the board as `HERO` in `prototype/v3/v3.js` on
 * 22/09/2026), and when they settle it the change is these two strings and
 * nothing else. The screen reads them; it never spells them out inline.
 *
 * `headline` says ten because the open issue has ten styles. It is the one
 * figure on the page typed rather than counted, and it is typed because it
 * is a sentence, not a count — if the issue ever carries a different number
 * the line has to be rewritten by a person, not patched by a formatter.
 */
export const HOME_COVER = {
  headline: "Mười mẫu. Cắt một lần. Hết là hết.",
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
 * `/about` says so in a `.prep` block instead of filling it in.
 */
export const ABOUT_LEAD =
  `HIVE bán streetwear unisex theo ${LEX.tl}: mỗi ${LEX.tl} mở đúng giờ, ` +
  "mỗi mẫu cắt đúng một lần, hết là hết.";

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
