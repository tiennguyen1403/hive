import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/lib/i18n";
import type { LookupAnswer, LookupInput } from "@/lib/order-lookup";

/**
 * Round v6 slice E2: the Server Actions of the buying screens answer in the
 * request's language — `placeOrderAction`, `cancelOrderAction`,
 * `lookupOrderAction` — and hand it to the rate limit, so its refusal is in
 * that language too. Here the request is English (`getActionLocale`); what
 * the actions answer without a request is their own tests' (Vietnamese:
 * `order-lookup.test.ts`, and `lib/locale.test.ts` for the fallback itself).
 *
 * Replaced: the language of the request, the rate limit, the session, the
 * Data Access Layer the actions call, and `revalidatePath`.
 */

vi.mock("@/lib/locale", () => ({ getActionLocale: async (): Promise<Locale> => "en" }));

type Pace = { ok: true } | { ok: false; retryAfterSeconds: number; message: string };
let pace: Pace = { ok: true };
const takeRate = vi.fn(async (_bucket: string, _cost?: number, _locale?: Locale): Promise<Pace> => pace);
vi.mock("@/lib/db/rate-limit", () => ({
  takeRate: (bucket: string, cost?: number, locale?: Locale) => takeRate(bucket, cost, locale),
}));

vi.mock("@/lib/db/session", () => ({
  getSession: async () => null,
  requireSession: async () => ({ userId: "00000000-0000-0000-0000-000000000001" }),
}));

class OrderError extends Error {
  constructor(readonly failure: string) {
    super(`order refused: ${failure}`);
  }
}
const placeOrder = vi.fn(async (_input: unknown, _now: string) => ({ code: "DH-2440", accessKey: "k" }));
const cancelOrder = vi.fn(async (_code: string, _now: string) => undefined);
vi.mock("@/lib/db/orders", () => ({
  OrderError,
  placeOrder: (input: unknown, now: string) => placeOrder(input, now),
  cancelOrder: (code: string, now: string) => cancelOrder(code, now),
  rememberGuestReceipt: async () => undefined,
}));

const lookupOrder = vi.fn(async (_input: LookupInput, _locale?: Locale): Promise<LookupAnswer> => ({ ok: false, reason: "NO_ORDER" }));
vi.mock("@/lib/db/order-lookup", () => ({
  lookupOrder: (input: LookupInput, locale?: Locale) => lookupOrder(input, locale),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { placeOrderAction, cancelOrderAction } = await import("./orders");
const { lookupOrderAction } = await import("./order-lookup");

const PAYLOAD = {
  lines: [{ productId: "p-khoi", color: "black", size: "M", qty: 2 }],
  draft: {
    recipient: "Trần Minh Anh",
    phone: "0912 345 678",
    email: "",
    provinceCode: "29",
    wardCode: "70101063",
    line: "24 Nguyễn Thị Minh Khai",
    note: "",
    delivery: "STANDARD",
    payment: "COD",
  },
  promoCode: null,
};

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  pace = { ok: true };
  takeRate.mockClear();
  placeOrder.mockReset();
  placeOrder.mockResolvedValue({ code: "DH-2440", accessKey: "k" });
  cancelOrder.mockReset();
  cancelOrder.mockResolvedValue(undefined);
  lookupOrder.mockReset();
  lookupOrder.mockResolvedValue({ ok: false, reason: "NO_ORDER" });
  logged?.mockRestore();
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("placeOrderAction, asked in English", () => {
  it("refuses a request it cannot read in English, spending nothing", async () => {
    expect(await placeOrderAction("nonsense")).toEqual({
      ok: false,
      failure: "INVALID",
      message: "Some order details aren't right. Check the address and your bag, then try again.",
    });
    expect(await placeOrderAction({ ...PAYLOAD, draft: { ...PAYLOAD.draft, phone: "12345" } })).toEqual({
      ok: false,
      failure: "INVALID",
      message: "The phone number isn't right. It has 10 digits, starting with 0.",
    });
    expect(takeRate).not.toHaveBeenCalled();
  });

  it("hands the language to the rate limit, for the order and for its pieces", async () => {
    expect(await placeOrderAction(PAYLOAD)).toEqual({ ok: true, code: "DH-2440" });
    expect(takeRate.mock.calls).toEqual([
      ["order_place", 1, "en"],
      ["order_units", 2, "en"],
    ]);
  });

  it("passes the rate limit's own sentence on", async () => {
    pace = { ok: false, retryAfterSeconds: 200, message: "Too many tries in a row. Try again in 4 minutes." };
    expect(await placeOrderAction(PAYLOAD)).toEqual({
      ok: false,
      failure: "RATE_LIMITED",
      message: "Too many tries in a row. Try again in 4 minutes.",
    });
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it("words what the database refused in English", async () => {
    placeOrder.mockRejectedValue(new OrderError("OUT_OF_STOCK"));
    expect(await placeOrderAction(PAYLOAD)).toEqual({
      ok: false,
      failure: "OUT_OF_STOCK",
      message: "An item just sold out. Open your bag to change the size or remove it.",
    });
    placeOrder.mockRejectedValue(new Error("connection refused"));
    expect(await placeOrderAction(PAYLOAD)).toEqual({
      ok: false,
      failure: "UNAVAILABLE",
      message: "Couldn't place the order. Try again in a few minutes.",
    });
  });
});

describe("cancelOrderAction, asked in English", () => {
  it("words its refusals in English, and hands the language to the rate limit", async () => {
    expect(await cancelOrderAction("not a code")).toEqual({ ok: false, message: "This order isn't in your account." });
    expect(takeRate).toHaveBeenCalledWith("account", 1, "en");
    cancelOrder.mockRejectedValue(new OrderError("NOT_CANCELLABLE"));
    expect(await cancelOrderAction("DH-2430")).toEqual({
      ok: false,
      message: "This order can no longer be cancelled. Contact the shop.",
    });
  });
});

describe("lookupOrderAction, asked in English", () => {
  it("answers an empty or malformed field in English, looking nothing up", async () => {
    expect(await lookupOrderAction("", "")).toEqual({
      ok: false,
      reason: "INVALID",
      errors: { code: "Enter an order code", phone: "Enter a phone number" },
    });
    expect(lookupOrder).not.toHaveBeenCalled();
  });

  it("hands the language to the lookup, and words its misses in English", async () => {
    expect(await lookupOrderAction("dh2425", "0908 221 447")).toEqual({
      ok: false,
      reason: "NO_ORDER",
      errors: { code: "No order has this code" },
    });
    expect(lookupOrder).toHaveBeenCalledWith({ code: "DH-2425", phone: "0908221447" }, "en");
    lookupOrder.mockResolvedValue({ ok: false, reason: "PHONE_MISMATCH" });
    expect(await lookupOrderAction("DH-2425", "0912345678")).toMatchObject({
      errors: { phone: "This phone number doesn't match the order" },
    });
  });

  it("says in English that the lookup could not be made", async () => {
    lookupOrder.mockRejectedValue(new Error("lookup_order failed: connection refused"));
    expect(await lookupOrderAction("DH-2425", "0908221447")).toEqual({
      ok: false,
      reason: "UNAVAILABLE",
      message: "Couldn't look up the order. Try again in a few minutes.",
    });
  });
});
