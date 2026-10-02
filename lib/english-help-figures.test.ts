import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeliveryMethod } from "@/data/types";

/**
 * Round v6 slice E3b: no figure in Hỏi đáp's English is typed into a
 * sentence (DESIGN.md §9, rule 1). The proof: change the rules the answers
 * read — the fees and the free-delivery floor, the days, the COD fee, the
 * return window, the transfer's hold — and the English answers change with
 * them, as the Vietnamese ones do. Each case loads `feed-help` afresh over
 * rules replaced with `vi.doMock`.
 */

type Rules = {
  freeFrom: number;
  cod: number;
  window: number;
  hold: number;
  standard: { fee: number; lead: readonly [number, number] };
  expressFee: number;
};

async function helpWith(rules: Rules) {
  vi.resetModules();
  vi.doMock("./shipping", async (importOriginal) => {
    const real = await importOriginal<typeof import("./shipping")>();
    return {
      ...real,
      FREE_SHIPPING_FROM_VND: rules.freeFrom,
      COD_SURCHARGE_VND: rules.cod,
      RETURN_WINDOW_DAYS: rules.window,
      deliveryOption: (method: DeliveryMethod) =>
        method === "STANDARD"
          ? { ...real.deliveryOption(method), feeVnd: rules.standard.fee, leadDays: rules.standard.lead }
          : { ...real.deliveryOption(method), feeVnd: rules.expressFee },
    };
  });
  vi.doMock("./orders", async (importOriginal) => ({
    ...(await importOriginal<typeof import("./orders")>()),
    TRANSFER_HOLD_HOURS: rules.hold,
  }));
  const help = await import("./feed-help");
  const answers = (locale: "vi" | "en") => {
    const out = new Map<string, string>();
    for (const g of help.helpGroups(null, locale)) for (const it of g.items) out.set(it.id, help.answerText(it.a));
    return out;
  };
  return { vi: answers("vi"), en: answers("en") };
}

afterEach(() => {
  vi.doUnmock("./shipping");
  vi.doUnmock("./orders");
  vi.resetModules();
});

describe("Hỏi đáp's figures follow the rules, in both languages", () => {
  it("reprices, recounts and rewrites every figure when the rules change", async () => {
    const { vi: v, en } = await helpWith({
      freeFrom: 1_234_000,
      cod: 16_000,
      window: 9,
      hold: 13,
      standard: { fee: 31_000, lead: [3, 5] },
      expressFee: 46_000,
    });
    expect(en.get("q-giao-hang-1")).toBe("Standard delivery 31,000₫, free on orders from 1,234,000₫. Express 46,000₫.");
    expect(v.get("q-giao-hang-1")).toBe("Giao tiêu chuẩn 31.000₫, miễn phí cho đơn từ 1.234.000₫. Giao nhanh 46.000₫.");
    expect(en.get("q-giao-hang-2")).toBe("Standard delivery 3 to 5 days, express within 24 hours.");
    expect(v.get("q-giao-hang-2")).toBe("Giao tiêu chuẩn 3 đến 5 ngày, giao nhanh trong 24 giờ.");
    expect(en.get("q-thanh-toan-1")).toMatch(/^Reserved for 13 hours after you order\./);
    expect(v.get("q-thanh-toan-1")).toMatch(/^Giữ hàng 13 giờ kể từ khi đặt\./);
    expect(en.get("q-thanh-toan-2")).toMatch(/^Yes, an extra 16,000₫\./);
    expect(v.get("q-thanh-toan-2")).toMatch(/^Có, thêm 16\.000₫\./);
    expect(en.get("q-doi-tra-0")).toBe("Within 9 days of delivery. Unworn, with tags on.");
    expect(v.get("q-doi-tra-0")).toBe("Trong 9 ngày kể từ khi nhận hàng. Hàng chưa mặc, còn nhãn.");
  });

  it("counts one in the singular in English", async () => {
    const { en } = await helpWith({
      freeFrom: 1_000_000,
      cod: 15_000,
      window: 1,
      hold: 1,
      standard: { fee: 30_000, lead: [2, 4] },
      expressFee: 45_000,
    });
    expect(en.get("q-doi-tra-0")).toBe("Within 1 day of delivery. Unworn, with tags on.");
    expect(en.get("q-thanh-toan-1")).toMatch(/^Reserved for 1 hour after you order\./);
  });
});
