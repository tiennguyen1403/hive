"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { MyState } from "@/data/types";
import { EMPTY_MY_STATE } from "@/lib/feed-me";
import { keepFailureMessage, type KeepResult, type KeepTopic, type UnsaveResult } from "@/lib/my-state";
import { useMe } from "./MeContext";

/** One write the screen has drawn already and the server has not answered yet. */
interface Pending {
  id: number;
  apply: (state: MyState) => MyState;
}

interface MyStateApi {
  /**
   * What the account keeps, as the screen should draw it now: the server's
   * last answer with every write still in flight drawn on top. Null while
   * signed out.
   */
  state: MyState | null;
  signedIn: boolean;
  /**
   * One write, optimistic: `apply` is drawn at once, `call` runs the Server
   * Action, and its answer — the whole state as the database holds it —
   * replaces the drawing. A refusal takes the drawing away again; the caller
   * says so (it holds the toast). Never throws.
   */
  keep: <R extends KeepResult | UnsaveResult>(
    topic: KeepTopic,
    apply: (state: MyState) => MyState,
    call: () => Promise<R>,
  ) => Promise<R>;
}

const Ctx = createContext<MyStateApi | null>(null);

/**
 * What the signed-in account keeps (slice B9) — saved styles, issue
 * reminders, "Size của tôi", the notification switches — for every screen,
 * read once on the server beside `loadMe()` (`app/layout.tsx`,
 * `getMyState()`) and kept here for the whole visit.
 *
 * Every press is optimistic (round v4 slice 3b): the heart fills, the
 * reminder turns on, the size is chosen before the server has answered;
 * the Server Action then answers with the whole state, which replaces the
 * drawing, or refuses, which takes it away. Next dispatches Server Actions
 * one at a time per client (`02-guides/server-actions.md`, "Sequential
 * dispatch"), so the answers come back in the order the presses were made
 * and each one already contains every write before it: the writes still in
 * flight are simply drawn again on top of it.
 *
 * A fresh read from the server — signing in or out, or a Server Action that
 * re-renders the root layout, as Hồ sơ's "Lưu" does — replaces what is kept
 * here, the writes still in flight drawn on top of it as well.
 *
 * Nothing is read from or written to the browser's storage: the lists kept
 * on a device before slice 3b (`brand.wishlist`, `brand.reminder`,
 * `brand.prefs`) are not carried into the account.
 */
export function MyStateProvider({ initial, children }: { initial: MyState | null; children: React.ReactNode }) {
  const me = useMe();
  const [confirmed, setConfirmed] = useState<MyState | null>(initial);
  const [seen, setSeen] = useState<MyState | null>(initial);
  const [pending, setPending] = useState<Pending[]>([]);
  const seq = useRef(0);

  // A new read from the server is the truth (the adjust-state-while-rendering pattern).
  if (initial !== seen) {
    setSeen(initial);
    setConfirmed(initial);
  }

  const signedIn = me !== null;
  // Signed in with nothing read (the read failed): an empty account, until a write answers with the real one.
  const base = confirmed ?? (signedIn ? EMPTY_MY_STATE : null);
  const state = useMemo(
    () => (base === null ? null : pending.reduce((s, p) => p.apply(s), base)),
    [base, pending],
  );

  const keep = useCallback(
    async <R extends KeepResult | UnsaveResult>(
      topic: KeepTopic,
      apply: (state: MyState) => MyState,
      call: () => Promise<R>,
    ): Promise<R> => {
      seq.current += 1;
      const id = seq.current;
      setPending((list) => [...list, { id, apply }]);
      let answer: KeepResult | UnsaveResult;
      try {
        answer = await call();
      } catch {
        // The network, or the server's own failure: the drawing goes, the caller says so.
        answer = { ok: false, reason: "UNAVAILABLE", message: keepFailureMessage("UNAVAILABLE", topic) };
      }
      if (answer.ok) setConfirmed(answer.state);
      setPending((list) => list.filter((p) => p.id !== id));
      // A refusal is a member of both answers, so this is one of the caller's.
      return answer as R;
    },
    [],
  );

  const value = useMemo<MyStateApi>(() => ({ state: signedIn ? state : null, signedIn, keep }), [state, signedIn, keep]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The account's state and the optimistic write. A missing provider is a bug and says so. */
export function useMyState(): MyStateApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMyState must be used inside <MyStateProvider>");
  return ctx;
}
