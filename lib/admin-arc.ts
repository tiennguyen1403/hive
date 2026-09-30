/**
 * Which back-office screens have moved to Arc (round v5, QĐ-37).
 *
 * The admin layout reads this list to pick a frame: a path on it gets the Arc
 * frame (`components/admin-arc/ArcAdminFrame.tsx`), every other admin path
 * keeps the v3 frame exactly as it was. Arc components are never mixed into
 * the `.s.adm3` frame, whose CSS reaches into them (tasks/plan.md, "Luật tích
 * hợp").
 *
 * One screen per slice. Slice 0 moves the order book only; an order's own
 * page (`/admin/orders/DH-2430`) and the slips stay v3, which is why the match
 * is exact rather than a prefix.
 */
export const ARC_ADMIN_PATHS: readonly string[] = ["/admin/orders"];

/** True when the Arc frame owns this path. A trailing slash is ignored. */
export function isArcAdminPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return ARC_ADMIN_PATHS.includes(path);
}
