import { describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import {
  DEMO_ACCOUNT_PASSWORD_LOCKED,
  DEMO_EMAILS,
  demoPasswordState,
  isDemoEmail,
} from "./demo-accounts";
import { DEMO_ADMIN } from "./demo-admin";

/**
 * The nine shared accounts of the public demo (slice B4b): the eight sample
 * shoppers and the manager. Their password is printed on the sign-in screen,
 * so nobody may change it — `changePassword` asks `isDemoEmail` first.
 */
describe("DEMO_EMAILS", () => {
  it("is the eight shoppers of the fixture and the manager, nine in all, each once", () => {
    expect(DEMO_EMAILS).toHaveLength(9);
    expect(new Set(DEMO_EMAILS).size).toBe(9);
    expect(DEMO_EMAILS).toEqual([...CUSTOMERS.map((c) => c.email), DEMO_ADMIN.email]);
    expect(DEMO_EMAILS).toContain("minhanh@email.com");
    expect(DEMO_EMAILS).toContain("quanly@email.com");
  });
});

describe("isDemoEmail", () => {
  it("knows every one of the nine", () => {
    for (const email of DEMO_EMAILS) expect(isDemoEmail(email), email).toBe(true);
  });

  it("ignores case and the spaces around it — an auth email is compared as Auth stores it", () => {
    expect(isDemoEmail("MinhAnh@Email.com")).toBe(true);
    expect(isDemoEmail("  quanly@email.com ")).toBe(true);
    expect(isDemoEmail("QUANLY@EMAIL.COM")).toBe(true);
  });

  it("says no to anybody else — a real sign-up changes its password as before", () => {
    expect(isDemoEmail("someone@example.com")).toBe(false);
    expect(isDemoEmail("minhanh@email.co")).toBe(false);
    expect(isDemoEmail("xminhanh@email.com")).toBe(false);
  });

  it("says no to an empty address", () => {
    expect(isDemoEmail("")).toBe(false);
    expect(isDemoEmail("   ")).toBe(false);
  });
});

describe("demoPasswordState", () => {
  /**
   * What the daily reset makes of one probe sign-in with the demo password.
   * The shapes are what auth-js answers: `AuthApiError` carries the server's
   * `code` and `status` (measured locally on 24/09: a wrong password is
   * `invalid_credentials`, 400); a request that never got an answer carries
   * no code at all.
   */
  it("says ok when the demo password opened the account", () => {
    expect(demoPasswordState(null)).toBe("ok");
  });

  it("says restore only for invalid_credentials — the password is not the demo one any more", () => {
    const wrongPassword = { code: "invalid_credentials", status: 400 };
    expect(demoPasswordState(wrongPassword)).toBe("restore");
  });

  it("says unknown for every answer that is about something else, and touches nothing", () => {
    for (const error of [
      { code: "over_request_rate_limit", status: 429 },
      { code: "request_timeout", status: 504 },
      { code: "email_not_confirmed", status: 400 },
      { code: "unexpected_failure", status: 500 },
      { status: 0 }, // the network: no answer, no code
      {},
    ]) {
      expect(demoPasswordState(error), JSON.stringify(error)).toBe("unknown");
    }
  });

  it("goes by the code, never by the message", () => {
    expect(demoPasswordState({ message: "Invalid login credentials" } as { code?: string })).toBe(
      "unknown",
    );
  });
});

describe("DEMO_ACCOUNT_PASSWORD_LOCKED", () => {
  it("is the brief's sentence, word for word", () => {
    expect(DEMO_ACCOUNT_PASSWORD_LOCKED).toBe(
      "Tài khoản thử dùng chung nên không đổi được mật khẩu. Tạo tài khoản riêng để thử việc này.",
    );
  });
});
