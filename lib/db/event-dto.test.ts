import { describe, expect, it } from "vitest";
import { toEvent, toEvents, vnIso, type EventRow } from "./event-dto";

/** A row exactly as PostgREST hands it over: UTC, microseconds, jsonb payload. */
const row = (over: Partial<EventRow> = {}): EventRow => ({
  id: 7,
  at: "2026-09-23T12:05:09.123456+00:00",
  actor_role: "admin",
  actor: "quanly@email.com",
  kind: "ORDER_PAID",
  order_code: "DH-2430",
  payload: { from: "AWAITING_TRANSFER" },
  ...over,
});

const SHIP_TO = {
  recipient: "Trần Minh Anh",
  phone: "0912345678",
  line: "24 Nguyễn Thị Minh Khai",
  provinceCode: "29",
  wardCode: "70101063",
};

describe("vnIso", () => {
  it("rewrites a UTC timestamp as the Vietnamese wall clock, to the second", () => {
    expect(vnIso("2026-09-23T12:05:09.123456+00:00")).toBe("2026-09-23T19:05:09+07:00");
    expect(vnIso("2026-09-23 11:50:00+00")).toBe("2026-09-23T18:50:00+07:00");
  });

  it("leaves a +07:00 moment as it was", () => {
    expect(vnIso("2026-09-20T18:50:00+07:00")).toBe("2026-09-20T18:50:00+07:00");
  });

  it("crosses midnight the right way", () => {
    expect(vnIso("2026-09-23T17:30:00+00:00")).toBe("2026-09-24T00:30:00+07:00");
  });

  it("refuses what is not a moment, naming where it came from", () => {
    expect(() => vnIso("hôm qua", "event 1.at")).toThrow("event 1.at must be a timestamp");
  });
});

describe("toEvent — the base every event carries", () => {
  it("reads who, when and which order", () => {
    expect(toEvent(row())).toEqual({
      id: 7,
      at: "2026-09-23T19:05:09+07:00",
      actorRole: "admin",
      actor: "quanly@email.com",
      code: "DH-2430",
      kind: "ORDER_PAID",
      from: "AWAITING_TRANSFER",
    });
  });

  it("reads the system's own hand, which has no email", () => {
    const e = toEvent(row({ actor_role: "system", actor: "", payload: {} }));
    expect(e).toMatchObject({ actorRole: "system", actor: "" });
    expect("from" in e).toBe(false);
  });

  it("refuses a role, a kind or an order code the table cannot hold", () => {
    expect(() => toEvent(row({ actor_role: "robot" }))).toThrow("event 7.actor_role");
    expect(() => toEvent(row({ kind: "ORDER_TELEPORTED" }))).toThrow("event 7.kind");
    expect(() => toEvent(row({ order_code: null }))).toThrow("event 7.order_code");
    expect(() => toEvent(row({ order_code: "2430" }))).toThrow("event 7.order_code");
    expect(() => toEvent(row({ payload: { from: "LOST" } }))).toThrow("event 7.payload.from");
    expect(() => toEvent(row({ payload: [] }))).toThrow("event 7.payload must be an object");
  });
});

describe("toEvent — each kind, with the fields its SimAction carried", () => {
  it("ORDER_PLACED", () => {
    expect(
      toEvent(row({ kind: "ORDER_PLACED", actor_role: "customer", actor: "khach@example.test", payload: {} })),
    ).toMatchObject({ kind: "ORDER_PLACED", actorRole: "customer", actor: "khach@example.test" });
  });

  it("ORDER_SHIPPED, with the courier when the handover named one", () => {
    const e = toEvent(
      row({
        kind: "ORDER_SHIPPED",
        payload: { from: "PAID", carrier: "Giao tiêu chuẩn · 2–4 ngày", trackingCode: "VNP-2430-01" },
      }),
    );
    expect(e).toMatchObject({
      kind: "ORDER_SHIPPED",
      from: "PAID",
      carrier: "Giao tiêu chuẩn · 2–4 ngày",
      trackingCode: "VNP-2430-01",
    });
  });

  it("ORDER_SHIPPED from the sample, which recorded no courier", () => {
    const e = toEvent(row({ kind: "ORDER_SHIPPED", payload: { from: "PAID", trackingCode: "VD-8842-1907" } }));
    expect("carrier" in e).toBe(false);
    expect(() => toEvent(row({ kind: "ORDER_SHIPPED", payload: { from: "PAID" } }))).toThrow(
      "event 7.payload.trackingCode",
    );
  });

  it("ORDER_DELIVERED and ORDER_EXPIRED carry nothing but the moment", () => {
    expect(toEvent(row({ kind: "ORDER_DELIVERED", payload: {} })).kind).toBe("ORDER_DELIVERED");
    expect(toEvent(row({ kind: "ORDER_EXPIRED", actor_role: "system", actor: "", payload: {} })).kind).toBe(
      "ORDER_EXPIRED",
    );
  });

  it("ORDER_CANCELLED, with its reason and the internal note (which may be empty)", () => {
    expect(
      toEvent(row({ kind: "ORDER_CANCELLED", payload: { from: "PAID", reason: "Khác", note: "" } })),
    ).toMatchObject({ from: "PAID", reason: "Khác", note: "" });
    expect(toEvent(row({ kind: "ORDER_CANCELLED", payload: { reason: "Khách đổi ý" } }))).toMatchObject({
      reason: "Khách đổi ý",
      note: "",
    });
    expect(() => toEvent(row({ kind: "ORDER_CANCELLED", payload: { note: "x" } }))).toThrow(
      "event 7.payload.reason",
    );
  });

  it("ORDER_CANCELLED_BY_CUSTOMER, with the state it left", () => {
    expect(
      toEvent(row({ kind: "ORDER_CANCELLED_BY_CUSTOMER", actor_role: "customer", payload: { from: "RECEIVED" } })),
    ).toMatchObject({ kind: "ORDER_CANCELLED_BY_CUSTOMER", actorRole: "customer", from: "RECEIVED" });
  });

  it("ORDER_NOTE, and not an empty one", () => {
    expect(toEvent(row({ kind: "ORDER_NOTE", payload: { text: "gọi trước" } }))).toMatchObject({
      text: "gọi trước",
    });
    expect(() => toEvent(row({ kind: "ORDER_NOTE", payload: { text: "" } }))).toThrow("event 7.payload.text");
  });

  it("ORDER_ADDRESS_EDITED, with both addresses and why", () => {
    const e = toEvent(
      row({
        kind: "ORDER_ADDRESS_EDITED",
        payload: { before: SHIP_TO, after: { ...SHIP_TO, line: "47 Trần Hưng Đạo" }, reason: "đổi số nhà" },
      }),
    );
    expect(e).toMatchObject({
      before: SHIP_TO,
      after: { ...SHIP_TO, line: "47 Trần Hưng Đạo" },
      reason: "đổi số nhà",
    });
    expect(() =>
      toEvent(row({ kind: "ORDER_ADDRESS_EDITED", payload: { before: SHIP_TO, after: {}, reason: "x" } })),
    ).toThrow("event 7.payload.after.recipient");
  });

  it("DEMO_RESET, which belongs to no order and names its anchor", () => {
    const e = toEvent(
      row({
        kind: "DEMO_RESET",
        actor_role: "system",
        actor: "",
        order_code: null,
        payload: { anchor: "2026-09-23T18:50:00+07:00" },
      }),
    );
    expect(e).toEqual({
      id: 7,
      at: "2026-09-23T19:05:09+07:00",
      actorRole: "system",
      actor: "",
      kind: "DEMO_RESET",
      anchor: "2026-09-23T18:50:00+07:00",
    });
    expect(() =>
      toEvent(row({ kind: "DEMO_RESET", order_code: null, payload: { anchor: "2026-09-23T11:50:00Z" } })),
    ).toThrow("event 7.payload.anchor");
  });
});

describe("toEvents", () => {
  it("reads a page in the order it came", () => {
    const got = toEvents([row({ id: 2 }), row({ id: 1, kind: "ORDER_PLACED", payload: {} })]);
    expect(got.map((e) => e.id)).toEqual([2, 1]);
  });

  it("leaves out a kind this build does not know, rather than guessing at it", () => {
    const got = toEvents([row({ id: 2, kind: "INVENTORY_ADJUSTED", order_code: null }), row({ id: 1 })]);
    expect(got.map((e) => e.id)).toEqual([1]);
  });
});
