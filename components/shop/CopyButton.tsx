"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

interface CopyButtonProps {
  /** What lands on the clipboard. */
  value: string;
  /** Shown as-is. Default "Chép". */
  label?: string;
  /**
   * The text on screen this button copies. When the clipboard refuses — an
   * insecure origin, a permission policy, an older browser — the run of text
   * is SELECTED instead, so the shopper is one keystroke from the same
   * result rather than being told a copy happened that did not.
   */
  selectRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

/** How long the button admits to having done something. */
const HELD_MS = 1500;

/**
 * "Chép" — a real action, and honest about the one case where it cannot be.
 *
 * The confirmation is the screen where somebody is about to type an amount
 * and a reference into a banking app, so a copy that quietly fails is worse
 * here than anywhere else in the shop. Three outcomes, all of them visible:
 * copied (the label says so for a second and a half), selected (the browser
 * refused, the text is highlighted), or nothing to copy.
 */
export function CopyButton({
  value,
  label = "Chép",
  selectRef,
  className = "",
}: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "done" | "selected">("idle");
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function hold(next: "done" | "selected") {
    setState(next);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), HELD_MS);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      hold("done");
    } catch {
      const node = selectRef?.current;
      if (node && typeof window.getSelection === "function") {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      hold("selected");
    }
  }

  return (
    <Button
      tone={`ink sm ${className}`.trim()}
      icon={state === "idle" ? "doc" : "confirm"}
      onClick={copy}
      aria-live="polite"
    >
      {state === "done" ? "Đã chép" : state === "selected" ? "Đã chọn sẵn" : label}
    </Button>
  );
}
