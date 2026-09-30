"use client";

import { ToastStack, ToastStackProvider } from "@/registry/components/toast-stack/toast-stack";
import styles from "./ArcAdminFrame.module.css";
import { ArcSidebar } from "./ArcSidebar";

/**
 * The frame of a back-office screen that has moved to Arc (round v5): the
 * Arc zone's root, the sidebar, the page container, and the toast stack in
 * the bottom right corner that `useArcToast()` speaks through.
 *
 * `data-ui="admin"` is the switch for `registry/foundation.css`. The admin
 * layout picks this frame for the paths in `ARC_ADMIN_PATHS` and the v3 frame
 * for every other one (`AdminShell`), so no Arc component ever sits inside
 * `.s.adm3`, whose CSS reaches into it.
 */
export function ArcAdminFrame({
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
  return (
    <div data-ui="admin" className={styles.frame}>
      <ToastStackProvider>
        <ArcSidebar me={me} waiting={waiting} lastResetAt={lastResetAt} />
        <main className={styles.main}>{children}</main>
        <ToastStack position="bottom-right" className={styles.toasts} />
      </ToastStackProvider>
    </div>
  );
}
