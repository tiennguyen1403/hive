"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LATER_STORAGE_KEY,
  addLater,
  parseLater,
  removeLater,
  serializeLater,
  type LaterLine,
  type LaterList,
} from "@/lib/later";

/**
 * "Giữ lại sau", in the browser.
 *
 * A hook rather than a context: one screen reads this list — the cart — and
 * a provider above the router would be a third thing for every other route
 * to carry. All the rules are pure functions in `lib/later.ts`; this is the
 * plumbing around them, and it is the same plumbing the cart and the placed
 * orders already use.
 *
 * Read after mount, never during render: the first pass happens on the
 * server, where there is no storage, and a list that drew itself empty
 * before storage answered would flash. `ready` is what lets the screen tell
 * "nothing put aside" from "not asked yet".
 */

/** Same-tab listeners; `storage` only fires in the OTHER tabs. */
const CHANGED = "brand:later";

function read(): LaterList {
  try {
    return parseLater(window.localStorage.getItem(LATER_STORAGE_KEY));
  } catch {
    // Private mode, a full quota, storage disabled by policy. A list that
    // cannot be remembered still works for this visit.
    return [];
  }
}

function write(list: LaterList) {
  try {
    window.localStorage.setItem(LATER_STORAGE_KEY, serializeLater(list));
  } catch {
    // Losing persistence must not break the page in front of them.
  }
  window.dispatchEvent(new CustomEvent(CHANGED));
}

export interface LaterApi {
  list: LaterList;
  ready: boolean;
  keep: (line: LaterLine) => void;
  drop: (key: string) => void;
}

export function useLater(): LaterApi {
  const [list, setList] = useState<LaterList>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setList(read());
    sync();
    setReady(true);

    window.addEventListener(CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Written through storage rather than into state directly: the write
  // fires the event, and the event is what keeps a second tab — and the
  // listener above — in step with what this one just did.
  const keep = useCallback((line: LaterLine) => {
    const next = addLater(read(), line);
    setList(next);
    write(next);
  }, []);

  const drop = useCallback((key: string) => {
    const next = removeLater(read(), key);
    setList(next);
    write(next);
  }, []);

  return { list, ready, keep, drop };
}
