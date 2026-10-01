"use client";

import { useLayoutEffect, useRef, type ChangeEvent, type CompositionEvent } from "react";

/**
 * A style's name, written in capitals as it is typed (round v5): the teaser
 * dialog's name field (slice 4) and the style form's (slice 5b) share it.
 *
 * v3 drew those boxes in capitals with a CSS transform. Arc draws none, and
 * its rules ban the transform, so here the VALUE itself is raised, as the code
 * field of the discount form does (slice 3). Not while an input method is
 * still composing a character (Telex, VNI): the finished character is raised
 * when it lands. Raising the value makes React rewrite the box, which would
 * throw the caret to the end, so the caret is put back where it was.
 *
 * The server raises the name too (`lib/catalog-admin.ts`), so what the box
 * shows is what is saved. Spread the answer onto the `Input`, with `value`.
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
