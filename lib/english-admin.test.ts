import { describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { ORDERS } from "@/data/orders";
import type { Order } from "@/data/types";
import { stockAlerts } from "./admin-metrics";
import { adminDoneMessage, bulkPaidMessage, type AdminOrder } from "./admin-orders";
import { guestSuffix, orderCustomer, orderItemsLabel, orderItemsLang, orderNote, queueRows } from "./admin-rows";
import { isVietnamese, joinPhrases, phrase, plainText, stored, storedLang } from "./admin-text";
import { timelineOf, timelineSteps } from "./admin-timeline";
import { carrierLabel, carrierPiece } from "./carrier";
import { customerFacts, issuesLabel, tagReason, untaggedReason } from "./customer-tags";
import { rangeLabel, sinceLabel } from "./datetime";
import { closesInLabel, opensInLabel } from "./drop";
import { STOCK_REASONS, isKnownStockReason, stockReasonLabel } from "./inventory-adjust";
import { issueCode, styleName, stylePrefix } from "./lexicon";
import { compactVnd } from "./money";
import { adminPaymentLabel, PAYMENT_LABEL } from "./order-labels";
import { internalNotes } from "./order-notes";
import { ordersCsvName, ordersCsvRows } from "./orders-csv";
import { DELIVERY_OPTIONS } from "./shipping";

/**
 * Round v6 slice E4: the back office's orders and people in English — the
 * helpers behind the overview, the log, the order book, one order, the slips,
 * the customers. Every Vietnamese side these functions had is pinned by their
 * own tests (`admin-rows.test.ts`, `admin-timeline.test.ts`,
 * `order-notes.test.ts`, `customer-tags.test.ts`, …), untouched by this slice;
 * here is what they say in English.
 */

const NB = " ";
/** "22 Sep": an English day, held to its month by a no-break space (`lib/datetime.ts`). */
const D = (day: number, month: string) => `${day}${NB}${month}`;

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
const byCode = (code: string) => BOOK.find((o) => String(o.code) === code)!;

/** Inside issue 05's window, after every order in the book: the sample's own anchor. */
const NOW = new Date("2026-09-20T18:50:00+07:00");

describe("compactVnd in English: M for a million, a decimal point", () => {
  it("writes a figure the English way and keeps k", () => {
    expect(compactVnd(18_816_000, "en")).toBe("18.8M₫");
    expect(compactVnd(1_000_000, "en")).toBe("1M₫");
    expect(compactVnd(1_018_286, "en")).toBe("1M₫");
    expect(compactVnd(1_250_000, "en")).toBe("1.2M₫");
    expect(compactVnd(999_960, "en")).toBe("999.9k₫");
    expect(compactVnd(1_500, "en")).toBe("1.5k₫");
    expect(compactVnd(950, "en")).toBe("950₫");
    expect(compactVnd(-2_400_000, "en")).toBe("-2.4M₫");
  });

  it("leaves the Vietnamese as it was, and ignores a second argument that is not a language", () => {
    expect(compactVnd(18_816_000)).toBe("18,8tr₫");
    expect(compactVnd(18_816_000, "vi")).toBe("18,8tr₫");
    // A chart may call its formatter with an index after the value.
    expect(compactVnd(18_816_000, 3 as unknown as "vi")).toBe("18,8tr₫");
  });
});

describe("the clock's words in English", () => {
  const PAID = "2026-09-19T07:52:00+07:00";
  it("says how long ago in the same two units, each noun by its count", () => {
    expect(sinceLabel(PAID, NOW, "en")).toBe("1 day 10 hours ago");
    expect(sinceLabel(PAID, new Date("2026-09-19T08:53:00+07:00"), "en")).toBe("1 hour 1 minute ago");
    expect(sinceLabel(PAID, new Date("2026-09-19T09:52:00+07:00"), "en")).toBe("2 hours 0 minutes ago");
    expect(sinceLabel(PAID, new Date("2026-09-19T07:53:00+07:00"), "en")).toBe("1 minute ago");
    expect(sinceLabel(PAID, new Date(PAID), "en")).toBe("just now");
    expect(sinceLabel(PAID, new Date("2026-09-21T08:52:00+07:00"), "en")).toBe("2 days 1 hour ago");
  });

  it("writes a window the English way, held on one line", () => {
    expect(rangeLabel("2026-09-21T10:00:00+07:00", "2026-09-23T10:00:00+07:00", "en")).toBe(
      `${D(21, "Sep")}${NB}–⁠${NB}${D(23, "Sep")}${NB}2026`,
    );
    expect(rangeLabel("2026-09-21T10:00:00+07:00", "2026-09-23T10:00:00+07:00")).toBe(`21/09${NB}–⁠${NB}23/09/2026`);
  });

  it("counts down to a drop's closing and opening in English", () => {
    const at = new Date("2026-09-20T18:50:00+07:00");
    expect(closesInLabel("2026-09-25T20:00:00+07:00", at, "en")).toBe("closes in 5 days 1 hour");
    expect(closesInLabel("2026-09-20T23:59:00+07:00", at, "en")).toBe("closes in 5 hours 9 minutes");
    expect(closesInLabel("2026-09-20T19:01:00+07:00", at, "en")).toBe("closes in 11 minutes");
    expect(closesInLabel("2026-09-20T18:00:00+07:00", at, "en")).toBe("closed");
    expect(opensInLabel("2026-09-22T19:50:00+07:00", at, "en")).toBe("opens in 2 days 1 hour");
    expect(opensInLabel("2026-09-20T18:00:00+07:00", at, "en")).toBe("live");
    expect(closesInLabel("2026-09-25T20:00:00+07:00", at)).toBe("đóng sau 5 ngày 1 giờ");
  });
});

describe("an issue's code in English: D for Drop", () => {
  it("writes D05, with the same no-break space before the dash", () => {
    expect(issueCode(5, "en")).toBe("D05");
    expect(stylePrefix(6, "en")).toBe(`D06${NB}–`);
    expect(styleName("KHÓI", 5, "en")).toBe(`D05${NB}– KHÓI`);
    expect(styleName("PLAIN TEE", null, "en")).toBe("PLAIN TEE");
  });

  it("keeps S05 in Vietnamese and in every address", () => {
    expect(issueCode(5)).toBe("S05");
    expect(styleName("KHÓI", 5)).toBe(`S05${NB}– KHÓI`);
    expect(FIXTURE_CATALOG.bySlug.get("s05-khoi")).toBeDefined();
  });
});

describe("the back office's ways of paying", () => {
  it("names them in the glossary's admin words, COD by its short name", () => {
    expect(adminPaymentLabel("BANK_TRANSFER", "en")).toBe("Bank transfer");
    expect(adminPaymentLabel("CARD", "en")).toBe("Card");
    expect(adminPaymentLabel("COD", "en")).toBe("COD");
    for (const m of ["BANK_TRANSFER", "CARD", "COD"] as const) expect(adminPaymentLabel(m)).toBe(PAYMENT_LABEL[m]);
  });
});

describe("the carrier: a table keyed by the stored Vietnamese", () => {
  it("translates both services the shop sells, by the checkout's English", () => {
    const [standard, express] = DELIVERY_OPTIONS;
    expect(carrierLabel(standard!.label, "en")).toBe("Standard delivery · 2–4 days");
    expect(carrierLabel(express!.label, "en")).toBe("Express city delivery · 24 hours");
  });

  it("finds a stored label written another way: case, spaces, decomposed marks", () => {
    expect(carrierLabel("  GIAO TIÊU CHUẨN · 2–4 NGÀY ", "en")).toBe("Standard delivery · 2–4 days");
    expect(carrierLabel("Giao nhanh nội thành · 24 giờ".normalize("NFD"), "en")).toBe("Express city delivery · 24 hours");
  });

  it("prints one it does not know as stored, and marks it when it is Vietnamese", () => {
    expect(carrierLabel("Giao hàng tiết kiệm", "en")).toBe("Giao hàng tiết kiệm");
    expect(carrierPiece("Giao hàng tiết kiệm", "en")).toEqual({ stored: "Giao hàng tiết kiệm", lang: "vi" });
    expect(carrierPiece("GHN Express", "en")).toBe("GHN Express");
    expect(carrierLabel(DELIVERY_OPTIONS[0]!.label)).toBe(DELIVERY_OPTIONS[0]!.label);
  });
});

describe("the stock reasons in English", () => {
  it("translates every reason the database accepts", () => {
    expect(STOCK_REASONS.map((r) => stockReasonLabel(r, "en"))).toEqual([
      "Returned",
      "Stocktake mismatch",
      "Damaged",
      "Other",
      "Style edit",
      "Restock",
    ]);
    expect(STOCK_REASONS.every(isKnownStockReason)).toBe(true);
    expect(stockReasonLabel("hàng trả về", "en")).toBe("Returned");
    expect(stockReasonLabel("Lý do lạ", "en")).toBe("Lý do lạ");
    expect(isKnownStockReason("Lý do lạ")).toBe(false);
    expect(stockReasonLabel("Hư hỏng")).toBe("Hư hỏng");
  });
});

describe("a phrase: the code's words around values printed as stored", () => {
  it("is one string on a Vietnamese page, and when nothing stored is Vietnamese", () => {
    expect(phrase("DH-2431 · ", stored("Nguyễn Khả Vy", "vi"))).toBe("DH-2431 · Nguyễn Khả Vy");
    expect(phrase("DH-2431 · ", stored("John Smith", "en"))).toBe("DH-2431 · John Smith");
  });

  it("marks a Vietnamese value on an English page", () => {
    const p = phrase("DH-2431 · ", stored("Nguyễn Khả Vy", "en"));
    expect(p).toEqual(["DH-2431 · ", { stored: "Nguyễn Khả Vy", lang: "vi" }]);
    expect(plainText(p)).toBe("DH-2431 · Nguyễn Khả Vy");
    expect(plainText(joinPhrases([p, "+2 units"], " · "))).toBe("DH-2431 · Nguyễn Khả Vy · +2 units");
  });

  it("tells Vietnamese by its letters", () => {
    expect(isVietnamese("gọi khách")).toBe(true);
    expect(isVietnamese("Đà Lạt")).toBe(true);
    expect(isVietnamese("call the customer")).toBe(false);
    expect(storedLang("gọi khách", "en")).toBe("vi");
    expect(storedLang("gọi khách", "vi")).toBeUndefined();
    expect(storedLang("VNP-2429-01", "en")).toBeUndefined();
  });
});

describe("the order book's rows in English", () => {
  it("names a guest's order with the English suffix, the name as stored", () => {
    const guest: AdminOrder = { ...byCode("DH-2431"), owner: null };
    expect(orderCustomer(guest, "en")).toBe(`${guest.shipTo.recipient} · guest`);
    expect(guestSuffix("en")).toBe("guest");
    expect(orderCustomer(byCode("DH-2431"), "en")).toBe("Nguyễn Khả Vy");
  });

  it("lists the items with the English code, a fixed style by its English name", () => {
    expect(orderItemsLabel(FIXTURE_CATALOG, byCode("DH-2431"), "en")).toBe(`D05${NB}–⁠${NB}CÁT${NB}×1`);
    const mixed: Order = {
      ...byCode("DH-2431"),
      lines: [
        { ...byCode("DH-2431").lines[0]!, qty: 2 },
        { ...byCode("DH-2431").lines[0]!, productId: "p-ao-thun-tron" as Order["lines"][number]["productId"], qty: 1 },
      ],
    };
    expect(orderItemsLabel(FIXTURE_CATALOG, mixed, "en")).toBe(`D05${NB}–⁠${NB}CÁT${NB}×2, PLAIN TEE${NB}×1`);
    // The list is said in Vietnamese only when every name in it is.
    expect(orderItemsLang(FIXTURE_CATALOG, byCode("DH-2431"), "en")).toBe("vi");
    expect(orderItemsLang(FIXTURE_CATALOG, mixed, "en")).toBeUndefined();
    expect(orderItemsLang(FIXTURE_CATALOG, byCode("DH-2431"), "vi")).toBeUndefined();
  });

  it("says what each waiting order waits for", () => {
    // "giờ · ngày", the back office's one way of writing a moment (round v6 slice R2, G3).
    expect(orderNote(byCode("DH-2431"), NOW, "en")).toEqual({ text: `due 08:05 · ${D(22, "Sep")}`, late: false });
    expect(orderNote(byCode("DH-2429"), NOW, "en")).toEqual({ text: `not handed over · 1${NB}day`, late: false });
    expect(orderNote(byCode("DH-2427"), NOW, "en")).toEqual({ text: `not handed over · 2${NB}days`, late: true });
    expect(orderNote(byCode("DH-2426"), NOW, "en")).toEqual({ text: "VNP-8842377", late: false });
    const cod: Order = { ...byCode("DH-2431"), payment: "COD", status: { state: "RECEIVED" } };
    expect(orderNote(cod, new Date("2026-09-20T09:00:00+07:00"), "en")).toEqual({ text: "not handed over", late: false });
    // A card order waits for a card payment since slice B18, not a transfer.
    const card: Order = { ...byCode("DH-2431"), payment: "CARD", status: { state: "RECEIVED" } };
    expect(orderNote(card, NOW, "en")).toEqual({ text: "awaiting card payment", late: false });
  });

  it("builds the overview's queue in English", () => {
    const rows = queueRows(FIXTURE_CATALOG, BOOK, NOW, "en");
    const first = rows.find((r) => r.code === "DH-2431")!;
    expect(first.standing).toBe("Awaiting transfer");
    // G1 and G2 (round v6 slice R2): every moment "giờ · ngày".
    expect(first.due).toBe(`due 08:05 · ${D(22, "Sep")}`);
    expect(first.items).toBe(`D05${NB}–⁠${NB}CÁT${NB}×1`);
    const late = rows.find((r) => r.code === "DH-2427")!;
    expect(late.standing).toBe(`Paid 20:41 · ${D(17, "Sep")} · not handed over`);
    expect(late.due).toBe(`2${NB}days`);
    expect(late.late).toBe(true);
    // A card order waiting for its money is Stripe's to confirm since slice B18: not in the shop's queue.
    const card: AdminOrder = { ...byCode("DH-2431"), payment: "CARD" };
    expect(queueRows(FIXTURE_CATALOG, [card], NOW, "en")).toEqual([]);
    const cod: AdminOrder = { ...byCode("DH-2431"), payment: "COD", status: { state: "RECEIVED" } };
    const codRow = queueRows(FIXTURE_CATALOG, [cod], new Date("2026-09-23T09:00:00+07:00"), "en")[0]!;
    expect(codRow.standing).toBe(`Order received 08:05 · ${D(20, "Sep")} · COD, collect on delivery`);
    expect(codRow.due).toBe(`3${NB}days`);
    expect(codRow.action).toBe("HAND_OVER");
  });

  it("keeps the Vietnamese queue, its moments written \"giờ · ngày\" since round v6 slice R2", () => {
    const late = queueRows(FIXTURE_CATALOG, BOOK, NOW).find((r) => r.code === "DH-2427")!;
    expect(late.standing).toBe("Đã thanh toán 20:41 · 17/09 · chưa bàn giao");
    expect(late.due).toBe(`2${NB}ngày`);
  });
});

describe("the toasts of the order moves in English", () => {
  it("says how many orders moved", () => {
    expect(bulkPaidMessage(3, 0, "en")).toBe("3 orders → paid · saved");
    expect(bulkPaidMessage(1, 2, "en")).toBe("1 order → paid · saved · 2 orders couldn't change, reload to check");
    expect(bulkPaidMessage(0, 1, "en")).toBe("No order marked as paid · 1 order no longer awaiting payment");
    expect(bulkPaidMessage(3, 0)).toBe("3 đơn → đã thanh toán · đã lưu");
  });

  it("names each move that went through, the reason by the shop's table", () => {
    expect(adminDoneMessage("MARK_PAID", "DH-2431", "en")).toBe("DH-2431 → paid · saved");
    expect(adminDoneMessage("HAND_OVER", "DH-2429", "en", { tracking: "VNP-2429-01" })).toBe(
      "DH-2429 → shipping · VNP-2429-01 · the customer sees this number in Track an order and Orders",
    );
    expect(adminDoneMessage("MARK_DELIVERED", "DH-2426", "en")).toBe("DH-2426 → delivered · saved");
    expect(adminDoneMessage("CANCEL", "DH-2428", "en", { reason: "Khách đổi ý" })).toBe(
      "DH-2428 cancelled · reason: change of mind · items back in stock",
    );
    expect(adminDoneMessage("NOTE", "DH-2429", "en")).toBe("Note added · saved");
    expect(adminDoneMessage("EDIT_ADDRESS", "DH-2431", "en")).toBe("Delivery address of DH-2431 changed · saved");
  });

  it("keeps every Vietnamese sentence the actions said", () => {
    expect(adminDoneMessage("MARK_PAID", "DH-2431")).toBe("DH-2431 → đã thanh toán · đã lưu");
    expect(adminDoneMessage("HAND_OVER", "DH-2429", "vi", { tracking: "VNP-2429-01" })).toBe(
      "DH-2429 → đang giao · VNP-2429-01 · khách thấy mã này ở tra cứu đơn và Đơn hàng",
    );
    expect(adminDoneMessage("MARK_DELIVERED", "DH-2426")).toBe("DH-2426 → đã giao · đã lưu");
    expect(adminDoneMessage("CANCEL", "DH-2428", "vi", { reason: "Khách đổi ý" })).toBe(
      "DH-2428 đã huỷ · lý do: khách đổi ý · hàng về kệ",
    );
    expect(adminDoneMessage("NOTE", "DH-2429")).toBe("Đã thêm ghi chú · đã lưu");
    expect(adminDoneMessage("EDIT_ADDRESS", "DH-2431")).toBe("Đã sửa địa chỉ giao DH-2431 · đã lưu");
  });
});

describe("an order's timeline in English", () => {
  const titles = (o: Order, at: Date = NOW, carrier?: string) => timelineOf(o, at, carrier, "en").map((m) => m.title);

  it("names the milestones in the glossary's words", () => {
    expect(titles(byCode("DH-2431"))).toEqual(["Order received", "Awaiting transfer", "Awaiting handover", "Shipping", "Delivered"]);
    expect(timelineOf(byCode("DH-2431"), NOW, undefined, "en")[1]!.detail).toBe(`due 08:05 · ${D(22, "Sep")}`);
    expect(timelineOf(byCode("DH-2431"), NOW, undefined, "en")[4]!.detail).toBe("2–4 days");
    expect(titles(byCode("DH-2429"))).toEqual(["Order received", "Paid", "Awaiting handover", "Shipping", "Delivered"]);
    expect(timelineOf(byCode("DH-2429"), NOW, undefined, "en")[2]!.detail).toBe(
      "1 day 10 hours ago · target: hand over within 1 day of payment",
    );
    expect(titles(byCode("DH-2423"))).toEqual(["Order received", "Paid", "Handed over", "Shipping", "Delivered"]);
  });

  it("names the carrier by the English table, and a cancel reason by the shop's", () => {
    const shipping = timelineOf(byCode("DH-2426"), NOW, DELIVERY_OPTIONS[0]!.label, "en");
    expect(shipping[shipping.length - 2]!.detail).toBe(`08:05 · ${D(18, "Sep")} · Standard delivery · 2–4 days · VNP-8842377`);
    expect(titles(byCode("DH-2418"))).toEqual(["Order received", "Cancelled · Change of mind"]);
    expect(titles(byCode("DH-2310"))).toEqual(["Order received", "Cancelled · Transfer overdue"]);
    expect(titles(byCode("DH-2313"))).toEqual(["Order received", "Cancelled · Transfer overdue"]);
  });

  it("draws a late milestone as the Stepper's error, in English too", () => {
    const { steps, current } = timelineSteps(timelineOf(byCode("DH-2427"), NOW, undefined, "en"));
    expect(steps[current]!.label).toBe("Awaiting handover");
    expect(steps[current]!.error).toBe("2 days 22 hours ago · target: hand over within 1 day of payment");
  });
});

describe("an order's notes in English", () => {
  const base = { at: "2026-09-20T09:00:00+07:00", actor: "quanly@email.com", code: "DH-2429" };
  const order = byCode("DH-2429");

  it("translates what the system wrote, and names the hand", () => {
    const notes = internalNotes(
      [
        { ...base, id: 1, actorRole: "system", actor: "", kind: "ORDER_PAID", from: "AWAITING_TRANSFER" },
        { ...base, id: 2, actorRole: "admin", kind: "ORDER_SHIPPED", from: "PAID", carrier: DELIVERY_OPTIONS[1]!.label, trackingCode: "VNP-1" },
        { ...base, id: 3, actorRole: "admin", kind: "ORDER_DELIVERED" },
        { ...base, id: 4, actorRole: "customer", kind: "ORDER_CANCELLED_BY_CUSTOMER", from: "AWAITING_TRANSFER" },
        { ...base, id: 5, actorRole: "system", actor: "", kind: "ORDER_EXPIRED" },
      ],
      order,
      "en",
    );
    expect(notes.map((n) => [plainText(n.text), n.author])).toEqual([
      ["Transfer matched reference DH2429 · 1,272,000₫", ""],
      ["Handed over · Express city delivery · 24 hours · tracking no. VNP-1.", ""],
      ["The customer received the order · marked by hand.", ""],
      ["The customer cancelled · unpaid, items back in stock.", "Customer"],
      ["Order cancelled · reason: transfer overdue.", ""],
    ]);
  });

  it("prints what somebody typed as stored, marked when it is Vietnamese", () => {
    const notes = internalNotes(
      [
        { ...base, id: 1, actorRole: "admin", kind: "ORDER_NOTE", text: "gọi khách trước khi giao" },
        { ...base, id: 2, actorRole: "admin", kind: "ORDER_NOTE", text: "call first" },
        { ...base, id: 3, actorRole: "admin", kind: "ORDER_CANCELLED", from: "PAID", reason: "Hết hàng thật", note: "hàng lỗi" },
        {
          ...base,
          id: 4,
          actorRole: "admin",
          kind: "ORDER_ADDRESS_EDITED",
          before: order.shipTo,
          after: { ...order.shipTo, line: "47 Trần Hưng Đạo" },
          reason: "khách nhắn đổi số nhà",
        },
      ],
      order,
      "en",
    );
    expect(notes[0]).toMatchObject({ text: [{ stored: "gọi khách trước khi giao", lang: "vi" }], author: "Shop" });
    expect(notes[1]).toMatchObject({ text: "call first", author: "Shop" });
    expect(plainText(notes[2]!.text)).toBe("Order cancelled · reason: out of stock.");
    expect(notes[3]).toMatchObject({ text: [{ stored: "hàng lỗi", lang: "vi" }], author: "Shop" });
    expect(notes[4]!.text).toEqual(["Delivery address changed · reason: ", { stored: "khách nhắn đổi số nhà", lang: "vi" }]);
  });

  it("prints a cancel reason the shop does not offer as stored", () => {
    const notes = internalNotes(
      [{ ...base, id: 1, actorRole: "admin", kind: "ORDER_CANCELLED", from: "PAID", reason: "khách đi nước ngoài", note: "" }],
      order,
      "en",
    );
    expect(notes[0]!.text).toEqual(["Order cancelled · reason: ", { stored: "khách đi nước ngoài", lang: "vi" }, "."]);
  });
});

describe("the customer labels in English", () => {
  const ordersOf = (handle: string) => BOOK.filter((o) => o.owner?.handle === handle);

  it("labels and explains a returning customer", () => {
    const facts = customerFacts(FIXTURE_CATALOG, ordersOf("c-minhanh"), 5, NOW, "en");
    expect(facts.tag?.key).toBeDefined();
    const vi = customerFacts(FIXTURE_CATALOG, ordersOf("c-minhanh"), 5, NOW);
    expect(facts.tag?.key).toBe(vi.tag?.key);
    if (facts.tag?.key === "returning") {
      expect(facts.tag.label).toBe("returning");
      expect(tagReason("returning", facts, 5, "en")).toBe(`${facts.booked.length} paid orders`);
    }
    if (facts.tag?.key === "loyal") {
      expect(facts.tag.label).toBe(`${facts.streak} drops in a row`);
      expect(tagReason("loyal", facts, 5, "en")).toBe(
        `bought in ${facts.streak} drops in a row (${issuesLabel(facts.issues, "en")})`,
      );
    }
  });

  it("names the issues, the new label's reason and the line for nobody yet", () => {
    expect(issuesLabel([3, 4, 5], "en")).toBe("Drop 03 · 04 · 05");
    expect(issuesLabel([], "en")).toBe("—");
    const newcomer = customerFacts(FIXTURE_CATALOG, [byCode("DH-2429")], 5, NOW, "en");
    expect(newcomer.tag).toEqual({ key: "new", label: "new", tone: "new" });
    expect(tagReason("new", newcomer, 5, "en")).toBe("first order DH-2429, in Drop 05");
    expect(untaggedReason(5, "en")).toBe("Not enough for a label yet: needs ≥ 2 paid orders, or a first order in Drop 05.");
    expect(untaggedReason(null, "en")).toBe(
      "Not enough for a label yet: needs ≥ 2 paid orders, or a first order in the live drop.",
    );
    const loyal = { ...newcomer, streak: 3, issues: [3, 4, 5] };
    expect(tagReason("loyal", loyal, 5, "en")).toBe("bought in 3 drops in a row (Drop 03 · 04 · 05)");
  });
});

describe("the low-stock notes in English", () => {
  it("says which sizes went, or how many are left", () => {
    const notes = stockAlerts(FIXTURE_CATALOG, 5, undefined, "en").map((a) => a.note);
    const vi = stockAlerts(FIXTURE_CATALOG, 5).map((a) => a.note);
    expect(notes).toHaveLength(vi.length);
    notes.forEach((note, i) => {
      if (vi[i] === "hết toàn bộ size") expect(note).toBe("every size sold out");
      else if (vi[i]!.startsWith("hết ")) expect(note).toBe(vi[i]!.replace(/^hết /, "out of "));
      else expect(note).toMatch(/^\d+ left, no size sold out yet$/);
    });
  });
});

describe("the orders file in English", () => {
  it("has English headers, states and ways of paying, and the same numbers", () => {
    const rows = ordersCsvRows(FIXTURE_CATALOG, [byCode("DH-2431"), byCode("DH-2423")], "en");
    expect(rows[0]).toEqual(["Order", "Customer", "Phone", "Placed", "Items", "Total (VND)", "Payment", "Status"]);
    expect(rows[1]).toEqual([
      "DH-2431",
      "Nguyễn Khả Vy",
      byCode("DH-2431").shipTo.phone,
      `${D(20, "Sep")} 08:05`,
      `D05${NB}–⁠${NB}CÁT${NB}×1`,
      rows[1]![5],
      "Bank transfer",
      "Awaiting transfer",
    ]);
    expect(typeof rows[1]![5]).toBe("number");
    expect(rows[2]![6]).toBe("COD");
    expect(rows[2]![7]).toBe("Delivered");
    expect(ordersCsvName("en")).toBe("orders.csv");
  });

  it("keeps the Vietnamese file as the screen wrote it", () => {
    const rows = ordersCsvRows(FIXTURE_CATALOG, [byCode("DH-2431")]);
    expect(rows[0]).toEqual(["Mã đơn", "Khách", "Điện thoại", "Thời gian", "Món", "Giá trị (VND)", "Thanh toán", "Trạng thái"]);
    expect(rows[1]![3]).toBe("20/09 08:05");
    expect(rows[1]![4]).toBe(`S05${NB}–⁠${NB}CÁT${NB}×1`);
    expect(rows[1]![6]).toBe("Chuyển khoản");
    expect(rows[1]![7]).toBe("Chờ chuyển khoản");
    expect(ordersCsvName()).toBe("don-hang.csv");
  });
});
