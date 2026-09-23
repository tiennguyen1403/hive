"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Toast } from "@/components/shop/Toast";
import { toVnIso } from "@/lib/datetime";
import {
  EMPTY_SIM,
  SIM_STORAGE_KEY,
  parseSim,
  pushSim,
  serializeSim,
  simCount,
  type SimAction,
  type SimOverlay,
} from "@/lib/admin-sim";
import { demoNow } from "@/lib/clock";

/** `at` is stamped by the store, so no caller can record a time of its own. */
type WithoutAt<T> = T extends { at: string } ? Omit<T, "at"> : never;
export type SimActionInput = WithoutAt<SimAction>;

interface SimApi {
  sim: SimOverlay;
  /** Storage has answered. Before that the screen shows the fixtures alone. */
  ready: boolean;
  count: number;
  /** Record an action and say so in a toast. */
  run: (action: SimActionInput, message: string) => void;
  /**
   * Record SEVERAL actions as one change to the store.
   *
   * Not `run` called in a loop: `run` closes over the overlay it was built
   * with, so a second call in the same tick would write over the first and
   * the bulk bar would silently record one order out of three. The store is
   * an event log, so the honest shape of "mark three orders paid" is three
   * events appended at once.
   */
  runMany: (actions: SimActionInput[], message: string) => void;
  /**
   * Say something without recording anything — a download, a copy, a print,
   * and since slice B3a what a Server Action answered for an order.
   */
  say: (message: string) => void;
  /**
   * Forget what this browser recorded. Silent: the back office's reset is the
   * database's (`resetDemo()`), and the button that calls both says what
   * happened once the server has answered (`SimBar`).
   */
  reset: () => void;
}

const SimCtx = createContext<SimApi | null>(null);

/**
 * Everything the back office did in this browser, in one place — since slice
 * B3a only what is still simulated (stock, issues, teasers, codes); every
 * move on an order is a Server Action now. It also carries the one toast the
 * whole area shares, which is how an order screen reports what the server
 * answered.
 *
 * Mounted once by the admin layout so the sidebar's counter and every screen
 * read the same log — two copies of this state would disagree the first time
 * a screen pushed an action without the sidebar hearing about it.
 *
 * The first render deliberately shows the FIXTURES ALONE: the pages are
 * server-rendered and `localStorage` does not exist there, so reading it
 * during render would hydrate into a different tree. The effect below runs
 * immediately after, which is also the honest order of events — until
 * storage answers, this browser has nothing to say.
 */
export function SimProvider({ children }: { children: React.ReactNode }) {
  const [sim, setSim] = useState<SimOverlay>(EMPTY_SIM);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        setSim(parseSim(window.localStorage.getItem(SIM_STORAGE_KEY)));
      } catch {
        // A browser that refuses storage still gets a working session; it
        // just forgets it at the end of it.
        setSim(EMPTY_SIM);
      }
    };
    read();
    setReady(true);

    // Another tab of the same back office is the same operator.
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  const write = useCallback((next: SimOverlay) => {
    setSim(next);
    try {
      window.localStorage.setItem(SIM_STORAGE_KEY, serializeSim(next));
    } catch {
      // Losing persistence must not break the screen in front of them.
    }
  }, []);

  const run = useCallback(
    (action: SimActionInput, msg: string) => {
      // `toVnIso`, never `toISOString()`: every stamp in this codebase is the
      // Vietnamese wall clock with its offset spelled out, and the date
      // formatters read the text rather than the instant.
      write(pushSim(sim, { ...action, at: toVnIso(demoNow()) } as SimAction));
      setMessage(msg);
    },
    [sim, write],
  );

  const runMany = useCallback(
    (actions: SimActionInput[], msg: string) => {
      if (actions.length === 0) return;
      const at = toVnIso(demoNow());
      write(
        actions.reduce(
          (overlay, action) => pushSim(overlay, { ...action, at } as SimAction),
          sim,
        ),
      );
      setMessage(msg);
    },
    [sim, write],
  );

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(SIM_STORAGE_KEY);
    } catch {
      // Nothing was stored, so nothing is left behind.
    }
    setSim(EMPTY_SIM);
  }, []);

  const api = useMemo<SimApi>(
    () => ({ sim, ready, count: simCount(sim), run, runMany, say: setMessage, reset }),
    [sim, ready, run, runMany, reset],
  );

  return (
    <SimCtx.Provider value={api}>
      {children}
      <Toast message={message} onDone={() => setMessage(null)} />
    </SimCtx.Provider>
  );
}

/**
 * The screen's clock: the server's instant, or the last recorded action if
 * that is later.
 *
 * "Đóng sớm" and "Kết thúc sớm" both work by moving a closing hour to NOW —
 * that is what keeps an issue's state and a code's state derived rather than
 * flagged (`lib/drop.ts`, `promoState`). But the instant a screen judges
 * them against arrived from the server when the page loaded, which is before
 * the button was pressed: measured on `/admin/promotions`, ending a code
 * early moved its `endsAt` to 03:58 and the badge went on saying "Đang chạy"
 * because the page still thought it was 03:56.
 *
 * Reading the clock again during render would not help: `nowIso` is already
 * the clock's answer (`demoNow()`) and a second reading a few milliseconds
 * later is still before the press. Taking the LATEST OF THE TWO is what
 * moves it — an empty store leaves `nowIso` untouched, so the first render
 * stays identical to the HTML, and the clock only jumps when something
 * actually happened.
 */
export function useSimNow(nowIso: string): Date {
  const { sim } = useSim();
  const latest = sim.actions.at(-1)?.at;
  return useMemo(
    () => new Date(Math.max(Date.parse(nowIso), latest ? Date.parse(latest) : 0)),
    [nowIso, latest],
  );
}

export function useSim(): SimApi {
  const api = useContext(SimCtx);
  if (!api) throw new Error("useSim() outside <SimProvider>");
  return api;
}
