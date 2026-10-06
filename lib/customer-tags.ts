import type { Catalog } from "./catalog";
import type { Order } from "@/data/types";
import { BOOKED_STATES } from "./admin-metrics";
import { effectiveOrder } from "./customer-orders";
import { picker, plural, type Locale } from "./i18n";
import { LEX, issueLabel, lexicon } from "./lexicon";
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
 * In English (round v6 slice E4) the labels read "3 drops in a row",
 * "returning", "new", and their reasons the same way; the keys stay.
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

/**
 * Which issue an order belongs to — the issue its first line was cut for.
 * Since slice B5 a line can be a fixed style, which belongs to no issue, so
 * it is the first line that WAS cut for one; an order of fixed styles only
 * belongs to none.
 */
export function issueOf(catalog: Catalog, order: Order): number | undefined {
  for (const line of order.lines) {
    const no = catalog.byId.get(line.productId)?.dropNo;
    if (no !== undefined && no !== null) return no;
  }
  return undefined;
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
 * `openIssueNo` is the issue "mới" is read against, or null for none. The v3
 * screens pass the issue selling right now, or null between two. Since round
 * v5 slice 5a the Arc screens pass `currentIssueNo` (`lib/current-issue.ts`,
 * the user's rule of 01/10/2026): the issue selling, else the one that closed
 * last, so between two issues a customer whose first order was in the issue
 * just closed is still "mới", and never one whose first order is older.
 */
export function customerFacts(
  catalog: Catalog,
  placed: Order[],
  openIssueNo: number | null,
  now: Date,
  locale: Locale = "vi",
): CustomerFacts {
  const orders = placed
    .map((o) => effectiveOrder(o, now))
    .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
  const booked = orders.filter((o) => BOOKED.has(o.status.state));
  const issues = [
    ...new Set(
      booked.map((o) => issueOf(catalog, o)).filter((n): n is number => n !== undefined),
    ),
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
    // Waiting on the shop: a transfer to confirm, a paid order to hand over,
    // and since slice B3a an order taken and not yet paid for (RECEIVED).
    pending: orders.some(
      (o) =>
        o.status.state === "AWAITING_TRANSFER" ||
        o.status.state === "RECEIVED" ||
        o.status.state === "PAID",
    ),
    tag: tagOf(catalog, booked.length, streak, oldest, openIssueNo, locale),
  };
}

function tagOf(
  catalog: Catalog,
  bookedCount: number,
  streak: number,
  oldest: Order | undefined,
  openIssueNo: number | null,
  locale: Locale,
): CustomerTag | null {
  const t = picker(locale);
  if (streak >= LOYAL_ISSUES) {
    return {
      key: "loyal",
      label: t({ vi: `${streak} ${LEX.tl} liên tiếp`, en: `${plural(streak, "drop", "drops")} in a row` }),
      tone: "",
    };
  }
  if (bookedCount >= RETURNING_ORDERS) {
    return { key: "returning", label: t({ vi: "quay lại", en: "returning" }), tone: "back" };
  }
  if (oldest && openIssueNo !== null && issueOf(catalog, oldest) === openIssueNo) {
    return { key: "new", label: t({ vi: "mới", en: "new" }), tone: "new" };
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

/** "Số 03 · 04 · 05" — which issues this person has bought in; in English "Drop 03 · 04 · 05". */
export function issuesLabel(issues: number[], locale: Locale = "vi"): string {
  if (issues.length === 0) return "—";
  return `${lexicon(locale).t} ${issues.map((n) => String(n).padStart(2, "0")).join(" · ")}`;
}

/**
 * Why a person carries their label, in the numbers it was read from (v3's
 * words, a customer's own page): "mua ở 3 số liên tiếp (Số 03 · 04 · 05)",
 * "2 đơn đã thanh toán", "đơn đầu là DH-2430, trong Số 05".
 *
 * "mới" names the issue it was read against, `current` (the user, 01/10/2026,
 * round v5 slice 5b). Since slice 5a that is `currentIssueNo`: the issue
 * selling, and between two issues the one that closed last, so the words
 * "trong số đang bán" were wrong there. Pass the number the facts were read
 * with, so the line and the label cannot name two issues.
 */
export function tagReason(
  key: CustomerTagKey,
  facts: CustomerFacts,
  current: number | null,
  locale: Locale = "vi",
): string {
  const t = picker(locale);
  if (key === "loyal") {
    const issues = issuesLabel(facts.issues, locale);
    return t({
      vi: `mua ở ${facts.streak} ${LEX.tl} liên tiếp (${issues})`,
      en: `bought in ${plural(facts.streak, "drop", "drops")} in a row (${issues})`,
    });
  }
  if (key === "returning") {
    return t({
      vi: `${facts.booked.length} đơn đã thanh toán`,
      en: plural(facts.booked.length, "paid order", "paid orders"),
    });
  }
  // "mới" holds exactly one paid order: the first is the only one.
  const first = facts.booked[0]?.code ?? "—";
  const words = currentIssueWords(current, locale);
  return t({ vi: `đơn đầu là ${first}, trong ${words}`, en: `first order ${first}, in ${words}` });
}

/**
 * The line for a person with no label yet: what either label would take,
 * "Chưa đủ để gắn nhãn nào: cần ≥ 2 đơn đã thanh toán, hoặc đơn đầu trong
 * Số 05." (the user, 01/10/2026), with the issue "mới" is read against.
 */
export function untaggedReason(current: number | null, locale: Locale = "vi"): string {
  const words = currentIssueWords(current, locale);
  return picker(locale)({
    vi: `Chưa đủ để gắn nhãn nào: cần ≥ ${RETURNING_ORDERS} đơn đã thanh toán, hoặc đơn đầu trong ${words}.`,
    en: `Not enough for a label yet: needs ≥ ${RETURNING_ORDERS} paid orders, or a first order in ${words}.`,
  });
}

/**
 * "Số 05". A catalogue with no issue at all has no number to name, and no
 * customer can be "mới" in it: the line keeps the words it had before 01/10.
 */
function currentIssueWords(current: number | null, locale: Locale): string {
  if (current === null) return picker(locale)({ vi: `${LEX.tl} đang bán`, en: "the live drop" });
  return issueLabel(current, locale);
}
