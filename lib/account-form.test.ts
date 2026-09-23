import { describe, it, expect } from "vitest";
import {
  PASSWORD_MIN,
  passwordChecks,
  validateAddressForm,
  validateSignUp,
  type AddressDraft,
  type SignUpDraft,
} from "./account-form";

const GOOD_SIGNUP: SignUpDraft = {
  name: "Trần Minh Anh",
  email: "moi@example.com",
  phone: "0912 345 679",
  password: "dotnam2026",
  wantsDropAlerts: true,
  agreed: true,
};

describe("validateSignUp", () => {
  it("passes a complete draft", () => {
    expect(validateSignUp(GOOD_SIGNUP)).toEqual({});
  });

  it("needs a name", () => {
    expect(validateSignUp({ ...GOOD_SIGNUP, name: "  " }).name).toBeTruthy();
  });

  it("catches the email the mock is showing as wrong", () => {
    // The approved sign-up screen renders this exact value in its error
    // state: "minhanh@email" with no dot after the @.
    expect(validateSignUp({ ...GOOD_SIGNUP, email: "minhanh@email" }).email).toBeTruthy();
  });

  it("does NOT say whether an address already has an account", () => {
    // It used to, from the fixture. Slice B1 put a real auth server behind
    // this form, and "email này đã có tài khoản" is how somebody finds out
    // which addresses are registered here — so the answer moved to the
    // server, where it comes back as one sentence for every failure (QĐ-15).
    expect(validateSignUp({ ...GOOD_SIGNUP, email: "minhanh@email.com" })).toEqual({});
    expect(validateSignUp({ ...GOOD_SIGNUP, phone: "0912345678" })).toEqual({});
  });

  it("still catches a phone that is not ten digits starting with zero", () => {
    expect(validateSignUp({ ...GOOD_SIGNUP, phone: "12345" }).phone).toBeTruthy();
    expect(validateSignUp({ ...GOOD_SIGNUP, phone: "  " }).phone).toBeTruthy();
  });

  it("needs a password that meets every published rule", () => {
    expect(validateSignUp({ ...GOOD_SIGNUP, password: "ngan1" }).password).toBeTruthy();
    expect(validateSignUp({ ...GOOD_SIGNUP, password: "khongcosodauca" }).password).toBeTruthy();
  });

  it("will not create an account without the terms ticked", () => {
    expect(validateSignUp({ ...GOOD_SIGNUP, agreed: false }).agreed).toBeTruthy();
  });

  it("does not require the drop-alert tick — it is an offer, not a condition", () => {
    expect(validateSignUp({ ...GOOD_SIGNUP, wantsDropAlerts: false })).toEqual({});
  });
});

describe("passwordChecks", () => {
  it("publishes exactly the three rules the change-password screen lists", () => {
    expect(passwordChecks("", "").map((c) => c.label)).toEqual([
      `Ít nhất ${PASSWORD_MIN} ký tự`,
      "Có cả chữ và số",
      "Khác mật khẩu cũ",
    ]);
  });

  it("ticks length only once it is long enough", () => {
    expect(passwordChecks("a1234567", "")[0]!.ok).toBe(true);
    expect(passwordChecks("a123456", "")[0]!.ok).toBe(false);
  });

  it("ticks all three once there is an old password to differ from", () => {
    expect(passwordChecks("a1234567", "cu987654").every((c) => c.ok)).toBe(true);
  });

  it("wants both a letter and a digit, not either", () => {
    expect(passwordChecks("chitoancchu", "")[1]!.ok).toBe(false);
    expect(passwordChecks("12345678", "")[1]!.ok).toBe(false);
    expect(passwordChecks("chu12345", "")[1]!.ok).toBe(true);
  });

  it("fails the third rule when the new password repeats the old one", () => {
    expect(passwordChecks("dotnam2026", "dotnam2026")[2]!.ok).toBe(false);
    expect(passwordChecks("dotnam2027", "dotnam2026")[2]!.ok).toBe(true);
  });

  it("treats an empty new password as failing every rule", () => {
    expect(passwordChecks("", "cu123456").some((c) => c.ok)).toBe(false);
  });

  it("does not tick 'khác mật khẩu cũ' before the old one has been typed", () => {
    // Nothing is known yet, so claiming the rule is met would be a green
    // tick the shopper has not earned.
    expect(passwordChecks("moi12345", "")[2]!.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────── addresses
const GOOD_ADDRESS: AddressDraft = {
  recipient: "Trần Minh Anh",
  phone: "0912345678",
  provinceCode: "29",
  wardCode: "70101063",
  line: "24 Nguyễn Thị Minh Khai",
  label: "Nhà",
  isDefault: true,
};

describe("validateAddressForm", () => {
  it("passes a complete draft", () => {
    expect(validateAddressForm(GOOD_ADDRESS)).toEqual({});
  });

  it("needs a recipient the courier can ask for", () => {
    expect(validateAddressForm({ ...GOOD_ADDRESS, recipient: "" }).recipient).toBeTruthy();
  });

  it("needs a dialable phone", () => {
    expect(validateAddressForm({ ...GOOD_ADDRESS, phone: "091" }).phone).toBeTruthy();
  });

  it("rejects a ward that does not belong to the chosen province", () => {
    expect(
      validateAddressForm({ ...GOOD_ADDRESS, provinceCode: "01" }).wardCode,
    ).toBeTruthy();
  });

  it("needs a street line as well as an administrative unit", () => {
    expect(validateAddressForm({ ...GOOD_ADDRESS, line: " " }).line).toBeTruthy();
  });
});
