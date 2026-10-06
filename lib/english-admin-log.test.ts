import { describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { ORDERS } from "@/data/orders";
import {
  LOG_FILTERS,
  diffText,
  inFilter,
  logAuthorLabel,
  logFilters,
  logHaystack,
  logRows,
  logStamp,
  scheduleRows,
  type LogRow,
} from "./activity-log";
import type { AdminOrder } from "./admin-orders";
import { plainText } from "./admin-text";
import type { AdminEvent } from "./db/event-dto";
import { DELIVERY_OPTIONS } from "./shipping";

/**
 * Round v6 slice E4: the activity log in English. The events table keeps a
 * kind and the values of the move; every sentence is built in
 * `lib/activity-log.ts`, so the log is translated there. A value kept as typed
 * (a note, a reason, an address, a style's name at the time) is printed as
 * stored and marked `lang="vi"` when it is Vietnamese. The Vietnamese log is
 * `activity-log.test.ts`'s, untouched.
 */

const NB = " ";
const D = (day: number, month: string) => `${day}${NB}${month}`;

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

const NOW = new Date("2026-09-20T18:50:00+07:00");
const AT = "2026-09-20T18:52:00+07:00";

let next = 5000;
/** One event the manager's hand wrote, on DH-2431 unless told otherwise. */
const pressed = (e: Record<string, unknown>): AdminEvent =>
  ({ id: ++next, at: AT, actorRole: "admin", actor: "quanly@email.com", code: "DH-2431", ...e }) as AdminEvent;
/** One catalogue event the manager's hand wrote. */
const done = (e: Record<string, unknown>): AdminEvent =>
  ({ id: ++next, at: AT, actorRole: "admin", actor: "quanly@email.com", ...e }) as AdminEvent;

const rowEn = (e: AdminEvent): LogRow => logRows(FIXTURE_CATALOG, [e], BOOK, NOW, "en")[0]!;
const VY = { stored: "Nguyễn Khả Vy", lang: "vi" };

describe("the orders' rows in English", () => {
  it("writes a placed order, the customer's name marked as Vietnamese", () => {
    const row = rowEn(pressed({ actorRole: "customer", kind: "ORDER_PLACED" }));
    expect(row).toMatchObject({
      author: "Khách",
      action: "Order placed",
      detail: "bank transfer",
      subject: ["DH-2431 · ", VY],
      after: "awaiting transfer",
    });
    expect(row.tail).toMatch(/^[\d,]+₫$/);
    expect(logAuthorLabel(row.author, "en")).toBe("Customer");
  });

  it("tells a payment by hand from a matched transfer", () => {
    expect(rowEn(pressed({ kind: "ORDER_PAID", from: "AWAITING_TRANSFER" }))).toMatchObject({
      action: "Marked as paid",
      detail: "by hand",
      before: "awaiting transfer",
      after: "paid",
    });
    expect(rowEn(pressed({ actorRole: "system", actor: "", kind: "ORDER_PAID", from: "AWAITING_TRANSFER" }))).toMatchObject({
      action: "Transfer matched",
      detail: "automatic, by reference",
    });
    expect(rowEn(pressed({ kind: "ORDER_PAID", from: "RECEIVED" })).before).toBe("order received");
  });

  it("names the carrier of a handover by the English table", () => {
    const row = rowEn(
      pressed({ kind: "ORDER_SHIPPED", from: "PAID", carrier: DELIVERY_OPTIONS[0]!.label, trackingCode: "VNP-2431-01" }),
    );
    expect(row).toMatchObject({ action: "Handed over", before: "paid", after: "shipping" });
    expect(row.tail).toBe("Standard delivery · 2–4 days · VNP-2431-01");
    expect(rowEn(pressed({ kind: "ORDER_SHIPPED", from: "PAID", trackingCode: "VNP-1" })).tail).toBe("VNP-1");
  });

  it("writes a delivery, by hand or as recorded", () => {
    expect(rowEn(pressed({ kind: "ORDER_DELIVERED" }))).toMatchObject({
      action: "Delivered",
      detail: "by hand",
      before: "shipping",
      after: "delivered",
    });
    expect(rowEn(pressed({ actorRole: "system", actor: "", kind: "ORDER_DELIVERED" })).detail).toBe("as the order records it");
  });

  it("translates the shop's own cancel reasons and prints any other as stored", () => {
    const own = rowEn(pressed({ kind: "ORDER_CANCELLED", from: "PAID", reason: "Hết hàng thật", note: "" }));
    expect(own).toMatchObject({ action: "Order cancelled", detail: "out of stock", before: "paid", after: "cancelled" });
    expect(own.tail).toBe(`D05${NB}–⁠${NB}CÁT${NB}×1`);
    expect(rowEn(pressed({ kind: "ORDER_CANCELLED", reason: "Quá hạn chuyển khoản", note: "" })).detail).toBe("transfer overdue");
    expect(rowEn(pressed({ kind: "ORDER_CANCELLED", reason: "khách đi xa", note: "" })).detail).toEqual([
      { stored: "khách đi xa", lang: "vi" },
    ]);
    expect(rowEn(pressed({ actorRole: "customer", kind: "ORDER_CANCELLED_BY_CUSTOMER", from: "AWAITING_TRANSFER" }))).toMatchObject({
      action: "Order cancelled",
      detail: "cancelled by the customer",
    });
  });

  it("says why the clock cancelled a transfer", () => {
    const row = rowEn(pressed({ actorRole: "system", actor: "", kind: "ORDER_EXPIRED" }));
    expect(row).toMatchObject({
      author: "Hệ thống",
      action: "Order cancelled",
      detail: "no transfer within 12 hours",
      before: "awaiting transfer",
      after: "cancelled",
    });
    expect(logAuthorLabel(row.author, "en")).toBe("System");
  });

  it("quotes a note and an address change as stored", () => {
    const note = rowEn(pressed({ kind: "ORDER_NOTE", text: "gọi khách" }));
    expect(note).toMatchObject({ action: "Internal note", tail: ['"', { stored: "gọi khách", lang: "vi" }, '"'] });
    expect(rowEn(pressed({ kind: "ORDER_NOTE", text: "call first" })).tail).toBe('"call first"');

    const order = BOOK.find((o) => String(o.code) === "DH-2431")!;
    const moved = rowEn(
      pressed({
        kind: "ORDER_ADDRESS_EDITED",
        before: order.shipTo,
        after: { ...order.shipTo, line: "47 Trần Hưng Đạo" },
        reason: "khách nhắn đổi số nhà",
      }),
    );
    expect(moved).toMatchObject({
      action: "Delivery address changed",
      detail: "before handover",
      after: [{ stored: "47 Trần Hưng Đạo", lang: "vi" }],
      tail: ['"', { stored: "khách nhắn đổi số nhà", lang: "vi" }, '"'],
    });
    expect(diffText(moved)).toBe(`${order.shipTo.line} → 47 Trần Hưng Đạo · "khách nhắn đổi số nhà"`);
  });

  it("writes the reset of the demo data in the glossary's words", () => {
    const row = rowEn(
      done({ actorRole: "system", actor: "", kind: "DEMO_RESET", anchor: "2026-09-20T18:50:00+07:00" }),
    );
    expect(row).toMatchObject({ action: "Demo data reset", detail: `anchored 18:50 · ${D(20, "Sep")}`, subject: "Demo data" });
  });
});

describe("the catalogue's rows in English", () => {
  it("adjusts the shelf with a reason from the table, the colour in English", () => {
    const bui = FIXTURE_CATALOG.bySlug.get("s05-bui")!;
    const row = rowEn(
      done({
        kind: "INVENTORY_ADJUSTED",
        productId: String(bui.id),
        cells: [{ color: "black", size: "L", before: 1, after: 2 }],
        reason: "Hàng trả về",
        ref: "DH-2419",
        note: "còn nguyên tag",
        delta: 1,
      }),
    );
    expect(row).toMatchObject({
      action: "Stock adjusted",
      detail: "reason: returned",
      subject: `D05${NB}– BỤI · Black · L`,
      before: "1",
      after: "2",
    });
    expect(row.tail).toEqual(["ref DH-2419 · \"", { stored: "còn nguyên tag", lang: "vi" }, '"']);
    const many = rowEn(
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
    );
    expect(many).toMatchObject({ detail: "reason: stocktake mismatch", subject: `D05${NB}– BỤI · 2 variants`, tail: "+2 units" });
  });

  it("reads a restock of a fixed style by its English name", () => {
    const hoodie = FIXTURE_CATALOG.bySlug.get("hoodie-tron")!;
    const row = rowEn(
      done({
        kind: "INVENTORY_ADJUSTED",
        productId: String(hoodie.id),
        cells: [{ color: "grey", size: "M", before: 0, after: 6 }],
        reason: "Nhập thêm",
        ref: "",
        note: "",
        delta: 6,
      }),
    );
    expect(row).toMatchObject({ action: "Restock", subject: "PLAIN HOODIE · Grey · M", tail: "+6 units" });
    expect(diffText(row)).toBe("0 → 6 · +6 units");
    expect(row.detail).toBeUndefined();
  });

  it("records a style edit: the fields in English, a typed value as stored", () => {
    const price = rowEn(
      done({ kind: "PRODUCT_EDITED", productId: "p-khoi", before: { priceVnd: 390_000 }, after: { priceVnd: 420_000 } }),
    );
    expect(price).toMatchObject({
      action: "Style edited",
      detail: "price",
      subject: `D05${NB}– KHÓI`,
      before: "390,000₫",
      after: "420,000₫",
    });
    const named = rowEn(
      done({
        kind: "PRODUCT_EDITED",
        productId: "p-khoi",
        before: { name: "KHÓI", slug: "khoi", fit: "OVERSIZE", family: "TEE" },
        after: { name: "KHÓI ĐEN", slug: "khoi-den", fit: "REGULAR", family: "HOODIE" },
      }),
    );
    expect(named.detail).toBe("name, slug, fit, category");
    expect(plainText(named.tail)).toBe("name KHÓI → KHÓI ĐEN · slug khoi → khoi-den · fit oversized → regular · category Tees → Hoodies");
    expect(Array.isArray(named.tail)).toBe(true);
    const drop = rowEn(done({ kind: "PRODUCT_EDITED", productId: "p-khoi", before: { dropNo: 5 }, after: { dropNo: 6 } }));
    expect(drop).toMatchObject({ detail: "drop", before: "Drop 05", after: "Drop 06" });
  });

  it("records a new style, a photo and a band order in English", () => {
    const made = rowEn(
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
    );
    expect(made).toMatchObject({
      action: "Style added",
      detail: "1 uploaded photo · 2 borrowed photos",
      subject: [`D06${NB}– `, { stored: "SỎI", lang: "vi" }],
      tail: "Drop 06 · 3 colours · 36 units",
    });
    const fixed = rowEn(
      done({
        kind: "PRODUCT_ADDED",
        productId: "p-ao-mua",
        name: "ÁO MƯA",
        slug: "ao-mua",
        dropNo: null,
        colors: ["black"],
        cutUnits: null,
        uploaded: 0,
        borrowed: 1,
      }),
    );
    expect(fixed).toMatchObject({ detail: "1 borrowed photo", subject: [{ stored: "ÁO MƯA", lang: "vi" }], tail: "1 colour" });

    const photo = rowEn(
      done({ kind: "PRODUCT_PHOTO_SET", productId: "p-khoi", color: "black", before: "khoi", after: `up/${"b".repeat(32)}.webp` }),
    );
    expect(photo).toMatchObject({ action: "Black photo changed", before: "borrowed photo", after: "real photo" });

    const band = rowEn(
      done({ kind: "PRODUCT_COLORS_REORDERED", productId: "p-khoi", before: ["black", "cream"], after: ["cream", "black"] }),
    );
    expect(band).toMatchObject({ action: "Colour order changed", before: "Black · Cream", after: "Cream · Black" });
  });

  it("records the codes in English", () => {
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
    expect(rowEn(done({ kind: "PROMO_ADDED", promoCode: "TEST10", terms: TERMS }))).toMatchObject({
      action: "Code created",
      tail: `20:00, ${D(11, "Sep")} → 20:00, ${D(25, "Sep")}`,
    });
    expect(rowEn(done({ kind: "PROMO_EDITED", promoCode: "DOT05", before: TERMS, after: TERMS })).action).toBe("Code edited");
    expect(rowEn(done({ kind: "PROMO_LIMIT_RAISED", promoCode: "DOT05", before: null, after: 1 }))).toMatchObject({
      action: "Limit raised",
      before: "no limit",
      after: "1 use",
    });
    expect(rowEn(done({ kind: "PROMO_LIMIT_RAISED", promoCode: "DOT05", before: 100, after: 200 })).before).toBe("100 uses");
    expect(rowEn(done({ kind: "PROMO_PAUSED", promoCode: "DOT05", paused: true }))).toMatchObject({
      action: "Code paused",
      before: "running",
      after: "paused",
      tail: "checkout refuses it from now on",
    });
    expect(rowEn(done({ kind: "PROMO_PAUSED", promoCode: "DOT05", paused: false }))).toMatchObject({
      action: "Code resumed",
      tail: "checkout accepts it again from now on",
    });
    expect(
      rowEn(done({ kind: "PROMO_ENDED", promoCode: "DOT05", before: "2026-09-25T20:00:00+07:00", after: AT })),
    ).toMatchObject({ action: "Ended early", tail: "end time = now" });
  });

  it("records the drops and a teaser in English, the teaser's words as stored", () => {
    expect(
      rowEn(
        done({
          kind: "DROP_ADDED",
          no: 7,
          opensAt: "2026-10-09T20:00:00+07:00",
          closesAt: "2026-10-23T20:00:00+07:00",
        }),
      ),
    ).toMatchObject({ action: "Drop created", subject: "Drop 07", tail: `opens 20:00, ${D(9, "Oct")} → closes 20:00, ${D(23, "Oct")}` });
    const early = rowEn(
      done({
        kind: "DROP_SCHEDULED",
        no: 5,
        before: { opensAt: "2026-09-11T20:00:00+07:00", closesAt: "2026-09-25T20:00:00+07:00" },
        after: { opensAt: "2026-09-11T20:00:00+07:00", closesAt: AT },
      }),
    );
    expect(early).toMatchObject({ action: "Closed early", detail: "closing time moved to now", subject: "Drop 05" });
    const moved = rowEn(
      done({
        kind: "DROP_SCHEDULED",
        no: 6,
        before: { opensAt: "2026-10-09T20:00:00+07:00", closesAt: "2026-10-23T20:00:00+07:00" },
        after: { opensAt: "2026-10-10T20:00:00+07:00", closesAt: "2026-10-24T20:00:00+07:00" },
      }),
    );
    expect(moved).toMatchObject({ action: "Times changed", tail: `opens 20:00, ${D(10, "Oct")}` });
    expect(rowEn(done({ kind: "TEASER_ADDED", no: 6, name: "MÂY", garment: "Áo khoác dù" }))).toMatchObject({
      action: "Teaser added",
      subject: "Drop 06",
      tail: [`D06${NB}– `, { stored: "MÂY", lang: "vi" }, " · ", { stored: "Áo khoác dù", lang: "vi" }],
    });
  });
});

describe("the schedule, the filters and the search in English", () => {
  it("writes the drops opening and closing on their own", () => {
    const rows = scheduleRows(FIXTURE_CATALOG, FIXTURE_CATALOG.drops, FIXTURE_CATALOG.products, NOW, "en");
    const opened = rows.find((r) => r.id === "open-5")!;
    expect(opened).toMatchObject({ action: "Drop opened", detail: "at the set opening time", subject: "Drop 05" });
    expect(opened.tail).toMatch(/^\d+ styles · [\d,]+ units cut$/);
    const closed = rows.find((r) => r.id === "close-4")!;
    expect(closed).toMatchObject({ action: "Drop closed", detail: "at the set closing time", subject: "Drop 04" });
    expect(closed.tail).toMatch(/^\d+ \/ \d+ sold · \d+ left$/);
  });

  it("names the filters in English and keeps the values the address reads", () => {
    expect(logFilters("en")).toEqual([
      { value: "all", label: "All" },
      { value: "order", label: "Orders" },
      { value: "stock", label: "Stock" },
      { value: "promo", label: "Discount codes" },
      { value: "drop", label: "Drops" },
      { value: "system", label: "System" },
    ]);
    expect(logFilters("vi")).toEqual(LOG_FILTERS);
    // The hand stays a Vietnamese key, which the filter reads in both languages.
    const row = rowEn(pressed({ actorRole: "system", actor: "", kind: "ORDER_EXPIRED" }));
    expect(inFilter("system", row)).toBe(true);
    expect(logAuthorLabel("Cửa hàng", "en")).toBe("Shop");
    expect(logAuthorLabel("Cửa hàng")).toBe("Cửa hàng");
  });

  it("searches the English words and the stored values alike", () => {
    const row = rowEn(pressed({ kind: "ORDER_NOTE", text: "gọi khách" }));
    expect(logHaystack(row)).toContain("internal note");
    expect(logHaystack(row)).toContain("nguyễn khả vy");
    expect(logHaystack(row)).toContain("gọi khách");
    expect(logStamp(AT, "en")).toBe(`18:52 · ${D(20, "Sep")}`);
  });
});
