"use server";

import { revalidatePath } from "next/cache";
import { updateMyProfile } from "@/lib/db/profiles";
import { takeRate } from "@/lib/db/rate-limit";
import { getSession } from "@/lib/db/session";
import { pick } from "@/lib/i18n";
import { getActionLocale } from "@/lib/locale";
import {
  PROFILE_FAILED_TEXT,
  PROFILE_SAVED_TEXT,
  PROFILE_SIGN_IN_TEXT,
  profilePhone,
  validateProfile,
  type ProfileFormState,
} from "@/lib/my-state";

/**
 * Hồ sơ's "Lưu" (slice B9): the signed-in account's own name and phone.
 *
 * A public endpoint like every Server Action, so the form is re-read and
 * re-checked here whatever the browser validated, by the mock's rules
 * (`lib/my-state.ts#validateProfile`: "Nhập họ và tên", "Nhập số điện
 * thoại", "Số điện thoại gồm 10 số, bắt đầu bằng 0") — and again in the
 * database (`update_my_profile`). Only `name` and `phone` are read: the
 * e-mail is read-only (QĐ-35), and nothing this form sends can reach it or the
 * handle.
 *
 * Signed out it answers SIGNED_OUT and writes nothing, rather than
 * redirecting — the same contract as the keep actions. The shared demo
 * accounts may change their name and phone like anybody (the 19:00 reset
 * puts them back); only their password is locked (B4b).
 *
 * `revalidatePath("/", "layout")` on success: the name sits in the root
 * layout's `MeProvider` and on every account screen, and the action's own
 * response then carries the re-rendered tree (`02-guides/server-actions.md`,
 * "A single response carries data and UI"). The form also gets the stored
 * values back, and the toast its sentence.
 *
 * Round v6 slice E3a: every sentence is in the request's language
 * (`getActionLocale`), the rate limit's too.
 */

const field = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

export async function updateProfileAction(
  _prev: ProfileFormState,
  form: FormData,
): Promise<ProfileFormState> {
  const locale = await getActionLocale();
  const signIn = pick(PROFILE_SIGN_IN_TEXT, locale);
  const failed = pick(PROFILE_FAILED_TEXT, locale);
  if (!(await getSession())) {
    return { errors: { form: signIn }, reason: "SIGNED_OUT" };
  }

  const draft = { name: field(form, "name"), phone: field(form, "phone") };
  const errors: Record<string, string> = {};
  for (const [key, message] of Object.entries(validateProfile(draft, locale))) {
    if (message) errors[key] = message;
  }
  if (Object.keys(errors).length > 0) return { errors };

  const pace = await takeRate("account", 1, locale);
  if (!pace.ok) return { errors: { form: pace.message }, reason: "RATE_LIMITED" };

  let saved: Awaited<ReturnType<typeof updateMyProfile>>;
  try {
    saved = await updateMyProfile(draft.name.trim(), profilePhone(draft.phone));
  } catch (error) {
    console.error("updateProfileAction:", error instanceof Error ? error.message : error);
    return { errors: { form: failed }, reason: "UNAVAILABLE" };
  }
  if (!saved.ok) {
    return saved.failure === "SIGNED_OUT"
      ? { errors: { form: signIn }, reason: "SIGNED_OUT" }
      : { errors: { form: failed }, reason: "UNAVAILABLE" };
  }

  revalidatePath("/", "layout");
  return { errors: {}, ok: true, message: pick(PROFILE_SAVED_TEXT, locale), profile: saved.value };
}
