"use client";

import Link from "next/link";
import { useEffect } from "react";
import { clearSearches, recordSearch, useRecentSearches } from "@/components/shop/recent-searches";

/**
 * "Tìm gần đây · lưu trên thiết bị này · Xoá".
 *
 * Two jobs in one component, because they are two halves of the same fact:
 * it writes the term this page was opened with into the device's list, and
 * it renders the list back.
 *
 * A term that found NOTHING is not written (`hits`). The chips are offered
 * as a way back to something; one that replays an empty result is a dead
 * end the shopper already walked into once.
 *
 * Nothing is sent anywhere — there is no server in this build and no account
 * behind the shopper. The subtitle says exactly that rather than implying a
 * history that follows them between devices, and "Xoá" really empties it:
 * the row then disappears, because an empty "recent" list is not a state
 * worth a heading.
 *
 * It waits for `ready` before drawing. The first render happens on the
 * server, where there is no storage, so a row that guessed would either
 * flash or be markup React throws away.
 */
export function RecentSearches({ current, hits = 0 }: { current?: string; hits?: number }) {
  const { list, ready } = useRecentSearches();

  useEffect(() => {
    if (current) recordSearch(current, hits);
  }, [current, hits]);

  if (!ready || list.length === 0) return null;

  return (
    <section className="sec" aria-labelledby="h-recent">
      <div className="hd">
        <h2 id="h-recent">Tìm gần đây</h2>
        <span className="meta">lưu trên thiết bị này</span>
        <button type="button" className="more" onClick={clearSearches}>
          Xoá
        </button>
      </div>
      {/* `.wrapped`: the plain row scrolls sideways and would clip the 5px
          each chip reaches past its box for the 46px target. A wrapping row
          has nothing to scroll, so it gives the clip back. */}
      <div className="chips3 wrapped">
        {list.map((term) => (
          <Link key={term} className="chip3" href={`/search?q=${encodeURIComponent(term)}`}>
            {term}
          </Link>
        ))}
      </div>
    </section>
  );
}
