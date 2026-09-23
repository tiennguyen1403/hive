import { describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { ORDERS } from "@/data/orders";
import type { AdminOrder } from "./admin-orders";
import {
  customerKey,
  customerRows,
  isCustomerKey,
  isShopper,
  ordersOfCustomer,
  sampleAccounts,
  type AdminCustomer,
} from "./admin-customers";
import { DEMO_ADMIN } from "./demo-admin";

/** The eight demo shoppers as `profiles` holds them, each with a made-up uuid. */
const SHOPPERS: AdminCustomer[] = CUSTOMERS.map((c, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  handle: String(c.id),
  name: c.name,
  email: c.email,
  phone: c.phone.replace(/\s/g, ""),
  joinedAt: c.joinedAt,
}));

const MANAGER: AdminCustomer = {
  id: "00000000-0000-4000-8000-0000000000aa",
  handle: DEMO_ADMIN.handle,
  name: DEMO_ADMIN.name,
  email: DEMO_ADMIN.email,
  phone: "",
  joinedAt: "2026-09-23T18:50:00+07:00",
};

/** Somebody who signed up through the form: no handle, no sample orders. */
const SIGNED_UP: AdminCustomer = {
  id: "00000000-0000-4000-8000-0000000000bb",
  handle: null,
  name: "Người Mới",
  email: "moi@example.test",
  phone: "",
  joinedAt: "2026-09-23T20:00:00+07:00",
};

/** The sample orders as `admin_orders()` returns them: each with its account. */
const BOOK: AdminOrder[] = ORDERS.map((o) => {
  const owner = SHOPPERS.find((c) => c.handle === String(o.customerId))!;
  return { ...o, owner };
});

const NOW = new Date("2026-09-20T18:50:00+07:00");

describe("who counts as a customer", () => {
  it("leaves the shop's own manager out", () => {
    expect(isShopper(MANAGER)).toBe(false);
    expect(SHOPPERS.every(isShopper)).toBe(true);
    expect(isShopper(SIGNED_UP)).toBe(true);
  });

  it("counts the sample accounts, not the sign-ups or the manager", () => {
    expect(sampleAccounts([...SHOPPERS, MANAGER, SIGNED_UP])).toBe(8);
  });
});

describe("addressing an account", () => {
  it("uses the fixture handle when there is one, the uuid otherwise", () => {
    expect(customerKey(SHOPPERS[0]!)).toBe("c-minhanh");
    expect(customerKey(SIGNED_UP)).toBe(SIGNED_UP.id);
  });

  it("answers to either", () => {
    expect(isCustomerKey(SHOPPERS[0]!, "c-minhanh")).toBe(true);
    expect(isCustomerKey(SHOPPERS[0]!, SHOPPERS[0]!.id)).toBe(true);
    expect(isCustomerKey(SHOPPERS[0]!, "c-namle")).toBe(false);
    expect(isCustomerKey(SIGNED_UP, "")).toBe(false);
  });
});

describe("orders of a customer", () => {
  it("matches on the account, so a sign-up with no handle still gets theirs", () => {
    const theirs: AdminOrder = { ...ORDERS[0]!, customerId: "" as never, owner: { ...SIGNED_UP } };
    expect(ordersOfCustomer([...BOOK, theirs], SIGNED_UP)).toEqual([theirs]);
  });

  it("finds the fixture's five for Trần Minh Anh", () => {
    expect(ordersOfCustomer(BOOK, SHOPPERS[0]!).map((o) => String(o.code)).sort()).toEqual(
      ORDERS.filter((o) => o.customerId === CUSTOMERS[0]!.id).map((o) => String(o.code)).sort(),
    );
  });

  it("gives a guest's order to nobody", () => {
    const guest: AdminOrder = { ...ORDERS[0]!, owner: null };
    for (const c of SHOPPERS) expect(ordersOfCustomer([guest], c)).toEqual([]);
  });
});

describe("customerRows", () => {
  const rows = customerRows(FIXTURE_CATALOG, [...SHOPPERS, MANAGER, SIGNED_UP], BOOK, 5, NOW);

  it("lists every shopper, the sign-up included, and not the manager", () => {
    expect(rows.map((r) => r.customer.email)).toEqual([...SHOPPERS, SIGNED_UP].map((c) => c.email));
  });

  it("derives the figures from their own orders", () => {
    const minhanh = rows[0]!.facts;
    expect(minhanh.orders).toHaveLength(5);
    expect(minhanh.spentVnd).toBeGreaterThan(0);
    expect(minhanh.last?.code).toBe("DH-2430");
  });

  it("has nothing to say about somebody who has not ordered", () => {
    const fresh = rows.at(-1)!.facts;
    expect(fresh.orders).toEqual([]);
    expect(fresh.spentVnd).toBe(0);
    expect(fresh.tag).toBeNull();
  });
});
