import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { buildCatalog } from "./catalog";
import {
  FEED_DELIVERY,
  FEED_PAYMENTS,
  checkoutRows,
  deliverySub,
  expressOffNote,
  expressSwitchNote,
  feedDelivery,
  feedDeliveryWindow,
  feedFormErrors,
  feedPromoCheck,
  feedSentence,
  firstWrong,
  type FeedContact,
} from "./feed-checkout";
import { checkPromoCode } from "./promotions";
import { checkoutTotals } from "./shipping";

/** The mock's hyphen range: a no-break space, the hyphen, a word joiner and a no-break space. */
const R = (a: string, b: string) => `${a} -⁠ ${b}`;
/** Inside every live fixture code's window. */
const NOW = new Date("2026-09-20T18:50:00+07:00");
const PLACED = "2026-09-21T19:02:00+07:00";

describe("the delivery cards (checkout.js deliveryCards)", () => {
  it("prints each service's name and days the mock's way, from lib/shipping", () => {
    expect(FEED_DELIVERY.map((d) => d.method)).toEqual(["STANDARD", "EXPRESS"]);
    expect(feedDelivery("STANDARD")).toEqual({ method: "STANDARD", title: "Giao tiêu chuẩn", days: "2⁠-⁠4 ngày", note: null });
    expect(feedDelivery("EXPRESS")).toEqual({
      method: "EXPRESS",
      title: "Giao nhanh nội thành",
      days: "24 giờ",
      note: "Chỉ nội thành TP. Hồ Chí Minh, trong giờ hành chính",
    });
  });

  it("dates the window from the moment given, one day for express", () => {
    expect(feedDeliveryWindow("STANDARD", PLACED)).toBe(R("23/09", "25/09"));
    expect(feedDeliveryWindow("EXPRESS", PLACED)).toBe("22/09");
    expect(deliverySub("STANDARD", PLACED)).toBe(`2⁠-⁠4 ngày · dự kiến ${R("23/09", "25/09")}`);
    expect(deliverySub("EXPRESS", PLACED)).toBe("24 giờ · dự kiến 22/09");
  });

  it("says where express does not go, and that it moved to the standard service", () => {
    expect(expressOffNote("Hà Nội")).toBe("Không giao nhanh tới Hà Nội");
    expect(expressSwitchNote("TP. Hồ Chí Minh")).toBe("Giao nhanh chỉ trong TP. Hồ Chí Minh, đã chuyển sang giao tiêu chuẩn");
  });
});

describe("the payment cards", () => {
  it("are the mock's three, the card paying by transfer, COD with its surcharge", () => {
    expect(FEED_PAYMENTS.map((p) => [p.method, p.title, p.note, p.price])).toEqual([
      ["BANK_TRANSFER", "Chuyển khoản", "Giữ hàng 12 giờ kể từ khi đặt. Nội dung chuyển khoản hiện ở màn xác nhận.", null],
      ["COD", "Thanh toán khi nhận (COD)", "Kiểm hàng trước khi trả.", "+15.000₫"],
      ["CARD", "Thẻ (nội địa, Visa)", "Tạm thời trả bằng chuyển khoản.", null],
    ]);
  });
});

describe("feedFormErrors (checkout.js rules)", () => {
  const GOOD: FeedContact = {
    name: "Trần Minh Khoa",
    phone: "0938 571 204",
    email: "khoa@example.com",
    provinceCode: "29",
    wardCode: "70101063",
    street: "12 Nguyễn Huệ",
  };

  it("passes a complete form", () => {
    expect(feedFormErrors(GOOD)).toEqual({});
  });

  it("names every missing field in the mock's words, the ward only once a province is chosen", () => {
    const blank: FeedContact = { name: "", phone: "", email: "", provinceCode: "", wardCode: "", street: "" };
    // No e-mail among them: the field is "tuỳ chọn" (slice B8).
    expect(feedFormErrors(blank)).toEqual({
      name: "Nhập họ và tên",
      phone: "Nhập số điện thoại",
      province: "Chọn tỉnh / thành",
      street: "Nhập số nhà, đường",
    });
    expect(feedFormErrors({ ...GOOD, wardCode: "" })).toEqual({ ward: "Chọn phường / xã" });
  });

  it("wants two letters of a name at least, as the mock does", () => {
    expect(feedFormErrors({ ...GOOD, name: " K " }).name).toBe("Nhập họ và tên");
  });

  it("reads a phone number the way the app stores one, and refuses one that is not ten digits from 0", () => {
    expect(feedFormErrors({ ...GOOD, phone: "0901 2345" }).phone).toBe("Số điện thoại gồm 10 số, bắt đầu bằng 0");
    expect(feedFormErrors({ ...GOOD, phone: "+84 938 571 204" }).phone).toBeUndefined();
    expect(feedFormErrors({ ...GOOD, phone: "0938.571.204" }).phone).toBeUndefined();
  });

  it("takes no e-mail, as the mock does (slice B8), but refuses one that is typed and is not one", () => {
    expect(feedFormErrors({ ...GOOD, email: "" })).toEqual({});
    expect(feedFormErrors({ ...GOOD, email: "  " })).toEqual({});
    expect(feedFormErrors({ ...GOOD, email: "khoa@" }).email).toBe("Email chưa đúng");
    expect(feedFormErrors({ ...GOOD, email: " khoa@example.com " }).email).toBeUndefined();
  });

  it("finds the first wrong field in the page's order", () => {
    expect(firstWrong({ street: "x", phone: "y" })).toBe("phone");
    expect(firstWrong({})).toBeUndefined();
  });
});

describe("feedPromoCheck (the mock's words, the app's rules)", () => {
  it("accepts what checkPromoCode accepts", () => {
    const ok = feedPromoCheck(FIXTURE_CATALOG, " dot05 ", 900_000, NOW);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.promo.code).toBe("DOT05");
  });

  it("refuses in the mock's words", () => {
    expect(feedPromoCheck(FIXTURE_CATALOG, "  ", 900_000, NOW)).toEqual({ ok: false, message: "Nhập mã giảm giá" });
    expect(feedPromoCheck(FIXTURE_CATALOG, "XYZ", 900_000, NOW)).toEqual({ ok: false, message: "Mã không tồn tại" });
    expect(feedPromoCheck(FIXTURE_CATALOG, "DOT04", 2_000_000, NOW)).toEqual({ ok: false, message: "Mã đã hết hạn" });
    expect(feedPromoCheck(FIXTURE_CATALOG, "VIP20", 3_000_000, NOW)).toEqual({ ok: false, message: "Mã đã hết lượt dùng" });
    expect(feedPromoCheck(FIXTURE_CATALOG, "DOT05", 420_000, NOW)).toEqual({
      ok: false,
      message: "Đơn từ 500.000₫ mới dùng được mã này",
    });
  });

  it("refuses a paused code and one not started yet in the same shape", () => {
    const paused = buildCatalog({
      products: [...FIXTURE_CATALOG.products],
      drops: [...FIXTURE_CATALOG.drops],
      teasers: [...FIXTURE_CATALOG.teasers],
      promotions: FIXTURE_CATALOG.promotions.map((p) => (p.code === "CHAOBAN" ? { ...p, paused: true } : p)),
    });
    expect(feedPromoCheck(paused, "CHAOBAN", 900_000, NOW)).toEqual({ ok: false, message: "Mã đang tạm dừng" });
    expect(feedPromoCheck(FIXTURE_CATALOG, "DOT05", 900_000, new Date("2026-09-01T10:00:00+07:00"))).toEqual({
      ok: false,
      message: "Mã chưa tới ngày dùng được",
    });
  });

  it("never disagrees with checkPromoCode about whether a code applies", () => {
    for (const p of FIXTURE_CATALOG.promotions) {
      for (const basket of [0, 420_000, 900_000, 3_000_000]) {
        expect(feedPromoCheck(FIXTURE_CATALOG, p.code, basket, NOW).ok, `${p.code} ${basket}`).toBe(
          checkPromoCode(FIXTURE_CATALOG, p.code, basket, NOW).ok,
        );
      }
    }
  });
});

describe("checkoutRows (checkout.js paintAll)", () => {
  it("lists the goods and the delivery, free when it is", () => {
    const t = checkoutTotals({ subtotalVnd: 2_630_000, delivery: "STANDARD", payment: "BANK_TRANSFER" });
    expect(checkoutRows(t, null)).toEqual([
      { label: "Tạm tính", value: "2.630.000₫" },
      { label: "Giao hàng", value: "Miễn phí" },
    ]);
  });

  it("adds the COD surcharge and the code's discount", () => {
    const promo = FIXTURE_CATALOG.promoByCode.get("DOT05" as never)!;
    const t = checkoutTotals({ subtotalVnd: 2_630_000, delivery: "STANDARD", payment: "COD", promo });
    expect(checkoutRows(t, "DOT05")).toEqual([
      { label: "Tạm tính", value: "2.630.000₫" },
      { label: "Giao hàng", value: "Miễn phí" },
      { label: "Phụ phí COD", value: "+15.000₫" },
      { label: "Mã DOT05", value: "-150.000₫" },
    ]);
  });

  it("says a free-delivery code on a basket that already travels free takes nothing more off", () => {
    const promo = FIXTURE_CATALOG.promoByCode.get("FREESHIP" as never)!;
    const t = checkoutTotals({ subtotalVnd: 1_200_000, delivery: "STANDARD", payment: "BANK_TRANSFER", promo });
    expect(checkoutRows(t, "FREESHIP").at(-1)).toEqual({ label: "Mã FREESHIP", value: "Miễn phí giao" });
    const paid = checkoutTotals({ subtotalVnd: 900_000, delivery: "STANDARD", payment: "BANK_TRANSFER", promo });
    expect(checkoutRows(paid, "FREESHIP").at(-1)).toEqual({ label: "Mã FREESHIP", value: "-30.000₫" });
  });
});

describe("feedSentence", () => {
  it("writes the app's long dash as a full stop and a capital", () => {
    expect(feedSentence("Một món vừa hết — mở giỏ để đổi size hoặc bỏ món.")).toBe(
      "Một món vừa hết. Mở giỏ để đổi size hoặc bỏ món.",
    );
    expect(feedSentence("Chưa đặt được đơn. Thử lại sau ít phút.")).toBe("Chưa đặt được đơn. Thử lại sau ít phút.");
  });
});
