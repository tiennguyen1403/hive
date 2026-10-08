import type { Metadata } from "next";
import { ArcAdminFrame } from "@/components/admin-arc/ArcAdminFrame";
import { needsAction } from "@/lib/admin-metrics";
import { demoNow } from "@/lib/clock";
import { effectiveOrder } from "@/lib/customer-orders";
import { lastReset, listAllOrders } from "@/lib/db/admin";
import { loadMe } from "@/lib/db/profiles";
import { requireAdmin } from "@/lib/db/session";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
// Arc's tokens (round v5, QĐ-37), here and not in the root layout. Every rule
// in the file is scoped `:root:has([data-ui="admin"])`, so it acts only while
// the Arc frame is in the page: the shop, which keeps the stylesheet after a
// client navigation, never matches it.
import "@/registry/foundation.css";

/**
 * The back office's name in every title, in the page's language since round v6
 * slice E4: "Quản trị", and "Admin" in English (the glossary's "Try the admin").
 * Each screen names itself in front of it ("Orders · Admin · HIVE").
 */
export async function generateMetadata(): Promise<Metadata> {
  const name = picker(await getLocale())({ vi: "Quản trị", en: "Admin" });
  return {
    title: { default: name, template: `%s · ${name} · HIVE` },
    // A back office belongs in no search index, and the rule has to sit on the
    // layout so a screen added later cannot forget it.
    robots: { index: false, follow: false },
  };
}

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
 * Every screen wears the Arc frame (round v5, QĐ-37): the zone's root, the
 * sidebar and the toast stack (`ArcAdminFrame`). Round v5 moved the back
 * office one area at a time and switched frames by path; since slice 6, with
 * the v3 frame and its screens gone, the layout draws the Arc frame directly.
 * A path no page answers never reaches this layout: the root `not-found`
 * answers it, outside the back office. Nothing in the back office is
 * simulated in the browser any more (slice B3b) — every screen reads the
 * database and every button writes it.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const [me, orders, lastResetAt] = await Promise.all([loadMe(), listAllOrders(), lastReset()]);
  const now = demoNow();
  const waiting = needsAction(orders.map((o) => effectiveOrder(o, now))).length;
  // The published demo manager, by the handle `scripts/seed-users.ts` gives
  // the account: the sidebar names it by its role, in the page's language
  // (round v6 slice R2, N1). Any other admin is named as its profile has it.
  const handle: string | null = me?.handle ?? null;

  return (
    <ArcAdminFrame
      me={{ name: me?.name ?? session.email, email: session.email, demo: handle === DEMO_ADMIN.handle }}
      waiting={waiting}
      lastResetAt={lastResetAt}
    >
      {children}
    </ArcAdminFrame>
  );
}
