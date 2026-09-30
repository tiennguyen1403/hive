import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CUSTOMER_CANCEL_REASON,
  OVERDUE_REASON,
  effectiveOrder,
  effectiveStatus,
} from "./customer-orders";
import { ORDERS, orderByCode } from "@/data/orders";
import { orderCode, type Order } from "@/data/types";

/**
 * An order checkout placed for cash on delivery: taken, and nobody has paid.
 * The state the fixtures never needed and the database now issues.
 */
const RECEIVED: Order = {
  ...orderByCode.get(orderCode("DH-2430"))!,
  code: orderCode("DH-2432"),
  status: { state: "RECEIVED" },
  payment: "COD",
  codFeeVnd: 15_000,
  placedAt: "2026-09-20T19:00:00+07:00",
};

describe("a RECEIVED order — taken, nobody paid yet", () => {
  it("is not something the clock can cancel", () => {
    const late = new Date("2026-10-30T10:00:00+07:00");
    expect(effectiveStatus(RECEIVED, late)).toBe(RECEIVED.status);
  });
});

describe("effectiveStatus — the status is read off the clock", () => {
  const waiting = orderByCode.get(orderCode("DH-2430"))!; // due 21/09 19:50
  const shipping = orderByCode.get(orderCode("DH-2422"))!;

  it("leaves a transfer alone while the hold is still running", () => {
    const status = effectiveStatus(waiting, new Date("2026-09-21T19:49:00+07:00"));
    expect(status).toBe(waiting.status);
  });

  it("cancels it the moment the hold runs out", () => {
    const status = effectiveStatus(waiting, new Date("2026-09-21T19:50:00+07:00"));
    expect(status.state).toBe("CANCELLED");
    expect(status.state === "CANCELLED" && status.reason).toBe(OVERDUE_REASON);
  });

  it("stamps the DEADLINE, not the moment somebody looked", () => {
    // The pieces went back on the shelf at 19:50 on the 21st, whoever opens
    // the screen and whenever.
    const a = effectiveStatus(waiting, new Date("2026-09-22T10:00:00+07:00"));
    const b = effectiveStatus(waiting, new Date("2026-10-30T10:00:00+07:00"));
    expect(a.state === "CANCELLED" && a.cancelledAt).toBe("2026-09-21T19:50:00+07:00");
    expect(b).toEqual(a);
  });

  it("touches no other state", () => {
    const late = new Date("2026-10-30T10:00:00+07:00");
    for (const o of ORDERS) {
      if (o.status.state === "AWAITING_TRANSFER") continue;
      expect(effectiveStatus(o, late)).toBe(o.status);
      expect(effectiveOrder(o, late)).toBe(o);
    }
    expect(effectiveStatus(shipping, late)).toBe(shipping.status);
  });

  it("does not mutate the order it was handed", () => {
    effectiveOrder(waiting, new Date("2026-09-22T10:00:00+07:00"));
    expect(waiting.status.state).toBe("AWAITING_TRANSFER");
  });

  it("holds a card order exactly like a transfer: it pays by one (slice B7)", () => {
    const card: Order = { ...waiting, payment: "CARD" };
    expect(effectiveStatus(card, new Date("2026-09-21T19:49:00+07:00"))).toBe(card.status);
    const late = effectiveStatus(card, new Date("2026-09-22T10:00:00+07:00"));
    expect(late).toEqual({
      state: "CANCELLED",
      cancelledAt: "2026-09-21T19:50:00+07:00",
      reason: OVERDUE_REASON,
    });
  });
});

/**
 * The two reasons the database writes itself are the two constants the
 * screens compare against. If a migration respelled one — "khách hủy" with
 * the other accent, say — the Feed's reason line (`lib/feed-account.ts`)
 * would quietly take the wrong branch, with every other test still green.
 */
describe("the reasons the database writes are the ones the screens read", () => {
  const dir = join(process.cwd(), "supabase", "migrations");
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");

  it("cancels an overdue transfer with OVERDUE_REASON, verbatim", () => {
    expect(sql).toContain(`cancel_reason = '${OVERDUE_REASON}'`);
  });

  it("cancels at the shopper's request with CUSTOMER_CANCEL_REASON, verbatim", () => {
    expect(sql).toContain(`cancel_reason = '${CUSTOMER_CANCEL_REASON}'`);
  });
});
