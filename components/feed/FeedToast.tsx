"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cx } from "./useReveal";

/** A button on the toast that does what it says: "Hoàn tác", "Đăng nhập". */
export interface ToastAction {
  label: string;
  run: () => void;
}

type ToastFn = (text: string, action?: ToastAction) => void;

const Ctx = createContext<ToastFn | null>(null);

/** How long a toast stays (`feed.js`: `toast`). */
const TOAST_MS = 5000;

/** The Feed's toast, from any screen inside a Feed frame (`FeedShell` renders the provider). */
export function useFeedToast(): ToastFn {
  const toast = useContext(Ctx);
  if (!toast) throw new Error("useFeedToast needs a <FeedToastProvider> above it (FeedFrame renders one)");
  return toast;
}

interface Shown {
  id: number;
  text: string;
  action: ToastAction | undefined;
}

/**
 * The toast (`feed.js`: `toast`; the mock's `.toast`, here `.snack`, since v3
 * styles a bare `.toast`): one at a time, a line of words and at most one
 * action, gone after five seconds or once its action is pressed. It never
 * takes the focus and never traps it; the region is polite, so a screen
 * reader hears it without losing its place.
 *
 * It stays in the page, inside the Feed frame, so it keeps the zone's tokens
 * and sits above the bars the screen has at the bottom (`flow.css` asks the
 * frame which bars those are). The region is there from the first paint and
 * only its words change, which is what a live region needs to be read out.
 */
export function FeedToastProvider({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const [on, setOn] = useState(false);
  const timer = useRef(0);
  const seq = useRef(0);

  const toast = useCallback<ToastFn>((text, action) => {
    window.clearTimeout(timer.current);
    seq.current += 1;
    setShown({ id: seq.current, text, action });
    setOn(true);
    timer.current = window.setTimeout(() => setOn(false), TOAST_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function act() {
    const run = shown?.action?.run;
    window.clearTimeout(timer.current);
    setOn(false);
    run?.();
  }

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className={cx("snack", on && "on")} role="status" aria-live="polite">
        {shown && (
          <>
            <span key={shown.id}>{shown.text}</span>
            {shown.action && (
              <button type="button" className="snack-act" tabIndex={on ? 0 : -1} onClick={act}>
                {shown.action.label}
              </button>
            )}
          </>
        )}
      </div>
    </Ctx.Provider>
  );
}
