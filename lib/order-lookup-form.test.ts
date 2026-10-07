import { describe, expect, it } from "vitest";
import type { Order, OrderCode } from "@/data/types";
import { orderByCode } from "@/data/orders";
import {
  LOOKED_UP_KEYS,
  NO_LOOKUP,
  lookedUpOf,
  lookupFormState,
  readLookupForm,
  trackStart,
  type KnownOrder,
  type LookupFormState,
} from "./order-lookup";

/**
 * Slice B19's pure half of the lookup without the phone number in its
 * address: what a lookup form sent, the state its action answers, an order
 * the app already holds cut to what the lookup prints, and the screen's first
 * state from what its page knows.
 */

const sample = (code: string): Order => {
  const o = orderByCode.get(code as OrderCode);
  if (!o) throw new Error(`no sample order ${code}`);
  return o;
};

const form = (fields: Record<string, string | Blob>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe("readLookupForm", () => {
  it("reads the two fields as they were typed", () => {
    expect(readLookupForm(form({ code: " dh2425 ", phone: "0908 221 447", $ACTION_KEY: "p/track" }))).toEqual({
      code: " dh2425 ",
      phone: "0908 221 447",
    });
  });

  it("reads a missing field, a file, or a body that is not a form as nothing typed", () => {
    expect(readLookupForm(form({ code: "DH-2425" }))).toEqual({ code: "DH-2425", phone: "" });
    expect(readLookupForm(form({ code: new Blob(["DH-2425"]), phone: "0908221447" }))).toEqual({
      code: "",
      phone: "0908221447",
    });
    for (const body of [undefined, null, "code=DH-2425", { code: "DH-2425", phone: "0908221447" }]) {
      expect(readLookupForm(body), String(body)).toEqual({ code: "", phone: "" });
    }
  });
});

describe("lookupFormState", () => {
  it("hands the two fields back with the answer, cut to a few dozen characters", () => {
    const answer = { ok: false as const, reason: "INVALID" as const, errors: { code: "Mã đơn có dạng DH-1499" } };
    const state = lookupFormState({ code: "x".repeat(5_000), phone: "0908 221 447" }, answer);
    expect(state.code).toHaveLength(64);
    expect(state.phone).toBe("0908 221 447");
    expect(state.result).toBe(answer);
  });
});

describe("lookedUpOf", () => {
  it("keeps exactly the lookup's ten keys, and no courier in SHIPPING's status", () => {
    const base = sample("DH-2425");
    const withCarrier: Order = {
      ...base,
      status: { ...(base.status as Extract<Order["status"], { state: "SHIPPING" }>), carrier: "Giao nhanh" },
    };
    const cut = lookedUpOf(withCarrier);
    expect(Object.keys(cut).sort()).toEqual([...LOOKED_UP_KEYS].filter((k) => k in base).sort());
    expect(cut.status).toEqual({ state: "SHIPPING", shippedAt: "2026-09-17T09:15:00+07:00", trackingCode: "VNP-8842204" });
    expect(cut.promo).toBe(base.promo);
    const text = JSON.stringify(cut);
    for (const gone of [base.shipTo.recipient, base.shipTo.phone, base.shipTo.line, "Giao nhanh"]) {
      expect(text, gone).not.toContain(gone);
    }
  });

  it("leaves promo and moments out when the order has none, as Order does", () => {
    const cod = sample("DH-2211");
    const { moments: _moments, ...without } = cod;
    const cut = lookedUpOf(without);
    expect("promo" in cut).toBe(false);
    expect("moments" in cut).toBe(false);
    expect(cut.status).toEqual(cod.status);
  });
});

describe("trackStart: what the lookup screen is drawn with first", () => {
  const found = lookedUpOf(sample("DH-2425"));
  const known: KnownOrder = { order: lookedUpOf(sample("DH-2422")), phone: "0938 571 204" };
  const posted = (result: LookupFormState["result"]): LookupFormState => ({
    code: "dh2425",
    phone: " 0908 221 447 ",
    result,
  });

  it("a code alone: the form with the code typed in, nothing asked yet, the address without a number", () => {
    expect(trackStart({ posted: NO_LOOKUP, known: null, code: "dh2425", phone: "" })).toEqual({
      values: { code: "dh2425", phone: "" },
      errors: {},
      notice: null,
      found: null,
      here: "/track?code=DH-2425",
    });
  });

  it("an old link's number is typed in for the one lookup on mount, and the address it leaves has none", () => {
    const start = trackStart({ posted: NO_LOOKUP, known: null, code: "DH-2425", phone: "0908221447" });
    expect(start.values).toEqual({ code: "DH-2425", phone: "0908221447" });
    expect(start.here).toBe("/track?code=DH-2425");
  });

  it("something that is not a code: the bare page", () => {
    expect(trackStart({ posted: NO_LOOKUP, known: null, code: "<b>", phone: "" }).here).toBe("/track");
    expect(trackStart({ posted: NO_LOOKUP, known: null, code: "", phone: "" }).here).toBe("/track");
  });

  it("an order this browser may already see: shown at once, the number on the order for COD's line", () => {
    expect(trackStart({ posted: NO_LOOKUP, known, code: "DH-2422", phone: "" })).toEqual({
      values: { code: "DH-2422", phone: "" },
      errors: {},
      notice: null,
      found: { order: known.order, phone: "0938 571 204", fresh: false },
      here: "/track?code=DH-2422",
    });
  });

  it("a form sent without script: its answer comes first, on the bare page, the number as typed", () => {
    expect(trackStart({ posted: posted({ ok: true, order: found }), known, code: "", phone: "" })).toEqual({
      values: { code: "dh2425", phone: " 0908 221 447 " },
      errors: {},
      notice: null,
      found: { order: found, phone: "0908 221 447", fresh: false },
      here: "/track",
    });
  });

  it("a form sent without script that missed: the sentence under its field, the fields as sent", () => {
    const miss = posted({ ok: false, reason: "PHONE_MISMATCH", errors: { phone: "Số điện thoại không khớp với đơn" } });
    expect(trackStart({ posted: miss, known: null, code: "", phone: "" })).toEqual({
      values: { code: "dh2425", phone: " 0908 221 447 " },
      errors: { phone: "Số điện thoại không khớp với đơn" },
      notice: null,
      found: null,
      here: "/track",
    });
  });

  it("a form sent without script and refused: the sentence for the whole form, since no toast can show", () => {
    const wait = "Quá nhiều lượt liên tiếp. Thử lại sau 7 phút.";
    const start = trackStart({ posted: posted({ ok: false, reason: "RATE_LIMITED", message: wait }), known: null, code: "", phone: "" });
    expect(start.notice).toBe(wait);
    expect(start.errors).toEqual({});
    expect(start.found).toBeNull();
  });
});
