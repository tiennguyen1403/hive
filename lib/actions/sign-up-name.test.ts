import { beforeEach, describe, expect, it, vi } from "vitest";
import { NAME_LONG_TEXT, NAME_MAX } from "@/lib/my-state";
import { SIGN_SENTENCES, signErrors } from "@/lib/feed-sign-in";
import { reword } from "@/lib/i18n";

/**
 * Slice B19, finding F17: "Tạo tài khoản" refuses a name Hồ sơ could never
 * save — longer than `NAME_MAX` (60) characters — in Hồ sơ's own words, on the
 * form and again in the Server Action, before Supabase Auth is asked anything.
 * Characters are counted as Postgres counts them (code points), as Hồ sơ does.
 */

const takeRate = vi.fn(async (_bucket: string) => ({ ok: true as const }));
vi.mock("@/lib/db/rate-limit", () => ({ takeRate: (bucket: string) => takeRate(bucket) }));

const authSignUp = vi.fn(async (_: unknown) => ({ data: { user: null, session: null }, error: { message: "not asked" } }));
vi.mock("@/lib/db/server", () => ({
  getSupabase: async () => ({ auth: { signUp: authSignUp } }),
  supabaseEnv: () => ({ url: "http://127.0.0.1:54321", publishableKey: "pk" }),
}));
vi.mock("@/lib/db/session", () => ({ getSession: async () => null }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));

const { signUp } = await import("./auth");

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

beforeEach(() => {
  takeRate.mockClear();
  authSignUp.mockClear();
});

const ok = { email: "moi@email.com", password: "abcdefgh" };

describe("signErrors('up'): the name's ceiling", () => {
  it("lets a name of sixty characters through, and says Hồ sơ's sentence for sixty-one", () => {
    expect(NAME_MAX).toBe(60);
    expect(signErrors("up", { ...ok, name: "a".repeat(60) })).toEqual({});
    expect(signErrors("up", { ...ok, name: "a".repeat(61) })).toEqual({ name: "Họ và tên tối đa 60 ký tự" });
    expect(signErrors("up", { ...ok, name: "a".repeat(61) }, "en")).toEqual({
      name: "Full names can have up to 60 characters",
    });
  });

  it("judges the name trimmed, and counts characters, not UTF-16 units", () => {
    expect(signErrors("up", { ...ok, name: `   ${"ễ".repeat(60)}   ` })).toEqual({});
    // Thirty-one characters outside the BMP are sixty-two UTF-16 units, and still thirty-one characters.
    expect(signErrors("up", { ...ok, name: "𝐀".repeat(31) })).toEqual({});
  });

  it("keeps the two-character floor as it was, and asks nothing of the name when signing in", () => {
    expect(signErrors("up", { ...ok, name: "a" })).toEqual({ name: "Nhập họ và tên" });
    expect(signErrors("in", { ...ok, name: "a".repeat(80) })).toEqual({});
  });

  it("is one of the sentences a switch of language rewords", () => {
    expect(SIGN_SENTENCES).toContain(NAME_LONG_TEXT);
    expect(reword("Họ và tên tối đa 60 ký tự", "en", SIGN_SENTENCES)).toBe("Full names can have up to 60 characters");
  });
});

describe("signUp: the action refuses the name before anything is spent or asked", () => {
  it("answers under the name, takes no token and does not call Supabase Auth", async () => {
    const state = await signUp({ errors: {} }, form({ ...ok, name: "Nguyễn ".repeat(10) + "Văn A" }));
    expect(state).toEqual({ errors: { name: "Họ và tên tối đa 60 ký tự" } });
    expect(takeRate).not.toHaveBeenCalled();
    expect(authSignUp).not.toHaveBeenCalled();
  });
});
