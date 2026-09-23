import { describe, it, expect } from "vitest";
import { CATALOG, DROPS, bySlug } from "@/data/catalog";
import { ORDERS } from "@/data/orders";
import { EMPTY_SIM, type SimAction, type SimOverlay } from "./admin-sim";
import {
  LOG_FILTERS,
  diffText,
  inFilter,
  logFilter,
  logHaystack,
  logRows,
  logStamp,
  withinDays,
  type LogRow,
} from "./activity-log";

const FIXTURES = { orders: ORDERS, drops: DROPS, products: CATALOG };
/** Inside issue 05's window, after every order in the book. */
const NOW = new Date("2026-09-20T18:50:00+07:00");

function overlay(...actions: SimAction[]): SimOverlay {
  return { actions };
}

function rowsOf(...actions: SimAction[]): LogRow[] {
  return logRows(overlay(...actions), FIXTURES, NOW);
}

const AT = "2026-09-20T18:52:00+07:00";

describe("the log is read out of the store, never stored", () => {
  it("still has rows with an empty store: the clock and the data did things", () => {
    const rows = logRows(EMPTY_SIM, FIXTURES, NOW);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.author === "Hệ thống" || r.author === "Cửa hàng")).toBe(true);
  });

  it("is empty only when the fixtures are empty too", () => {
    expect(
      logRows(EMPTY_SIM, { orders: [], drops: [], products: [] }, NOW),
    ).toEqual([]);
  });

  it("puts the newest first", () => {
    const rows = logRows(EMPTY_SIM, FIXTURES, NOW);
    for (let i = 1; i < rows.length; i++) {
      expect(Date.parse(rows[i - 1]!.at)).toBeGreaterThanOrEqual(Date.parse(rows[i]!.at));
    }
  });

  it("gives every row a key of its own", () => {
    const rows = rowsOf(
      { kind: "ORDER_PAID", at: AT, code: "DH-2431" },
      { kind: "ORDER_NOTE", at: AT, code: "DH-2431", text: "gọi khách" },
    );
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });
});

describe("what the shop pressed", () => {
  it("records a payment with the state it came from and the amount", () => {
    const row = rowsOf({ kind: "ORDER_PAID", at: AT, code: "DH-2431" })[0]!;
    expect(row.action).toBe("Đã nhận tiền");
    expect(row.detail).toBe("đánh dấu tay");
    expect(row.author).toBe("Cửa hàng");
    expect(row.before).toBe("chờ chuyển khoản");
    expect(row.after).toBe("đã thanh toán");
    expect(row.subject).toContain("DH-2431");
    expect(row.href).toBe("/admin/orders/DH-2431");
    expect(row.tail).toMatch(/₫$/);
  });

  it("reads the state BEFORE each action by replaying them in order", () => {
    const rows = rowsOf(
      { kind: "ORDER_PAID", at: "2026-09-20T10:00:00+07:00", code: "DH-2431" },
      {
        kind: "ORDER_SHIPPED",
        at: "2026-09-20T11:00:00+07:00",
        code: "DH-2431",
        carrier: "Giao tiêu chuẩn",
        trackingCode: "VNP-2431-01",
      },
    );
    const shipped = rows.find((r) => r.action === "Bàn giao" && r.id.startsWith("sim"))!;
    // Not "chờ chuyển khoản": the payment above already moved it.
    expect(shipped.before).toBe("đã thanh toán");
    expect(shipped.after).toBe("đang giao");
    expect(shipped.tail).toBe("Giao tiêu chuẩn · VNP-2431-01");
  });

  it("records an address edit with the line before and after, and the reason", () => {
    const before = ORDERS.find((o) => o.code === "DH-2429")!.shipTo;
    const row = rowsOf({
      kind: "ORDER_ADDRESS_EDITED",
      at: AT,
      code: "DH-2429",
      before,
      after: { ...before, line: "47 Trần Hưng Đạo" },
      reason: "khách nhắn đổi số nhà",
    })[0]!;
    expect(row.action).toBe("Sửa địa chỉ giao");
    expect(row.detail).toBe("trước khi bàn giao");
    expect(row.before).toBe(before.line);
    expect(row.after).toBe("47 Trần Hưng Đạo");
    expect(row.tail).toBe('"khách nhắn đổi số nhà"');
  });

  it("records a resend as a note that nothing was sent", () => {
    const row = rowsOf({
      kind: "ORDER_CONFIRMATION_RESENT",
      at: AT,
      code: "DH-2430",
      email: "minhanh@vidu.vn",
    })[0]!;
    expect(row.action).toBe("Gửi lại xác nhận");
    expect(row.detail).toBe("chưa có máy chủ gửi, chỉ ghi");
    expect(row.tail).toBe("tới minhanh@vidu.vn");
  });

  it("names the style, the colour and the size of a one-cell adjustment", () => {
    const bui = bySlug.get("bui")!;
    const row = rowsOf({
      kind: "INVENTORY_ADJUSTED",
      at: AT,
      productId: String(bui.id),
      cells: [{ color: "black", size: "L", before: 1, after: 2 }],
      reason: "Hàng trả về",
      ref: "DH-2419",
      note: "còn nguyên tag",
    })[0]!;
    expect(row.kind).toBe("stock");
    expect(row.action).toBe("Điều chỉnh tồn kho");
    expect(row.detail).toBe("lý do: hàng trả về");
    expect(row.subject).toBe("BỤI · Đen · L");
    expect(row.before).toBe("1");
    expect(row.after).toBe("2");
    expect(row.tail).toBe('tham chiếu DH-2419 · "còn nguyên tag"');
  });

  it("counts the cells when an adjustment moved more than one", () => {
    const bui = bySlug.get("bui")!;
    const row = rowsOf({
      kind: "INVENTORY_ADJUSTED",
      at: AT,
      productId: String(bui.id),
      cells: [
        { color: "black", size: "L", before: 1, after: 2 },
        { color: "grey", size: "S", before: 0, after: 1 },
      ],
      reason: "Kiểm kê lệch",
      ref: "",
      note: "",
    })[0]!;
    expect(row.subject).toBe("BỤI · 2 ô");
    expect(row.tail).toBe("+2 chiếc");
  });

  it("tells a code edited apart from a code duplicated", () => {
    const terms = {
      at: AT,
      promoKind: "PERCENT" as const,
      percent: 10,
      amountVnd: 0,
      maxDiscountVnd: 150_000,
      minOrderVnd: 500_000,
      usageLimit: 200,
      startsAt: "2026-09-11T20:00:00+07:00",
      endsAt: "2026-09-25T20:00:00+07:00",
    };
    const edited = rowsOf({ kind: "PROMO_EDITED", code: "DOT05", nextCode: "DOT05", ...terms })[0]!;
    const copied = rowsOf({ kind: "PROMO_EDITED", code: "DOT05", nextCode: "SO06", ...terms })[0]!;
    expect(edited.action).toBe("Sửa mã");
    expect(edited.after).toBeUndefined();
    expect(copied.action).toBe("Nhân bản mã");
    expect(copied.before).toBe("DOT05");
    expect(copied.after).toBe("SO06");
    expect(edited.kind).toBe("promo");
  });

  it("records a raised cap as a before and an after", () => {
    const row = rowsOf({
      kind: "PROMO_LIMIT_RAISED",
      at: AT,
      code: "DOT05",
      before: 200,
      after: 250,
    })[0]!;
    expect(row.action).toBe("Nâng giới hạn");
    expect(row.before).toBe("200 lượt");
    expect(row.after).toBe("250 lượt");
  });

  it("says which way a pause went", () => {
    const off = rowsOf({ kind: "PROMO_PAUSED", at: AT, code: "BANTHAN", paused: true })[0]!;
    const on = rowsOf({ kind: "PROMO_PAUSED", at: AT, code: "BANTHAN", paused: false })[0]!;
    expect(off.action).toBe("Tạm dừng mã");
    expect(off.after).toBe("tạm dừng");
    expect(on.action).toBe("Tiếp tục mã");
    expect(on.after).toBe("đang chạy");
  });

  it("ends a run by moving its closing hour, and says so", () => {
    const row = rowsOf({ kind: "PROMO_ENDED", at: AT, code: "DOT05", endsAt: AT })[0]!;
    expect(row.action).toBe("Kết thúc sớm");
    expect(row.tail).toBe("giờ kết thúc = bây giờ");
  });

  it("tells an issue created apart from an issue closed early", () => {
    const created = rowsOf({
      kind: "DROP_ADDED",
      at: AT,
      no: 7,
      opensAt: "2026-11-06T20:00:00+07:00",
      closesAt: "2026-11-20T20:00:00+07:00",
    })[0]!;
    expect(created.action).toBe("Tạo số");
    expect(created.subject).toBe("Số 07");
    expect(created.kind).toBe("drop");

    const early = rowsOf({
      kind: "DROP_SCHEDULED",
      at: AT,
      no: 5,
      opensAt: "2026-09-11T20:00:00+07:00",
      closesAt: AT,
    })[0]!;
    expect(early.action).toBe("Đóng sớm");
    expect(early.detail).toBe("giờ đóng đổi thành bây giờ");

    const moved = rowsOf({
      kind: "DROP_SCHEDULED",
      at: AT,
      no: 6,
      opensAt: "2026-10-02T20:00:00+07:00",
      closesAt: "2026-10-16T20:00:00+07:00",
    })[0]!;
    expect(moved.action).toBe("Sửa giờ");
  });

  it("records a teaser against the issue it was announced for", () => {
    const row = rowsOf({
      kind: "TEASER_ADDED",
      at: AT,
      no: 6,
      name: "SỎI",
      garment: "Áo khoác dù",
      family: "JACKET",
      photoKey: "suong",
    })[0]!;
    expect(row.action).toBe("Thêm mẫu hé lộ");
    expect(row.subject).toBe("Số 06");
    expect(row.tail).toBe("SỎI · Áo khoác dù");
  });
});

describe("who did it", () => {
  it("says Khách for a cancellation the shopper made", () => {
    const row = rowsOf({ kind: "ORDER_CANCELLED_BY_CUSTOMER", at: AT, code: "DH-2431" })[0]!;
    expect(row.author).toBe("Khách");
    expect(row.action).toBe("Huỷ đơn");
    expect(row.detail).toBe("khách huỷ");
    expect(row.after).toBe("đã huỷ");
  });

  it("says Cửa hàng for a cancellation the shop made, with its reason", () => {
    const row = rowsOf({
      kind: "ORDER_CANCELLED",
      at: AT,
      code: "DH-2429",
      reason: "Hết hàng thật",
      note: "",
    })[0]!;
    expect(row.author).toBe("Cửa hàng");
    expect(row.detail).toBe("hết hàng thật");
  });

  it("says Hệ thống for a transfer that matched itself", () => {
    const rows = logRows(EMPTY_SIM, FIXTURES, NOW);
    const matched = rows.filter((r) => r.action === "Khớp chuyển khoản");
    expect(matched.length).toBeGreaterThan(0);
    for (const r of matched) {
      expect(r.author).toBe("Hệ thống");
      expect(r.detail).toBe("tự động theo nội dung");
      expect(r.before).toBe("chờ chuyển khoản");
      expect(r.after).toBe("đã thanh toán");
    }
  });

  it("says Hệ thống for an order the twelve-hour clock cancelled", () => {
    const waiting = ORDERS.find((o) => o.status.state === "AWAITING_TRANSFER")!;
    const dueAt = waiting.status.state === "AWAITING_TRANSFER" ? waiting.status.dueAt : "";
    const after = new Date(Date.parse(dueAt) + 3_600_000);
    const row = logRows(EMPTY_SIM, FIXTURES, after).find(
      (r) => r.id === `due-${waiting.code}`,
    )!;
    expect(row.author).toBe("Hệ thống");
    expect(row.action).toBe("Huỷ đơn");
    expect(row.detail).toBe("quá 12 giờ chưa chuyển khoản");
    expect(row.at).toBe(dueAt);
    expect(row.tail).toContain("×");
  });

  it("drops that row again once the shop marks the order paid in time", () => {
    const waiting = ORDERS.find((o) => o.status.state === "AWAITING_TRANSFER")!;
    const dueAt = waiting.status.state === "AWAITING_TRANSFER" ? waiting.status.dueAt : "";
    const after = new Date(Date.parse(dueAt) + 3_600_000);
    const rows = logRows(
      overlay({ kind: "ORDER_PAID", at: AT, code: String(waiting.code) }),
      FIXTURES,
      after,
    );
    expect(rows.find((r) => r.id === `due-${waiting.code}`)).toBeUndefined();
  });

  it("says Hệ thống for an issue that opened and closed on its own schedule", () => {
    const rows = logRows(EMPTY_SIM, FIXTURES, NOW);
    const opened = rows.filter((r) => r.action === "Mở số");
    const closed = rows.filter((r) => r.action === "Đóng số");
    expect(opened.length).toBeGreaterThan(0);
    expect(closed.length).toBeGreaterThan(0);
    for (const r of [...opened, ...closed]) expect(r.author).toBe("Hệ thống");
    // Issue 06 has not opened yet, so it has no row of either kind.
    expect(rows.some((r) => r.id === "open-6")).toBe(false);
  });

  it("never invents an hour for a code that ran out of uses", () => {
    const rows = logRows(EMPTY_SIM, FIXTURES, NOW);
    expect(rows.some((r) => r.action === "Hết lượt")).toBe(false);
  });
});

describe("filtering", () => {
  const rows = logRows(EMPTY_SIM, FIXTURES, NOW);

  it("offers the six choices the mock's menu draws", () => {
    expect(LOG_FILTERS.map((f) => f.label)).toEqual([
      "Tất cả",
      "Đơn hàng",
      "Tồn kho",
      "Mã giảm giá",
      "Số",
      "Hệ thống",
    ]);
  });

  it("keeps everything under Tất cả", () => {
    expect(rows.every((r) => inFilter("all", r))).toBe(true);
  });

  it("filters by what the row is about", () => {
    expect(rows.filter((r) => inFilter("order", r)).every((r) => r.kind === "order")).toBe(true);
    expect(rows.filter((r) => inFilter("drop", r)).every((r) => r.kind === "drop")).toBe(true);
  });

  it("filters Hệ thống by the hand, not by the object", () => {
    const system = rows.filter((r) => inFilter("system", r));
    expect(system.length).toBeGreaterThan(0);
    expect(system.every((r) => r.author === "Hệ thống")).toBe(true);
  });

  it("reads ?kind= and refuses anything else", () => {
    expect(logFilter("stock")).toBe("stock");
    expect(logFilter(["system"])).toBe("system");
    expect(logFilter("nonsense")).toBe("all");
    expect(logFilter(undefined)).toBe("all");
  });

  it("windows by days, counted back from now", () => {
    const week = withinDays(rows, 7, NOW);
    expect(week.length).toBeLessThanOrEqual(rows.length);
    for (const r of week) {
      expect(Date.parse(r.at)).toBeGreaterThanOrEqual(NOW.getTime() - 7 * 86_400_000);
    }
  });

  it("searches everything the row says", () => {
    const row = rowsOf({ kind: "ORDER_PAID", at: AT, code: "DH-2431" })[0]!;
    expect(logHaystack(row)).toContain("dh-2431");
    expect(logHaystack(row)).toContain("đã nhận tiền");
  });
});

describe("how a row reads", () => {
  it("stamps the clock first, then the day", () => {
    expect(logStamp("2026-09-20T18:52:00+07:00")).toBe("18:52 · 20/09");
  });

  it("writes a change as before → after · tail", () => {
    const row = rowsOf({ kind: "ORDER_PAID", at: AT, code: "DH-2431" })[0]!;
    expect(diffText(row)).toMatch(/^chờ chuyển khoản → đã thanh toán · /);
  });

  it("writes a row with no before as just the after", () => {
    const row = rowsOf({ kind: "PROMO_ENDED", at: AT, code: "DOT05", endsAt: AT })[0]!;
    expect(diffText(row)).toBe("18:52 ngày 20/09 · giờ kết thúc = bây giờ");
  });
});
