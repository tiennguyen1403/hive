import { describe, it, expect } from "vitest";
import {
  PROMO_NOTICE_DAYS,
  allIds,
  groupNotifications,
  groupOf,
  markRead,
  notifications,
  parseNotifRead,
  serializeNotifRead,
  stampLabel,
  startOfToday,
  unreadCount,
  type NotifInput,
} from "./notifications";

const NOW = new Date("2026-09-22T18:50:00+07:00");

const ALL_ON = { reminder: true, orders: true, promo: true };

function input(patch: Partial<NotifInput> = {}): NotifInput {
  return {
    now: NOW,
    orders: [],
    reminders: [],
    promos: [],
    issues: [],
    toggles: ALL_ON,
    read: [],
    ...patch,
  };
}

const WAITING = {
  code: "DH-2430",
  state: "AWAITING_TRANSFER",
  placedAt: "2026-09-22T09:50:00+07:00",
  totalVnd: 2_680_000,
  dueAt: "2026-09-22T21:50:00+07:00",
};

const DELIVERED = {
  code: "DH-2310",
  state: "DELIVERED",
  placedAt: "2026-06-12T10:00:00+07:00",
  totalVnd: 1_380_000,
  deliveredAt: "2026-06-16T10:20:00+07:00",
};

describe("notifications: what each source says", () => {
  it("names the amount and the reference on an order still owing a transfer", () => {
    const [item] = notifications(input({ orders: [WAITING] }));
    expect(item!.title).toBe("DH-2430 chờ chuyển khoản");
    expect(item!.body).toContain("2.680.000₫");
    expect(item!.body).toContain("nội dung DH-2430");
    expect(item!.body).toContain("21:50 · 22/09");
    expect(item!.action).toEqual({ text: "Xem đơn", href: "/account/orders/DH-2430" });
  });

  it("says when a delivered order's return window runs out", () => {
    const [item] = notifications(input({ orders: [DELIVERED] }));
    expect(item!.title).toBe("DH-2310 đã giao");
    expect(item!.body).toContain("10:20 · 16/06");
    // 16/06 + 7 days.
    expect(item!.body).toContain("tới 23/06");
  });

  it("says nothing about an order that is neither waiting nor delivered", () => {
    const shipping = { ...DELIVERED, state: "SHIPPING", deliveredAt: undefined };
    expect(notifications(input({ orders: [shipping] }))).toHaveLength(0);
  });

  it("carries the issue's opening hour and the styles already revealed", () => {
    const [item] = notifications(
      input({
        reminders: [
          { no: 6, opensAt: "2026-10-02T20:00:00+07:00", teasers: ["SỎI", "NGÓI"] },
        ],
      }),
    );
    expect(item!.title).toBe("Số 06 mở 20:00 thứ Sáu 02/10");
    expect(item!.body).toContain("SỎI và NGÓI");
    expect(item!.action).toEqual({ text: "Xem số 06", href: "/#next" });
  });

  it("drops a reminder for an issue that has already opened", () => {
    const opened = [{ no: 5, opensAt: "2026-09-11T20:00:00+07:00", teasers: [] }];
    expect(notifications(input({ reminders: opened }))).toHaveLength(0);
  });

  it("counts the days a code has left, and says which issue it runs with", () => {
    const [item] = notifications(
      input({
        promos: [
          {
            code: "DOT05",
            endsAt: "2026-09-25T20:00:00+07:00",
            offer: "Giảm 10%, tối đa 150.000₫",
            terms: "Đơn từ 500.000₫ · còn 82 lượt",
            issueNo: 5,
          },
        ],
      }),
    );
    // 22/09 18:50 → 25/09 20:00 is 3.05 days, rounded up.
    expect(item!.title).toBe("Mã DOT05 còn 4 ngày");
    expect(item!.body).toContain("Hết hạn 20:00 · 25/09 cùng số 05.");
  });

  it("leaves a code alone until it is inside the notice window", () => {
    const far = {
      code: "XA",
      endsAt: "2026-10-30T20:00:00+07:00",
      offer: "Giảm 10%",
      terms: "không giới hạn lượt",
    };
    expect(notifications(input({ promos: [far] }))).toHaveLength(0);
    expect(PROMO_NOTICE_DAYS).toBe(5);
  });

  it("points a closed issue at its own page", () => {
    const [item] = notifications(
      input({
        issues: [
          { no: 4, closesAt: "2026-06-19T20:00:00+07:00", soldUnits: 200, cutUnits: 200 },
        ],
      }),
    );
    expect(item!.title).toBe("Số 04 đã đóng");
    expect(item!.body).toBe("200 / 200 chiếc đã bán · 19/06.");
    expect(item!.action).toEqual({ text: "Xem lại số 04", href: "/so/4" });
  });

  it("says nothing about an issue that has not closed yet", () => {
    const open = [{ no: 5, closesAt: "2026-09-25T20:00:00+07:00", soldUnits: 108, cutUnits: 181 }];
    expect(notifications(input({ issues: open }))).toHaveLength(0);
  });
});

describe("notifications: the three switches", () => {
  const full = input({
    orders: [WAITING, DELIVERED],
    reminders: [{ no: 6, opensAt: "2026-10-02T20:00:00+07:00", teasers: [] }],
    promos: [
      {
        code: "DOT05",
        endsAt: "2026-09-25T20:00:00+07:00",
        offer: "Giảm 10%",
        terms: "Đơn từ 500.000₫",
      },
    ],
    issues: [{ no: 4, closesAt: "2026-06-19T20:00:00+07:00", soldUnits: 200, cutUnits: 200 }],
  });

  it("counts every source when all three are on", () => {
    expect(notifications(full).map((n) => n.source).sort()).toEqual([
      "delivered",
      "issue-closed",
      "order-wait",
      "promo",
      "reminder",
    ]);
  });

  it("drops both order sources when the order switch is off", () => {
    const off = notifications({ ...full, toggles: { ...ALL_ON, orders: false } });
    expect(off.some((n) => n.source === "order-wait")).toBe(false);
    expect(off.some((n) => n.source === "delivered")).toBe(false);
  });

  it("drops the reminder when the reminder switch is off", () => {
    const off = notifications({ ...full, toggles: { ...ALL_ON, reminder: false } });
    expect(off.some((n) => n.source === "reminder")).toBe(false);
  });

  it("drops the code when the code switch is off", () => {
    const off = notifications({ ...full, toggles: { ...ALL_ON, promo: false } });
    expect(off.some((n) => n.source === "promo")).toBe(false);
  });

  it("keeps a closed issue whatever the three switches say", () => {
    const off = notifications({
      ...full,
      toggles: { reminder: false, orders: false, promo: false },
    });
    expect(off.map((n) => n.source)).toEqual(["issue-closed"]);
  });
});

describe("notifications: read and unread", () => {
  const list = () => notifications(input({ orders: [WAITING, DELIVERED] }));

  it("is unread until its id has been ticked", () => {
    expect(unreadCount(list())).toBe(2);
  });

  it("ticks exactly the id it was given", () => {
    const first = list()[0]!;
    const after = notifications(
      input({ orders: [WAITING, DELIVERED], read: [first.id] }),
    );
    expect(unreadCount(after)).toBe(1);
    expect(after.find((n) => n.id === first.id)!.read).toBe(true);
  });

  it("gives an id that survives a re-render", () => {
    expect(list().map((n) => n.id)).toEqual(list().map((n) => n.id));
  });

  it("gives a NEW id when the deadline moves, so the row comes back unread", () => {
    const moved = { ...WAITING, dueAt: "2026-09-23T21:50:00+07:00" };
    const before = notifications(input({ orders: [WAITING] }))[0]!;
    const after = notifications(input({ orders: [moved], read: [before.id] }))[0]!;
    expect(after.id).not.toBe(before.id);
    expect(after.read).toBe(false);
  });

  it("marks everything on screen read in one write", () => {
    const ids = allIds(list());
    const after = notifications(input({ orders: [WAITING, DELIVERED], read: ids }));
    expect(unreadCount(after)).toBe(0);
  });
});

describe("notifications: grouping", () => {
  it("starts today at midnight on the Vietnamese clock", () => {
    expect(startOfToday(NOW)).toBe("2026-09-22T00:00:00+07:00");
  });

  it("puts this morning under today and last week under this week", () => {
    const today = notifications(input({ orders: [WAITING] }))[0]!;
    expect(groupOf(today, NOW)).toBe("today");

    const older = {
      ...WAITING,
      code: "DH-2400",
      placedAt: "2026-09-18T09:00:00+07:00",
      dueAt: "2026-09-18T21:00:00+07:00",
    };
    expect(groupOf(notifications(input({ orders: [older] }))[0]!, NOW)).toBe("week");

    const june = notifications(input({ orders: [DELIVERED] }))[0]!;
    expect(groupOf(june, NOW)).toBe("older");
  });

  it("leaves an empty group out rather than drawing an empty heading", () => {
    const groups = groupNotifications(notifications(input({ orders: [WAITING] })), NOW);
    expect(groups.map((g) => g.key)).toEqual(["today"]);
    expect(groups[0]!.meta).toBe("22/09");
  });

  it("orders the groups newest first and keeps every item", () => {
    const list = notifications(input({ orders: [WAITING, DELIVERED] }));
    const groups = groupNotifications(list, NOW);
    expect(groups.map((g) => g.key)).toEqual(["today", "older"]);
    expect(groups.flatMap((g) => g.items)).toHaveLength(2);
  });

  it("prints the hour for something today and the date for anything else", () => {
    const today = notifications(input({ orders: [WAITING] }))[0]!;
    expect(stampLabel(today, NOW)).toBe("09:50");

    const june = notifications(input({ orders: [DELIVERED] }))[0]!;
    expect(stampLabel(june, NOW)).toBe("16/06");
  });

  it("prints the day something still ahead is about", () => {
    const reminder = notifications(
      input({ reminders: [{ no: 6, opensAt: "2026-10-02T20:00:00+07:00", teasers: [] }] }),
    )[0]!;
    expect(groupOf(reminder, NOW)).toBe("today");
    expect(stampLabel(reminder, NOW)).toBe("02/10");
  });
});

describe("the read list in storage", () => {
  it("round-trips", () => {
    expect(parseNotifRead(serializeNotifRead(["a", "b"]))).toEqual(["a", "b"]);
  });

  it("survives nothing, junk and another version", () => {
    expect(parseNotifRead(null)).toEqual([]);
    expect(parseNotifRead("{nope")).toEqual([]);
    expect(parseNotifRead(JSON.stringify({ v: 9, ids: ["a"] }))).toEqual([]);
    expect(parseNotifRead(JSON.stringify({ v: 1, ids: "a" }))).toEqual([]);
  });

  it("drops entries that are not ids", () => {
    expect(parseNotifRead(JSON.stringify({ v: 1, ids: ["a", 7, null, "b"] }))).toEqual([
      "a",
      "b",
    ]);
  });

  it("adds without losing what was already ticked, and without duplicating", () => {
    expect(markRead(["a"], ["b", "a"])).toEqual(["a", "b"]);
  });
});
