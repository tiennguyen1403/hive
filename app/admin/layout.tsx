import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { SimProvider } from "@/components/admin/SimContext";

export const metadata: Metadata = {
  title: { default: "Quản trị", template: "%s · Quản trị · BRAND" },
  // A back office belongs in no search index, and the rule has to sit on the
  // layout so a screen added later cannot forget it.
  robots: { index: false, follow: false },
};

/**
 * The admin shell: a fixed sidebar and the screen beside it.
 *
 * `.s.adm` is the same design system as the shop, switched to the back
 * office's own surface — a cream page with white panels on it, where the
 * shop is white throughout. Screens supply their own `<AdminTop>`, because
 * the title and the buttons beside it belong to the screen, not the frame.
 *
 * `SimProvider` sits here and nowhere else: the sidebar's counter and every
 * screen's data read the same log of what was done in this browser, and two
 * copies of that state would disagree the first time one of them was written
 * to (`lib/admin-sim.ts`).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SimProvider>
      <div className="s adm3">
        <AdminNav />
        <main className="main">{children}</main>
      </div>
    </SimProvider>
  );
}
