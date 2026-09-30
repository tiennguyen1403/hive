import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Đổi mật khẩu" and "Đăng xuất" as round v4 slice 3b left them, without a
 * database or an auth server: the mock's three fields and words, the eight
 * characters and nothing more, the demo accounts' lock above the fields, and
 * the sign-out landing on Tôi when the Feed asks for it.
 */

let session: { userId: string; email: string; role: "customer" } | null = null;
vi.mock("@/lib/db/session", () => ({ getSession: async () => session }));

type Pace = { ok: true } | { ok: false; retryAfterSeconds: number; message: string };
let pace: Pace = { ok: true };
const takeRate = vi.fn(async (_bucket: string) => pace);
vi.mock("@/lib/db/rate-limit", () => ({ takeRate: (bucket: string) => takeRate(bucket) }));

const updateUser = vi.fn(async (_: { password: string }) => ({ error: null as null | { message: string } }));
const authSignOut = vi.fn(async () => ({ error: null }));
vi.mock("@/lib/db/server", () => ({
  getSupabase: async () => ({ auth: { updateUser, signOut: authSignOut } }),
  supabaseEnv: () => ({ url: "http://127.0.0.1:54321", publishableKey: "pk" }),
}));

let currentIsRight = true;
const probe = vi.fn(async () => ({ error: currentIsRight ? null : { message: "Invalid login credentials" } }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { signInWithPassword: probe } }) }));

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

const { changePassword, signOut } = await import("./auth");

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const change = (fields: Record<string, string>) => changePassword({ errors: {} }, form(fields));

beforeEach(() => {
  session = { userId: "00000000-0000-0000-0000-000000000009", email: "moi@email.com", role: "customer" };
  pace = { ok: true };
  currentIsRight = true;
  takeRate.mockClear();
  updateUser.mockClear();
  probe.mockClear();
  authSignOut.mockClear();
});

describe("changePassword", () => {
  it("answers in the mock's words, each under its field, before asking anybody anything", async () => {
    const state = await change({ current: "", next: "1234567", again: "" });
    expect(state).toEqual({
      errors: {
        current: "Nhập mật khẩu hiện tại",
        next: "Mật khẩu mới từ 8 ký tự",
        again: "Hai mật khẩu mới chưa khớp",
      },
    });
    expect(takeRate).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("asks eight characters and nothing more: letters alone, or the old password again, will do", async () => {
    expect(await change({ current: "matkhau1", next: "abcdefgh", again: "abcdefgh" })).toEqual({ errors: {}, ok: true });
    expect(updateUser).toHaveBeenLastCalledWith({ password: "abcdefgh" });
    expect(await change({ current: "matkhau1", next: "matkhau1", again: "matkhau1" })).toEqual({ errors: {}, ok: true });
    expect(takeRate).toHaveBeenCalledWith("password");
  });

  it("says a shared demo account's lock above the fields, without trying the password", async () => {
    session = { userId: "00000000-0000-0000-0000-000000000001", email: "minhanh@email.com", role: "customer" };
    const state = await change({ current: "matkhau1", next: "abcdefgh", again: "abcdefgh" });
    expect(state.errors.form).toMatch(/^Tài khoản thử dùng chung/);
    expect(probe).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("says a wrong current password under its field", async () => {
    currentIsRight = false;
    expect(await change({ current: "sai-roi", next: "abcdefgh", again: "abcdefgh" })).toEqual({
      errors: { current: "Mật khẩu hiện tại chưa đúng" },
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("says the rate limit and a server that would not change it above the fields", async () => {
    pace = { ok: false, retryAfterSeconds: 60, message: "Quá nhiều lượt liên tiếp. Thử lại sau 1 phút." };
    expect((await change({ current: "a", next: "abcdefgh", again: "abcdefgh" })).errors).toEqual({
      form: "Quá nhiều lượt liên tiếp. Thử lại sau 1 phút.",
    });
    pace = { ok: true };
    updateUser.mockResolvedValueOnce({ error: { message: "boom" } });
    expect((await change({ current: "a", next: "abcdefgh", again: "abcdefgh" })).errors).toEqual({
      form: "Chưa đổi được mật khẩu. Thử lại sau ít phút.",
    });
  });

  it("sends a visitor with no session to sign in, back to Hồ sơ", async () => {
    session = null;
    await expect(change({ current: "a", next: "abcdefgh", again: "abcdefgh" })).rejects.toMatchObject({
      to: "/sign-in?next=%2Faccount%2Fprofile",
    });
  });
});

describe("signOut", () => {
  it("lands where the Feed's form asks — Tôi — and only on a path of this app", async () => {
    await expect(signOut(form({ next: "/account" }))).rejects.toMatchObject({ to: "/account" });
    await expect(signOut(form({ next: "https://evil.example" }))).rejects.toMatchObject({ to: "/" });
    await expect(signOut(form({ next: "//evil.example" }))).rejects.toMatchObject({ to: "/" });
    expect(authSignOut).toHaveBeenCalledTimes(3);
  });

  it("lands on the home page when the form says nothing (the back office, the v3 rail)", async () => {
    await expect(signOut()).rejects.toMatchObject({ to: "/" });
    await expect(signOut(new FormData())).rejects.toMatchObject({ to: "/" });
  });
});
