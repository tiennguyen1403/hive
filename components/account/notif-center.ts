"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlacedOrders } from "@/components/shop/placed-order";
import { usePrefs } from "@/components/shop/prefs";
import { useReminders } from "@/components/shop/reminders";
import { useSimOverlay } from "@/components/shop/sim-store";
import { fixtureOrdersOf, type Me } from "@/lib/me";
import { teasersIn, type Catalog } from "@/lib/catalog";
import { shopOrders } from "@/lib/admin-sim";
import { effectiveOrder } from "@/lib/customer-orders";
import { dropState } from "@/lib/drop";
import { dropSummary } from "@/lib/inventory";
import {
  NOTIF_READ_STORAGE_KEY,
  allIds,
  markRead,
  notifications,
  parseNotifRead,
  serializeNotifRead,
  unreadCount,
  type Notif,
  type NotifIssue,
  type NotifOrder,
  type NotifPromo,
  type NotifReminder,
} from "@/lib/notifications";
import { deviceOrdersOf, deviceState } from "@/lib/order-rows";
import { orderTotalVnd } from "@/lib/orders";
import { transferDeadlineIso } from "@/lib/placed-order";
import { livePromotions, promoOfferLabel, promoTermsLabel } from "@/lib/promotions";
import { demoNow } from "@/lib/clock";

/**
 * The five sources, gathered from this device, and the list they produce.
 *
 * All the deciding lives in `lib/notifications.ts`, which is pure and
 * tested; this is the shell that reads storage and the fixtures (QĐ-9, the
 * same split the cart uses). It is a hook rather than a provider because
 * exactly two screens need it — the rail's unread dot and the notifications
 * page — and a sixth context around the whole router would cost every other
 * route a re-render.
 *
 * NOTHING HERE IS ANNOUNCED THAT DID NOT HAPPEN. Every item is arithmetic
 * over an order, a reminder, a code or an issue that already exists on this
 * machine; there is no server pushing anything, and the screen says so.
 */
const CHANGED = "brand:notif-read";

function readIds(): string[] {
  try {
    return parseNotifRead(window.localStorage.getItem(NOTIF_READ_STORAGE_KEY));
  } catch {
    // A device that cannot remember still gets a working screen this visit.
    return [];
  }
}

function writeIds(ids: string[]): void {
  try {
    window.localStorage.setItem(NOTIF_READ_STORAGE_KEY, serializeNotifRead(ids));
  } catch {
    // Losing persistence must not break the screen in front of them.
  }
  window.dispatchEvent(new CustomEvent(CHANGED));
}

export interface NotifCenter {
  list: Notif[];
  unread: number;
  /** Every store has answered. Before that the screen shows nothing rather
   *  than a count it would have to correct. */
  ready: boolean;
  markAllRead: () => void;
}

export function useNotifCenter(catalog: Catalog, me: Me | null): NotifCenter {
  const { orders: placed, ready: placedReady } = usePlacedOrders();
  const { list: reminders, ready: remindersReady } = useReminders();
  const { prefs, ready: prefsReady } = usePrefs();
  const { sim, ready: simReady } = useSimOverlay();
  const [read, setRead] = useState<string[]>([]);
  const [readReady, setReadReady] = useState(false);

  useEffect(() => {
    const sync = () => setRead(readIds());
    sync();
    setReadReady(true);

    window.addEventListener(CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const ready = placedReady && remindersReady && prefsReady && simReady && readReady;

  const list = useMemo<Notif[]>(() => {
    if (!ready || !me) return [];
    const now = demoNow();

    // The shopper's own orders, from both places they can live. The overlay
    // is read for ONE thing only: an order they cancelled themselves.
    const mine = shopOrders(fixtureOrdersOf(me), sim).map((o) =>
      effectiveOrder(o, now),
    );
    const fixtures: NotifOrder[] = mine.map((o) => ({
      code: o.code,
      state: o.status.state,
      placedAt: o.placedAt,
      totalVnd: orderTotalVnd(o),
      ...(o.status.state === "AWAITING_TRANSFER" ? { dueAt: o.status.dueAt } : {}),
      ...(o.status.state === "DELIVERED" ? { deliveredAt: o.status.deliveredAt } : {}),
    }));

    const onDevice: NotifOrder[] = deviceOrdersOf(me.id, placed).map((p) => ({
      code: p.code,
      state: deviceState(p, now),
      placedAt: p.placedAt,
      totalVnd: p.totalVnd,
      ...(deviceState(p, now) === "AWAITING_TRANSFER"
        ? { dueAt: transferDeadlineIso(p.placedAt) }
        : {}),
    }));

    const asked: NotifReminder[] = reminders
      .map((no) => catalog.dropByNo.get(no))
      .filter((d): d is NonNullable<typeof d> => d !== undefined)
      .map((d) => ({
        no: d.no,
        opensAt: d.opensAt,
        teasers: teasersIn(catalog, d.no).map((t) => t.name),
      }));

    const promos: NotifPromo[] = livePromotions(catalog, now).map((p) => ({
      code: String(p.code),
      endsAt: p.endsAt,
      offer: promoOfferLabel(p),
      terms: promoTermsLabel(p),
      // Which issue a code runs with is not a field on the promotion — it is
      // the issue whose window contains its end. Left off when none does,
      // rather than guessed.
      ...issueOf(catalog, p.endsAt),
    }));

    const issues: NotifIssue[] = catalog.drops
      .filter((d) => dropState(d, now) === "CLOSED")
      .map((d) => {
        const summary = dropSummary(catalog, d.no);
        return {
          no: d.no,
          closesAt: d.closesAt,
          soldUnits: summary.soldUnits,
          cutUnits: summary.cutUnits,
        };
      });

    return notifications({
      now,
      orders: [...fixtures, ...onDevice],
      reminders: asked,
      promos,
      issues,
      toggles: {
        reminder: prefs.dropOpen,
        orders: prefs.notifOrders,
        promo: prefs.notifPromo,
      },
      read,
    });
  }, [catalog, ready, me, placed, reminders, prefs, sim, read]);

  const markAllRead = useCallback(() => {
    const next = markRead(readIds(), allIds(list));
    setRead(next);
    writeIds(next);
  }, [list]);

  return { list, unread: unreadCount(list), ready, markAllRead };
}

/** Which issue's window an instant falls inside, when one does. */
function issueOf(catalog: Catalog, iso: string): { issueNo?: number } {
  const t = Date.parse(iso);
  const drop = catalog.drops.find(
    (d) => t > Date.parse(d.opensAt) && t <= Date.parse(d.closesAt),
  );
  return drop ? { issueNo: drop.no } : {};
}
