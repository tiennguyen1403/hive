"use client";

import { useEffect, useState } from "react";
import {
  RECENT_SEARCH_STORAGE_KEY,
  parseSearches,
  rememberSearch,
  serializeSearches,
  type RecentSearches,
} from "@/lib/recent-searches";

/**
 * What this browser has searched for, shared by the row that shows it and
 * the screen that adds to it.
 *
 * Same shape as `reminders.ts`, and deliberately not a provider: two
 * components on one route do not need a context wrapped around the whole
 * router. `storage` only fires in OTHER tabs, so a same-tab custom event
 * carries the change to the row standing on the same page.
 *
 * Nothing leaves the device. There is no server to send it to, and the
 * heading above the row says so in as many words.
 */
const CHANGED = "brand:searches";

export function readSearches(): RecentSearches {
  try {
    return parseSearches(window.localStorage.getItem(RECENT_SEARCH_STORAGE_KEY));
  } catch {
    // A device that cannot remember still gets a working search this visit.
    return [];
  }
}

function write(list: RecentSearches): void {
  try {
    window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, serializeSearches(list));
  } catch {
    // Losing persistence must not break the page in front of them.
  }
  window.dispatchEvent(new CustomEvent(CHANGED));
}

/** `hits` is how many styles the search found; zero is not remembered. */
export function recordSearch(term: string, hits: number): void {
  const list = readSearches();
  const next = rememberSearch(list, term, hits);
  // Refused — an empty term, or a search that found nothing. `rememberSearch`
  // hands the same array straight back, so there is nothing to write and no
  // reason to wake the row standing on this page.
  if (next === list) return;
  write(next);
}

export function clearSearches(): void {
  write([]);
}

/**
 * The list as this device has it, plus whether it has been read yet.
 *
 * `ready` exists because the first render happens on the server, where there
 * is no storage: a row that drew itself empty and then filled in would flash,
 * and one that drew itself full would be markup React throws away. The row
 * waits.
 */
export function useRecentSearches(): { list: RecentSearches; ready: boolean } {
  const [list, setList] = useState<RecentSearches>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setList(readSearches());
    sync();
    setReady(true);

    window.addEventListener(CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { list, ready };
}
