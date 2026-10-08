import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { buildCatalog } from "@/lib/catalog";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import { productText } from "@/lib/product-text";
import { parseCatalogSnapshot } from "./catalog-snapshot";
import type { Database, Json } from "./database.types";

/**
 * What slice B15 claims, checked against Postgres
 * (`20261001150000_catalog_english.sql`): the catalogue's words in English,
 * beside the Vietnamese — `name_en`, `kind_en`, `material_en`, `details_en`
 * on a style, `name_en`, `kind_en` on a teaser, null meaning "print the
 * Vietnamese".
 *
 *   · `catalog_snapshot()` writes `en` on every style and teaser, to a
 *     visitor too, and read through the parser it is the fixture's `en`;
 *   · `reset_demo()` copies the English back from the mirrors;
 *   · `admin_update_product()` forgets the English of exactly the fields an
 *     edit changes, compared one by one, and its log line stays Vietnamese;
 *   · a style or a teaser the back office creates has none;
 *   · a blank value or an empty list of lines is refused, in the shop's
 *     tables and in the mirrors alike.
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

type Raw = { products: Array<Record<string, unknown>>; teasers: Array<Record<string, unknown>> };

async function rawSnapshot(client: Client): Promise<Raw> {
  const { data, error } = await client.rpc("catalog_snapshot");
  if (error) throw new Error(`catalog_snapshot failed: ${error.message}`);
  return data as unknown as Raw;
}

async function snapshotAs(client: Client) {
  return buildCatalog(parseCatalogSnapshot(await rawSnapshot(client)));
}

const ENGLISH = "name_en, kind_en, material_en, details_en";

async function englishOf(table: "products" | "seed_products", id: string) {
  const { data, error } = await service.from(table).select(ENGLISH).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function teaserEnglishOf(table: "teasers" | "seed_teasers", slug: string) {
  const { data, error } = await service.from(table).select("name_en, kind_en").eq("slug", slug).single();
  if (error) throw new Error(error.message);
  return data;
}

async function lastEvent() {
  const { data, error } = await service
    .from("events")
    .select("kind, product_id, payload")
    .order("id", { ascending: false })
    .limit(1)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** One edit through the back office's own function, which has to succeed. */
async function edit(id: string, patch: Record<string, unknown>) {
  const { error } = await manager.rpc("admin_update_product", {
    p_id: id,
    p_patch: patch as unknown as Json,
    p_now: now(),
  });
  expect(error, JSON.stringify(patch)).toBeNull();
}

const KHOI = FIXTURE_CATALOG.byId.get("p-khoi" as never)!;
const TEE = FIXTURE_CATALOG.byId.get("p-ao-thun-tron" as never)!;
const BAO = FIXTURE_CATALOG.byId.get("p-bao" as never)!;
/** Every style's and teaser's English as the fixture has it, in catalogue order. */
const FIXTURE_EN = FIXTURE_CATALOG.products.map((p) => [p.id, p.en] as const);
const FIXTURE_TEASER_EN = FIXTURE_CATALOG.teasers.map((t) => [t.slug, t.en] as const);

beforeAll(async () => {
  const client = fresh();
  const { error } = await client.auth.signInWithPassword({ email: DEMO_ADMIN.email, password: demoPassword! });
  if (error) throw new Error(`could not sign in as the demo manager: ${error.message}`);
  manager = client;
});

beforeEach(resetToRealAnchor);
afterAll(resetToRealAnchor);

// ─────────────────────────────────────────────────────── the catalogue
describe("catalog_snapshot and the English", () => {
  it("writes en on every style and teaser, to a visitor: one key per column, the English or null", async () => {
    const raw = await rawSnapshot(anon);
    expect(raw.products).toHaveLength(FIXTURE_CATALOG.products.length);
    for (const p of raw.products) {
      expect(Object.keys(p.en as object).sort(), String(p.id)).toEqual(["details", "kind", "material", "name"]);
    }
    for (const t of raw.teasers) expect(Object.keys(t.en as object).sort(), String(t.slug)).toEqual(["kind", "name"]);

    // The two the brief names: an issue's style keeps its name, a fixed style has an English one.
    const khoi = raw.products.find((p) => p.id === "p-khoi")!;
    expect(khoi.en).toEqual({
      name: null,
      kind: "Oversized tee",
      material: "Cotton 250gsm",
      details: KHOI.en!.details,
    });
    const tee = raw.products.find((p) => p.id === "p-ao-thun-tron")!;
    expect(tee.en).toEqual({ name: "PLAIN TEE", kind: "Tee", material: "Cotton 220gsm", details: null });
    // Số 06's teasers are named in English (round v6): the English name repeats the name.
    expect(raw.teasers.find((t) => t.slug === "s06-out-of-character")!.en).toEqual({ name: "OUT OF CHARACTER", kind: "Printed tee" });
  });

  it("reads back, through the parser, exactly the fixture's English — every style, every teaser", async () => {
    const catalog = await snapshotAs(anon);
    expect(catalog.products.map((p) => [p.id, p.en])).toEqual(FIXTURE_EN);
    expect(catalog.teasers.map((t) => [t.slug, t.en])).toEqual(FIXTURE_TEASER_EN);
    // The Vietnamese did not move.
    expect(catalog.byId.get("p-khoi" as never)).toMatchObject({ name: "KHÓI", kind: "Áo thun oversize", details: KHOI.details });
  });
});

// ──────────────────────────────────────────────────────────────── the reset
describe("reset_demo and the English", () => {
  it("puts back English changed or cleared by hand, from the mirrors", async () => {
    // The mirrors hold the fixture's English: that is what a reset copies.
    expect(await englishOf("seed_products", "p-ao-thun-tron")).toEqual({
      name_en: "PLAIN TEE",
      kind_en: "Tee",
      material_en: "Cotton 220gsm",
      details_en: null,
    });
    expect(await englishOf("seed_products", "p-khoi")).toMatchObject({ name_en: null, details_en: KHOI.en!.details });
    expect(await teaserEnglishOf("seed_teasers", "s06-still-in-motion")).toEqual({ name_en: "STILL IN MOTION", kind_en: "Printed tee" });

    const cleared = await service
      .from("products")
      .update({ name_en: null, kind_en: null, material_en: null, details_en: null })
      .eq("id", "p-khoi");
    expect(cleared.error).toBeNull();
    const renamed = await service.from("products").update({ name_en: "SOMETHING ELSE", details_en: ["One line"] }).eq("id", "p-ao-thun-tron");
    expect(renamed.error).toBeNull();
    const teaser = await service.from("teasers").update({ name_en: null, kind_en: null }).eq("slug", "s06-still-in-motion");
    expect(teaser.error).toBeNull();
    expect("en" in (await snapshotAs(anon)).byId.get("p-khoi" as never)!).toBe(false);

    await resetToRealAnchor();
    expect(await englishOf("products", "p-khoi")).toEqual({
      name_en: null,
      kind_en: "Oversized tee",
      material_en: "Cotton 250gsm",
      details_en: KHOI.en!.details,
    });
    expect(await englishOf("products", "p-ao-thun-tron")).toEqual({
      name_en: "PLAIN TEE",
      kind_en: "Tee",
      material_en: "Cotton 220gsm",
      details_en: null,
    });
    expect(await teaserEnglishOf("teasers", "s06-still-in-motion")).toEqual({ name_en: "STILL IN MOTION", kind_en: "Printed tee" });
    const catalog = await snapshotAs(anon);
    expect(catalog.products.map((p) => [p.id, p.en])).toEqual(FIXTURE_EN);
    expect(catalog.teasers.map((t) => [t.slug, t.en])).toEqual(FIXTURE_TEASER_EN);
  });
});

// ─────────────────────────────────────────────────────── the back office
describe("admin_update_product and the English", () => {
  it("forgets only the English of a renamed style's name: PLAIN TEE V2 in both languages", async () => {
    await edit("p-ao-thun-tron", { name: "PLAIN TEE V2" });
    expect(await englishOf("products", "p-ao-thun-tron")).toEqual({
      name_en: null,
      kind_en: "Tee",
      material_en: "Cotton 220gsm",
      details_en: null,
    });
    const tee = (await snapshotAs(anon)).byId.get("p-ao-thun-tron" as never)!;
    expect(tee.en).toEqual({ kind: "Tee", material: "Cotton 220gsm" });
    expect(productText(tee, "en")).toEqual({ name: "PLAIN TEE V2", kind: "Tee", material: "Cotton 220gsm", details: [] });
    // The log line names what changed, in the words that changed, as before: no English in it.
    expect(await lastEvent()).toEqual({
      kind: "PRODUCT_EDITED",
      product_id: "p-ao-thun-tron",
      payload: { before: { name: "ÁO THUN TRƠN" }, after: { name: "PLAIN TEE V2" } },
    });
  });

  it("forgets the kind's and the material's English when both change, and keeps the name's and the lines'", async () => {
    await edit("p-khoi", { kind: "Áo thun cổ tròn", material: "Cotton 260gsm" });
    expect(await englishOf("products", "p-khoi")).toEqual({
      name_en: null,
      kind_en: null,
      material_en: null,
      details_en: KHOI.en!.details,
    });
    await edit("p-ao-thun-tron", { material: "Cotton 230gsm" });
    expect(await englishOf("products", "p-ao-thun-tron")).toMatchObject({ name_en: "PLAIN TEE", kind_en: "Tee", material_en: null });
    const khoi = (await snapshotAs(anon)).byId.get("p-khoi" as never)!;
    expect(khoi.en).toEqual({ details: KHOI.en!.details });
    expect(productText(khoi, "en")).toEqual({
      name: "KHÓI",
      kind: "Áo thun cổ tròn",
      material: "Cotton 260gsm",
      details: KHOI.en!.details,
    });
  });

  it("keeps every English field through an edit of nothing it translates — price, address, fit", async () => {
    await edit("p-ao-thun-tron", { priceVnd: 420_000, slug: "ao-thun-tron-2", fit: "OVERSIZE" });
    expect(await englishOf("products", "p-ao-thun-tron")).toEqual({
      name_en: "PLAIN TEE",
      kind_en: "Tee",
      material_en: "Cotton 220gsm",
      details_en: null,
    });
  });

  it("compares each field with what it was, not the row: the same name sent again keeps its English", async () => {
    // The form sends every field it shows; only the price really changed here.
    await edit("p-ao-thun-tron", { name: "  ÁO THUN TRƠN ", kind: "Áo thun", material: "Cotton 220gsm", priceVnd: 410_000 });
    expect(await englishOf("products", "p-ao-thun-tron")).toEqual({
      name_en: "PLAIN TEE",
      kind_en: "Tee",
      material_en: "Cotton 220gsm",
      details_en: null,
    });
    expect((await lastEvent()).payload).toEqual({ before: { priceVnd: 400_000 }, after: { priceVnd: 410_000 } });
  });

  it("leaves no en on a style whose last English field went", async () => {
    await edit("p-bao", { kind: "Áo hoodie cổ cao", material: "Nỉ bông 400gsm" });
    expect(await englishOf("products", "p-bao")).toEqual({ name_en: null, kind_en: null, material_en: null, details_en: null });
    const bao = (await snapshotAs(anon)).byId.get("p-bao" as never)!;
    expect("en" in bao).toBe(false);
    expect(productText(bao, "en")).toEqual(productText(bao, "vi"));
    expect(BAO.en).toBeDefined();
  });
});

describe("what the back office creates", () => {
  /** ÁO MƯA as `createProduct` sends a fixed style (as in `product-details.dbtest.ts`). */
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

  it("has no English: a new style's columns are null and its en is absent, whatever kind it borrows", async () => {
    const { data, error } = await manager.rpc("admin_add_product", { p_input: aoMua as unknown as Json, p_now: now() });
    expect(error).toBeNull();
    expect(data).toBe("p-ao-mua");
    expect(await englishOf("products", "p-ao-mua")).toEqual({ name_en: null, kind_en: null, material_en: null, details_en: null });
    const mua = (await snapshotAs(anon)).byId.get("p-ao-mua" as never)!;
    expect("en" in mua).toBe(false);
    expect(productText(mua, "en")).toMatchObject({ name: "ÁO MƯA", kind: "Áo khoác dù", material: "Dù chống nước" });
  });

  it("has no English on a new teaser either", async () => {
    const { error } = await manager.rpc("admin_add_teaser", {
      p_slug: "s06-thu",
      p_name: "THỬ",
      p_garment: "Áo khoác dù",
      p_family: "JACKET",
      p_drop_no: 6,
      p_photo_key: "suong",
      p_now: now(),
    });
    expect(error).toBeNull();
    expect(await teaserEnglishOf("teasers", "s06-thu")).toEqual({ name_en: null, kind_en: null });
    const teaser = (await snapshotAs(anon)).teasers.find((t) => t.slug === "s06-thu")!;
    expect("en" in teaser).toBe(false);
  });
});

// ──────────────────────────────────────────────────────── the columns themselves
describe("the English columns", () => {
  const CHECK_VIOLATION = "23514";

  // Only refusals touch the mirrors: they change nothing. What a column takes
  // is shown on the live tables alone, which every reset rebuilds — a value
  // written into a mirror would outlive the reset, and the file.
  it("refuse a blank value, in the shop's tables and in the mirrors, and take null", async () => {
    for (const table of ["products", "seed_products"] as const) {
      for (const column of ["name_en", "kind_en", "material_en"] as const) {
        for (const blank of ["", "   "]) {
          const { error } = await service.from(table).update({ [column]: blank } as { name_en: string }).eq("id", "p-khoi");
          expect(error?.code, `${table}.${column} = "${blank}"`).toBe(CHECK_VIOLATION);
        }
      }
    }
    expect((await service.from("products").update({ kind_en: null }).eq("id", "p-ao-thun-tron")).error).toBeNull();
    for (const table of ["teasers", "seed_teasers"] as const) {
      for (const column of ["name_en", "kind_en"] as const) {
        const { error } = await service.from(table).update({ [column]: " " } as { name_en: string }).eq("slug", "s06-out-of-character");
        expect(error?.code, `${table}.${column}`).toBe(CHECK_VIOLATION);
      }
    }
  });

  it("refuse an empty list of lines, a blank line or a missing one — and take null or real lines", async () => {
    for (const table of ["products", "seed_products"] as const) {
      for (const lines of [[], ["Kangaroo pocket", ""], ["  "], ["Kangaroo pocket", null]]) {
        const { error } = await service
          .from(table)
          .update({ details_en: lines as string[] })
          .eq("id", "p-khoi");
        expect(error?.code, `${table} ${JSON.stringify(lines)}`).toBe(CHECK_VIOLATION);
      }
    }
    expect((await service.from("products").update({ details_en: null }).eq("id", "p-bui")).error).toBeNull();
    expect((await service.from("products").update({ details_en: ["Kangaroo pocket"] }).eq("id", "p-reu")).error).toBeNull();
    // Nothing above reached the rows it was refused for, nor any mirror.
    expect((await englishOf("products", "p-khoi")).details_en).toEqual(KHOI.en!.details);
    expect((await englishOf("seed_products", "p-khoi")).details_en).toEqual(KHOI.en!.details);
    expect((await englishOf("seed_products", "p-bui")).details_en).toEqual(FIXTURE_CATALOG.byId.get("p-bui" as never)!.en!.details);
  });

  it("keep the check helper away from the API roles", async () => {
    const visitor = await anon.rpc("text_lines_ok", { p_lines: ["a"] });
    expect(visitor.error).not.toBeNull();
    const signedIn = await manager.rpc("text_lines_ok", { p_lines: ["a"] });
    expect(signedIn.error).not.toBeNull();
  });
});

describe("the fixture behind the seed", () => {
  it("is what this file compares with: the English of the two the brief names", () => {
    expect(TEE.en).toEqual({ name: "PLAIN TEE", kind: "Tee", material: "Cotton 220gsm" });
    expect(KHOI.en?.name).toBeUndefined();
  });
});
