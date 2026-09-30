import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG as C } from "@/data/fixture-catalog";
import { ORDERS } from "@/data/orders";
import {
  productId,
  promoCode,
  type ColorKey,
  type Favorite,
  type NotifySwitches,
  type Order,
  type Product,
  type Promotion,
} from "@/data/types";
import { buildCatalog, type Catalog } from "./catalog";
import { effectiveOrder } from "./customer-orders";
import {
  INBOX_READ_COOKIE,
  INBOX_WINDOW_DAYS,
  PROMO_NOTICE_HOURS,
  READ_MARKS_MAX,
  REMINDER_NOTICE_HOURS,
  bySwitches,
  inboxGroupOf,
  inboxGroups,
  inboxItems,
  inboxTime,
  isUnread,
  keptMarks,
  parseInboxRead,
  readMark,
  serializeInboxRead,
  type InboxItem,
  type InboxSources,
} from "./feed-inbox";

/** The fixture's own moment: 18:50 20/09, Số 05 selling (11–25/09), Số 06 announced for 02/10. */
const ANCHOR = new Date("2026-09-20T18:50:00+07:00");
const ALL_ON: NotifySwitches = { order: true, drop: true, wishlist: true, promo: true };

const fav = (slug: string, color: ColorKey): Favorite => ({ productId: productId(`p-${slug}`), color, savedAt: null });
/** The demo shopper after a reset (`data/customers.ts`), and their orders. */
const FAVS = [fav("bui", "black"), fav("than", "navy"), fav("muoi", "grey"), fav("hoodie-tron", "grey")];
const MINE = ORDERS.filter((o) => o.customerId === "c-minhanh");

/** When the demo shopper's account was made (`data/customers.ts`). */
const JOINED = "2026-03-08T21:14:00+07:00";

function sources(now: Date, over: Partial<InboxSources> = {}): InboxSources {
  return {
    catalog: C,
    orders: MINE.map((o) => effectiveOrder(o, now)),
    favorites: FAVS,
    reminders: [6],
    joinedAt: JOINED,
    now,
    ...over,
  };
}

const titles = (items: readonly InboxItem[]) => items.map((i) => i.title);
const find = (items: readonly InboxItem[], title: string) => items.find((i) => i.title === title);

/** The catalogue with a style's products changed. */
function withProduct(slug: string, change: (p: Product) => Product): Catalog {
  return buildCatalog({
    products: C.products.map((p) => (p.slug === slug ? change(p) : p)),
    drops: [...C.drops],
    teasers: [...C.teasers],
    promotions: [...C.promotions],
  });
}

describe("an order's rows", () => {
  const items = inboxItems(sources(ANCHOR));

  it("says a transfer is awaited while it is, from the moment it was placed, with its deadline", () => {
    expect(find(items, "DH-2430 chờ chuyển khoản")).toEqual({
      kind: "order",
      at: "2026-09-19T19:50:00+07:00",
      title: "DH-2430 chờ chuyển khoản",
      body: "Hạn 19:50 thứ Hai 21/09",
      href: "/account/orders/DH-2430",
      key: "2026-09-19T19:50:00+07:00|DH-2430 chờ chuyển khoản",
    });
    // Once its hold has run out it is a cancelled order, and a cancelled order has no rows.
    const later = inboxItems(sources(new Date("2026-09-21T20:00:00+07:00")));
    expect(titles(later).filter((t) => t.includes("DH-2430"))).toEqual([]);
  });

  it("says each step passed at the moment the order recorded it: paid, handed over, delivered", () => {
    expect(find(items, "Đã nhận tiền DH-2422")).toMatchObject({ at: "2026-09-14T10:33:00+07:00", body: "" });
    expect(find(items, "DH-2422 đang giao")).toMatchObject({ at: "2026-09-18T07:15:00+07:00", body: "Mã vận đơn VD-8842-1907" });
    expect(find(items, "Đã nhận tiền DH-2416")).toMatchObject({ at: "2026-09-11T21:52:00+07:00" });
    // Delivered: the parcel no longer carries its waybill, so the line under it is empty.
    expect(find(items, "DH-2416 đang giao")).toMatchObject({ at: "2026-09-13T08:20:00+07:00", body: "" });
    expect(find(items, "DH-2416 đã giao")).toMatchObject({ at: "2026-09-16T10:02:00+07:00", body: "Đổi trả tới 23/09" });
  });

  it("has nothing for a cancelled order, nor for a COD order waiting for the shop's call", () => {
    expect(titles(items).some((t) => t.includes("DH-2310"))).toBe(false);
    const cod: Order = { ...MINE.find((o) => o.code === "DH-2430")!, payment: "COD", status: { state: "RECEIVED" } };
    expect(inboxItems(sources(ANCHOR, { orders: [cod], favorites: [], reminders: [] })).filter((i) => i.kind === "order")).toEqual([]);
  });

  it("gives COD no 'Đã nhận tiền': it pays at the door", () => {
    const o = ORDERS.find((x) => x.code === "DH-2415")!; // COD, delivered 15/09
    const rows = inboxItems(sources(ANCHOR, { orders: [o], favorites: [], reminders: [] })).filter((i) => i.kind === "order");
    expect(titles(rows)).toEqual(["DH-2415 đã giao", "DH-2415 đang giao"]);
  });

  it("dates a step nobody recorded by nothing at all, rather than a guess", () => {
    const o = { ...MINE.find((x) => x.code === "DH-2416")! };
    delete (o as { moments?: unknown }).moments;
    const rows = inboxItems(sources(ANCHOR, { orders: [o], favorites: [], reminders: [] })).filter((i) => i.kind === "order");
    expect(titles(rows)).toEqual(["DH-2416 đã giao"]);
  });
});

describe("an issue's rows", () => {
  it("says Số 05 opened with its styles and pieces, and Số 06 was announced by name, at the teasers' moment", () => {
    const items = inboxItems(sources(ANCHOR));
    expect(find(items, "Số 05 đã mở")).toMatchObject({
      at: "2026-09-11T20:00:00+07:00",
      body: "10 mẫu, 181 chiếc",
      href: "/products?line=5",
      kind: "drop",
    });
    expect(find(items, "Số 06 công bố: SỎI và NGÓI")).toMatchObject({
      at: "2026-09-18T12:00:00+07:00",
      body: "Mở 20:00 thứ Sáu 02/10",
      href: "/#sap-mo",
    });
    // Nothing still ahead: Số 05 has not reached its last two days, nor closed; Số 06 has not opened.
    expect(titles(items).filter((t) => /Số 05 còn|Số 05 đã đóng|Số 06 đã mở/.test(t))).toEqual([]);
  });

  it("says two days before an issue closes, and when it has closed, with what sold, to its own page", () => {
    const items = inboxItems(sources(new Date("2026-09-26T09:00:00+07:00")));
    expect(find(items, "Số 05 còn 2 ngày")).toMatchObject({ at: "2026-09-23T20:00:00+07:00", body: "Đóng 20:00 thứ Sáu 25/09" });
    expect(find(items, "Số 05 đã đóng")).toMatchObject({ at: "2026-09-25T20:00:00+07:00", body: "108/181 chiếc đã bán", href: "/so/5" });
  });

  it("names every teaser of the issue once, on one row, dated by the first to be announced", () => {
    const three = buildCatalog({
      products: [...C.products],
      drops: [...C.drops],
      teasers: [
        ...C.teasers,
        { slug: "s06-gach", name: "GẠCH", kind: "Áo thun", family: "TEE", dropNo: 6, photoKey: "suong", announcedAt: "2026-09-17T09:00:00+07:00" },
        { slug: "s06-vua", name: "VỮA", kind: "Áo thun", family: "TEE", dropNo: 6, photoKey: "suong", announcedAt: null },
      ],
      promotions: [...C.promotions],
    });
    const rows = inboxItems(sources(ANCHOR, { catalog: three })).filter((i) => i.title.includes("công bố"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: "Số 06 công bố: SỎI, NGÓI và GẠCH", at: "2026-09-17T09:00:00+07:00" });
  });
});

describe("a saved style running low", () => {
  it("says the saved colour's last pieces while its issue sells, with the sizes left, to the style in that colour", () => {
    const items = inboxItems(sources(ANCHOR)).filter((i) => i.kind === "wishlist");
    // BỤI đen has 1 left, THAN xanh than 3; MUỐI xám is gone and HOODIE TRƠN is a fixed style.
    expect(items.map((i) => [i.title, i.body, i.href])).toEqual([
      ["BỤI đen còn 1 chiếc", "Size L", "/products/s05-bui?color=black"],
      ["THAN xanh than còn 3 chiếc", "Size M L XL", "/products/s05-than?color=navy"],
    ]);
    // The fixture dates no sale, so both fall back on the opening of Số 05.
    expect(items.every((i) => i.at === "2026-09-11T20:00:00+07:00")).toBe(true);
  });

  it("is dated by the last sale of that colour when the catalogue has one", () => {
    const sold = withProduct("s05-bui", (p) => ({ ...p, lastSoldAt: { black: "2026-09-20T09:30:00+07:00", grey: null } }));
    expect(find(inboxItems(sources(ANCHOR, { catalog: sold })), "BỤI đen còn 1 chiếc")?.at).toBe("2026-09-20T09:30:00+07:00");
  });

  it("says nothing once the issue has closed, nor for four pieces or more", () => {
    expect(inboxItems(sources(new Date("2026-09-26T09:00:00+07:00"))).filter((i) => i.kind === "wishlist")).toEqual([]);
    const four = withProduct("s05-bui", (p) => ({ ...p, stock: { ...p.stock, black: { S: 1, M: 1, L: 1, XL: 1 } } }));
    expect(find(inboxItems(sources(ANCHOR, { catalog: four })), "BỤI đen còn 4 chiếc")).toBeUndefined();
  });
});

describe("a code about to end, and a reminder", () => {
  it(`dates a code's row ${PROMO_NOTICE_HOURS} hours before it ends (the mock's 09:00 24/09 for 20:00 25/09), while it can be used`, () => {
    expect(inboxItems(sources(new Date("2026-09-24T08:59:00+07:00"))).filter((i) => i.kind === "promo")).toEqual([]);
    const rows = inboxItems(sources(new Date("2026-09-24T09:00:00+07:00"))).filter((i) => i.kind === "promo");
    // VIP20 is used up, so only the three codes still usable.
    expect(rows.map((i) => [i.title, i.body, i.at, i.href])).toEqual([
      ["Mã DOT05 sắp hết hạn", "20:00 thứ Sáu 25/09", "2026-09-24T09:00:00+07:00", "/products"],
      ["Mã CHAOBAN sắp hết hạn", "20:00 thứ Sáu 25/09", "2026-09-24T09:00:00+07:00", "/products"],
      ["Mã FREESHIP sắp hết hạn", "20:00 thứ Sáu 25/09", "2026-09-24T09:00:00+07:00", "/products"],
    ]);
    // Ended: gone.
    expect(inboxItems(sources(new Date("2026-09-26T09:00:00+07:00"))).filter((i) => i.kind === "promo")).toEqual([]);
  });

  it("dates a code shorter than that by its start", () => {
    const short: Promotion = {
      code: promoCode("NHANH"),
      kind: "AMOUNT",
      amountVnd: 50_000,
      startsAt: "2026-09-20T12:00:00+07:00",
      endsAt: "2026-09-21T12:00:00+07:00",
      usageLimit: null,
      usedCount: 0,
    };
    const cat = buildCatalog({ products: [...C.products], drops: [...C.drops], teasers: [...C.teasers], promotions: [short] });
    expect(find(inboxItems(sources(ANCHOR, { catalog: cat })), "Mã NHANH sắp hết hạn")?.at).toBe("2026-09-20T12:00:00+07:00");
  });

  it(`reminds ${REMINDER_NOTICE_HOURS} hours before an asked-about issue opens (the mock's 19:00 30/09 for 20:00 02/10)`, () => {
    const at = new Date("2026-09-30T19:00:00+07:00");
    expect(find(inboxItems(sources(at)), "Số 06 mở sau 2 ngày")).toMatchObject({
      kind: "reminder",
      at: "2026-09-30T19:00:00+07:00",
      body: "20:00 thứ Sáu 02/10",
      href: "/#sap-mo",
    });
    expect(find(inboxItems(sources(new Date("2026-09-30T18:59:00+07:00"))), "Số 06 mở sau 2 ngày")).toBeUndefined();
    expect(find(inboxItems(sources(at, { reminders: [] })), "Số 06 mở sau 2 ngày")).toBeUndefined();
    // Opened: the reminder has done its job.
    expect(find(inboxItems(sources(new Date("2026-10-02T20:00:00+07:00"))), "Số 06 mở sau 2 ngày")).toBeUndefined();
  });
});

describe("the list", () => {
  it("is newest first, only what has happened, each key the moment and the title, the same on every build", () => {
    const a = inboxItems(sources(ANCHOR));
    const b = inboxItems(sources(ANCHOR));
    expect(a.map((i) => i.key)).toEqual(b.map((i) => i.key));
    for (const i of a) {
      expect(i.key).toBe(`${i.at}|${i.title}`);
      expect(Date.parse(i.at)).toBeLessThanOrEqual(ANCHOR.getTime());
    }
    const times = a.map((i) => Date.parse(i.at));
    expect(times).toEqual([...times].sort((x, y) => y - x));
    expect(titles(a).slice(0, 4)).toEqual([
      "DH-2430 chờ chuyển khoản",
      "Số 06 công bố: SỎI và NGÓI",
      "DH-2422 đang giao",
      "DH-2416 đã giao",
    ]);
  });

  it("lets the four switches take their own kind away, the reminder answering to itself", () => {
    const all = inboxItems(sources(new Date("2026-09-30T19:00:00+07:00")));
    const kinds = (on: Partial<NotifySwitches>) => new Set(bySwitches(all, { ...ALL_ON, ...on }).map((i) => i.kind));
    expect(kinds({})).toEqual(new Set(["order", "drop", "reminder"]));
    expect(kinds({ order: false }).has("order")).toBe(false);
    expect(kinds({ drop: false }).has("drop")).toBe(false);
    expect(kinds({ order: false, drop: false, wishlist: false, promo: false })).toEqual(new Set(["reminder"]));
    const open = inboxItems(sources(new Date("2026-09-24T09:00:00+07:00")));
    expect(bySwitches(open, { ...ALL_ON, wishlist: false }).some((i) => i.kind === "wishlist")).toBe(false);
    expect(bySwitches(open, { ...ALL_ON, promo: false }).some((i) => i.kind === "promo")).toBe(false);
    expect(bySwitches(open, ALL_ON).some((i) => i.kind === "wishlist")).toBe(true);
  });
});

describe(`how far back the list reaches: since the account was made, and ${INBOX_WINDOW_DAYS} days at most`, () => {
  it("drops everything older than the window: the demo shopper's March and June are gone", () => {
    const items = inboxItems(sources(ANCHOR));
    expect(titles(items).filter((t) => /^Số 0[34]|DH-2210/.test(t))).toEqual([]);
    // What is left starts with Số 05's opening, 11/09 — nine days before the anchor: ten rows, as the mock's list.
    expect(items.at(-1)?.at).toBe("2026-09-11T20:00:00+07:00");
    expect(items).toHaveLength(10);
  });

  it(`keeps a row exactly ${INBOX_WINDOW_DAYS} days old and drops one a minute older`, () => {
    const edge = new Date(ANCHOR.getTime() - INBOX_WINDOW_DAYS * 86_400_000);
    expect(edge.getTime()).toBe(Date.parse("2026-08-21T18:50:00+07:00"));
    const cat = buildCatalog({
      products: [...C.products],
      drops: [
        ...C.drops,
        { no: 7, opensAt: "2026-08-21T18:50:00+07:00", closesAt: "2026-12-01T20:00:00+07:00" },
        { no: 8, opensAt: "2026-08-21T18:49:00+07:00", closesAt: "2026-12-01T20:00:00+07:00" },
      ],
      teasers: [...C.teasers],
      promotions: [...C.promotions],
    });
    const items = inboxItems(sources(ANCHOR, { catalog: cat }));
    expect(find(items, "Số 07 đã mở")?.at).toBe("2026-08-21T18:50:00+07:00");
    expect(find(items, "Số 08 đã mở")).toBeUndefined();
  });

  it("drops what happened before the account was made, and keeps what happened at that very minute", () => {
    // Made at 08:20 13/09, the minute DH-2416 was handed over.
    const items = inboxItems(sources(ANCHOR, { joinedAt: "2026-09-13T08:20:00+07:00" }));
    expect(find(items, "DH-2416 đang giao")?.at).toBe("2026-09-13T08:20:00+07:00");
    expect(find(items, "Đã nhận tiền DH-2416")).toBeUndefined(); // 21:52 11/09
    expect(find(items, "Số 05 đã mở")).toBeUndefined(); // 20:00 11/09
    // The saved styles' rows are dated by Số 05's opening here (no sale recorded): gone with it.
    expect(items.filter((i) => i.kind === "wishlist")).toEqual([]);
    expect(Math.min(...items.map((i) => Date.parse(i.at)))).toBe(Date.parse("2026-09-13T08:20:00+07:00"));
  });

  it("reads no account date as no lower bound, the window still holding", () => {
    expect(inboxItems(sources(ANCHOR, { joinedAt: null })).map((i) => i.key)).toEqual(
      inboxItems(sources(ANCHOR)).map((i) => i.key),
    );
  });
});

describe("read, on this device", () => {
  const items = inboxItems(sources(ANCHOR));
  const fresh = find(items, "DH-2430 chờ chuyển khoản")!; // 23h old
  const old = find(items, "DH-2416 đã giao")!; // 4 days old

  it("reads a row as unread for two days, until it is marked", () => {
    expect(isUnread(fresh, ANCHOR, new Set())).toBe(true);
    expect(isUnread(old, ANCHOR, new Set())).toBe(false);
    expect(isUnread(fresh, ANCHOR, new Set([readMark(fresh.key)]))).toBe(false);
    expect(isUnread(fresh, new Date("2026-09-21T19:50:00+07:00"), new Set())).toBe(false);
  });

  it("marks a key the same way everywhere, in a few base-36 characters", () => {
    expect(readMark(fresh.key)).toBe(readMark(`${fresh.at}|${fresh.title}`));
    expect(readMark(fresh.key)).toMatch(/^[0-9a-z]{1,7}$/);
    expect(readMark(fresh.key)).not.toBe(readMark(old.key));
  });

  it("keeps the marks per account in one cookie, and reads another account's, or junk, as nothing read", () => {
    expect(INBOX_READ_COOKIE).toBe("inbox_read");
    const id = "3f1c9a2e-0b7d-4c55-9f0e-2a6b1d4c8e10";
    const raw = serializeInboxRead(id, ["abc", "12z", "not a mark!"]);
    expect(raw).toBe(`${id}~abc~12z`);
    expect(parseInboxRead(raw, id)).toEqual(new Set(["abc", "12z"]));
    expect(parseInboxRead(raw, "0e3b1c2a-0000-4000-8000-000000000000")).toEqual(new Set());
    expect(parseInboxRead("", id)).toEqual(new Set());
    expect(parseInboxRead(undefined, id)).toEqual(new Set());
    expect(parseInboxRead(`${id}~ok~UPPER~toolongmark~`, id)).toEqual(new Set(["ok"]));
    const many = Array.from({ length: READ_MARKS_MAX + 10 }, (_, i) => i.toString(36));
    expect(parseInboxRead(serializeInboxRead(id, many), id).size).toBe(READ_MARKS_MAX);
  });

  it("keeps only the marks of rows still inside their two unread days", () => {
    const marks = new Set([readMark(fresh.key), readMark(old.key), "zzz"]);
    expect(keptMarks(marks, items, ANCHOR)).toEqual([readMark(fresh.key)]);
  });
});

describe("the page's groups", () => {
  const now = new Date("2026-09-21T19:02:00+07:00");

  it("groups today on the Vietnamese calendar, then the last seven days, then before (`groupOf`)", () => {
    expect(inboxGroupOf("2026-09-21T00:05:00+07:00", now)).toBe(0);
    expect(inboxGroupOf("2026-09-20T23:55:00+07:00", now)).toBe(1);
    // The same instant written in UTC is the same day in Vietnam.
    expect(inboxGroupOf("2026-09-20T17:05:00Z", now)).toBe(0);
    expect(inboxGroupOf("2026-09-14T19:03:00+07:00", now)).toBe(1);
    expect(inboxGroupOf("2026-09-14T19:02:00+07:00", now)).toBe(2);
  });

  it("prints the hour for today and the day for the rest", () => {
    expect(inboxTime("2026-09-21T19:02:00+07:00", 0)).toBe("19:02");
    expect(inboxTime("2026-09-20T09:30:00+07:00", 1)).toBe("20/09");
    expect(inboxTime("2026-09-11T20:00:00+07:00", 2)).toBe("11/09");
  });

  it("lists the groups in order, leaving the empty ones out", () => {
    const groups = inboxGroups(inboxItems(sources(now)), now);
    expect(groups.map((g) => g.title)).toEqual(["Tuần này", "Trước đó"]);
    expect(groups.flatMap((g) => g.items).length).toBe(inboxItems(sources(now)).length);
  });
});
