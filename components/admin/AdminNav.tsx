"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icon/Icon";
import { LEX } from "@/lib/lexicon";
import { SimBar } from "./SimBar";

/**
 * The admin sidebar — black cloth, honey thread, 208px.
 *
 * The one large dark area in the back office and one of only five in the
 * whole v3 world (the issue cover, the next-issue teaser, the nav's issue
 * stamp, this, and the bulk bar). It is the material of the ISSUE, not a
 * theme: everything to the right of it is light ground with ink on it.
 *
 * A client component only because it has to know which route is open.
 * Everything it counts comes from the server (slice B3a): the admin layout
 * reads the order book and the log and hands down the three facts the rail
 * prints — who is signed in, how many orders wait on the shop, when the
 * sample was last put back.
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

export function AdminNav({
  me,
  waiting,
  lastResetAt,
}: {
  /** Who is signed in — the manager's name and email. */
  me: { name: string; email: string };
  /**
   * How many orders are waiting on the shop, counted on the server the same
   * way the overview's queue counts them — through `effectiveOrder`, so an
   * unpaid transfer past its deadline has already dropped out. Every admin
   * action revalidates the layout, so the number moves with the queue.
   *
   * Nothing else in the sidebar carries a count: a number beside "Mẫu" or
   * "Khách hàng" would be a total, and a total is not something anybody has
   * to do.
   */
  waiting: number;
  lastResetAt: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="side">
      <span className="wm">HIVE</span>
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
      <SimBar me={me} lastResetAt={lastResetAt} />
    </aside>
  );
}
