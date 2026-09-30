import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG as C } from "@/data/fixture-catalog";
import { productId, type Favorite, type MyState, type Order, type OrderStatus, type PaymentMethod } from "@/data/types";
import {
  EMPTY_MY_STATE,
  favAlert,
  favThumbs,
  firstWrongPassword,
  hasReminder,
  isSaved,
  meNow,
  memberSince,
  mySizeOf,
  passwordSheetErrors,
  remindTile,
  savedColor,
  savedStyles,
  sizeSlotOf,
  sizeToast,
  wishCard,
  wishSizeLabel,
  wishStock,
  withFavorite,
  withFavoriteBack,
  withNotify,
  withReminder,
  withSize,
  withoutFavorite,
} from "./feed-me";

/** The fixture's Số 05 sells 11–25/09, Số 06 opens 02/10. */
const OPEN = new Date("2026-09-21T19:02:00+07:00");
const BETWEEN = new Date("2026-09-28T19:02:00+07:00");
const LATER = new Date("2026-10-20T19:02:00+07:00");

const product = (slug: string) => C.byId.get(productId(`p-${slug}`))!;
const fav = (slug: string, color: Favorite["color"]): Favorite => ({ productId: productId(`p-${slug}`), color, savedAt: null });

/** The demo shopper's account after a reset (`data/customers.ts`: `CUSTOMER_STATES`). */
const DEMO: MyState = {
  favorites: [fav("bui", "black"), fav("than", "navy"), fav("muoi", "grey"), fav("hoodie-tron", "grey")],
  reminders: [6],
  sizes: { top: "L", bottom: "M" },
  notify: { order: true, drop: true, wishlist: true, promo: true },
};

describe("the state drawn before the server answers", () => {
  it("saves a style at the top of the list, in the colour shown, and leaves one already saved alone", () => {
    const s = withFavorite(DEMO, productId("p-khoi"), "cream");
    expect(s.favorites[0]).toEqual({ productId: "p-khoi", color: "cream", savedAt: null });
    expect(s.favorites).toHaveLength(5);
    expect(withFavorite(DEMO, productId("p-than"), "black")).toBe(DEMO);
  });

  it("unsaves, and puts a style back exactly where it stood", () => {
    const off = withoutFavorite(DEMO, productId("p-than"));
    expect(off.favorites.map((f) => f.productId)).toEqual(["p-bui", "p-muoi", "p-hoodie-tron"]);
    expect(withoutFavorite(off, productId("p-than"))).toBe(off);
    const back = withFavoriteBack(off, DEMO.favorites[1]!, 1);
    expect(back.favorites).toEqual(DEMO.favorites);
    // Out of range lands at the end; already there, nothing moves.
    expect(withFavoriteBack(off, DEMO.favorites[1]!, 99).favorites.at(-1)?.productId).toBe("p-than");
    expect(withFavoriteBack(DEMO, DEMO.favorites[1]!, 0)).toBe(DEMO);
  });

  it("reads saved and asked-about as nothing while signed out", () => {
    expect(isSaved(DEMO, productId("p-bui"))).toBe(true);
    expect(isSaved(DEMO, productId("p-khoi"))).toBe(false);
    expect(isSaved(null, productId("p-bui"))).toBe(false);
    expect(hasReminder(DEMO, 6)).toBe(true);
    expect(hasReminder(null, 6)).toBe(false);
  });

  it("keeps the reminders ascending, each issue once", () => {
    expect(withReminder(DEMO, 7, true).reminders).toEqual([6, 7]);
    expect(withReminder(withReminder(DEMO, 7, true), 6, true).reminders).toEqual([6, 7]);
    expect(withReminder(DEMO, 6, false).reminders).toEqual([]);
  });

  it("sets and clears one size of the two", () => {
    expect(withSize(DEMO, "top", "XL").sizes).toEqual({ top: "XL", bottom: "M" });
    expect(withSize(DEMO, "bottom", null).sizes).toEqual({ top: "L", bottom: null });
  });

  it("turns one notification switch at a time, the others as they were (slice 4a)", () => {
    expect(withNotify(DEMO, "wishlist", false).notify).toEqual({ order: true, drop: true, wishlist: false, promo: true });
    expect(withNotify(withNotify(DEMO, "order", false), "order", true).notify).toEqual(DEMO.notify);
    expect(withNotify(DEMO, "promo", false).favorites).toBe(DEMO.favorites);
  });

  it("starts empty for a signed-in account whose state could not be read", () => {
    expect(EMPTY_MY_STATE).toEqual({
      favorites: [],
      reminders: [],
      sizes: { top: null, bottom: null },
      notify: { order: true, drop: true, wishlist: true, promo: true },
    });
  });
});

describe("Size của tôi", () => {
  it("reads quần for trousers and áo for everything else, and nothing while signed out", () => {
    expect(sizeSlotOf(product("muoi"))).toBe("bottom");
    expect(sizeSlotOf(product("bui"))).toBe("top");
    expect(mySizeOf(DEMO, product("muoi"))).toBe("M");
    expect(mySizeOf(DEMO, product("than"))).toBe("L");
    expect(mySizeOf(null, product("than"))).toBeNull();
    expect(mySizeOf({ ...DEMO, sizes: { top: null, bottom: "M" } }, product("than"))).toBeNull();
  });

  it("says what was picked in Hồ sơ's words", () => {
    expect(sizeToast("top", "L")).toBe("Size áo: L");
    expect(sizeToast("bottom", "M")).toBe("Size quần: M");
    expect(sizeToast("top", null)).toBe("Đã bỏ size áo");
    expect(sizeToast("bottom", null)).toBe("Đã bỏ size quần");
  });
});

describe("Tôi", () => {
  it("prints the month the account was made", () => {
    expect(memberSince("2026-03-08T21:14:00+07:00")).toBe("03/2026");
  });

  const order = (code: string, status: OrderStatus, payment: PaymentMethod = "BANK_TRANSFER"): Order => ({
    code: code as Order["code"],
    customerId: "" as Order["customerId"],
    lines: [{ productId: productId("p-khoi"), color: "black", size: "M", qty: 1, unitPriceVnd: 390_000 }],
    status,
    payment,
    delivery: "STANDARD",
    shippingFeeVnd: 30_000,
    codFeeVnd: payment === "COD" ? 15_000 : 0,
    discountVnd: 0,
    shipTo: { recipient: "Trần Minh Anh", phone: "0912345678", provinceCode: "29", wardCode: "70101063", line: "24 Nguyễn Thị Minh Khai" },
    email: null,
    note: "",
    placedAt: "2026-09-20T19:02:00+07:00",
  });

  const hold = order("DH-2430", { state: "AWAITING_TRANSFER", dueAt: "2026-09-22T07:02:00+07:00" });
  const cod = order("DH-2431", { state: "RECEIVED" }, "COD");
  const shipping = order("DH-2422", { state: "SHIPPING", shippedAt: "2026-09-18T07:15:00+07:00", trackingCode: "VD-1" });
  const paid = order("DH-2421", { state: "PAID", paidAt: "2026-09-18T07:15:00+07:00" });
  const soon = order("DH-2416", { state: "DELIVERED", deliveredAt: "2026-09-19T10:00:00+07:00" });
  const later = order("DH-2417", { state: "DELIVERED", deliveredAt: "2026-09-20T10:00:00+07:00" });
  const old = order("DH-2210", { state: "DELIVERED", deliveredAt: "2026-03-23T10:05:00+07:00" });
  const gone = order("DH-2310", { state: "CANCELLED", cancelledAt: "2026-06-15T20:15:00+07:00", reason: "khách huỷ" });

  it("says there is no order at all", () => {
    expect(meNow([], OPEN)).toEqual({ kind: "none" });
  });

  it("puts the order that needs the shopper beside the parcel on its way", () => {
    expect(meNow([gone, shipping, hold, cod], OPEN)).toEqual({ kind: "live", primary: hold, moving: shipping });
    // A COD order waits for the call when no transfer is awaited; a paid order moves when nothing ships.
    expect(meNow([paid, cod], OPEN)).toEqual({ kind: "live", primary: cod, moving: paid });
    expect(meNow([soon, paid], OPEN)).toEqual({ kind: "live", primary: null, moving: paid });
    expect(meNow([soon, hold], OPEN)).toEqual({ kind: "live", primary: hold, moving: null });
  });

  it("with nothing running, the return window that closes soonest, while one is open", () => {
    expect(meNow([later, soon, old, gone], OPEN)).toEqual({ kind: "return", order: soon, until: "2026-09-26T10:00:00+07:00" });
    expect(meNow([later, soon, old, gone], LATER)).toEqual({ kind: "quiet" });
  });

  const saved = savedStyles(C, DEMO.favorites);

  it("keeps each saved style in its colour, the ones the catalogue lost left out", () => {
    const withLost = savedStyles(C, [fav("bui", "black"), { productId: productId("p-gone"), color: "black", savedAt: null }]);
    expect(withLost.map((s) => s.product.id)).toEqual(["p-bui"]);
    expect(savedColor(product("than"), { color: "white" })).toBe("black");
    expect(saved.map((s) => s.color)).toEqual(["black", "navy", "grey", "grey"]);
  });

  it("draws four pictures of the saved colours, ĐÃ HẾT on a colour with nothing left", () => {
    const thumbs = favThumbs([...saved, ...savedStyles(C, [fav("khoi", "black")])]);
    expect(thumbs).toHaveLength(4);
    expect(thumbs.map((t) => [t.product.name, t.flat, t.sold])).toEqual([
      ["BỤI", false, false],
      ["THAN", false, false],
      ["MUỐI", false, true],
      ["HOODIE TRƠN", true, false],
    ]);
    expect(thumbs[0]!.src).toContain("bui-black");
    // A style whose frame is only borrowed has no picture, and no stamp either.
    const [reu] = favThumbs(savedStyles(C, [fav("reu", "moss")]));
    expect(reu).toMatchObject({ src: null, sold: false });
  });

  it("names the saved colour running out while its issue sells, fewest first", () => {
    expect(favAlert(C, saved, OPEN)).toBe("BỤI đen còn 1");
    expect(favAlert(C, savedStyles(C, [fav("than", "navy")]), OPEN)).toBe("THAN xanh than còn 3");
    expect(favAlert(C, saved, BETWEEN)).toBeNull();
  });

  it("dates the reminder, by app, or says why there is none", () => {
    expect(remindTile(C, [6], OPEN)).toEqual({
      kind: "set",
      no: 6,
      title: "Nhắc Số 06",
      dd: "02",
      mm: "10",
      line: "20:00 thứ Sáu, qua app",
    });
    expect(remindTile(C, [], OPEN)).toEqual({ kind: "none", text: "Chưa bật nhắc" });
    expect(remindTile(C, [6], LATER)).toEqual({ kind: "none", text: "Chưa có Số mới" });
  });
});

describe("Yêu thích", () => {
  it("prints the saved colour's stock in the mock's words", () => {
    expect(wishStock(C, product("bui"), "black", OPEN)).toEqual({ kind: "left", n: 1, low: true });
    expect(wishStock(C, product("than"), "black", OPEN)).toEqual({ kind: "left", n: 3, low: true });
    expect(wishStock(C, product("khoi"), "black", OPEN)).toMatchObject({ kind: "left", low: false });
    // Sold out altogether: the stamp says it. A fixed style's colour gone: "Hết màu …".
    expect(wishStock(C, product("muoi"), "grey", OPEN)).toBeNull();
    expect(wishStock(C, product("hoodie-tron"), "grey", OPEN)).toBeNull();
    expect(wishStock(C, product("than"), "navy", BETWEEN)).toEqual({ kind: "closed", day: "25/09" });
  });

  it("says a colour has gone while the style has not", () => {
    const bui = { ...product("bui"), stock: { black: { S: 0, M: 0, L: 0, XL: 0 }, grey: { S: 0, M: 0, L: 0, XL: 1 } } };
    expect(wishStock(C, bui, "black", OPEN)).toEqual({ kind: "gone", color: "đen" });
  });

  it("makes a card of a style with a photo and a card of type for an older issue's", () => {
    const [bui, than, muoi, hoodie] = savedStyles(C, DEMO.favorites).map((s) => wishCard(C, s, OPEN));
    expect(bui).toMatchObject({ kind: "style", color: "black", href: "/products/s05-bui?color=black", sold: false, closed: false });
    expect(bui?.kind === "style" && bui.sizes?.map((z) => [z.size, z.n])).toEqual([
      ["S", 0],
      ["M", 0],
      ["L", 1],
      ["XL", 0],
    ]);
    expect(than).toMatchObject({ kind: "style", color: "navy" });
    expect(muoi).toMatchObject({ kind: "style", sold: true, sizes: null, stock: null });
    expect(hoodie).toMatchObject({ kind: "style", fixed: true, stock: null });
    const [reu] = savedStyles(C, [fav("reu", "moss")]).map((s) => wishCard(C, s, OPEN));
    expect(reu).toMatchObject({ kind: "type" });
  });

  it("has nothing to add once the issue has closed", () => {
    const [than] = savedStyles(C, [fav("than", "navy")]).map((s) => wishCard(C, s, BETWEEN));
    expect(than).toMatchObject({ kind: "style", closed: true, sizes: null, stock: { kind: "closed", day: "25/09" } });
  });

  it("names each size button", () => {
    expect(wishSizeLabel("L", 5)).toBe("Size L");
    expect(wishSizeLabel("M", 2)).toBe("Size M, còn 2");
    expect(wishSizeLabel("S", 0)).toBe("Size S, hết");
  });
});

describe("Đổi mật khẩu", () => {
  it("asks for the three fields in the mock's words", () => {
    const e = passwordSheetErrors({ current: "", next: "1234567", again: "" });
    expect(e).toEqual({
      current: "Nhập mật khẩu hiện tại",
      next: "Mật khẩu mới từ 8 ký tự",
      again: "Hai mật khẩu mới chưa khớp",
    });
    expect(firstWrongPassword(e)).toBe("current");
  });

  it("asks the length alone: no letters-and-digits rule, and the old password may come back", () => {
    expect(passwordSheetErrors({ current: "matkhau1", next: "abcdefgh", again: "abcdefgh" })).toEqual({});
    expect(passwordSheetErrors({ current: "matkhau1", next: "matkhau1", again: "matkhau1" })).toEqual({});
  });

  it("wants the second new password to match the first", () => {
    expect(passwordSheetErrors({ current: "x", next: "abcdefgh", again: "abcdefgi" })).toEqual({
      again: "Hai mật khẩu mới chưa khớp",
    });
    expect(firstWrongPassword({ again: "…" })).toBe("again");
  });
});
