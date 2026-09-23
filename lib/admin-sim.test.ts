import { describe, it, expect } from "vitest";
import {
  CUSTOMER_AUTHOR,
  CUSTOMER_CANCEL_REASON,
  EMPTY_SIM,
  NOTE_AUTHOR,
  addressEditReason,
  isSimTeaser,
  nextDropNo,
  orderPatches,
  parseSim,
  pushSim,
  serializeSim,
  simCount,
  simDrops,
  simNotes,
  simOrders,
  simPromotions,
  simTeasers,
  teaserSlug,
  shopOrders,
  type SimAction,
} from "./admin-sim";
import { DROPS, TEASERS } from "@/data/catalog";
import { ORDERS } from "@/data/orders";
import { PROMOTIONS } from "@/data/promotions";
import { needsAction, salesWindow } from "./admin-metrics";
import { promoState } from "./admin-rows";
import { dropState } from "./drop";

const AT = "2026-09-20T18:50:00+07:00";
const NOW = new Date(AT);

function log(...actions: SimAction[]) {
  return actions.reduce(pushSim, EMPTY_SIM);
}

describe("parseSim", () => {
  it("reads back what it wrote", () => {
    const overlay = log({ kind: "ORDER_PAID", at: AT, code: "DH-2431" });
    expect(parseSim(serializeSim(overlay))).toEqual(overlay);
  });

  it("returns an empty log for nothing, junk, or the wrong version", () => {
    expect(parseSim(null)).toEqual(EMPTY_SIM);
    expect(parseSim("not json")).toEqual(EMPTY_SIM);
    expect(parseSim(JSON.stringify({ v: 99, actions: [{ kind: "ORDER_PAID" }] }))).toEqual(
      EMPTY_SIM,
    );
    expect(parseSim(JSON.stringify({ v: 1, actions: "nope" }))).toEqual(EMPTY_SIM);
  });

  it("drops a malformed action and keeps the sound ones", () => {
    // One bad record must not cost the other nineteen: an action missing its
    // code would render an order in a state nothing can draw.
    const raw = JSON.stringify({
      v: 1,
      actions: [
        { kind: "ORDER_PAID", at: AT, code: "DH-2431" },
        { kind: "ORDER_PAID", at: AT },
        { kind: "WHAT", at: AT },
        { kind: "ORDER_SHIPPED", at: AT, code: "DH-2429", carrier: "X", trackingCode: "T1" },
      ],
    });
    const overlay = parseSim(raw);
    expect(simCount(overlay)).toBe(2);
    expect(overlay.actions.map((a) => a.kind)).toEqual(["ORDER_PAID", "ORDER_SHIPPED"]);
  });
});

describe("simOrders", () => {
  it("leaves the fixtures alone when nothing has happened", () => {
    expect(simOrders(ORDERS, EMPTY_SIM)).toBe(ORDERS);
  });

  it("moves one order and touches no other", () => {
    const target = ORDERS.find((o) => o.status.state === "AWAITING_TRANSFER")!;
    const merged = simOrders(ORDERS, log({ kind: "ORDER_PAID", at: AT, code: target.code }));

    expect(merged).toHaveLength(ORDERS.length);
    expect(merged.find((o) => o.code === target.code)!.status).toEqual({
      state: "PAID",
      paidAt: AT,
    });
    expect(merged.filter((o) => o.code !== target.code)).toEqual(
      ORDERS.filter((o) => o.code !== target.code),
    );
  });

  it("keeps the last word when one order is acted on twice", () => {
    const target = ORDERS.find((o) => o.status.state === "AWAITING_TRANSFER")!;
    const merged = simOrders(
      ORDERS,
      log(
        { kind: "ORDER_PAID", at: AT, code: target.code },
        {
          kind: "ORDER_SHIPPED",
          at: AT,
          code: target.code,
          carrier: "Tự giao",
          trackingCode: "VNP-1",
        },
      ),
    );
    expect(merged.find((o) => o.code === target.code)!.status).toEqual({
      state: "SHIPPING",
      shippedAt: AT,
      trackingCode: "VNP-1",
    });
  });

  it("carries the courier beside the status, not inside it", () => {
    const patch = orderPatches(
      log({
        kind: "ORDER_SHIPPED",
        at: AT,
        code: "DH-2429",
        carrier: "Giao Hàng Nhanh",
        trackingCode: "VNP-9",
      }),
    ).get("DH-2429")!;
    expect(patch.carrier).toBe("Giao Hàng Nhanh");
    expect(patch.status).not.toHaveProperty("carrier");
  });

  it("feeds the queue and the revenue window without either knowing", () => {
    // The whole point of merging at the order level: every figure already
    // derived from ORDERS recomputes for free.
    const target = ORDERS.find((o) => o.status.state === "AWAITING_TRANSFER")!;
    const overlay = log({ kind: "ORDER_PAID", at: AT, code: target.code });
    const merged = simOrders(ORDERS, overlay);

    const before = salesWindow(NOW, ORDERS, 14).totalVnd;
    const after = salesWindow(NOW, merged, 14).totalVnd;
    expect(after).toBeGreaterThan(before);

    expect(needsAction(merged)).toHaveLength(needsAction(ORDERS).length);
    expect(
      needsAction(merged).find((o) => o.code === target.code)!.status.state,
    ).toBe("PAID");
  });

  it("takes a cancelled order out of the queue and out of the money", () => {
    const target = ORDERS.find((o) => o.status.state === "PAID")!;
    const overlay = log({
      kind: "ORDER_CANCELLED",
      at: AT,
      code: target.code,
      reason: "khách đổi ý",
      note: "",
    });
    const merged = simOrders(ORDERS, overlay);
    expect(needsAction(merged)).toHaveLength(needsAction(ORDERS).length - 1);
    expect(salesWindow(NOW, merged, 30).totalVnd).toBeLessThan(
      salesWindow(NOW, ORDERS, 30).totalVnd,
    );
  });
});

describe("simNotes", () => {
  it("writes a system note for every action on that order, and only that order", () => {
    const overlay = log(
      { kind: "ORDER_PAID", at: AT, code: "DH-2429" },
      { kind: "ORDER_NOTE", at: AT, code: "DH-2430", text: "gói riêng" },
      {
        kind: "ORDER_SHIPPED",
        at: AT,
        code: "DH-2429",
        carrier: "Tự giao",
        trackingCode: "VNP-7",
      },
    );
    const notes = simNotes("DH-2429", overlay);
    expect(notes).toHaveLength(2);
    expect(notes.every((n) => n.system)).toBe(true);
    expect(notes[1]!.text).toContain("VNP-7");
  });

  it("names the shop as the author of a note somebody typed", () => {
    const notes = simNotes("DH-2429", log({ kind: "ORDER_NOTE", at: AT, code: "DH-2429", text: "gọi trước" }));
    expect(notes[0]).toMatchObject({ author: NOTE_AUTHOR, system: false, text: "gọi trước" });
  });

  it("splits a cancellation into what happened and what was written about it", () => {
    const notes = simNotes(
      "DH-2429",
      log({
        kind: "ORDER_CANCELLED",
        at: AT,
        code: "DH-2429",
        reason: "Khách đổi ý",
        note: "đã gọi xác nhận",
      }),
    );
    expect(notes.map((n) => n.system)).toEqual([true, false]);
    expect(notes[1]!.author).toBe(NOTE_AUTHOR);
  });

  it("drops an empty internal comment rather than adding a blank note", () => {
    const notes = simNotes(
      "DH-2429",
      log({ kind: "ORDER_CANCELLED", at: AT, code: "DH-2429", reason: "Hết hàng", note: "   " }),
    );
    expect(notes).toHaveLength(1);
  });
});

describe("simDrops", () => {
  it("passes the fixtures through, newest first", () => {
    const rows = simDrops(DROPS, EMPTY_SIM);
    expect(rows.map((d) => d.no)).toEqual([...DROPS].map((d) => d.no).sort((a, b) => b - a));
    expect(rows.every((d) => !d.simulated && !d.rescheduled)).toBe(true);
  });

  it("closes a drop early by moving its closing hour, not by adding a state", () => {
    const rows = simDrops(
      DROPS,
      log({
        kind: "DROP_SCHEDULED",
        at: AT,
        no: 5,
        opensAt: "2026-09-11T20:00:00+07:00",
        closesAt: AT,
      }),
    );
    const five = rows.find((d) => d.no === 5)!;
    expect(five.rescheduled).toBe(true);
    expect(dropState(five, new Date("2026-09-20T18:51:00+07:00"))).toBe("CLOSED");
  });

  it("adds a drop that exists in no fixture", () => {
    const rows = simDrops(
      DROPS,
      log({
        kind: "DROP_ADDED",
        at: AT,
        no: 7,
        opensAt: "2026-11-06T20:00:00+07:00",
        closesAt: "2026-11-20T20:00:00+07:00",
      }),
    );
    expect(rows[0]).toMatchObject({ no: 7, simulated: true });
    expect(rows).toHaveLength(DROPS.length + 1);
  });

  it("offers the next unused number", () => {
    expect(nextDropNo(simDrops(DROPS, EMPTY_SIM))).toBe(7);
  });
});

describe("simPromotions", () => {
  it("passes the fixtures through untouched", () => {
    const rows = simPromotions(PROMOTIONS, EMPTY_SIM);
    expect(rows).toHaveLength(PROMOTIONS.length);
    expect(rows.every((r) => !r.paused && !r.simulated)).toBe(true);
  });

  it("pauses and resumes the same code", () => {
    const code = String(PROMOTIONS[0]!.code);
    const paused = simPromotions(PROMOTIONS, log({ kind: "PROMO_PAUSED", at: AT, code, paused: true }));
    expect(paused.find((r) => String(r.promo.code) === code)!.paused).toBe(true);

    const resumed = simPromotions(
      PROMOTIONS,
      log(
        { kind: "PROMO_PAUSED", at: AT, code, paused: true },
        { kind: "PROMO_PAUSED", at: AT, code, paused: false },
      ),
    );
    expect(resumed.find((r) => String(r.promo.code) === code)!.paused).toBe(false);
  });

  it("builds a new code with nothing redeemed against it", () => {
    const rows = simPromotions(
      PROMOTIONS,
      log({
        kind: "PROMO_ADDED",
        at: AT,
        code: "DOT06",
        promoKind: "PERCENT",
        percent: 10,
        amountVnd: 0,
        maxDiscountVnd: 150_000,
        minOrderVnd: 500_000,
        usageLimit: 200,
        startsAt: "2026-10-02T20:00:00+07:00",
        endsAt: "2026-10-16T20:00:00+07:00",
      }),
    );
    const row = rows[0]!;
    expect(row.simulated).toBe(true);
    expect(row.promo).toMatchObject({
      kind: "PERCENT",
      percent: 10,
      maxDiscountVnd: 150_000,
      minOrderVnd: 500_000,
      usedCount: 0,
    });
  });

  it("leaves out a cap and a minimum that were left at zero", () => {
    const rows = simPromotions(
      PROMOTIONS,
      log({
        kind: "PROMO_ADDED",
        at: AT,
        code: "TRON",
        promoKind: "AMOUNT",
        percent: 0,
        amountVnd: 50_000,
        maxDiscountVnd: 0,
        minOrderVnd: 0,
        usageLimit: null,
        startsAt: "2026-10-02T20:00:00+07:00",
        endsAt: "2026-10-16T20:00:00+07:00",
      }),
    );
    expect(rows[0]!.promo).not.toHaveProperty("minOrderVnd");
    expect(rows[0]!.promo).toMatchObject({ kind: "AMOUNT", amountVnd: 50_000, usageLimit: null });
  });
});

describe("a cancellation that came from the shopper", () => {
  // The store is shared with the back office on purpose: a cancellation the
  // shop cannot see is a cancellation that did not happen.
  const sim = () =>
    log({ kind: "ORDER_CANCELLED_BY_CUSTOMER", at: AT, code: "DH-2430" });

  it("moves the order to cancelled, with the shopper's reason on it", () => {
    const order = simOrders(ORDERS, sim()).find((o) => o.code === "DH-2430")!;
    expect(order.status.state).toBe("CANCELLED");
    expect(order.status.state === "CANCELLED" && order.status.reason).toBe(
      CUSTOMER_CANCEL_REASON,
    );
    expect(order.status.state === "CANCELLED" && order.status.cancelledAt).toBe(AT);
  });

  it("writes one note, and names the hand that did it", () => {
    const notes = simNotes("DH-2430", sim());
    expect(notes).toHaveLength(1);
    expect(notes[0]!.author).toBe(CUSTOMER_AUTHOR);
    expect(notes[0]!.author).not.toBe(NOTE_AUTHOR);
    expect(notes[0]!.text).toContain("Khách huỷ đơn");
  });

  it("counts as one simulated change in this browser", () => {
    expect(simCount(sim())).toBe(1);
  });

  it("survives a round trip through storage", () => {
    const back = parseSim(serializeSim(sim()));
    expect(back.actions).toEqual(sim().actions);
  });

  it("drops a record with no order code rather than half-trusting it", () => {
    const raw = JSON.stringify({
      v: 1,
      actions: [{ kind: "ORDER_CANCELLED_BY_CUSTOMER", at: AT }],
    });
    expect(parseSim(raw).actions).toEqual([]);
  });

  it("leaves every other order where it was", () => {
    const rows = simOrders(ORDERS, sim());
    expect(rows).toHaveLength(ORDERS.length);
    const untouched = rows.find((o) => o.code === "DH-2431")!;
    expect(untouched.status.state).toBe("AWAITING_TRANSFER");
  });
});

describe("shopOrders — the same log, read from the shop", () => {
  it("shows a handover, because the parcel and its number are real", () => {
    const sim = log({
      kind: "ORDER_SHIPPED",
      at: AT,
      code: "DH-2429",
      carrier: "Giao tiêu chuẩn",
      trackingCode: "VNP-2429-01",
    });
    const order = shopOrders(ORDERS, sim).find((o) => o.code === "DH-2429")!;
    expect(order.status.state).toBe("SHIPPING");
    expect(order.status.state === "SHIPPING" && order.status.trackingCode).toBe("VNP-2429-01");
  });

  it("shows a cancellation the shop made, with the reason the sheet promised", () => {
    const sim = log({
      kind: "ORDER_CANCELLED",
      at: AT,
      code: "DH-2429",
      reason: "Hết hàng thật",
      note: "",
    });
    const order = shopOrders(ORDERS, sim).find((o) => o.code === "DH-2429")!;
    expect(order.status.state).toBe("CANCELLED");
    expect(order.status.state === "CANCELLED" && order.status.reason).toBe("Hết hàng thật");
  });

  it("carries an edited delivery address with the order it belongs to", () => {
    const base = ORDERS.find((o) => o.code === "DH-2429")!;
    const sim = log({
      kind: "ORDER_ADDRESS_EDITED",
      at: AT,
      code: "DH-2429",
      before: base.shipTo,
      after: { ...base.shipTo, line: "47 Trần Hưng Đạo" },
      reason: "khách nhắn đổi số nhà",
    });
    const order = shopOrders(ORDERS, sim).find((o) => o.code === "DH-2429")!;
    expect(order.shipTo.line).toBe("47 Trần Hưng Đạo");
  });

  it("shows the shopper the order they just called off", () => {
    const sim = log({ kind: "ORDER_CANCELLED_BY_CUSTOMER", at: AT, code: "DH-2430" });
    const order = shopOrders(ORDERS, sim).find((o) => o.code === "DH-2430")!;
    expect(order.status.state).toBe("CANCELLED");
  });

  it("does NOT show them a state the back office simulated", () => {
    // Nobody has been paid. A simulated click in the back office must not
    // tell a shopper their money arrived.
    const sim = log({ kind: "ORDER_PAID", at: AT, code: "DH-2430" });
    const order = shopOrders(ORDERS, sim).find((o) => o.code === "DH-2430")!;
    expect(order.status.state).toBe("AWAITING_TRANSFER");
  });

  it("returns the fixtures untouched when nothing was cancelled", () => {
    expect(shopOrders(ORDERS, EMPTY_SIM)).toBe(ORDERS);
  });
});

// ───────────────────────────────────────────────────────── v3 slice 5
describe("ORDER_ADDRESS_EDITED — the parcel goes to the new address", () => {
  const base = ORDERS.find((o) => o.code === "DH-2429")!;
  const moved = { ...base.shipTo, line: "47 Trần Hưng Đạo" };
  const edit: SimAction = {
    kind: "ORDER_ADDRESS_EDITED",
    at: AT,
    code: "DH-2429",
    before: base.shipTo,
    after: moved,
    reason: "khách nhắn đổi số nhà",
  };

  it("replaces the frozen copy rather than sitting beside it", () => {
    const order = simOrders(ORDERS, log(edit)).find((o) => o.code === "DH-2429")!;
    expect(order.shipTo.line).toBe("47 Trần Hưng Đạo");
    // Everything else on the address is untouched.
    expect(order.shipTo.recipient).toBe(base.shipTo.recipient);
    expect(order.shipTo.wardCode).toBe(base.shipTo.wardCode);
  });

  it("leaves the status alone", () => {
    const order = simOrders(ORDERS, log(edit)).find((o) => o.code === "DH-2429")!;
    expect(order.status).toEqual(base.status);
  });

  it("touches no other order", () => {
    const after = simOrders(ORDERS, log(edit));
    for (const o of after) {
      if (o.code === "DH-2429") continue;
      expect(o.shipTo).toEqual(ORDERS.find((x) => x.code === o.code)!.shipTo);
    }
  });

  it("keeps the last edit when the address is changed twice", () => {
    const again: SimAction = {
      ...edit,
      at: "2026-09-20T19:00:00+07:00",
      before: moved,
      after: { ...moved, line: "49 Trần Hưng Đạo" },
      reason: "gọi lại xác nhận",
    };
    const order = simOrders(ORDERS, log(edit, again)).find((o) => o.code === "DH-2429")!;
    expect(order.shipTo.line).toBe("49 Trần Hưng Đạo");
    expect(addressEditReason("DH-2429", log(edit, again))).toBe("gọi lại xác nhận");
  });

  it("writes a note that says why, and the note is the shop's own record", () => {
    const notes = simNotes("DH-2429", log(edit));
    expect(notes).toHaveLength(1);
    expect(notes[0]!.text).toBe("Sửa địa chỉ giao · lý do: khách nhắn đổi số nhà");
    expect(notes[0]!.system).toBe(true);
  });

  it("survives a round trip through storage", () => {
    const back = parseSim(serializeSim(log(edit)));
    expect(back.actions).toEqual([edit]);
  });

  it("drops a record whose address is not an address", () => {
    const bad = JSON.stringify({
      v: 1,
      actions: [{ ...edit, after: { line: "47 Trần Hưng Đạo" } }],
    });
    expect(parseSim(bad).actions).toEqual([]);
  });
});

describe("ORDER_CONFIRMATION_RESENT — a record, not a message", () => {
  const resend: SimAction = {
    kind: "ORDER_CONFIRMATION_RESENT",
    at: AT,
    code: "DH-2430",
    email: "minhanh@vidu.vn",
  };

  it("changes nothing about the order", () => {
    expect(simOrders(ORDERS, log(resend))).toEqual(ORDERS);
  });

  it("writes a note that admits nothing was sent", () => {
    const note = simNotes("DH-2430", log(resend))[0]!;
    expect(note.text).toContain("Đã ghi nhật ký");
    expect(note.text).toContain("chưa có máy chủ gửi");
    expect(note.text).not.toContain("Đã gửi ");
  });

  it("still counts as a change on this browser", () => {
    expect(simCount(log(resend))).toBe(1);
  });
});

describe("editing a code", () => {
  const terms = {
    at: AT,
    promoKind: "PERCENT" as const,
    percent: 12,
    amountVnd: 0,
    maxDiscountVnd: 180_000,
    minOrderVnd: 600_000,
    usageLimit: 300,
    startsAt: "2026-09-11T20:00:00+07:00",
    endsAt: "2026-09-25T20:00:00+07:00",
  };
  const edit: SimAction = { kind: "PROMO_EDITED", code: "DOT05", nextCode: "DOT05", ...terms };

  it("rewrites the terms in place", () => {
    const row = simPromotions(PROMOTIONS, log(edit)).find((r) => r.promo.code === "DOT05")!;
    expect(row.promo.kind).toBe("PERCENT");
    expect(row.promo.kind === "PERCENT" && row.promo.percent).toBe(12);
    expect(row.promo.kind === "PERCENT" && row.promo.maxDiscountVnd).toBe(180_000);
    expect(row.promo.minOrderVnd).toBe(600_000);
    expect(row.promo.usageLimit).toBe(300);
    expect(row.edited).toBe(true);
    expect(row.simulated).toBe(false);
  });

  it("keeps what the code has already done", () => {
    const before = PROMOTIONS.find((p) => p.code === "DOT05")!.usedCount;
    const row = simPromotions(PROMOTIONS, log(edit)).find((r) => r.promo.code === "DOT05")!;
    expect(row.promo.usedCount).toBe(before);
  });

  it("renames the row when the code itself changes", () => {
    const renamed: SimAction = { ...edit, nextCode: "DOT05B" };
    const rows = simPromotions(PROMOTIONS, log(renamed));
    expect(rows.some((r) => r.promo.code === "DOT05")).toBe(false);
    expect(rows.find((r) => r.promo.code === "DOT05B")!.edited).toBe(true);
    // The list keeps its length: an edit never adds a row.
    expect(rows).toHaveLength(PROMOTIONS.length);
  });

  it("changes the KIND of a code when the form does", () => {
    const flat: SimAction = { ...edit, promoKind: "AMOUNT", amountVnd: 80_000 };
    const row = simPromotions(PROMOTIONS, log(flat)).find((r) => r.promo.code === "DOT05")!;
    expect(row.promo.kind).toBe("AMOUNT");
    expect(row.promo.kind === "AMOUNT" && row.promo.amountVnd).toBe(80_000);
  });

  it("raises the cap without touching anything else", () => {
    const raise: SimAction = {
      kind: "PROMO_LIMIT_RAISED",
      at: AT,
      code: "DOT05",
      before: 200,
      after: 250,
    };
    const row = simPromotions(PROMOTIONS, log(raise)).find((r) => r.promo.code === "DOT05")!;
    expect(row.promo.usageLimit).toBe(250);
    expect(row.promo.endsAt).toBe(PROMOTIONS.find((p) => p.code === "DOT05")!.endsAt);
    expect(row.edited).toBe(true);
  });

  it("ends a run by moving its closing hour, so the state stays derived", () => {
    const end: SimAction = { kind: "PROMO_ENDED", at: AT, code: "DOT05", endsAt: AT };
    const row = simPromotions(PROMOTIONS, log(end)).find((r) => r.promo.code === "DOT05")!;
    expect(row.promo.endsAt).toBe(AT);
    expect(promoState(row.promo, new Date(Date.parse(AT) + 60_000))).toBe("ENDED");
  });

  it("duplicating is a creation, so the copy starts at zero uses", () => {
    const copy: SimAction = {
      kind: "PROMO_ADDED",
      at: AT,
      code: "SO06",
      promoKind: "PERCENT",
      percent: 10,
      amountVnd: 0,
      maxDiscountVnd: 150_000,
      minOrderVnd: 500_000,
      usageLimit: 200,
      startsAt: "2026-10-02T20:00:00+07:00",
      endsAt: "2026-10-16T20:00:00+07:00",
    };
    const rows = simPromotions(PROMOTIONS, log(copy));
    const made = rows.find((r) => r.promo.code === "SO06")!;
    expect(made.simulated).toBe(true);
    expect(made.promo.usedCount).toBe(0);
    expect(rows).toHaveLength(PROMOTIONS.length + 1);
  });

  it("survives a round trip and refuses a malformed record", () => {
    expect(parseSim(serializeSim(log(edit))).actions).toEqual([edit]);
    const bad = JSON.stringify({ v: 1, actions: [{ ...edit, nextCode: 5 }] });
    expect(parseSim(bad).actions).toEqual([]);
  });
});

describe("TEASER_ADDED — a name, a kind and a photo, nothing else", () => {
  const teaser: SimAction = {
    kind: "TEASER_ADDED",
    at: AT,
    no: 6,
    name: "SỎI",
    garment: "Áo khoác dù",
    family: "JACKET",
    photoKey: "suong",
  };

  it("joins the issue's teasers", () => {
    const rows = simTeasers(TEASERS, log(teaser));
    expect(rows).toHaveLength(TEASERS.length + 1);
    const made = rows.at(-1)!;
    expect(made.name).toBe("SỎI");
    expect(made.kind).toBe("Áo khoác dù");
    expect(made.dropNo).toBe(6);
  });

  it("gets a slug of English letters, derived from the name", () => {
    expect(teaserSlug("SỎI", 6)).toBe("soi-6");
    expect(teaserSlug("ĐÁ CUỘI", 7)).toBe("da-cuoi-7");
  });

  it("is marked as born in this browser", () => {
    expect(isSimTeaser("soi-6", log(teaser))).toBe(true);
    expect(isSimTeaser("soi", log(teaser))).toBe(false);
  });

  it("returns the fixtures untouched when none was added", () => {
    expect(simTeasers(TEASERS, EMPTY_SIM)).toBe(TEASERS);
  });
});
