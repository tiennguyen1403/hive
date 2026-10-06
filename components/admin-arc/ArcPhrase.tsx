import type { ReactNode } from "react";
import type { Phrase } from "@/lib/admin-text";

/**
 * A back-office phrase on screen (round v6 slice E4, `lib/admin-text.ts`): the
 * log's cells, an order's notes. A plain string is returned as it is, so a
 * Vietnamese page renders exactly the text node it always rendered; on an
 * English page each value printed as stored and written in Vietnamese — a
 * note, an address, a reason somebody typed — is wrapped in a
 * `<span lang="vi">`, so a screen reader reads it in that voice.
 *
 * A function rather than a component for that reason: what it hands back for a
 * string is the string itself, not an element around it.
 */
export function phraseNode(value: Phrase | undefined): ReactNode {
  if (value === undefined || typeof value === "string") return value;
  return value.map((piece, i) =>
    typeof piece === "string" ? (
      piece
    ) : (
      <span key={i} lang={piece.lang}>
        {piece.stored}
      </span>
    ),
  );
}
