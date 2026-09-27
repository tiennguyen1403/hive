"use client";

import { useEffect, useRef, useState } from "react";
import { FeedIcon } from "./icon/FeedIcon";
import { cx } from "./useReveal";

/** How long the button says it copied (`feed.js`: `copy`). */
const DONE_MS = 2200;

interface FeedCopyProps {
  /** What lands on the clipboard: "2630000", "DH1507". */
  value: string;
  /** The row's name, for the button's label: "Chép số tiền". */
  what: string;
  /** The text on screen this copies: selected instead when the clipboard cannot be reached. */
  target: React.RefObject<HTMLElement | null>;
}

/**
 * "Chép" (`feed.js`: `copy`): the clipboard, then the old `execCommand`
 * route; on success the button reads "Đã chép" for two seconds, dark. Where
 * neither can reach the clipboard — an insecure origin, a policy — the text
 * on screen is selected instead, so the shopper is one keystroke from the
 * same result, and the button claims nothing.
 */
export function FeedCopy({ value, what, target }: FeedCopyProps) {
  const [done, setDone] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      ok = copyBySelection(value);
    }
    if (ok) {
      setDone(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setDone(false), DONE_MS);
      return;
    }
    const node = target.current;
    const selection = window.getSelection();
    if (node && selection) {
      const range = document.createRange();
      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  return (
    <button className={cx("copy", done && "done")} type="button" aria-label={`Chép ${what.toLocaleLowerCase("vi")}`} onClick={copy}>
      <FeedIcon name="copy" />
      <span>{done ? "Đã chép" : "Chép"}</span>
    </button>
  );
}

/** The route before the Clipboard API: a hidden field, selected, copied. False when the browser says no. */
function copyBySelection(value: string): boolean {
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.className = "sr-only";
  document.body.append(field);
  try {
    field.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
