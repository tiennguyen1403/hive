import type { Metadata } from "next";
import { AdminToastProvider } from "@/components/admin/AdminToast";
import { AdminShell } from "@/components/admin-arc/AdminShell";
import { needsAction } from "@/lib/admin-metrics";
import { demoNow } from "@/lib/clock";
import { effectiveOrder } from "@/lib/customer-orders";
import { lastReset, listAllOrders } from "@/lib/db/admin";
import { loadMe } from "@/lib/db/profiles";
import { requireAdmin } from "@/lib/db/session";
// Arc's tokens (round v5, QĐ-37), here and not in the root layout. Every rule
// in the file is scoped `:root:has([data-ui="admin"])`, so it acts only while
// an Arc frame is in the page: the v3 screens and the shop, which keep the
// stylesheet after a client navigation, never match it.
import "@/registry/foundation.css";

export const metadata: Metadata = {
  title: { default: "Quản trị", template: "%s · Quản trị · HIVE" },
  // A back office belongs in no search index, and the rule has to sit on the
  // layout so a screen added later cannot forget it.
  robots: { index: false, follow: false },
};

/**
 * The admin shell: a fixed sidebar and the screen beside it.
 *
 * THE FIRST OF THREE CHECKS (slice B3a). `requireAdmin` here sends a visitor
 * to sign in and answers a shopper 404 — but a layout is an optimistic check
 * only: "Due to Partial Rendering, be cautious when doing checks in Layouts as
 * these don't re-render on navigation" (`02-guides/authentication.md`). So
 * every admin page asks again, every admin Server Action asks again, and the
 * `admin_*` functions in Postgres ask a fourth time.
 *
 * It asks WITHOUT a path (slice B3b): a layout is not handed its page's
 * address, so `requireAdmin()` reads the one `proxy.ts` forwards
 * (`x-pathname`) — and a guest who opened `/admin/orders/DH-2430` is sent to
 * sign in with `next=/admin/orders/DH-2430`, not `next=/admin`.
 *
 * It also reads what the sidebar prints — who is signed in, how many orders
 * wait on the shop, when the sample was last reset — from the same cached
 * reads the page below uses (`lib/db/admin.ts`), so the count and the queue
 * cannot disagree.
 *
 * Round v5 moves the back office to Arc one screen at a time. `AdminShell`
 * picks the frame from the path: the Arc frame for `ARC_ADMIN_PATHS`
 * (`lib/admin-arc.ts`), and for every other screen the v3 frame exactly as it
 * was — `.s.adm3`, the same design system as the shop switched to the back
 * office's own surface, a cream page with white panels on it. v3 screens
 * supply their own `<AdminTop>`.
 *
 * `AdminToastProvider` sits here and wraps both frames: the v3 back office
 * has one toast, and a sheet that closes when its action succeeds still has
 * the answer said after it has gone. The Arc frame brings its own toast stack
 * (`useArcToast`). Nothing in the back office is simulated in the browser any
 * more (slice B3b) — every screen reads the database and every button writes
 * it.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const [me, orders, lastResetAt] = await Promise.all([loadMe(), listAllOrders(), lastReset()]);
  const now = demoNow();
  const waiting = needsAction(orders.map((o) => effectiveOrder(o, now))).length;

  return (
    <AdminToastProvider>
      <AdminShell
        me={{ name: me?.name ?? session.email, email: session.email }}
        waiting={waiting}
        lastResetAt={lastResetAt}
      >
        {children}
      </AdminShell>
    </AdminToastProvider>
  );
}
