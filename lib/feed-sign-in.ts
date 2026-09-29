import { safeNext } from "./actions/state";

/**
 * The Feed's sign-in page and its two other modes (round v4 slice 3a): the
 * approved mock's rules and words (`prototype/explore/feed/account.js`:
 * `SI_RULES`, `siCheck`, `signInForm`; `sign-in.js`: `MODES`).
 *
 * Pure and safe for the browser: the form checks itself with these before it
 * sends anything, and the Server Actions (`lib/actions/auth.ts`) check again
 * with the same functions, because an action is a public endpoint.
 */

/** The three modes of `sign-in.html`, each a route of the app: `/sign-in`, `/sign-up`, `/forgot-password`. */
export type SignMode = "in" | "up" | "forgot";

/** Each mode's title: the page's heading, the phone bar's title and the tab's title. */
export const SIGN_TITLES: Readonly<Record<SignMode, string>> = {
  in: "Đăng nhập",
  up: "Tạo tài khoản",
  forgot: "Quên mật khẩu",
};

/** Where each mode lives. */
export const SIGN_PATHS: Readonly<Record<SignMode, string>> = {
  in: "/sign-in",
  up: "/sign-up",
  forgot: "/forgot-password",
};

export type SignField = "name" | "email" | "password";

export interface SignFields {
  name?: string;
  email?: string;
  password?: string;
}

/** The fields each mode shows, in the page's order: the first wrong one takes the focus. */
export const SIGN_FIELDS: Readonly<Record<SignMode, readonly SignField[]>> = {
  in: ["email", "password"],
  up: ["name", "email", "password"],
  forgot: ["email"],
};

/** A new account's password: eight characters, the one rule the mock states (and Supabase keeps). */
export const PASSWORD_LENGTH = 8;

/** The mock's address shape (`SI_RULES.email`), the checkout's too: light on purpose. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * What is wrong with each field the mode shows, in the mock's words. The mock
 * trims every value before it judges it, the password too: "Mật khẩu từ 8 ký
 * tự" counts the characters that are not spaces at either end.
 *
 * · "Nhập họ và tên" — a name of fewer than two characters;
 * · "Nhập email", "Email chưa đúng";
 * · "Nhập mật khẩu" when signing in, "Mật khẩu từ 8 ký tự" for a new account.
 *
 * Only the length is asked of a new password, as in the mock; the v3 rule
 * "có cả chữ và số" is gone (a conflict with the old rule, reported).
 */
export function signErrors(mode: SignMode, f: SignFields): Partial<Record<SignField, string>> {
  const e: Partial<Record<SignField, string>> = {};
  const fields = SIGN_FIELDS[mode];
  if (fields.includes("name") && (f.name ?? "").trim().length < 2) e.name = "Nhập họ và tên";
  if (fields.includes("email")) {
    const email = (f.email ?? "").trim();
    if (!email) e.email = "Nhập email";
    else if (!EMAIL.test(email)) e.email = "Email chưa đúng";
  }
  if (fields.includes("password")) {
    const password = (f.password ?? "").trim();
    if (mode === "up") {
      if (password.length < PASSWORD_LENGTH) e.password = `Mật khẩu từ ${PASSWORD_LENGTH} ký tự`;
    } else if (!password) {
      e.password = "Nhập mật khẩu";
    }
  }
  return e;
}

/** The first wrong field, in the page's order. */
export function firstWrongSign(mode: SignMode, errors: Partial<Record<SignField, string>>): SignField | undefined {
  return SIGN_FIELDS[mode].find((f) => errors[f]);
}

/** The line above the form after a sign-in the auth server refused, whichever of the two was wrong (`signInForm`). */
export const SIGN_IN_WRONG = "Email hoặc mật khẩu chưa đúng";

/**
 * Under the email of a new account whose address already has one, as the mock
 * says it (`siCheck`). It tells anybody which addresses are registered here,
 * which QĐ-15 refused; the Feed says it, and the conflict is reported.
 */
export const EMAIL_TAKEN = "Email này đã có tài khoản";

/**
 * The line "Quên mật khẩu" ends on (QĐ-35): no mail can be sent yet, so the
 * page says so instead of the mock's "Đã gửi liên kết…", and offers neither a
 * check mark nor "Gửi lại". The address is set in bold between the two parts.
 */
export const FORGOT_NOT_SENT = {
  before: "Chưa gửi được liên kết đặt lại mật khẩu tới ",
  after: ". Tính năng này đang chuẩn bị.",
} as const;

/**
 * A link to another mode that keeps where the shopper is headed: `next` rides
 * along, as the mock's `modeHref` keeps its query.
 */
export function signHref(mode: SignMode, next: string | undefined): string {
  return next ? `${SIGN_PATHS[mode]}?next=${encodeURIComponent(next)}` : SIGN_PATHS[mode];
}

/**
 * `?next=` as the page read it: a path of this app's own, or nothing — a full
 * URL, or `//somewhere`, is dropped rather than carried into every link
 * (`safeNext`, which the Server Actions apply again).
 */
export function nextParam(raw: string | string[] | undefined): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ? safeNext(value, "") || undefined : undefined;
}
