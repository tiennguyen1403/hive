"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icon/Icon";

/**
 * What a toast is saying: that something was recorded (`ok`), or that it was
 * not (`error`).
 */
export type ToastTone = "ok" | "error";

/**
 * A short sentence about what just happened, and then it is gone.
 *
 * Used where the answer cannot live on the control itself — the reminder
 * button already changes its own label, but the fact worth saying ("lưu trên
 * thiết bị này") does not fit on a button; a Server Action's answer arrives
 * after the sheet that asked has closed.
 *
 * Two tones, one box (slice B4b). Most toasts confirm, and say so with the
 * `confirm` tick and `role="status"`: nothing has gone wrong, so it is
 * announced politely, after whatever the reader was already saying. A toast
 * that REFUSES — the order that did not go through, the save the server
 * turned down, the limit reached — used to wear the same tick, which read as
 * "done" beside a sentence saying the opposite. `tone="error"` gives it the
 * language a form's own error already speaks (`Field3`): the `danger` icon
 * and `role="alert"`, announced at once. Same box, same colours, same timing;
 * the icon keeps the toast's own honey tint (`.toast svg`), so the shape and
 * the words carry the difference, not a new colour.
 *
 * Portalled to `document.body` for the same reason the sheet is: it is
 * `position:fixed`, and a fixed element inside a transformed ancestor is
 * positioned against that ancestor rather than the viewport. It therefore
 * inherits nothing from `.s`, and `.toast` in `sheet.css` states its own
 * font, size and colour (DESIGN.md §6).
 */
export function Toast({
  message,
  onDone,
  /** Milliseconds on screen. The mock's own timing. */
  ms = 2600,
  tone = "ok",
}: {
  message: string | null;
  onDone: () => void;
  ms?: number;
  tone?: ToastTone;
}) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onDone, ms);
    return () => window.clearTimeout(id);
  }, [message, ms, onDone]);

  if (!message || typeof document === "undefined") return null;

  const refused = tone === "error";
  return createPortal(
    <div className="toast show" role={refused ? "alert" : "status"}>
      <Icon name={refused ? "danger" : "confirm"} />
      <span>{message}</span>
    </div>,
    document.body,
  );
}
