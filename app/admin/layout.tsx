import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { SimProvider } from "@/components/admin/SimContext";
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
 * It also reads what the sidebar prints — who is signed in, how many orders
 * wait on the shop, when the sample was last reset — from the same cached
 * reads the page below uses (`lib/db/admin.ts`), so the count and the queue
 * cannot disagree.
 *
 * `.s.adm3` is the same design system as the shop, switched to the back
 * office's own surface — a cream page with white panels on it, where the
 * shop is white throughout. Screens supply their own `<AdminTop>`.
 *
 * `SimProvider` sits here and nowhere else: what is still simulated (stock,
 * issues, codes) is one log in this browser, and the sidebar's counter and
 * every screen read the same one (`lib/admin-sim.ts`).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin("/admin");
  const [me, orders, lastResetAt] = await Promise.all([loadMe(), listAllOrders(), lastReset()]);
  const now = demoNow();
  const waiting = needsAction(orders.map((o) => effectiveOrder(o, now))).length;

  return (
    <SimProvider>
      <div className="s adm3">
        <AdminNav
          me={{ name: me?.name ?? session.email, email: session.email }}
          waiting={waiting}
          lastResetAt={lastResetAt}
        />
        <main className="main">{children}</main>
      </div>
    </SimProvider>
  );
}
