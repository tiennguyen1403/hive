/**
 * A phone number, as a person reads it.
 *
 * The app STORES numbers normalised — `normalisePhone` in `checkout-form.ts`
 * strips every separator so two people who typed the same number the same
 * way compare equal. That is the right shape for a key and the wrong shape
 * for a label: `0912345678` is ten digits nobody can read back over the
 * phone, which is exactly what a delivery number is for.
 *
 * Deliberately NOT importing `normalisePhone`: that module pulls in
 * `data/regions.ts` and the 218KB of communes behind it, and this function
 * is called from screens that need nothing else from checkout.
 *
 * Grouping:
 *   · ten digits — the only length a Vietnamese mobile has — go 4-3-3,
 *     "0912 345 678", which is how they are printed on a card
 *   · any other length keeps the same rhythm: four, then runs of three, and
 *     a final run of one is merged backwards rather than left hanging
 *     (eleven digits → 4-3-4, eight → 4-4)
 *   · anything that is not digits-plus-separators is returned trimmed and
 *     untouched. A number this function does not recognise is somebody's
 *     real number in a shape we did not predict, not a string to mangle.
 *
 * The separator is U+00A0, a NO-BREAK SPACE. A phone number is one token
 * that happens to be written with gaps in it: broken across two lines by a
 * narrow column — an address row on a 390px phone, a table cell in the back
 * office — it stops being readable back, which is the only thing it is for.
 * Nothing here ever reaches an `<input>` value; the form stores the digits
 * (`normalisePhone` in `checkout-form.ts`) and shows what was typed.
 */
export const PHONE_GAP = "\u00A0";

export function formatPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Same reading as `normalisePhone`: +84 and 84 are the country code in
  // front of the same national number.
  const stripped = trimmed.replace(/[\s.\-()]/g, "");
  const local = stripped.replace(/^\+84/, "0").replace(/^84(?=\d{9}$)/, "0");
  if (!/^\d+$/.test(local)) return trimmed;

  const groups: string[] = [local.slice(0, 4)];
  for (let i = 4; i < local.length; i += 3) groups.push(local.slice(i, i + 3));

  // A lone digit at the end reads as a typo. Merge it into the run before it.
  if (groups.length > 1 && groups[groups.length - 1]!.length === 1) {
    const last = groups.pop()!;
    groups[groups.length - 1] += last;
  }

  return groups.join(PHONE_GAP);
}
