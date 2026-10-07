import { beforeEach, describe, expect, it, vi } from "vitest";
import { NO_LOOKUP, type LookupAnswer, type LookedUpOrder } from "@/lib/order-lookup";

/**
 * `lookupFormAction` (slice B19), the action both lookup forms carry so they
 * work without script, without a database: it reads the form's two fields,
 * answers exactly as `lookupOrderAction` does — a field that is not a code or
 * a number spends no lookup — and hands the fields back with the answer.
 *
 * Replaced: the Data Access Layer behind it (`lib/db/order-lookup.ts`), where
 * the token is spent.
 */

const lookupOrder = vi.fn<(input: { code: string; phone: string }) => Promise<LookupAnswer>>();
vi.mock("@/lib/db/order-lookup", () => ({ lookupOrder: (input: { code: string; phone: string }) => lookupOrder(input) }));

const { lookupFormAction } = await import("./order-lookup");

const ORDER: LookedUpOrder = {
  code: "DH-2425" as LookedUpOrder["code"],
  placedAt: "2026-09-15T14:50:00+07:00",
  status: { state: "SHIPPING", shippedAt: "2026-09-17T09:15:00+07:00", trackingCode: "VNP-8842204" },
  payment: "CARD",
  lines: [{ productId: "p-khoi" as never, size: "XL", color: "cream", qty: 1, unitPriceVnd: 390_000 }],
  shippingFeeVnd: 30_000,
  codFeeVnd: 0,
  discountVnd: 50_000,
};

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

beforeEach(() => {
  lookupOrder.mockReset();
  lookupOrder.mockResolvedValue({ ok: true, order: ORDER });
});

describe("lookupFormAction", () => {
  it("looks the pair up as the app reads it, and hands the fields back as typed with the order", async () => {
    const state = await lookupFormAction(NO_LOOKUP, form({ code: " dh2425 ", phone: "0908 221 447" }));
    expect(lookupOrder).toHaveBeenCalledWith({ code: "DH-2425", phone: "0908221447" });
    expect(state).toEqual({ code: " dh2425 ", phone: "0908 221 447", result: { ok: true, order: ORDER } });
  });

  it("answers a field that is not a code or a number in the mock's words, and looks nothing up", async () => {
    const state = await lookupFormAction(NO_LOOKUP, form({ code: "DH-12", phone: "" }));
    expect(state.result).toEqual({
      ok: false,
      reason: "INVALID",
      errors: { code: "Mã đơn có dạng DH-1499", phone: "Nhập số điện thoại" },
    });
    expect(lookupOrder).not.toHaveBeenCalled();
  });

  it("reads a body that is not a form as two empty fields, and looks nothing up", async () => {
    const state = await lookupFormAction(NO_LOOKUP, "code=DH-2425&phone=0908221447" as never);
    expect(state).toMatchObject({ code: "", phone: "", result: { ok: false, reason: "INVALID" } });
    expect(lookupOrder).not.toHaveBeenCalled();
  });

  it("does not believe the state it is handed: only the form is read", async () => {
    const forged = { code: "DH-2425", phone: "0908221447", result: { ok: true as const, order: ORDER } };
    const state = await lookupFormAction(forged, form({ code: "DH-2431", phone: "0912345678" }));
    expect(lookupOrder).toHaveBeenCalledWith({ code: "DH-2431", phone: "0912345678" });
    expect(state.code).toBe("DH-2431");
  });

  it("says which of the two missed, under its field", async () => {
    lookupOrder.mockResolvedValue({ ok: false, reason: "PHONE_MISMATCH" });
    const state = await lookupFormAction(NO_LOOKUP, form({ code: "DH-2425", phone: "0912345678" }));
    expect(state.result).toEqual({
      ok: false,
      reason: "PHONE_MISMATCH",
      errors: { phone: "Số điện thoại không khớp với đơn" },
    });
  });
});
