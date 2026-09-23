import { clockDayLabel, clockLabel, dayMonth, toVnIso } from "./datetime";
import { LEX, issueNo } from "./lexicon";
import { vnd } from "./money";
import { RETURN_WINDOW_DAYS } from "./shipping";

/**
 * "Thông báo" — computed, never delivered.
 *
 * There is no server and no push channel, so this screen cannot LIST what
 * arrived; it can only work out, from what this device already knows, which
 * things would have been worth telling somebody. Five sources, every one of
 * them a fact already on the machine:
 *
 *   1. an order of theirs still waiting for a transfer,
 *   2. a reminder they set for an issue that has not opened,
 *   3. a discount code within five days of expiring,
 *   4. an order that arrived, and the return window that opened with it,
 *   5. an issue that has closed.
 *
 * Nothing else is invented. There is no "welcome" item, no "we miss you",
 * no marketing — those would be the one thing on the screen nobody could
 * check, and the screen says as much in its own note.
 *
 * Every function here is pure and takes its inputs whole, the same split the
 * cart uses (QĐ-9): the React shell in
 * `components/account/NotificationsScreen.tsx` gathers the five sources,
 * this file decides what they say and how they are grouped.
 *
 * TWO INSTANTS PER ITEM, and the difference matters:
 *
 *   · `at` is the moment the item is ABOUT — a deadline, an opening hour,
 *     the minute a parcel was handed over. It is what the row prints.
 *   · `since` is the moment the item ARRIVED, which is what decides which
 *     group it falls in and whether it is still unread.
 *
 * They are the same instant for most sources. They differ for the two that
 * are about the future: a reminder arrives when it is set and is about a
 * day in October; a code's expiry notice arrives five days before the end
 * and is about the end. Without the split, both would sort into a group
 * that has not happened yet.
 */

/** Which of the five a row came from. */
export type NotifSource = "order-wait" | "reminder" | "promo" | "delivered" | "issue-closed";

export interface NotifAction {
  /** Shown as-is. */
  text: string;
  href: string;
}

export interface Notif {
  /**
   * Stable across renders and across reloads, because it is the key "đã đọc"
   * is stored under. Source, then what it is about, then the instant — so a
   * rescheduled issue or a re-placed order is a NEW item rather than one
   * silently inheriting a tick.
   */
  id: string;
  source: NotifSource;
  /** The instant the row is about. */
  at: string;
  /** When it arrived. Groups and unread are decided by this one. */
  since: string;
  /** Shown as-is. */
  title: string;
  /** Shown as-is. */
  body: string;
  action?: NotifAction;
  read: boolean;
}

/** How early a code's expiry is worth mentioning. */
export const PROMO_NOTICE_DAYS = 5;

const DAY_MS = 86_400_000;

// ───────────────────────────────────────────────────────────────── the inputs
export interface NotifOrder {
  code: string;
  /** Only three of the states produce anything: waiting, delivered, the rest. */
  state: string;
  placedAt: string;
  totalVnd: number;
  /** When an unpaid transfer runs out. Present only while one is owed. */
  dueAt?: string;
  deliveredAt?: string;
}

export interface NotifReminder {
  no: number;
  opensAt: string;
  /** Style names already revealed, shown as-is. */
  teasers: string[];
}

export interface NotifPromo {
  code: string;
  endsAt: string;
  /** "Giảm 10%, tối đa 150.000₫" — from `lib/promotions.ts`. */
  offer: string;
  /** "Đơn từ 500.000₫ · còn 82 lượt". */
  terms: string;
  /** Which issue it runs with, when it runs with one. */
  issueNo?: number;
}

export interface NotifIssue {
  no: number;
  closesAt: string;
  soldUnits: number;
  cutUnits: number;
}

/** The three switches on the screen. A source turned off is not counted. */
export interface NotifToggles {
  reminder: boolean;
  orders: boolean;
  promo: boolean;
}

export interface NotifInput {
  now: Date;
  orders: NotifOrder[];
  reminders: NotifReminder[];
  promos: NotifPromo[];
  issues: NotifIssue[];
  toggles: NotifToggles;
  /** Ids already ticked, from `brand.notif.read`. */
  read: string[];
}

// ─────────────────────────────────────────────────────────────── the building
export function notifications(input: NotifInput): Notif[] {
  const { now, toggles } = input;
  const nowMs = now.getTime();
  const read = new Set(input.read);
  const out: Notif[] = [];

  const push = (n: Omit<Notif, "read">) => {
    // An item whose arrival is still ahead has not arrived. This is the only
    // gate: nothing is filtered by age, because "Cũ hơn" is a group, not a
    // reason to hide something.
    if (Date.parse(n.since) > nowMs) return;
    out.push({ ...n, read: read.has(n.id) });
  };

  if (toggles.orders) {
    for (const o of input.orders) {
      if (o.state === "AWAITING_TRANSFER" && o.dueAt) {
        push({
          id: `order-wait:${o.code}:${o.dueAt}`,
          source: "order-wait",
          at: o.placedAt,
          since: o.placedAt,
          title: `${o.code} chờ chuyển khoản`,
          body:
            `Giữ hàng tới ${clockLabel(o.dueAt)} · ${dayMonth(o.dueAt)}. ` +
            `Số tiền ${vnd(o.totalVnd)}, nội dung ${o.code}.`,
          action: { text: "Xem đơn", href: `/account/orders/${o.code}` },
        });
      }

      if (o.state === "DELIVERED" && o.deliveredAt) {
        const until = new Date(Date.parse(o.deliveredAt) + RETURN_WINDOW_DAYS * DAY_MS);
        push({
          id: `delivered:${o.code}:${o.deliveredAt}`,
          source: "delivered",
          at: o.deliveredAt,
          since: o.deliveredAt,
          title: `${o.code} đã giao`,
          body:
            `Nhận lúc ${clockLabel(o.deliveredAt)} · ${dayMonth(o.deliveredAt)}. ` +
            `Đổi trả trong ${RETURN_WINDOW_DAYS} ngày nếu chưa qua sử dụng, ` +
            `tới ${dayMonth(toVnIso(until))}.`,
          action: { text: "Xem đơn", href: `/account/orders/${o.code}` },
        });
      }
    }
  }

  if (toggles.reminder) {
    for (const r of input.reminders) {
      // A reminder for an issue that has already opened has done its job —
      // the issue itself is on the home page saying so.
      if (Date.parse(r.opensAt) <= nowMs) continue;
      const teased =
        r.teasers.length > 0
          ? ` ${r.teasers.length} mẫu ${r.teasers.join(" và ")} đã hé lộ.`
          : "";
      push({
        id: `reminder:${r.no}:${r.opensAt}`,
        source: "reminder",
        at: r.opensAt,
        // It became true the moment the reminder was set, and stays true
        // until the issue opens. Nothing records that minute, so this is
        // "now" — which is honest: the item is about something still ahead.
        since: toVnIso(now),
        title: `${LEX.t} ${issueNo(r.no)} mở ${clockDayLabel(r.opensAt)}`,
        body: `Nhắc đã đặt. Trang chủ hiện dải nhắc khi còn 2 giờ;${teased}`.trim(),
        action: { text: `Xem ${LEX.tl} ${issueNo(r.no)}`, href: "/#next" },
      });
    }
  }

  if (toggles.promo) {
    for (const p of input.promos) {
      const endsMs = Date.parse(p.endsAt);
      if (endsMs <= nowMs) continue;
      const daysLeft = Math.max(1, Math.ceil((endsMs - nowMs) / DAY_MS));
      if (daysLeft > PROMO_NOTICE_DAYS) continue;
      const withIssue =
        p.issueNo !== undefined ? ` cùng ${LEX.tl} ${issueNo(p.issueNo)}` : "";
      push({
        id: `promo:${p.code}:${p.endsAt}`,
        source: "promo",
        at: p.endsAt,
        // Five days before the end, which is a derived instant and therefore
        // the same one on every render.
        since: toVnIso(new Date(endsMs - PROMO_NOTICE_DAYS * DAY_MS)),
        title: `Mã ${p.code} còn ${daysLeft} ngày`,
        body:
          `${p.offer}. ${p.terms}. ` +
          `Hết hạn ${clockLabel(p.endsAt)} · ${dayMonth(p.endsAt)}${withIssue}.`,
      });
    }
  }

  for (const issue of input.issues) {
    if (Date.parse(issue.closesAt) > nowMs) continue;
    push({
      id: `issue-closed:${issue.no}:${issue.closesAt}`,
      source: "issue-closed",
      at: issue.closesAt,
      since: issue.closesAt,
      title: `${LEX.t} ${issueNo(issue.no)} đã đóng`,
      body: `${issue.soldUnits} / ${issue.cutUnits} chiếc đã bán · ${dayMonth(issue.closesAt)}.`,
      action: {
        text: `Xem lại ${LEX.tl} ${issueNo(issue.no)}`,
        href: `/so/${issue.no}`,
      },
    });
  }

  // Newest arrival first, and the id breaks a tie so two items stamped on the
  // same minute do not swap places between renders.
  return out.sort(
    (a, b) =>
      Date.parse(b.since) - Date.parse(a.since) || a.id.localeCompare(b.id),
  );
}

export function unreadCount(list: Notif[]): number {
  return list.reduce((n, item) => n + (item.read ? 0 : 1), 0);
}

/** Every id currently on screen — what "Đánh dấu đã đọc" writes. */
export function allIds(list: Notif[]): string[] {
  return list.map((n) => n.id);
}

// ──────────────────────────────────────────────────────────────── the groups
export type NotifGroupKey = "today" | "week" | "older";

export interface NotifGroup {
  key: NotifGroupKey;
  /** Shown as-is. */
  title: string;
  /** "20/09" beside "Hôm nay", and nothing beside the other two. */
  meta?: string;
  items: Notif[];
}

const GROUP_TITLE: Record<NotifGroupKey, string> = {
  today: "Hôm nay",
  week: "Tuần này",
  older: "Cũ hơn",
};

/**
 * Midnight at the start of today, on the Vietnamese wall clock.
 *
 * Read off the TEXT of `toVnIso`, not off `Date` arithmetic: the server and
 * the browser can sit in different zones, and "today" has to mean the same
 * day on both or a row jumps between groups on hydration.
 */
export function startOfToday(now: Date): string {
  return `${toVnIso(now).slice(0, 10)}T00:00:00+07:00`;
}

export function groupOf(notif: Notif, now: Date): NotifGroupKey {
  const since = Date.parse(notif.since);
  const dayStart = Date.parse(startOfToday(now));
  if (since >= dayStart) return "today";
  if (since >= dayStart - 7 * DAY_MS) return "week";
  return "older";
}

/** The three groups, in order, with the empty ones left out. */
export function groupNotifications(list: Notif[], now: Date): NotifGroup[] {
  const keys: NotifGroupKey[] = ["today", "week", "older"];
  return keys
    .map((key): NotifGroup => {
      const items = list.filter((n) => groupOf(n, now) === key);
      return {
        key,
        title: GROUP_TITLE[key],
        ...(key === "today" ? { meta: dayMonth(toVnIso(now)) } : {}),
        items,
      };
    })
    .filter((g) => g.items.length > 0);
}

/**
 * "18:50" today, "19/09" any other day.
 *
 * The hour is only useful while it is still today; a week later the date is
 * what places it. An item about something still ahead prints the date it is
 * about, which is the only number on it worth reading.
 */
export function stampLabel(notif: Notif, now: Date): string {
  const key = groupOf(notif, now);
  if (key !== "today") return dayMonth(notif.since);
  const ahead = Date.parse(notif.at) > now.getTime();
  return ahead ? dayMonth(notif.at) : clockLabel(notif.since);
}

// ─────────────────────────────────────────────────────────────────── storage
/**
 * Which ids have been ticked, on THIS device.
 *
 * A list of ids and not a timestamp: an item's id already carries the
 * instant it is about, so a new deadline or a rescheduled opening produces a
 * new id and comes back unread by itself.
 */
export const NOTIF_READ_STORAGE_KEY = "brand.notif.read";
const SCHEMA_VERSION = 1;

/** Capped: ids accumulate, and a browser is not a ledger. */
export const NOTIF_READ_MAX = 200;

export function serializeNotifRead(ids: string[]): string {
  return JSON.stringify({ v: SCHEMA_VERSION, ids: ids.slice(-NOTIF_READ_MAX) });
}

export function parseNotifRead(raw: string | null): string[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    (parsed as { v?: unknown }).v !== SCHEMA_VERSION
  ) {
    return [];
  }

  const ids = (parsed as { ids?: unknown }).ids;
  if (!Array.isArray(ids)) return [];

  const seen = new Set<string>();
  for (const v of ids) {
    if (typeof v === "string" && v) seen.add(v);
  }
  return [...seen].slice(-NOTIF_READ_MAX);
}

/** Tick these, keeping whatever was ticked before. */
export function markRead(stored: string[], ids: string[]): string[] {
  return [...new Set([...stored, ...ids])].slice(-NOTIF_READ_MAX);
}
