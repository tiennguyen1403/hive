"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import {
  CART_STORAGE_KEY,
  addToCart,
  cartUnits,
  parseCart,
  removeLine,
  restoreLine,
  serializeCart,
  setLineQty,
  swapLine,
  type Cart,
  type CartLine,
} from "@/lib/cart";
import type { ColorKey, Size } from "@/data/types";
import { forgetRetiredKeys } from "@/lib/device-storage";
import {
  CART_PROMO_STORAGE_KEY,
  normalisePromoCode,
  parsePromoCode,
  serializePromoCode,
} from "@/lib/promotions";

interface CartApi {
  cart: Cart;
  /** Pieces, not lines. */
  units: number;
  /**
   * False until the stored cart has been read. Server and first client render
   * both show an empty cart; anything that would look wrong while empty waits
   * on this rather than guessing.
   */
  ready: boolean;
  add: (line: CartLine) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  /** "Hoàn tác" after a removal: the line back in its place, as it was (`restoreLine`). */
  restore: (line: CartLine, at: number) => void;
  /** "Chọn size khác": the line takes another colour and size in its own place (`swapLine`). */
  swap: (key: string, color: ColorKey, size: Size) => void;
  clear: () => void;
  /**
   * The discount code typed on the cart screen, as a CODE and nothing more.
   *
   * It rides with the cart rather than in the URL because it is applied on
   * one screen and paid for on another, and because a reload in between
   * must not quietly drop it. Only the code is kept: what it is worth is
   * recomputed from `data/promotions.ts` on every render, so a promotion
   * that expires mid-session stops applying instead of being remembered as
   * money off.
   */
  promoCode: string | null;
  setPromoCode: (code: string | null) => void;
}

const CartCtx = createContext<CartApi | null>(null);

/**
 * The cart's one copy, and the only thing in the app that touches storage.
 *
 * All the rules live in `lib/cart.ts` as pure functions. This component is
 * the plumbing around them: read once on mount, write on every change, and
 * listen for other tabs.
 *
 * It deliberately starts empty rather than trying to read storage during
 * render. The server has no `localStorage`, so a render that reached for it
 * would produce different HTML on the two sides and React would throw the
 * whole tree away. Starting empty and filling in after mount costs one paint
 * and is the only version that is correct on both.
 *
 * The same mount forgets the keys the app has retired (round v4 slice 5,
 * `lib/device-storage.ts`), from both storages: this provider sits in the
 * root layout on every page and already reads storage once per visit.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const catalog = useCatalog();
  const [cart, setCart] = useState<Cart>([]);
  const [promoCode, setCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    forgetRetiredKeys(() => window.localStorage);
    forgetRetiredKeys(() => window.sessionStorage);
    try {
      setCart(parseCart(window.localStorage.getItem(CART_STORAGE_KEY)));
      setCode(parsePromoCode(window.localStorage.getItem(CART_PROMO_STORAGE_KEY)));
    } catch {
      // Private mode, a full quota, storage disabled by policy. A cart that
      // cannot be remembered is still a cart that works for this visit.
    }
    setReady(true);
  }, []);

  /**
   * The write is gated on `ready`, a STATE value, not on a ref.
   *
   * With a ref the guard flips synchronously inside the read effect, so the
   * write effect — which runs in the same commit — sees "loaded" while
   * `cart` is still the empty starting value, and saves that empty value
   * over what was in storage. It usually self-heals on the next render, but
   * a navigation inside that window makes the empty write the one that
   * survives. `ready` lands in the same batch as the data, so the write
   * effect first runs on a commit that already has both.
   */
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(cart));
      window.localStorage.setItem(CART_PROMO_STORAGE_KEY, serializePromoCode(promoCode));
    } catch {
      // Same: losing persistence must not break the page in front of them.
    }
  }, [cart, promoCode, ready]);

  // A drop closes while people have several tabs open — the product page in
  // one, the cart in another. Without this the two disagree until a reload.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === CART_PROMO_STORAGE_KEY) {
        setCode(parsePromoCode(e.newValue));
        return;
      }
      if (e.key !== CART_STORAGE_KEY) return;
      setCart(parseCart(e.newValue));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback(
    (line: CartLine) => setCart((c) => addToCart(catalog, c, line)),
    [catalog],
  );
  const setQty = useCallback(
    (key: string, qty: number) => setCart((c) => setLineQty(catalog, c, key, qty)),
    [catalog],
  );
  const remove = useCallback((key: string) => setCart((c) => removeLine(c, key)), []);
  const restore = useCallback((line: CartLine, at: number) => setCart((c) => restoreLine(c, line, at)), []);
  const swap = useCallback(
    (key: string, color: ColorKey, size: Size) => setCart((c) => swapLine(catalog, c, key, color, size)),
    [catalog],
  );
  // An order that has been placed takes its discount with it. Leaving the
  // code behind would apply it again to the next basket, which is not what
  // a one-order code means.
  const clear = useCallback(() => {
    setCart([]);
    setCode(null);
  }, []);
  const setPromoCode = useCallback((code: string | null) => {
    setCode(code === null ? null : normalisePromoCode(code) || null);
  }, []);

  const value = useMemo<CartApi>(
    () => ({
      cart,
      units: cartUnits(cart),
      ready,
      add,
      setQty,
      remove,
      restore,
      swap,
      clear,
      promoCode,
      setPromoCode,
    }),
    [cart, ready, add, setQty, remove, restore, swap, clear, promoCode, setPromoCode],
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
