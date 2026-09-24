import { describe, expect, it } from "vitest";
import { EVENT_KINDS, isOrderEvent, toEvent, toEvents, vnIso, type EventRow } from "./event-dto";

/** A row exactly as PostgREST hands it over: UTC, microseconds, jsonb payload. */
const row = (over: Partial<EventRow> = {}): EventRow => ({
  id: 7,
  at: "2026-09-23T12:05:09.123456+00:00",
  actor_role: "admin",
  actor: "quanly@email.com",
  kind: "ORDER_PAID",
  order_code: "DH-2430",
  product_id: null,
  promo_code: null,
  drop_no: null,
  payload: { from: "AWAITING_TRANSFER" },
  ...over,
});

/** A catalogue event: no order, the manager's hand. */
const cat = (over: Partial<EventRow>): EventRow => row({ order_code: null, ...over });

const TERMS = {
  kind: "PERCENT",
  percent: 10,
  maxDiscountVnd: 150000,
  amountVnd: null,
  minOrderVnd: 500000,
  usageLimit: 100,
  startsAt: "2026-09-23T20:00:00+07:00",
  endsAt: "2026-10-23T20:00:00+07:00",
};

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

describe("toEvent — the catalogue's kinds (slice B3b), named by their own column", () => {
  it("knows exactly the twenty-three kinds the table's check constraint allows", () => {
    // Twenty since slice B3b, three more since B3c (`…_photos.sql`).
    expect(EVENT_KINDS).toHaveLength(23);
  });

  it("INVENTORY_ADJUSTED, with every cell, the reason, the reference, the note and the delta", () => {
    const e = toEvent(
      cat({
        kind: "INVENTORY_ADJUSTED",
        product_id: "p-khoi",
        payload: {
          cells: [{ color: "black", size: "XL", before: 1, after: 0 }],
          reason: "Kiểm kê lệch",
          ref: "",
          note: "",
          delta: -1,
        },
      }),
    );
    expect(e).toMatchObject({
      kind: "INVENTORY_ADJUSTED",
      productId: "p-khoi",
      cells: [{ color: "black", size: "XL", before: 1, after: 0 }],
      reason: "Kiểm kê lệch",
      delta: -1,
    });
    expect(isOrderEvent(e)).toBe(false);
  });

  it("refuses a shelf event with no style, and a cell with a size that is not one", () => {
    const payload = { cells: [], reason: "Khác", ref: "", note: "", delta: 0 };
    expect(() => toEvent(cat({ kind: "INVENTORY_ADJUSTED", payload }))).toThrow("event 7.product_id");
    expect(() =>
      toEvent(
        cat({
          kind: "INVENTORY_ADJUSTED",
          product_id: "p-khoi",
          payload: { ...payload, cells: [{ color: "black", size: "XXL", before: 1, after: 0 }] },
        }),
      ),
    ).toThrow("event 7.payload.cells[0].size");
  });

  it("PRODUCT_EDITED, only the fields that changed, each of its own type", () => {
    const e = toEvent(
      cat({
        kind: "PRODUCT_EDITED",
        product_id: "p-khoi",
        payload: { before: { priceVnd: 390000, family: "TEE" }, after: { priceVnd: 420000, family: "HOODIE" } },
      }),
    );
    expect(e).toMatchObject({
      productId: "p-khoi",
      before: { priceVnd: 390000, family: "TEE" },
      after: { priceVnd: 420000, family: "HOODIE" },
    });
    expect(() =>
      toEvent(
        cat({ kind: "PRODUCT_EDITED", product_id: "p-khoi", payload: { before: {}, after: { priceVnd: "420000" } } }),
      ),
    ).toThrow("event 7.payload.after.priceVnd");
  });

  it("DROP_ADDED and DROP_SCHEDULED, with the issue from drop_no and +07:00 instants", () => {
    const window = { opensAt: "2026-10-01T20:00:00+07:00", closesAt: "2026-10-15T20:00:00+07:00" };
    expect(toEvent(cat({ kind: "DROP_ADDED", drop_no: 7, payload: window }))).toMatchObject({
      kind: "DROP_ADDED",
      no: 7,
      ...window,
    });
    expect(
      toEvent(cat({ kind: "DROP_SCHEDULED", drop_no: 5, payload: { before: window, after: window } })),
    ).toMatchObject({ no: 5, before: window, after: window });
    expect(() => toEvent(cat({ kind: "DROP_ADDED", payload: window }))).toThrow("event 7.drop_no");
    expect(() =>
      toEvent(cat({ kind: "DROP_ADDED", drop_no: 7, payload: { ...window, opensAt: "2026-10-01T13:00:00Z" } })),
    ).toThrow("event 7.payload.opensAt");
  });

  it("TEASER_ADDED, with its slug, name, kind, family and photo", () => {
    const e = toEvent(
      cat({
        kind: "TEASER_ADDED",
        drop_no: 6,
        payload: { slug: "thu-6", name: "THỬ", garment: "Áo khoác dù", family: "JACKET", photoKey: "suong" },
      }),
    );
    expect(e).toMatchObject({ no: 6, slug: "thu-6", name: "THỬ", garment: "Áo khoác dù", family: "JACKET" });
  });

  it("the five code events, each naming the code from promo_code", () => {
    expect(toEvent(cat({ kind: "PROMO_ADDED", promo_code: "TEST10", payload: TERMS }))).toMatchObject({
      promoCode: "TEST10",
      terms: TERMS,
    });
    expect(
      toEvent(cat({ kind: "PROMO_EDITED", promo_code: "TEST10", payload: { before: TERMS, after: { ...TERMS, percent: 12 } } })),
    ).toMatchObject({ before: { percent: 10 }, after: { percent: 12 } });
    expect(toEvent(cat({ kind: "PROMO_PAUSED", promo_code: "TEST10", payload: { paused: true } }))).toMatchObject({
      paused: true,
    });
    expect(
      toEvent(cat({ kind: "PROMO_LIMIT_RAISED", promo_code: "CHAOBAN", payload: { before: null, after: 100 } })),
    ).toMatchObject({ before: null, after: 100 });
    expect(
      toEvent(
        cat({
          kind: "PROMO_ENDED",
          promo_code: "TEST10",
          payload: { before: "2026-10-23T20:00:00+07:00", after: "2026-09-24T01:30:00+07:00" },
        }),
      ),
    ).toMatchObject({ before: "2026-10-23T20:00:00+07:00", after: "2026-09-24T01:30:00+07:00" });
  });

  it("refuses a code event with no code and a pause that is not a yes or a no", () => {
    expect(() => toEvent(cat({ kind: "PROMO_PAUSED", payload: { paused: true } }))).toThrow("event 7.promo_code");
    expect(() =>
      toEvent(cat({ kind: "PROMO_PAUSED", promo_code: "TEST10", payload: { paused: "yes" } })),
    ).toThrow("event 7.payload.paused");
    expect(() =>
      toEvent(cat({ kind: "PROMO_ADDED", promo_code: "TEST10", payload: { ...TERMS, kind: "GIFT" } })),
    ).toThrow("event 7.payload.kind");
  });

  it("tells an order's event from everything else", () => {
    expect(isOrderEvent(toEvent(row()))).toBe(true);
    expect(isOrderEvent(toEvent(cat({ kind: "DEMO_RESET", payload: { anchor: "2026-09-23T18:50:00+07:00" } })))).toBe(
      false,
    );
  });
});

describe("toEvent — a style's own shape (slice B3c), named by product_id", () => {
  it("PRODUCT_ADDED, with its name, address, issue, band, cut and where its photos came from", () => {
    const e = toEvent(
      cat({
        kind: "PRODUCT_ADDED",
        product_id: "p-soi",
        payload: {
          id: "p-soi",
          name: "SỎI",
          slug: "soi",
          dropNo: 6,
          colors: ["black", "cream", "moss"],
          cutUnits: 36,
          uploaded: 1,
          borrowed: 2,
        },
      }),
    );
    expect(e).toEqual({
      id: 7,
      at: "2026-09-23T19:05:09+07:00",
      actorRole: "admin",
      actor: "quanly@email.com",
      kind: "PRODUCT_ADDED",
      productId: "p-soi",
      name: "SỎI",
      slug: "soi",
      dropNo: 6,
      colors: ["black", "cream", "moss"],
      cutUnits: 36,
      uploaded: 1,
      borrowed: 2,
    });
  });

  it("PRODUCT_PHOTO_SET, with the colour and both keys", () => {
    const up = `up/${"a".repeat(32)}.webp`;
    const e = toEvent(
      cat({
        kind: "PRODUCT_PHOTO_SET",
        product_id: "p-khoi",
        payload: { id: "p-khoi", color: "cream", before: "reu", after: up },
      }),
    );
    expect(e).toMatchObject({ kind: "PRODUCT_PHOTO_SET", productId: "p-khoi", color: "cream", before: "reu", after: up });
  });

  it("PRODUCT_COLORS_REORDERED, with both band orders", () => {
    const e = toEvent(
      cat({
        kind: "PRODUCT_COLORS_REORDERED",
        product_id: "p-khoi",
        payload: { id: "p-khoi", before: ["black", "cream"], after: ["cream", "black"] },
      }),
    );
    expect(e).toMatchObject({ productId: "p-khoi", before: ["black", "cream"], after: ["cream", "black"] });
  });

  it("refuses a style event with no style, a colour that is not one, and a band that is not a list", () => {
    expect(() =>
      toEvent(cat({ kind: "PRODUCT_PHOTO_SET", payload: { color: "black", before: "khoi", after: "reu" } })),
    ).toThrow("product_id must name the style");
    expect(() =>
      toEvent(
        cat({ kind: "PRODUCT_PHOTO_SET", product_id: "p-khoi", payload: { color: "pink", before: "khoi", after: "reu" } }),
      ),
    ).toThrow("payload.color must be one of");
    expect(() =>
      toEvent(cat({ kind: "PRODUCT_COLORS_REORDERED", product_id: "p-khoi", payload: { before: "black", after: [] } })),
    ).toThrow("payload.before must be an array");
    expect(() =>
      toEvent(
        cat({
          kind: "PRODUCT_ADDED",
          product_id: "p-soi",
          payload: { name: "SỎI", slug: "soi", dropNo: 6, colors: ["black"], cutUnits: "36", uploaded: 0, borrowed: 1 },
        }),
      ),
    ).toThrow("payload.cutUnits must be a whole number");
  });

  it("PRODUCT_ADDED for a fixed style (slice B5): no issue and no cut, both null or neither", () => {
    const fixed = { name: "ÁO MƯA", slug: "ao-mua", colors: ["black"], uploaded: 0, borrowed: 1 };
    expect(
      toEvent(cat({ kind: "PRODUCT_ADDED", product_id: "p-ao-mua", payload: { ...fixed, dropNo: null, cutUnits: null } })),
    ).toMatchObject({ kind: "PRODUCT_ADDED", productId: "p-ao-mua", dropNo: null, cutUnits: null });
    expect(() =>
      toEvent(cat({ kind: "PRODUCT_ADDED", product_id: "p-ao-mua", payload: { ...fixed, dropNo: null, cutUnits: 12 } })),
    ).toThrow("payload.cutUnits must be null exactly when dropNo is");
    expect(() =>
      toEvent(cat({ kind: "PRODUCT_ADDED", product_id: "p-ao-mua", payload: { ...fixed, dropNo: 6, cutUnits: null } })),
    ).toThrow("payload.cutUnits must be null exactly when dropNo is");
  });
});

describe("toEvents", () => {
  it("reads a page in the order it came", () => {
    const got = toEvents([row({ id: 2 }), row({ id: 1, kind: "ORDER_PLACED", payload: {} })]);
    expect(got.map((e) => e.id)).toEqual([2, 1]);
  });

  it("leaves out a kind this build does not know, rather than guessing at it", () => {
    const got = toEvents([row({ id: 2, kind: "STOCK_TELEPORTED", order_code: null }), row({ id: 1 })]);
    expect(got.map((e) => e.id)).toEqual([1]);
  });
});
