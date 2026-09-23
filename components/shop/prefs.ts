"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PREFS,
  PREFS_STORAGE_KEY,
  parsePrefs,
  serializePrefs,
  type Prefs,
} from "@/lib/prefs";

/**
 * The account's two switches, as this device has them.
 *
 * Same shape as `reminders.ts`, deliberately: one module, one storage key,
 * a same-tab event beside the cross-tab `storage` one, and a `ready` flag so
 * the first paint does not draw a switch in a state storage has not
 * confirmed yet. Not a provider — this is one screen, and a fifth context
 * around the whole router for two booleans would cost every other route a
 * re-render.
 */
const CHANGED = "brand:prefs";

export function readPrefs(): Prefs {
  try {
    return parsePrefs(window.localStorage.getItem(PREFS_STORAGE_KEY));
  } catch {
    // A device that cannot remember still gets working switches this visit.
    return DEFAULT_PREFS;
  }
}

export function writePrefs(prefs: Prefs): void {
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, serializePrefs(prefs));
  } catch {
    // Losing persistence must not break the screen in front of them.
  }
  window.dispatchEvent(new CustomEvent(CHANGED));
}

export function usePrefs(): { prefs: Prefs; ready: boolean } {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setPrefs(readPrefs());
    sync();
    setReady(true);

    window.addEventListener(CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { prefs, ready };
}
