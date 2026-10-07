import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, OrderCode } from "@/data/types";
import { orderByCode } from "@/data/orders";
import { lookedUpOf } from "@/lib/order-lookup";
import { formatPhone } from "@/lib/phone";

/**
 * `knownOrder` (slice B19) without a database: the order behind
 * `/track?code=…` when this browser may already see it — `loadReceipt`'s
 * answer, cut to what the lookup prints, with the number on the order for
 * COD's line — or null for anything else, a failure included.
 *
 * Replaced: `loadReceipt` (`./orders`), the clock, and the Stripe side.
 */

vi.mock("server-only", () => ({}));

const loadReceipt = vi.fn<(code: string) => Promise<Order | null>>();
vi.mock("./orders", () => ({ loadReceipt: (code: string) => loadReceipt(code) }));

const NOW = new Date("2026-09-20T18:50:00+07:00");
vi.mock("@/lib/clock", () => ({ demoNow: () => NOW, demoNowMs: () => NOW.getTime() }));

const reconcileCardOrder = vi.fn(async <T,>(order: T): Promise<T> => order);
vi.mock("./card-payments", () => ({ reconcileCardOrder: (order: unknown) => reconcileCardOrder(order) }));

const { knownOrder } = await import("./track-known");

const sample = (code: string): Order => orderByCode.get(code as OrderCode)!;

beforeEach(() => {
  loadReceipt.mockReset();
  reconcileCardOrder.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("knownOrder", () => {
  it("reads the receipt by the code as the app reads it, and hands the screen the lookup's cut", async () => {
    const order = sample("DH-2425");
    loadReceipt.mockResolvedValue(order);
    const known = await knownOrder(" dh2425 ");
    expect(loadReceipt).toHaveBeenCalledWith("DH-2425");
    // The number on the order, as the app prints numbers.
    expect(known).toEqual({ order: lookedUpOf(order), phone: formatPhone(order.shipTo.phone) });
  });

  it("asks nothing for something that is not a code", async () => {
    for (const code of ["", "abc", "DH-12", "<b>"]) expect(await knownOrder(code), code).toBeNull();
    expect(loadReceipt).not.toHaveBeenCalled();
  });

  it("answers null when this browser may not see the order, as for one that does not exist", async () => {
    loadReceipt.mockResolvedValue(null);
    expect(await knownOrder("DH-2425")).toBeNull();
  });

  it("judges the status by the clock: a transfer past its hold reads as cancelled", async () => {
    const waiting = { ...sample("DH-2430"), status: { state: "AWAITING_TRANSFER" as const, dueAt: "2026-09-20T08:00:00+07:00" } };
    loadReceipt.mockResolvedValue(waiting);
    expect((await knownOrder("DH-2430"))!.order.status.state).toBe("CANCELLED");
    expect(reconcileCardOrder).not.toHaveBeenCalled();
  });

  it("asks Stripe about a card order still waiting, and only about that", async () => {
    const card: Order = {
      ...sample("DH-2430"),
      payment: "CARD",
      status: { state: "AWAITING_TRANSFER", dueAt: "2026-09-21T06:00:00+07:00" },
    };
    loadReceipt.mockResolvedValue(card);
    await knownOrder("DH-2430");
    expect(reconcileCardOrder).toHaveBeenCalledTimes(1);
  });

  it("never throws: a receipt that cannot be read leaves the form, and a line in the log", async () => {
    loadReceipt.mockRejectedValue(new Error("receipt_order failed: boom"));
    expect(await knownOrder("DH-2425")).toBeNull();
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});
