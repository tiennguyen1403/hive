import { describe, expect, it } from "vitest";
import { IDLE, safeNext } from "./state";

/**
 * `?next=` is a value a stranger can put in a link, so the only interesting
 * question about it is what it refuses.
 */
describe("safeNext", () => {
  it("keeps a path of this app's own", () => {
    expect(safeNext("/account/addresses")).toBe("/account/addresses");
    expect(safeNext("/account/orders?tab=waiting")).toBe("/account/orders?tab=waiting");
  });

  it("refuses an absolute URL — that is an open redirect", () => {
    expect(safeNext("https://evil.example/phish")).toBe("/account");
    expect(safeNext("http://evil.example")).toBe("/account");
  });

  it("refuses a protocol-relative URL, which looks like a path and is not", () => {
    expect(safeNext("//evil.example/phish")).toBe("/account");
  });

  it("refuses javascript: and anything else that is not a path", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/account");
    expect(safeNext("account")).toBe("/account");
  });

  it("falls back when there is nothing to fall back from", () => {
    expect(safeNext(undefined)).toBe("/account");
    expect(safeNext(null)).toBe("/account");
    expect(safeNext("")).toBe("/account");
  });

  it("takes the caller's own fallback when it has one", () => {
    expect(safeNext("", "/")).toBe("/");
  });
});

describe("IDLE", () => {
  it("starts with nothing to say and nothing done", () => {
    expect(IDLE).toEqual({ errors: {} });
    expect(IDLE.ok).toBeUndefined();
  });
});
