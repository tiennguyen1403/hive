/**
 * Which back-office screens have moved to Arc (round v5, QĐ-37).
 *
 * The admin layout reads this list to pick a frame: a path on it gets the Arc
 * frame (`components/admin-arc/ArcAdminFrame.tsx`), every other admin path
 * keeps the v3 frame exactly as it was. Arc components are never mixed into
 * the `.s.adm3` frame, whose CSS reaches into them (tasks/plan.md, "Luật tích
 * hợp").
 *
 * One area per slice. Slice 0 moved the order book; slice 1 moved the rest of
 * "Đơn hàng": an order's own page and the delivery slips; slice 2 moved the
 * overview and the activity log; slice 3 moved the customers, each customer's
 * page, and the discount codes; slice 4 moved the issues, the table and each
 * issue under it; slice 5a moves the styles table. `/admin` and
 * `/admin/products` are listed as paths, not as trees: the first matches the
 * overview alone, the second the table alone, while the style form below it
 * (`/admin/products/new`, `/admin/products/<id>`) keeps the v3 frame until
 * slice 5b.
 */
export const ARC_ADMIN_PATHS: readonly string[] = [
  "/admin",
  "/admin/orders",
  "/admin/slips",
  "/admin/log",
  "/admin/customers",
  "/admin/promotions",
  "/admin/drops",
  "/admin/products",
];

/**
 * Routes whose every page below them is an Arc screen: `/admin/orders/DH-2430`
 * and any other order code, `/admin/customers/c-minhanh` and any other
 * customer, `/admin/drops/05` (or `/admin/drops/5`) and any other issue. A
 * tree matches only when something follows its slash, as `FEED_TREES` does in
 * `lib/wait.ts`; the bare path belongs to `ARC_ADMIN_PATHS`.
 */
export const ARC_ADMIN_TREES: readonly string[] = ["/admin/orders/", "/admin/customers/", "/admin/drops/"];

/** True when the Arc frame owns this path. A trailing slash is ignored. */
export function isArcAdminPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return (
    ARC_ADMIN_PATHS.includes(path) ||
    ARC_ADMIN_TREES.some((tree) => path.startsWith(tree) && path.length > tree.length)
  );
}
