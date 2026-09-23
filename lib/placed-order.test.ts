import { describe, it, expect } from "vitest";
import {
  PLACED_ORDERS_MAX,
  TRANSFER_HOLD_HOURS,
  addPlacedOrder,
  cancelPlacedOrder,
  nextOrderCode,
  parsePlacedOrder,
  parsePlacedOrders,
  serializePlacedOrder,
  serializePlacedOrders,
  transferDeadlineIso,
  transferReference,
  type PlacedOrder,
} from "./placed-order";
import { dateTimeLabel } from "./datetime";

const ORDER: PlacedOrder = {
  code: "DH-2431",
  placedAt: "2026-09-20T15:30:00+07:00",
  lines: [
    {
      slug: "bui",
      name: "BỤI",
      kind: "Áo hoodie",
      colorLabel: "Đen",
      size: "M",
      qty: 1,
      unitPriceVnd: 890_000,
      photoKey: "bui",
    },
  ],
  recipient: "Nguyễn Văn A",
  phone: "0912345678",
  email: "a@example.com",
  addressLine: "12 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh",
  note: "",
  delivery: "STANDARD",
  payment: "BANK_TRANSFER",
  subtotalVnd: 890_000,
  shippingFeeVnd: 30_000,
  codFeeVnd: 0,
  discountVnd: 0,
  totalVnd: 920_000,
};

describe("nextOrderCode", () => {
  it("looks like every other order code in the system", () => {
    expect(nextOrderCode(new Date("2026-09-20T15:30:00+07:00"))).toMatch(/^DH-\d{4}$/);
  });

  it("is the same code for the same instant, so a re-render does not renumber the order", () => {
    const at = new Date("2026-09-20T15:30:00+07:00");
    expect(nextOrderCode(at)).toBe(nextOrderCode(at));
  });

  it("differs between two orders placed minutes apart", () => {
    expect(nextOrderCode(new Date("2026-09-20T15:30:00+07:00"))).not.toBe(
      nextOrderCode(new Date("2026-09-20T15:47:00+07:00")),
    );
  });
});

describe("transferReference", () => {
  it("strips the dash, because a bank memo field does not want one", () => {
    expect(transferReference("DH-2431")).toBe("DH2431");
  });
});

describe("parsePlacedOrder", () => {
  it("round-trips an order through storage", () => {
    expect(parsePlacedOrder(serializePlacedOrder(ORDER))).toEqual(ORDER);
  });

  it("returns nothing when there is nothing stored", () => {
    expect(parsePlacedOrder(null)).toBeNull();
  });

  it("returns nothing rather than throwing on a corrupt value", () => {
    expect(parsePlacedOrder("{oops")).toBeNull();
    expect(parsePlacedOrder("[]")).toBeNull();
  });

  it("rejects a payload missing the fields the screen prints", () => {
    const { code: _code, ...withoutCode } = ORDER;
    expect(parsePlacedOrder(JSON.stringify({ v: 1, order: withoutCode }))).toBeNull();
  });

  it("rejects an order with no lines — there is nothing to confirm", () => {
    expect(
      parsePlacedOrder(JSON.stringify({ v: 1, order: { ...ORDER, lines: [] } })),
    ).toBeNull();
  });

  it("discards a payload written by an older schema", () => {
    expect(parsePlacedOrder(JSON.stringify({ v: 0, order: ORDER }))).toBeNull();
  });
});

describe("the 12-hour transfer hold", () => {
  it("counts from the minute the order was placed", () => {
    expect(TRANSFER_HOLD_HOURS).toBe(12);
    expect(transferDeadlineIso("2026-09-20T15:30:00+07:00")).toBe(
      "2026-09-21T03:30:00+07:00",
    );
  });

  it("prints the way the confirmation screen says it", () => {
    // The approved receipt reads "hạn 06:50 ngày 21/09" for an order placed
    // at 18:50 the evening before — the deadline crosses midnight, which is
    // exactly why it carries a date and not only a time.
    expect(dateTimeLabel(transferDeadlineIso("2026-09-20T18:50:00+07:00"))).toBe(
      "06:50 ngày 21/09",
    );
  });
});

describe("who the order belongs to", () => {
  it("round-trips the owner when somebody was signed in", () => {
    const owned: PlacedOrder = { ...ORDER, customerId: "c-minhanh" };
    expect(parsePlacedOrder(serializePlacedOrder(owned))?.customerId).toBe("c-minhanh");
  });

  it("reads a record written before the field existed, without an owner", () => {
    // v1 shipped without `customerId`. Such a record is not broken — it is a
    // guest order, and a guest order belongs to no account.
    const old = parsePlacedOrder(serializePlacedOrder(ORDER));
    expect(old).not.toBeNull();
    expect(old!.customerId).toBeUndefined();
  });

  it("drops an owner of the wrong type rather than trusting it", () => {
    // This field decides who may read the order, so anything that is not a
    // customer id is treated as no owner at all.
    const tampered = JSON.stringify({ v: 1, order: { ...ORDER, customerId: 42 } });
    const parsed = parsePlacedOrder(tampered);
    expect(parsed).not.toBeNull();
    expect(parsed!.customerId).toBeUndefined();
    expect(parsed!.code).toBe("DH-2431");
  });
});

describe("the orders kept on this device", () => {
  const other: PlacedOrder = { ...ORDER, code: "DH-2432", placedAt: "2026-09-20T16:00:00+07:00" };

  it("round-trips a list", () => {
    expect(parsePlacedOrders(serializePlacedOrders([ORDER, other]))).toEqual([ORDER, other]);
  });

  it("answers an empty or broken store with an empty list", () => {
    expect(parsePlacedOrders(null)).toEqual([]);
    expect(parsePlacedOrders("{nope")).toEqual([]);
    expect(parsePlacedOrders(JSON.stringify({ v: 9, orders: [ORDER] }))).toEqual([]);
    expect(parsePlacedOrders(JSON.stringify({ v: 1, orders: "no" }))).toEqual([]);
  });

  it("drops one damaged record and keeps the rest", () => {
    const raw = JSON.stringify({ v: 1, orders: [ORDER, { code: "DH-0000" }, other] });
    expect(parsePlacedOrders(raw).map((o) => o.code)).toEqual(["DH-2431", "DH-2432"]);
  });

  it("puts the newest order on top", () => {
    expect(addPlacedOrder([ORDER], other).map((o) => o.code)).toEqual(["DH-2432", "DH-2431"]);
  });

  it("treats the same code as the same order rather than listing it twice", () => {
    // `nextOrderCode` is deterministic per minute, so two orders placed in
    // one minute collide. The newer copy wins.
    const again = { ...ORDER, totalVnd: 999_000 };
    const list = addPlacedOrder([ORDER, other], again);
    expect(list).toHaveLength(2);
    expect(list[0]!.totalVnd).toBe(999_000);
  });

  it("holds the cap on write and on read", () => {
    let list: PlacedOrder[] = [];
    for (let i = 0; i < PLACED_ORDERS_MAX + 5; i++) {
      list = addPlacedOrder(list, { ...ORDER, code: `DH-${1000 + i}` });
    }
    expect(list).toHaveLength(PLACED_ORDERS_MAX);
    expect(list[0]!.code).toBe(`DH-${1000 + PLACED_ORDERS_MAX + 4}`);
    expect(parsePlacedOrders(serializePlacedOrders(list))).toHaveLength(PLACED_ORDERS_MAX);
  });
});

describe("cancelPlacedOrder", () => {
  const AT = "2026-09-20T16:10:00+07:00";

  it("stamps the order the shopper called off, and says who did", () => {
    const [after] = cancelPlacedOrder([ORDER], ORDER.code, AT);
    expect(after!.cancelledAt).toBe(AT);
    expect(after!.cancelReason).toBe("customer");
  });

  it("keeps the order in the list rather than deleting it", () => {
    // An order that vanishes is one nobody can check they really cancelled,
    // and the fixtures keep their cancelled orders for the same reason.
    expect(cancelPlacedOrder([ORDER], ORDER.code, AT)).toHaveLength(1);
  });

  it("leaves every other order alone", () => {
    const other = { ...ORDER, code: "DH-2432" };
    const after = cancelPlacedOrder([ORDER, other], ORDER.code, AT);
    expect(after[1]!.cancelledAt).toBeUndefined();
  });

  it("does not move the stamp when it is already cancelled", () => {
    const once = cancelPlacedOrder([ORDER], ORDER.code, AT);
    const twice = cancelPlacedOrder(once, ORDER.code, "2026-09-21T09:00:00+07:00");
    expect(twice[0]!.cancelledAt).toBe(AT);
  });

  it("does not mutate the list it was given", () => {
    cancelPlacedOrder([ORDER], ORDER.code, AT);
    expect(ORDER.cancelledAt).toBeUndefined();
  });

  it("round-trips the stamp through storage", () => {
    const list = cancelPlacedOrder([ORDER], ORDER.code, AT);
    const back = parsePlacedOrders(serializePlacedOrders(list));
    expect(back[0]!.cancelledAt).toBe(AT);
    expect(back[0]!.cancelReason).toBe("customer");
  });

  it("drops a cancellation stamp of the wrong type rather than trusting it", () => {
    // This field decides whether the order is still standing.
    const raw = JSON.stringify({ v: 1, orders: [{ ...ORDER, cancelledAt: 7 }] });
    const back = parsePlacedOrders(raw);
    expect(back).toHaveLength(1);
    expect(back[0]!.cancelledAt).toBeUndefined();
  });
});
