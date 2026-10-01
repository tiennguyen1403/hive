"use client";

import { useLayoutEffect, useRef, type ChangeEvent, type CompositionEvent } from "react";

/**
 * A name written in capitals as it is typed (round v5): the teaser dialog's
 * style name (slice 4), the style form's (slice 5b), and since slice 6 the
 * discount form's code, which kept a copy of its own from slice 3.
 *
 * v3 drew those boxes in capitals with a CSS transform. Arc draws none, and
 * its rules ban the transform, so here the VALUE itself is raised. Not while
 * an input method is still composing a character (Telex, VNI): the finished
 * character is raised when it lands. Raising the value makes React rewrite
 * the box, which would throw the caret to the end, so the caret is put back
 * where it was.
 *
 * What the box shows is what is saved: the server raises a style's name too
 * (`lib/catalog-admin.ts`), and the discount form sends the code raised.
 * Spread the answer onto the `Input`, with `value`.
 */
export function useCapitals(value: string, onValue: (next: string) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<{ start: number; end: number } | null>(null);

  function type(field: HTMLInputElement, composing: boolean) {
    const next = composing ? field.value : field.value.toLocaleUpperCase("vi");
    if (next !== field.value) {
      caret.current = { start: field.selectionStart ?? next.length, end: field.selectionEnd ?? next.length };
    }
    onValue(next);
  }

  useLayoutEffect(() => {
    const field = ref.current;
    if (!field || !caret.current) return;
    field.setSelectionRange(caret.current.start, caret.current.end);
    caret.current = null;
  }, [value]);

  return {
    ref,
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      type(event.target, (event.nativeEvent as InputEvent).isComposing),
    onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => type(event.currentTarget, false),
  };
}
