import { describe, expect, it } from "vitest";
import { cronAuthorized } from "./cron-auth";

/**
 * The header Vercel sends when it invokes a cron job is
 * `Authorization: Bearer <CRON_SECRET>`
 * (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
 * `/api/health` and `/api/reset` both ask this function, and only the exact
 * string counts.
 */
const SECRET = "test-secret";
const GOOD = `Bearer ${SECRET}`;

describe("cronAuthorized", () => {
  it("says no-secret when the variable is unset or empty, whatever the header", () => {
    for (const secret of [undefined, ""]) {
      expect(cronAuthorized(null, secret)).toBe("no-secret");
      expect(cronAuthorized(GOOD, secret)).toBe("no-secret");
      expect(cronAuthorized("Bearer ", secret)).toBe("no-secret");
    }
  });

  it("accepts exactly `Bearer <secret>`", () => {
    expect(cronAuthorized(GOOD, SECRET)).toBe("ok");
  });

  it("refuses a request without the header", () => {
    expect(cronAuthorized(null, SECRET)).toBe("unauthorized");
    expect(cronAuthorized("", SECRET)).toBe("unauthorized");
  });

  it("refuses a secret one character off, including its case", () => {
    expect(cronAuthorized("Bearer test-secreT", SECRET)).toBe("unauthorized");
    expect(cronAuthorized("Bearer Test-secret", SECRET)).toBe("unauthorized");
  });

  it("refuses a header of another length without throwing", () => {
    for (const header of [
      "Bearer test-secre", // a prefix of the secret
      "Bearer test-secret-and-more", // the secret as a prefix
      `${GOOD} `,
      ` ${GOOD}`,
      "Bearer tëst-secret", // same characters counted, one more byte
    ]) {
      expect(() => cronAuthorized(header, SECRET)).not.toThrow();
      expect(cronAuthorized(header, SECRET), header).toBe("unauthorized");
    }
  });

  it("refuses another scheme, a lower-case `bearer` or a bare secret", () => {
    expect(cronAuthorized(`bearer ${SECRET}`, SECRET)).toBe("unauthorized");
    expect(cronAuthorized(`BEARER ${SECRET}`, SECRET)).toBe("unauthorized");
    expect(cronAuthorized(SECRET, SECRET)).toBe("unauthorized");
    expect(cronAuthorized(`Basic ${SECRET}`, SECRET)).toBe("unauthorized");
  });
});
