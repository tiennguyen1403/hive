import { describe, it, expect } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { ORDERS, ordersOf } from "@/data/orders";
import type { Order } from "@/data/types";
import {
  LOYAL_ISSUES,
  RETURNING_ORDERS,
  customerFacts,
  customerGroup,
  inGroup,
  issueOf,
  issuesLabel,
  longestStreak,
  tagLegend,
} from "./customer-tags";

/** Inside issue 05's window, after every order in the fixtures. */
const NOW = new Date("2026-09-20T18:50:00+07:00");
const OPEN = 5;

describe("longestStreak", () => {
  it("counts a run of consecutive issues", () => {
    expect(longestStreak([3, 4, 5])).toBe(3);
  });

  it("breaks the run at a gap", () => {
    expect(longestStreak([3, 5])).toBe(1);
    expect(longestStreak([3, 4, 6, 7])).toBe(2);
  });

  it("ignores order and repeats", () => {
    expect(longestStreak([5, 3, 4, 4, 5])).toBe(3);
  });

  it("is zero for somebody who has bought nothing", () => {
    expect(longestStreak([])).toBe(0);
  });
});

describe("issueOf", () => {
  it("reads the issue off the style that was ordered", () => {
    const order = ORDERS.find((o) => o.code === "DH-2429")!;
    expect(issueOf(FIXTURE_CATALOG, order)).toBe(5);
  });

  it("answers for every order in the book", () => {
    for (const o of ORDERS) expect(issueOf(FIXTURE_CATALOG, o)).toBeGreaterThan(0);
  });
});

describe("the label is derived, never typed", () => {
  it("calls somebody who bought in three straight issues thân thiết", () => {
    const facts = customerFacts(FIXTURE_CATALOG, ordersOf(CUSTOMERS[0]!.id), OPEN, NOW);
    const streaky = CUSTOMERS.map((c) => customerFacts(FIXTURE_CATALOG, ordersOf(c.id), OPEN, NOW)).filter(
      (f) => f.streak >= LOYAL_ISSUES,
    );
    expect(streaky.length).toBeGreaterThan(0);
    for (const f of streaky) {
      expect(f.tag?.key).toBe("loyal");
      expect(f.tag?.label).toBe(`${f.streak} số liên tiếp`);
      expect(f.tag?.tone).toBe("");
    }
    expect(facts.orders.length).toBeGreaterThan(0);
  });

  it("calls somebody with two paid orders and no streak quay lại", () => {
    const back = CUSTOMERS.map((c) => customerFacts(FIXTURE_CATALOG, ordersOf(c.id), OPEN, NOW)).filter(
      (f) => f.streak < LOYAL_ISSUES && f.booked.length >= RETURNING_ORDERS,
    );
    expect(back.length).toBeGreaterThan(0);
    for (const f of back) {
      expect(f.tag?.key).toBe("returning");
      expect(f.tag?.label).toBe("quay lại");
      expect(f.tag?.tone).toBe("back");
    }
  });

  it("calls somebody whose first paid order is in the open issue mới", () => {
    const fresh = CUSTOMERS.map((c) => customerFacts(FIXTURE_CATALOG, ordersOf(c.id), OPEN, NOW)).filter(
      (f) => f.tag?.key === "new",
    );
    for (const f of fresh) {
      expect(f.booked.length).toBe(1);
      expect(issueOf(FIXTURE_CATALOG, f.booked[0]!)).toBe(OPEN);
      expect(f.tag?.tone).toBe("new");
    }
  });

  it("prefers the strongest label when two apply", () => {
    const loyal = CUSTOMERS.map((c) => customerFacts(FIXTURE_CATALOG, ordersOf(c.id), OPEN, NOW)).find(
      (f) => f.streak >= LOYAL_ISSUES && f.booked.length >= RETURNING_ORDERS,
    );
    expect(loyal?.tag?.key).toBe("loyal");
  });

  it("labels nobody who has never been paid for", () => {
    const facts = customerFacts(FIXTURE_CATALOG, [], OPEN, NOW);
    expect(facts.tag).toBeNull();
    expect(facts.spentVnd).toBe(0);
    expect(facts.issues).toEqual([]);
  });

  it("does not call anybody new between two issues", () => {
    for (const c of CUSTOMERS) {
      const facts = customerFacts(FIXTURE_CATALOG, ordersOf(c.id), null, NOW);
      expect(facts.tag?.key).not.toBe("new");
    }
  });
});

describe("only money that arrived counts", () => {
  const cancelled: Order[] = ORDERS.filter((o) => o.status.state === "CANCELLED");

  it("the fixtures hold cancellations to test with", () => {
    expect(cancelled.length).toBeGreaterThan(0);
  });

  it("a cancelled order adds nothing to the spend or to the issues", () => {
    const one = cancelled[0]!;
    const facts = customerFacts(FIXTURE_CATALOG, [one], OPEN, NOW);
    expect(facts.booked).toEqual([]);
    expect(facts.spentVnd).toBe(0);
    expect(facts.issues).toEqual([]);
    expect(facts.tag).toBeNull();
    // It is still on the record: the count of orders placed includes it.
    expect(facts.orders).toHaveLength(1);
  });

  it("an unpaid transfer past its deadline is already cancelled here", () => {
    const waiting = ORDERS.find((o) => o.status.state === "AWAITING_TRANSFER")!;
    const dueAt = waiting.status.state === "AWAITING_TRANSFER" ? waiting.status.dueAt : "";
    const after = new Date(Date.parse(dueAt) + 60_000);
    const facts = customerFacts(FIXTURE_CATALOG, [waiting], OPEN, after);
    expect(facts.booked).toEqual([]);
    expect(facts.orders[0]!.status.state).toBe("CANCELLED");
  });

  it("an unpaid transfer inside its deadline is still waiting on the shop", () => {
    const waiting = ORDERS.find((o) => o.status.state === "AWAITING_TRANSFER")!;
    const before = new Date(Date.parse(waiting.placedAt) + 60_000);
    expect(customerFacts(FIXTURE_CATALOG, [waiting], OPEN, before).pending).toBe(true);
  });
});

describe("the groups", () => {
  it("puts everybody in Tất cả", () => {
    for (const c of CUSTOMERS) {
      expect(inGroup("all", customerFacts(FIXTURE_CATALOG, ordersOf(c.id), OPEN, NOW))).toBe(true);
    }
  });

  it("puts each labelled person in exactly their own group", () => {
    for (const c of CUSTOMERS) {
      const facts = customerFacts(FIXTURE_CATALOG, ordersOf(c.id), OPEN, NOW);
      for (const key of ["loyal", "returning", "new"] as const) {
        expect(inGroup(key, facts)).toBe(facts.tag?.key === key);
      }
    }
  });

  it("reads ?group= and refuses anything else", () => {
    expect(customerGroup("loyal")).toBe("loyal");
    expect(customerGroup(["new"])).toBe("new");
    expect(customerGroup("vip")).toBe("all");
    expect(customerGroup(undefined)).toBe("all");
  });
});

describe("what the screen prints", () => {
  it("names the issues in the shop's own word", () => {
    expect(issuesLabel([3, 4, 5])).toBe("Số 03 · 04 · 05");
    expect(issuesLabel([])).toBe("—");
  });

  it("states the three thresholds it actually applied", () => {
    expect(tagLegend()).toContain(`≥ ${LOYAL_ISSUES} số liên tiếp`);
    expect(tagLegend()).toContain(`≥ ${RETURNING_ORDERS} đơn`);
    expect(tagLegend()).toContain("đơn đầu trong số đang bán");
  });
});
