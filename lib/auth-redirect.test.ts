import { describe, expect, it } from "vitest";
import { AUTH_CALLBACK_PATH, callbackPlan, googleCallbackUrl, googleFailedHref, requestOrigin } from "./auth-redirect";

/**
 * "Tiếp tục với Google" (slice B16): where the round trip leaves from, where it
 * comes back to, and what the callback decides — without a request or an auth
 * server. The Server Action and the Route Handler that use these are tested in
 * `lib/actions/google-sign-in.test.ts` and `app/auth/callback/route.test.ts`;
 * the rule that keeps `next` on the site, `safeNext`, in
 * `lib/actions/safe-next.test.ts`.
 */

describe("requestOrigin: the visitor's origin from the forwarded host and proto", () => {
  const from = (headers: Record<string, string>) => {
    const h = new Headers(headers);
    return requestOrigin((name) => h.get(name));
  };

  it("reads Next's own pair off Vercel, and Vercel's on a preview", () => {
    expect(from({ host: "localhost:3200", "x-forwarded-host": "localhost:3200", "x-forwarded-proto": "http" })).toBe(
      "http://localhost:3200",
    );
    expect(from({ "x-forwarded-host": "127.0.0.1:3200", "x-forwarded-proto": "http" })).toBe("http://127.0.0.1:3200");
    expect(from({ "x-forwarded-host": "hive-git-b16-team.vercel.app", "x-forwarded-proto": "https" })).toBe(
      "https://hive-git-b16-team.vercel.app",
    );
  });

  it("takes the first value of a chain, and the Host header when nothing was forwarded", () => {
    expect(from({ "x-forwarded-host": "hive-neon-three.vercel.app, internal:8080", "x-forwarded-proto": "https, http" })).toBe(
      "https://hive-neon-three.vercel.app",
    );
    expect(from({ host: "localhost:3200", "x-forwarded-proto": "http" })).toBe("http://localhost:3200");
    expect(from({ "x-forwarded-host": "[::1]:3200", "x-forwarded-proto": "HTTP" })).toBe("http://[::1]:3200");
  });

  it("refuses a host that could end the authority early, and any scheme but http and https", () => {
    expect(from({ "x-forwarded-host": "evil.example/x", "x-forwarded-proto": "https" })).toBeNull();
    expect(from({ "x-forwarded-host": "user@evil.example", "x-forwarded-proto": "https" })).toBeNull();
    expect(from({ "x-forwarded-host": "evil.example?x", "x-forwarded-proto": "https" })).toBeNull();
    expect(from({ "x-forwarded-host": "localhost:3200", "x-forwarded-proto": "javascript" })).toBeNull();
    expect(from({ "x-forwarded-host": "localhost:3200" })).toBeNull();
    expect(from({ "x-forwarded-proto": "https" })).toBeNull();
  });
});

describe("the two addresses of the round trip", () => {
  it("sends Supabase back to this origin's callback, next encoded", () => {
    expect(AUTH_CALLBACK_PATH).toBe("/auth/callback");
    expect(googleCallbackUrl("http://localhost:3200", "/account/orders?phase=active")).toBe(
      "http://localhost:3200/auth/callback?next=%2Faccount%2Forders%3Fphase%3Dactive",
    );
  });

  it("comes back to Đăng nhập with next kept and the flag set", () => {
    expect(googleFailedHref("/checkout")).toBe("/sign-in?next=%2Fcheckout&error=google");
    expect(googleFailedHref("")).toBe("/sign-in?error=google");
  });
});

describe("callbackPlan: what /auth/callback does with the address it was sent to", () => {
  const plan = (query: string) => callbackPlan(new URLSearchParams(query));

  it("trades a code and goes where the shopper was headed", () => {
    expect(plan("code=abc&next=%2Faccount%2Forders")).toEqual({
      kind: "exchange",
      code: "abc",
      next: "/account/orders",
      failed: "/sign-in?next=%2Faccount%2Forders&error=google",
    });
  });

  it("goes home after the trade when next is not a path of this app", () => {
    for (const next of ["https%3A%2F%2Fevil.example", "%2F%2Fevil.example", `%2F%5Cevil.example`, "%2F..%2F%2Fevil.example"]) {
      expect(plan(`code=abc&next=${next}`), next).toMatchObject({ kind: "exchange", next: "/" });
    }
    expect(plan("code=abc")).toMatchObject({ kind: "exchange", next: "/" });
  });

  it("sends Google's 'Huỷ' back to Đăng nhập with the flag, next kept — the address Supabase was measured to send", () => {
    expect(
      plan("error=access_denied&error_description=The+user+denied+access&next=%2Faccount%2Forders"),
    ).toEqual({ kind: "fail", failed: "/sign-in?next=%2Faccount%2Forders&error=google" });
  });

  it("does not trade a code that came with an error, nor go anywhere without a code", () => {
    expect(plan("code=abc&error=server_error&next=%2Faccount")).toEqual({
      kind: "fail",
      failed: "/sign-in?next=%2Faccount&error=google",
    });
    expect(plan("next=%2Faccount")).toEqual({ kind: "fail", failed: "/sign-in?next=%2Faccount&error=google" });
    expect(plan("")).toEqual({ kind: "fail", failed: "/sign-in?next=%2F&error=google" });
  });
});
