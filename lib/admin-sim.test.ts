import { describe, it, expect } from "vitest";
import {
  EMPTY_SIM,
  isSimTeaser,
  nextDropNo,
  parseSim,
  pushSim,
  serializeSim,
  simCount,
  simDrops,
  simPromotions,
  simTeasers,
  teaserSlug,
  type SimAction,
} from "./admin-sim";
import { DROPS, TEASERS } from "@/data/catalog";
import { PROMOTIONS } from "@/data/promotions";
import { promoState } from "./admin-rows";
import { dropState } from "./drop";

const AT = "2026-09-20T18:50:00+07:00";

function log(...actions: SimAction[]) {
  return actions.reduce(pushSim, EMPTY_SIM);
}

const PAUSE: SimAction = { kind: "PROMO_PAUSED", at: AT, code: "BANTHAN", paused: true };
const ADJUST: SimAction = {
  kind: "INVENTORY_ADJUSTED",
  at: AT,
  productId: "p-bui",
  cells: [{ color: "black", size: "L", before: 1, after: 2 }],
  reason: "Hàng trả về",
  ref: "",
  note: "",
};

describe("parseSim", () => {
  it("reads back what it wrote", () => {
    const overlay = log(PAUSE, ADJUST);
    expect(parseSim(serializeSim(overlay))).toEqual(overlay);
  });

  it("returns an empty log for nothing, junk, or the wrong version", () => {
    expect(parseSim(null)).toEqual(EMPTY_SIM);
    expect(parseSim("not json")).toEqual(EMPTY_SIM);
    expect(parseSim(JSON.stringify({ v: 99, actions: [PAUSE] }))).toEqual(EMPTY_SIM);
    expect(parseSim(JSON.stringify({ v: 1, actions: "nope" }))).toEqual(EMPTY_SIM);
  });

  it("drops a malformed action and keeps the sound ones", () => {
    // One bad record must not cost the other nineteen.
    const raw = JSON.stringify({
      v: 1,
      actions: [PAUSE, { kind: "PROMO_PAUSED", at: AT, code: "BANTHAN" }, { kind: "WHAT", at: AT }, ADJUST],
    });
    const overlay = parseSim(raw);
    expect(simCount(overlay)).toBe(2);
    expect(overlay.actions.map((a) => a.kind)).toEqual(["PROMO_PAUSED", "INVENTORY_ADJUSTED"]);
  });

  it("drops the order actions a build before slice B3a wrote, and keeps the rest", () => {
    // Orders live in Postgres now; a browser that still holds their old
    // simulated moves must not replay them on top of the real ones.
    const raw = JSON.stringify({
      v: 1,
      actions: [
        { kind: "ORDER_PAID", at: AT, code: "DH-2431" },
        PAUSE,
        { kind: "ORDER_SHIPPED", at: AT, code: "DH-2429", carrier: "X", trackingCode: "T1" },
        { kind: "ORDER_CANCELLED_BY_CUSTOMER", at: AT, code: "DH-2430" },
        { kind: "ORDER_NOTE", at: AT, code: "DH-2430", text: "x" },
        { kind: "ORDER_CONFIRMATION_RESENT", at: AT, code: "DH-2430", email: "x@y.vn" },
        ADJUST,
      ],
    });
    expect(parseSim(raw).actions.map((a) => a.kind)).toEqual(["PROMO_PAUSED", "INVENTORY_ADJUSTED"]);
  });

  it("counts what is left as this browser's changes", () => {
    expect(simCount(log(PAUSE, ADJUST))).toBe(2);
    expect(simCount(EMPTY_SIM)).toBe(0);
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
