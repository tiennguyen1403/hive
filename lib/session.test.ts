import { describe, it, expect } from "vitest";
import {
  findAccount,
  parseSession,
  serializeSession,
  signInResult,
  type Session,
} from "./session";
import { CUSTOMERS } from "@/data/customers";

const ME = CUSTOMERS[0]!; // Trần Minh Anh · minhanh@email.com · 0912 345 678

describe("findAccount", () => {
  it("finds a seeded customer by email", () => {
    expect(findAccount("minhanh@email.com")?.id).toBe(ME.id);
  });

  it("ignores case and stray spaces around the email", () => {
    expect(findAccount("  MinhAnh@Email.com ")?.id).toBe(ME.id);
  });

  it("finds the same customer by phone number", () => {
    expect(findAccount("0912 345 678")?.id).toBe(ME.id);
  });

  it("accepts the phone however it was punctuated", () => {
    // The fixture stores "0912 345 678"; people type it every other way.
    expect(findAccount("0912345678")?.id).toBe(ME.id);
    expect(findAccount("+84912345678")?.id).toBe(ME.id);
  });

  it("returns nothing for someone who is not in the data", () => {
    expect(findAccount("khongco@email.com")).toBeUndefined();
    expect(findAccount("")).toBeUndefined();
  });
});

describe("signInResult", () => {
  it("signs in a known account", () => {
    const r = signInResult("minhanh@email.com", "bat-ky-gi");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.session.customerId).toBe(ME.id);
  });

  it("says which field is wrong, not just that something is", () => {
    // "Có lỗi xảy ra" tells a shopper nothing they can act on.
    const noId = signInResult("", "x");
    expect(noId.ok).toBe(false);
    if (!noId.ok) expect(noId.field).toBe("identifier");

    const noPw = signInResult("minhanh@email.com", "");
    expect(noPw.ok).toBe(false);
    if (!noPw.ok) expect(noPw.field).toBe("password");
  });

  it("points at the identifier when no such account exists", () => {
    const r = signInResult("khongco@email.com", "bat-ky-gi");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("identifier");
  });

  it("never carries the password into the session it returns", () => {
    // There is no password store and no server to check one against. The
    // screen says so. What must NOT happen is a password being written
    // anywhere, so the session shape has nowhere to put it.
    const r = signInResult("minhanh@email.com", "hunter2");
    expect(r.ok).toBe(true);
    if (r.ok) expect(JSON.stringify(r.session)).not.toContain("hunter2");
  });
});

describe("parseSession", () => {
  const session: Session = { customerId: ME.id, since: "2026-09-20T10:00:00+07:00" };

  it("round-trips through storage", () => {
    expect(parseSession(serializeSession(session))).toEqual(session);
  });

  it("returns nobody when nothing is stored", () => {
    expect(parseSession(null)).toBeNull();
  });

  it("returns nobody rather than throwing on a corrupt value", () => {
    expect(parseSession("{nope")).toBeNull();
    expect(parseSession('"a string"')).toBeNull();
  });

  it("discards a session naming a customer who is no longer in the data", () => {
    const raw = JSON.stringify({ v: 1, session: { customerId: "c-khong-co", since: "x" } });
    expect(parseSession(raw)).toBeNull();
  });

  it("discards a payload written by an older schema", () => {
    expect(parseSession(JSON.stringify({ v: 0, session }))).toBeNull();
    expect(parseSession(JSON.stringify(session))).toBeNull();
  });
});
