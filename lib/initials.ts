/**
 * The two letters that stand in for a photograph.
 *
 * One helper, because there were two: the account rail took the first letter
 * of the first word and the first letter of the last word, and the admin's
 * customer list took only the last word's — so the same person was "TA" on
 * one screen and "A" on the other. A monogram that changes size between
 * screens reads as two different people.
 *
 * Vietnamese names run họ · đệm · tên ("Trần Minh Anh"), and the two letters
 * people actually use are the family name and the given name — the first
 * word and the last. The middle words are dropped.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  // One word is one letter. Taking "first and last" literally would print
  // the same letter twice ("Minh" → "MM"), which looks like a bug.
  const first = words[0]![0] ?? "";
  if (words.length === 1) return first.toUpperCase();

  const last = words.at(-1)![0] ?? "";
  return (first + last).toUpperCase();
}
