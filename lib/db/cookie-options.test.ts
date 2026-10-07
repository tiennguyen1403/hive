import { describe, expect, it } from "vitest";
import { sessionCookieOptions } from "./cookie-options";

/**
 * The session cookie's flags (slice B16): HttpOnly always, Secure exactly when
 * the visitor came over https, and no `name` — `@supabase/ssr` would take it
 * for the storage key and every existing session would be lost.
 */
describe("sessionCookieOptions", () => {
  it("is HttpOnly whatever the request", () => {
    for (const proto of ["https", "http", null, undefined, ""]) {
      expect(sessionCookieOptions(proto).httpOnly, String(proto)).toBe(true);
    }
  });

  it("is Secure over https — the deployed demo — and not on a developer's http", () => {
    expect(sessionCookieOptions("https")).toEqual({ httpOnly: true, secure: true });
    expect(sessionCookieOptions("http")).toEqual({ httpOnly: true, secure: false });
    expect(sessionCookieOptions(null)).toEqual({ httpOnly: true, secure: false });
  });

  it("reads the first value of a proxy chain, in any case", () => {
    expect(sessionCookieOptions("https, http").secure).toBe(true);
    expect(sessionCookieOptions(" HTTPS ").secure).toBe(true);
    expect(sessionCookieOptions("http, https").secure).toBe(false);
  });

  it("names no cookie, so the session keeps its storage key", () => {
    expect(Object.keys(sessionCookieOptions("https")).sort()).toEqual(["httpOnly", "secure"]);
  });
});
