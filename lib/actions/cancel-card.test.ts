import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/data/types";
import type { Locale } from "@/lib/i18n";

/**
 * Slice B18: cancelling a card order closes its Stripe page — the shopper's
 * "Huỷ đơn" (`cancelOrderAction`) and the shop's (`cancelOrderAdmin`) — once
 * the database has cancelled it, as a best effort that never changes the
 * answer; and cancelling any other order never loads the Stripe half at all.
 *
 * Replaced: the request's language, the rate limit, the session, the orders'
 * Data Access Layer and the manager's database client, the Stripe half
 * (`lib/db/card-payments.ts`, counted each time it is loaded), and
 * `revalidatePath`. What `closeCardCheckout` itself does is
 * `lib/db/card-payments.test.ts`'s.
 */

vi.mock("@/lib/locale", () => ({ getActionLocale: async (): Promise<Locale> => "en" }));
vi.mock("@/lib/db/rate-limit", () => ({ takeRate: async () => ({ ok: true }), tidyRateHits: async () => 0 }));
vi.mock("@/lib/db/session", () => ({
  getSession: async () => ({ userId: "u-1" }),
  requireSession: async () => ({ userId: "u-1" }),
  requireAdmin: async () => ({ userId: "u-admin", email: "quanly@email.com", role: "admin" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/db/photos", () => ({ purgeUploadedPhotos: async () => 0 }));

const DUE = "2026-10-08T07:00:00+07:00";
const ORDER: Order = {
  code: "DH-2433" as Order["code"],
  customerId: "c-minhanh" as Order["customerId"],
  lines: [{ productId: "p-khoi" as Order["lines"][number]["productId"], size: "M", color: "black", qty: 1, unitPriceVnd: 390_000 }],
  status: { state: "CANCELLED", cancelledAt: DUE, reason: "khách huỷ" },
  payment: "CARD",
  delivery: "STANDARD",
  shippingFeeVnd: 30_000,
  codFeeVnd: 0,
  discountVnd: 0,
  shipTo: { recipient: "Trần Minh Anh", phone: "0912345678", line: "24 Nguyễn Thị Minh Khai", provinceCode: "29", wardCode: "70101063" },
  email: null,
  note: "",
  placedAt: "2026-10-07T19:00:00+07:00",
};

class OrderError extends Error {
  constructor(readonly failure: string) {
    super(`order refused: ${failure}`);
  }
}
let mine: Order | null = ORDER;
const cancelOrder = vi.fn(async (_code: string, _now: string) => undefined);
const findMyOrder = vi.fn(async (_code: string): Promise<Order | null> => mine);
vi.mock("@/lib/db/orders", () => ({
  OrderError,
  cancelOrder: (code: string, now: string) => cancelOrder(code, now),
  findMyOrder: (code: string) => findMyOrder(code),
}));

// The manager's client: `admin_cancel_order` goes through, `order_json` reads the order back.
let wire: unknown = null;
const rpc = vi.fn(async (fn: string, _args?: Record<string, unknown>) => (fn === "order_json" ? { data: wire, error: null } : { data: null, error: null }));
vi.mock("@/lib/db/server", () => ({ getSupabase: async () => ({ rpc: (fn: string, args?: Record<string, unknown>) => rpc(fn, args) }) }));

let loads = 0;
const closeCardCheckout = vi.fn(async (_order: Order) => undefined);
vi.mock("@/lib/db/card-payments", () => {
  loads += 1;
  return { closeCardCheckout: (order: Order) => closeCardCheckout(order) };
});

const { cancelOrderAction } = await import("./orders");
const { cancelOrderAdmin } = await import("./admin");

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mine = ORDER;
  wire = null;
  cancelOrder.mockClear();
  findMyOrder.mockClear();
  rpc.mockClear();
  closeCardCheckout.mockReset();
  closeCardCheckout.mockResolvedValue(undefined);
  logged?.mockRestore();
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

// In this order on purpose: the first two prove the Stripe half is never loaded for any other order.
describe("cancelling an order that is not paid by card", () => {
  it("never loads the Stripe half for the shopper's own cancel", async () => {
    mine = { ...ORDER, payment: "BANK_TRANSFER" };
    expect(await cancelOrderAction("DH-2433")).toEqual({ ok: true });
    mine = { ...ORDER, payment: "COD" };
    expect(await cancelOrderAction("DH-2433")).toEqual({ ok: true });
    expect(loads).toBe(0);
  });

  it("never loads it for the shop's cancel either", async () => {
    wire = { ...toWire(ORDER), payment: "BANK_TRANSFER" };
    expect(await cancelOrderAdmin("DH-2433", "Khách đổi ý", "")).toMatchObject({ ok: true });
    expect(rpc).toHaveBeenCalledWith("order_json", { p_code: "DH-2433" });
    expect(loads).toBe(0);
    expect(closeCardCheckout).not.toHaveBeenCalled();
  });
});

describe("cancelling a card order", () => {
  it("closes its Stripe page after the shopper's cancel, with the order as it now reads", async () => {
    expect(await cancelOrderAction("DH-2433")).toEqual({ ok: true });
    expect(cancelOrder.mock.invocationCallOrder[0]!).toBeLessThan(findMyOrder.mock.invocationCallOrder[0]!);
    expect(closeCardCheckout).toHaveBeenCalledWith(ORDER);
    expect(loads).toBe(1);
  });

  it("closes it after the shop's cancel too, the order read back with the manager's own client", async () => {
    wire = toWire(ORDER);
    expect(await cancelOrderAdmin("DH-2433", "Khách đổi ý", "")).toMatchObject({ ok: true });
    expect(closeCardCheckout).toHaveBeenCalledTimes(1);
    expect(closeCardCheckout.mock.calls[0]![0]).toMatchObject({ code: "DH-2433", payment: "CARD" });
  });

  it("answers exactly as before when closing the page fails, and logs it", async () => {
    closeCardCheckout.mockRejectedValue(new Error("stripe down"));
    expect(await cancelOrderAction("DH-2433")).toEqual({ ok: true });
    wire = toWire(ORDER);
    expect(await cancelOrderAdmin("DH-2433", "Khách đổi ý", "")).toEqual({
      errors: {},
      ok: true,
      message: "DH-2433 cancelled · reason: change of mind · items back in stock",
    });
    expect(logged).toHaveBeenCalledTimes(2);
  });

  it("does nothing more when the cancel itself is refused", async () => {
    cancelOrder.mockRejectedValueOnce(new OrderError("NOT_CANCELLABLE"));
    expect(await cancelOrderAction("DH-2433")).toEqual({
      ok: false,
      message: "This order can no longer be cancelled. Contact the shop.",
    });
    expect(findMyOrder).not.toHaveBeenCalled();
    expect(closeCardCheckout).not.toHaveBeenCalled();
  });
});

/** The order as `order_json()` writes it. */
function toWire(o: Order) {
  return {
    code: o.code,
    customerId: o.customerId,
    lines: o.lines,
    status: o.status,
    payment: o.payment,
    shippingFeeVnd: o.shippingFeeVnd,
    codFeeVnd: o.codFeeVnd,
    discountVnd: o.discountVnd,
    shipTo: o.shipTo,
    placedAt: o.placedAt,
    promo: null,
    email: null,
    note: "",
    delivery: o.delivery,
    moments: {},
  };
}
