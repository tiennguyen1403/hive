import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { buildCatalog } from "@/lib/catalog";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import { parseCatalogSnapshot } from "./catalog-snapshot";
import type { Database, Json } from "./database.types";

/**
 * What slice B6 claims, checked against Postgres
 * (`20260927100000_product_details.sql`): a style carries its construction
 * lines — `products.details text[]`, `Product.details` in `data/types.ts`.
 *
 *   · `catalog_snapshot()` writes `details` for every style, to a visitor
 *     too: the fixture's lines, in their order, for the ten of Số 05, and an
 *     empty list for every other style — never a missing key, never null;
 *   · `reset_demo()` copies the column from `seed_products`: a reset puts
 *     back lines that were changed or cleared, and `reset_demo(demo_anchor())`
 *     — what the seed, `seed:users`, the back office and the daily cron run —
 *     keeps them;
 *   · a style the back office creates has none (`'{}'`), whether it is an
 *     issue's or a fixed one, and an edit leaves a style's lines as they were;
 *   · the column takes no null, whoever writes it.
 *
 * Needs a running stack, `.env.local` and the demo accounts
 * (`npm run seed:users`). Every test starts from the seed on the real clock's
 * anchor, and the file resets once more when it ends.
 */

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const demoPassword = process.env.DEMO_PASSWORD;
if (!url || !publishableKey || !secretKey || !demoPassword) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY and DEMO_PASSWORD must be " +
      "in .env.local — see .env.example.",
  );
}

type Client = SupabaseClient<Database>;

function fresh(): Client {
  return createClient<Database>(url!, publishableKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** What a visitor gets: the publishable key, no session. */
const anon = fresh();

/** The service role — the only writer of raw rows. */
const service = createClient<Database>(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let manager: Client;

/** The app's clock, exactly as a Server Action sends it. */
const now = () => toVnIso(demoNow());

/** `reset_demo(demo_anchor())`, the reset every caller runs. */
async function resetToRealAnchor() {
  const anchor = await service.rpc("demo_anchor");
  if (anchor.error) throw new Error(`demo_anchor failed: ${anchor.error.message}`);
  const { error } = await service.rpc("reset_demo", { p_anchor: anchor.data });
  if (error) throw new Error(`reset_demo failed: ${error.message}`);
}

async function rawSnapshot(client: Client): Promise<{ products: Array<Record<string, unknown>> }> {
  const { data, error } = await client.rpc("catalog_snapshot");
  if (error) throw new Error(`catalog_snapshot failed: ${error.message}`);
  return data as unknown as { products: Array<Record<string, unknown>> };
}

async function snapshotAs(client: Client) {
  return buildCatalog(parseCatalogSnapshot(await rawSnapshot(client)));
}

async function detailsOf(table: "products" | "seed_products", id: string): Promise<string[] | undefined> {
  const { data, error } = await service.from(table).select("details").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.details;
}

/** Every style's lines as the fixture has them, in catalogue order. */
const FIXTURE_DETAILS = FIXTURE_CATALOG.products.map((p) => [p.id, p.details] as const);
/** The ten styles that have lines: Số 05's. */
const WITH_LINES = FIXTURE_CATALOG.products.filter((p) => p.details.length > 0).map((p) => p.id);
const KHOI = FIXTURE_CATALOG.byId.get("p-khoi" as never)!;
const BUI = FIXTURE_CATALOG.byId.get("p-bui" as never)!;

beforeAll(async () => {
  const client = fresh();
  const { error } = await client.auth.signInWithPassword({ email: DEMO_ADMIN.email, password: demoPassword! });
  if (error) throw new Error(`could not sign in as the demo manager: ${error.message}`);
  manager = client;
});

beforeEach(resetToRealAnchor);
afterAll(resetToRealAnchor);

// ────────────────────────────────────────────────────── the catalogue carries them
describe("catalog_snapshot and the construction lines", () => {
  it("writes them for every style, to a visitor: Số 05's ten with the fixture's lines, every other an empty list", async () => {
    expect(WITH_LINES).toEqual(FIXTURE_CATALOG.products.filter((p) => p.dropNo === 5).map((p) => p.id));
    expect(WITH_LINES).toHaveLength(10);

    // The document itself: the key is written out for every style, as a list.
    const raw = await rawSnapshot(anon);
    expect(raw.products).toHaveLength(FIXTURE_CATALOG.products.length);
    for (const p of raw.products) {
      expect(Array.isArray(p.details), `${String(p.id)}.details`).toBe(true);
    }
    expect(raw.products.filter((p) => (p.details as unknown[]).length > 0).map((p) => p.id)).toEqual(WITH_LINES);

    // Read through the parser, style by style, line by line.
    const catalog = await snapshotAs(anon);
    expect(catalog.products.map((p) => [p.id, p.details])).toEqual(FIXTURE_DETAILS);
  });
});

// ──────────────────────────────────────────────────────────────── the reset
describe("reset_demo and the construction lines", () => {
  it("keeps them through reset_demo(demo_anchor()), run twice over", async () => {
    await resetToRealAnchor();
    await resetToRealAnchor();
    expect((await snapshotAs(anon)).products.map((p) => [p.id, p.details])).toEqual(FIXTURE_DETAILS);
  });

  it("puts back lines changed or cleared by hand, from the seed mirror", async () => {
    // The mirror holds the fixture's lines: that is what a reset copies.
    for (const [id, details] of FIXTURE_DETAILS) expect(await detailsOf("seed_products", id), id).toEqual(details);

    const cleared = await service.from("products").update({ details: [] }).eq("id", "p-khoi");
    expect(cleared.error).toBeNull();
    const reordered = await service.from("products").update({ details: [...BUI.details].reverse() }).eq("id", "p-bui");
    expect(reordered.error).toBeNull();
    const borrowed = await service.from("products").update({ details: [...KHOI.details] }).eq("id", "p-ao-thun-tron");
    expect(borrowed.error).toBeNull();
    // The changes really landed before the reset undoes them.
    expect(await detailsOf("products", "p-khoi")).toEqual([]);
    expect(await detailsOf("products", "p-bui")).toEqual([...BUI.details].reverse());
    expect(await detailsOf("products", "p-ao-thun-tron")).toEqual(KHOI.details);

    await resetToRealAnchor();
    expect(await detailsOf("products", "p-khoi")).toEqual(KHOI.details);
    expect(await detailsOf("products", "p-bui")).toEqual(BUI.details);
    expect(await detailsOf("products", "p-ao-thun-tron")).toEqual([]);
    expect((await snapshotAs(anon)).products.map((p) => [p.id, p.details])).toEqual(FIXTURE_DETAILS);
  });
});

// ─────────────────────────────────────────────────────── the back office
describe("the back office and the construction lines", () => {
  /** ÁO MƯA as `createProduct` sends a fixed style (as in `fixed-styles.dbtest.ts`). */
  const aoMua = {
    name: "ÁO MƯA",
    kind: "Áo khoác dù",
    family: "JACKET",
    fit: "REGULAR",
    slug: "ao-mua",
    priceVnd: 520_000,
    material: "Dù chống nước",
    dropNo: null,
    colors: [{ color: "black", photoKey: "suong" }],
    cells: { black: { S: 1, M: 1, L: 1, XL: 1 } },
  };
  /** SỎI for Số 06, an issue's style (as in `catalog-admin.dbtest.ts`). */
  const soi = {
    ...aoMua,
    name: "SỎI",
    fit: "OVERSIZE",
    slug: "soi",
    priceVnd: 420_000,
    material: "Dù hai lớp",
    dropNo: 6,
  };

  it("creates a style with none — '{}' in the row, an empty list in the snapshot — fixed or an issue's", async () => {
    for (const input of [aoMua, soi]) {
      const { data, error } = await manager.rpc("admin_add_product", {
        p_input: input as unknown as Json,
        p_now: now(),
      });
      expect(error, input.slug).toBeNull();
      expect(data).toBe(`p-${input.slug}`);
      expect(await detailsOf("products", `p-${input.slug}`), input.slug).toEqual([]);
    }
    // ÁO MƯA is on the shop at once; SỎI only for the manager until Số 06 opens.
    expect((await snapshotAs(anon)).byId.get("p-ao-mua" as never)?.details).toEqual([]);
    const raw = (await rawSnapshot(manager)).products.find((p) => p.id === "p-soi");
    expect(raw?.details).toEqual([]);
  });

  it("leaves a style's lines as they were when it is edited", async () => {
    const { error } = await manager.rpc("admin_update_product", {
      p_id: "p-khoi",
      p_patch: { priceVnd: 420_000, name: "KHÓI ĐEN" } as unknown as Json,
      p_now: now(),
    });
    expect(error).toBeNull();
    const khoi = (await snapshotAs(anon)).byId.get("p-khoi" as never)!;
    expect(khoi).toMatchObject({ priceVnd: 420_000, name: "KHÓI ĐEN" });
    expect(khoi.details).toEqual(KHOI.details);
  });
});

// ───────────────────────────────────────────────────────── the column itself
describe("the details column", () => {
  it("takes no null, in the shop's table or in the mirror, whoever writes it", async () => {
    const live = await service.from("products").update({ details: null as never }).eq("id", "p-khoi");
    expect(live.error?.code).toBe("23502");
    const mirror = await service.from("seed_products").update({ details: null as never }).eq("id", "p-khoi");
    expect(mirror.error?.code).toBe("23502");
    expect(await detailsOf("products", "p-khoi")).toEqual(KHOI.details);
  });
});
