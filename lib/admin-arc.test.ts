import { describe, expect, it } from "vitest";
import { ARC_ADMIN_PATHS, isArcAdminPath } from "./admin-arc";

/**
 * Which back-office screens wear the Arc frame (round v5). The list grows one
 * screen per slice; every other admin route keeps the v3 frame untouched, so
 * the match is exact — an order's own page is still v3 while the list is Arc.
 */
describe("isArcAdminPath", () => {
  it("lists only the order book in slice 0", () => {
    expect(ARC_ADMIN_PATHS).toEqual(["/admin/orders"]);
  });

  it("matches the order book, with or without a trailing slash", () => {
    expect(isArcAdminPath("/admin/orders")).toBe(true);
    expect(isArcAdminPath("/admin/orders/")).toBe(true);
  });

  it("does not match an order's own page", () => {
    expect(isArcAdminPath("/admin/orders/DH-2430")).toBe(false);
  });

  it("does not match the rest of the back office or the shop", () => {
    expect(isArcAdminPath("/admin")).toBe(false);
    expect(isArcAdminPath("/admin/slips")).toBe(false);
    expect(isArcAdminPath("/")).toBe(false);
    expect(isArcAdminPath("")).toBe(false);
  });
});
