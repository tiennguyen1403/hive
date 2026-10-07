import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/data/types";
import type { Locale } from "@/lib/i18n";

/**
 * Slice B18's two doors to Stripe, without Stripe: `payByCard` ("Trả bằng
 * thẻ") and the card branch of `placeOrderAction`. What is checked before
 * anything is spent, which token is spent, whose order may be paid for, and
 * that the answer is a redirect to Stripe's page (or to the receipt) — never
 * a page that loads with nothing. The request is English, so every sentence
 * is checked in English; the Vietnamese ones are `lib/card-checkout.test.ts`'s.
 *
 * Replaced: the request's language and headers, the rate limit, the session,
 * the orders' Data Access Layer, the Stripe side (`lib/db/card-payments.ts`),
 * `redirect` and `revalidatePath`.
 */

vi.mock("@/lib/locale", () => ({ getActionLocale: async (): Promise<Locale> => "en" }));

// The app's clock, held still: the order below is inside its hold at this instant, whatever day the test runs.
const NOW = Date.parse("2026-10-07T20:00:00+07:00");
vi.mock("@/lib/clock", () => ({ demoNow: () => new Date(NOW), demoNowMs: () => NOW }));

type Pace = { ok: true } | { ok: false; retryAfterSeconds: number; message: string };
let pace: Pace = { ok: true };
const takeRate = vi.fn(async (_bucket: string, _cost?: number, _locale?: Locale): Promise<Pace> => pace);
vi.mock("@/lib/db/rate-limit", () => ({
  takeRate: (bucket: string, cost?: number, locale?: Locale) => takeRate(bucket, cost, locale),
}));

vi.mock("@/lib/db/session", () => ({ getSession: async () => null, requireSession: async () => ({}) }));

let requestHeaders = new Headers({ host: "127.0.0.1:3200", "x-forwarded-host": "127.0.0.1:3200", "x-forwarded-proto": "http" });
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));

class Redirect extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
}));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

const DUE = "2026-10-08T07:00:00+07:00";
const CARD_ORDER: Order = {
  code: "DH-2440" as Order["code"],
  customerId: "" as Order["customerId"],
  lines: [{ productId: "p-khoi" as Order["lines"][number]["productId"], size: "M", color: "black", qty: 1, unitPriceVnd: 390_000 }],
  status: { state: "AWAITING_TRANSFER", dueAt: DUE },
  payment: "CARD",
  delivery: "STANDARD",
  shippingFeeVnd: 30_000,
  codFeeVnd: 0,
  discountVnd: 0,
  shipTo: { recipient: "Trần Minh Anh", phone: "0912345678", line: "24 Nguyễn Thị Minh Khai", provinceCode: "79", wardCode: "26734" },
  email: null,
  note: "",
  placedAt: "2026-10-07T19:00:00+07:00",
};

class OrderError extends Error {
  constructor(readonly failure: string) {
    super(`order refused: ${failure}`);
  }
}
const loadReceipt = vi.fn(async (_code: string): Promise<Order | null> => CARD_ORDER);
const loadPlacedOrder = vi.fn(async (_receipt: unknown): Promise<Order | null> => CARD_ORDER);
const placeOrder = vi.fn(async (_input: unknown, _now: string) => ({ code: "DH-2440", accessKey: "k" }));
vi.mock("@/lib/db/orders", () => ({
  OrderError,
  placeOrder: (input: unknown, now: string) => placeOrder(input, now),
  cancelOrder: async () => undefined,
  rememberGuestReceipt: async () => undefined,
  loadReceipt: (code: string) => loadReceipt(code),
  loadPlacedOrder: (receipt: unknown) => loadPlacedOrder(receipt),
}));

type Opened =
  | { kind: "OPENED"; url: string }
  | { kind: "PAID" }
  | { kind: "NOT_ALLOWED" }
  | { kind: "UNAVAILABLE" };
let opened: Opened = { kind: "OPENED", url: "https://checkout.stripe.com/c/pay/cs_test_new0001" };
const openCardCheckout = vi.fn(async (_order: Order, _origin: string, _locale: Locale): Promise<Opened> => opened);
vi.mock("@/lib/db/card-payments", () => ({
  openCardCheckout: (order: Order, origin: string, locale: Locale) => openCardCheckout(order, origin, locale),
}));

const { payByCard, placeOrderAction } = await import("./orders");

const IDLE = { message: null };
const form = (code: unknown) => {
  const data = new FormData();
  if (typeof code === "string") data.set("code", code);
  return data;
};

/** What the action did: the URL it redirected to, or the state it answered. */
async function run(code: unknown): Promise<{ redirect: string } | { state: { message: string | null } }> {
  try {
    return { state: await payByCard(IDLE, form(code)) };
  } catch (error) {
    if (error instanceof Redirect) return { redirect: error.url };
    throw error;
  }
}

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  pace = { ok: true };
  opened = { kind: "OPENED", url: "https://checkout.stripe.com/c/pay/cs_test_new0001" };
  requestHeaders = new Headers({ host: "127.0.0.1:3200", "x-forwarded-host": "127.0.0.1:3200", "x-forwarded-proto": "http" });
  takeRate.mockClear();
  loadReceipt.mockClear();
  loadReceipt.mockResolvedValue(CARD_ORDER);
  loadPlacedOrder.mockClear();
  loadPlacedOrder.mockResolvedValue(CARD_ORDER);
  openCardCheckout.mockClear();
  placeOrder.mockClear();
  revalidatePath.mockClear();
  logged?.mockRestore();
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("payByCard ('Trả bằng thẻ')", () => {
  it("sends the shopper to Stripe's page, made for the order the page showed, on the origin they are on", async () => {
    expect(await run(" dh-2440 ")).toEqual({ redirect: "https://checkout.stripe.com/c/pay/cs_test_new0001" });
    expect(loadReceipt).toHaveBeenCalledWith("DH-2440");
    expect(openCardCheckout).toHaveBeenCalledWith(CARD_ORDER, "http://127.0.0.1:3200", "en");
  });

  it("spends one token of order_place, in the request's language, before Stripe is asked", async () => {
    await run("DH-2440");
    expect(takeRate).toHaveBeenCalledTimes(1);
    expect(takeRate).toHaveBeenCalledWith("order_place", 1, "en");
    expect(takeRate.mock.invocationCallOrder[0]!).toBeLessThan(openCardCheckout.mock.invocationCallOrder[0]!);
  });

  it("answers the rate limit's own sentence and asks nobody else", async () => {
    pace = { ok: false, retryAfterSeconds: 120, message: "Too many tries in a row. Try again in 2 minutes." };
    expect(await run("DH-2440")).toEqual({ state: { message: "Too many tries in a row. Try again in 2 minutes." } });
    expect(loadReceipt).not.toHaveBeenCalled();
    expect(openCardCheckout).not.toHaveBeenCalled();
  });

  it("refuses something that is not an order code without spending a token", async () => {
    for (const code of [undefined, "", "DH-12", "<script>"]) {
      expect(await run(code)).toEqual({ state: { message: "This order is no longer awaiting card payment." } });
    }
    expect(takeRate).not.toHaveBeenCalled();
  });

  it("answers somebody else's order, or none, as an order that cannot be paid: the code learns nothing", async () => {
    loadReceipt.mockResolvedValue(null);
    expect(await run("DH-2439")).toEqual({ state: { message: "This order is no longer awaiting card payment." } });
    expect(openCardCheckout).not.toHaveBeenCalled();
  });

  it("reads the order by the clock: past its hold it is cancelled, and nothing opens for it", async () => {
    loadReceipt.mockResolvedValue({ ...CARD_ORDER, status: { state: "AWAITING_TRANSFER", dueAt: "2026-10-01T07:00:00+07:00" } });
    await run("DH-2440");
    expect(openCardCheckout.mock.calls[0]![0].status).toMatchObject({ state: "CANCELLED", reason: "quá hạn thanh toán" });
  });

  it("says so when the order cannot be paid now, or no page opened", async () => {
    opened = { kind: "NOT_ALLOWED" };
    expect(await run("DH-2440")).toEqual({ state: { message: "This order is no longer awaiting card payment." } });
    opened = { kind: "UNAVAILABLE" };
    expect(await run("DH-2440")).toEqual({ state: { message: "Couldn't open the payment page. Try again in a few minutes." } });
    loadReceipt.mockRejectedValueOnce(new Error("receipt_order failed"));
    expect(await run("DH-2440")).toEqual({ state: { message: "Couldn't open the payment page. Try again in a few minutes." } });
    requestHeaders = new Headers({ host: "evil.example/path", "x-forwarded-proto": "http" });
    expect(await run("DH-2440")).toEqual({ state: { message: "Couldn't open the payment page. Try again in a few minutes." } });
  });

  it("sends the shopper to the receipt when the order turned out paid a moment ago", async () => {
    opened = { kind: "PAID" };
    expect(await run("DH-2440")).toEqual({ redirect: "/order-confirmed/DH-2440" });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("placeOrderAction, paying by card", () => {
  const payload = (payment: string) => ({
    lines: [{ productId: "p-khoi", color: "black", size: "M", qty: 1 }],
    draft: {
      recipient: "Trần Minh Anh",
      phone: "0912 345 678",
      email: "",
      provinceCode: "29",
      wardCode: "70101063",
      line: "24 Nguyễn Thị Minh Khai",
      note: "",
      delivery: "STANDARD",
      payment,
    },
    promoCode: null,
  });

  async function place(payment: string): Promise<{ redirect: string } | { result: unknown }> {
    try {
      return { result: await placeOrderAction(payload(payment)) };
    } catch (error) {
      if (error instanceof Redirect) return { redirect: error.url };
      throw error;
    }
  }

  it("places the order as before, then redirects to the Stripe page made from the order read back", async () => {
    expect(await place("CARD")).toEqual({ redirect: "https://checkout.stripe.com/c/pay/cs_test_new0001" });
    expect(placeOrder).toHaveBeenCalledTimes(1);
    expect(loadPlacedOrder).toHaveBeenCalledWith({ code: "DH-2440", accessKey: "k" });
    expect(openCardCheckout).toHaveBeenCalledWith(CARD_ORDER, "http://127.0.0.1:3200", "en");
    // Placing spent its two tokens; the Stripe page spends none.
    expect(takeRate.mock.calls.map(([bucket]) => bucket)).toEqual(["order_place", "order_units"]);
  });

  it("keeps the order and says no page opened when Stripe cannot make one", async () => {
    opened = { kind: "UNAVAILABLE" };
    expect(await place("CARD")).toEqual({ result: { ok: true, code: "DH-2440", payment: "FAILED" } });
    loadPlacedOrder.mockResolvedValueOnce(null);
    expect(await place("CARD")).toEqual({ result: { ok: true, code: "DH-2440", payment: "FAILED" } });
  });

  it("leaves every other way to pay exactly as it was", async () => {
    expect(await place("COD")).toEqual({ result: { ok: true, code: "DH-2440" } });
    expect(await place("BANK_TRANSFER")).toEqual({ result: { ok: true, code: "DH-2440" } });
    expect(openCardCheckout).not.toHaveBeenCalled();
  });
});
