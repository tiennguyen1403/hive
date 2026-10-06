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
import { useOptimistic, useRef, useState, useTransition } from "react";
import { FeedLogo } from "@/components/feed/FeedLogo";
import { useLocale } from "@/components/i18n/LocaleContext";
import { signOut } from "@/lib/actions/auth";
import { storedLang } from "@/lib/admin-text";
import { setLocale } from "@/lib/actions/locale";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { LOCALE_PARAM, parseLocale, picker, plural, type Pair } from "@/lib/i18n";
import { LEX, lexicon } from "@/lib/lexicon";
import { Badge } from "@/registry/components/badge/badge";
import { Button } from "@/registry/components/button/button";
import SegmentedControl from "@/registry/components/segmented-control/segmented-control";
import { ArcResetDialog } from "./ArcResetDialog";
import styles from "./ArcSidebar.module.css";

/**
 * The seven places of the back office: the same order, labels and addresses
 * as `LINKS` in the v3 sidebar (`AdminNav`, until round v5 slice 6), each with
 * a Lucide icon. The label of the issues is the lexicon's (`LEX.adm`), and the
 * address stays English, as in v3. In both languages since round v6, in the
 * glossary's words.
 */
const LINKS: Array<{ href: string; label: Pair; icon: LucideIcon }> = [
  { href: "/admin", label: { vi: "Tổng quan", en: "Overview" }, icon: LayoutDashboard },
  { href: "/admin/drops", label: { vi: LEX.adm, en: lexicon("en").adm }, icon: CalendarDays },
  { href: "/admin/orders", label: { vi: "Đơn hàng", en: "Orders" }, icon: ShoppingBag },
  { href: "/admin/products", label: { vi: "Mẫu", en: "Styles" }, icon: Shirt },
  { href: "/admin/customers", label: { vi: "Khách hàng", en: "Customers" }, icon: Users },
  { href: "/admin/promotions", label: { vi: "Mã giảm giá", en: "Discount codes" }, icon: TicketPercent },
  { href: "/admin/log", label: { vi: "Nhật ký", en: "Activity" }, icon: ScrollText },
];

/**
 * `AdminNav`'s rule: `/admin` matches only itself, every other entry also owns
 * its children, so an order's page keeps "Đơn hàng" lit.
 */
function isOpen(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/**
 * The Arc back office's sidebar (round v5 slice 0), in place of v3's
 * `AdminNav` and `SimBar`.
 *
 * Everything it prints comes from the server, through the admin layout, as
 * in v3: who is signed in, how many orders wait on the shop (the same count
 * as the overview's queue), and when the sample was last put back. The foot
 * says what the back office is in SimBar's own words; "Đặt lại dữ liệu mẫu"
 * always works, so it is always there.
 *
 * Round v6 slice E0 (QĐ-40): everything it prints is in the page's language,
 * and the language switch sits at its foot, just above who is signed in
 * (`LanguageControl`).
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
  const locale = useLocale();
  const t = picker(locale);
  const [asking, setAsking] = useState(false);
  /** "Đặt lại dữ liệu mẫu": focus comes back to it when its dialog shuts (slice 5a). */
  const resetButton = useRef<HTMLButtonElement>(null);

  return (
    <aside className={styles.side}>
      {/* v3 does not make the name a link, and neither does this. */}
      <div className={styles.brand} role="img" aria-label="HIVE">
        <FeedLogo tone="light" className={styles.logo} />
      </div>

      <nav className={styles.nav} aria-label={t({ vi: "Khu quản trị", en: "Admin" })}>
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
              {t(label)}
              {count > 0 && (
                <Badge
                  size="sm"
                  tone="neutral"
                  className={styles.count}
                  aria-label={t({ vi: `${count} đơn cần xử lý`, en: `${plural(count, "order", "orders")} to process` })}
                >
                  {count}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={styles.foot}>
        <Badge>{t({ vi: "Dữ liệu mẫu", en: "Demo data" })}</Badge>
        <p>
          {t({ vi: "Đồng hồ thật · dữ liệu mẫu", en: "Real time · demo data," })}{" "}
          {lastResetAt ? (
            <>
              {t({ vi: "đặt lại lần cuối", en: "last reset" })}{" "}
              <strong>
                {clockLabel(lastResetAt)} · {dayMonth(lastResetAt, locale)}
              </strong>
            </>
          ) : (
            t({ vi: "chưa đặt lại", en: "not reset yet" })
          )}
          .
        </p>
        <Button
          ref={resetButton}
          variant="ghost"
          size="sm"
          className={styles.edge}
          onClick={() => setAsking(true)}
        >
          <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
          {t({ vi: "Đặt lại dữ liệu mẫu", en: "Reset demo data" })}
        </Button>
        <LanguageControl />
        <p>
          {/* Who is signed in, as their profile has it (round v6 slice E4): the
              demo manager's name is Vietnamese, said so on an English page. */}
          <strong lang={storedLang(me.name, locale)}>{me.name}</strong> · {me.email}
        </p>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit" className={styles.edge}>
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            {t({ vi: "Đăng xuất", en: "Sign out" })}
          </Button>
        </form>
      </div>

      <ArcResetDialog
        open={asking}
        onOpenChange={setAsking}
        // Radix returns focus only to a `DialogTrigger`: without this, closing
        // the dialog with Escape or "Giữ nguyên" dropped focus on <body>.
        onCloseAutoFocus={(event) => {
          const back = resetButton.current;
          if (!back?.isConnected) return;
          event.preventDefault();
          back.focus();
        }}
      />
    </aside>
  );
}

/**
 * The back office's language switch (round v6 slice E0, QĐ-40; the user chose
 * the place on 01/10/2026): Arc's `SegmentedControl`, whose segments are
 * Arc's small control height, at the foot of the sidebar above who is signed
 * in. Each language is named in itself and carries its `lang`
 * (`Segment.lang`, a patch, `registry/PATCHES.md` §3).
 *
 * Choosing one calls the same Server Action as the shop's switch
 * (`setLocale`), which sets the cookie; the page is redrawn in place in the
 * same round trip, so focus stays on the segment just pressed. The segment
 * moves at once (`useOptimistic`) rather than after the server has answered.
 * It needs script, as the rest of the Arc zone does.
 */
function LanguageControl() {
  const locale = useLocale();
  const [shown, show] = useOptimistic(locale);
  const [, startSwitch] = useTransition();
  return (
    <SegmentedControl
      className={styles.edge}
      label={picker(locale)({ vi: "Ngôn ngữ", en: "Language" })}
      options={[
        { value: "vi", label: "Tiếng Việt", lang: "vi" },
        { value: "en", label: "English", lang: "en" },
      ]}
      value={shown}
      onValueChange={(value) => {
        const next = parseLocale(value);
        if (!next || next === shown) return;
        startSwitch(async () => {
          show(next);
          const form = new FormData();
          form.set(LOCALE_PARAM, next);
          await setLocale(form);
        });
      }}
    />
  );
}
