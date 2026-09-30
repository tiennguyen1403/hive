"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { useMe } from "@/components/account/MeContext";
import { useMyState } from "@/components/account/MyStateContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Order } from "@/data/types";
import { effectiveOrder } from "@/lib/customer-orders";
import {
  INBOX_READ_COOKIE,
  bySwitches,
  inboxItems,
  isUnread,
  keptMarks,
  parseInboxRead,
  readMark,
  serializeInboxRead,
  type InboxItem,
} from "@/lib/feed-inbox";
import { FeedIcon } from "./icon/FeedIcon";
import { useNow } from "./now";

/** A row as the page draws it. */
export interface InboxRow extends InboxItem {
  /** Drawn unread: an ink icon and a bold title (`notifications.js`: `is-unread`). */
  unread: boolean;
}

interface InboxApi {
  /** The rows the four switches let through, newest first. */
  rows: InboxRow[];
  /** How many are unread: the bell's number. */
  unread: number;
  /**
   * A row opened: read from now on. The page keeps drawing it as it was, as
   * the mock does while it leaves for the row's page (`quiet`); the bell
   * counts it read at once.
   */
  markRead: (key: string) => void;
  /** "Đánh dấu đã đọc": every row on the page. */
  markAllRead: () => void;
}

const Ctx = createContext<InboxApi | null>(null);

/** Written on this window whenever the marks change, so every reader looks again. */
const CHANGED = "hive:inbox-read";

/** Longer than the two days a row stays unread; the marks inside are pruned on every write anyway. */
const MAX_AGE_S = 30 * 24 * 3600;

/**
 * Where the marks live when the browser keeps no cookie: this visit only, as
 * the mock's store does when it cannot write (`feed.js`: `store`).
 */
let memory: string | null = null;

function documentCookie(): string {
  const found = document.cookie.split("; ").find((c) => c.startsWith(`${INBOX_READ_COOKIE}=`));
  return found ? found.slice(INBOX_READ_COOKIE.length + 1) : "";
}

function readCookie(): string {
  return memory ?? documentCookie();
}

function writeCookie(value: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${INBOX_READ_COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE_S}; SameSite=Lax${secure}`;
  if (documentCookie() !== value) memory = value;
  window.dispatchEvent(new Event(CHANGED));
}

/** Another tab may have read something: look again when this one comes back. */
function subscribe(changed: () => void): () => void {
  window.addEventListener(CHANGED, changed);
  window.addEventListener("focus", changed);
  document.addEventListener("visibilitychange", changed);
  return () => {
    window.removeEventListener(CHANGED, changed);
    window.removeEventListener("focus", changed);
    document.removeEventListener("visibilitychange", changed);
  };
}

const NONE: ReadonlySet<string> = new Set();

/**
 * The account's inbox for the whole Feed frame (round v4 slice 4a): built once
 * from the account's orders (read by the frame on the server), the catalogue,
 * and what the account keeps (`MyStateProvider`: the saved styles, the
 * reminders, the four switches), at the frame's render instant, since the
 * account was made and within the last `INBOX_WINDOW_DAYS` — so the bell on
 * every Feed page and the list on Thông báo count the same rows.
 *
 * Which rows were read is kept on this device (`INBOX_READ_COOKIE`), a cookie
 * the frame read on the server (`read`), so the first HTML already has the
 * right bell and the right bold rows; after that the browser's own copy is
 * the one read.
 */
export function InboxProvider({
  orders,
  read,
  children,
}: {
  orders: readonly Order[];
  /** The cookie as the server read it for this render. */
  read: string;
  children: React.ReactNode;
}) {
  const catalog = useCatalog();
  const me = useMe();
  const { state } = useMyState();
  const now = useNow();
  const raw = useSyncExternalStore(subscribe, readCookie, () => read);
  const [held, setHeld] = useState<ReadonlySet<string>>(NONE);

  const accountId = me?.id ?? "";
  const marks = useMemo(() => (accountId ? parseInboxRead(raw, accountId) : NONE), [raw, accountId]);
  const all = useMemo(
    () =>
      state
        ? inboxItems({
            catalog,
            orders: orders.map((o) => effectiveOrder(o, now)),
            favorites: state.favorites,
            reminders: state.reminders,
            joinedAt: me?.joinedAt ?? null,
            now,
          })
        : [],
    [catalog, orders, state, me, now],
  );
  const shown = useMemo(() => (state ? bySwitches(all, state.notify) : []), [all, state]);

  // A write starts from the cookie as it is now, not as this render saw it, so two quick presses both count.
  const write = useCallback(
    (keys: readonly string[]) => {
      if (!accountId) return;
      const next = new Set(parseInboxRead(readCookie(), accountId));
      for (const k of keys) next.add(readMark(k));
      writeCookie(serializeInboxRead(accountId, keptMarks(next, all, now)));
    },
    [accountId, all, now],
  );

  const value = useMemo<InboxApi>(() => {
    const rows = shown.map((i) => ({ ...i, unread: isUnread(i, now, marks) || held.has(i.key) }));
    return {
      rows,
      unread: shown.filter((i) => isUnread(i, now, marks)).length,
      markRead: (key) => {
        const row = shown.find((i) => i.key === key);
        if (!row || !isUnread(row, now, marks)) return;
        setHeld((h) => new Set(h).add(key));
        write([key]);
      },
      markAllRead: () => {
        setHeld(NONE);
        write(shown.filter((i) => isUnread(i, now, marks)).map((i) => i.key));
      },
    };
  }, [shown, now, marks, held, write]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The account's inbox. A missing provider is a bug and says so. */
export function useInbox(): InboxApi {
  const inbox = useContext(Ctx);
  if (!inbox) throw new Error("useInbox needs an <InboxProvider> above it (FeedFrame renders one)");
  return inbox;
}

/**
 * "Đánh dấu đã đọc" (`notifications.js`: `readAll`), while anything on the
 * page is unread: in the phone's bar, and beside the title from 900px
 * (`b-desk-only`). The focus then rests on the page's title, as the mock's
 * does, since the button itself has gone.
 */
export function ReadAllButton({ className }: { className?: string }) {
  const { rows, markAllRead } = useInbox();
  if (!rows.some((r) => r.unread)) return null;
  return (
    <button
      className={className ? `link ${className}` : "link"}
      type="button"
      onClick={() => {
        markAllRead();
        window.requestAnimationFrame(() =>
          document.querySelector<HTMLElement>("[data-ui='feed'] .b-title")?.focus({ preventScroll: true }),
        );
      }}
    >
      <FeedIcon name="checks" />
      Đánh dấu đã đọc
    </button>
  );
}
