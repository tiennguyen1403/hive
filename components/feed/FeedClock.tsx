"use client";

import { useEffect, useState } from "react";
import { demoNowMs } from "@/lib/clock";
import { countdownText } from "@/lib/feed-home";

interface FeedClockProps {
  /** The instant counted to: an issue's `opensAt` or `closesAt`. */
  until: string;
  /** The render instant (`useNowMs`), so the server and the hydrating client print the same first second. */
  now: number;
  /** A `<p>` where it stands alone (the story), a `<span>` inside a line. */
  tag?: "p" | "span";
}

/**
 * The Feed's countdown, "4 NGÀY 00:57:57", ticking every second as the mock's
 * clock does (`feed.js`: `tick`, `cells`). Every digit sits in a 1ch cell
 * (`.dg`) so the proportional figures change without the line jittering.
 *
 * It starts from the render instant and moves to the real clock after mount,
 * on the second boundary, recomputing from the deadline each time — a tab that
 * slept comes back right, not behind. At the deadline it stays at zero; the
 * page's state turns over on the next load, never under the shopper's thumb.
 */
export function FeedClock({ until, now, tag = "p" }: FeedClockProps) {
  const [text, setText] = useState(() => countdownText(until, now));

  useEffect(() => {
    const tick = () => setText(countdownText(until, demoNowMs()));
    tick();
    let every = 0;
    const first = window.setTimeout(() => {
      tick();
      every = window.setInterval(tick, 1000);
    }, 1000 - (demoNowMs() % 1000));
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, [until]);

  const Tag = tag;
  return (
    <Tag className="cd-big" role="timer">
      {text.split(/(\d)/).filter(Boolean).map((part, i) =>
        /^\d$/.test(part) ? (
          <span key={i} className="dg">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </Tag>
  );
}
