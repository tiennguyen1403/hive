import {
  COLOR_KEYS,
  NOTIFY_KEYS,
  SIZES,
  SIZE_SLOTS,
  productId,
  type ColorKey,
  type Favorite,
  type MyState,
  type NotifyKey,
  type NotifySwitches,
  type ProductId,
  type Size,
  type SizeSlot,
} from "@/data/types";
import type { ActionState } from "@/lib/actions/state";
import { LEX } from "./lexicon";

/**
 * What the signed-in account keeps (slice B9) — saved styles, issue
 * reminders, "Size của tôi", the notification switches — and the profile's
 * name and phone, from the side with no I/O: the rules an action applies to
 * what the browser sent, the shape of what it answers, and the sentences it
 * answers with.
 *
 * The database checks every one of these rules again
 * (`supabase/migrations/20260929120000_account_state.sql`), because a Server
 * Action is a public endpoint and this file is not the only thing that can
 * reach a function (`02-guides/data-security.md`: "Always validate input from
 * client"). Kept pure so `my-state.test.ts` can pin it without a database,
 * and importable by a Client Component, which is what the result types are
 * for.
 */

/** Every switch starts on — the mock's `prefs()` in `notifications.js`. */
export const DEFAULT_NOTIFY: NotifySwitches = {
  order: true,
  drop: true,
  wishlist: true,
  promo: true,
};

// ─────────────────────────────────────────────────────────── the profile
/** "Nhập họ và tên" below two characters, as `profile.js` has it. */
export const NAME_MIN = 2;

/**
 * The mock sets no ceiling; the brief asks for one, here and in SQL
 * (`update_my_profile`, `name_max`). Sixty characters holds any Vietnamese
 * name several times over and keeps a pasted paragraph out of the account
 * header.
 */
export const NAME_MAX = 60;

/** What Hồ sơ's "Lưu" sends. The e-mail is read-only (QĐ-35) and not sent. */
export interface ProfileDraft {
  name: string;
  phone: string;
}

export type ProfileErrors = Partial<Record<keyof ProfileDraft, string>>;

/** The toast after a save, the mock's own words. */
export const PROFILE_SAVED = "Đã lưu hồ sơ";

/** Signed out: the title of the mock's signed-out Hồ sơ (`profile.js`). */
export const PROFILE_SIGN_IN = "Đăng nhập để sửa hồ sơ";

/** Anything else that stopped the save — the database, the network. */
export const PROFILE_FAILED = "Chưa lưu được hồ sơ. Thử lại sau ít phút.";

/**
 * Characters as Postgres counts them (`char_length`, code points), not as
 * `String.length` does (UTF-16 units) — so both sides agree where a name
 * stops.
 */
const charCount = (text: string): number => [...text].length;

/**
 * The number as the profile stores it: ten digits starting with 0 — or ""
 * when the text is not one.
 *
 * The mock's rule and nothing looser (`profile.js`: `/^[\d\s.]+$/` and then
 * `/^0\d{9}$/` on the digits): spaces and dots may separate the digits, and a
 * no-break space is a space, so a number copied off the screen
 * (`lib/phone.ts#formatPhone` groups with U+00A0) goes back in as it came
 * out. A dash or a `+84` is refused here, although checkout's
 * `normalisePhone` would take it — this form is the mock's.
 */
export function profilePhone(raw: string): string {
  const text = raw.trim();
  if (!/^[\d\s.]+$/.test(text)) return "";
  const digits = text.replace(/[\s.]/g, "");
  return /^0\d{9}$/.test(digits) ? digits : "";
}

/** Field → sentence, only for the fields that are wrong. The mock's words. */
export function validateProfile(d: ProfileDraft): ProfileErrors {
  const e: ProfileErrors = {};

  const name = d.name.trim();
  if (charCount(name) < NAME_MIN) e.name = "Nhập họ và tên";
  else if (charCount(name) > NAME_MAX) e.name = `Họ và tên tối đa ${NAME_MAX} ký tự`;

  const phone = d.phone.trim();
  if (!phone) e.phone = "Nhập số điện thoại";
  else if (!profilePhone(phone)) e.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0";

  return e;
}

/**
 * What `updateProfileAction` hands back to `useActionState`: the form's own
 * `ActionState`, plus the saved values once they are saved, and — when the
 * whole form was refused — why, so a screen can tell "sign in" from "wait".
 */
export interface ProfileFormState extends ActionState {
  reason?: "SIGNED_OUT" | "RATE_LIMITED" | "UNAVAILABLE";
  profile?: { name: string; phone: string };
}

// ───────────────────────────────────────────── what the browser may send
/** `products.id`'s own check (`^p-[a-z0-9-]+$`), with a length no id comes near. */
const PRODUCT_ID = /^p-[a-z0-9-]{1,80}$/;

export function readProductId(value: unknown): ProductId | null {
  return typeof value === "string" && PRODUCT_ID.test(value) ? productId(value) : null;
}

/**
 * A colour, or none — the database then picks the mock's `firstColor`. Null
 * when the value is neither, which the action refuses.
 */
export function readColorChoice(value: unknown): { color: ColorKey | null } | null {
  if (value === null || value === undefined) return { color: null };
  return typeof value === "string" && (COLOR_KEYS as readonly string[]).includes(value)
    ? { color: value as ColorKey }
    : null;
}

/** An issue number: a positive integer that fits the `integer` column. */
export function readDropNo(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2_147_483_647
    ? value
    : null;
}

export function readSizeSlot(value: unknown): SizeSlot | null {
  return typeof value === "string" && (SIZE_SLOTS as readonly string[]).includes(value)
    ? (value as SizeSlot)
    : null;
}

/** A size, or none to forget it ("Bỏ chọn"). Null when the value is neither. */
export function readSizeChoice(value: unknown): { size: Size | null } | null {
  if (value === null || value === undefined) return { size: null };
  return typeof value === "string" && (SIZES as readonly string[]).includes(value)
    ? { size: value as Size }
    : null;
}

export function readNotifyKey(value: unknown): NotifyKey | null {
  return typeof value === "string" && (NOTIFY_KEYS as readonly string[]).includes(value)
    ? (value as NotifyKey)
    : null;
}

/** On or off, as a boolean — not "true", not 1. */
export function readSwitch(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

// ─────────────────────────────────────────────────────────── the answers
/**
 * Why a write did not happen:
 *
 *   SIGNED_OUT    nobody is signed in — nothing was written;
 *   INVALID       the input is not something the account can keep (a style
 *                 that is not in the catalogue, a colour it is not made in,
 *                 a size or a switch that does not exist);
 *   NOT_UPCOMING  a reminder for an issue that has opened, or does not exist;
 *   NOT_FOUND     "Hoàn tác" with nothing left to undo;
 *   RATE_LIMITED  the visitor's `keep` limit (`lib/rate-limit.ts`; Hồ sơ's
 *                 save spends `account` instead);
 *   UNAVAILABLE   anything else — the database, the network.
 */
export type KeepFailure =
  | "SIGNED_OUT"
  | "INVALID"
  | "NOT_UPCOMING"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UNAVAILABLE";

/** Which of the four the write was about — it picks the sign-in sentence. */
export type KeepTopic = "favorites" | "reminders" | "sizes" | "notify";

export interface KeepRefusal {
  ok: false;
  reason: KeepFailure;
  /** Shown as-is, in a toast. */
  message: string;
}

/** Every keep write answers with the whole state as the database now holds it. */
export type KeepResult = { ok: true; state: MyState } | KeepRefusal;

/** "Bỏ lưu" also answers with the row it took off — `null` if it was not saved. */
export type UnsaveResult = { ok: true; state: MyState; removed: Favorite | null } | KeepRefusal;

/**
 * What a DAL write hands to its action: the value, or the failure — never a
 * thrown error for something that was expected.
 */
export type Written<T> = { ok: true; value: T } | { ok: false; failure: KeepFailure };

/** The codes the B9 functions raise, as `raise exception using message = …`. */
const RAISED: Readonly<Record<string, KeepFailure>> = {
  SIGNED_OUT: "SIGNED_OUT",
  BAD_INPUT: "INVALID",
  NOT_UPCOMING: "NOT_UPCOMING",
  NOT_FOUND: "NOT_FOUND",
};

/**
 * A PostgREST error → the failure. Only `P0001` (`raise_exception`) carrying
 * one of the four codes is a refusal the function meant; everything else is
 * UNAVAILABLE, and its text stays in the server log.
 */
export function keepFailureOf(error: { code?: string; message?: string } | null): KeepFailure {
  if (!error || error.code !== "P0001") return "UNAVAILABLE";
  return RAISED[error.message ?? ""] ?? "UNAVAILABLE";
}

/**
 * Signed out, the mock's own invitation for the thing that was pressed: the
 * heart and "Nhắc tôi" say it in a toast (`feed.js#askSignIn`); the sizes live
 * on Hồ sơ and the switches on Thông báo, whose signed-out pages carry these
 * two titles.
 */
const SIGN_IN_TO: Readonly<Record<KeepTopic, string>> = {
  favorites: "Đăng nhập để lưu mẫu",
  reminders: "Đăng nhập để bật nhắc",
  sizes: PROFILE_SIGN_IN,
  notify: "Đăng nhập để xem thông báo",
};

export function keepFailureMessage(reason: KeepFailure, topic: KeepTopic): string {
  switch (reason) {
    case "SIGNED_OUT":
      return SIGN_IN_TO[topic];
    case "INVALID":
      return "Chưa lưu được. Tải lại trang rồi thử lại.";
    case "NOT_UPCOMING":
      return `Chỉ bật nhắc được cho ${LEX.t} chưa mở.`;
    case "NOT_FOUND":
      return "Không còn gì để hoàn tác.";
    case "RATE_LIMITED":
    case "UNAVAILABLE":
      return "Chưa lưu được. Thử lại sau ít phút.";
  }
}

/** The refusal an action returns, in one line. */
export function keepRefusal(reason: KeepFailure, topic: KeepTopic, message?: string): KeepRefusal {
  return { ok: false, reason, message: message ?? keepFailureMessage(reason, topic) };
}
