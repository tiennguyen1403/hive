import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { SIZES } from "@/data/types";
import { buildCatalog } from "@/lib/catalog";
import { parseCatalogSnapshot } from "./catalog-snapshot";
import type { Database } from "./database.types";

/**
 * The claim this slice actually makes: the catalogue read out of Postgres is
 * the SAME catalogue the fixture describes, style by style, colour by colour,
 * unit by unit. Everything else — the screens, the forty pure functions in
 * `lib/`, the eleven hundred assertions in `npm test` — already trusts that
 * value, so proving the two are equal is what makes the swap safe.
 *
 * Needs a running stack (`npx supabase start`) and a `.env.local` pointing at
 * it, which is why it is a `.dbtest.ts` behind `npm run test:db` rather than
 * part of `npm test`.
 *
 * `createClient` and not the `@supabase/ssr` server client: that one reads
 * `next/headers`, which only exists inside a request. The wire and the SQL are
 * what is under test here, not the cookie plumbing.
 */

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !publishableKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be in .env.local — see .env.example.",
  );
}

/** What a visitor gets: the publishable key, and whatever RLS allows. */
const anon = createClient<Database>(url, publishableKey);

async function snapshot() {
  const { data, error } = await anon.rpc("catalog_snapshot");
  if (error) throw new Error(`catalog_snapshot failed: ${error.message}`);
  return buildCatalog(parseCatalogSnapshot(data));
}

async function countOf(table: "drops" | "products" | "product_colors" | "stock_cells" | "teasers" | "promotions") {
  const { count, error } = await anon.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`count(${table}) failed: ${error.message}`);
  return count;
}

describe("the catalogue in Postgres", () => {
  let catalog: Awaited<ReturnType<typeof snapshot>>;

  beforeAll(async () => {
    catalog = await snapshot();
  });

  it("holds 21 styles, 38 colours, 152 stock cells, 4 drops, 2 teasers, 6 codes", async () => {
    expect(await countOf("products")).toBe(21);
    expect(await countOf("product_colors")).toBe(38);
    expect(await countOf("stock_cells")).toBe(152);
    expect(await countOf("drops")).toBe(4);
    expect(await countOf("teasers")).toBe(2);
    expect(await countOf("promotions")).toBe(6);
  });

  // Arrays and not the whole `Catalog`: `buildCatalog` derives the four Maps
  // and `currentDropNo` from exactly these, so comparing the inputs compares
  // everything, and a Map's diff is unreadable when it fails.
  it("gives back the fixture's styles, in the fixture's order", () => {
    expect(catalog.products).toEqual([...FIXTURE_CATALOG.products]);
  });

  it("gives back the fixture's drops, teasers and promotions", () => {
    expect(catalog.drops).toEqual([...FIXTURE_CATALOG.drops]);
    expect(catalog.teasers).toEqual([...FIXTURE_CATALOG.teasers]);
    expect(catalog.promotions).toEqual([...FIXTURE_CATALOG.promotions]);
  });

  it("derives the same current issue", () => {
    expect(catalog.currentDropNo).toBe(FIXTURE_CATALOG.currentDropNo);
  });

  it("spells out all four sizes for every colour, zeros included", () => {
    for (const product of catalog.products) {
      for (const color of product.colors) {
        const perSize = product.stock[color];
        expect(perSize, `${product.slug}/${color} has no cells`).toBeDefined();
        expect(Object.keys(perSize!).sort()).toEqual([...SIZES].sort());
      }
    }
  });

  it("keeps every instant in +07:00, the way lib/datetime.ts reads them", () => {
    const stamps = [
      ...catalog.drops.flatMap((d) => [d.opensAt, d.closesAt]),
      ...catalog.promotions.flatMap((p) => [p.startsAt, p.endsAt]),
      ...catalog.products.map((p) => p.soldOutAt).filter((s): s is string => s !== undefined),
    ];
    expect(stamps.length).toBeGreaterThan(0);
    for (const stamp of stamps) {
      expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/);
    }
  });
});

describe("what a visitor may not do", () => {
  it("cannot reach the seed mirrors the demo resets from", async () => {
    const { error } = await anon.from("seed_products").select("*").limit(1);
    expect(error, "seed_products answered a publishable key").not.toBeNull();
  });

  it("cannot call reset_demo", async () => {
    const { error } = await anon.rpc("reset_demo", {});
    expect(error, "reset_demo answered a publishable key").not.toBeNull();
  });

  it("cannot write to the catalogue", async () => {
    const { error } = await anon.from("drops").insert({
      no: 99,
      opens_at: "2026-12-01T20:00:00+07:00",
      closes_at: "2026-12-15T20:00:00+07:00",
    });
    expect(error, "an insert with a publishable key was accepted").not.toBeNull();
  });
});

describe("reset_demo", () => {
  /**
   * The service key is read from the running stack at test time and never
   * written anywhere — not to `.env.local`, not to a fixture, not to a log.
   * It only exists in this process's memory for the length of the run.
   */
  const serviceKey = (() => {
    const printed = execSync("npx supabase status -o env", { encoding: "utf8", cwd: process.cwd() });
    const match = printed.match(/^SERVICE_ROLE_KEY="?([^"\r\n]+)"?$/m);
    if (!match) throw new Error("`supabase status -o env` printed no SERVICE_ROLE_KEY");
    return match[1]!;
  })();

  const service = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  it("is idempotent: rebuilding the demo leaves the same catalogue", async () => {
    const before = await snapshot();

    const { error } = await service.rpc("reset_demo", {});
    expect(error, error?.message).toBeNull();

    const after = await snapshot();
    expect(after.products).toEqual(before.products);
    expect(after.drops).toEqual(before.drops);
    expect(after.teasers).toEqual(before.teasers);
    expect(after.promotions).toEqual(before.promotions);
    expect(after.products).toEqual([...FIXTURE_CATALOG.products]);
  });
});
