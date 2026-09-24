"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startWait } from "@/components/shop/WaitVeil";
import { Button } from "@/components/ui/Button";
import { listingHref, type ListingQuery } from "@/lib/catalog-query";
import { plainVnd } from "@/lib/money";

interface PriceFilterFormProps {
  applied: ListingQuery;
  path: string;
}

/**
 * The exact price window, for the desktop rail.
 *
 * The three band chips above it cover the usual answer in one click; this is
 * for the shopper who has a number in mind. A real `<form>`, so Enter in
 * either box commits — and with a submit button beside them, so does a mouse.
 * The approved mock draws the two boxes alone: two boxes that only respond to
 * Enter are a control half this site's visitors cannot reach, and a control
 * that does nothing when you click away from it is a dead control
 * (DESIGN.md §9 rule 3). The button is the smallest way to keep the promise.
 *
 * Digits only, grouped as they are typed, and the window is written into the
 * URL like every other filter (QĐ-8).
 *
 * The two boxes are `.range` in v3: a two-column grid inside the rail, with
 * the button under them.
 */
export function PriceFilterForm({ applied, path }: PriceFilterFormProps) {
  const router = useRouter();
  const [min, setMin] = useState(text(applied.minVnd));
  const [max, setMax] = useState(text(applied.maxVnd));

  // The URL can move on under a mounted form — a band chip, a tab, the
  // sheet. The boxes have to show what the URL now says, not what was typed
  // before it changed.
  const [seen, setSeen] = useState(applied);
  if (seen !== applied) {
    setSeen(applied);
    setMin(text(applied.minVnd));
    setMax(text(applied.maxVnd));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: ListingQuery = { ...applied };
    delete next.minVnd;
    delete next.maxVnd;
    if (min) next.minVnd = Number(min.replace(/\D/g, ""));
    if (max) next.maxVnd = Number(max.replace(/\D/g, ""));
    // Same page, new window: the wait veil's rule leaves it uncovered.
    const href = listingHref(path, next);
    startWait(href);
    router.push(href);
  }

  return (
    <form onSubmit={submit}>
      {/* 44px boxes, standing in a column of 36px chips: a target is a
          target whatever it happens to sit beside (`listing.css`). */}
      <div className="range">
        <input
          className="inp"
          type="text"
          inputMode="numeric"
          aria-label="Giá thấp nhất, đồng"
          placeholder="Từ"
          value={min}
          onChange={(e) => setMin(group(e.target.value))}
        />
        <input
          className="inp"
          type="text"
          inputMode="numeric"
          aria-label="Giá cao nhất, đồng"
          placeholder="Đến"
          value={max}
          onChange={(e) => setMax(group(e.target.value))}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        <Button tone="ink sm" icon="filter" type="submit">
          Áp dụng
        </Button>
      </div>
    </form>
  );
}

function group(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits ? plainVnd(Number(digits)) : "";
}

function text(v: number | undefined): string {
  return v === undefined ? "" : plainVnd(v);
}
