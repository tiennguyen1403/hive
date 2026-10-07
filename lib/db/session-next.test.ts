import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATH_HEADER } from "@/lib/request-path";

/**
 * The sign-in detour of `requireSession` and `requireAdmin` (slice B16): the
 * path it carries to `/sign-in?next=…` — the caller's own, or the proxy's
 * `x-pathname` — goes through the one rule every redirect follows
 * (`safeNext`), so a hostile value comes out as the fallback, and a page of
 * the app's own as itself.
 */

vi.mock("server-only", () => ({}));

let asked: string | null = null;
vi.mock("next/headers", () => ({
  headers: async () => new Headers(asked === null ? {} : { [PATH_HEADER]: asked }),
}));

// Nobody is signed in: `getClaims()` has no session to verify.
vi.mock("./server", () => ({
  getSupabase: async () => ({ auth: { getClaims: async () => ({ data: null, error: { message: "Auth session missing!" } }) } }),
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
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { requireAdmin, requireSession } = await import("./session");

/** A backslash, spelled without an escape so no editor or shell can eat it. */
const BS = String.fromCharCode(92);

beforeEach(() => {
  asked = null;
});

describe("requireSession and requireAdmin carry only a path of the app's own to sign in", () => {
  for (const hostile of [`/${BS}evil.example`, "/\t/evil.example", "/..//evil.example", "//evil.example"]) {
    it(`fall back for ${JSON.stringify(hostile)}, from the header or from the caller`, async () => {
      asked = hostile;
      await expect(requireSession()).rejects.toMatchObject({ to: "/sign-in?next=%2Faccount" });
      await expect(requireAdmin()).rejects.toMatchObject({ to: "/sign-in?next=%2Fadmin" });
      asked = null;
      await expect(requireSession(hostile)).rejects.toMatchObject({ to: "/sign-in?next=%2Faccount" });
      await expect(requireAdmin(hostile)).rejects.toMatchObject({ to: "/sign-in?next=%2Fadmin" });
    });
  }

  it("carry the page that was asked for, as before", async () => {
    asked = "/account/orders?phase=active";
    await expect(requireSession()).rejects.toMatchObject({ to: "/sign-in?next=%2Faccount%2Forders%3Fphase%3Dactive" });
    await expect(requireAdmin("/admin/orders/DH-2430")).rejects.toMatchObject({ to: "/sign-in?next=%2Fadmin%2Forders%2FDH-2430" });
    asked = null;
    await expect(requireSession()).rejects.toMatchObject({ to: "/sign-in?next=%2Faccount" });
  });
});
