import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Tiếp tục với Google" (slice B16) as the Server Action builds it, without an
 * auth server: the provider, the `redirectTo` it asks Supabase to come back
 * to (the visitor's own origin, the callback's path, `next` encoded and
 * checked), the `sign_in` rate limit before anything else is started, and the
 * redirect to the address Supabase's client built. Its words in both
 * languages.
 */

let locale: "vi" | "en" = "vi";
vi.mock("@/lib/locale", () => ({ getActionLocale: async () => locale }));

let requestHeaders = new Headers();
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));

vi.mock("@/lib/db/session", () => ({ getSession: async () => null }));

type Pace = { ok: true } | { ok: false; retryAfterSeconds: number; message: string };
let pace: Pace = { ok: true };
const takeRate = vi.fn(async (_bucket: string, _cost?: number, _locale?: string) => pace);
vi.mock("@/lib/db/rate-limit", () => ({
  takeRate: (bucket: string, cost?: number, l?: string) => takeRate(bucket, cost, l),
}));

const AUTHORIZE =
  "http://127.0.0.1:54321/auth/v1/authorize?provider=google&redirect_to=x&code_challenge=c&code_challenge_method=s256";
let oauthAnswer: { data: { provider: string; url: string | null }; error: null | { message: string } } = {
  data: { provider: "google", url: AUTHORIZE },
  error: null,
};
const signInWithOAuth = vi.fn(async (_: { provider: string; options: { redirectTo: string } }) => oauthAnswer);
vi.mock("@/lib/db/server", () => ({
  getSupabase: async () => ({ auth: { signInWithOAuth } }),
  supabaseEnv: () => ({ url: "http://127.0.0.1:54321", publishableKey: "pk" }),
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

const { googleSignIn } = await import("./auth");

const form = (next?: string) => {
  const f = new FormData();
  if (next !== undefined) f.set("next", next);
  return f;
};
const press = (next?: string) => googleSignIn({ errors: {} }, form(next));

beforeEach(() => {
  locale = "vi";
  requestHeaders = new Headers({ host: "localhost:3200", "x-forwarded-host": "localhost:3200", "x-forwarded-proto": "http" });
  pace = { ok: true };
  oauthAnswer = { data: { provider: "google", url: AUTHORIZE }, error: null };
  takeRate.mockClear();
  signInWithOAuth.mockClear();
});

describe("googleSignIn: the round trip it starts", () => {
  it("asks for Google, back to this origin's /auth/callback with next encoded, and goes where Supabase's client says", async () => {
    await expect(press("/account/orders?phase=active")).rejects.toMatchObject({ to: AUTHORIZE });
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3200/auth/callback?next=%2Faccount%2Forders%3Fphase%3Dactive" },
    });
  });

  it("comes back to the origin the visitor is on: 127.0.0.1, or a Vercel preview over https", async () => {
    requestHeaders = new Headers({ "x-forwarded-host": "127.0.0.1:3200", "x-forwarded-proto": "http" });
    await expect(press("/checkout")).rejects.toBeInstanceOf(Redirected);
    expect(signInWithOAuth.mock.calls[0]![0].options.redirectTo).toBe("http://127.0.0.1:3200/auth/callback?next=%2Fcheckout");

    requestHeaders = new Headers({ "x-forwarded-host": "hive-git-b16-team.vercel.app", "x-forwarded-proto": "https" });
    await expect(press("/checkout")).rejects.toBeInstanceOf(Redirected);
    expect(signInWithOAuth.mock.calls[1]![0].options.redirectTo).toBe(
      "https://hive-git-b16-team.vercel.app/auth/callback?next=%2Fcheckout",
    );
  });

  it("carries only a path of this app as next — Tôi when the form says nothing or anything else", async () => {
    for (const next of [undefined, "", "https://evil.example", "//evil.example", `/${String.fromCharCode(92)}evil.example`]) {
      signInWithOAuth.mockClear();
      await expect(press(next)).rejects.toBeInstanceOf(Redirected);
      expect(signInWithOAuth.mock.calls[0]![0].options.redirectTo, String(next)).toBe(
        "http://localhost:3200/auth/callback?next=%2Faccount",
      );
    }
  });

  it("spends one sign_in token, in the request's language, before starting anything", async () => {
    await expect(press("/account")).rejects.toBeInstanceOf(Redirected);
    expect(takeRate).toHaveBeenCalledTimes(1);
    expect(takeRate).toHaveBeenCalledWith("sign_in", 1, "vi");

    pace = { ok: false, retryAfterSeconds: 120, message: "Quá nhiều lượt liên tiếp. Thử lại sau 2 phút." };
    expect(await press("/account")).toEqual({ errors: { form: "Quá nhiều lượt liên tiếp. Thử lại sau 2 phút." } });
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
  });
});

describe("googleSignIn: what it says when it cannot start", () => {
  it("refuses a request whose host it cannot put in a URL, spending nothing", async () => {
    requestHeaders = new Headers({ "x-forwarded-host": "evil.example/x", "x-forwarded-proto": "https" });
    expect(await press("/account")).toEqual({ errors: { form: "Chưa đăng nhập được bằng Google." } });
    expect(takeRate).not.toHaveBeenCalled();
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("says so when Supabase's client would not build the address", async () => {
    oauthAnswer = { data: { provider: "google", url: null }, error: { message: "boom" } };
    expect(await press("/account")).toEqual({ errors: { form: "Chưa đăng nhập được bằng Google." } });
  });

  it("says it in English on an English page, and spends the token in English too", async () => {
    locale = "en";
    oauthAnswer = { data: { provider: "google", url: null }, error: { message: "boom" } };
    expect(await press("/account")).toEqual({ errors: { form: "Couldn't sign in with Google." } });
    expect(takeRate).toHaveBeenCalledWith("sign_in", 1, "en");
  });
});
