import { describe, expect, it } from "vitest";
import { ARC_ADMIN_PATHS, ARC_ADMIN_TREES, isArcAdminPath } from "./admin-arc";

/**
 * Which back-office screens wear the Arc frame (round v5). The list grows one
 * area per slice; every other admin route keeps the v3 frame untouched. Since
 * slice 1 the whole of "Đơn hàng" is Arc: the book, each order, the slips.
 * Since slice 2 the overview and the activity log are too.
 */
describe("isArcAdminPath", () => {
  it("lists the overview, the order book, the slips, the log, and the tree of orders", () => {
    expect(ARC_ADMIN_PATHS).toEqual(["/admin", "/admin/orders", "/admin/slips", "/admin/log"]);
    expect(ARC_ADMIN_TREES).toEqual(["/admin/orders/"]);
  });

  it("matches the overview, with or without a trailing slash", () => {
    expect(isArcAdminPath("/admin")).toBe(true);
    expect(isArcAdminPath("/admin/")).toBe(true);
  });

  it("matches the activity log", () => {
    expect(isArcAdminPath("/admin/log")).toBe(true);
    expect(isArcAdminPath("/admin/log/")).toBe(true);
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
    expect(isArcAdminPath("/adminx")).toBe(false);
    expect(isArcAdminPath("/admin/ordersx")).toBe(false);
    expect(isArcAdminPath("/admin/logs")).toBe(false);
    expect(isArcAdminPath("/admin/log/DH-2430")).toBe(false);
    expect(isArcAdminPath("/admin/slips/DH-2430")).toBe(false);
  });

  it("matches the overview alone, never the screens below it", () => {
    expect(isArcAdminPath("/admin/products")).toBe(false);
    expect(isArcAdminPath("/admin/products/p-khoi")).toBe(false);
    expect(isArcAdminPath("/admin/drops")).toBe(false);
    expect(isArcAdminPath("/admin/drops/05")).toBe(false);
    expect(isArcAdminPath("/admin/promotions")).toBe(false);
  });

  it("does not match the rest of the back office or the shop", () => {
    expect(isArcAdminPath("/admin/customers")).toBe(false);
    expect(isArcAdminPath("/admin/customers/c-minhanh")).toBe(false);
    expect(isArcAdminPath("/")).toBe(false);
    expect(isArcAdminPath("")).toBe(false);
  });
});
