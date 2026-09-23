import { describe, expect, it } from "vitest";
import {
  GUEST_ORDERS_MAX,
  keyFor,
  parseGuestOrders,
  rememberGuestOrder,
  serializeGuestOrders,
  type GuestOrder,
} from "./guest-orders";

const KEY_A = "0f8b6c2e-3a41-4d7e-9b10-2c5d8e7f6a01";
const KEY_B = "5c1d9e0a-7b62-4f38-8e24-6a9b0c1d2e03";

const a: GuestOrder = { code: "DH-2432", key: KEY_A };
const b: GuestOrder = { code: "DH-2433", key: KEY_B };

describe("the guest_orders cookie, written and read back", () => {
  it("round-trips a list, newest first", () => {
    const raw = serializeGuestOrders([b, a]);
    expect(raw).toBe(`DH-2433:${KEY_B}~DH-2432:${KEY_A}`);
    expect(parseGuestOrders(raw)).toEqual([b, a]);
  });

  it("reads nothing as nothing", () => {
    expect(parseGuestOrders(undefined)).toEqual([]);
    expect(parseGuestOrders(null)).toEqual([]);
    expect(parseGuestOrders("")).toEqual([]);
  });

  it("drops an entry that is not a code and a uuid, and keeps the rest", () => {
    // A cookie is input: the browser, an extension or a curl can write it.
    const raw = [
      `DH-2432:${KEY_A}`,
      "DH-2433:not-a-uuid",
      `2434:${KEY_B}`,
      `DH-2435${KEY_B}`,
      `DH-2436:${KEY_B}`,
    ].join("~");
    expect(parseGuestOrders(raw)).toEqual([a, { code: "DH-2436", key: KEY_B }]);
  });

  it("reads a key written in upper case as the same key", () => {
    expect(parseGuestOrders(`DH-2432:${KEY_A.toUpperCase()}`)).toEqual([a]);
  });

  it("keeps the first (newest) key when a code appears twice", () => {
    expect(parseGuestOrders(`DH-2432:${KEY_A}~DH-2432:${KEY_B}`)).toEqual([a]);
  });

  it("never returns more than the cap, however long the cookie is", () => {
    const many = Array.from({ length: 25 }, (_, i) => `DH-${3000 + i}:${KEY_A}`).join("~");
    expect(parseGuestOrders(many)).toHaveLength(GUEST_ORDERS_MAX);
  });
});

describe("rememberGuestOrder", () => {
  it("puts the new receipt at the front", () => {
    expect(rememberGuestOrder([a], b)).toEqual([b, a]);
  });

  it("does not keep the same order twice", () => {
    const fresh = { code: "DH-2432", key: KEY_B };
    expect(rememberGuestOrder([a, b], fresh)).toEqual([fresh, b]);
  });

  it("lets the oldest go once the list is full", () => {
    const full = Array.from({ length: GUEST_ORDERS_MAX }, (_, i) => ({
      code: `DH-${3000 + i}`,
      key: KEY_A,
    }));
    const next = rememberGuestOrder(full, a);
    expect(next).toHaveLength(GUEST_ORDERS_MAX);
    expect(next[0]).toEqual(a);
    expect(next.map((o) => o.code)).not.toContain(`DH-${3000 + GUEST_ORDERS_MAX - 1}`);
  });
});

describe("keyFor", () => {
  it("finds the key this browser holds for a code", () => {
    expect(keyFor([b, a], "DH-2432")).toBe(KEY_A);
  });

  it("answers null for a code it holds nothing for", () => {
    expect(keyFor([a], "DH-2210")).toBeNull();
    expect(keyFor([], "DH-2432")).toBeNull();
  });
});
