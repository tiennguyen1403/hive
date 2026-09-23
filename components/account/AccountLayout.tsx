"use client";

import type { Customer } from "@/data/types";
import { AccountRail, type RailKey } from "./AccountRail";

export type { RailKey };

interface AccountLayoutProps {
  /** Nobody signed in means no rail, and the screen keeps its plain column. */
  me: Customer | null;
  active?: RailKey;
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
 */
export function AccountLayout({ me, active, children }: AccountLayoutProps) {
  if (!me) {
    return <div className="wrap3">{children}</div>;
  }

  return (
    <div className="wrap3">
      <div className="acct3">
        <AccountRail me={me} {...(active ? { active } : {})} />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
