import { describe, it, expect } from "vitest";
import {
  GUEST_SUFFIX,
  dropRows,
  orderCustomer,
  orderItemsLabel,
  orderNote,
  promoState,
  promoValueLabel,
  queueRows,
} from "./admin-rows";
import { DROPS } from "@/data/catalog";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { CUSTOMERS } from "@/data/customers";
import { ORDERS } from "@/data/orders";
import type { AdminOrder } from "./admin-orders";
import { styleName } from "./lexicon";
import { promoCode, type Order, type OrderStatus, type Promotion } from "@/data/types";

/** The smallest order the row builders read: a state, a time and a line. */
function testOrder(status: OrderStatus): Order {
  const first = ORDERS[0]!;
  return { ...first, status };
}

const NOW = new Date("2026-09-20T10:00:00+07:00");

function promo(over: Partial<Promotion> = {}): Promotion {
  return {
    code: promoCode("TEST"),
    kind: "AMOUNT",
    amountVnd: 50_000,
    startsAt: "2026-09-11T20:00:00+07:00",
    endsAt: "2026-09-25T20:00:00+07:00",
    usageLimit: 100,
    usedCount: 10,
    ...over,
  } as Promotion;
}

describe("promoState", () => {
  it("is running inside its window with room left", () => {
    expect(promoState(promo(), NOW)).toBe("LIVE");
  });

  it("is upcoming before it starts", () => {
    expect(promoState(promo(), new Date("2026-09-01T10:00:00+07:00"))).toBe("UPCOMING");
  });

  it("is finished after it ends", () => {
    expect(promoState(promo(), new Date("2026-10-01T10:00:00+07:00"))).toBe("ENDED");
  });

  it("is used up when the limit is reached, even inside the window", () => {
    // A code with no uses left is not "đang chạy". The admin needs to see
    // that difference at a glance — it is the reason a shopper's code is
    // being refused while the dates still look fine.
    expect(promoState(promo({ usedCount: 100 }), NOW)).toBe("USED_UP");
  });

  it("treats a null limit as unlimited rather than as zero", () => {
    expect(promoState(promo({ usageLimit: null, usedCount: 9999 }), NOW)).toBe("LIVE");
  });

  it("calls an expired code expired even if it also ran out", () => {
    // One state per row, and the date is the one that cannot be undone.
    expect(promoState(promo({ usedCount: 100 }), new Date("2026-10-01T10:00:00+07:00"))).toBe(
      "ENDED",
    );
  });

  it("is paused when the shop paused a code that would otherwise be running (slice B3b)", () => {
    expect(promoState(promo({ paused: true }), NOW)).toBe("PAUSED");
  });

  it("lets the clock and the cap speak before the pause, as the simulation did", () => {
    expect(promoState(promo({ paused: true }), new Date("2026-09-01T10:00:00+07:00"))).toBe("UPCOMING");
    expect(promoState(promo({ paused: true }), new Date("2026-10-01T10:00:00+07:00"))).toBe("ENDED");
    expect(promoState(promo({ paused: true, usedCount: 100 }), NOW)).toBe("USED_UP");
  });
});

describe("promoValueLabel", () => {
  it("writes a percentage with its cap, because the cap is the real number", () => {
    expect(
      promoValueLabel(promo({ kind: "PERCENT", percent: 10, maxDiscountVnd: 150_000 })),
    ).toBe("10% · tối đa 150.000₫");
  });

  it("writes a percentage without a cap when there is none", () => {
    expect(promoValueLabel(promo({ kind: "PERCENT", percent: 10 }))).toBe("10%");
  });

  it("writes a flat amount as money", () => {
    expect(promoValueLabel(promo({ kind: "AMOUNT", amountVnd: 50_000 }))).toBe("50.000₫");
  });

  it("says what free shipping is worth, not just that it is free", () => {
    // The kind column beside it already reads "Miễn phí giao"; this column
    // is where the amount goes, and it comes from `lib/shipping.ts` rather
    // than being typed in twice.
    expect(promoValueLabel(promo({ kind: "FREE_SHIPPING" }))).toBe(
      "Phí giao tiêu chuẩn · 30.000₫",
    );
  });
});

describe("orderNote", () => {
  const at = "2026-09-20T10:00:00+07:00";

  it("gives an unpaid transfer its deadline and flags it once it passes", () => {
    const soon = orderNote(
      testOrder({ state: "AWAITING_TRANSFER", dueAt: "2026-09-21T08:05:00+07:00" }),
      NOW,
    )!;
    // The hour and the day never part (v3 slice 13): a no-break space.
    expect(soon.text).toBe("hạn 08:05\u00a021/09");
    expect(soon.late).toBe(false);

    const past = orderNote(
      testOrder({ state: "AWAITING_TRANSFER", dueAt: "2026-09-19T08:05:00+07:00" }),
      NOW,
    )!;
    expect(past.late).toBe(true);
  });

  it("ages a paid order in whole days and calls two days late", () => {
    expect(orderNote(testOrder({ state: "PAID", paidAt: at }), NOW)!).toEqual({
      text: "chưa bàn giao",
      late: false,
    });
    expect(
      orderNote(testOrder({ state: "PAID", paidAt: "2026-09-17T10:00:00+07:00" }), NOW),
    ).toEqual({ text: "chưa bàn giao · 3\u00a0ngày", late: true });
  });

  it("quotes the courier's number while a parcel is out", () => {
    expect(
      orderNote(
        testOrder({ state: "SHIPPING", shippedAt: at, trackingCode: "VNP-8842377" }),
        NOW,
      )!.text,
    ).toBe("VNP-8842377");
  });

  it("ages a COD order taken from its placing, and says a card order's money is not in", () => {
    const cod = { ...testOrder({ state: "RECEIVED" }), payment: "COD" as const };
    expect(orderNote({ ...cod, placedAt: at }, NOW)).toEqual({ text: "chưa bàn giao", late: false });
    expect(orderNote({ ...cod, placedAt: "2026-09-17T10:00:00+07:00" }, NOW)).toEqual({
      text: "chưa bàn giao · 3\u00a0ngày",
      late: true,
    });
    const card = { ...testOrder({ state: "RECEIVED" }), payment: "CARD" as const };
    expect(orderNote(card, NOW)).toEqual({ text: "chưa thu tiền", late: false });
  });

  it("says nothing about an order that is finished", () => {
    expect(orderNote(testOrder({ state: "DELIVERED", deliveredAt: at }), NOW)).toBeNull();
    expect(
      orderNote(testOrder({ state: "CANCELLED", cancelledAt: at, reason: "x" }), NOW),
    ).toBeNull();
  });
});

/** The sample orders as the back office reads them: each with its account. */
const BOOK: AdminOrder[] = ORDERS.map((o) => {
  const c = CUSTOMERS.find((x) => x.id === o.customerId)!;
  return {
    ...o,
    owner: { id: `uuid-${c.id}`, handle: String(c.id), name: c.name, email: c.email, phone: "", joinedAt: c.joinedAt },
  };
});

describe("queueRows", () => {
  it("holds exactly the orders waiting on the shop, newest first", () => {
    const rows = queueRows(FIXTURE_CATALOG, BOOK, NOW);
    expect(rows).toHaveLength(
      ORDERS.filter((o) => ["AWAITING_TRANSFER", "PAID"].includes(o.status.state)).length,
    );
    const codes = rows.map((r) => r.code);
    expect(codes).toEqual([...codes].sort().reverse());
  });

  it("offers the one action that state allows", () => {
    for (const row of queueRows(FIXTURE_CATALOG, BOOK, NOW)) {
      const order = ORDERS.find((o) => o.code === row.code)!;
      expect(row.action).toBe(
        order.status.state === "AWAITING_TRANSFER" ? "MARK_PAID" : "HAND_OVER",
      );
    }
  });

  it("names what is in the box and what it came to", () => {
    const row = queueRows(FIXTURE_CATALOG, BOOK, NOW)[0]!;
    const order = ORDERS.find((o) => o.code === row.code)!;
    expect(row.items).toBe(orderItemsLabel(FIXTURE_CATALOG, order));
    expect(row.totalVnd).toBeGreaterThan(0);
    expect(row.customer).not.toBe("—");
  });

  it("names each style in the box as the back office does: its issue's code, or none (v3 slice 12)", () => {
    const first = ORDERS[0]!;
    const khoi = FIXTURE_CATALOG.bySlug.get("s05-khoi")!;
    const tee = FIXTURE_CATALOG.bySlug.get("ao-thun-tron")!;
    const order: Order = {
      ...first,
      lines: [
        { ...first.lines[0]!, productId: khoi.id, qty: 2 },
        { ...first.lines[0]!, productId: tee.id, qty: 1 },
      ],
    };
    // Each entry held together, the list breakable at its comma (v3 slice 13).
    expect(orderItemsLabel(FIXTURE_CATALOG, order)).toBe(
      "S05\u00a0–\u2060\u00a0KHÓI\u00a0×2, ÁO THUN TRƠN\u00a0×1",
    );
    expect(styleName("KHÓI", 5)).toBe("S05\u00a0– KHÓI");
  });

  it("hands a COD order over from RECEIVED, and asks for a card order's money first (slice B3a)", () => {
    const base = BOOK.find((o) => o.code === "DH-2429")!;
    const cod: AdminOrder = { ...base, code: "DH-2432" as AdminOrder["code"], payment: "COD", placedAt: "2026-09-17T09:00:00+07:00", status: { state: "RECEIVED" } };
    const card: AdminOrder = { ...base, code: "DH-2433" as AdminOrder["code"], payment: "CARD", status: { state: "RECEIVED" } };
    const [c2, c1] = queueRows(FIXTURE_CATALOG, [cod, card], NOW);
    expect(c2).toMatchObject({ code: "DH-2433", action: "MARK_PAID", late: false, due: null });
    expect(c2!.standing).toMatch(/^Đã nhận đơn .* · thẻ, chưa thu tiền$/);
    expect(c1).toMatchObject({ code: "DH-2432", action: "HAND_OVER", late: true, due: "3\u00a0ngày" });
    expect(c1!.standing).toBe("Đã nhận đơn 09:00 17/09 · COD, thu khi giao");
    expect(c1!.customer).toBe(base.owner!.name);
  });

  it("names the recipient of an order placed signed out, and says it is a guest's (slice B3b)", () => {
    const guest: AdminOrder = { ...BOOK.find((o) => o.code === "DH-2429")!, owner: null };
    expect(queueRows(FIXTURE_CATALOG, [guest], NOW)[0]!.customer).toBe(
      `${guest.shipTo.recipient} · vãng lai`,
    );
  });

  it("marks only a paid order that has waited too long", () => {
    const rows = queueRows(FIXTURE_CATALOG, BOOK, NOW).filter((r) => r.action === "HAND_OVER");
    for (const r of rows) expect(r.due === null).toBe(!r.late);
  });
});

describe("orderCustomer — the 'Khách' column", () => {
  it("is the account's name for an order with an account", () => {
    const own = BOOK.find((o) => o.code === "DH-2430")!;
    expect(orderCustomer(own)).toBe(own.owner!.name);
  });

  it("is the recipient and '· vãng lai' for an order placed signed out", () => {
    const guest: AdminOrder = { ...BOOK.find((o) => o.code === "DH-2430")!, owner: null };
    expect(orderCustomer(guest)).toBe(`${guest.shipTo.recipient} · ${GUEST_SUFFIX}`);
    expect(GUEST_SUFFIX).toBe("vãng lai");
  });
});

describe("dropRows", () => {
  it("lists every issue, newest number first", () => {
    expect(dropRows(FIXTURE_CATALOG, DROPS, NOW).map((r) => r.no)).toEqual(
      [...DROPS].map((d) => d.no).sort((a, b) => b - a),
    );
  });

  it("counts teased styles apart from styles on sale", () => {
    const rows = dropRows(FIXTURE_CATALOG, DROPS, NOW);
    const six = rows.find((r) => r.no === 6)!;
    expect(six.styles).toBe(0);
    expect(six.teasers).toBe(2);
  });

  it("reports a drop closed once its closing hour has been moved to the past", () => {
    // "Đóng sớm" is `admin_schedule_drop()` with the closing hour set to now:
    // the state follows the instant, with no flag to flip.
    const moved = DROPS.map((d) =>
      d.no === FIXTURE_CATALOG.currentDropNo ? { ...d, closesAt: "2026-09-20T09:00:00+07:00" } : d,
    );
    const row = dropRows(FIXTURE_CATALOG, moved, NOW).find((r) => r.no === FIXTURE_CATALOG.currentDropNo)!;
    expect(row.state).toBe("CLOSED");
  });

  it("gives an issue with nothing in it yet a row of its own", () => {
    const seven = { no: 7, opensAt: "2026-11-06T20:00:00+07:00", closesAt: "2026-11-20T20:00:00+07:00" };
    const row = dropRows(FIXTURE_CATALOG, [...DROPS, seven], NOW)[0]!;
    expect(row).toMatchObject({ no: 7, state: "UPCOMING", styles: 0, teasers: 0, cutUnits: 0 });
  });
});

