"use client";

import { useState } from "react";
import { FeedIcon } from "@/components/feed/icon/FeedIcon";

/** The mock's sort sheet options (`SORTS` in `feed.js`), one checked at a time. */
const SORTS = [
  ["new", "Mới nhất"],
  ["asc", "Giá tăng dần"],
  ["desc", "Giá giảm dần"],
] as const;

export function KitSort({ labelledBy }: { labelledBy: string }) {
  const [sort, setSort] = useState<string>("new");
  return (
    <div className="sort-list" role="radiogroup" aria-labelledby={labelledBy}>
      {SORTS.map(([key, label]) => (
        <button
          key={key}
          className="sort-opt"
          type="button"
          role="radio"
          aria-checked={key === sort}
          onClick={() => setSort(key)}
        >
          {label}
          <FeedIcon name="check" />
        </button>
      ))}
    </div>
  );
}
