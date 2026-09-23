import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminToastProvider } from "@/components/admin/AdminToast";
import { needsAction } from "@/lib/admin-metrics";
import { demoNow } from "@/lib/clock";
import { effectiveOrder } from "@/lib/customer-orders";
import { lastReset, listAllOrders } from "@/lib/db/admin";
import { loadMe } from "@/lib/db/profiles";
import { requireAdmin } from "@/lib/db/session";

export const metadata: Metadata = {
  title: { default: "Quản trị", template: "%s · Quản trị · BRAND" },
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
 * `.s.adm3` is the same design system as the shop, switched to the back
 * office's own surface — a cream page with white panels on it, where the
 * shop is white throughout. Screens supply their own `<AdminTop>`.
 *
 * `AdminToastProvider` sits here and nowhere else: the back office has one
 * toast, and a sheet that closes when its action succeeds still has the
 * answer said after it has gone. Nothing in the back office is simulated in
 * the browser any more (slice B3b) — every screen reads the database and
 * every button writes it.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const [me, orders, lastResetAt] = await Promise.all([loadMe(), listAllOrders(), lastReset()]);
  const now = demoNow();
  const waiting = needsAction(orders.map((o) => effectiveOrder(o, now))).length;

  return (
    <AdminToastProvider>
      <div className="s adm3">
        <AdminNav
          me={{ name: me?.name ?? session.email, email: session.email }}
          waiting={waiting}
          lastResetAt={lastResetAt}
        />
        <main className="main">{children}</main>
      </div>
    </AdminToastProvider>
  );
}
