import { describe, it, expect } from "vitest";
import {
  COD_SURCHARGE_VND,
  DELIVERY_OPTIONS,
  EXPRESS_PROVINCE_CODE,
  FREE_SHIPPING_FROM_VND,
  checkoutTotals,
  deliveryOption,
  deliveryWindow,
  deliveryWindowLabel,
  isDeliveryAvailable,
  shippingFeeVnd,
} from "./shipping";
import { PROMOTIONS } from "@/data/promotions";
import { findProvince } from "@/data/regions";

describe("shippingFeeVnd · standard", () => {
  it("charges the flat fee below the free-shipping line", () => {
    expect(shippingFeeVnd("STANDARD", 890_000)).toBe(30_000);
  });

  it("is free exactly at the line, not one đồng past it", () => {
    // The promise printed on the product page is "miễn phí từ 1.000.000₫".
    // "Từ" includes the number it names.
    expect(shippingFeeVnd("STANDARD", FREE_SHIPPING_FROM_VND)).toBe(0);
    expect(shippingFeeVnd("STANDARD", FREE_SHIPPING_FROM_VND - 1)).toBe(30_000);
  });

  it("is free above the line", () => {
    expect(shippingFeeVnd("STANDARD", 1_340_000)).toBe(0);
  });
});

describe("shippingFeeVnd · express", () => {
  it("costs the same however large the basket", () => {
    // Free shipping is a threshold on the standard service. Paying for speed
    // is not a volume discount, and the approved checkout prints 45.000₫
    // beside the express row on a 1.340.000₫ basket.
    expect(shippingFeeVnd("EXPRESS", 200_000)).toBe(45_000);
    expect(shippingFeeVnd("EXPRESS", 1_340_000)).toBe(45_000);
  });
});

describe("EXPRESS_PROVINCE_CODE", () => {
  it("names the city the express run actually covers", () => {
    expect(findProvince(EXPRESS_PROVINCE_CODE)?.name).toBe("TP. Hồ Chí Minh");
  });
});

describe("isDeliveryAvailable", () => {
  it("offers standard delivery everywhere", () => {
    expect(isDeliveryAvailable("STANDARD", "01")).toBe(true);
    expect(isDeliveryAvailable("STANDARD", EXPRESS_PROVINCE_CODE)).toBe(true);
  });

  it("offers express only where the courier runs it", () => {
    expect(isDeliveryAvailable("EXPRESS", EXPRESS_PROVINCE_CODE)).toBe(true);
    expect(isDeliveryAvailable("EXPRESS", "01")).toBe(false);
  });

  it("treats an unchosen province as not yet eligible for express", () => {
    expect(isDeliveryAvailable("EXPRESS", undefined)).toBe(false);
  });

  it("names both options, in the order the screen lists them", () => {
    expect(DELIVERY_OPTIONS.map((o) => o.method)).toEqual(["STANDARD", "EXPRESS"]);
  });
});

describe("checkoutTotals", () => {
  it("adds shipping to the goods", () => {
    const t = checkoutTotals({
      subtotalVnd: 890_000,
      delivery: "STANDARD",
      payment: "BANK_TRANSFER",
    });
    expect(t.shippingFeeVnd).toBe(30_000);
    expect(t.totalVnd).toBe(920_000);
  });

  it("reproduces the approved checkout: 1.340.000₫ of goods, shipping free", () => {
    const t = checkoutTotals({
      subtotalVnd: 1_340_000,
      delivery: "STANDARD",
      payment: "BANK_TRANSFER",
    });
    expect(t.shippingFeeVnd).toBe(0);
    expect(t.discountVnd).toBe(0);
    expect(t.totalVnd).toBe(1_340_000);
  });

  it("charges the cash-on-delivery handling fee the payment row promises", () => {
    const t = checkoutTotals({
      subtotalVnd: 1_340_000,
      delivery: "STANDARD",
      payment: "COD",
    });
    expect(t.codFeeVnd).toBe(COD_SURCHARGE_VND);
    expect(t.totalVnd).toBe(1_340_000 + COD_SURCHARGE_VND);
  });

  it("charges no handling fee on the other payment methods", () => {
    for (const payment of ["BANK_TRANSFER", "CARD"] as const) {
      expect(
        checkoutTotals({ subtotalVnd: 500_000, delivery: "STANDARD", payment }).codFeeVnd,
      ).toBe(0);
    }
  });

  it("takes a percentage off the goods and leaves the shipping alone", () => {
    // DOT05 — 10%, floor 500.000₫, cap 150.000₫.
    const promo = PROMOTIONS.find((p) => p.code === "DOT05");
    const t = checkoutTotals({
      subtotalVnd: 500_000,
      delivery: "STANDARD",
      payment: "BANK_TRANSFER",
      promo,
    });
    expect(t.discountVnd).toBe(50_000);
    expect(t.shippingFeeVnd).toBe(30_000);
    expect(t.totalVnd).toBe(480_000);
  });

  it("lets a free-shipping code cancel the fee and no more", () => {
    // FREESHIP — floor 800.000₫, so 900.000₫ qualifies while still sitting
    // under the 1.000.000₫ line where shipping would have been free anyway.
    const promo = PROMOTIONS.find((p) => p.code === "FREESHIP");
    const t = checkoutTotals({
      subtotalVnd: 900_000,
      delivery: "STANDARD",
      payment: "BANK_TRANSFER",
      promo,
    });
    expect(t.discountVnd).toBe(30_000);
    expect(t.totalVnd).toBe(900_000);
  });

  it("gives a code that has not met its floor no discount at all", () => {
    const promo = PROMOTIONS.find((p) => p.code === "DOT05");
    const t = checkoutTotals({
      subtotalVnd: 390_000,
      delivery: "STANDARD",
      payment: "BANK_TRANSFER",
      promo,
    });
    expect(t.discountVnd).toBe(0);
  });

  it("never lets the total go below zero", () => {
    const t = checkoutTotals({
      subtotalVnd: 100_000,
      delivery: "STANDARD",
      payment: "BANK_TRANSFER",
      promo: {
        code: "TEST" as never,
        kind: "AMOUNT",
        amountVnd: 10_000_000,
        startsAt: "2026-01-01T00:00:00+07:00",
        endsAt: "2027-01-01T00:00:00+07:00",
        usageLimit: null,
        usedCount: 0,
      },
    });
    expect(t.totalVnd).toBeGreaterThanOrEqual(0);
  });
});

describe("when the parcel is expected", () => {
  const PLACED = "2026-09-20T18:50:00+07:00";

  it("quotes the standard window the approved cart prints", () => {
    expect(deliveryWindowLabel("STANDARD", PLACED)).toBe("22/09\u00A0–\u00A024/09");
  });

  it("quotes express as one day, not as a range of one", () => {
    expect(deliveryWindowLabel("EXPRESS", PLACED)).toBe("21/09");
  });

  it("counts from the order rather than from today", () => {
    // A receipt reopened next week still quotes the window that was
    // promised when it was paid.
    const w = deliveryWindow("STANDARD", "2026-06-05T20:00:00+07:00");
    expect(w.fromIso).toBe("2026-06-07T20:00:00+07:00");
    expect(w.toIso).toBe("2026-06-09T20:00:00+07:00");
  });

  it("keeps the days it quotes level with the label beside them", () => {
    // "Giao tiêu chuẩn · 2–4 ngày" is a sentence; `leadDays` is what the
    // date is computed from. They have to be the same promise.
    expect(deliveryOption("STANDARD").leadDays).toEqual([2, 4]);
    expect(deliveryOption("STANDARD").label).toContain("2–4 ngày");
    expect(deliveryOption("EXPRESS").leadDays).toEqual([1, 1]);
    expect(deliveryOption("EXPRESS").label).toContain("24 giờ");
  });
});
