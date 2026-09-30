"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { isArcAdminPath } from "@/lib/admin-arc";
import { ArcAdminFrame } from "./ArcAdminFrame";

/**
 * Which frame a back-office screen wears (round v5): the Arc frame for the
 * paths in `ARC_ADMIN_PATHS`, the v3 frame for every other one.
 *
 * The v3 branch is the markup the admin layout rendered before round v5,
 * unchanged, so the screens still on v3 do not move by a pixel. A client
 * component only because it has to know which route is open; the three facts
 * the sidebars print arrive from the server layout.
 */
export function AdminShell({
  me,
  waiting,
  lastResetAt,
  children,
}: {
  me: { name: string; email: string };
  waiting: number;
  lastResetAt: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (isArcAdminPath(pathname)) {
    return (
      <ArcAdminFrame me={me} waiting={waiting} lastResetAt={lastResetAt}>
        {children}
      </ArcAdminFrame>
    );
  }

  return (
    <div className="s adm3">
      <AdminNav me={me} waiting={waiting} lastResetAt={lastResetAt} />
      <main className="main">{children}</main>
    </div>
  );
}
