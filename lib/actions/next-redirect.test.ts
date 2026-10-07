import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Every Server Action that turns a form's `next` into a redirect (slice B16):
 * signing in, the two demo shortcuts, signing up, signing out and Google's
 * round trip, each handed the values of the open redirect measured on the
 * public demo — and each landing on its own fallback, on the site. The
 * sign-in detour (`requireSession`, `requireAdmin`) is in
 * `lib/db/session-next.test.ts`, the callback in `app/auth/callback/route.test.ts`.
 */

vi.mock("@/lib/db/session", () => ({ getSession: async () => null }));
vi.mock("@/lib/locale", () => ({ getActionLocale: async () => "vi" }));
vi.mock("@/lib/db/rate-limit", () => ({ takeRate: async () => ({ ok: true }) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-host": "127.0.0.1:3200", "x-forwarded-proto": "http" }),
}));

const signInWithOAuth = vi.fn(async (_: { provider: string; options: { redirectTo: string } }) => ({
  data: { provider: "google", url: "http://127.0.0.1:54321/auth/v1/authorize?provider=google" },
  error: null,
}));
vi.mock("@/lib/db/server", () => ({
  getSupabase: async () => ({
    auth: {
      signInWithPassword: async () => ({ error: null }),
      signUp: async () => ({ data: { user: { identities: [{ provider: "email" }] }, session: {} }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithOAuth,
    },
  }),
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

const { demoAdminSignIn, demoSignIn, googleSignIn, signIn, signOut, signUp } = await import("./auth");

/** A backslash, spelled without an escape so no editor or shell can eat it. */
const BS = String.fromCharCode(92);

/** The measured link's value, as the page reads it, and its family. */
const HOSTILE = [
  `/${BS}evil.example`,
  `/${BS}/evil.example`,
  "/\t/evil.example",
  "/\n/evil.example",
  "/..//evil.example",
  "/%2e%2e//evil.example",
  "//evil.example",
  "https://evil.example",
];

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

/** Where an action sent the browser. */
async function landing(run: Promise<unknown>): Promise<string> {
  try {
    await run;
  } catch (e) {
    if (e instanceof Redirected) return e.to;
    throw e;
  }
  throw new Error("the action did not redirect");
}

beforeEach(() => {
  process.env.DEMO_PASSWORD = "xemthu-test";
  signInWithOAuth.mockClear();
});

describe("a hostile next lands on the action's own fallback", () => {
  for (const next of HOSTILE) {
    it(`signIn, signUp and demoSignIn go to Tôi for ${JSON.stringify(next)}`, async () => {
      expect(await landing(signIn({ errors: {} }, form({ email: "minhanh@email.com", password: "x", next })))).toBe("/account");
      expect(
        await landing(signUp({ errors: {} }, form({ name: "Người Thử", email: "moi@example.test", password: "12345678", next }))),
      ).toBe("/account");
      expect(await landing(demoSignIn({ errors: {} }, form({ next })))).toBe("/account");
    });

    it(`demoAdminSignIn goes to the back office, signOut home, for ${JSON.stringify(next)}`, async () => {
      expect(await landing(demoAdminSignIn({ errors: {} }, form({ next })))).toBe("/admin");
      expect(await landing(signOut(form({ next })))).toBe("/");
    });

    it(`googleSignIn asks Supabase to come back to Tôi for ${JSON.stringify(next)}`, async () => {
      await landing(googleSignIn({ errors: {} }, form({ next })));
      expect(signInWithOAuth.mock.calls[0]![0].options.redirectTo).toBe("http://127.0.0.1:3200/auth/callback?next=%2Faccount");
    });
  }
});

describe("a path of the app's own still leads where it says", () => {
  it("keeps the path, and the back office keeps its own pages only once the path is resolved", async () => {
    expect(await landing(signIn({ errors: {} }, form({ email: "minhanh@email.com", password: "x", next: "/checkout" })))).toBe(
      "/checkout",
    );
    expect(await landing(demoAdminSignIn({ errors: {} }, form({ next: "/admin/orders/DH-2430" })))).toBe("/admin/orders/DH-2430");
    // Resolved first, "/admin/../account" is Tôi — not a back-office page, so the back office's own home.
    expect(await landing(demoAdminSignIn({ errors: {} }, form({ next: "/admin/../account" })))).toBe("/admin");
    expect(await landing(signOut(form({ next: "/account" })))).toBe("/account");
  });
});
