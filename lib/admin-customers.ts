import type { Address } from "@/data/types";
import type { AdminOrder } from "./admin-orders";
import type { Catalog } from "./catalog";
import { customerFacts, type CustomerFacts } from "./customer-tags";
import { DEMO_ADMIN } from "./demo-admin";

/**
 * Who the shop's customers are, since slice B3a: the rows of
 * `public.profiles` — the eight demo shoppers AND everybody who signed up —
 * with what their orders say about them. Until this slice the table was
 * `data/customers.ts`, which could only ever list the eight.
 *
 * Nothing about a person is typed in here. The order count, the money that
 * arrived and the latest order come from their orders, through the same
 * `customerFacts` the labels have always used (`lib/customer-tags.ts`), so a
 * figure on the table and one on the profile cannot disagree.
 */

/** One account, as the back office lists it. */
export interface AdminCustomer {
  /** `profiles.id`, the auth uuid. */
  id: string;
  /** "c-minhanh" for a demo shopper, null for somebody who signed up. */
  handle: string | null;
  /** Shown as-is. */
  name: string;
  email: string;
  /** Ten digits starting with zero, or "" — the sign-up form does not ask. */
  phone: string;
  joinedAt: string;
}

/** The same, with the address book the profile screen shows the default of. */
export interface AdminCustomerDetail extends AdminCustomer {
  addresses: Address[];
}

/**
 * The shop's own manager has a profile like anybody (every auth user gets
 * one), and is not one of its customers. Recognised by the handle
 * `scripts/seed-users.ts` gives the account (`lib/demo-admin.ts`).
 */
export function isShopper(profile: { handle: string | null }): boolean {
  return profile.handle !== DEMO_ADMIN.handle;
}

/**
 * How the back office addresses an account in its URLs: the fixture handle
 * when there is one (`/admin/customers/c-minhanh`, the addresses the screens
 * were built with), the uuid otherwise.
 */
export function customerKey(customer: { id: string; handle: string | null }): string {
  return customer.handle ?? customer.id;
}

/** Whether a URL's `key` names this account — by handle or by uuid. */
export function isCustomerKey(customer: { id: string; handle: string | null }, key: string): boolean {
  return key !== "" && (key === customer.id || key === customer.handle);
}

/** Every order this account placed — matched on the account, not on a name. */
export function ordersOfCustomer(orders: AdminOrder[], customer: { id: string }): AdminOrder[] {
  return orders.filter((o) => o.owner?.id === customer.id);
}

export interface CustomerRow {
  customer: AdminCustomer;
  facts: CustomerFacts;
}

/**
 * The customer table: every shopper, in the order the list was read (oldest
 * account first), each with the facts their own orders give.
 */
export function customerRows(
  catalog: Catalog,
  customers: AdminCustomer[],
  orders: AdminOrder[],
  openIssueNo: number | null,
  now: Date,
): CustomerRow[] {
  return customers.filter(isShopper).map((customer) => ({
    customer,
    facts: customerFacts(catalog, ordersOfCustomer(orders, customer), openIssueNo, now),
  }));
}

