import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG as C } from "@/data/fixture-catalog";
import { ORDERS } from "@/data/orders";
import {
  ADDRESS_LABELS,
  productId,
  type Favorite,
  type NotifySwitches,
  type Order,
  type OrderState,
  type OrderStatus,
  type PaymentMethod,
} from "@/data/types";
import { effectiveOrder } from "./customer-orders";
import { monthYear } from "./datetime";
import { DEMO_ACCOUNT_PASSWORD_LOCKED, DEMO_ACCOUNT_PASSWORD_LOCKED_TEXT } from "./demo-accounts";
import {
  ADDRESS_ANSWER_TEXT,
  ADDRESS_ERROR_TEXT,
  ADDRESS_LABEL_TEXT,
  FEED_STATE_LABEL,
  NO_FILTER,
  ORDER_PHASES,
  PHASES,
  addressLabelText,
  deliveryTitle,
  feedAddressErrors,
  feedStateLabel,
  noneLabel,
  orderPhaseLabel,
  paymentTitle,
  resultLabel,
  ticketNote,
  tileLabel,
} from "./feed-account";
import { inboxGroups, inboxItems, inboxTime, type InboxSources } from "./feed-inbox";
import {
  PASSWORD_CHANGED,
  PASSWORD_CHANGED_TEXT,
  PASSWORD_FAILED_TEXT,
  PASSWORD_WRONG,
  PASSWORD_WRONG_TEXT,
  SIZE_SLOT_TEXT,
  favAlert,
  memberSince,
  passwordSheetErrors,
  remindTile,
  savedStyles,
  sizeToast,
  wishCard,
  wishSizeLabel,
  wishStock,
} from "./feed-me";
import {
  EMAIL_TAKEN,
  EMAIL_TAKEN_TEXT,
  FORGOT_NOT_SENT,
  FORGOT_NOT_SENT_TEXT,
  SIGN_IN_WRONG,
  SIGN_IN_WRONG_TEXT,
  SIGN_SENTENCES,
  SIGN_TITLES,
  SIGN_UP_FAILED_TEXT,
  signErrors,
  signTitle,
} from "./feed-sign-in";
import { reword } from "./i18n";
import {
  PROFILE_FAILED,
  PROFILE_FAILED_TEXT,
  PROFILE_SAVED,
  PROFILE_SAVED_TEXT,
  PROFILE_SENTENCES,
  keepRefusal,
  validateProfile,
} from "./my-state";

/**
 * Round v6 slice E3a (QĐ-40): the English of what the account's screens print
 * — signing in and up, Tôi, the orders, one order, the address book, Hồ sơ,
 * Thông báo, Yêu thích — in the words of the user's glossary (`tasks/plan.md`,
 * "Thuật ngữ tiếng Anh"): Account, Sign in, Sign up, Saved, Notifications,
 * Drop 05, Basics, the order states, "N left", "1 Oct". The Vietnamese side is
 * pinned by each function's own test, untouched; these also check that asking
 * for Vietnamese by name gives what asking for nothing gives.
 */

const NBSP = " ";
/** An English day and its month, held together by a no-break space: "23 Sep". */
const D = (day: number, month: string) => `${day}${NBSP}${month}`;
const LONG_DASH = /[–—]/;
const VI_LETTERS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

/** The fixture's Số 05 sells 11–25/09, Số 06 opens 20:00 Friday 02/10. */
const OPEN = new Date("2026-09-21T19:02:00+07:00");
const BETWEEN = new Date("2026-09-28T19:02:00+07:00");
const LATER = new Date("2026-10-20T19:02:00+07:00");
const PLACED = "2026-09-21T19:02:00+07:00";

const product = (slug: string) => C.byId.get(productId(`p-${slug}`))!;
const fav = (slug: string, color: Favorite["color"]): Favorite => ({ productId: productId(`p-${slug}`), color, savedAt: null });

/** The mock's DH-1507, as `feed-account.test.ts` writes it. */
function order(status: OrderStatus, payment: PaymentMethod = "BANK_TRANSFER"): Order {
  return {
    code: "DH-1507" as Order["code"],
    customerId: "" as Order["customerId"],
    lines: [{ productId: productId("p-suong"), color: "moss", size: "L", qty: 1, unitPriceVnd: 1_450_000 }],
    status,
    payment,
    delivery: "STANDARD",
    shippingFeeVnd: 0,
    codFeeVnd: 0,
    discountVnd: 0,
    shipTo: { recipient: "Trần Minh Khoa", phone: "0938571204", provinceCode: "29", wardCode: "70101063", line: "12 Nguyễn Huệ" },
    email: null,
    note: "",
    placedAt: PLACED,
  };
}

describe("signing in and up, in English", () => {
  it("titles the three modes by the glossary", () => {
    expect(signTitle("in", "en")).toBe("Sign in");
    expect(signTitle("up", "en")).toBe("Sign up");
    expect(signTitle("forgot", "en")).toBe("Forgot password");
    for (const mode of ["in", "up", "forgot"] as const) expect(signTitle(mode, "vi")).toBe(SIGN_TITLES[mode]);
  });

  it("asks for each field, the checkout's English for a name and an email", () => {
    expect(signErrors("up", {}, "en")).toEqual({
      name: "Enter your full name",
      email: "Enter your email",
      password: "Passwords need at least 8 characters",
    });
    expect(signErrors("in", { email: "khong-hop-le", password: "" }, "en")).toEqual({
      email: "This email isn't valid",
      password: "Enter your password",
    });
    expect(signErrors("forgot", { email: "" }, "en")).toEqual({ email: "Enter your email" });
    expect(signErrors("up", { name: "An", email: "a@b.vn", password: "12345678" }, "en")).toEqual({});
    expect(signErrors("up", {}, "vi")).toEqual(signErrors("up", {}));
  });

  it("refuses a sign-in, a taken address and a failed sign-up in one line each", () => {
    expect(SIGN_IN_WRONG_TEXT).toEqual({ vi: SIGN_IN_WRONG, en: "Email or password is incorrect" });
    expect(EMAIL_TAKEN_TEXT).toEqual({ vi: EMAIL_TAKEN, en: "This email already has an account" });
    expect(SIGN_UP_FAILED_TEXT.en).toBe("Couldn't sign up with this email.");
  });

  it("ends the reset honestly in English too: nothing was sent, the feature is coming", () => {
    expect(FORGOT_NOT_SENT_TEXT.vi).toBe(FORGOT_NOT_SENT);
    const en = FORGOT_NOT_SENT_TEXT.en;
    expect(`${en.before}minhanh@email.com${en.after}`).toBe(
      "Couldn't send a reset link to minhanh@email.com. This feature is coming soon.",
    );
  });

  it("words a line already on screen again in the page's language, and leaves a rate limit's alone", () => {
    expect(reword("Email hoặc mật khẩu chưa đúng", "en", SIGN_SENTENCES)).toBe("Email or password is incorrect");
    expect(reword("This email already has an account", "vi", SIGN_SENTENCES)).toBe("Email này đã có tài khoản");
    expect(reword("Mật khẩu từ 8 ký tự", "en", SIGN_SENTENCES)).toBe("Passwords need at least 8 characters");
    const wait = "Quá nhiều lượt liên tiếp. Thử lại sau 3 phút.";
    expect(reword(wait, "en", SIGN_SENTENCES)).toBe(wait);
  });
});

describe("Tôi, in English", () => {
  it("says since when, as a month and its year held together", () => {
    expect(memberSince("2026-03-08T21:14:00+07:00", "en")).toBe(`Mar${NBSP}2026`);
    expect(memberSince("2026-03-08T21:14:00+07:00", "vi")).toBe(memberSince("2026-03-08T21:14:00+07:00"));
    expect(monthYear("2026-10-01T00:00:00+07:00", "en")).toBe(`Oct${NBSP}2026`);
    expect(monthYear("2026-10-01T00:00:00+07:00")).toBe("10/2026");
    expect(monthYear("not a date", "en")).toBe("");
  });

  it("names a saved colour running out, its name kept and the colour in English", () => {
    const saved = savedStyles(C, [fav("bui", "black"), fav("than", "navy")]);
    expect(favAlert(C, saved, OPEN, "en")).toBe("BỤI in black: 1 left");
    expect(favAlert(C, savedStyles(C, [fav("than", "navy")]), OPEN, "en")).toBe("THAN in navy: 3 left");
    expect(favAlert(C, saved, BETWEEN, "en")).toBeNull();
    expect(favAlert(C, saved, OPEN, "vi")).toBe(favAlert(C, saved, OPEN));
  });

  it("dates the reminder as the English date block does, or says why there is none", () => {
    expect(remindTile(C, [6], OPEN, "en")).toEqual({
      kind: "set",
      no: 6,
      title: "Drop 06 alert",
      dd: "2",
      mm: "Oct",
      line: "20:00 Fri, in the app",
    });
    expect(remindTile(C, [], OPEN, "en")).toEqual({ kind: "none", text: "No reminder set" });
    expect(remindTile(C, [6], LATER, "en")).toEqual({ kind: "none", text: "No new drop yet" });
    expect(remindTile(C, [6], OPEN, "vi")).toEqual(remindTile(C, [6], OPEN));
  });

  it("calls the two size rows Tops and Bottoms, and says a size picked or cleared", () => {
    expect(SIZE_SLOT_TEXT).toEqual({ top: { vi: "Áo", en: "Tops" }, bottom: { vi: "Quần", en: "Bottoms" } });
    expect(sizeToast("top", "L", "en")).toBe("Top size: L");
    expect(sizeToast("bottom", null, "en")).toBe("Bottom size cleared");
    expect(sizeToast("bottom", "M", "vi")).toBe(sizeToast("bottom", "M"));
  });
});

describe("the orders, in English", () => {
  it("names the six states by the glossary; a COD order before the call awaits confirmation", () => {
    const en: Record<OrderState, string> = {
      AWAITING_TRANSFER: "Awaiting transfer",
      RECEIVED: "Awaiting confirmation",
      PAID: "Paid",
      SHIPPING: "Shipping",
      DELIVERED: "Delivered",
      CANCELLED: "Cancelled",
    };
    for (const state of Object.keys(en) as OrderState[]) {
      expect(feedStateLabel(state, "en")).toBe(en[state]);
      expect(feedStateLabel(state)).toBe(FEED_STATE_LABEL[state]);
    }
  });

  it("names the phases and the empty combinations", () => {
    expect(PHASES.map((p) => orderPhaseLabel(p, "en"))).toEqual(["Ongoing", "Delivered", "Cancelled"]);
    expect(PHASES.map((p) => orderPhaseLabel(p))).toEqual(PHASES.map((p) => ORDER_PHASES[p]));
    expect(noneLabel({ phase: "active", group: 5 }, "en")).toBe("No ongoing Drop 05 orders");
    expect(noneLabel({ phase: "cancelled", group: "fixed" }, "en")).toBe("No cancelled Basics orders");
    expect(noneLabel({ phase: "all", group: 4 }, "en")).toBe("No Drop 04 orders");
    expect(noneLabel({ phase: "delivered", group: "all" }, "en")).toBe("No delivered orders");
    expect(resultLabel(3, NO_FILTER, "en")).toBe("3 orders");
    expect(resultLabel(1, NO_FILTER, "en")).toBe("1 order");
    expect(resultLabel(0, { phase: "delivered", group: "all" }, "en")).toBe("No delivered orders");
    expect(noneLabel({ phase: "active", group: 5 }, "vi")).toBe(noneLabel({ phase: "active", group: 5 }));
  });

  it("writes a ticket's note with an English reason and day", () => {
    expect(ticketNote(order({ state: "CANCELLED", cancelledAt: PLACED, reason: "khách huỷ" }), OPEN, "en")).toEqual({
      kind: "reason",
      text: "You cancelled",
    });
    expect(ticketNote(order({ state: "CANCELLED", cancelledAt: PLACED, reason: "Quá hạn chuyển khoản" }), OPEN, "en")).toEqual({
      kind: "reason",
      text: "Transfer overdue",
    });
    const delivered = order({ state: "DELIVERED", deliveredAt: "2026-09-16T10:02:00+07:00" });
    expect(ticketNote(delivered, OPEN, "en")).toEqual({ kind: "return", day: D(23, "Sep") });
    expect(ticketNote(delivered, OPEN, "vi")).toEqual(ticketNote(delivered, OPEN));
  });

  it("pays and delivers in the checkout's English", () => {
    expect(paymentTitle("BANK_TRANSFER", "en")).toBe("Bank transfer");
    expect(paymentTitle("COD", "en")).toBe(`Cash on delivery${NBSP}(COD)`);
    // The card's name for Stripe's test mode since slice B18 (QĐ-46, the user's words).
    expect(paymentTitle("CARD", "en")).toBe("Card (Visa, Mastercard)");
    expect(deliveryTitle("STANDARD", "en")).toBe("Standard delivery");
    expect(deliveryTitle("EXPRESS", "en")).toBe("Express city delivery");
    expect(paymentTitle("COD", "vi")).toBe(paymentTitle("COD"));
  });

  it("names a tile for a screen reader, the colour in English and the pieces counted", () => {
    expect(tileLabel("SƯƠNG", "moss", "L", 1, "en")).toBe("SƯƠNG, moss, size L");
    expect(tileLabel("KHÓI", "black", "M", 2, "en")).toBe("KHÓI, black, size M, 2 pieces");
    expect(tileLabel("PLAIN TEE", "white", "S", 1, "en")).toBe("PLAIN TEE, white, size S");
    expect(tileLabel("KHÓI", "black", "M", 2, "vi")).toBe(tileLabel("KHÓI", "black", "M", 2));
  });
});

describe("the address book, in English", () => {
  it("prints Home, Work, Other, and keeps the stored Vietnamese as the value", () => {
    expect(ADDRESS_LABELS.map((l) => addressLabelText(l, "en"))).toEqual(["Home", "Work", "Other"]);
    expect(ADDRESS_LABELS.map((l) => addressLabelText(l, "vi"))).toEqual([...ADDRESS_LABELS]);
    expect(ADDRESS_LABELS.map((l) => addressLabelText(l))).toEqual([...ADDRESS_LABELS]);
    // The keys are the stored values; a label the app does not know is printed as stored.
    expect(Object.keys(ADDRESS_LABEL_TEXT)).toEqual([...ADDRESS_LABELS]);
    expect(addressLabelText("nhà riêng", "en")).toBe("nhà riêng");
  });

  it("asks for each field in the checkout's English", () => {
    expect(
      feedAddressErrors({ recipient: "A", phone: "", provinceCode: "", wardCode: "", street: " " }, "en"),
    ).toEqual({
      recipient: "Enter the recipient's name",
      phone: "Enter a phone number",
      province: "Choose province / city",
      street: "Enter house number and street",
    });
    expect(feedAddressErrors({ recipient: "An", phone: "123", provinceCode: "29", wardCode: "", street: "1" }, "en")).toEqual({
      phone: "Phone numbers have 10 digits, starting with 0",
      ward: "Choose ward / commune",
    });
    const empty = { recipient: "", phone: "", provinceCode: "", wardCode: "", street: "" };
    expect(feedAddressErrors(empty, "vi")).toEqual(feedAddressErrors(empty));
    expect(ADDRESS_ERROR_TEXT.province.vi).toBe("Chọn tỉnh / thành");
  });

  it("says a write that did not happen in a short line, no full stop, as the Vietnamese", () => {
    expect(ADDRESS_ANSWER_TEXT).toEqual({
      notSaved: { vi: "Chưa lưu được địa chỉ", en: "Couldn't save the address" },
      notRemoved: { vi: "Chưa xoá được địa chỉ", en: "Couldn't delete the address" },
      notDefault: { vi: "Chưa đặt được mặc định", en: "Couldn't set the default" },
      notFound: { vi: "Không tìm thấy địa chỉ này", en: "Couldn't find this address" },
      notRestored: { vi: "Chưa hoàn tác được", en: "Couldn't undo" },
    });
  });
});

describe("Hồ sơ and the password sheet, in English", () => {
  it("checks the name and the phone in the checkout's English", () => {
    expect(validateProfile({ name: "A", phone: "0912-345-678" }, "en")).toEqual({
      name: "Enter your full name",
      phone: "Phone numbers have 10 digits, starting with 0",
    });
    expect(validateProfile({ name: "x".repeat(61), phone: "" }, "en")).toEqual({
      name: "Full names can have up to 60 characters",
      phone: "Enter a phone number",
    });
    expect(validateProfile({ name: "A", phone: "" }, "vi")).toEqual(validateProfile({ name: "A", phone: "" }));
  });

  it("says a save, and a save that failed", () => {
    expect(PROFILE_SAVED_TEXT).toEqual({ vi: PROFILE_SAVED, en: "Profile saved" });
    expect(PROFILE_FAILED_TEXT).toEqual({ vi: PROFILE_FAILED, en: "Couldn't save your profile. Try again in a few minutes." });
  });

  it("words a field's sentence again in the page's language", () => {
    expect(reword("Nhập họ và tên", "en", PROFILE_SENTENCES)).toBe("Enter your full name");
    expect(reword("Enter a phone number", "vi", PROFILE_SENTENCES)).toBe("Nhập số điện thoại");
  });

  it("checks the three password fields in English", () => {
    expect(passwordSheetErrors({ current: "", next: "1234567", again: "" }, "en")).toEqual({
      current: "Enter your current password",
      next: "The new password needs at least 8 characters",
      again: "The new passwords don't match",
    });
    const d = { current: "", next: "", again: "" };
    expect(passwordSheetErrors(d, "vi")).toEqual(passwordSheetErrors(d));
    expect(PASSWORD_WRONG_TEXT).toEqual({ vi: PASSWORD_WRONG, en: "The current password is incorrect" });
    expect(PASSWORD_CHANGED_TEXT).toEqual({ vi: PASSWORD_CHANGED, en: "Password changed" });
    expect(PASSWORD_FAILED_TEXT.vi).toBe("Chưa đổi được mật khẩu. Thử lại sau ít phút.");
  });

  it("says a shared demo account's lock in English, with the glossary's Sign up", () => {
    expect(DEMO_ACCOUNT_PASSWORD_LOCKED_TEXT.vi).toBe(DEMO_ACCOUNT_PASSWORD_LOCKED);
    expect(DEMO_ACCOUNT_PASSWORD_LOCKED_TEXT.en).toBe(
      "Demo accounts are shared, so their password can't be changed. Sign up for your own account to try this.",
    );
  });

  it("refuses a keep write in the language it is handed", () => {
    expect(keepRefusal("SIGNED_OUT", "favorites", undefined, "en")).toEqual({
      ok: false,
      reason: "SIGNED_OUT",
      message: "Sign in to save styles",
    });
    expect(keepRefusal("RATE_LIMITED", "favorites", "Too many tries in a row. Try again in 1 minute.", "en").message).toBe(
      "Too many tries in a row. Try again in 1 minute.",
    );
    expect(keepRefusal("INVALID", "sizes", undefined, "vi")).toEqual(keepRefusal("INVALID", "sizes"));
  });
});

describe("Yêu thích, in English", () => {
  it("prints the saved colour's stock as every English stock line does", () => {
    expect(wishStock(C, product("than"), "navy", BETWEEN, "en")).toEqual({ kind: "closed", day: D(25, "Sep") });
    const bui = { ...product("bui"), stock: { black: { S: 0, M: 0, L: 0, XL: 0 }, grey: { S: 0, M: 0, L: 0, XL: 1 } } };
    expect(wishStock(C, bui, "black", OPEN, "en")).toEqual({ kind: "gone", color: "black" });
    expect(wishStock(C, product("bui"), "black", OPEN, "en")).toEqual({ kind: "left", n: 1, low: true });
    expect(wishStock(C, product("than"), "navy", BETWEEN, "vi")).toEqual(wishStock(C, product("than"), "navy", BETWEEN));
  });

  it("hands the language to the card's stock line", () => {
    const [than] = savedStyles(C, [fav("than", "navy")]).map((s) => wishCard(C, s, BETWEEN, "en"));
    expect(than).toMatchObject({ kind: "style", stock: { kind: "closed", day: D(25, "Sep") } });
  });

  it("names each size for a screen reader", () => {
    expect(wishSizeLabel("L", 5, "en")).toBe("Size L");
    expect(wishSizeLabel("M", 2, "en")).toBe("Size M, 2 left");
    expect(wishSizeLabel("S", 0, "en")).toBe("Size S, sold out");
    expect(wishSizeLabel("S", 0, "vi")).toBe(wishSizeLabel("S", 0));
  });
});

describe("Thông báo, in English", () => {
  const ANCHOR = new Date("2026-09-20T18:50:00+07:00");
  const ALL_ON: NotifySwitches = { order: true, drop: true, wishlist: true, promo: true };
  const MINE = ORDERS.filter((o) => o.customerId === "c-minhanh");
  const sources = (now: Date): InboxSources => ({
    catalog: C,
    orders: MINE.map((o) => effectiveOrder(o, now)),
    favorites: [fav("bui", "black"), fav("than", "navy"), fav("muoi", "grey"), fav("hoodie-tron", "grey")],
    reminders: [6],
    joinedAt: "2026-03-08T21:14:00+07:00",
    now,
  });

  it("writes every row in English, the codes, names and numbers kept", () => {
    const rows = inboxItems(sources(ANCHOR), "en");
    const by = (title: string) => rows.find((r) => r.title === title);
    expect(by("DH-2430 awaiting transfer")).toMatchObject({ body: `Due 19:50, Monday ${D(21, "Sep")}` });
    expect(by("Payment received for DH-2422")).toMatchObject({ body: "" });
    expect(by("DH-2422 is on its way")).toMatchObject({ body: "Tracking no. VD-8842-1907" });
    expect(by("DH-2416 delivered")).toMatchObject({ body: `Returns until ${D(23, "Sep")}` });
    expect(by("Drop 05 is live")).toMatchObject({ body: "10 styles, 181 pieces" });
    expect(by("Drop 06 reveals SỎI and NGÓI")).toMatchObject({ body: `Opens 20:00, Friday ${D(2, "Oct")}` });
    expect(by("BỤI in black: 1 left")).toMatchObject({ body: "Size L" });
    expect(by("THAN in navy: 3 left")).toMatchObject({ body: "Size M L XL" });
  });

  it("writes the closing, closed, code and reminder rows in English", () => {
    const late = inboxItems(sources(new Date("2026-09-26T09:00:00+07:00")), "en");
    expect(late.find((r) => r.title === "Drop 05: 2 days left")).toMatchObject({ body: `Closes 20:00, Friday ${D(25, "Sep")}` });
    expect(late.find((r) => r.title === "Drop 05 has closed")).toMatchObject({ body: "108/181 pieces sold" });
    const codes = inboxItems(sources(new Date("2026-09-24T09:00:00+07:00")), "en").filter((r) => r.kind === "promo");
    expect(codes.map((r) => [r.title, r.body])).toEqual([
      ["Code DOT05 expires soon", `20:00, Friday ${D(25, "Sep")}`],
      ["Code CHAOBAN expires soon", `20:00, Friday ${D(25, "Sep")}`],
      ["Code FREESHIP expires soon", `20:00, Friday ${D(25, "Sep")}`],
    ]);
    const reminder = inboxItems(sources(new Date("2026-09-30T19:00:00+07:00")), "en").find((r) => r.kind === "reminder");
    expect(reminder).toMatchObject({ title: "Drop 06 opens in 2 days", body: `20:00, Friday ${D(2, "Oct")}` });
  });

  it("keys every row by its Vietnamese title, so a row read in one language stays read in the other", () => {
    for (const now of [ANCHOR, new Date("2026-09-24T09:00:00+07:00"), new Date("2026-09-30T19:00:00+07:00")]) {
      const vi = inboxItems(sources(now), "vi");
      const en = inboxItems(sources(now), "en");
      expect(en.map((r) => r.key)).toEqual(vi.map((r) => r.key));
      expect(en.map((r) => [r.at, r.kind, r.href])).toEqual(vi.map((r) => [r.at, r.kind, r.href]));
      expect(vi).toEqual(inboxItems(sources(now)));
    }
  });

  it("leaves no Vietnamese in an English row but a style's or a teaser's own name", () => {
    const names = /BỤI|THAN|MUỐI|SỎI|NGÓI/g;
    for (const now of [ANCHOR, new Date("2026-09-26T09:00:00+07:00"), new Date("2026-09-30T19:00:00+07:00")]) {
      for (const r of inboxItems(sources(now), "en")) {
        expect(r.title.replace(names, ""), r.title).not.toMatch(VI_LETTERS);
        expect(r.body, r.body).not.toMatch(VI_LETTERS);
        expect(`${r.title} ${r.body}`).not.toMatch(LONG_DASH);
      }
    }
  });

  it("titles the groups and writes the time in English", () => {
    const rows = inboxItems(sources(ANCHOR), "en");
    expect(inboxGroups(rows, ANCHOR, "en").map((g) => g.title)).toEqual(["This week", "Earlier"]);
    expect(inboxGroups(rows, new Date("2026-09-19T21:00:00+07:00"), "en")[0]?.title).toBe("Today");
    expect(inboxTime("2026-09-20T09:30:00+07:00", 0, "en")).toBe("09:30");
    expect(inboxTime("2026-09-16T10:02:00+07:00", 1, "en")).toBe(D(16, "Sep"));
    expect(inboxTime("2026-09-16T10:02:00+07:00", 1, "vi")).toBe(inboxTime("2026-09-16T10:02:00+07:00", 1));
    expect(ALL_ON.order).toBe(true);
  });
});
