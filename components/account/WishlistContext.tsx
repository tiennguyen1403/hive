"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ProductId } from "@/data/types";
import { toVnIso } from "@/lib/datetime";
import {
  WISHLIST_STORAGE_KEY,
  hasWish,
  parseWishlist,
  serializeWishlist,
  toggleWish,
  type Wishlist,
} from "@/lib/wishlist";
import { demoNow } from "@/lib/clock";

interface WishlistApi {
  list: Wishlist;
  ready: boolean;
  has: (id: ProductId) => boolean;
  toggle: (id: ProductId) => void;
}

const Ctx = createContext<WishlistApi | null>(null);

/**
 * Saved styles, one copy for the whole app.
 *
 * Kept apart from the session on purpose: saving something is not a reason
 * to demand an account. Somebody browsing a drop can keep a shortlist and
 * decide about signing in later, which is the order those two decisions
 * happen in.
 *
 * Same shape as the cart provider, including the `ready`-gated write below.
 */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Wishlist>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setList(parseWishlist(window.localStorage.getItem(WISHLIST_STORAGE_KEY)));
    } catch {
      // A device that cannot remember still gets a working list this visit.
    }
    setReady(true);
  }, []);

  /**
   * The write is gated on `ready`, a STATE value, not on a ref.
   *
   * With a ref the guard flips synchronously inside the read effect, so the
   * write effect — which runs in the same commit — sees "loaded" while
   * `list` is still the empty starting value, and saves that empty value
   * over what was in storage. It usually self-heals on the next render, but
   * a navigation inside that window makes the empty write the one that
   * survives. `ready` lands in the same batch as the data, so the write
   * effect first runs on a commit that already has both.
   */
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, serializeWishlist(list));
    } catch {
      // Losing persistence must not break the page in front of them.
    }
  }, [list, ready]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== WISHLIST_STORAGE_KEY) return;
      setList(parseWishlist(e.newValue));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // The stamp is read here and nowhere deeper: `toggleWish` takes `now` as an
  // argument like every other function in `lib/`, so it stays testable at its
  // edges. Saving is the only moment this date exists — nothing else in the
  // app knows when a style went on the list.
  const toggle = useCallback(
    (id: ProductId) => setList((l) => toggleWish(l, id, toVnIso(demoNow()))),
    [],
  );

  const value = useMemo<WishlistApi>(
    () => ({ list, ready, has: (id) => hasWish(list, id), toggle }),
    [list, ready, toggle],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist(): WishlistApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
