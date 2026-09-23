"use client";

import { useEffect, useState } from "react";
import { toVnIso } from "@/lib/datetime";
import {
  EMPTY_SIM,
  SIM_STORAGE_KEY,
  parseSim,
  pushSim,
  serializeSim,
  type SimAction,
  type SimOverlay,
} from "@/lib/admin-sim";
import { demoNow } from "@/lib/clock";

/**
 * The simulated-action log, from the SHOP side.
 *
 * `components/admin/SimContext.tsx` is the back office's copy of this: a
 * provider, because a dozen admin screens read and write it on every route.
 * The shop touches it in exactly two places — the order screen, to cancel —
 * so a provider around the whole router would cost every other route a
 * re-render for nothing.
 *
 * ONE KEY, ONE SHAPE, deliberately. A cancellation the shop cannot see is a
 * cancellation that did not happen, so the shopper's action is written where
 * `/admin/orders` reads (`lib/admin-sim.ts` says why), and the back office's
 * "Đặt lại dữ liệu mẫu" clears it like everything else. What the shop reads
 * BACK out of it is narrower than what the back office reads — see
 * `shopOrders`.
 *
 * Same shape as `reminders.ts` and `prefs.ts`: a same-tab event beside the
 * cross-tab `storage` one, and a `ready` flag so the first paint does not
 * draw a state storage has not confirmed.
 */
const CHANGED = "brand:sim";

export function readSim(): SimOverlay {
  try {
    return parseSim(window.localStorage.getItem(SIM_STORAGE_KEY));
  } catch {
    // A browser that refuses storage still gets a working screen this visit.
    return EMPTY_SIM;
  }
}

/**
 * Record one action. Returns the log as it now stands.
 *
 * `at` is stamped here rather than by the caller, so no screen can record a
 * time of its own — and `toVnIso`, never `toISOString()`, because every
 * stamp in this codebase is the Vietnamese wall clock with its offset
 * spelled out.
 */
/**
 * An action without its stamp. Distributive, so the union stays a union —
 * `Omit<SimAction, "at">` would collapse eight shapes into their common
 * fields and let a cancellation be pushed without a code.
 */
type WithoutAt<T> = T extends { at: string } ? Omit<T, "at"> : never;
export type SimActionInput = WithoutAt<SimAction>;

export function pushSimAction(action: SimActionInput & { at?: string }): SimOverlay {
  const next = pushSim(readSim(), {
    ...action,
    at: action.at ?? toVnIso(demoNow()),
  } as SimAction);
  try {
    window.localStorage.setItem(SIM_STORAGE_KEY, serializeSim(next));
  } catch {
    // Losing persistence must not break the screen in front of them.
  }
  window.dispatchEvent(new CustomEvent(CHANGED));
  return next;
}

export function useSimOverlay(): { sim: SimOverlay; ready: boolean } {
  const [sim, setSim] = useState<SimOverlay>(EMPTY_SIM);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSim(readSim());
    sync();
    setReady(true);

    window.addEventListener(CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { sim, ready };
}
