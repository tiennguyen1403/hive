import { findWard } from "@/data/regions";
import type { AddressLabel } from "@/data/types";
import { normalisePhone } from "./checkout-form";

/**
 * The rules behind the account forms, kept out of the components so they can
 * be read and tested in one place.
 */

export const PASSWORD_MIN = 8;

// ───────────────────────────────────────────────────────────── sign-up
export interface SignUpDraft {
  name: string;
  email: string;
  phone: string;
  password: string;
  wantsDropAlerts: boolean;
  agreed: boolean;
}

export type SignUpErrors = Partial<Record<keyof SignUpDraft, string>>;

/** Light on purpose — see the same note in `checkout-form.ts`. */
function looksLikeEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
}

export function validateSignUp(d: SignUpDraft): SignUpErrors {
  const e: SignUpErrors = {};

  if (!d.name.trim()) e.name = "Cần họ và tên.";

  // SHAPE ONLY. Whether the address is already taken is a question for the
  // auth server, and slice B1 made it one that must not be answered out
  // loud: "email này đã có tài khoản" is how somebody finds out which
  // addresses are registered here. `signUp` returns one sentence for every
  // way it can fail (QĐ-15), and this validator stopped consulting
  // `data/customers.ts` when the fixture stopped being the account list.
  const email = d.email.trim().toLowerCase();
  if (!email) e.email = "Cần email để nhận xác nhận đơn.";
  else if (!looksLikeEmail(email)) e.email = "Email này thiếu phần sau dấu chấm.";

  if (!d.phone.trim()) e.phone = "Cần số điện thoại để người giao gọi.";
  else if (!normalisePhone(d.phone)) {
    e.phone = "Số điện thoại chưa đúng — 10 số, bắt đầu bằng 0.";
  }

  if (!d.password) e.password = "Cần mật khẩu.";
  else if (!passwordChecks(d.password, "").slice(0, 2).every((c) => c.ok)) {
    e.password = `Mật khẩu cần ít nhất ${PASSWORD_MIN} ký tự, có cả chữ và số.`;
  }

  if (!d.agreed) e.agreed = "Cần đồng ý điều khoản sử dụng trước khi tạo tài khoản.";

  return e;
}

// ──────────────────────────────────────────────────────────── passwords
export interface PasswordCheck {
  /** Shown as-is, beside a tick or a cross. */
  label: string;
  ok: boolean;
}

/**
 * The three rules, evaluated live as the shopper types.
 *
 * They are returned as a list rather than a boolean because the screen shows
 * each one passing or failing on its own. "Mật khẩu không hợp lệ" makes
 * somebody guess which rule they broke.
 *
 * The third rule reads false while `current` is still empty: nothing is
 * known yet, and a green tick nobody earned is worse than a grey one.
 */
export function passwordChecks(next: string, current: string): PasswordCheck[] {
  return [
    { label: `Ít nhất ${PASSWORD_MIN} ký tự`, ok: next.length >= PASSWORD_MIN },
    { label: "Có cả chữ và số", ok: /\p{L}/u.test(next) && /\d/.test(next) },
    { label: "Khác mật khẩu cũ", ok: next.length > 0 && current.length > 0 && next !== current },
  ];
}

export interface ChangePasswordDraft {
  current: string;
  next: string;
  confirm: string;
}

export type ChangePasswordErrors = Partial<Record<keyof ChangePasswordDraft, string>>;

export function validateChangePassword(d: ChangePasswordDraft): ChangePasswordErrors {
  const e: ChangePasswordErrors = {};
  if (!d.current) e.current = "Nhập mật khẩu hiện tại.";
  if (!passwordChecks(d.next, d.current).every((c) => c.ok)) {
    e.next = "Mật khẩu mới chưa đạt đủ ba điều kiện bên dưới.";
  }
  if (d.confirm !== d.next) e.confirm = "Hai lần nhập chưa khớp nhau.";
  return e;
}

// ──────────────────────────────────────────────────────────── addresses
/**
 * Shown as-is. The mock offers these three and no free text.
 *
 * MOVED to `data/types.ts` at v3 slice 3, when an address in the fixtures
 * started carrying its own label — a data field belongs beside the data.
 * Both names are re-exported here so every screen that already imports them
 * from this module keeps reading.
 */
export { ADDRESS_LABELS } from "@/data/types";
export type { AddressLabel };

export interface AddressDraft {
  recipient: string;
  phone: string;
  provinceCode: string;
  wardCode: string;
  line: string;
  label: AddressLabel;
  isDefault: boolean;
}

export type AddressErrors = Partial<Record<keyof AddressDraft, string>>;

export const EMPTY_ADDRESS: AddressDraft = {
  recipient: "",
  phone: "",
  provinceCode: "",
  wardCode: "",
  line: "",
  label: "Nhà",
  isDefault: false,
};

export function validateAddressForm(d: AddressDraft): AddressErrors {
  const e: AddressErrors = {};

  if (!d.recipient.trim()) e.recipient = "Cần tên người nhận.";
  if (!d.phone.trim()) e.phone = "Cần số điện thoại.";
  else if (!normalisePhone(d.phone)) e.phone = "Số điện thoại chưa đúng — 10 số, bắt đầu bằng 0.";

  if (!d.provinceCode) e.provinceCode = "Chọn tỉnh / thành phố.";
  if (!d.wardCode) e.wardCode = "Chọn phường / xã.";
  else if (d.provinceCode && !findWard(d.provinceCode, d.wardCode)) {
    e.wardCode = "Phường / xã này không thuộc tỉnh đã chọn.";
  }

  if (!d.line.trim()) e.line = "Cần số nhà và tên đường.";

  return e;
}
