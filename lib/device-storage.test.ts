import { describe, expect, it } from "vitest";
import { ADMIN_COLS_KEY } from "@/components/admin/useAdminCols";
import { CART_STORAGE_KEY } from "./cart";
import { RETIRED_KEYS, forgetRetiredKeys } from "./device-storage";
import { GUIDE_HEIGHT_STORAGE_KEY } from "./feed-size-guide";
import { CART_PROMO_STORAGE_KEY } from "./promotions";
import { RECENT_SEARCH_STORAGE_KEY } from "./recent-searches";

/** A `Storage` held in a Map, as the browser's behaves for these calls. */
class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  get length(): number {
    return this.items.size;
  }
  clear(): void {
    this.items.clear();
  }
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  setItem(key: string, value: string): void {
    this.items.set(key, String(value));
  }
  keys(): string[] {
    return [...this.items.keys()].sort();
  }
}

/** The five keys the app still reads, as their modules name them. */
const LIVE = [
  CART_STORAGE_KEY,
  CART_PROMO_STORAGE_KEY,
  RECENT_SEARCH_STORAGE_KEY,
  GUIDE_HEIGHT_STORAGE_KEY,
  ADMIN_COLS_KEY,
];

describe("forgetRetiredKeys", () => {
  it("removes every retired key", () => {
    const s = new MemoryStorage();
    for (const key of RETIRED_KEYS) s.setItem(key, '{"v":1}');
    forgetRetiredKeys(() => s);
    expect(s.length).toBe(0);
  });

  it("names exactly the ten retired keys", () => {
    expect([...RETIRED_KEYS].sort()).toEqual(
      [
        "brand.addresses",
        "brand.adminSim",
        "brand.lastOrder",
        "brand.later",
        "brand.notif.read",
        "brand.orders",
        "brand.prefs",
        "brand.reminder",
        "brand.session",
        "brand.wishlist",
      ].sort(),
    );
  });

  it("leaves the five keys the app still reads exactly as they were", () => {
    expect([...LIVE].sort()).toEqual(
      ["brand.adminCols", "brand.cart", "brand.height", "brand.promo", "brand.searches"].sort(),
    );
    const s = new MemoryStorage();
    for (const key of LIVE) s.setItem(key, `kept:${key}`);
    for (const key of RETIRED_KEYS) s.setItem(key, "gone");
    s.setItem("another.site", "theirs");
    forgetRetiredKeys(() => s);
    expect(s.keys()).toEqual([...LIVE, "another.site"].sort());
    for (const key of LIVE) expect(s.getItem(key)).toBe(`kept:${key}`);
    expect(s.getItem("another.site")).toBe("theirs");
  });

  it("does nothing, and throws nothing, on a device that kept none of them", () => {
    const s = new MemoryStorage();
    s.setItem(CART_STORAGE_KEY, "x");
    expect(() => forgetRetiredKeys(() => s)).not.toThrow();
    expect(s.keys()).toEqual([CART_STORAGE_KEY]);
  });

  it("does not break when the browser refuses the storage itself", () => {
    // A blocked storage throws on `window.localStorage`, before any method.
    const refused = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    expect(() => forgetRetiredKeys(refused)).not.toThrow();
  });

  it("does not break when a removal throws, and still tries every key", () => {
    const tried: string[] = [];
    const failing = {
      removeItem(key: string) {
        tried.push(key);
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    };
    expect(() => forgetRetiredKeys(() => failing)).not.toThrow();
    expect(tried).toEqual([...RETIRED_KEYS]);
  });
});
