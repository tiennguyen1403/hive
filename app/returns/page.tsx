import { redirect } from "next/navigation";

/**
 * Đổi trả moved INTO Hỏi đáp (round v4 slice 4b).
 *
 * The Feed has no returns page of its own: every "Đổi trả" link opens Hỏi
 * đáp's return group, where the rules the user settled on 27/09/2026 are
 * stated (`lib/returns.ts`), and the user chose on 30/09 that this address
 * leads there too. Until then it was a v3 page with the window and a block of
 * conditions "đang chuẩn bị". The old address redirects rather than 404ing —
 * it is in browser histories and in old links — and lands on the group, which
 * opens with every answer (`HelpView`).
 */
export default function ReturnsPage() {
  redirect("/faq#doi-tra");
}
