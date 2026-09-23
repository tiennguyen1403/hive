import { describe, it, expect } from "vitest";
import {
  canCancel,
  cancelNote,
  deviceOrdersOf,
  deviceState,
  deviceTimeline,
  orderRows,
  rowCount,
  rowOfOrder,
  rowOfPlaced,
  rowsForTab,
  visibleDeviceOrder,
} from "./order-rows";
import { ordersOf, orderByCode } from "@/data/orders";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { customerId, orderCode } from "@/data/types";
import type { PlacedOrder } from "./placed-order";

const MINHANH = customerId("c-minhanh");
const NAMLE = customerId("c-namle");
/** The clock the v2 mocks were drawn on. */
const NOW = new Date("2026-09-20T18:50:00+07:00");

/** A bank-transfer order placed in this browser, an hour before NOW. */
function placed(over: Partial<PlacedOrder> = {}): PlacedOrder {
  return {
    code: "DH-9001",
    customerId: MINHANH,
    placedAt: "2026-09-20T17:50:00+07:00",
    lines: [
      {
        slug: "khoi",
        name: "KHÓI",
        kind: "Áo hoodie in",
        colorLabel: "Đen",
        size: "M",
        qty: 1,
        unitPriceVnd: 520_000,
        photoKey: "khoi",
      },
    ],
    recipient: "Trần Minh Anh",
    phone: "0912345678",
    email: "minhanh@email.com",
    addressLine: "24 Nguyễn Thị Minh Khai, Phường Bến Nghé, TP. Hồ Chí Minh",
    note: "",
    delivery: "STANDARD",
    payment: "BANK_TRANSFER",
    subtotalVnd: 520_000,
    shippingFeeVnd: 30_000,
    codFeeVnd: 0,
    discountVnd: 0,
    totalVnd: 550_000,
    ...over,
  };
}

describe("a fixture order as a row", () => {
  it("carries the styles, the count, the total and the thumbnails", () => {
    const row = rowOfOrder(FIXTURE_CATALOG, orderByCode.get(orderCode("DH-2430"))!, NOW);
    expect(row.code).toBe("DH-2430");
    expect(row.names).toBe("SƯƠNG, THAN");
    expect(row.units).toBe(2);
    expect(row.totalVnd).toBe(2_680_000);
    // The photo follows the COLOUR that was ordered, not the style: SƯƠNG in
    // moss borrows the frame filed under `mua` (`lib/photos.ts` — eighteen
    // frames for twenty-one colourways).
    expect(row.photoKeys).toEqual(["mua", "than"]);
    expect(row.onDevice).toBe(false);
  });

  it("says where each state got to, and nothing it cannot know", () => {
    // NOW is inside DH-2430's twelve-hour hold, so the row still reads it as
    // waiting. Past that hour it is a cancelled order — see the block below.
    const note = (code: string) => rowOfOrder(FIXTURE_CATALOG, orderByCode.get(orderCode(code))!, NOW).note;
    // Waiting on money: how it is being paid.
    expect(note("DH-2430")).toBe("chuyển khoản");
    // On the road: the day it LEFT. No arrival date is stored anywhere.
    expect(note("DH-2422")).toBe("gửi đi 18/09");
    expect(note("DH-2416")).toBe("đã giao 16/09");
    expect(note("DH-2310")).toBe("quá hạn chuyển khoản");
  });

  it("keeps the transfer deadline only while one is owed", () => {
    expect(rowOfOrder(FIXTURE_CATALOG, orderByCode.get(orderCode("DH-2430"))!, NOW).dueAt).toBe(
      "2026-09-21T19:50:00+07:00",
    );
    expect(rowOfOrder(FIXTURE_CATALOG, orderByCode.get(orderCode("DH-2422"))!, NOW).dueAt).toBeUndefined();
  });

  it("reads an unpaid transfer past its hold as cancelled, not as waiting", () => {
    // The status is not stored anywhere — it is the clock (`effectiveStatus`).
    // The fixtures are a snapshot; two days later a stored "chờ chuyển
    // khoản" is a flag nobody flipped.
    const after = new Date("2026-09-22T10:00:00+07:00");
    const row = rowOfOrder(FIXTURE_CATALOG, orderByCode.get(orderCode("DH-2430"))!, after);
    expect(row.state).toBe("CANCELLED");
    expect(row.note).toBe("quá hạn chuyển khoản");
    expect(row.dueAt).toBeUndefined();
  });

  it("moves it between the tabs on the same clock", () => {
    const orders = [orderByCode.get(orderCode("DH-2430"))!];
    const before = orderRows(FIXTURE_CATALOG, orders, [], NOW);
    expect(rowCount(before, "processing")).toBe(1);
    expect(rowCount(before, "cancelled")).toBe(0);

    const after = orderRows(FIXTURE_CATALOG, orders, [], new Date("2026-09-22T10:00:00+07:00"));
    expect(rowCount(after, "processing")).toBe(0);
    expect(rowCount(after, "cancelled")).toBe(1);
  });
});

describe("an order placed in this browser", () => {
  it("waits for the transfer until the twelve hours run out, then cancels", () => {
    const p = placed();
    expect(deviceState(p, NOW)).toBe("AWAITING_TRANSFER");
    // 17:50 + 12h = 05:50 the next morning.
    expect(deviceState(p, new Date("2026-09-21T05:49:00+07:00"))).toBe("AWAITING_TRANSFER");
    expect(deviceState(p, new Date("2026-09-21T05:50:00+07:00"))).toBe("CANCELLED");
  });

  it("never calls a COD or card order paid", () => {
    expect(deviceState(placed({ payment: "COD" }), NOW)).toBe("RECEIVED");
    expect(deviceState(placed({ payment: "CARD" }), NOW)).toBe("RECEIVED");
    // And still not, twelve hours later: nothing expires but a transfer.
    expect(deviceState(placed({ payment: "COD" }), new Date("2026-09-22T00:00:00+07:00"))).toBe(
      "RECEIVED",
    );
  });

  it("reads its row off the frozen copy, not out of the catalog", () => {
    const row = rowOfPlaced(FIXTURE_CATALOG, placed(), NOW);
    expect(row).toMatchObject({
      code: "DH-9001",
      names: "KHÓI",
      units: 1,
      totalVnd: 550_000,
      photoKeys: ["khoi"],
      note: "chuyển khoản",
      state: "AWAITING_TRANSFER",
      onDevice: true,
    });
    expect(row.dueAt).toBe("2026-09-21T05:50:00+07:00");
  });

  it("says why it died once the deadline passed", () => {
    const row = rowOfPlaced(FIXTURE_CATALOG, placed(), new Date("2026-09-22T00:00:00+07:00"));
    expect(row.state).toBe("CANCELLED");
    expect(row.note).toBe("quá hạn chuyển khoản");
    expect(row.dueAt).toBeUndefined();
  });
});

describe("who may see an order placed here", () => {
  it("shows it to the customer who placed it", () => {
    expect(deviceOrdersOf(MINHANH, [placed()])).toHaveLength(1);
    expect(visibleDeviceOrder(MINHANH, "DH-9001", [placed()])?.code).toBe("DH-9001");
  });

  it("hides it from everyone else on the same browser", () => {
    expect(deviceOrdersOf(NAMLE, [placed()])).toEqual([]);
    expect(visibleDeviceOrder(NAMLE, "DH-9001", [placed()])).toBeUndefined();
  });

  it("gives an order placed signed out to nobody", () => {
    const guest = placed();
    delete guest.customerId;
    expect(deviceOrdersOf(MINHANH, [guest])).toEqual([]);
    expect(deviceOrdersOf(NAMLE, [guest])).toEqual([]);
  });

  it("answers an empty store with an empty list", () => {
    expect(deviceOrdersOf(MINHANH, [])).toEqual([]);
    expect(visibleDeviceOrder(MINHANH, "DH-9001", [])).toBeUndefined();
  });

  it("refuses a code that is not in the store", () => {
    expect(visibleDeviceOrder(MINHANH, "DH-2430", [placed()])).toBeUndefined();
  });

  it("keeps each shopper to their own, with two of them on one device", () => {
    // The device now holds a LIST, so the ownership check is what stops one
    // person's name, phone and address appearing under another's account
    // (QĐ-16).
    const hers = { ...placed(), code: "DH-9002", customerId: String(NAMLE) };
    const both = [placed(), hers];
    expect(deviceOrdersOf(MINHANH, both).map((o) => o.code)).toEqual(["DH-9001"]);
    expect(deviceOrdersOf(NAMLE, both).map((o) => o.code)).toEqual(["DH-9002"]);
  });
});

describe("the merged list", () => {
  const mine = ordersOf(MINHANH);

  it("puts the order just placed at the top, newest first throughout", () => {
    const rows = orderRows(FIXTURE_CATALOG, mine, [placed()], NOW);
    expect(rows).toHaveLength(6);
    expect(rows.map((r) => r.code)).toEqual([
      "DH-9001",
      "DH-2430",
      "DH-2422",
      "DH-2416",
      "DH-2310",
      "DH-2210",
    ]);
    expect(rows[0]!.onDevice).toBe(true);
  });

  it("is exactly the fixtures when nothing was placed here", () => {
    const rows = orderRows(FIXTURE_CATALOG, mine, [], NOW);
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => !r.onDevice)).toBe(true);
  });

  it("does not show one order twice when a generated code collides", () => {
    const clash = placed({ code: "DH-2430" });
    const rows = orderRows(FIXTURE_CATALOG, mine, [clash], NOW);
    expect(rows).toHaveLength(5);
    // The fixture is the one with a history behind it, so it is the one kept.
    expect(rows.find((r) => r.code === "DH-2430")!.onDevice).toBe(false);
  });

  it("counts the merged list under each tab", () => {
    const rows = orderRows(FIXTURE_CATALOG, mine, [placed()], NOW);
    expect(rowCount(rows, "all")).toBe(6);
    // Two fixture orders in flight, plus the one waiting for its transfer.
    expect(rowCount(rows, "processing")).toBe(3);
    expect(rowCount(rows, "delivered")).toBe(2);
    expect(rowCount(rows, "cancelled")).toBe(1);
  });

  it("moves an expired device order from Đang xử lý to Đã huỷ", () => {
    const late = new Date("2026-09-22T00:00:00+07:00");
    const rows = orderRows(FIXTURE_CATALOG, mine, [placed()], late);
    expect(rowsForTab(rows, "processing").map((r) => r.code)).not.toContain("DH-9001");
    expect(rowsForTab(rows, "cancelled").map((r) => r.code)).toContain("DH-9001");
  });
});

describe("the device order's timeline", () => {
  it("has exactly one current step, and nothing done after it", () => {
    for (const steps of [
      deviceTimeline(placed(), NOW),
      deviceTimeline(placed({ payment: "COD" }), NOW),
      deviceTimeline(placed(), new Date("2026-09-22T00:00:00+07:00")),
    ]) {
      expect(steps.filter((s) => s.state === "now")).toHaveLength(1);
      const now = steps.findIndex((s) => s.state === "now");
      expect(steps.slice(now + 1).every((s) => s.state === "todo")).toBe(true);
    }
  });

  it("names the deadline while the transfer is owed", () => {
    const steps = deviceTimeline(placed(), NOW);
    expect(steps[1]).toMatchObject({
      title: "Chờ chuyển khoản",
      detail: "hạn 21/09 · 05:50",
    });
  });

  it("stops at the cancellation once the hold runs out", () => {
    const steps = deviceTimeline(placed(), new Date("2026-09-22T00:00:00+07:00"));
    expect(steps.map((s) => s.title)).toEqual([
      "Đã nhận đơn",
      "Đã huỷ — quá hạn chuyển khoản",
    ]);
  });

  it("claims no packing and no despatch for an order nobody has handled", () => {
    const steps = deviceTimeline(placed({ payment: "COD" }), NOW);
    expect(steps.map((s) => s.title)).toEqual(["Đã nhận đơn", "Đóng gói", "Giao hàng"]);
    expect(steps.filter((s) => s.state === "done")).toHaveLength(0);
  });
});

describe("an order the shopper cancelled themselves", () => {
  const CANCELLED_AT = "2026-09-20T18:00:00+07:00";
  const cancelled = () =>
    placed({ cancelledAt: CANCELLED_AT, cancelReason: "customer" as const });

  it("is cancelled whatever the clock says about its hold", () => {
    // The hold on this order does not run out until 05:50 the next morning,
    // so only the stamp can have done this.
    expect(deviceState(placed(), NOW)).toBe("AWAITING_TRANSFER");
    expect(deviceState(cancelled(), NOW)).toBe("CANCELLED");
  });

  it("is cancelled even when it was never a transfer", () => {
    const cod = placed({ payment: "COD", cancelledAt: CANCELLED_AT, cancelReason: "customer" });
    expect(deviceState(cod, NOW)).toBe("CANCELLED");
  });

  it("says who called it off, which is not the same fact as a missed deadline", () => {
    expect(cancelNote(cancelled())).toBe("khách huỷ");
    expect(cancelNote(placed())).toBe("quá hạn chuyển khoản");
  });

  it("puts that on the row and on the timeline, at the minute it happened", () => {
    const row = rowOfPlaced(FIXTURE_CATALOG, cancelled(), NOW);
    expect(row.state).toBe("CANCELLED");
    expect(row.note).toBe("khách huỷ");
    expect(row.dueAt).toBeUndefined();

    const steps = deviceTimeline(cancelled(), NOW);
    expect(steps[steps.length - 1]!.title).toBe("Đã huỷ — khách huỷ");
    expect(steps[steps.length - 1]!.detail).toBe("20/09 · 18:00");
  });

  it("falls into the cancelled tab and out of the processing one", () => {
    const rows = orderRows(FIXTURE_CATALOG, [], [cancelled()], NOW);
    expect(rowsForTab(rows, "cancelled").map((r) => r.code)).toContain("DH-9001");
    expect(rowsForTab(rows, "processing")).toHaveLength(0);
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
  it("counts each style in a fixture order and names its issue", () => {
    const row = rowOfOrder(FIXTURE_CATALOG, orderByCode.get(orderCode("DH-2430"))!, NOW);
    expect(row.items).toEqual([
      { name: "SƯƠNG", qty: 1 },
      { name: "THAN", qty: 1 },
    ]);
    expect(row.dropNo).toBe(5);
  });

  it("does the same for an order placed on this device", () => {
    const row = rowOfPlaced(FIXTURE_CATALOG, placed(), NOW);
    expect(row.items).toEqual([{ name: "KHÓI", qty: 1 }]);
    expect(row.dropNo).toBe(5);
  });

  it("leaves the issue off when the style has left the catalog", () => {
    const gone = placed({
      lines: [{ ...placed().lines[0]!, slug: "khong-co" }],
    });
    expect(rowOfPlaced(FIXTURE_CATALOG, gone, NOW).dropNo).toBeUndefined();
  });
});
