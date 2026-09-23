/**
 * Đồng has no subunit, so every amount in this codebase is an integer count
 * of đồng and every field carrying one says `Vnd` in its name. Formatting is
 * the only place that turns it into something a shopper reads.
 */

/** `1290000` → `"1.290.000₫"`. */
export function vnd(amount: number): string {
  return `${plainVnd(amount)}₫`;
}

/**
 * The same number without the symbol, for a table column whose header already
 * says the unit. Repeating ₫ on every row is noise in a column you scan.
 *
 * Grouped by hand rather than with `toLocaleString("vi-VN")`. `Intl` falls
 * back to the default locale without complaining when a runtime ships partial
 * ICU, and that fallback renders `1,290,000` — an English-looking price on a
 * Vietnamese storefront, wrong in the one place a shopper is most careful.
 * Four lines buys a format that cannot drift with the environment.
 */
export function plainVnd(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const digits = String(Math.abs(Math.round(amount)));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return sign + grouped;
}

/**
 * What was typed into a money box, as an integer count of đồng.
 *
 * Everything that is not a digit is dropped, so a pasted "390.000₫" and a
 * typed "390000" arrive at the same number. The BOX keeps the grouped text
 * (see `moneyInput`); the form keeps this.
 */
export function parseVnd(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  return digits === "" ? 0 : Number(digits);
}

/**
 * The same digits as the box should show them: `390000` → `390.000`.
 *
 * Fix L8 — the product form printed a raw `390000` in the price field while
 * every other amount in the app is grouped, which is exactly where a zero
 * gets miscounted. Empty stays empty rather than becoming a zero nobody
 * typed.
 */
export function moneyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits === "" ? "" : plainVnd(Number(digits));
}

/**
 * What a money box STARTS with, given the amount already stored.
 *
 * A new style has no price yet, and seeding the box with `String(0)` printed
 * a `0` nobody typed — a figure on screen that no one had decided. Zero means
 * "chưa nhập" here, so the box starts empty and the placeholder says what
 * shape the answer takes; an existing amount starts at its own digits.
 */
export function moneyInitial(amountVnd: number): string {
  return amountVnd > 0 ? String(amountVnd) : "";
}

/**
 * `18816000` → `"18,8tr₫"`. For a stat tile, never for a price.
 *
 * A shopper is never shown a rounded amount — they are paying it. This is
 * for the admin dashboard, where a figure sits at 23px in a quarter-width
 * box and the full `18.816.000₫` does not fit; shrinking the type to make it
 * fit is how a number stops being the thing you read first. The exact value
 * is always within reach: the tiles sit above a chart whose `<details>`
 * table prints every day in full.
 *
 * Truncated toward zero, not rounded. 999.960₫ is not a million, and a tile
 * that rounds up to `1tr₫` overstates by exactly the amount somebody would
 * later have to explain.
 */
export function compactVnd(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const n = Math.abs(Math.round(amount));

  const scale = (unit: number, suffix: string) => {
    // One decimal, cut rather than rounded, so the figure never grows.
    const tenths = Math.floor((n / unit) * 10);
    const whole = Math.floor(tenths / 10);
    const rest = tenths % 10;
    return `${sign}${whole}${rest ? `,${rest}` : ""}${suffix}₫`;
  };

  if (n >= 1_000_000) return scale(1_000_000, "tr");
  if (n >= 1_000) return scale(1_000, "k");
  return `${sign}${n}₫`;
}

// ─────────────────────────────────────────────────────────── counting words
// Inside a sentence a small number reads better as a word — "mười mẫu", not
// "10 mẫu". Past twelve the word is longer than the digits and stops helping,
// so the table stops there rather than pretending to be exhaustive.
const WORDS: Record<number, string> = {
  1: "một",
  2: "hai",
  3: "ba",
  4: "bốn",
  5: "năm",
  6: "sáu",
  7: "bảy",
  8: "tám",
  9: "chín",
  10: "mười",
  11: "mười một",
  12: "mười hai",
};

export function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}

/** "mười mẫu" — used in running prose, never in a table cell. */
export function styleCountLabel(n: number): string {
  return `${countWord(n)} mẫu`;
}
