import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `/auth/callback` (slice B16) without an auth server: a code that trades
 * goes to `next`; `next` that is not a path of this app goes home; Google's
 * "Huỷ", a missing code and a trade Supabase refuses all go back to "Đăng
 * nhập" with `?error=google` and `next` kept — and nothing is traded unless
 * there is a code to trade.
 */

let refusal: null | { code?: string; message: string } = null;
const exchangeCodeForSession = vi.fn(async (_code: string) => ({ data: {}, error: refusal }));
vi.mock("@/lib/db/server", () => ({ getSupabase: async () => ({ auth: { exchangeCodeForSession } }) }));

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

const { GET } = await import("./route");

/** What Next hands the handler, as far as it reads it: the parsed address. */
const visit = (query: string) =>
  GET({ nextUrl: new URL(`http://localhost:3200/auth/callback?${query}`) } as unknown as NextRequest);

beforeEach(() => {
  refusal = null;
  exchangeCodeForSession.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("GET /auth/callback", () => {
  it("trades the code and lands where the shopper was headed", async () => {
    await expect(visit("code=pkce-code&next=%2Faccount%2Forders%3Fphase%3Dactive")).rejects.toMatchObject({
      to: "/account/orders?phase=active",
    });
    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
  });

  it("lands on the home page when next is a full URL or only looks like a path", async () => {
    for (const next of ["https%3A%2F%2Fevil.example", "%2F%2Fevil.example", "%2F%5Cevil.example"]) {
      await expect(visit(`code=pkce-code&next=${next}`), next).rejects.toMatchObject({ to: "/" });
    }
  });

  it("goes back to Đăng nhập with the flag after Google's 'Huỷ', trading nothing", async () => {
    await expect(
      visit("error=access_denied&error_description=The+user+denied+access&next=%2Faccount%2Forders"),
    ).rejects.toMatchObject({ to: "/sign-in?next=%2Faccount%2Forders&error=google" });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("goes back to Đăng nhập with the flag when Supabase will not trade the code", async () => {
    refusal = { code: "pkce_code_verifier_not_found", message: "PKCE code verifier not found in storage." };
    await expect(visit("code=pkce-code&next=%2Fcheckout")).rejects.toMatchObject({
      to: "/sign-in?next=%2Fcheckout&error=google",
    });
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it("goes back to Đăng nhập with the flag when there is no code at all", async () => {
    await expect(visit("next=%2Faccount")).rejects.toMatchObject({ to: "/sign-in?next=%2Faccount&error=google" });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
