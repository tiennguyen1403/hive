import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LookupAnswer, LookedUpOrder } from "@/lib/order-lookup";

/**
 * `lookupOrderAction`'s own order of things (slice B11), without a database:
 * what the browser sent is read first, and a field that is empty or not a
 * code or a number is answered in the mock's words WITHOUT a lookup — so
 * without a token; then one lookup; then the answer under the field it
 * belongs to. What the lookup does is `lookupOrder`'s (`order-lookup.test.ts`
 * beside the DAL) and Postgres' (`order-lookup.dbtest.ts`).
 *
 * Replaced: the Data Access Layer the action calls (`lib/db/order-lookup.ts`),
 * which is where the token is spent.
 */

const lookupOrder = vi.fn<(input: { code: string; phone: string }) => Promise<LookupAnswer>>();
vi.mock("@/lib/db/order-lookup", () => ({ lookupOrder: (input: { code: string; phone: string }) => lookupOrder(input) }));

const { lookupOrderAction } = await import("./order-lookup");

const ORDER: LookedUpOrder = {
  code: "DH-2425" as LookedUpOrder["code"],
  placedAt: "2026-09-15T14:50:00+07:00",
  status: { state: "SHIPPING", shippedAt: "2026-09-17T09:15:00+07:00", trackingCode: "VNP-8842204" },
  moments: { paidAt: "2026-09-15T15:05:00+07:00", shippedAt: "2026-09-17T09:15:00+07:00" },
  payment: "CARD",
  lines: [{ productId: "p-khoi" as never, size: "XL", color: "cream", qty: 1, unitPriceVnd: 390_000 }],
  shippingFeeVnd: 30_000,
  codFeeVnd: 0,
  discountVnd: 50_000,
};

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  lookupOrder.mockReset();
  lookupOrder.mockResolvedValue({ ok: true, order: ORDER });
  logged?.mockRestore();
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("what the browser sent", () => {
  it("answers an empty or malformed field in the mock's words, and looks nothing up", async () => {
    expect(await lookupOrderAction("", "")).toEqual({
      ok: false,
      reason: "INVALID",
      errors: { code: "Nhập mã đơn", phone: "Nhập số điện thoại" },
    });
    expect(await lookupOrderAction("DH-12", "12345")).toEqual({
      ok: false,
      reason: "INVALID",
      errors: { code: "Mã đơn có dạng DH-1499", phone: "Số điện thoại gồm 10 số, bắt đầu bằng 0" },
    });
    expect(await lookupOrderAction({} as never, 7 as never)).toMatchObject({ ok: false, reason: "INVALID" });
    expect(lookupOrder).not.toHaveBeenCalled();
  });

  it("hands the lookup the code and the number as the app reads them", async () => {
    await lookupOrderAction(" dh2425 ", "0908 221 447");
    expect(lookupOrder).toHaveBeenCalledWith({ code: "DH-2425", phone: "0908221447" });
    await lookupOrderAction("DH-2425", "0908.221.447");
    expect(lookupOrder).toHaveBeenLastCalledWith({ code: "DH-2425", phone: "0908221447" });
    expect(lookupOrder).toHaveBeenCalledTimes(2);
  });
});

describe("the answer", () => {
  it("is the order the lookup found", async () => {
    expect(await lookupOrderAction("DH-2425", "0908221447")).toEqual({ ok: true, order: ORDER });
  });

  it("says a code that finds nothing under the code, a wrong number under the number", async () => {
    lookupOrder.mockResolvedValue({ ok: false, reason: "NO_ORDER" });
    expect(await lookupOrderAction("DH-9999", "0908221447")).toEqual({
      ok: false,
      reason: "NO_ORDER",
      errors: { code: "Không có đơn nào mang mã này" },
    });
    lookupOrder.mockResolvedValue({ ok: false, reason: "PHONE_MISMATCH" });
    expect(await lookupOrderAction("DH-2425", "0912345678")).toEqual({
      ok: false,
      reason: "PHONE_MISMATCH",
      errors: { phone: "Số điện thoại không khớp với đơn" },
    });
  });

  it("passes the app's rate-limit sentence on when the visitor's lookups are used up", async () => {
    lookupOrder.mockResolvedValue({
      ok: false,
      reason: "RATE_LIMITED",
      message: "Quá nhiều lượt liên tiếp. Thử lại sau 7 phút.",
      retryAfterSeconds: 400,
    });
    expect(await lookupOrderAction("DH-2425", "0908221447")).toEqual({
      ok: false,
      reason: "RATE_LIMITED",
      message: "Quá nhiều lượt liên tiếp. Thử lại sau 7 phút.",
    });
  });

  it("turns broken plumbing into UNAVAILABLE and a log line, never a thrown error or database text", async () => {
    lookupOrder.mockRejectedValue(new Error("lookup_order failed: permission denied for table orders"));
    const got = await lookupOrderAction("DH-2425", "0908221447");
    expect(got).toEqual({ ok: false, reason: "UNAVAILABLE", message: "Chưa tra được đơn. Thử lại sau ít phút." });
    expect(JSON.stringify(got)).not.toContain("permission");
    expect(logged).toHaveBeenCalledTimes(1);
  });
});
