"use client";

import { useState } from "react";

/**
 * The shop's filter row as the mock draws it (`feed.js`, the listing):
 * `.chips` of `.chip` buttons, one pressed at a time.
 */
export function KitChips({ labels }: { labels: readonly string[] }) {
  const [on, setOn] = useState(0);
  return (
    <div className="chips kit-chips" role="group" aria-label="Loại">
      {labels.map((label, i) => (
        <button key={label} className="chip" type="button" aria-pressed={i === on} onClick={() => setOn(i)}>
          {label}
        </button>
      ))}
    </div>
  );
}
