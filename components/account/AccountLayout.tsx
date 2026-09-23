"use client";

import type { Me } from "@/lib/me";
import { AccountRail, type RailKey } from "./AccountRail";

export type { RailKey };

interface AccountLayoutProps {
  /** Nobody signed in means no rail, and the screen keeps its plain column. */
  me: Me | null;
  /** Counted on the server — a Client Component cannot read the database. */
  addressCount?: number;
  children: React.ReactNode;
}

/**
 * The shape every account screen takes: the doors, then the screen.
 *
 * On a phone the doors are a row that scrolls above the content; from 900px
 * they are a 240px rail that stays put while the column beside it scrolls.
 * One component, one markup order, and the breakpoint does the rest
 * (`.acct3` in `account.css`).
 *
 * The v2 sub-bar is GONE from these screens. It said the page's title a
 * second time above a heading that already says it, and offered a back arrow
 * to a place the rail now lists. Each screen heads itself with `.pghead`,
 * like every other v3 screen in the shop.
 *
 * Signed out, this is a pass-through. The wishlist is readable without an
 * account — saving something is not a reason to demand one — and an empty
 * 240px column beside it would be a rail for nobody.
 *
 * Which door is lit is no longer a prop: `AccountRail` reads the path. Slice
 * B1 moved the frame into `app/account/layout.tsx`, and a layout cannot know
 * which of its children is rendering.
 */
export function AccountLayout({ me, addressCount, children }: AccountLayoutProps) {
  if (!me) {
    return <div className="wrap3">{children}</div>;
  }

  return (
    <div className="wrap3">
      <div className="acct3">
        <AccountRail me={me} {...(addressCount !== undefined ? { addressCount } : {})} />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
