import { describe, it, expect } from "vitest";
import {
  canCancel,
  cancelNote,
  orderRows,
  rowCount,
  rowOfOrder,
  rowsForTab,
} from "./order-rows";
import { ordersOf, orderByCode } from "@/data/orders";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { customerId, orderCode, productId, type Order } from "@/data/types";

const MINHANH = customerId("c-minhanh");
/** The clock the v2 mocks were drawn on. */
const NOW = new Date("2026-09-20T18:50:00+07:00");

/**
 * An order as checkout places it since slice B2: a row in Postgres, read back
 * through `order_json()`. One KHÓI in black, an hour before NOW.
 */
function placed(over: Partial<Order> = {}): Order {
  return {
    code: orderCode("DH-2432"),
    customerId: MINHANH,
    lines: [
      { productId: productId("p-khoi"), size: "M", color: "black", qty: 1, unitPriceVnd: 390_000 },
    ],
    status: { state: "AWAITING_TRANSFER", dueAt: "2026-09-21T05:50:00+07:00" },
    payment: "BANK_TRANSFER",
    delivery: "STANDARD",
    shippingFeeVnd: 30_000,
    codFeeVnd: 0,
    discountVnd: 0,
    shipTo: {
      recipient: "Trần Minh Anh",
      phone: "0912345678",
      line: "24 Nguyễn Thị Minh Khai",
      provinceCode: "29",
      wardCode: "70101063",
    },
    email: "minhanh@email.com",
    note: "",
    placedAt: "2026-09-20T17:50:00+07:00",
    ...over,
  };
}

const fixture = (code: string) => orderByCode.get(orderCode(code))!;

describe("a sample order as a row", () => {
  it("carries the styles, the count, the total and the thumbnails", () => {
    const row = rowOfOrder(FIXTURE_CATALOG, fixture("DH-2430"), NOW);
    expect(row.code).toBe("DH-2430");
    // Each name held together as a list entry (v3 slice 13): the list
    // breaks at its comma, never after "S05 –".
    expect(row.names).toBe("S05\u00a0–\u2060\u00a0SƯƠNG, S05\u00a0–\u2060\u00a0THAN");
    expect(row.units).toBe(2);
    expect(row.totalVnd).toBe(2_680_000);
    // The photo follows the COLOUR that was ordered, not the style: SƯƠNG in
    // moss is SƯƠNG's moss packshot, not its first colour's (v3 slice 14).
    expect(row.photoKeys).toEqual(["shot-suong-moss", "shot-than-black"]);
  });

  it("says where each state got to, and nothing it cannot know", () => {
    // NOW is inside DH-2430's twelve-hour hold, so the row still reads it as
    // waiting. Past that hour it is a cancelled order — see the block below.
    const note = (code: string) => rowOfOrder(FIXTURE_CATALOG, fixture(code), NOW).note;
    // Waiting on money: how it is being paid.
    expect(note("DH-2430")).toBe("chuyển khoản");
    // On the road: the day it LEFT. No arrival date is stored anywhere.
    expect(note("DH-2422")).toBe("gửi\u00a0đi\u00a018/09");
    expect(note("DH-2416")).toBe("đã\u00a0giao\u00a016/09");
    expect(note("DH-2310")).toBe("quá hạn chuyển khoản");
  });

  it("keeps the transfer deadline only while one is owed", () => {
    expect(rowOfOrder(FIXTURE_CATALOG, fixture("DH-2430"), NOW).dueAt).toBe(
      "2026-09-21T19:50:00+07:00",
    );
    expect(rowOfOrder(FIXTURE_CATALOG, fixture("DH-2422"), NOW).dueAt).toBeUndefined();
  });

  it("reads an unpaid transfer past its hold as cancelled, not as waiting", () => {
    // The status is not stored anywhere — it is the clock (`effectiveStatus`).
    // The fixtures are a snapshot; two days later a stored "chờ chuyển
    // khoản" is a flag nobody flipped.
    const after = new Date("2026-09-22T10:00:00+07:00");
    const row = rowOfOrder(FIXTURE_CATALOG, fixture("DH-2430"), after);
    expect(row.state).toBe("CANCELLED");
    expect(row.note).toBe("quá hạn chuyển khoản");
    expect(row.dueAt).toBeUndefined();
  });

  it("moves it between the tabs on the same clock", () => {
    const orders = [fixture("DH-2430")];
    const before = orderRows(FIXTURE_CATALOG, orders, NOW);
    expect(rowCount(before, "processing")).toBe(1);
    expect(rowCount(before, "cancelled")).toBe(0);

    const after = orderRows(FIXTURE_CATALOG, orders, new Date("2026-09-22T10:00:00+07:00"));
    expect(rowCount(after, "processing")).toBe(0);
    expect(rowCount(after, "cancelled")).toBe(1);
  });
});

describe("an order placed at checkout, as a row", () => {
  it("reads its names and photos out of the catalogue, not out of a frozen copy", () => {
    const row = rowOfOrder(FIXTURE_CATALOG, placed(), NOW);
    expect(row).toMatchObject({
      code: "DH-2432",
      names: "S05\u00a0–\u2060\u00a0KHÓI",
      units: 1,
      totalVnd: 420_000,
      note: "chuyển khoản",
      state: "AWAITING_TRANSFER",
      dueAt: "2026-09-21T05:50:00+07:00",
      dropNo: 5,
    });
    expect(row.items).toEqual([{ name: "S05\u00a0–\u2060\u00a0KHÓI", qty: 1 }]);
  });

  it("counts the handling fee into a COD order's total", () => {
    const row = rowOfOrder(
      FIXTURE_CATALOG,
      placed({ payment: "COD", codFeeVnd: 15_000, status: { state: "RECEIVED" } }),
      NOW,
    );
    expect(row.totalVnd).toBe(390_000 + 30_000 + 15_000);
  });

  it("never calls a COD or card order paid, and says how it will be", () => {
    for (const payment of ["COD", "CARD"] as const) {
      const row = rowOfOrder(FIXTURE_CATALOG, placed({ payment, status: { state: "RECEIVED" } }), NOW);
      expect(row.state).toBe("RECEIVED");
      expect(row.note).toBe(payment === "COD" ? "COD" : "thẻ");
      expect(row.dueAt).toBeUndefined();
    }
  });

  it("stays RECEIVED however late it gets — only a transfer has a hold to run out", () => {
    const late = new Date("2026-10-30T00:00:00+07:00");
    const row = rowOfOrder(FIXTURE_CATALOG, placed({ payment: "COD", status: { state: "RECEIVED" } }), late);
    expect(row.state).toBe("RECEIVED");
  });

  it("leaves the issue off when the style has left the catalogue", () => {
    const gone = placed({
      lines: [
        { productId: productId("p-khong-co"), size: "M", color: "black", qty: 1, unitPriceVnd: 1 },
      ],
    });
    const row = rowOfOrder(FIXTURE_CATALOG, gone, NOW);
    expect(row.dropNo).toBeUndefined();
    expect(row.names).toBe("—");
  });
});

describe("an order the shopper cancelled themselves", () => {
  const cancelled = () =>
    placed({
      payment: "COD",
      status: { state: "CANCELLED", cancelledAt: "2026-09-20T18:00:00+07:00", reason: "khách huỷ" },
    });

  it("says who called it off, read straight off the order", () => {
    expect(cancelNote(cancelled())).toBe("khách huỷ");
    expect(cancelNote(fixture("DH-2310"))).toBe("quá hạn chuyển khoản");
    expect(cancelNote(placed())).toBe("");
  });

  it("puts that on the row", () => {
    const row = rowOfOrder(FIXTURE_CATALOG, cancelled(), NOW);
    expect(row.state).toBe("CANCELLED");
    expect(row.note).toBe("khách huỷ");
    expect(row.dueAt).toBeUndefined();
  });

  it("falls into the cancelled tab and out of the processing one", () => {
    const rows = orderRows(FIXTURE_CATALOG, [cancelled()], NOW);
    expect(rowsForTab(rows, "cancelled").map((r) => r.code)).toContain("DH-2432");
    expect(rowsForTab(rows, "processing")).toHaveLength(0);
  });
});

describe("the list", () => {
  const mine = ordersOf(MINHANH);

  it("puts the order just placed at the top, newest first throughout", () => {
    const rows = orderRows(FIXTURE_CATALOG, [...mine, placed({ placedAt: "2026-09-20T18:40:00+07:00" })], NOW);
    expect(rows.map((r) => r.code)).toEqual([
      "DH-2432",
      "DH-2430",
      "DH-2422",
      "DH-2416",
      "DH-2310",
      "DH-2210",
    ]);
  });

  it("does not reorder the list it was given", () => {
    const given = [...mine].reverse();
    const before = given.map((o) => o.code);
    orderRows(FIXTURE_CATALOG, given, NOW);
    expect(given.map((o) => o.code)).toEqual(before);
  });

  it("counts every tab, a RECEIVED order under Đang xử lý", () => {
    const rows = orderRows(
      FIXTURE_CATALOG,
      [...mine, placed({ payment: "COD", status: { state: "RECEIVED" } })],
      NOW,
    );
    expect(rowCount(rows, "all")).toBe(6);
    // Two sample orders in flight, plus the one nobody has paid for.
    expect(rowCount(rows, "processing")).toBe(3);
    expect(rowCount(rows, "delivered")).toBe(2);
    expect(rowCount(rows, "cancelled")).toBe(1);
  });

  it("is empty for an account with no orders", () => {
    expect(orderRows(FIXTURE_CATALOG, [], NOW)).toEqual([]);
  });
});

describe("canCancel", () => {
  it("offers it only where nobody has been paid", () => {
    expect(canCancel("AWAITING_TRANSFER")).toBe(true);
    expect(canCancel("RECEIVED")).toBe(true);
  });

  it("refuses it once money has arrived or the order is over", () => {
    expect(canCancel("PAID")).toBe(false);
    expect(canCancel("SHIPPING")).toBe(false);
    expect(canCancel("DELIVERED")).toBe(false);
    expect(canCancel("CANCELLED")).toBe(false);
  });
});

describe("what a row carries for the line under the code", () => {
  it("counts each style in a sample order and names its issue", () => {
    const row = rowOfOrder(FIXTURE_CATALOG, fixture("DH-2430"), NOW);
    expect(row.items).toEqual([
      { name: "S05\u00a0–\u2060\u00a0SƯƠNG", qty: 1 },
      { name: "S05\u00a0–\u2060\u00a0THAN", qty: 1 },
    ]);
    expect(row.dropNo).toBe(5);
  });
});
