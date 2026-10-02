import { colorLabel } from "@/data/colors";
import { SIZES, type Favorite, type NotifyKey, type NotifySwitches, type Order } from "@/data/types";
import { teasersIn, type Catalog } from "./catalog";
import { addDaysIso, addHoursIso, clockDayLabel, clockLabel, dayMonth, toVnIso } from "./datetime";
import { dropState, issueHref } from "./drop";
import { isLive } from "./feed";
import { returnUntil } from "./feed-account";
import { savedStyles } from "./feed-me";
import { pick, plural, pluralNoun, type Locale, type Pair } from "./i18n";
import { LOW_STOCK_AT, dropSummary, isFixed, lastSoldAtOf, onHandByColor, onHandOf } from "./inventory";
import { issueLabel } from "./lexicon";
import { productText, teaserText } from "./product-text";
import { livePromotions } from "./promotions";

/**
 * Thông báo (round v4 slice 4a): the signed-in account's inbox. The approved
 * mock writes its list by hand (`NOTIFICATIONS` in
 * `prototype/explore/shared/data.js`, read by `notifications.js`); here every
 * row is built from what the account and the shop already hold — the
 * account's orders and the moments they passed (slice B10), the issues and
 * their teasers' announcement (B12), the saved styles and when each colour
 * last sold (B12), the codes on offer, the reminders — in the mock's words.
 *
 * Nothing is announced that did not happen: a row exists once its moment has
 * come (`inboxItems` leaves out every row still ahead), and a moment nobody
 * recorded is left out rather than guessed. The list reaches back
 * `INBOX_WINDOW_DAYS`, and never to before the account was made. The mock has no row for a
 * cancelled order or for a COD order waiting for the shop's call, so neither
 * has one here.
 *
 * Pure and safe for the browser: the Feed frame builds the list once, for the
 * bell and for the page (`components/feed/inbox.tsx`). Every function that
 * depends on the time is handed `now`.
 *
 * In both languages since round v6 slice E3a: each row is written in both
 * (`Draft`), its sentence translated and its order code, style and teaser
 * names (through `productText`/`teaserText`) and numbers kept, and printed in
 * one. A row's `key` is always made of its VIETNAMESE title, so a row read in
 * one language stays read in the other and the bell counts the same.
 */

/** The five kinds, each with its glyph on the page (`notifications.js`: `KIND`). */
export type InboxKind = "order" | "drop" | "wishlist" | "promo" | "reminder";

export interface InboxItem {
  /**
   * Which row this is, the same on every render and on every device that
   * builds it: its moment and its title, as the mock keys it (`feed.js`:
   * `nkey`). A title that changes ("còn 2 chiếc" → "còn 1 chiếc") is news
   * again, and comes back unread. Always the Vietnamese title (round v6 slice
   * E3a), whatever language the row is printed in.
   */
  key: string;
  kind: InboxKind;
  /** When it happened, ISO on the Vietnamese clock (+07:00). */
  at: string;
  /** Shown as-is: "DH-2430 chờ chuyển khoản"; in English "DH-2430 awaiting transfer". */
  title: string;
  /** The line under it, or "" for none ("Đã nhận tiền DH-…" has none). */
  body: string;
  href: string;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

// ─────────────────────────────────────────────────────────── the moments the mock sets by hand, as rules
/**
 * "Mã DOT05 sắp hết hạn": the mock's code ends 20:00 25/09 and its row is
 * dated 09:00 24/09, 35 hours before. A code whose whole window is shorter
 * says so from the moment it starts.
 */
export const PROMO_NOTICE_HOURS = 35;

/**
 * "Số 06 mở sau 2 ngày": the mock's Số 06 opens 20:00 02/10 and the reminder
 * is dated 19:00 30/09, 49 hours before — "2 ngày" in the title is those
 * hours in whole days.
 */
export const REMINDER_NOTICE_HOURS = 49;
const REMINDER_DAYS = Math.floor(REMINDER_NOTICE_HOURS / 24);

/**
 * "Số 05 còn 2 ngày": dated two days before the issue closes, as the mock's
 * row is (20:00 23/09 for a close at 20:00 25/09).
 */
export const CLOSING_NOTICE_DAYS = 2;

/** A row is unread for two days after its moment, until it is opened or "Đánh dấu đã đọc" (`data.js`: `notifications`). */
export const UNREAD_FOR_MS = 2 * DAY_MS;

/**
 * How far back the inbox reaches: the mock's list spans about ten days, and
 * one built from everything the shop holds would run back to the first issue
 * (the main session's decision on slice 4a's review, 30/09). A row stays
 * while it is at most this many days old — one exactly 30 days old stays, a
 * minute older goes — and only if it happened once the account existed: a
 * row at the very minute the account was made stays, one before it goes.
 * Nothing on the page says so.
 */
export const INBOX_WINDOW_DAYS = 30;

// ─────────────────────────────────────────────────────────── the rows
/** A row before it is keyed and printed: its title and its line in both languages. */
interface Draft {
  kind: InboxKind;
  at: string;
  title: Pair;
  body: Pair;
  href: string;
}

/** No line under a row, in either language. */
const NO_BODY: Pair = { vi: "", en: "" };

/** An order as the inbox reads it: its status as the clock says (`effectiveOrder`), and the moments it recorded. */
export type InboxOrder = Pick<Order, "code" | "status" | "placedAt" | "moments">;

/**
 * An order's rows, one per step it has passed that has a moment of its own:
 * waiting for a transfer (a card order too, which pays by transfer) while it
 * waits, then the money received, the parcel handed over, the parcel
 * delivered. COD pays at the door, so it has no "Đã nhận tiền"; a parcel
 * already delivered no longer carries its waybill, so its "đang giao" has no
 * line under it. In English "DH-2430 awaiting transfer" · "Due 07:02, Tuesday
 * 22 Sep", "Payment received for DH-2430", "DH-2430 is on its way" ·
 * "Tracking no. VD-…", "DH-2430 delivered" · "Returns until 28 Sep".
 */
function orderRows(o: InboxOrder): Draft[] {
  const s = o.status;
  if (s.state === "CANCELLED") return [];
  const href = `/account/orders/${o.code}`;
  const rows: Draft[] = [];
  if (s.state === "AWAITING_TRANSFER") {
    rows.push({
      kind: "order",
      at: o.placedAt,
      title: { vi: `${o.code} chờ chuyển khoản`, en: `${o.code} awaiting transfer` },
      body: { vi: `Hạn ${clockDayLabel(s.dueAt)}`, en: `Due ${clockDayLabel(s.dueAt, "en")}` },
      href,
    });
  }
  const paidAt =
    s.state === "PAID" ? s.paidAt : s.state === "SHIPPING" || s.state === "DELIVERED" ? o.moments?.paidAt : undefined;
  if (paidAt) {
    rows.push({
      kind: "order",
      at: paidAt,
      title: { vi: `Đã nhận tiền ${o.code}`, en: `Payment received for ${o.code}` },
      body: NO_BODY,
      href,
    });
  }
  const shippedAt = s.state === "SHIPPING" ? s.shippedAt : s.state === "DELIVERED" ? o.moments?.shippedAt : undefined;
  if (shippedAt) {
    const waybill: Pair =
      s.state === "SHIPPING" && s.trackingCode
        ? { vi: `Mã vận đơn ${s.trackingCode}`, en: `Tracking no. ${s.trackingCode}` }
        : NO_BODY;
    rows.push({
      kind: "order",
      at: shippedAt,
      title: { vi: `${o.code} đang giao`, en: `${o.code} is on its way` },
      body: waybill,
      href,
    });
  }
  if (s.state === "DELIVERED") {
    const until = returnUntil(o);
    rows.push({
      kind: "order",
      at: s.deliveredAt,
      title: { vi: `${o.code} đã giao`, en: `${o.code} delivered` },
      body: until ? { vi: `Đổi trả tới ${dayMonth(until)}`, en: `Returns until ${dayMonth(until, "en")}` } : NO_BODY,
      href,
    });
  }
  return rows;
}

/** "SỎI và NGÓI", "A, B và C"; in English "SỎI and NGÓI", "A, B and C". */
function namesList(names: readonly string[], locale: Locale = "vi"): string {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} ${pick({ vi: "và", en: "and" }, locale)} ${names[names.length - 1]}`;
}

/**
 * Each issue's rows: opened (its styles and pieces), two days from closing,
 * closed (what sold), and — once its teasers are out — one announcement,
 * dated by the earliest of them and naming every one. In English "Drop 05 is
 * live" (as the drop page says it, LIVE) · "6 styles, 210 pieces", "Drop 05:
 * 2 days left" · "Closes 20:00, Tuesday 6 Oct", "Drop 05 has closed" ·
 * "180/210 pieces sold", "Drop 06 reveals SỎI and NGÓI" · "Opens 20:00,
 * Tuesday 13 Oct" — "reveals" and not "announced:", measured: the latter took
 * two lines at 390 where the Vietnamese takes one.
 */
function dropRows(catalog: Catalog): Draft[] {
  const rows: Draft[] = [];
  for (const d of catalog.drops) {
    const label: Pair = { vi: issueLabel(d.no), en: issueLabel(d.no, "en") };
    const shop = `/products?line=${d.no}`;
    const sum = dropSummary(catalog, d.no);
    rows.push({
      kind: "drop",
      at: d.opensAt,
      title: { vi: `${label.vi} đã mở`, en: `${label.en} is live` },
      body: {
        vi: `${sum.styles} mẫu, ${sum.cutUnits} chiếc`,
        en: `${plural(sum.styles, "style", "styles")}, ${plural(sum.cutUnits, "piece", "pieces")}`,
      },
      href: shop,
    });
    const closing = addDaysIso(d.closesAt, -CLOSING_NOTICE_DAYS);
    // An issue that runs for less than two days has no "còn 2 ngày" before it opened.
    if (Date.parse(closing) > Date.parse(d.opensAt)) {
      rows.push({
        kind: "drop",
        at: closing,
        title: {
          vi: `${label.vi} còn ${CLOSING_NOTICE_DAYS} ngày`,
          en: `${label.en}: ${plural(CLOSING_NOTICE_DAYS, "day", "days")} left`,
        },
        body: { vi: `Đóng ${clockDayLabel(d.closesAt)}`, en: `Closes ${clockDayLabel(d.closesAt, "en")}` },
        href: shop,
      });
    }
    rows.push({
      kind: "drop",
      at: d.closesAt,
      title: { vi: `${label.vi} đã đóng`, en: `${label.en} has closed` },
      body: {
        vi: `${sum.soldUnits}/${sum.cutUnits} chiếc đã bán`,
        en: `${sum.soldUnits}/${sum.cutUnits} ${pluralNoun(sum.cutUnits, "piece", "pieces")} sold`,
      },
      href: issueHref(d.no),
    });
    const told = teasersIn(catalog, d.no).filter((t) => t.announcedAt !== null);
    if (told.length > 0) {
      const at = told.map((t) => t.announcedAt!).reduce((a, b) => (Date.parse(b) < Date.parse(a) ? b : a));
      rows.push({
        kind: "drop",
        at,
        title: {
          vi: `${label.vi} công bố: ${namesList(told.map((t) => t.name))}`,
          en: `${label.en} reveals ${namesList(
            told.map((t) => teaserText(t, "en").name),
            "en",
          )}`,
        },
        body: { vi: `Mở ${clockDayLabel(d.opensAt)}`, en: `Opens ${clockDayLabel(d.opensAt, "en")}` },
        href: "/#sap-mo",
      });
    }
  }
  return rows;
}

/**
 * A saved style of the issue selling now whose saved colour is down to one,
 * two or three pieces: "BỤI đen còn 1 chiếc", the sizes still there under it,
 * dated by the last sale of that colour (B12) — or, with none, by the issue's
 * opening. In English "BỤI in black: 1 left" · "Size M L": the name through
 * `productText`, the colour through `colorLabel`.
 */
function wishlistRows(catalog: Catalog, favorites: readonly Favorite[], now: Date): Draft[] {
  return savedStyles(catalog, favorites).flatMap(({ product: p, color }) => {
    if (isFixed(p) || !isLive(catalog, p, now)) return [];
    const n = onHandByColor(p, color);
    if (n < 1 || n > LOW_STOCK_AT) return [];
    const drop = p.dropNo === null ? undefined : catalog.dropByNo.get(p.dropNo);
    if (!drop) return [];
    const colour = colorLabel(color).toLocaleLowerCase("vi");
    const colourEn = colorLabel(color, "en").toLocaleLowerCase("en");
    // The sizes left, as the mock's own stock line lists sizes ("Hết S M").
    const sizes = SIZES.filter((s) => onHandOf(p, color, s) > 0).join(" ");
    return [
      {
        kind: "wishlist" as const,
        at: lastSoldAtOf(p, color) ?? drop.opensAt,
        title: {
          vi: `${p.name} ${colour} còn ${n} chiếc`,
          en: `${productText(p, "en").name} in ${colourEn}: ${n} left`,
        },
        body: { vi: `Size ${sizes}`, en: `Size ${sizes}` },
        href: `/products/${p.slug}?color=${color}`,
      },
    ];
  });
}

/** Each code that can still be used, `PROMO_NOTICE_HOURS` before it ends; in English "Code DOT05 expires soon". */
function promoRows(catalog: Catalog, now: Date): Draft[] {
  return livePromotions(catalog, now).map((p) => {
    const notice = addHoursIso(p.endsAt, -PROMO_NOTICE_HOURS);
    return {
      kind: "promo" as const,
      at: Date.parse(notice) < Date.parse(p.startsAt) ? p.startsAt : notice,
      title: { vi: `Mã ${p.code} sắp hết hạn`, en: `Code ${p.code} expires soon` },
      body: { vi: clockDayLabel(p.endsAt), en: clockDayLabel(p.endsAt, "en") },
      href: "/products",
    };
  });
}

/**
 * Each issue the account asked to be told about, `REMINDER_NOTICE_HOURS`
 * before it opens, while it has not; in English "Drop 06 opens in 2 days".
 */
function reminderRows(catalog: Catalog, reminders: readonly number[], now: Date): Draft[] {
  return reminders.flatMap((no) => {
    const d = catalog.dropByNo.get(no);
    if (!d || dropState(d, now) !== "UPCOMING") return [];
    return [
      {
        kind: "reminder" as const,
        at: addHoursIso(d.opensAt, -REMINDER_NOTICE_HOURS),
        title: {
          vi: `${issueLabel(no)} mở sau ${REMINDER_DAYS} ngày`,
          en: `${issueLabel(no, "en")} opens in ${plural(REMINDER_DAYS, "day", "days")}`,
        },
        body: { vi: clockDayLabel(d.opensAt), en: clockDayLabel(d.opensAt, "en") },
        href: "/#sap-mo",
      },
    ];
  });
}

/** An instant as the Vietnamese wall clock writes it, whatever offset it came in. */
const vn = (iso: string): string => toVnIso(new Date(Date.parse(iso)));

export interface InboxSources {
  catalog: Catalog;
  /** The account's orders, each with the status the clock says it is in (`effectiveOrder`). */
  orders: readonly InboxOrder[];
  /** What the account keeps (`MyState`). */
  favorites: readonly Favorite[];
  reminders: readonly number[];
  /** When the account was made (`Me.joinedAt`): nothing before it is the account's news. Null reads as no bound. */
  joinedAt: string | null;
  now: Date;
}

/**
 * Every row whose moment has come, since the account was made and within the
 * last `INBOX_WINDOW_DAYS`, newest first — before the four switches
 * (`bySwitches`), so a row a switch hides keeps its place and its read mark.
 */
export function inboxItems(src: InboxSources, locale: Locale = "vi"): InboxItem[] {
  const t = src.now.getTime();
  const oldest = t - INBOX_WINDOW_DAYS * DAY_MS;
  const joined = src.joinedAt ? Date.parse(src.joinedAt) : Number.NaN;
  const drafts: Draft[] = [
    ...src.orders.flatMap(orderRows),
    ...dropRows(src.catalog),
    ...wishlistRows(src.catalog, src.favorites, src.now),
    ...promoRows(src.catalog, src.now),
    ...reminderRows(src.catalog, src.reminders, src.now),
  ];
  const seen = new Set<string>();
  const items: InboxItem[] = [];
  for (const d of drafts) {
    const when = Date.parse(d.at);
    // Still ahead, older than the window, or from before the account existed.
    if (!(when <= t) || when < oldest || (!Number.isNaN(joined) && when < joined)) continue;
    const at = vn(d.at);
    // The Vietnamese title, whatever the language: the read marks (`readMark`) are made of the key.
    const key = `${at}|${d.title.vi}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ kind: d.kind, at, title: pick(d.title, locale), body: pick(d.body, locale), href: d.href, key });
  }
  // Newest first; rows of one minute keep the order above (a stable sort).
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** Which switch under "Nhận thông báo về" a kind answers to; a reminder answers to the reminder itself. */
const SWITCH_OF: Readonly<Record<InboxKind, NotifyKey | null>> = {
  order: "order",
  drop: "drop",
  wishlist: "wishlist",
  promo: "promo",
  reminder: null,
};

/** The rows the account's switches let through: "Đơn hàng" off, no order rows; and so on for the other three. */
export function bySwitches<T extends InboxItem>(items: readonly T[], notify: NotifySwitches): T[] {
  return items.filter((i) => {
    const k = SWITCH_OF[i.kind];
    return k === null || notify[k];
  });
}

// ─────────────────────────────────────────────────────────── read, on this device
/**
 * The cookie that keeps, on this device, which rows were read: the mock keeps
 * them on the device (`feed.js`: `readStore`), and a cookie is on the device
 * too — one the server can read, so the bell and the page are drawn right in
 * the first HTML, as the mock paints them before the first paint.
 *
 * `<account id>~<mark>~<mark>…`: the account it belongs to (another account on
 * the same device reads it as nothing read), then a short mark per row read
 * (`readMark`). Only rows still inside the two unread days need a mark, so
 * the list stays a few dozen characters.
 */
export const INBOX_READ_COOKIE = "inbox_read";

/** A row's key as the cookie keeps it: FNV-1a over the key, in base 36 (seven characters at most). */
export function readMark(key: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** The most marks the cookie carries: far more rows than two days ever hold. */
export const READ_MARKS_MAX = 64;

const MARK = /^[0-9a-z]{1,7}$/;

/** The marks the cookie holds for this account; nothing for another account's, or for anything unreadable. */
export function parseInboxRead(raw: string | null | undefined, accountId: string): Set<string> {
  if (!raw || !accountId) return new Set();
  const [owner, ...marks] = raw.split("~");
  if (owner !== accountId) return new Set();
  return new Set(marks.filter((m) => MARK.test(m)).slice(-READ_MARKS_MAX));
}

export function serializeInboxRead(accountId: string, marks: Iterable<string>): string {
  return [accountId, ...[...marks].filter((m) => MARK.test(m)).slice(-READ_MARKS_MAX)].join("~");
}

/** Whether a row still reads as unread: less than two days old, and not read on this device. */
export function isUnread(item: Pick<InboxItem, "at" | "key">, now: Date, marks: ReadonlySet<string>): boolean {
  return now.getTime() - Date.parse(item.at) < UNREAD_FOR_MS && !marks.has(readMark(item.key));
}

/**
 * The marks worth keeping: those of rows still inside their two unread days
 * (older rows read as read without one), so the cookie never grows with the
 * inbox.
 */
export function keptMarks(marks: ReadonlySet<string>, items: readonly InboxItem[], now: Date): string[] {
  const live = new Set(
    items.filter((i) => now.getTime() - Date.parse(i.at) < UNREAD_FOR_MS).map((i) => readMark(i.key)),
  );
  return [...marks].filter((m) => live.has(m));
}

// ─────────────────────────────────────────────────────────── the page's groups
/** "Hôm nay", "Tuần này", "Trước đó" (`notifications.js`: `GROUPS`). */
export const INBOX_GROUP_TITLES = ["Hôm nay", "Tuần này", "Trước đó"] as const;
export type InboxGroup = 0 | 1 | 2;

/** The three in English (round v6 slice E3a), in the same order. */
const INBOX_GROUP_TITLES_EN = ["Today", "This week", "Earlier"] as const;

/** Today on the Vietnamese calendar, else within seven days, else before (`groupOf`). */
export function inboxGroupOf(at: string, now: Date): InboxGroup {
  if (vn(at).slice(0, 10) === toVnIso(now).slice(0, 10)) return 0;
  return now.getTime() - Date.parse(at) < 7 * DAY_MS ? 1 : 2;
}

/** "19:02" for a row of today, "20/09" for any other (`timeOf`); in English "20 Sep". */
export function inboxTime(at: string, group: InboxGroup, locale: Locale = "vi"): string {
  return group === 0 ? clockLabel(vn(at)) : dayMonth(vn(at), locale);
}

/** The rows in their three groups, in order, the empty ones left out; their titles in `locale`. */
export function inboxGroups<T extends InboxItem>(
  items: readonly T[],
  now: Date,
  locale: Locale = "vi",
): { group: InboxGroup; title: string; items: T[] }[] {
  const titles = locale === "en" ? INBOX_GROUP_TITLES_EN : INBOX_GROUP_TITLES;
  const by: [T[], T[], T[]] = [[], [], []];
  for (const i of items) by[inboxGroupOf(i.at, now)].push(i);
  return by
    .map((list, g) => ({ group: g as InboxGroup, title: titles[g]!, items: list }))
    .filter((g) => g.items.length > 0);
}
