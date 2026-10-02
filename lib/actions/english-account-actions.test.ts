import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MyState } from "@/data/types";
import type { Locale } from "@/lib/i18n";

/**
 * Round v6 slice E3a: the Server Actions of the account screens answer in the
 * request's language — signing in and up, the demo buttons, the password,
 * Hồ sơ's "Lưu", the address book, the keep writes — and hand it to the rate
 * limit, so its refusal is in that language too. Here the request is English
 * (`getActionLocale`); what the actions answer without a request is their own
 * tests' (Vietnamese: `auth.test.ts`, `profile.test.ts`, `my-state.test.ts`).
 *
 * Replaced: the language of the request, the rate limit, the session, the
 * auth server, the Data Access Layer the actions call, `revalidatePath` and
 * `redirect`.
 */

vi.mock("@/lib/locale", () => ({ getActionLocale: async (): Promise<Locale> => "en" }));

type Pace = { ok: true } | { ok: false; retryAfterSeconds: number; message: string };
let pace: Pace = { ok: true };
const takeRate = vi.fn(async (_bucket: string, _cost?: number, _locale?: Locale): Promise<Pace> => pace);
vi.mock("@/lib/db/rate-limit", () => ({
  takeRate: (bucket: string, cost?: number, locale?: Locale) => takeRate(bucket, cost, locale),
}));

let session: { userId: string; email: string; role: "customer" } | null = null;
vi.mock("@/lib/db/session", () => ({
  getSession: async () => session,
  requireSession: async () => session ?? { userId: "00000000-0000-0000-0000-000000000009", email: "moi@email.com", role: "customer" },
}));

const signInWithPassword = vi.fn(async (_: { email: string; password: string }) => ({ error: null as null | { message: string } }));
const signUp = vi.fn();
const updateUser = vi.fn(async (_: { password: string }) => ({ error: null as null | { message: string } }));
vi.mock("@/lib/db/server", () => ({
  getSupabase: async () => ({ auth: { signInWithPassword, signUp, updateUser, signOut: async () => ({ error: null }) } }),
  supabaseEnv: () => ({ url: "http://127.0.0.1:54321", publishableKey: "pk" }),
}));

let currentIsRight = true;
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { signInWithPassword: async () => ({ error: currentIsRight ? null : { message: "Invalid login credentials" } }) },
  }),
}));

class Redirected extends Error {
  constructor(readonly to: string) {
    super(`NEXT_REDIRECT ${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirected(to);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const updateMyProfile = vi.fn();
vi.mock("@/lib/db/profiles", () => ({
  updateMyProfile: (name: string, phone: string) => updateMyProfile(name, phone),
}));

const book = {
  addAddress: vi.fn(),
  updateAddress: vi.fn(),
  removeAddress: vi.fn(),
  restoreAddress: vi.fn(),
  setDefaultAddress: vi.fn(),
};
vi.mock("@/lib/db/addresses", () => book);

const STATE: MyState = {
  favorites: [],
  reminders: [6],
  sizes: { top: "L", bottom: "M" },
  notify: { order: true, drop: true, wishlist: true, promo: true },
};
const dal = {
  saveFavorite: vi.fn(),
  unsaveFavorite: vi.fn(),
  restoreFavorite: vi.fn(),
  setReminder: vi.fn(),
  setMySize: vi.fn(),
  setNotify: vi.fn(),
};
vi.mock("@/lib/db/my-state", () => dal);

const { changePassword, demoSignIn, signIn, signUp: signUpAction } = await import("./auth");
const { updateProfileAction } = await import("./profile");
const addresses = await import("./addresses");
const keeps = await import("./my-state");

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

const SHOPPER = { userId: "00000000-0000-0000-0000-000000000009", email: "moi@email.com", role: "customer" as const };
const DEMO = { userId: "00000000-0000-0000-0000-000000000001", email: "minhanh@email.com", role: "customer" as const };

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  pace = { ok: true };
  session = SHOPPER;
  currentIsRight = true;
  takeRate.mockClear();
  signInWithPassword.mockReset();
  signInWithPassword.mockResolvedValue({ error: null });
  signUp.mockReset();
  updateUser.mockReset();
  updateUser.mockResolvedValue({ error: null });
  updateMyProfile.mockReset();
  updateMyProfile.mockImplementation(async (name: string, phone: string) => ({ ok: true, value: { name, phone } }));
  for (const fn of Object.values(book)) fn.mockReset();
  for (const fn of Object.values(dal)) {
    fn.mockReset();
    fn.mockResolvedValue({ ok: true, value: STATE });
  }
  logged?.mockRestore();
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
  delete process.env.DEMO_PASSWORD;
});

describe("signing in and up, asked in English", () => {
  it("answers the fields in English before spending anything", async () => {
    expect(await signIn({ errors: {} }, form({ email: "", password: "" }))).toEqual({
      errors: { email: "Enter your email", password: "Enter your password" },
    });
    expect(await signUpAction({ errors: {} }, form({ name: "A", email: "khong-hop-le", password: "1234" }))).toEqual({
      errors: {
        name: "Enter your full name",
        email: "This email isn't valid",
        password: "Passwords need at least 8 characters",
      },
    });
    expect(takeRate).not.toHaveBeenCalled();
  });

  it("refuses a wrong pair in one English line, and hands the language to the rate limit", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    expect(await signIn({ errors: {} }, form({ email: "minhanh@email.com", password: "sai-mat-khau" }))).toEqual({
      errors: { form: "Email or password is incorrect" },
    });
    expect(takeRate).toHaveBeenCalledWith("sign_in", 1, "en");
  });

  it("passes the rate limit's own sentence on", async () => {
    pace = { ok: false, retryAfterSeconds: 200, message: "Too many tries in a row. Try again in 4 minutes." };
    expect(await signIn({ errors: {} }, form({ email: "minhanh@email.com", password: "x" }))).toEqual({
      errors: { form: "Too many tries in a row. Try again in 4 minutes." },
    });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("says in English that a demo button cannot sign in without its password", async () => {
    expect(await demoSignIn({ errors: {} }, form({}))).toEqual({ errors: { form: "Email or password is incorrect" } });
  });

  it("says a taken address under its field, and a sign-up that failed above the form", async () => {
    const fields = { name: "Minh Anh", email: "minhanh@email.com", password: "matkhau-moi-1" };
    signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "user_already_exists", message: "taken" } });
    expect(await signUpAction({ errors: {} }, form(fields))).toEqual({ errors: { email: "This email already has an account" } });
    expect(takeRate).toHaveBeenCalledWith("sign_up", 1, "en");
    signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "unexpected_failure", message: "boom" } });
    expect(await signUpAction({ errors: {} }, form(fields))).toEqual({ errors: { form: "Couldn't sign up with this email." } });
  });
});

describe("changePassword, asked in English", () => {
  const change = (fields: Record<string, string>) => changePassword({ errors: {} }, form(fields));

  it("answers the three fields in English", async () => {
    expect(await change({ current: "", next: "1234567", again: "" })).toEqual({
      errors: {
        current: "Enter your current password",
        next: "The new password needs at least 8 characters",
        again: "The new passwords don't match",
      },
    });
    expect(takeRate).not.toHaveBeenCalled();
  });

  it("says a shared demo account's lock in English, without trying the password", async () => {
    session = DEMO;
    expect(await change({ current: "matkhau1", next: "abcdefgh", again: "abcdefgh" })).toEqual({
      errors: {
        form: "Demo accounts are shared, so their password can't be changed. Sign up for your own account to try this.",
      },
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("says a wrong current password and a refused change in English, the rate limit in the same language", async () => {
    currentIsRight = false;
    expect(await change({ current: "sai", next: "abcdefgh", again: "abcdefgh" })).toEqual({
      errors: { current: "The current password is incorrect" },
    });
    expect(takeRate).toHaveBeenCalledWith("password", 1, "en");
    currentIsRight = true;
    updateUser.mockResolvedValueOnce({ error: { message: "boom" } });
    expect(await change({ current: "a", next: "abcdefgh", again: "abcdefgh" })).toEqual({
      errors: { form: "Couldn't change the password. Try again in a few minutes." },
    });
  });
});

describe("Hồ sơ's save, asked in English", () => {
  const submit = (fields: Record<string, string>) => updateProfileAction({ errors: {} }, form(fields));

  it("says the save, and hands the language to the rate limit", async () => {
    expect(await submit({ name: "Trần Minh Anh", phone: "0912 345 678" })).toEqual({
      errors: {},
      ok: true,
      message: "Profile saved",
      profile: { name: "Trần Minh Anh", phone: "0912345678" },
    });
    expect(takeRate).toHaveBeenCalledWith("account", 1, "en");
  });

  it("answers the fields, a visitor signed out and a failed save in English", async () => {
    expect(await submit({ name: "A", phone: "" })).toEqual({
      errors: { name: "Enter your full name", phone: "Enter a phone number" },
    });
    session = null;
    expect(await submit({ name: "Trần Minh Anh", phone: "0912345678" })).toEqual({
      errors: { form: "Sign in to edit your profile" },
      reason: "SIGNED_OUT",
    });
    session = SHOPPER;
    updateMyProfile.mockResolvedValue({ ok: false, failure: "UNAVAILABLE" });
    expect(await submit({ name: "Trần Minh Anh", phone: "0912345678" })).toEqual({
      errors: { form: "Couldn't save your profile. Try again in a few minutes." },
      reason: "UNAVAILABLE",
    });
  });
});

describe("the address book, asked in English", () => {
  const ADDRESS = {
    id: null,
    label: "Công ty",
    recipient: "Trần Minh Anh",
    phone: "0912 345 678",
    provinceCode: "29",
    wardCode: "70101063",
    street: "24 Nguyễn Thị Minh Khai",
    isDefault: false,
  };

  it("answers the sheet's fields in English, the server's own checks included", async () => {
    expect(await addresses.saveFeedAddress({ ...ADDRESS, recipient: "", phone: "123", street: "" })).toEqual({
      ok: false,
      errors: {
        recipient: "Enter the recipient's name",
        phone: "Phone numbers have 10 digits, starting with 0",
        street: "Enter house number and street",
      },
    });
    expect(await addresses.saveFeedAddress({ ...ADDRESS, provinceCode: "99" })).toEqual({
      ok: false,
      errors: { province: "Choose province / city" },
    });
    expect(await addresses.saveFeedAddress({ ...ADDRESS, wardCode: "1" })).toEqual({
      ok: false,
      errors: { ward: "Choose ward / commune" },
    });
    expect(takeRate).not.toHaveBeenCalled();
  });

  it("stores the label as the book has it, whatever the page's language", async () => {
    book.addAddress.mockResolvedValue("a-1");
    expect(await addresses.saveFeedAddress(ADDRESS)).toEqual({ ok: true, id: "a-1" });
    expect(book.addAddress).toHaveBeenCalledWith(expect.objectContaining({ label: "Công ty", phone: "0912345678" }));
    expect(takeRate).toHaveBeenCalledWith("account", 1, "en");
  });

  it("says each write that did not happen in English", async () => {
    book.addAddress.mockResolvedValue(null);
    expect(await addresses.saveFeedAddress(ADDRESS)).toEqual({ ok: false, message: "Couldn't save the address" });
    book.updateAddress.mockResolvedValue(false);
    expect(await addresses.saveFeedAddress({ ...ADDRESS, id: "0f8e3a52-0000-4000-8000-000000000001" })).toEqual({
      ok: false,
      message: "Couldn't find this address",
    });
    book.removeAddress.mockResolvedValue(false);
    expect(await addresses.removeFeedAddress("0f8e3a52-0000-4000-8000-000000000001")).toEqual({
      ok: false,
      message: "Couldn't delete the address",
    });
    expect(await addresses.restoreFeedAddress("not an id")).toEqual({ ok: false, message: "Couldn't undo" });
    book.setDefaultAddress.mockResolvedValue(false);
    expect(await addresses.makeFeedDefault("0f8e3a52-0000-4000-8000-000000000001")).toEqual({
      ok: false,
      message: "Couldn't set the default",
    });
    for (const call of takeRate.mock.calls) expect(call).toEqual(["account", 1, "en"]);
  });
});

describe("the keep writes, asked in English", () => {
  it("invite a visitor signed out in English, and spend nothing", async () => {
    session = null;
    expect(await keeps.saveFavoriteAction("p-khoi" as never)).toEqual({
      ok: false,
      reason: "SIGNED_OUT",
      message: "Sign in to save styles",
    });
    expect(await keeps.setNotifyAction("promo", false)).toMatchObject({ message: "Sign in to see notifications" });
    expect(takeRate).not.toHaveBeenCalled();
  });

  it("refuse what cannot be kept, and what is gone, in English", async () => {
    expect(await keeps.setMySizeAction("top", "XXL" as never)).toEqual({
      ok: false,
      reason: "INVALID",
      message: "Couldn't save. Reload the page and try again.",
    });
    dal.restoreFavorite.mockResolvedValue({ ok: false, failure: "NOT_FOUND" });
    expect(await keeps.restoreFavoriteAction("p-khoi" as never)).toMatchObject({ message: "Nothing left to undo." });
  });

  it("hand the language to the rate limit, and pass its sentence on", async () => {
    expect(await keeps.setReminderAction(6, true)).toEqual({ ok: true, state: STATE });
    expect(takeRate).toHaveBeenCalledWith("keep", 1, "en");
    pace = { ok: false, retryAfterSeconds: 30, message: "Too many tries in a row. Try again in 1 minute." };
    expect(await keeps.setMySizeAction("top", "L")).toEqual({
      ok: false,
      reason: "RATE_LIMITED",
      message: "Too many tries in a row. Try again in 1 minute.",
    });
  });
});

describe("signing out", () => {
  it("still lands on Tôi, whatever the language", async () => {
    const { signOut } = await import("./auth");
    await expect(signOut(form({ next: "/account" }))).rejects.toMatchObject({ to: "/account" });
  });
});
