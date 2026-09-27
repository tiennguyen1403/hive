"use client";

import { useCallback, useState } from "react";

/**
 * Cards, rails and blocks rise 16px and fade in as they enter the window
 * (`feed.js`: `reveal`, the mock's one entrance). The element wears `.rv`
 * from the server; this adds `.in` once it has been seen, and the CSS does
 * the rest only while motion is allowed (`app/styles/feed/feed.css`). With
 * reduced motion it is `.in` at once and nothing moves.
 *
 * One observer for the whole page, as the mock has; each element is watched
 * until it has shown once. The state lives in React, not in a class written
 * on the DOM, so a re-render never takes it away again.
 */
let observer: IntersectionObserver | null = null;
const waiting = new Map<Element, () => void>();

function watch(el: Element, onShow: () => void): () => void {
  if (typeof IntersectionObserver === "undefined") {
    onShow();
    return () => {};
  }
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const show = waiting.get(entry.target);
        waiting.delete(entry.target);
        observer?.unobserve(entry.target);
        show?.();
      }
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
  );
  waiting.set(el, onShow);
  observer.observe(el);
  return () => {
    waiting.delete(el);
    observer?.unobserve(el);
  };
}

export function useReveal<T extends Element>(): { ref: (el: T | null) => (() => void) | undefined; shown: boolean } {
  const [shown, setShown] = useState(false);
  const ref = useCallback((el: T | null) => {
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return undefined;
    }
    return watch(el, () => setShown(true));
  }, []);
  return { ref, shown };
}

/** Class names, falsy ones left out. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
