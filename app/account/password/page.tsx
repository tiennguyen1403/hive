import { redirect } from "next/navigation";

/**
 * The password moved INTO Hồ sơ (round v4 slice 3b).
 *
 * Until then this was a v3 screen of its own, with the v3 rules ("có cả chữ
 * và số", "khác mật khẩu cũ"); the Feed changes a password in Hồ sơ's sheet,
 * by the mock's rule of eight characters, so one rule is running. The old
 * address redirects rather than 404ing — it is in browser histories and in
 * this project's own sweep list — and lands on Hồ sơ, where the sheet is.
 */
export default function PasswordPage() {
  redirect("/account/profile");
}
