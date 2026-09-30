import { describe, expect, it } from "vitest";
import { ARC_ADMIN_PATHS, ARC_ADMIN_TREES, isArcAdminPath } from "./admin-arc";

/**
 * Which back-office screens wear the Arc frame (round v5). The list grows one
 * area per slice; every other admin route keeps the v3 frame untouched. Since
 * slice 1 the whole of "Đơn hàng" is Arc: the book, each order, the slips.
 */
describe("isArcAdminPath", () => {
  it("lists the order book and the slips, and the tree of orders", () => {
    expect(ARC_ADMIN_PATHS).toEqual(["/admin/orders", "/admin/slips"]);
    expect(ARC_ADMIN_TREES).toEqual(["/admin/orders/"]);
  });

  it("matches the order book, with or without a trailing slash", () => {
    expect(isArcAdminPath("/admin/orders")).toBe(true);
    expect(isArcAdminPath("/admin/orders/")).toBe(true);
  });

  it("matches an order's own page, whatever its code", () => {
    expect(isArcAdminPath("/admin/orders/DH-2430")).toBe(true);
    expect(isArcAdminPath("/admin/orders/DH-2430/")).toBe(true);
    expect(isArcAdminPath("/admin/orders/DH-9999")).toBe(true);
  });

  it("matches the delivery slips", () => {
    expect(isArcAdminPath("/admin/slips")).toBe(true);
    expect(isArcAdminPath("/admin/slips/")).toBe(true);
  });

  it("does not match a path that only begins like one", () => {
    expect(isArcAdminPath("/admin/ordersx")).toBe(false);
    expect(isArcAdminPath("/admin/slips/DH-2430")).toBe(false);
  });

  it("does not match the rest of the back office or the shop", () => {
    expect(isArcAdminPath("/admin")).toBe(false);
    expect(isArcAdminPath("/admin/customers")).toBe(false);
    expect(isArcAdminPath("/admin/customers/c-minhanh")).toBe(false);
    expect(isArcAdminPath("/")).toBe(false);
    expect(isArcAdminPath("")).toBe(false);
  });
});
