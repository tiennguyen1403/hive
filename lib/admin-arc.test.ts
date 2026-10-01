import { describe, expect, it } from "vitest";
import { ARC_ADMIN_PATHS, ARC_ADMIN_TREES, isArcAdminPath } from "./admin-arc";

/**
 * Which back-office screens wear the Arc frame (round v5). The list grows one
 * area per slice; every other admin route keeps the v3 frame untouched. Since
 * slice 1 the whole of "Đơn hàng" is Arc: the book, each order, the slips.
 * Since slice 2 the overview and the activity log are too; since slice 3 the
 * customers, each customer's page, and the discount codes; since slice 4 the
 * issues and each issue's page.
 */
describe("isArcAdminPath", () => {
  it("lists the overview, the orders, the slips, the log, the customers, the codes, the issues, and three trees", () => {
    expect(ARC_ADMIN_PATHS).toEqual([
      "/admin",
      "/admin/orders",
      "/admin/slips",
      "/admin/log",
      "/admin/customers",
      "/admin/promotions",
      "/admin/drops",
    ]);
    expect(ARC_ADMIN_TREES).toEqual(["/admin/orders/", "/admin/customers/", "/admin/drops/"]);
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

  it("matches the customers and each customer's page, whatever the key (slice 3)", () => {
    expect(isArcAdminPath("/admin/customers")).toBe(true);
    expect(isArcAdminPath("/admin/customers/")).toBe(true);
    expect(isArcAdminPath("/admin/customers/c-minhanh")).toBe(true);
    expect(isArcAdminPath("/admin/customers/c-minhanh/")).toBe(true);
    // A sign-up has no fixture handle: the back office addresses it by its uuid.
    expect(isArcAdminPath("/admin/customers/7d0c1c52-1b1e-4c55-9c1a-0d8b8e0c9f11")).toBe(true);
  });

  it("matches the discount codes (slice 3)", () => {
    expect(isArcAdminPath("/admin/promotions")).toBe(true);
    expect(isArcAdminPath("/admin/promotions/")).toBe(true);
  });

  it("matches the issues and each issue's page, padded or not (slice 4)", () => {
    expect(isArcAdminPath("/admin/drops")).toBe(true);
    expect(isArcAdminPath("/admin/drops/")).toBe(true);
    expect(isArcAdminPath("/admin/drops/05")).toBe(true);
    expect(isArcAdminPath("/admin/drops/5")).toBe(true);
    expect(isArcAdminPath("/admin/drops/05/")).toBe(true);
  });

  it("does not match a path that only begins like one", () => {
    expect(isArcAdminPath("/adminx")).toBe(false);
    expect(isArcAdminPath("/admin/ordersx")).toBe(false);
    expect(isArcAdminPath("/admin/logs")).toBe(false);
    expect(isArcAdminPath("/admin/log/DH-2430")).toBe(false);
    expect(isArcAdminPath("/admin/slips/DH-2430")).toBe(false);
    expect(isArcAdminPath("/admin/customersx")).toBe(false);
    expect(isArcAdminPath("/admin/promotionsx")).toBe(false);
    expect(isArcAdminPath("/admin/promotions/DOT05")).toBe(false);
    expect(isArcAdminPath("/admin/dropsx")).toBe(false);
    expect(isArcAdminPath("/admin/dropsx/05")).toBe(false);
  });

  it("does not match the screens still on v3: the styles", () => {
    expect(isArcAdminPath("/admin/products")).toBe(false);
    expect(isArcAdminPath("/admin/products/")).toBe(false);
    expect(isArcAdminPath("/admin/products/p-khoi")).toBe(false);
    expect(isArcAdminPath("/admin/products/new")).toBe(false);
  });

  it("does not match the shop", () => {
    expect(isArcAdminPath("/")).toBe(false);
    expect(isArcAdminPath("")).toBe(false);
    expect(isArcAdminPath("/account/orders")).toBe(false);
  });
});
