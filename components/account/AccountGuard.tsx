"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Customer } from "@/data/types";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { AccountLayout, type RailKey } from "./AccountLayout";
import { useSession } from "./SessionContext";

/**
 * Everything behind the account door.
 *
 * The session lives in `localStorage`, so the server cannot know who is
 * asking and the check has to happen here. Two things it must not do:
 *
 * · Redirect before storage has been read. `ready` is false for one paint,
 *   and bouncing on that paint throws a signed-in person out of their own
 *   account on every reload.
 * · Render the page under the redirect. `router.replace` is not instant, and
 *   an order history that flashes up before it fires has still been shown.
 *
 * The sign-in page is told where to come back to, so the trip is a detour
 * rather than a dead end.
 *
 * It must also not fight the sign-out button. Pressing "Đăng xuất" clears
 * the session and sends the shopper home; without `wasSignedIn` below, this
 * effect saw `me` vanish on the very same commit and raced the handler to
 * the router — the last `replace` won, and signing out landed on a sign-in
 * form asking to come back to the account just left. A session that was
 * HERE and is gone was dismissed on purpose; whoever dismissed it owns
 * where to go next.
 */
export function AccountGuard({
  title,
  active,
  children,
}: {
  /** The heading the waiting screen carries, so the page is never untitled. */
  title: string;
  /** Which rail item this screen is behind. */
  active?: RailKey;
  children: (me: Customer) => React.ReactNode;
}) {
  const { me, ready } = useSession();
  const router = useRouter();
  const path = usePathname();

  const wasSignedIn = useRef(false);
  if (me) wasSignedIn.current = true;

  useEffect(() => {
    if (ready && !me && !wasSignedIn.current) {
      router.replace(`/sign-in?next=${encodeURIComponent(path)}`);
    }
  }, [ready, me, router, path]);

  if (!ready || !me) {
    return (
      <ShopFrame>
        <div className="wrap3">
          <div className="pghead">
            <h1>{title}</h1>
            <span className="meta">
              {!ready
                ? "đang mở tài khoản…"
                : wasSignedIn.current
                  ? "đang đăng xuất…"
                  : "đang chuyển tới trang đăng nhập…"}
            </span>
          </div>
        </div>
      </ShopFrame>
    );
  }

  return (
    <ShopFrame>
      <AccountLayout me={me} {...(active ? { active } : {})}>
        {children(me)}
      </AccountLayout>
    </ShopFrame>
  );
}
