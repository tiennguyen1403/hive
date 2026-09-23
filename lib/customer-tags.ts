import { byId } from "@/data/catalog";
import type { Order } from "@/data/types";
import { BOOKED_STATES } from "./admin-metrics";
import { effectiveOrder } from "./customer-orders";
import { LEX } from "./lexicon";
import { orderTotalVnd } from "./orders";

/**
 * What kind of customer somebody is, READ OFF THEIR ORDERS.
 *
 * The mock drew labels on this table — "thân thiết", "quay lại", "mới" — and
 * a label typed onto a person is the exact thing DESIGN.md §9 rule 1 forbids:
 * nothing in `data/customers.ts` records loyalty, and a field for it would be
 * a number somebody made up. So the label is DERIVED, and the screen prints
 * the three thresholds beside the table so the reader can check the working.
 *
 * The thresholds are the user's, settled 22/09/2026:
 *
 *   · **thân thiết** — bought in three or more CONSECUTIVE issues. Three
 *     issues is nine months of this shop's calendar, and consecutive is what
 *     separates a habit from three purchases that happen to be three.
 *   · **quay lại** — two or more orders. Came back once.
 *   · **mới** — their first order is in the issue that is open right now.
 *
 * Strongest wins: somebody with four orders across three straight issues is
 * "thân thiết" and not "quay lại", because the weaker label would be the
 * screen under-reporting what it knows.
 *
 * ONLY ORDERS THE SHOP WAS PAID FOR COUNT. A cancelled order is money that
 * never arrived and a shelf that was never emptied; counting it would inflate
 * the label of exactly the person who did not buy. Every status is read
 * through `effectiveStatus`, so an unpaid transfer past its deadline is
 * already cancelled here too (`lib/customer-orders.ts`).
 */

export const LOYAL_ISSUES = 3;
export const RETURNING_ORDERS = 2;

const BOOKED = new Set<string>(BOOKED_STATES);

export type CustomerTagKey = "loyal" | "returning" | "new";

export interface CustomerTag {
  key: CustomerTagKey;
  /** Shown as-is, in the pale honey `.ctag`. */
  label: string;
  /** The `.ctag` modifier: "" honey, "back" green, "new" blue. */
  tone: "" | "back" | "new";
}

export interface CustomerFacts {
  /** Every order the person placed, newest first, status read off the clock. */
  orders: Order[];
  /** Of those, the ones the shop was really paid for. */
  booked: Order[];
  /** Issue numbers they bought in, ascending. */
  issues: number[];
  /** The longest run of consecutive issue numbers among them. */
  streak: number;
  /** Booked money only — the column header says so. */
  spentVnd: number;
  /** The newest order, whatever state it is in. */
  last?: Order;
  /** Something of theirs is waiting on the shop right now. */
  pending: boolean;
  tag: CustomerTag | null;
}

/** Which issue an order belongs to — the issue its first line was cut for. */
export function issueOf(order: Order): number | undefined {
  const first = order.lines[0];
  return first ? byId.get(first.productId)?.dropNo : undefined;
}

/** `[3,4,5]` → 3; `[3,5]` → 1. The longest unbroken run. */
export function longestStreak(issues: number[]): number {
  const sorted = [...new Set(issues)].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const n of sorted) {
    run = previous !== null && n === previous + 1 ? run + 1 : 1;
    previous = n;
    if (run > best) best = run;
  }
  return best;
}

/**
 * Everything the table and the profile need about one person.
 *
 * `openIssueNo` is the issue selling right now, or null between two — which
 * is why "mới" simply does not apply then, rather than quietly falling back
 * to the newest issue and calling three-month-old customers new.
 */
export function customerFacts(
  placed: Order[],
  openIssueNo: number | null,
  now: Date,
): CustomerFacts {
  const orders = placed
    .map((o) => effectiveOrder(o, now))
    .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
  const booked = orders.filter((o) => BOOKED.has(o.status.state));
  const issues = [
    ...new Set(booked.map(issueOf).filter((n): n is number => n !== undefined)),
  ].sort((a, b) => a - b);
  const streak = longestStreak(issues);
  const oldest = booked[booked.length - 1];

  return {
    orders,
    booked,
    issues,
    streak,
    spentVnd: booked.reduce((n, o) => n + orderTotalVnd(o), 0),
    ...(orders[0] ? { last: orders[0] } : {}),
    pending: orders.some(
      (o) => o.status.state === "AWAITING_TRANSFER" || o.status.state === "PAID",
    ),
    tag: tagOf(booked.length, streak, oldest, openIssueNo),
  };
}

function tagOf(
  bookedCount: number,
  streak: number,
  oldest: Order | undefined,
  openIssueNo: number | null,
): CustomerTag | null {
  if (streak >= LOYAL_ISSUES) {
    return { key: "loyal", label: `${streak} ${LEX.tl} liên tiếp`, tone: "" };
  }
  if (bookedCount >= RETURNING_ORDERS) {
    return { key: "returning", label: "quay lại", tone: "back" };
  }
  if (oldest && openIssueNo !== null && issueOf(oldest) === openIssueNo) {
    return { key: "new", label: "mới", tone: "new" };
  }
  return null;
}

/** The tabs over the customer table. */
export type CustomerGroup = "all" | "loyal" | "returning" | "new" | "pending";

export function inGroup(group: CustomerGroup, facts: CustomerFacts): boolean {
  switch (group) {
    case "all":
      return true;
    case "pending":
      return facts.pending;
    default:
      return facts.tag?.key === group;
  }
}

/** `?group=` from the URL, or "all". An unlisted value is not honoured. */
export function customerGroup(raw: string | string[] | undefined): CustomerGroup {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "loyal" || v === "returning" || v === "new" || v === "pending" ? v : "all";
}

/** "Số 03 · 04 · 05" — which issues this person has bought in. */
export function issuesLabel(issues: number[]): string {
  if (issues.length === 0) return "—";
  return `${LEX.t} ${issues.map((n) => String(n).padStart(2, "0")).join(" · ")}`;
}

/** The legend the table prints beside its search box, in one place. */
export function tagLegend(): string {
  return (
    `Thân thiết: mua ≥ ${LOYAL_ISSUES} ${LEX.tl} liên tiếp · ` +
    `Quay lại: ≥ ${RETURNING_ORDERS} đơn · ` +
    `Mới: đơn đầu trong ${LEX.tl} đang bán`
  );
}
