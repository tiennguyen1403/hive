import { describe, expect, it } from "vitest";
import { nextParam } from "@/lib/feed-sign-in";
import { safeNext } from "./state";

/**
 * `safeNext`, stricter since slice B16: the open redirect measured on the
 * public demo (`/sign-in?next=%2F%5Cevil.example`, then "Đăng nhập thử",
 * landed on `http://evil.example/`) and everything of its family. Every value
 * below is one a stranger can put in a link; what matters is that a browser
 * handed the answer stays on the site. `state.test.ts` keeps the rule's
 * first cases as they were.
 */

/** A backslash, spelled without an escape so no editor or shell can eat it. */
const BS = String.fromCharCode(92);

/** `?next=` exactly as a page or a Route Handler reads it out of an address: decoded once. */
const fromQuery = (encoded: string) => new URL(`http://127.0.0.1:3200/sign-in?next=${encoded}`).searchParams.get("next");

/** Where a browser goes when handed this `Location` on the shop's own page. */
const followed = (location: string) => new URL(location, "http://127.0.0.1:3200/sign-in").origin;

describe("safeNext refuses what a browser reads as another host", () => {
  it("refuses a backslash, which an http URL takes for a slash — anywhere in the value", () => {
    for (const next of [`/${BS}evil.example`, `/${BS}/evil.example`, `/${BS}${BS}evil.example`, `${BS}${BS}evil.example`, `/a${BS}b`]) {
      expect(safeNext(next), JSON.stringify(next)).toBe("/account");
    }
  });

  it("refuses a tab, a newline, a carriage return or any other control character, which the parser drops", () => {
    for (const next of ["/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "/\r\n/evil.example", "/acc\nount", "/\u0000x", "/x\u007f"]) {
      expect(safeNext(next), JSON.stringify(next)).toBe("/account");
    }
  });

  it("refuses a path that only resolves into a protocol-relative one", () => {
    for (const next of ["/..//evil.example", "/.//evil.example", "/%2e%2e//evil.example", "/account/../..//evil.example"]) {
      expect(safeNext(next), next).toBe("/account");
    }
  });

  it("refuses them as they arrive from the query string, the measured link first", () => {
    for (const encoded of [
      "%2F%5Cevil.example",
      "%2F%5C%2Fevil.example",
      "%2F%09%2Fevil.example",
      "%2F%0A%2Fevil.example",
      "%2F%0D%2Fevil.example",
      "%2F..%2F%2Fevil.example",
      "%2F%2E%2E%2F%2Fevil.example",
      "%2F%2Fevil.example",
      "https%3A%2F%2Fevil.example",
    ]) {
      expect(safeNext(fromQuery(encoded)), encoded).toBe("/account");
      expect(nextParam(fromQuery(encoded) ?? undefined), encoded).toBeUndefined();
    }
  });

  it("answers with something a browser follows on the site, whatever it was given", () => {
    const values = [
      `/${BS}evil.example`,
      "/\t/evil.example",
      "/..//evil.example",
      "/%2e%2e//evil.example",
      "/account/../..//evil.example",
      fromQuery("%2F%255Cevil.example")!,
      "/account/orders?phase=active#top",
    ];
    for (const next of values) expect(followed(safeNext(next)), JSON.stringify(next)).toBe("http://127.0.0.1:3200");
  });
});

describe("safeNext keeps a path of this app's own, as the browser will read it", () => {
  it("keeps a path, its query and its fragment", () => {
    expect(safeNext("/account/orders/DH-2430")).toBe("/account/orders/DH-2430");
    expect(safeNext("/account/orders?phase=active")).toBe("/account/orders?phase=active");
    expect(safeNext("/faq#tai-khoan")).toBe("/faq#tai-khoan");
  });

  it("keeps a backslash that was percent-encoded, which is only a character of the path", () => {
    expect(safeNext(fromQuery("%2F%255Cevil.example"))).toBe("/%5Cevil.example");
  });

  it("hands back the resolved, percent-encoded form — what the redirect gets is what was checked", () => {
    expect(safeNext("/account/./orders")).toBe("/account/orders");
    expect(safeNext("/admin/../account")).toBe("/account");
    expect(safeNext("/search?q=áo thun")).toBe("/search?q=%C3%A1o%20thun");
  });

  it("returns the caller's fallback as given, the empty one of nextParam included", () => {
    expect(safeNext(`/${BS}evil.example`, "")).toBe("");
    expect(safeNext("/..//evil.example", "/admin")).toBe("/admin");
    expect(nextParam("/account/orders?phase=active")).toBe("/account/orders?phase=active");
  });
});
