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
 * "Đơn hàng": an order's own page and the delivery slips; slice 2 moves the
 * overview and the activity log. `/admin` is listed as a path, not as a tree:
 * it matches the overview alone, never the screens below it.
 */
export const ARC_ADMIN_PATHS: readonly string[] = ["/admin", "/admin/orders", "/admin/slips", "/admin/log"];

/**
 * Routes whose every page below them is an Arc screen: `/admin/orders/DH-2430`
 * and any other order code. A tree matches only when something follows its
 * slash, as `FEED_TREES` does in `lib/wait.ts`; the bare path belongs to
 * `ARC_ADMIN_PATHS`.
 */
export const ARC_ADMIN_TREES: readonly string[] = ["/admin/orders/"];

/** True when the Arc frame owns this path. A trailing slash is ignored. */
export function isArcAdminPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return (
    ARC_ADMIN_PATHS.includes(path) ||
    ARC_ADMIN_TREES.some((tree) => path.startsWith(tree) && path.length > tree.length)
  );
}
