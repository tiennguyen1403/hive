"use client";

import { useEffect, useState } from "react";
import {
  REMINDER_STORAGE_KEY,
  parseReminders,
  serializeReminders,
  type Reminders,
} from "@/lib/reminder";

/**
 * The reminder list, shared by the button that sets it and the band that
 * reads it back.
 *
 * Deliberately NOT a provider. The cart, the wishlist and the session are
 * context because half the app reads them on every route; this is two
 * components on one page, and a fourth provider wrapped around the whole
 * router for their sake would cost every other route a re-render.
 *
 * `storage` only fires in OTHER tabs, so a same-tab event carries the change
 * to the band standing beside the button. Both are listened for: one covers
 * the second tab, the other covers the same page.
 */
const CHANGED = "brand:reminders";

export function readReminders(): Reminders {
  try {
    return parseReminders(window.localStorage.getItem(REMINDER_STORAGE_KEY));
  } catch {
    // A device that cannot remember still gets a working button this visit.
    return [];
  }
}

export function writeReminders(list: Reminders): void {
  try {
    window.localStorage.setItem(REMINDER_STORAGE_KEY, serializeReminders(list));
  } catch {
    // Losing persistence must not break the page in front of them.
  }
  window.dispatchEvent(new CustomEvent(CHANGED));
}

/**
 * The list as this device has it, plus whether it has been read yet.
 *
 * `ready` exists because the first render happens on the server, where there
 * is no storage: a button that drew itself pressed before the list arrived
 * would flip back on hydration, which is exactly the flash this avoids.
 */
export function useReminders(): { list: Reminders; ready: boolean } {
  const [list, setList] = useState<Reminders>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setList(readReminders());
    sync();
    setReady(true);

    window.addEventListener(CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { list, ready };
}
