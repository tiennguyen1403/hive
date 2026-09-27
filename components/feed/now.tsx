"use client";

import { createContext, useContext, useMemo } from "react";

const Ctx = createContext<number | null>(null);

/**
 * The instant the page was rendered at, for every Feed component under it.
 *
 * What a Feed screen shows depends on the clock — which of the home page's
 * four moments the shop is in, whether a style is still on sale, what a
 * countdown starts from — and a client component rendered on the server and
 * again while hydrating must be handed the SAME instant, or React throws the
 * tree away. So the server reads the clock once (`demoNowMs`, `lib/clock.ts`)
 * and hands it down; a countdown then ticks from the real clock after mount.
 */
export function NowProvider({ now, children }: { now: number; children: React.ReactNode }) {
  return <Ctx.Provider value={now}>{children}</Ctx.Provider>;
}

/** The render instant, as milliseconds. */
export function useNowMs(): number {
  const now = useContext(Ctx);
  if (now === null) throw new Error("useNow needs a <NowProvider> above it (FeedFrame renders one)");
  return now;
}

/** The render instant, as a Date. */
export function useNow(): Date {
  const ms = useNowMs();
  return useMemo(() => new Date(ms), [ms]);
}
