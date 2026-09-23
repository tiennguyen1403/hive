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
  serializeCart,
  setLineQty,
  type Cart,
  type CartLine,
} from "@/lib/cart";
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
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const catalog = useCatalog();
  const [cart, setCart] = useState<Cart>([]);
  const [promoCode, setCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
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
      clear,
      promoCode,
      setPromoCode,
    }),
    [cart, ready, add, setQty, remove, clear, promoCode, setPromoCode],
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
