import { beforeEach, describe, expect, it, vi } from "vitest";
import { DynamicServerError } from "next/dist/client/components/hooks-server-context";

/**
 * The language of a request (round v6): `getLocale()` for pages, layouts and
 * `generateMetadata`, `getActionLocale()` for the Server Actions' sentences
 * (slice E2).
 *
 * `next/headers` is Next's own, with `cookies` routed: to a jar this file
 * fills, to something that throws, or to the real one — which, outside a
 * request, throws "`cookies` was called outside a request scope", as it does
 * when a test calls an action as a plain function.
 */

type Jar = { get: (name: string) => { value: string } | undefined };
let real = false;
let cookiesOf: () => Promise<Jar> = async () => ({ get: () => undefined });

vi.mock("next/headers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/headers")>();
  return { ...actual, cookies: () => (real ? actual.cookies() : cookiesOf()) };
});

const { getActionLocale, getLocale } = await import("./locale");

const jar = (value: string | undefined): (() => Promise<Jar>) => async () => ({
  get: (name) => (name === "hive-lang" && value !== undefined ? { value } : undefined),
});

beforeEach(() => {
  real = false;
  cookiesOf = jar(undefined);
});

describe("in a request", () => {
  it("reads the hive-lang cookie, Vietnamese without one or with anything else", async () => {
    cookiesOf = jar("en");
    expect(await getLocale()).toBe("en");
    expect(await getActionLocale()).toBe("en");
    cookiesOf = jar(undefined);
    expect(await getLocale()).toBe("vi");
    expect(await getActionLocale()).toBe("vi");
    cookiesOf = jar("fr");
    expect(await getActionLocale()).toBe("vi");
  });
});

describe("without a request", () => {
  it("lets an action answer in Vietnamese, where a page would fail", async () => {
    real = true;
    expect(await getActionLocale()).toBe("vi");
    await expect(getLocale()).rejects.toThrow(/outside a request scope/);
  });
});

describe("Next's signal that a route reads the request", () => {
  it("is handed back by the action's helper, never swallowed, and is never caught for a page", async () => {
    const signal = new DynamicServerError("Route /checkout couldn't be rendered statically because it used `cookies`");
    cookiesOf = () => {
      throw signal;
    };
    await expect(getActionLocale()).rejects.toBe(signal);
    await expect(getLocale()).rejects.toBe(signal);
  });
});
