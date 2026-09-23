"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icon/Icon";
import { ORDERS } from "@/data/orders";
import { needsAction } from "@/lib/admin-metrics";
import { simOrders } from "@/lib/admin-sim";
import { effectiveOrder } from "@/lib/customer-orders";
import { LEX } from "@/lib/lexicon";
import { SimBar } from "./SimBar";
import { useSim } from "./SimContext";
import { demoNow } from "@/lib/clock";

/**
 * The admin sidebar — black cloth, honey thread, 208px.
 *
 * The one large dark area in the back office and one of only five in the
 * whole v3 world (the issue cover, the next-issue teaser, the nav's issue
 * stamp, this, and the bulk bar). It is the material of the ISSUE, not a
 * theme: everything to the right of it is light ground with ink on it.
 *
 * A client component only because it has to know which route is open.
 * Everything else in the area stays on the server.
 */
const LINKS: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/admin", label: "Tổng quan", icon: "chart" },
  // The URL stays English (`/admin/drops`) while the label follows the
  // lexicon — an address is not read by anybody, and renaming it would break
  // every bookmark (`lib/lexicon.ts`).
  { href: "/admin/drops", label: LEX.adm, icon: "calendar" },
  { href: "/admin/orders", label: "Đơn hàng", icon: "bag" },
  { href: "/admin/products", label: "Mẫu", icon: "box" },
  { href: "/admin/customers", label: "Khách hàng", icon: "people" },
  { href: "/admin/promotions", label: "Mã giảm giá", icon: "tag" },
  { href: "/admin/log", label: "Nhật ký", icon: "doc" },
];

/**
 * `/admin` matches only itself; every other entry also owns its children, so
 * `/admin/orders/DH-2429` keeps "Đơn hàng" lit. Without the exact case the
 * overview would be highlighted on every page in the area.
 */
function isOpen(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminNav() {
  const pathname = usePathname();
  const { sim, ready } = useSim();

  /**
   * How many orders are waiting on the shop, counted the same way the
   * overview's queue counts them and read through the same two lenses: what
   * this browser has done (`simOrders`) and what the twelve-hour clock has
   * already decided (`effectiveOrder`). Mark one paid and the number drops
   * here too; let one run past its deadline and it drops as well, because
   * that order is cancelled whether or not anybody wrote it down.
   *
   * Nothing else in the sidebar carries a count: a number beside "Mẫu" or
   * "Khách hàng" would be a total, and a total is not something anybody has
   * to do. Before storage answers this is the fixtures' own figure, which is
   * what the server rendered.
   */
  const now = demoNow();
  const waiting = needsAction(
    (ready ? simOrders(ORDERS, sim) : ORDERS).map((o) => effectiveOrder(o, now)),
  ).length;

  return (
    <aside className="side">
      <span className="wm">BRAND</span>
      <nav aria-label="Khu quản trị">
        {LINKS.map((l) => {
          const on = isOpen(pathname, l.href);
          const count = l.href === "/admin/orders" ? waiting : 0;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={on ? "on" : undefined}
              /* The lit state is carried by weight, ground and a honey icon —
                 none of which reaches a screen reader, so the link says so. */
              aria-current={on ? "page" : undefined}
            >
              <Icon name={l.icon} bulk={on} className="ic sm" />
              {l.label}
              {count > 0 && (
                <span className="cnt" aria-label={`${count} đơn cần xử lý`}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <SimBar />
    </aside>
  );
}
