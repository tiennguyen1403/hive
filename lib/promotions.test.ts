import { describe, it, expect } from "vitest";
import {
  appliedPromo,
  checkPromoCode,
  livePromotions,
  normalisePromoCode,
  parsePromoCode,
  promoAppliedMessage,
  promoOfferLabel,
  promoTermsLabel,
  promoWindowLabel,
  serializePromoCode,
} from "./promotions";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { promoCode } from "@/data/types";
import { buildCatalog } from "./catalog";
import { isPromoLive } from "./orders";
import { checkoutTotals } from "./shipping";

/** The fixture with one code paused by the shop (slice B3b). */
function withPaused(code: string) {
  return buildCatalog({
    products: [...FIXTURE_CATALOG.products],
    drops: [...FIXTURE_CATALOG.drops],
    teasers: [...FIXTURE_CATALOG.teasers],
    promotions: FIXTURE_CATALOG.promotions.map((p) => (p.code === code ? { ...p, paused: true } : p)),
  });
}

/** Inside every live code's window, and the clock the mock was drawn on. */
const NOW = new Date("2026-09-20T18:50:00+07:00");
/** KHÓI Đen M ×1 + CÁT Kem L ×1, the basket the approved cart screen shows. */
const BASKET = 810_000;

describe("checkPromoCode · a code that works", () => {
  it("accepts a live amount code on a big enough basket", () => {
    const check = checkPromoCode(FIXTURE_CATALOG, "CHAOBAN", BASKET, NOW);
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.promo.code).toBe("CHAOBAN");
  });

  it("reads a code however it was typed", () => {
    expect(checkPromoCode(FIXTURE_CATALOG, "  chao ban  ", BASKET, NOW).ok).toBe(true);
    expect(normalisePromoCode(" dot05 ")).toBe("DOT05");
  });
});

describe("checkPromoCode · a code that does not", () => {
  it("names a code that does not exist", () => {
    const check = checkPromoCode(FIXTURE_CATALOG, "XYZ", BASKET, NOW);
    expect(check).toEqual({ ok: false, message: "Không có mã XYZ." });
  });

  it("says a code has expired rather than that it is invalid", () => {
    // DOT04 ran with the previous drop. The shopper's next move is another
    // code, not another attempt at this one.
    const check = checkPromoCode(FIXTURE_CATALOG, "DOT04", 2_000_000, NOW);
    expect(check).toEqual({ ok: false, message: "Mã DOT04 đã hết hạn." });
  });

  it("says a code is used up rather than expired", () => {
    // VIP20 is inside its window with its cap reached — a different state
    // with a different sentence.
    expect(checkPromoCode(FIXTURE_CATALOG, "VIP20", 3_000_000, NOW)).toEqual({
      ok: false,
      message: "Mã VIP20 đã hết lượt dùng.",
    });
  });

  it("names the minimum a code needs, in đồng", () => {
    expect(checkPromoCode(FIXTURE_CATALOG, "FREESHIP", 400_000, NOW)).toEqual({
      ok: false,
      message: "Mã FREESHIP cần đơn từ 800.000₫.",
    });
  });

  it("asks for a code rather than refusing an empty box", () => {
    expect(checkPromoCode(FIXTURE_CATALOG, "   ", BASKET, NOW)).toEqual({
      ok: false,
      message: "Nhập mã giảm giá trước khi áp dụng.",
    });
  });

  it("says a paused code is paused — not expired, not used up (slice B3b)", () => {
    expect(checkPromoCode(withPaused("CHAOBAN"), "CHAOBAN", BASKET, NOW)).toEqual({
      ok: false,
      message: "Mã CHAOBAN đang tạm dừng.",
    });
  });

  it("lets the dates speak first: a paused code that is over is over", () => {
    expect(checkPromoCode(withPaused("DOT04"), "DOT04", 2_000_000, NOW)).toEqual({
      ok: false,
      message: "Mã DOT04 đã hết hạn.",
    });
  });

  it("stops applying a stored code the moment the shop pauses it", () => {
    expect(appliedPromo(withPaused("CHAOBAN"), "CHAOBAN", BASKET, NOW)).toBeUndefined();
  });
});

describe("appliedPromo", () => {
  it("re-checks a stored code against the basket it is now in", () => {
    // Applied on 810.000₫, then the shopper removes a line. The code stops
    // applying rather than staying on as a discount nothing earns.
    expect(appliedPromo(FIXTURE_CATALOG, "CHAOBAN", BASKET, NOW)?.code).toBe("CHAOBAN");
    expect(appliedPromo(FIXTURE_CATALOG, "CHAOBAN", 300_000, NOW)).toBeUndefined();
  });

  it("is undefined when nothing is stored", () => {
    expect(appliedPromo(FIXTURE_CATALOG, null, BASKET, NOW)).toBeUndefined();
  });
});

describe("what the applied code is worth", () => {
  it("takes 50.000₫ off the approved basket and off the total", () => {
    const promo = FIXTURE_CATALOG.promoByCode.get("CHAOBAN" as never)!;
    const before = checkoutTotals({
      subtotalVnd: BASKET,
      delivery: "STANDARD",
      payment: "BANK_TRANSFER",
    });
    const after = checkoutTotals({
      subtotalVnd: BASKET,
      delivery: "STANDARD",
      payment: "BANK_TRANSFER",
      promo,
    });
    expect(before.totalVnd).toBe(840_000);
    expect(after.discountVnd).toBe(50_000);
    expect(after.totalVnd).toBe(790_000);
  });

  it("says the amount in the toast the shopper reads", () => {
    const promo = FIXTURE_CATALOG.promoByCode.get("CHAOBAN" as never)!;
    expect(promoAppliedMessage(promo, BASKET, 30_000)).toBe(
      "Mã CHAOBAN đã áp dụng · −50.000₫",
    );
  });

  it("quotes free shipping as the fee it actually removes", () => {
    const promo = FIXTURE_CATALOG.promoByCode.get("FREESHIP" as never)!;
    expect(promoAppliedMessage(promo, 900_000, 30_000)).toBe(
      "Mã FREESHIP đã áp dụng · −30.000₫",
    );
    // Over the free-delivery line there is no fee left to remove, and
    // claiming a discount there would be a number the total does not show.
    expect(promoAppliedMessage(promo, 1_200_000, 0)).toBe(
      "Mã FREESHIP đã áp dụng · đơn này không giảm thêm",
    );
  });
});

describe("the code on the device", () => {
  it("round-trips", () => {
    expect(parsePromoCode(serializePromoCode("CHAOBAN"))).toBe("CHAOBAN");
    expect(parsePromoCode(serializePromoCode(null))).toBeNull();
  });

  it("returns nothing for an empty, broken or foreign payload", () => {
    expect(parsePromoCode(null)).toBeNull();
    expect(parsePromoCode("{")).toBeNull();
    expect(parsePromoCode(JSON.stringify({ v: 99, code: "CHAOBAN" }))).toBeNull();
    expect(parsePromoCode(JSON.stringify({ v: 1, code: 7 }))).toBeNull();
    expect(parsePromoCode(JSON.stringify({ v: 1, code: "   " }))).toBeNull();
  });
});

describe("the codes a shopper can use today", () => {
  it("lists exactly the live ones, in fixture order", () => {
    const live = livePromotions(FIXTURE_CATALOG, NOW).map((p) => p.code);
    expect(live).toEqual(["DOT05", "CHAOBAN", "FREESHIP"]);
  });

  it("drops a code that is out of uses, even inside its window", () => {
    // VIP20 runs to 25/09 but its 50 uses are gone. A shopper offered it
    // would be refused at checkout with "đã hết lượt dùng".
    expect(livePromotions(FIXTURE_CATALOG, NOW).some((p) => p.code === "VIP20")).toBe(false);
  });

  it("drops a code that has not started and one that has ended", () => {
    const before = new Date("2026-09-11T19:59:00+07:00");
    expect(livePromotions(FIXTURE_CATALOG, before).some((p) => p.code === "DOT05")).toBe(false);

    const after = new Date("2026-09-25T20:00:00+07:00");
    expect(livePromotions(FIXTURE_CATALOG, after).some((p) => p.code === "DOT05")).toBe(false);
    // DOT04 ended in June and stays gone.
    expect(livePromotions(FIXTURE_CATALOG, after).some((p) => p.code === "DOT04")).toBe(false);
  });

  it("never lists a code its own checker would refuse for a reason it can see", () => {
    // The listing rules and the checkout rules have to agree. A big basket
    // takes the minimum-order refusal out of the comparison — that one is
    // printed beside the code rather than used to hide it.
    for (const promo of livePromotions(FIXTURE_CATALOG, NOW)) {
      expect(checkPromoCode(FIXTURE_CATALOG, promo.code, 10_000_000, NOW).ok).toBe(true);
    }
  });

  it("leaves out a code the shop has paused, and agrees with the checker about it", () => {
    const paused = withPaused("DOT05");
    expect(livePromotions(paused, NOW).map((p) => p.code)).toEqual(["CHAOBAN", "FREESHIP"]);
    for (const promo of livePromotions(paused, NOW)) {
      expect(checkPromoCode(paused, promo.code, 10_000_000, NOW).ok).toBe(true);
    }
  });

  it("treats a paused code as not live wherever the question is asked (isPromoLive)", () => {
    const dot05 = FIXTURE_CATALOG.promoByCode.get(promoCode("DOT05"))!;
    expect(isPromoLive(dot05, NOW)).toBe(true);
    expect(isPromoLive({ ...dot05, paused: true }, NOW)).toBe(false);
  });
});

describe("how a code reads on the account screen", () => {
  it("spells out a percentage with its cap, an amount, and free delivery", () => {
    expect(promoOfferLabel(FIXTURE_CATALOG.promoByCode.get(promoCode("DOT05"))!)).toBe(
      "Giảm 10%, tối đa 150.000₫",
    );
    expect(promoOfferLabel(FIXTURE_CATALOG.promoByCode.get(promoCode("CHAOBAN"))!)).toBe("Giảm 50.000₫");
    expect(promoOfferLabel(FIXTURE_CATALOG.promoByCode.get(promoCode("FREESHIP"))!)).toBe(
      "Miễn phí giao tiêu chuẩn",
    );
  });

  it("states the minimum and what is left of the quota", () => {
    expect(promoTermsLabel(FIXTURE_CATALOG.promoByCode.get(promoCode("DOT05"))!)).toBe(
      "Đơn từ 500.000₫ · còn 154 lượt",
    );
    expect(promoTermsLabel(FIXTURE_CATALOG.promoByCode.get(promoCode("CHAOBAN"))!)).toBe(
      "Đơn từ 400.000₫ · không giới hạn lượt",
    );
    expect(promoTermsLabel(FIXTURE_CATALOG.promoByCode.get(promoCode("FREESHIP"))!)).toBe(
      "Đơn từ 800.000₫ · còn 82 lượt",
    );
  });

  it("dates the list by the last code to end, in +07:00 wall-clock time", () => {
    expect(promoWindowLabel(livePromotions(FIXTURE_CATALOG, NOW))).toBe("tới 25/09");
    expect(promoWindowLabel([])).toBe("");
  });
});
