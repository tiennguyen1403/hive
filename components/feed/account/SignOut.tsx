import { signOut } from "@/lib/actions/auth";

/** Where "Đăng xuất" lands on a Feed page: Tôi, signed out (`feed.js`: `signOut`, round v4 slice 3b). */
export const SIGNED_OUT_HOME = "/account";

/**
 * "Đăng xuất" as a form of its own, with no button inside: the page's button
 * names it (`<button type="submit" form={id}>`), so the button can stay a
 * direct row of its list — Hồ sơ's `.me-rows`, whose rows are ruled by
 * `:first-child` — and still post the Server Action, script or not.
 */
export function SignOutForm({ id }: { id: string }) {
  return (
    <form id={id} action={signOut} hidden>
      <input type="hidden" name="next" value={SIGNED_OUT_HOME} />
    </form>
  );
}
