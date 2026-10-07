import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Đổi mật khẩu" for an account made with Google (slice B16): it has no
 * password, so `changePassword` answers with one sentence above the fields —
 * before a token is spent, a password is tried or anything is changed — and
 * never throws. An account with a password is untouched by the new check.
 */

let session: { userId: string; email: string; role: "customer"; oauthOnly: boolean } | null = null;
vi.mock("@/lib/db/session", () => ({ getSession: async () => session }));

let locale: "vi" | "en" = "vi";
vi.mock("@/lib/locale", () => ({ getActionLocale: async () => locale }));

const takeRate = vi.fn(async (_bucket: string) => ({ ok: true as const }));
vi.mock("@/lib/db/rate-limit", () => ({ takeRate: (bucket: string) => takeRate(bucket) }));

const updateUser = vi.fn(async (_: { password: string }) => ({ error: null }));
vi.mock("@/lib/db/server", () => ({
  getSupabase: async () => ({ auth: { updateUser } }),
  supabaseEnv: () => ({ url: "http://127.0.0.1:54321", publishableKey: "pk" }),
}));

const probe = vi.fn(async () => ({ error: null }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { signInWithPassword: probe } }) }));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));

const { changePassword } = await import("./auth");

const change = () => {
  const f = new FormData();
  f.set("current", "anything1");
  f.set("next", "abcdefgh");
  f.set("again", "abcdefgh");
  return changePassword({ errors: {} }, f);
};

beforeEach(() => {
  locale = "vi";
  session = { userId: "00000000-0000-0000-0000-0000000000b1", email: "nguoi.that@gmail.com", role: "customer", oauthOnly: true };
  takeRate.mockClear();
  updateUser.mockClear();
  probe.mockClear();
});

describe("changePassword and an account made with Google", () => {
  it("answers that there is no password to change, above the fields, asking nobody anything", async () => {
    expect(await change()).toEqual({
      errors: { form: "Tài khoản này đăng nhập bằng Google nên không có mật khẩu để đổi." },
    });
    expect(takeRate).not.toHaveBeenCalled();
    expect(probe).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("says it in English on an English page", async () => {
    locale = "en";
    expect(await change()).toEqual({
      errors: { form: "This account signs in with Google, so it has no password to change." },
    });
  });

  it("lets an account with a password through to the usual checks", async () => {
    session = { ...session!, oauthOnly: false };
    expect(await change()).toEqual({ errors: {}, ok: true });
    expect(takeRate).toHaveBeenCalledWith("password");
    expect(probe).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith({ password: "abcdefgh" });
  });
});
