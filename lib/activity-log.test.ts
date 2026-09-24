import { describe, it, expect } from "vitest";
import { CATALOG, DROPS } from "@/data/catalog";
import { CUSTOMERS } from "@/data/customers";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { ORDERS } from "@/data/orders";
import type { AdminOrder } from "./admin-orders";
import type { AdminEvent } from "./db/event-dto";
import {
  LOG_FILTERS,
  diffText,
  inFilter,
  logFilter,
  logHaystack,
  logRows,
  logStamp,
  mergeLogRows,
  scheduleRows,
  withinDays,
  type LogRow,
} from "./activity-log";

/** The sample orders as `admin_orders()` returns them: each with its account. */
const BOOK: AdminOrder[] = ORDERS.map((o) => {
  const c = CUSTOMERS.find((x) => x.id === o.customerId)!;
  return {
    ...o,
    owner: {
      id: `uuid-${c.id}`,
      handle: String(c.id),
      name: c.name,
      email: c.email,
      phone: c.phone.replace(/\s/g, ""),
      joinedAt: c.joinedAt,
    },
  };
});

/** Inside issue 05's window, after every order in the book. */
const NOW = new Date("2026-09-20T18:50:00+07:00");
const AT = "2026-09-20T18:52:00+07:00";

/**
 * What `reset_demo()` writes for the sample (supabase/migrations/…_admin.sql),
 * restated: one event per recorded moment, by the rules this module used to
 * derive them with.
 */
function sampleEvents(): AdminEvent[] {
  let id = 0;
  const out: AdminEvent[] = [];
  const base = (at: string, actorRole: AdminEvent["actorRole"], code: string) => ({
    id: ++id,
    at,
    actorRole,
    actor: "",
    code,
  });
  for (const o of ORDERS) {
    const code = String(o.code);
    const s = o.status;
    if (s.state === "PAID" && o.payment === "BANK_TRANSFER") {
      out.push({ ...base(s.paidAt, "system", code), kind: "ORDER_PAID", from: "AWAITING_TRANSFER" });
    } else if (s.state === "SHIPPING") {
      out.push({ ...base(s.shippedAt, "admin", code), kind: "ORDER_SHIPPED", from: "PAID", trackingCode: s.trackingCode });
    } else if (s.state === "DELIVERED") {
      out.push({ ...base(s.deliveredAt, "system", code), kind: "ORDER_DELIVERED" });
    } else if (s.state === "CANCELLED") {
      out.push(
        s.reason.toLocaleLowerCase("vi") === "quá hạn chuyển khoản"
          ? { ...base(s.cancelledAt, "system", code), kind: "ORDER_EXPIRED" }
          : { ...base(s.cancelledAt, "admin", code), kind: "ORDER_CANCELLED", reason: s.reason, note: "" },
      );
    }
  }
  out.push({ id: ++id, at: AT, actorRole: "system", actor: "", kind: "DEMO_RESET", anchor: "2026-09-20T18:50:00+07:00" });
  return out;
}

let next = 1000;
/** One event the manager's hand wrote, on DH-2431 unless told otherwise. */
const pressed = (e: Record<string, unknown>): AdminEvent =>
  ({ id: ++next, at: AT, actorRole: "admin", actor: "quanly@email.com", code: "DH-2431", ...e }) as AdminEvent;

const rowsOf = (...events: AdminEvent[]): LogRow[] => logRows(FIXTURE_CATALOG, events, BOOK, NOW);

describe("the log is the record, read back", () => {
  it("has a row for every moment the sample records, and one for the reset", () => {
    const events = sampleEvents();
    const rows = logRows(FIXTURE_CATALOG, events, BOOK, NOW);
    expect(rows).toHaveLength(events.length);
    expect(rows.every((r) => r.author === "Hệ thống" || r.author === "Cửa hàng")).toBe(true);
  });

  it("is empty when nothing is recorded and nothing is overdue", () => {
    expect(logRows(FIXTURE_CATALOG, [], [], NOW)).toEqual([]);
  });

  it("puts the newest first", () => {
    const rows = logRows(FIXTURE_CATALOG, sampleEvents(), BOOK, NOW);
    for (let i = 1; i < rows.length; i++) {
      expect(Date.parse(rows[i - 1]!.at)).toBeGreaterThanOrEqual(Date.parse(rows[i]!.at));
    }
  });

  it("gives every row a key of its own, and puts the later of two same-minute events first", () => {
    const shipped = pressed({ kind: "ORDER_SHIPPED", from: "PAID", carrier: "X", trackingCode: "T1" });
    const note = pressed({ kind: "ORDER_NOTE", text: "Ghi chú khi bàn giao: gửi 2 kiện" });
    const rows = rowsOf(shipped, note);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(rows.map((r) => r.action)).toEqual(["Ghi chú nội bộ", "Bàn giao"]);
  });
});

describe("what the shop's hand wrote", () => {
  it("records a payment with the state it came from and the amount", () => {
    const row = rowsOf(pressed({ kind: "ORDER_PAID", from: "AWAITING_TRANSFER" }))[0]!;
    expect(row.action).toBe("Đã nhận tiền");
    expect(row.detail).toBe("đánh dấu tay");
    expect(row.author).toBe("Cửa hàng");
    expect(row.before).toBe("chờ chuyển khoản");
    expect(row.after).toBe("đã thanh toán");
    expect(row.subject).toBe("DH-2431 · Nguyễn Khả Vy");
    expect(row.href).toBe("/admin/orders/DH-2431");
    expect(row.tail).toMatch(/₫$/);
  });

  it("says where a card order's payment came from: taken, not waited for", () => {
    const row = rowsOf(pressed({ kind: "ORDER_PAID", from: "RECEIVED" }))[0]!;
    expect(row.before).toBe("đã nhận đơn");
  });

  it("records a handover with the courier and the number", () => {
    const row = rowsOf(
      pressed({ kind: "ORDER_SHIPPED", from: "PAID", carrier: "Giao tiêu chuẩn · 2–4 ngày", trackingCode: "VNP-2431-01" }),
    )[0]!;
    expect(row.action).toBe("Bàn giao");
    expect(row.before).toBe("đã thanh toán");
    expect(row.after).toBe("đang giao");
    expect(row.tail).toBe("Giao tiêu chuẩn · 2–4 ngày · VNP-2431-01");
  });

  it("records a delivery the shop marked by hand", () => {
    const row = rowsOf(pressed({ kind: "ORDER_DELIVERED" }))[0]!;
    expect(row).toMatchObject({
      action: "Giao thành công",
      detail: "đánh dấu tay",
      author: "Cửa hàng",
      before: "đang giao",
      after: "đã giao",
    });
  });

  it("records an address edit with the line before and after, and the reason", () => {
    const before = ORDERS.find((o) => o.code === "DH-2429")!.shipTo;
    const row = rowsOf(
      pressed({
        code: "DH-2429",
        kind: "ORDER_ADDRESS_EDITED",
        before,
        after: { ...before, line: "47 Trần Hưng Đạo" },
        reason: "khách nhắn đổi số nhà",
      }),
    )[0]!;
    expect(row.action).toBe("Sửa địa chỉ giao");
    expect(row.detail).toBe("trước khi bàn giao");
    expect(row.before).toBe(before.line);
    expect(row.after).toBe("47 Trần Hưng Đạo");
    expect(row.tail).toBe('"khách nhắn đổi số nhà"');
  });

  it("quotes an internal note", () => {
    const row = rowsOf(pressed({ kind: "ORDER_NOTE", text: "gọi khách" }))[0]!;
    expect(row.action).toBe("Ghi chú nội bộ");
    expect(row.tail).toBe('"gọi khách"');
  });

  it("records the shop's cancellation with its reason and what was in the box", () => {
    const row = rowsOf(
      pressed({ code: "DH-2429", kind: "ORDER_CANCELLED", from: "PAID", reason: "Hết hàng thật", note: "" }),
    )[0]!;
    expect(row.author).toBe("Cửa hàng");
    expect(row.detail).toBe("hết hàng thật");
    expect(row.before).toBe("đã thanh toán");
    expect(row.tail).toContain("×");
  });

  it("records the manager's reset of the demo, with its anchor", () => {
    const row = rowsOf({
      id: 5,
      at: AT,
      actorRole: "admin",
      actor: "quanly@email.com",
      kind: "DEMO_RESET",
      anchor: "2026-09-23T18:50:00+07:00",
    })[0]!;
    expect(row).toMatchObject({
      kind: "demo",
      author: "Cửa hàng",
      action: "Đặt lại dữ liệu mẫu",
      detail: "neo 18:50 · 23/09",
      subject: "Dữ liệu mẫu",
    });
    expect(row.href).toBeUndefined();
  });
});

describe("who did it", () => {
  it("says Khách for an order placed and one cancelled by the shopper", () => {
    const placed = rowsOf(pressed({ actorRole: "customer", actor: "vy@example.test", kind: "ORDER_PLACED" }))[0]!;
    expect(placed).toMatchObject({ author: "Khách", action: "Đặt đơn", detail: "chuyển khoản" });
    expect(placed.after).toBe("chờ chuyển khoản");

    const row = rowsOf(
      pressed({ actorRole: "customer", kind: "ORDER_CANCELLED_BY_CUSTOMER", from: "AWAITING_TRANSFER" }),
    )[0]!;
    expect(row.author).toBe("Khách");
    expect(row.action).toBe("Huỷ đơn");
    expect(row.detail).toBe("khách huỷ");
    expect(row.after).toBe("đã huỷ");
  });

  it("says Hệ thống for a transfer that matched itself", () => {
    const rows = logRows(FIXTURE_CATALOG, sampleEvents(), BOOK, NOW);
    const matched = rows.filter((r) => r.action === "Khớp chuyển khoản");
    expect(matched.length).toBeGreaterThan(0);
    for (const r of matched) {
      expect(r.author).toBe("Hệ thống");
      expect(r.detail).toBe("tự động theo nội dung");
      expect(r.before).toBe("chờ chuyển khoản");
      expect(r.after).toBe("đã thanh toán");
    }
  });

  it("says Hệ thống for a hold the sweep released, stamped at its deadline", () => {
    const row = rowsOf(pressed({ actorRole: "system", actor: "", kind: "ORDER_EXPIRED", at: "2026-09-22T08:05:00+07:00" }))[0]!;
    expect(row).toMatchObject({
      author: "Hệ thống",
      action: "Huỷ đơn",
      detail: "quá 12 giờ chưa chuyển khoản",
      before: "chờ chuyển khoản",
      after: "đã huỷ",
      at: "2026-09-22T08:05:00+07:00",
    });
  });

  it("reads a hold the clock let go of before the sweep wrote it down", () => {
    const waiting = BOOK.find((o) => o.status.state === "AWAITING_TRANSFER")!;
    const dueAt = waiting.status.state === "AWAITING_TRANSFER" ? waiting.status.dueAt : "";
    const after = new Date(Date.parse(dueAt) + 3_600_000);
    const row = logRows(FIXTURE_CATALOG, [], BOOK, after).find((r) => r.id === `due-${waiting.code}`)!;
    expect(row.author).toBe("Hệ thống");
    expect(row.detail).toBe("quá 12 giờ chưa chuyển khoản");
    expect(row.at).toBe(dueAt);
    expect(row.tail).toContain("×");
  });

  it("has no such row once the order is no longer waiting — paid, or swept", () => {
    const waiting = BOOK.find((o) => o.status.state === "AWAITING_TRANSFER")!;
    const dueAt = waiting.status.state === "AWAITING_TRANSFER" ? waiting.status.dueAt : "";
    const after = new Date(Date.parse(dueAt) + 3_600_000);
    const paid = BOOK.map((o) =>
      o.code === waiting.code ? { ...o, status: { state: "PAID" as const, paidAt: AT } } : o,
    );
    expect(logRows(FIXTURE_CATALOG, [], paid, after).some((r) => r.id === `due-${waiting.code}`)).toBe(false);
  });

  it("never invents an hour for a code that ran out of uses", () => {
    const rows = logRows(FIXTURE_CATALOG, sampleEvents(), BOOK, NOW);
    expect(rows.some((r) => r.action === "Hết lượt")).toBe(false);
  });
});

/// ───────────────────────────────────────── the catalogue (slice B3b)
// What the simulation used to say about stock, issues, teasers and codes, now
// read off `public.events` — the same sentences, from rows the database wrote.

/** One catalogue event the manager's hand wrote. */
const done = (e: Record<string, unknown>): AdminEvent =>
  ({ id: ++next, at: AT, actorRole: "admin", actor: "quanly@email.com", ...e }) as AdminEvent;

const TERMS = {
  kind: "PERCENT",
  percent: 10,
  maxDiscountVnd: 150_000,
  amountVnd: null,
  minOrderVnd: 500_000,
  usageLimit: 200,
  startsAt: "2026-09-11T20:00:00+07:00",
  endsAt: "2026-09-25T20:00:00+07:00",
} as const;

describe("what the shop did to the catalogue", () => {
  it("names the style, the colour and the size of a one-cell adjustment", () => {
    const bui = FIXTURE_CATALOG.bySlug.get("s05-bui")!;
    const row = rowsOf(
      done({
        kind: "INVENTORY_ADJUSTED",
        productId: String(bui.id),
        cells: [{ color: "black", size: "L", before: 1, after: 2 }],
        reason: "Hàng trả về",
        ref: "DH-2419",
        note: "còn nguyên tag",
        delta: 1,
      }),
    )[0]!;
    expect(row.kind).toBe("stock");
    expect(row.author).toBe("Cửa hàng");
    expect(row.action).toBe("Điều chỉnh tồn kho");
    expect(row.detail).toBe("lý do: hàng trả về");
    expect(row.subject).toBe("BỤI · Đen · L");
    expect(row.href).toBe(`/admin/products/${bui.id}`);
    expect(row.before).toBe("1");
    expect(row.after).toBe("2");
    expect(row.tail).toBe('tham chiếu DH-2419 · "còn nguyên tag"');
  });

  it("counts the cells when an adjustment moved more than one", () => {
    const bui = FIXTURE_CATALOG.bySlug.get("s05-bui")!;
    const row = rowsOf(
      done({
        kind: "INVENTORY_ADJUSTED",
        productId: String(bui.id),
        cells: [
          { color: "black", size: "L", before: 1, after: 2 },
          { color: "grey", size: "S", before: 0, after: 1 },
        ],
        reason: "Kiểm kê lệch",
        ref: "",
        note: "",
        delta: 2,
      }),
    )[0]!;
    expect(row.subject).toBe("BỤI · 2 ô");
    expect(row.tail).toBe("+2 chiếc");
  });

  it("records a style edit as the field it changed, before and after", () => {
    const row = rowsOf(
      done({
        kind: "PRODUCT_EDITED",
        productId: "p-khoi",
        before: { priceVnd: 390_000 },
        after: { priceVnd: 420_000 },
      }),
    )[0]!;
    expect(row.kind).toBe("stock");
    expect(row.action).toBe("Sửa mẫu");
    expect(row.detail).toBe("giá");
    expect(row.subject).toBe("KHÓI");
    expect(row.before).toBe("390.000₫");
    expect(row.after).toBe("420.000₫");
  });

  it("lists every field of an edit that changed several", () => {
    const row = rowsOf(
      done({
        kind: "PRODUCT_EDITED",
        productId: "p-khoi",
        before: { name: "KHÓI", slug: "khoi" },
        after: { name: "KHÓI ĐEN", slug: "khoi-den" },
      }),
    )[0]!;
    expect(row.detail).toBe("tên, mã địa chỉ");
    expect(row.before).toBeUndefined();
    expect(row.tail).toBe("tên KHÓI → KHÓI ĐEN · mã địa chỉ khoi → khoi-den");
  });

  // ── slice B3c: a style created, a colour's photo, the band order. The
  // brief's own lines: "Thêm mẫu SỎI · Số 06 · 3 màu · 36 chiếc", "Thay ảnh Đen
  // của KHÓI", "Đổi thứ tự màu KHÓI: Kem · Đen".
  it("records a new style with its issue, its colours, its cut and where its photos came from", () => {
    const row = rowsOf(
      done({
        kind: "PRODUCT_ADDED",
        productId: "p-soi",
        name: "SỎI",
        slug: "soi",
        dropNo: 6,
        colors: ["black", "cream", "moss"],
        cutUnits: 36,
        uploaded: 1,
        borrowed: 2,
      }),
    )[0]!;
    expect(row.kind).toBe("stock");
    expect(row.author).toBe("Cửa hàng");
    expect(row.action).toBe("Thêm mẫu");
    expect(row.detail).toBe("1 ảnh tải lên · 2 ảnh mượn");
    // Not in the fixture's catalogue: the name it was created with.
    expect(row.subject).toBe("SỎI");
    expect(row.href).toBe("/admin/products/p-soi");
    expect(row.tail).toBe("Số 06 · 3 màu · 36 chiếc");
    expect(`${row.action} ${row.subject} · ${row.tail}`).toBe("Thêm mẫu SỎI · Số 06 · 3 màu · 36 chiếc");
    expect(inFilter("stock", row)).toBe(true);
  });

  it("records a new fixed style with its colours only: it has no issue and no cut (slice B5)", () => {
    const row = rowsOf(
      done({
        kind: "PRODUCT_ADDED",
        productId: "p-ao-mua",
        name: "ÁO MƯA",
        slug: "ao-mua",
        dropNo: null,
        colors: ["black", "navy"],
        cutUnits: null,
        uploaded: 0,
        borrowed: 2,
      }),
    )[0]!;
    expect(row.tail).toBe("2 màu");
    expect(`${row.action} ${row.subject} · ${row.tail}`).toBe("Thêm mẫu ÁO MƯA · 2 màu");
  });

  it("says only the photo sources a new style has", () => {
    const row = rowsOf(
      done({
        kind: "PRODUCT_ADDED",
        productId: "p-da",
        name: "ĐÁ",
        slug: "da",
        dropNo: 5,
        colors: ["grey"],
        cutUnits: 12,
        uploaded: 0,
        borrowed: 1,
      }),
    )[0]!;
    expect(row.detail).toBe("1 ảnh mượn");
  });

  it("records a photo swap as the colour, the style and what kind of photo it became", () => {
    const row = rowsOf(
      done({
        kind: "PRODUCT_PHOTO_SET",
        productId: "p-khoi",
        color: "black",
        before: "khoi",
        after: `up/${"b".repeat(32)}.webp`,
      }),
    )[0]!;
    expect(row.kind).toBe("stock");
    expect(row.action).toBe("Thay ảnh Đen");
    expect(row.subject).toBe("KHÓI");
    expect(row.href).toBe("/admin/products/p-khoi");
    expect(row.before).toBe("ảnh mượn");
    expect(row.after).toBe("ảnh thật");
    expect(`${row.action} của ${row.subject}`).toBe("Thay ảnh Đen của KHÓI");

    const again = rowsOf(
      done({
        kind: "PRODUCT_PHOTO_SET",
        productId: "p-khoi",
        color: "cream",
        before: `up/${"b".repeat(32)}.webp`,
        after: `up/${"c".repeat(32)}.jpg`,
      }),
    )[0]!;
    expect(diffText(again)).toBe("ảnh thật → ảnh thật");
  });

  it("records a new band order as the colours before and after", () => {
    const row = rowsOf(
      done({
        kind: "PRODUCT_COLORS_REORDERED",
        productId: "p-khoi",
        before: ["black", "cream"],
        after: ["cream", "black"],
      }),
    )[0]!;
    expect(row.kind).toBe("stock");
    expect(row.action).toBe("Đổi thứ tự màu");
    expect(row.subject).toBe("KHÓI");
    expect(row.before).toBe("Đen · Kem");
    expect(row.after).toBe("Kem · Đen");
    expect(`${row.action} ${row.subject}: ${row.after}`).toBe("Đổi thứ tự màu KHÓI: Kem · Đen");
    expect(logHaystack(row)).toContain("kem · đen");
  });

  it("records a new code with its run, and an edited one with its new run", () => {
    const made = rowsOf(done({ kind: "PROMO_ADDED", promoCode: "TEST10", terms: TERMS }))[0]!;
    expect(made.action).toBe("Tạo mã");
    expect(made.subject).toBe("TEST10");
    expect(made.kind).toBe("promo");
    expect(made.tail).toBe("20:00 ngày 11/09 → 20:00 ngày 25/09");

    const edited = rowsOf(
      done({ kind: "PROMO_EDITED", promoCode: "DOT05", before: TERMS, after: { ...TERMS, percent: 12 } }),
    )[0]!;
    expect(edited.action).toBe("Sửa mã");
    expect(edited.before).toBeUndefined();
  });

  it("records a raised cap as a before and an after, from unlimited too", () => {
    const row = rowsOf(done({ kind: "PROMO_LIMIT_RAISED", promoCode: "DOT05", before: 200, after: 250 }))[0]!;
    expect(row.action).toBe("Nâng giới hạn");
    expect(row.before).toBe("200 lượt");
    expect(row.after).toBe("250 lượt");
    const open = rowsOf(done({ kind: "PROMO_LIMIT_RAISED", promoCode: "CHAOBAN", before: null, after: 100 }))[0]!;
    expect(open.before).toBe("không giới hạn");
  });

  it("says which way a pause went", () => {
    const off = rowsOf(done({ kind: "PROMO_PAUSED", promoCode: "DOT05", paused: true }))[0]!;
    const on = rowsOf(done({ kind: "PROMO_PAUSED", promoCode: "DOT05", paused: false }))[0]!;
    expect(off.action).toBe("Tạm dừng mã");
    expect(off.after).toBe("tạm dừng");
    expect(on.action).toBe("Tiếp tục mã");
    expect(on.after).toBe("đang chạy");
  });

  it("ends a run by moving its closing hour, and says so", () => {
    const row = rowsOf(
      done({ kind: "PROMO_ENDED", promoCode: "DOT05", before: "2026-09-25T20:00:00+07:00", after: AT }),
    )[0]!;
    expect(row.action).toBe("Kết thúc sớm");
    expect(row.before).toBe("20:00 ngày 25/09");
    expect(row.after).toBe("18:52 ngày 20/09");
    expect(row.tail).toBe("giờ kết thúc = bây giờ");
  });

  it("tells an issue created apart from an issue closed early and one rescheduled", () => {
    const created = rowsOf(
      done({ kind: "DROP_ADDED", no: 7, opensAt: "2026-11-06T20:00:00+07:00", closesAt: "2026-11-20T20:00:00+07:00" }),
    )[0]!;
    expect(created.action).toBe("Tạo số");
    expect(created.subject).toBe("Số 07");
    expect(created.kind).toBe("drop");
    expect(created.href).toBe("/admin/drops/07");

    const window = { opensAt: "2026-09-11T20:00:00+07:00", closesAt: "2026-09-25T20:00:00+07:00" };
    const early = rowsOf(
      done({ kind: "DROP_SCHEDULED", no: 5, before: window, after: { ...window, closesAt: AT } }),
    )[0]!;
    expect(early.action).toBe("Đóng sớm");
    expect(early.detail).toBe("giờ đóng đổi thành bây giờ");
    expect(early.before).toBe("20:00 ngày 25/09");
    expect(early.after).toBe("18:52 ngày 20/09");

    const moved = rowsOf(
      done({
        kind: "DROP_SCHEDULED",
        no: 6,
        before: { opensAt: "2026-10-02T20:00:00+07:00", closesAt: "2026-10-16T20:00:00+07:00" },
        after: { opensAt: "2026-10-03T20:00:00+07:00", closesAt: "2026-10-17T20:00:00+07:00" },
      }),
    )[0]!;
    expect(moved.action).toBe("Sửa giờ");
    expect(moved.tail).toBe("mở 20:00 ngày 03/10");
  });

  it("records a teaser against the issue it was announced for", () => {
    const row = rowsOf(
      done({
        kind: "TEASER_ADDED",
        no: 6,
        slug: "thu-6",
        name: "THỬ",
        garment: "Áo khoác dù",
        family: "JACKET",
        photoKey: "suong",
      }),
    )[0]!;
    expect(row.action).toBe("Thêm mẫu hé lộ");
    expect(row.subject).toBe("Số 06");
    expect(row.tail).toBe("THỬ · Áo khoác dù");
  });

  it("files a style edit under Tồn kho and every code move under Mã giảm giá", () => {
    const rows = rowsOf(
      done({ kind: "PRODUCT_EDITED", productId: "p-khoi", before: { priceVnd: 1 }, after: { priceVnd: 2 } }),
      done({ kind: "PROMO_PAUSED", promoCode: "DOT05", paused: true }),
    );
    expect(rows.filter((r) => inFilter("stock", r)).map((r) => r.action)).toEqual(["Sửa mẫu"]);
    expect(rows.filter((r) => inFilter("promo", r)).map((r) => r.action)).toEqual(["Tạm dừng mã"]);
  });
});

describe("what the schedule did", () => {
  it("says Hệ thống for an issue that opened and closed on its own schedule", () => {
    const rows = scheduleRows(FIXTURE_CATALOG, DROPS, CATALOG, NOW);
    const opened = rows.filter((r) => r.action === "Mở số");
    const closed = rows.filter((r) => r.action === "Đóng số");
    expect(opened.length).toBeGreaterThan(0);
    expect(closed.length).toBeGreaterThan(0);
    for (const r of [...opened, ...closed]) expect(r.author).toBe("Hệ thống");
    // Issue 06 has not opened yet, so it has no row of either kind.
    expect(rows.some((r) => r.id === "open-6")).toBe(false);
  });
});

describe("the two sources as one log", () => {
  it("merges them newest first", () => {
    const merged = mergeLogRows(
      logRows(
        FIXTURE_CATALOG,
        [
          ...sampleEvents(),
          {
            id: 9_999,
            at: "2026-09-20T18:55:00+07:00",
            actorRole: "admin",
            actor: "quanly@email.com",
            kind: "PROMO_ENDED",
            promoCode: "DOT05",
            before: "2026-09-25T20:00:00+07:00",
            after: "2026-09-20T18:55:00+07:00",
          },
        ],
        BOOK,
        NOW,
      ),
      scheduleRows(FIXTURE_CATALOG, DROPS, CATALOG, NOW),
    );
    expect(merged[0]!.action).toBe("Kết thúc sớm");
    for (let i = 1; i < merged.length; i++) {
      expect(Date.parse(merged[i - 1]!.at)).toBeGreaterThanOrEqual(Date.parse(merged[i]!.at));
    }
  });
});

describe("filtering", () => {
  const rows = mergeLogRows(
    logRows(FIXTURE_CATALOG, sampleEvents(), BOOK, NOW),
    scheduleRows(FIXTURE_CATALOG, DROPS, CATALOG, NOW),
  );

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

  it("filters Hệ thống by the hand, not by the object — a script's reset included", () => {
    const system = rows.filter((r) => inFilter("system", r));
    expect(system.length).toBeGreaterThan(0);
    expect(system.every((r) => r.author === "Hệ thống")).toBe(true);
    expect(system.some((r) => r.kind === "demo")).toBe(true);
  });

  it("reads ?kind= and refuses anything else", () => {
    expect(logFilter("stock")).toBe("stock");
    expect(logFilter(["system"])).toBe("system");
    expect(logFilter("demo")).toBe("all");
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
    const row = rowsOf(pressed({ kind: "ORDER_PAID", from: "AWAITING_TRANSFER" }))[0]!;
    expect(logHaystack(row)).toContain("dh-2431");
    expect(logHaystack(row)).toContain("đã nhận tiền");
  });
});

describe("how a row reads", () => {
  it("stamps the clock first, then the day", () => {
    expect(logStamp("2026-09-20T18:52:00+07:00")).toBe("18:52 · 20/09");
  });

  it("writes a change as before → after · tail", () => {
    const row = rowsOf(pressed({ kind: "ORDER_PAID", from: "AWAITING_TRANSFER" }))[0]!;
    expect(diffText(row)).toMatch(/^chờ chuyển khoản → đã thanh toán · /);
  });

  it("writes a row with no before as just the after", () => {
    // An order placed has a state to land in and nothing it left.
    const row = rowsOf(pressed({ kind: "ORDER_PLACED" }))[0]!;
    expect(row.before).toBeUndefined();
    expect(diffText(row)).toMatch(/^(chờ chuyển khoản|đã nhận đơn) · [\d.]+₫$/);
  });
});
