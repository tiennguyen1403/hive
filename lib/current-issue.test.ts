import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import type { Drop, Product, ProductId } from "@/data/types";
import { buildCatalog, type Catalog } from "./catalog";
import { currentIssueNo } from "./current-issue";

/**
 * "Số hiện tại" (round v5 slice 5a, the user's rule of 01/10/2026): the issue
 * the overview counts, and the issue a customer's "mới" is read against. The
 * issue selling; between two issues, the one that closed last; before any
 * issue has opened, the old reading, `catalog.currentDropNo`.
 *
 * The fixture's clock: Số 05 sells from 20:00 11/09 to 20:00 25/09, Số 06 is
 * set for 20:00 02/10 to 20:00 16/10 and has only teasers.
 */
const SELLING = new Date("2026-09-20T18:50:00+07:00");
const BETWEEN = new Date("2026-09-28T12:00:00+07:00");
const SIX_SELLING = new Date("2026-10-05T12:00:00+07:00");
const BEFORE_ANY = new Date("2026-01-01T12:00:00+07:00");

/**
 * The fixture with one style added to an issue: what "Thêm mẫu" does when it
 * is left on its default issue, the next one, Số 06, which has not opened.
 */
function withStyleIn(no: number, drops: readonly Drop[] = FIXTURE_CATALOG.drops): Catalog {
  const model = FIXTURE_CATALOG.products.find((p) => p.dropNo === 5)!;
  const added: Product = {
    ...model,
    id: `p-test-s${no}` as ProductId,
    slug: `s${String(no).padStart(2, "0")}-thu`,
    name: "THỬ",
    dropNo: no,
  };
  return buildCatalog({
    products: [...FIXTURE_CATALOG.products, added],
    drops: [...drops],
    teasers: [...FIXTURE_CATALOG.teasers],
    promotions: [...FIXTURE_CATALOG.promotions],
  });
}

describe("currentIssueNo", () => {
  it("is the issue selling now", () => {
    expect(currentIssueNo(FIXTURE_CATALOG, SELLING)).toBe(5);
  });

  it("stays the issue selling when a style is added to the next one (the bug of 01/10)", () => {
    const catalog = withStyleIn(6);
    // The old reading moves to the issue that has not opened…
    expect(catalog.currentDropNo).toBe(6);
    // …the current issue does not.
    expect(currentIssueNo(catalog, SELLING)).toBe(5);
  });

  it("is the issue that closed last, between two issues", () => {
    expect(currentIssueNo(FIXTURE_CATALOG, BETWEEN)).toBe(5);
    expect(currentIssueNo(withStyleIn(6), BETWEEN)).toBe(5);
  });

  it("counts the closing instant as closed, and the opening instant as open", () => {
    expect(currentIssueNo(FIXTURE_CATALOG, new Date("2026-09-25T20:00:00+07:00"))).toBe(5);
    expect(currentIssueNo(withStyleIn(6), new Date("2026-10-02T20:00:00+07:00"))).toBe(6);
  });

  it("moves to the next issue once it sells", () => {
    expect(currentIssueNo(withStyleIn(6), SIX_SELLING)).toBe(6);
    // An issue selling with no style cut yet is still the one selling.
    expect(currentIssueNo(FIXTURE_CATALOG, SIX_SELLING)).toBe(6);
  });

  it("reads the closing hours, not the numbers, for the one that closed last", () => {
    // Numbers out of order, as a calendar could be before slice B14b: Số 06
    // ran and closed before Số 05 did.
    const drops: Drop[] = FIXTURE_CATALOG.drops.map((d) =>
      d.no === 6 ? { ...d, opensAt: "2026-07-01T20:00:00+07:00", closesAt: "2026-07-15T20:00:00+07:00" } : d,
    );
    expect(currentIssueNo(withStyleIn(6, drops), BETWEEN)).toBe(5);
  });

  it("keeps the old reading before any issue has opened", () => {
    expect(currentIssueNo(FIXTURE_CATALOG, BEFORE_ANY)).toBe(FIXTURE_CATALOG.currentDropNo);
    expect(currentIssueNo(withStyleIn(6), BEFORE_ANY)).toBe(6);
  });

  it("is 0 for a catalogue with no issue at all, as currentDropNo is", () => {
    const empty = buildCatalog({ products: [], drops: [], teasers: [], promotions: [] });
    expect(currentIssueNo(empty, SELLING)).toBe(0);
  });
});

describe("the Arc back office", () => {
  const DIR = join("components", "admin-arc");

  it("reads the current issue through currentIssueNo, never catalog.currentDropNo", () => {
    const readers = readdirSync(DIR)
      .filter((f) => f.endsWith(".tsx"))
      .filter((f) => readFileSync(join(DIR, f), "utf8").includes("currentDropNo"));
    expect(readers).toEqual([]);
  });

  it("asks it on the overview, an order's customer, the customers and a customer's page", () => {
    for (const file of [
      "ArcOverviewScreen.tsx",
      "ArcOrderScreen.tsx",
      "ArcCustomersScreen.tsx",
      "ArcCustomerScreen.tsx",
    ]) {
      expect(readFileSync(join(DIR, file), "utf8"), file).toContain("currentIssueNo(catalog, now)");
    }
  });
});
