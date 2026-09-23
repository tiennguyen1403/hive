"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon/Icon";
import { useReminders } from "@/components/shop/reminders";
import { useCatalog } from "@/components/shop/CatalogContext";
import { reminderNotice } from "@/lib/reminder";
import { demoNow } from "@/lib/clock";

/**
 * What the reminder button is FOR: the line that pays it back.
 *
 * It appears at the top of the home page in the last two hours before a
 * remembered drop opens, and stays for as long as that drop is selling.
 * Without it the button would write a number nobody ever reads, which is a
 * dead control wearing a pressed state (DESIGN.md §9 rule 3).
 *
 * Client-only, and not merely because storage is: the answer depends on the
 * current minute, and a prerendered frame cannot know it. The minute tick
 * means someone who leaves the page open watches the band appear on its own.
 */
export function ReminderBand() {
  const catalog = useCatalog();
  const { list, ready } = useReminders();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(demoNow());
    const id = window.setInterval(() => setNow(demoNow()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!ready || !now) return null;
  const notice = reminderNotice(catalog.drops, list, now);
  if (!notice) return null;

  return (
    <div className="band remind">
      <Icon name="bell" className="ic sm" />
      <span>{notice.text}</span>
      <Link className="lnk" href={notice.href}>
        {notice.linkText}
      </Link>
    </div>
  );
}
