import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getActionLocale()` without a request, where `next/navigation` has been
 * replaced by a test (round v6 slice E3a): `lib/actions/auth.test.ts` mocks it
 * with `redirect` alone, so an action that reads its language there must
 * answer in Vietnamese without ever asking `unstable_rethrow`. Any other
 * error still goes through `unstable_rethrow` first; the signal Next throws
 * while prerendering is `lib/locale.test.ts`'s, where the module is Next's own.
 *
 * `next/headers` is Next's own too, with `cookies` routed: to the real one
 * (which throws "`cookies` was called outside a request scope" here), or to a
 * stand-in that throws what the test hands it.
 */

let thrown: unknown = null;
vi.mock("next/headers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/headers")>();
  return {
    ...actual,
    cookies: () => {
      if (thrown !== null) throw thrown;
      return actual.cookies();
    },
  };
});

const rethrow = vi.fn((_error: unknown) => undefined);
let withRethrow = false;
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("NEXT_REDIRECT");
  },
  get unstable_rethrow() {
    if (!withRethrow) throw new Error('[test] No "unstable_rethrow" export is defined on the "next/navigation" mock');
    return rethrow;
  },
}));

const { getActionLocale } = await import("./locale");

beforeEach(() => {
  thrown = null;
  withRethrow = false;
  rethrow.mockClear();
});

describe("getActionLocale outside a request", () => {
  it("answers Vietnamese without asking unstable_rethrow, as auth.test.ts needs", async () => {
    expect(await getActionLocale()).toBe("vi");
  });

  it("knows the missing request by Next's code, or by its words", async () => {
    const coded = new Error("something else entirely");
    Object.defineProperty(coded, "__NEXT_ERROR_CODE", { value: "E251", enumerable: false });
    thrown = coded;
    expect(await getActionLocale()).toBe("vi");
    thrown = new Error("`cookies` was called outside a request scope. Read more: …");
    expect(await getActionLocale()).toBe("vi");
  });

  it("still hands every other error to unstable_rethrow first", async () => {
    withRethrow = true;
    const other = new Error("connection reset");
    thrown = other;
    expect(await getActionLocale()).toBe("vi");
    expect(rethrow).toHaveBeenCalledWith(other);
    rethrow.mockImplementationOnce((error: unknown) => {
      throw error;
    });
    await expect(getActionLocale()).rejects.toBe(other);
  });
});
