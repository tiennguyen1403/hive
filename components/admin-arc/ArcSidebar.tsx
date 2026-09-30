"use client";

import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  RotateCcw,
  ScrollText,
  Shirt,
  ShoppingBag,
  TicketPercent,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FeedLogo } from "@/components/feed/FeedLogo";
import { signOut } from "@/lib/actions/auth";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { LEX } from "@/lib/lexicon";
import { Badge } from "@/registry/components/badge/badge";
import { Button } from "@/registry/components/button/button";
import { ArcResetDialog } from "./ArcResetDialog";
import styles from "./ArcSidebar.module.css";

/**
 * The seven places of the back office: the same order, labels and addresses
 * as `LINKS` in the v3 sidebar (`components/admin/AdminNav.tsx`), each with a
 * Lucide icon. The label of the issues is the lexicon's (`LEX.adm`), and the
 * address stays English, as in v3.
 */
const LINKS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/drops", label: LEX.adm, icon: CalendarDays },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingBag },
  { href: "/admin/products", label: "Mẫu", icon: Shirt },
  { href: "/admin/customers", label: "Khách hàng", icon: Users },
  { href: "/admin/promotions", label: "Mã giảm giá", icon: TicketPercent },
  { href: "/admin/log", label: "Nhật ký", icon: ScrollText },
];

/**
 * `AdminNav`'s rule: `/admin` matches only itself, every other entry also owns
 * its children, so an order's page keeps "Đơn hàng" lit.
 */
function isOpen(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/**
 * The Arc back office's sidebar (round v5 slice 0), in place of the v3
 * `AdminNav` and `SimBar` on the screens that moved to Arc.
 *
 * Everything it prints comes from the server, through the admin layout, as
 * in v3: who is signed in, how many orders wait on the shop (the same count
 * as the overview's queue), and when the sample was last put back. The foot
 * says what the back office is in SimBar's own words; "Đặt lại dữ liệu mẫu"
 * always works, so it is always there.
 */
export function ArcSidebar({
  me,
  waiting,
  lastResetAt,
}: {
  me: { name: string; email: string };
  waiting: number;
  lastResetAt: string | null;
}) {
  const pathname = usePathname();
  const [asking, setAsking] = useState(false);

  return (
    <aside className={styles.side}>
      {/* v3 does not make the name a link, and neither does this. */}
      <div className={styles.brand} role="img" aria-label="HIVE">
        <FeedLogo tone="light" className={styles.logo} />
      </div>

      <nav className={styles.nav} aria-label="Khu quản trị">
        {LINKS.map(({ href, label, icon: LinkIcon }) => {
          const on = isOpen(pathname, href);
          const count = href === "/admin/orders" ? waiting : 0;
          return (
            <Link
              key={href}
              href={href}
              className={styles.link}
              aria-current={on ? "page" : undefined}
            >
              <LinkIcon size={16} strokeWidth={1.75} aria-hidden="true" />
              {label}
              {count > 0 && (
                <Badge
                  size="sm"
                  tone="neutral"
                  className={styles.count}
                  aria-label={`${count} đơn cần xử lý`}
                >
                  {count}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={styles.foot}>
        <Badge>Dữ liệu mẫu</Badge>
        <p>
          Đồng hồ thật · dữ liệu mẫu{" "}
          {lastResetAt ? (
            <>
              đặt lại lần cuối{" "}
              <strong>
                {clockLabel(lastResetAt)} · {dayMonth(lastResetAt)}
              </strong>
            </>
          ) : (
            "chưa đặt lại"
          )}
          .
        </p>
        <Button variant="ghost" size="sm" className={styles.edge} onClick={() => setAsking(true)}>
          <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
          Đặt lại dữ liệu mẫu
        </Button>
        <p>
          <strong>{me.name}</strong> · {me.email}
        </p>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit" className={styles.edge}>
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            Đăng xuất
          </Button>
        </form>
      </div>

      <ArcResetDialog open={asking} onOpenChange={setAsking} />
    </aside>
  );
}
