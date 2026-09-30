"use client";

import { useEffect, useState } from "react";
import { SearchField } from "@/registry/components/search-field/search-field";

/**
 * A list's search in the Arc back office: v3's `SearchBox`
 * (`components/admin/AdminOrdersScreen.tsx`) in an Arc `SearchField`, with
 * the label and placeholder of the screen it sits on. The order book (slice
 * 0) keeps its own copy of the same rules; the log (slice 2) reads this one.
 *
 * It hands the words to `onSubmit` rather than filtering in React state,
 * because the result IS what the screen is showing, and the screen writes it
 * to the address (QĐ-8). Typed locally and sent after a 350ms pause, so the
 * caret never jumps while somebody is still typing; Enter sends it at once.
 * The label is read, not shown: the toolbar names the field
 * (`hideLabel`, registry/PATCHES.md).
 */
export function ArcSearchBox({
  label,
  placeholder,
  value,
  onSubmit,
}: {
  label: string;
  placeholder: string;
  value: string;
  onSubmit: (value: string) => void;
}) {
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);

  useEffect(() => {
    if (text === value) return;
    const id = window.setTimeout(() => onSubmit(text.trim()), 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <SearchField
      label={label}
      hideLabel
      placeholder={placeholder}
      value={text}
      onValueChange={setText}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSubmit(text.trim());
      }}
    />
  );
}
