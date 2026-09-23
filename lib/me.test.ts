import { describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { ordersOf } from "@/data/orders";
import { customerId } from "@/data/types";
import { fixtureOrdersOf, type Me } from "./me";

const DEMO: Me = {
  id: customerId("7a40b83b-aeb3-465f-b632-d28a1e2943af"),
  handle: CUSTOMERS[0]!.id,
  name: CUSTOMERS[0]!.name,
  email: CUSTOMERS[0]!.email,
  phone: "0912345678",
  joinedAt: "2026-03-08T21:14:00+07:00",
};

describe("fixtureOrdersOf", () => {
  it("finds the sample orders by handle, not by the auth uuid", () => {
    // The orders in `data/orders.ts` are keyed by 'c-minhanh' and stay that
    // way until slice B2. Looking them up by the uuid would quietly return
    // nothing for every demo account.
    expect(fixtureOrdersOf(DEMO)).toEqual(ordersOf(CUSTOMERS[0]!.id));
    expect(fixtureOrdersOf(DEMO).length).toBeGreaterThan(0);
  });

  it("gives an account with no handle an empty list, not somebody else's", () => {
    // Somebody who signed up a minute ago has not bought anything, and that
    // is the honest answer rather than a missing case.
    expect(fixtureOrdersOf({ ...DEMO, handle: null })).toEqual([]);
  });

  it("never mixes two accounts' orders", () => {
    const other = { ...DEMO, handle: CUSTOMERS[1]!.id };
    const mine = new Set(fixtureOrdersOf(DEMO).map((o) => String(o.code)));
    for (const order of fixtureOrdersOf(other)) {
      expect(mine.has(String(order.code))).toBe(false);
    }
  });
});
