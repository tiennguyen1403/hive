"use client";

import { useEffect, useState } from "react";
import {
  PLACED_ORDERS_KEY,
  addPlacedOrder,
  parsePlacedOrders,
  serializePlacedOrders,
  type PlacedOrder,
} from "@/lib/placed-order";

/** Same-tab listeners; `storage` only fires in the OTHER tabs. */
const CHANGED = "brand:orders";

export function readPlacedOrders(): PlacedOrder[] {
  try {
    return parsePlacedOrders(window.localStorage.getItem(PLACED_ORDERS_KEY));
  } catch {
    // A browser that refuses storage still gets a working checkout; the
    // confirmation screen just cannot be reopened later.
    return [];
  }
}

/** Checkout's one write. Returns the list as it now stands. */
export function writePlacedOrder(order: PlacedOrder): PlacedOrder[] {
  return updatePlacedOrders((list) => addPlacedOrder(list, order));
}

/**
 * Change what is stored, from what is stored.
 *
 * Added at v3 slice 4, for the one thing that happens to an order after it
 * is placed: the shopper cancels it. It re-reads before it writes rather
 * than trusting a list a component is holding — another tab may have added
 * an order since that render, and writing a stale array would drop it.
 */
export function updatePlacedOrders(
  update: (list: PlacedOrder[]) => PlacedOrder[],
): PlacedOrder[] {
  const next = update(readPlacedOrders());
  try {
    window.localStorage.setItem(PLACED_ORDERS_KEY, serializePlacedOrders(next));
  } catch {
    // Losing persistence must not break the screen in front of them.
  }
  window.dispatchEvent(new CustomEvent(CHANGED));
  return next;
}

/**
 * The orders placed on this device, newest first.
 *
 * Read after mount, never during render: the first pass happens on the
 * server, where there is no storage, and a list that drew itself empty
 * before storage answered would flash. `ready` is what lets a screen tell
 * "nothing placed here" from "not asked yet" — the same flag the wishlist
 * and the reminder use.
 */
export function usePlacedOrders(): { orders: PlacedOrder[]; ready: boolean } {
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setOrders(readPlacedOrders());
    sync();
    setReady(true);

    window.addEventListener(CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { orders, ready };
}
