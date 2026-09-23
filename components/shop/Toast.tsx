"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icon/Icon";

/**
 * A short confirmation that something was recorded, and then it is gone.
 *
 * Used where the confirmation cannot live on the control itself — the
 * reminder button already changes its own label, but the fact worth saying
 * ("lưu trên thiết bị này") does not fit on a button.
 *
 * `role="status"` rather than `alert`: nothing has gone wrong, so it is
 * announced politely, after whatever the reader was already saying.
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
}: {
  message: string | null;
  onDone: () => void;
  ms?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onDone, ms);
    return () => window.clearTimeout(id);
  }, [message, ms, onDone]);

  if (!message || typeof document === "undefined") return null;

  return createPortal(
    <div className="toast show" role="status">
      <Icon name="confirm" />
      <span>{message}</span>
    </div>,
    document.body,
  );
}
