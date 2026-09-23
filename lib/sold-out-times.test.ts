import { describe, it, expect } from "vitest";
import { anySoldOutTime, soldOutTimes } from "./sold-out-times";
import { productsInDrop } from "./inventory";
import { ORDERS } from "@/data/orders";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { getDrop } from "./drop";
import type { Order, OrderStatus, Product } from "@/data/types";
import { customerId, orderCode } from "@/data/types";

const DROP_4 = getDrop(FIXTURE_CATALOG, 4)!;
const STYLES_4 = productsInDrop(FIXTURE_CATALOG, 4);

/** An order carrying `qty` of one style, with whatever status is handed in. */
function order(code: string, at: string, status: OrderStatus, product: Product, qty: number): Order {
  return {
    code: orderCode(code),
    customerId: customerId("c-minhanh"),
    lines: [
      {
        productId: product.id,
        size: "M",
        color: product.colors[0]!,
        qty,
        unitPriceVnd: product.priceVnd,
      },
    ],
    status,
    payment: "BANK_TRANSFER",
    shippingFeeVnd: 0,
    discountVnd: 0,
    shipTo: {
      recipient: "Trần Minh Anh",
      phone: "0912345678",
      line: "12 Nguyễn Huệ",
      provinceCode: "29",
      wardCode: "29001",
    },
    placedAt: at,
  };
}

const delivered = (at: string): OrderStatus => ({ state: "DELIVERED", deliveredAt: at });
const cancelled = (at: string): OrderStatus => ({ state: "CANCELLED", cancelledAt: at, reason: "x" });

describe("soldOutTimes", () => {
  it("returns one row per style, in the issue's own order", () => {
    const rows = soldOutTimes(STYLES_4, ORDERS, DROP_4.closesAt);
    expect(rows.map((r) => r.product.slug)).toEqual(STYLES_4.map((p) => p.slug));
  });

  it("quotes the cut and what went, from the catalog", () => {
    const rows = soldOutTimes(STYLES_4, ORDERS, DROP_4.closesAt);
    for (const row of rows) {
      expect(row.cutUnits).toBe(row.product.cutUnits);
      // Issue 04 is over and empty, so everything cut was sold.
      expect(row.soldUnits).toBe(row.cutUnits);
    }
  });

  it("names the moment the order that took the last unit was placed", () => {
    const style = STYLES_4[0]!;
    const orders = [
      order("DH-1", "2026-06-06T10:00:00+07:00", delivered("2026-06-09T10:00:00+07:00"), style, style.cutUnits - 1),
      order("DH-2", "2026-06-08T14:20:00+07:00", delivered("2026-06-11T10:00:00+07:00"), style, 1),
      order("DH-3", "2026-06-09T09:00:00+07:00", delivered("2026-06-12T10:00:00+07:00"), style, 1),
    ];
    const row = soldOutTimes([style], orders, DROP_4.closesAt)[0]!;
    expect(row.soldOutAt).toBe("2026-06-08T14:20:00+07:00");
  });

  it("does not count an order that was cancelled — those units went back", () => {
    const style = { ...STYLES_4[0]!, soldOutAt: undefined };
    const orders = [
      order("DH-1", "2026-06-06T10:00:00+07:00", cancelled("2026-06-07T10:00:00+07:00"), style, style.cutUnits),
      order("DH-2", "2026-06-08T14:20:00+07:00", delivered("2026-06-11T10:00:00+07:00"), style, 1),
    ];
    const row = soldOutTimes([style], orders, DROP_4.closesAt)[0]!;
    // The cancelled order proves nothing, and with the book's stamp taken
    // away there is no second source either.
    expect(row.soldOutAt).toBeUndefined();
    expect(row.accountedUnits).toBe(1);
  });

  it("falls back to the shop's own record when the orders cannot prove it", () => {
    // `data/orders.ts` is a recent SAMPLE, not the ledger. The hour is a fact
    // the shop keeps, like `cutUnits` — it is not derived from nothing.
    const style = STYLES_4[0]!;
    const orders = [
      order("DH-1", "2026-06-06T10:00:00+07:00", delivered("2026-06-09T10:00:00+07:00"), style, 2),
    ];
    const row = soldOutTimes([style], orders, DROP_4.closesAt)[0]!;
    expect(row.soldOutAt).toBe(style.soldOutAt);
    expect(row.source).toBe("book");
  });

  it("prefers the orders over the book when the orders can prove it", () => {
    const style = STYLES_4[0]!;
    const orders = [
      order("DH-1", "2026-06-02T10:00:00+07:00", delivered("2026-06-09T10:00:00+07:00"), style, style.cutUnits),
    ];
    const row = soldOutTimes([style], orders, DROP_4.closesAt)[0]!;
    expect(row.soldOutAt).toBe("2026-06-02T10:00:00+07:00");
    expect(row.source).toBe("orders");
  });

  it("says nothing at all for a style with neither", () => {
    const style = { ...STYLES_4[0]!, soldOutAt: undefined };
    const row = soldOutTimes([style], [], DROP_4.closesAt)[0]!;
    expect(row.soldOutAt).toBeUndefined();
    expect(row.source).toBeUndefined();
    expect(row.atClose).toBe(false);
  });

  it("marks the last unit that went at the closing hour", () => {
    const style = STYLES_4[0]!;
    const orders = [
      order("DH-1", DROP_4.closesAt, delivered("2026-06-22T10:00:00+07:00"), style, style.cutUnits),
    ];
    const row = soldOutTimes([style], orders, DROP_4.closesAt)[0]!;
    expect(row.soldOutAt).toBe(DROP_4.closesAt);
    expect(row.atClose).toBe(true);
  });

  it("refuses to call a style sold out while it still has stock", () => {
    // Issue 05 is open and KHÓI has units on the shelf. Even a pile of paid
    // orders cannot make "hết lúc" true for it.
    const open = productsInDrop(FIXTURE_CATALOG, 5)[0]!;
    const orders = [
      order("DH-1", "2026-09-12T10:00:00+07:00", delivered("2026-09-15T10:00:00+07:00"), open, open.cutUnits),
    ];
    const row = soldOutTimes([open], orders, DROP_4.closesAt)[0]!;
    expect(row.soldOutAt).toBeUndefined();
  });

  it("reads the real fixtures and answers for every style of a closed issue", () => {
    const rows = soldOutTimes(STYLES_4, ORDERS, DROP_4.closesAt);
    expect(rows).toHaveLength(6);
    expect(anySoldOutTime(rows)).toBe(true);
    expect(rows.every((r) => r.soldOutAt !== undefined)).toBe(true);
    // The sample holds three paid units of issue 04 against 200 cut, so none
    // of these came from the orders.
    expect(rows.every((r) => r.source === "book")).toBe(true);
    // The stamps the approved mock prints (`prototype/v3/so.html`).
    const song = rows.find((r) => r.product.slug === "song")!;
    expect(song.soldOutAt).toBe("2026-06-06T14:20:00+07:00");
    const vo = rows.find((r) => r.product.slug === "vo")!;
    expect(vo.soldOutAt).toBe(DROP_4.closesAt);
    expect(vo.atClose).toBe(true);
    expect(rows.filter((r) => r.atClose)).toHaveLength(1);
  });
});
