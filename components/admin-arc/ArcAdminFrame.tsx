"use client";

import { ToastStack, ToastStackProvider } from "@/registry/components/toast-stack/toast-stack";
import styles from "./ArcAdminFrame.module.css";
import { ArcSidebar } from "./ArcSidebar";
import { TOAST_LAYER } from "./arc-toasts";

/**
 * The frame of every back-office screen (round v5): the Arc zone's root, the
 * sidebar, the page container, and the toast stack in the bottom right corner
 * that `useArcToast()` speaks through.
 *
 * `data-ui="admin"` is the switch for `registry/foundation.css`. The admin
 * layout draws this frame around every page (since slice 6; until then it
 * chose between this frame and v3's by path).
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
        {/* The toasts' own layer, so a dialog or a drawer can tell a press on a
            toast from one outside it (`keepOpenForToasts`, arc-toasts.ts). It
            draws no box: the stack keeps its fixed place in the corner. */}
        <div {...{ [TOAST_LAYER]: "" }} className={styles.toastLayer}>
          <ToastStack position="bottom-right" className={styles.toasts} />
        </div>
      </ToastStackProvider>
    </div>
  );
}
