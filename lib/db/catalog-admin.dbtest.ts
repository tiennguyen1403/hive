import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { buildCatalog } from "@/lib/catalog";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import { parseCatalogSnapshot } from "./catalog-snapshot";
import type { Database, Json } from "./database.types";

/**
 * What slice B3b claims, checked against Postgres: the catalogue's ten
 * `admin_*` functions (`20260924020000_catalog_admin.sql`) and what they
 * change around them.
 *
 *   · each function: one allowed move and at least one refused one, with the
 *     code the brief fixed (`NOT_ADMIN`, `BAD_INPUT`, `NOT_FOUND`,
 *     `NOT_ALLOWED`, `STALE`), and exactly one event with the right payload;
 *   · a shopper calling any of them gets `NOT_ADMIN`, a visitor nothing;
 *   · `sold_out_at` is live: stamped by `place_order()` when the last piece
 *     goes, cleared by an adjustment, the shop's cancellation, the shopper's
 *     own and the twelve-hour sweep;
 *   · checkout refuses a paused code and one ended early (`PROMO_INVALID`);
 *   · a new address segment leaves every order line pointing at the style;
 *   · `reset_demo()` after all of it puts the catalogue back to
 *     `FIXTURE_CATALOG`, field for field.
 *
 * THE CLOCK IS REAL HERE, as in `admin.dbtest.ts`: the manager's calls carry
 * `toVnIso(demoNow())`, the only instant the database takes from a signed-in
 * caller, so every test starts from `reset_demo(demo_anchor())` — where issue
 * 05 is open and its codes are live. The one test that compares with the
 * fixture resets onto the fixture's own anchor explicitly, and the file puts
 * the database back on the real anchor when it ends.
 *
 * SLICE B3c (`20260924040000_photos.sql`) is at the end of the file: the
 * product-photo bucket (public read, service-role writes, 1,5 MB WebP/JPEG),
 * `admin_add_product`, `admin_set_product_photo`, `admin_reorder_colors`, a
 * style of an issue that has not opened staying off the shop, and a new issue
 * that may not overlap another. It uploads real (1×1) photos with the service
 * role and removes them when the file ends — `reset_demo()` empties tables,
 * not the bucket.
 *
 * Needs a running stack WITH STORAGE (`[storage] enabled = true`), `.env.local`
 * and the nine demo accounts (`npm run seed:users`).
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

const anon = fresh();

/** The service role — not an admin (no role claim), but exempt from the clock. */
const service = createClient<Database>(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function signedIn(email: string): Promise<Client> {
  const client = fresh();
  const { error } = await client.auth.signInWithPassword({ email, password: demoPassword! });
  if (error) throw new Error(`could not sign in as a demo account: ${error.message}`);
  return client;
}

const MINHANH = CUSTOMERS[0]!;

/** The app's clock, exactly as a Server Action sends it. */
const now = () => toVnIso(demoNow());
/** `hours` from now, for the moments only the service role may name. */
const shifted = (hours: number) => toVnIso(new Date(Date.now() + hours * 3_600_000));
/** `days` from now at 20:00 Vietnamese time — an issue's hour. */
const dayAt20 = (days: number) => `${shifted(days * 24).slice(0, 10)}T20:00:00+07:00`;

const FIXTURE_ANCHOR = "2026-09-20T18:50:00+07:00";

async function resetTo(anchor: string | null) {
  let at = anchor;
  if (at === null) {
    const real = await service.rpc("demo_anchor");
    if (real.error) throw new Error(`demo_anchor failed: ${real.error.message}`);
    at = real.data;
  }
  const { error } = await service.rpc("reset_demo", { p_anchor: at });
  if (error) throw new Error(`reset_demo failed: ${error.message}`);
}

async function snapshot() {
  return snapshotAs(anon);
}

/** The catalogue as one caller reads it: since slice B3c a visitor and the manager differ. */
async function snapshotAs(client: Client) {
  const { data, error } = await client.rpc("catalog_snapshot");
  if (error) throw new Error(`catalog_snapshot failed: ${error.message}`);
  return buildCatalog(parseCatalogSnapshot(data));
}

// ───────────────────────────────────────────── the bucket (slice B3c)
const BUCKET = "product-photos";

/** A real 1×1 WebP: the bucket takes it, and so would the photo route. */
const WEBP_1PX = Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64");

/** Every object this file put in the bucket, removed when it ends. */
const uploads: string[] = [];

/** An upload's key that was never uploaded. */
const ghostKey = () => `up/${crypto.randomUUID().replace(/-/g, "")}.webp`;

/** One photo in the bucket, the way `uploadProductPhoto` stores one. */
async function upload(): Promise<string> {
  const key = ghostKey();
  const { error } = await service.storage.from(BUCKET).upload(key, WEBP_1PX, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`upload failed: ${error.message}`);
  uploads.push(key);
  return key;
}

/**
 * SỎI for issue 06, as `createProduct` sends it: three colours in band order,
 * a borrowed frame for two of them unless told otherwise, 36 pieces.
 */
function soi(over: Record<string, unknown> = {}) {
  return {
    name: "SỎI",
    kind: "Áo khoác dù",
    family: "JACKET",
    fit: "OVERSIZE",
    slug: "soi",
    priceVnd: 420000,
    material: "Dù hai lớp",
    dropNo: 6,
    colors: [
      { color: "black", photoKey: "suong" },
      { color: "cream", photoKey: "lua" },
      { color: "moss", photoKey: "tro" },
    ],
    cells: {
      black: { S: 3, M: 4, L: 4, XL: 1 },
      cream: { S: 2, M: 4, L: 4, XL: 2 },
      moss: { S: 3, M: 4, L: 4, XL: 1 },
    },
    ...over,
  } as unknown as Json;
}

async function eventCount(): Promise<number> {
  const { count, error } = await service.from("events").select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function lastEvent() {
  const { data, error } = await service
    .from("events")
    .select("kind, actor_role, actor, order_code, product_id, promo_code, drop_no, payload, at")
    .order("id", { ascending: false })
    .limit(1)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function onHand(productId: string, color: string, size: string): Promise<number> {
  const { data, error } = await service
    .from("stock_cells")
    .select("on_hand")
    .eq("product_id", productId)
    .eq("color", color as never)
    .eq("size", size as never)
    .single();
  if (error) throw new Error(error.message);
  return data.on_hand;
}

/** Every cell of a style to 0, then the ones named to their numbers. */
async function shelf(productId: string, cells: Array<[string, string, number]>) {
  const cleared = await service.from("stock_cells").update({ on_hand: 0 }).eq("product_id", productId);
  if (cleared.error) throw new Error(cleared.error.message);
  for (const [color, size, n] of cells) {
    const { error } = await service
      .from("stock_cells")
      .update({ on_hand: n })
      .eq("product_id", productId)
      .eq("color", color as never)
      .eq("size", size as never);
    if (error) throw new Error(error.message);
  }
}

async function productRow(id: string) {
  const { data, error } = await service
    .from("products")
    .select("slug, name, kind, family, price_vnd, cut_units, drop_no, sold_out_at")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function promoRow(code: string) {
  const { data, error } = await service.from("promotions").select("*").eq("code", code).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** `p_input` as checkout sends it: one KHÓI black M unless told otherwise. */
function basket(over: Record<string, unknown> = {}) {
  return {
    lines: [{ productId: "p-khoi", color: "black", size: "M", qty: 1 }],
    recipient: "Khách Thử",
    phone: "0901234567",
    email: "khach@example.test",
    provinceCode: "29",
    wardCode: "70101063",
    line: "1 Thử Nghiệm",
    note: "",
    delivery: "STANDARD",
    payment: "COD",
    promoCode: null,
    ...over,
  };
}

async function place(client: Client, over: Record<string, unknown> = {}, at = now()) {
  return client.rpc("place_order", { p_input: basket(over) as unknown as Json, p_now: at });
}

async function placeAsGuest(over: Record<string, unknown> = {}, at = now()): Promise<string> {
  const { data, error } = await place(service, over, at);
  if (error) throw new Error(`place_order refused: ${error.message}`);
  return (data as { code: string }).code;
}

/** The terms of a new code, the way the Server Action sends them. */
const terms = (over: Record<string, unknown> = {}) => ({
  code: "TEST10",
  kind: "PERCENT",
  percent: 10,
  maxDiscountVnd: null,
  amountVnd: null,
  minOrderVnd: null,
  usageLimit: 100,
  startsAt: shifted(-1),
  endsAt: dayAt20(30),
  ...over,
});

let manager: Client;
let minhanh: Client;

beforeAll(async () => {
  manager = await signedIn(DEMO_ADMIN.email);
  minhanh = await signedIn(MINHANH.email);
});

beforeEach(async () => {
  await resetTo(null);
});

afterAll(async () => {
  await resetTo(null);
  if (uploads.length > 0) {
    const { error } = await service.storage.from(BUCKET).remove(uploads);
    if (error) throw new Error(`could not remove the test's uploads: ${error.message}`);
  }
});

// ───────────────────────────────────────────── who may call them at all
describe("the role", () => {
  const calls = (): Array<[string, Record<string, unknown>]> => [
    ["admin_adjust_stock", { p_product_id: "p-khoi", p_cells: [{ color: "black", size: "XL", before: 1, after: 0 }], p_reason: "Khác", p_ref: "", p_note: "", p_now: now() }],
    ["admin_add_drop", { p_no: 7, p_opens_at: dayAt20(30), p_closes_at: dayAt20(44), p_now: now() }],
    ["admin_schedule_drop", { p_no: 6, p_opens_at: dayAt20(8), p_closes_at: dayAt20(22), p_now: now() }],
    ["admin_add_teaser", { p_slug: "thu-6", p_name: "THỬ", p_garment: "Áo khoác dù", p_family: "JACKET", p_drop_no: 6, p_photo_key: "suong", p_now: now() }],
    ["admin_add_promo", { p_terms: terms(), p_now: now() }],
    ["admin_edit_promo", { p_code: "DOT05", p_terms: terms({ code: "DOT05" }), p_now: now() }],
    ["admin_pause_promo", { p_code: "DOT05", p_paused: true, p_now: now() }],
    ["admin_raise_promo_limit", { p_code: "DOT05", p_after: 300, p_now: now() }],
    ["admin_end_promo", { p_code: "DOT05", p_now: now() }],
    ["admin_update_product", { p_id: "p-khoi", p_patch: { priceVnd: 420000 }, p_now: now() }],
  ];

  it("answers a shopper NOT_ADMIN from every one of the ten, and writes nothing", async () => {
    const before = await eventCount();
    for (const [fn, args] of calls()) {
      const { error } = await minhanh.rpc(fn as never, args as never);
      expect(error?.message, fn).toBe("NOT_ADMIN");
    }
    expect(await eventCount()).toBe(before);
    expect(await onHand("p-khoi", "black", "XL")).toBe(1);
  });

  it("does not even let a visitor with no session call them", async () => {
    for (const [fn, args] of calls()) {
      const { error } = await anon.rpc(fn as never, args as never);
      expect(error, fn).not.toBeNull();
      expect(error!.message, fn).not.toBe("NOT_ADMIN");
    }
  });

  it("holds the manager to the real clock: ten minutes off is a bad request", async () => {
    const { error } = await manager.rpc("admin_pause_promo", {
      p_code: "DOT05",
      p_paused: true,
      p_now: shifted(10 / 60),
    });
    expect(error?.message).toBe("BAD_INPUT");
    expect((await promoRow("DOT05"))!.paused).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────── the shelf
describe("admin_adjust_stock", () => {
  it("KHÓI black XL 1 → 0: the shelf moves, the cut does not, one event with the cells", async () => {
    const before = await eventCount();
    const at = now();
    const { error } = await manager.rpc("admin_adjust_stock", {
      p_product_id: "p-khoi",
      p_cells: [{ color: "black", size: "XL", before: 1, after: 0 }] as unknown as Json,
      p_reason: "Kiểm kê lệch",
      p_ref: " BB-01 ",
      p_note: "",
      p_now: at,
    });
    expect(error).toBeNull();
    expect(await onHand("p-khoi", "black", "XL")).toBe(0);
    expect((await productRow("p-khoi")).cut_units).toBe(35);

    expect(await eventCount()).toBe(before + 1);
    const e = await lastEvent();
    expect(e).toMatchObject({
      kind: "INVENTORY_ADJUSTED",
      actor_role: "admin",
      actor: DEMO_ADMIN.email,
      product_id: "p-khoi",
      order_code: null,
      promo_code: null,
      drop_no: null,
      payload: {
        cells: [{ color: "black", size: "XL", before: 1, after: 0 }],
        reason: "Kiểm kê lệch",
        ref: "BB-01",
        note: "",
        delta: -1,
      },
    });
    expect(Date.parse(e.at)).toBe(Date.parse(at));
  });

  it("refuses a before that is no longer the shelf's own number: STALE, and nothing moves", async () => {
    const before = await eventCount();
    const { error } = await manager.rpc("admin_adjust_stock", {
      p_product_id: "p-khoi",
      p_cells: [
        { color: "black", size: "S", before: 3, after: 2 },
        { color: "black", size: "XL", before: 5, after: 0 },
      ] as unknown as Json,
      p_reason: "Kiểm kê lệch",
      p_ref: "",
      p_note: "",
      p_now: now(),
    });
    expect(error?.message).toBe("STALE");
    expect(await onHand("p-khoi", "black", "S")).toBe(3);
    expect(await onHand("p-khoi", "black", "XL")).toBe(1);
    expect(await eventCount()).toBe(before);
  });

  it("refuses what the sheet could not have sent: BAD_INPUT, and nothing moves", async () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ["a reason off the list", { p_reason: "May thêm" }],
      ["a colour the style does not come in", { p_cells: [{ color: "moss", size: "M", before: 0, after: 1 }] }],
      ["a negative shelf", { p_cells: [{ color: "black", size: "XL", before: 1, after: -1 }] }],
      ["a cell that did not move", { p_cells: [{ color: "black", size: "XL", before: 1, after: 1 }] }],
      ["the same cell twice", { p_cells: [{ color: "black", size: "XL", before: 1, after: 0 }, { color: "black", size: "XL", before: 1, after: 2 }] }],
      ["more on the shelf than was cut", { p_cells: [{ color: "black", size: "S", before: 3, after: 33 }] }],
      ["no cells at all", { p_cells: [] }],
    ];
    for (const [what, over] of cases) {
      const { error } = await manager.rpc("admin_adjust_stock", {
        p_product_id: "p-khoi",
        p_cells: [{ color: "black", size: "XL", before: 1, after: 0 }] as unknown as Json,
        p_reason: "Kiểm kê lệch",
        p_ref: "",
        p_note: "",
        p_now: now(),
        ...over,
      } as never);
      expect(error?.message, what).toBe("BAD_INPUT");
    }
    expect(await onHand("p-khoi", "black", "XL")).toBe(1);
    expect(await onHand("p-khoi", "black", "S")).toBe(3);
  });

  it("says NOT_FOUND for a style that does not exist", async () => {
    const { error } = await manager.rpc("admin_adjust_stock", {
      p_product_id: "p-khong-co",
      p_cells: [{ color: "black", size: "XL", before: 1, after: 0 }] as unknown as Json,
      p_reason: "Khác",
      p_ref: "",
      p_note: "",
      p_now: now(),
    });
    expect(error?.message).toBe("NOT_FOUND");
  });

  it("takes the product form's own reason, 'Sửa mẫu'", async () => {
    const { error } = await manager.rpc("admin_adjust_stock", {
      p_product_id: "p-khoi",
      p_cells: [{ color: "cream", size: "M", before: 2, after: 3 }] as unknown as Json,
      p_reason: "Sửa mẫu",
      p_ref: "",
      p_note: "",
      p_now: now(),
    });
    expect(error).toBeNull();
    expect(await onHand("p-khoi", "cream", "M")).toBe(3);
  });

  it("stamps sold out when the style's last piece goes, and clears it when pieces come back", async () => {
    await shelf("p-khoi", [["black", "XL", 1]]);
    const at = now();
    const gone = await manager.rpc("admin_adjust_stock", {
      p_product_id: "p-khoi",
      p_cells: [{ color: "black", size: "XL", before: 1, after: 0 }] as unknown as Json,
      p_reason: "Hư hỏng",
      p_ref: "",
      p_note: "",
      p_now: at,
    });
    expect(gone.error).toBeNull();
    expect(Date.parse((await productRow("p-khoi")).sold_out_at!)).toBe(Date.parse(at));

    const back = await manager.rpc("admin_adjust_stock", {
      p_product_id: "p-khoi",
      p_cells: [{ color: "black", size: "XL", before: 0, after: 2 }] as unknown as Json,
      p_reason: "Hàng trả về",
      p_ref: "DH-2419",
      p_note: "",
      p_now: now(),
    });
    expect(back.error).toBeNull();
    expect((await productRow("p-khoi")).sold_out_at).toBeNull();
  });
});

// ─────────────────────────────────────── sold out as a fact that moves
describe("sold_out_at is live", () => {
  it("is stamped by place_order when the last piece of a style goes", async () => {
    await shelf("p-khoi", [["black", "M", 1]]);
    const at = now();
    await placeAsGuest({}, at);
    expect(await onHand("p-khoi", "black", "M")).toBe(0);
    expect(Date.parse((await productRow("p-khoi")).sold_out_at!)).toBe(Date.parse(at));
  });

  it("is not stamped while any piece of the style is left", async () => {
    await shelf("p-khoi", [["black", "M", 1], ["cream", "S", 1]]);
    await placeAsGuest();
    expect((await productRow("p-khoi")).sold_out_at).toBeNull();
  });

  it("is cleared by the shop's cancellation, which puts the piece back", async () => {
    await shelf("p-khoi", [["black", "M", 1]]);
    const code = await placeAsGuest();
    expect((await productRow("p-khoi")).sold_out_at).not.toBeNull();
    const { error } = await manager.rpc("admin_cancel_order", {
      p_code: code,
      p_reason: "Khác",
      p_note: "",
      p_now: now(),
    });
    expect(error).toBeNull();
    expect(await onHand("p-khoi", "black", "M")).toBe(1);
    expect((await productRow("p-khoi")).sold_out_at).toBeNull();
  });

  it("is cleared by the shopper's own cancellation", async () => {
    await shelf("p-khoi", [["black", "M", 1]]);
    const placed = await place(minhanh);
    expect(placed.error).toBeNull();
    const code = (placed.data as { code: string }).code;
    expect((await productRow("p-khoi")).sold_out_at).not.toBeNull();
    const { error } = await minhanh.rpc("cancel_order", { p_code: code, p_now: now() });
    expect(error).toBeNull();
    expect((await productRow("p-khoi")).sold_out_at).toBeNull();
  });

  it("is cleared when the twelve-hour sweep puts an unpaid transfer's piece back", async () => {
    await shelf("p-khoi", [["black", "M", 1]]);
    await placeAsGuest({ payment: "BANK_TRANSFER" }, shifted(-13));
    expect((await productRow("p-khoi")).sold_out_at).not.toBeNull();
    const { data, error } = await service.rpc("expire_transfers", { p_now: now() });
    expect(error).toBeNull();
    expect(data).toBeGreaterThanOrEqual(1);
    expect(await onHand("p-khoi", "black", "M")).toBe(1);
    expect((await productRow("p-khoi")).sold_out_at).toBeNull();
  });

  it("keeps a sold-out style unsellable until pieces come back", async () => {
    await shelf("p-khoi", [["black", "M", 1]]);
    await placeAsGuest();
    const again = await place(service);
    expect(again.error?.message).toBe("OUT_OF_STOCK");
  });
});

// ──────────────────────────────────────────────────────────────── the issues
describe("admin_add_drop and admin_schedule_drop", () => {
  it("creates the next issue, and the catalogue lists it", async () => {
    const before = await eventCount();
    // After Số 06 closes (anchor + 26 days): since slice B3c a new issue may
    // not overlap another one.
    const opens = dayAt20(30);
    const closes = dayAt20(44);
    const { error } = await manager.rpc("admin_add_drop", {
      p_no: 7,
      p_opens_at: opens,
      p_closes_at: closes,
      p_now: now(),
    });
    expect(error).toBeNull();
    expect((await snapshot()).dropByNo.get(7)).toEqual({ no: 7, opensAt: opens, closesAt: closes });
    expect(await eventCount()).toBe(before + 1);
    expect(await lastEvent()).toMatchObject({
      kind: "DROP_ADDED",
      drop_no: 7,
      product_id: null,
      payload: { opensAt: opens, closesAt: closes },
    });
  });

  it("refuses any number but the next one, and a closing hour before the opening one", async () => {
    for (const no of [6, 8]) {
      const { error } = await manager.rpc("admin_add_drop", {
        p_no: no,
        p_opens_at: dayAt20(7),
        p_closes_at: dayAt20(21),
        p_now: now(),
      });
      expect(error?.message, String(no)).toBe("NOT_ALLOWED");
    }
    const { error } = await manager.rpc("admin_add_drop", {
      p_no: 7,
      p_opens_at: dayAt20(21),
      p_closes_at: dayAt20(7),
      p_now: now(),
    });
    expect(error?.message).toBe("BAD_INPUT");
    expect((await snapshot()).dropByNo.has(7)).toBe(false);
  });

  it("moves an issue's two instants and keeps both pairs in the log", async () => {
    const was = (await snapshot()).dropByNo.get(6)!;
    const next = { opensAt: dayAt20(12), closesAt: dayAt20(26) };
    const { error } = await manager.rpc("admin_schedule_drop", {
      p_no: 6,
      p_opens_at: next.opensAt,
      p_closes_at: next.closesAt,
      p_now: now(),
    });
    expect(error).toBeNull();
    expect((await snapshot()).dropByNo.get(6)).toEqual({ no: 6, ...next });
    expect(await lastEvent()).toMatchObject({
      kind: "DROP_SCHEDULED",
      drop_no: 6,
      payload: {
        before: { opensAt: was.opensAt, closesAt: was.closesAt },
        after: next,
      },
    });
  });

  it("closes an issue early by moving its closing hour to now — and checkout stops at once", async () => {
    const five = (await snapshot()).dropByNo.get(5)!;
    const at = now();
    const closed = await manager.rpc("admin_schedule_drop", {
      p_no: 5,
      p_opens_at: five.opensAt,
      p_closes_at: at,
      p_now: at,
    });
    expect(closed.error).toBeNull();
    const refused = await place(service, {}, shifted(1 / 60));
    expect(refused.error?.message).toBe("DROP_CLOSED");

    // Opening it again is the same move with the old closing hour.
    const reopened = await manager.rpc("admin_schedule_drop", {
      p_no: 5,
      p_opens_at: five.opensAt,
      p_closes_at: five.closesAt,
      p_now: now(),
    });
    expect(reopened.error).toBeNull();
    expect((await place(service)).error).toBeNull();
  });

  it("says NOT_FOUND for an issue that does not exist, and BAD_INPUT for a closing hour first", async () => {
    const none = await manager.rpc("admin_schedule_drop", {
      p_no: 99,
      p_opens_at: dayAt20(1),
      p_closes_at: dayAt20(2),
      p_now: now(),
    });
    expect(none.error?.message).toBe("NOT_FOUND");
    const backwards = await manager.rpc("admin_schedule_drop", {
      p_no: 6,
      p_opens_at: dayAt20(2),
      p_closes_at: dayAt20(2),
      p_now: now(),
    });
    expect(backwards.error?.message).toBe("BAD_INPUT");
  });
});

// ─────────────────────────────────────────────────────────────── the teasers
describe("admin_add_teaser", () => {
  const teaser = (over: Record<string, unknown> = {}) => ({
    p_slug: "thu-6",
    p_name: "THỬ",
    p_garment: "Áo khoác dù",
    p_family: "JACKET",
    p_drop_no: 6,
    p_photo_key: "suong",
    p_now: now(),
    ...over,
  });

  it("adds a teaser last, and the catalogue — the home page's source — carries it", async () => {
    const before = await eventCount();
    const { error } = await manager.rpc("admin_add_teaser", teaser());
    expect(error).toBeNull();
    const teasers = (await snapshot()).teasers;
    expect(teasers.at(-1)).toEqual({
      slug: "thu-6",
      name: "THỬ",
      kind: "Áo khoác dù",
      family: "JACKET",
      dropNo: 6,
      photoKey: "suong",
    });
    expect(teasers).toHaveLength(FIXTURE_CATALOG.teasers.length + 1);
    expect(await eventCount()).toBe(before + 1);
    expect(await lastEvent()).toMatchObject({
      kind: "TEASER_ADDED",
      drop_no: 6,
      payload: { slug: "thu-6", name: "THỬ", garment: "Áo khoác dù", family: "JACKET", photoKey: "suong" },
    });
  });

  it("refuses a slug that is taken, one that is not a slug, a photo nobody borrows, and a missing issue", async () => {
    expect((await manager.rpc("admin_add_teaser", teaser({ p_slug: "s06-soi" }))).error?.message).toBe("NOT_ALLOWED");
    expect((await manager.rpc("admin_add_teaser", teaser({ p_slug: "Thử 6" }))).error?.message).toBe("BAD_INPUT");
    expect((await manager.rpc("admin_add_teaser", teaser({ p_photo_key: "khong-co" }))).error?.message).toBe(
      "BAD_INPUT",
    );
    expect((await manager.rpc("admin_add_teaser", teaser({ p_family: "SCARF" }))).error?.message).toBe("BAD_INPUT");
    expect((await manager.rpc("admin_add_teaser", teaser({ p_drop_no: 99 }))).error?.message).toBe("NOT_FOUND");
    expect((await snapshot()).teasers).toHaveLength(FIXTURE_CATALOG.teasers.length);
  });
});

// ──────────────────────────────────────────────────────────────── the codes
describe("admin_add_promo", () => {
  it("creates a code with nothing redeemed and not paused — and checkout takes it", async () => {
    const before = await eventCount();
    const { error } = await manager.rpc("admin_add_promo", { p_terms: terms() as unknown as Json, p_now: now() });
    expect(error).toBeNull();
    const row = await promoRow("TEST10");
    expect(row).toMatchObject({ kind: "PERCENT", percent: 10, used_count: 0, paused: false, usage_limit: 100 });
    const positions = (await service.from("promotions").select("position").order("position")).data!;
    expect(row!.position).toBe(positions.at(-1)!.position);

    expect(await eventCount()).toBe(before + 1);
    const e = await lastEvent();
    expect(e).toMatchObject({ kind: "PROMO_ADDED", promo_code: "TEST10" });
    expect(e.payload).toMatchObject({ kind: "PERCENT", percent: 10, usageLimit: 100, amountVnd: null });

    const placed = await place(service, { promoCode: "test10" });
    expect(placed.error).toBeNull();
    expect((await promoRow("TEST10"))!.used_count).toBe(1);
  });

  it("refuses a taken code, a lower-case one, and terms the table's check would refuse", async () => {
    const add = (over: Record<string, unknown>) =>
      manager.rpc("admin_add_promo", { p_terms: terms(over) as unknown as Json, p_now: now() });
    expect((await add({ code: "DOT05" })).error?.message).toBe("NOT_ALLOWED");
    expect((await add({ code: "test10" })).error?.message).toBe("BAD_INPUT");
    expect((await add({ code: "TEST 10" })).error?.message).toBe("BAD_INPUT");
    expect((await add({ amountVnd: 50000 })).error?.message).toBe("BAD_INPUT");
    expect((await add({ percent: 0 })).error?.message).toBe("BAD_INPUT");
    expect((await add({ kind: "AMOUNT", percent: null })).error?.message).toBe("BAD_INPUT");
    expect((await add({ usageLimit: 0 })).error?.message).toBe("BAD_INPUT");
    expect((await add({ endsAt: shifted(-2) })).error?.message).toBe("BAD_INPUT");
    expect((await add({ startsAt: "mai" })).error?.message).toBe("BAD_INPUT");
    expect(await promoRow("TEST10")).toBeNull();
  });
});

describe("admin_edit_promo", () => {
  it("rewrites the terms, never the code, and keeps what the code has already done", async () => {
    const was = (await promoRow("DOT05"))!;
    const next = terms({
      code: "DOT05",
      percent: 12,
      maxDiscountVnd: 180000,
      minOrderVnd: 600000,
      usageLimit: 300,
      startsAt: toVnIso(new Date(was.starts_at)),
      endsAt: toVnIso(new Date(was.ends_at)),
    });
    const { error } = await manager.rpc("admin_edit_promo", {
      p_code: "DOT05",
      p_terms: next as unknown as Json,
      p_now: now(),
    });
    expect(error).toBeNull();
    const row = (await promoRow("DOT05"))!;
    expect(row).toMatchObject({ percent: 12, max_discount_vnd: 180000, min_order_vnd: 600000, usage_limit: 300 });
    expect(row.used_count).toBe(was.used_count);

    const e = await lastEvent();
    expect(e).toMatchObject({ kind: "PROMO_EDITED", promo_code: "DOT05" });
    expect(e.payload).toMatchObject({
      before: { percent: 10, maxDiscountVnd: 150000, usageLimit: 200 },
      after: { percent: 12, maxDiscountVnd: 180000, usageLimit: 300 },
    });
  });

  it("refuses a new code in the terms, an edit that changes nothing, and a code that does not exist", async () => {
    const was = (await promoRow("DOT05"))!;
    const same = {
      code: "DOT05",
      kind: "PERCENT",
      percent: 10,
      maxDiscountVnd: 150000,
      amountVnd: null,
      minOrderVnd: 500000,
      usageLimit: 200,
      startsAt: toVnIso(new Date(was.starts_at)),
      endsAt: toVnIso(new Date(was.ends_at)),
    };
    const edit = (code: string, t: Record<string, unknown>) =>
      manager.rpc("admin_edit_promo", { p_code: code, p_terms: t as unknown as Json, p_now: now() });
    expect((await edit("DOT05", { ...same, code: "DOT06" })).error?.message).toBe("BAD_INPUT");
    expect((await edit("DOT05", same)).error?.message).toBe("BAD_INPUT");
    expect((await edit("KHONGCO", { ...same, code: "KHONGCO" })).error?.message).toBe("NOT_FOUND");
  });
});

describe("admin_pause_promo", () => {
  it("pauses a code — checkout refuses it — and resumes it", async () => {
    const before = await eventCount();
    expect((await manager.rpc("admin_pause_promo", { p_code: "CHAOBAN", p_paused: true, p_now: now() })).error).toBeNull();
    expect((await promoRow("CHAOBAN"))!.paused).toBe(true);
    expect(await lastEvent()).toMatchObject({ kind: "PROMO_PAUSED", promo_code: "CHAOBAN", payload: { paused: true } });
    expect((await snapshot()).promoByCode.get("CHAOBAN" as never)!.paused).toBe(true);

    const refused = await place(service, { promoCode: "CHAOBAN", lines: [{ productId: "p-bui", color: "black", size: "L", qty: 1 }] });
    expect(refused.error?.message).toBe("PROMO_INVALID");

    expect((await manager.rpc("admin_pause_promo", { p_code: "CHAOBAN", p_paused: false, p_now: now() })).error).toBeNull();
    expect(await eventCount()).toBe(before + 2);
    const taken = await place(service, { promoCode: "CHAOBAN", lines: [{ productId: "p-bui", color: "black", size: "L", qty: 1 }] });
    expect(taken.error).toBeNull();
  });

  it("refuses to pause a paused code or resume a running one, and a code that does not exist", async () => {
    expect((await manager.rpc("admin_pause_promo", { p_code: "DOT05", p_paused: false, p_now: now() })).error?.message).toBe(
      "NOT_ALLOWED",
    );
    expect((await manager.rpc("admin_pause_promo", { p_code: "KHONGCO", p_paused: true, p_now: now() })).error?.message).toBe(
      "NOT_FOUND",
    );
  });
});

describe("admin_raise_promo_limit", () => {
  it("raises a cap, keeping before and after", async () => {
    expect((await manager.rpc("admin_raise_promo_limit", { p_code: "DOT05", p_after: 250, p_now: now() })).error).toBeNull();
    expect((await promoRow("DOT05"))!.usage_limit).toBe(250);
    expect(await lastEvent()).toMatchObject({
      kind: "PROMO_LIMIT_RAISED",
      promo_code: "DOT05",
      payload: { before: 200, after: 250 },
    });
  });

  it("sets a first cap on a code that had none", async () => {
    expect((await manager.rpc("admin_raise_promo_limit", { p_code: "CHAOBAN", p_after: 100, p_now: now() })).error).toBeNull();
    expect(await lastEvent()).toMatchObject({ payload: { before: null, after: 100 } });
  });

  it("refuses a cap that did not go up, a cap of nothing, and a code that does not exist", async () => {
    expect((await manager.rpc("admin_raise_promo_limit", { p_code: "DOT05", p_after: 200, p_now: now() })).error?.message).toBe(
      "NOT_ALLOWED",
    );
    expect((await manager.rpc("admin_raise_promo_limit", { p_code: "DOT05", p_after: 0, p_now: now() })).error?.message).toBe(
      "BAD_INPUT",
    );
    expect((await manager.rpc("admin_raise_promo_limit", { p_code: "KHONGCO", p_after: 9, p_now: now() })).error?.message).toBe(
      "NOT_FOUND",
    );
  });
});

describe("admin_end_promo", () => {
  it("ends a running code now — and checkout refuses it from then on", async () => {
    const was = (await promoRow("DOT05"))!;
    const at = now();
    expect((await manager.rpc("admin_end_promo", { p_code: "DOT05", p_now: at })).error).toBeNull();
    expect(Date.parse((await promoRow("DOT05"))!.ends_at)).toBe(Date.parse(at));
    const e = await lastEvent();
    expect(e).toMatchObject({ kind: "PROMO_ENDED", promo_code: "DOT05" });
    expect(Date.parse((e.payload as { before: string }).before)).toBe(Date.parse(was.ends_at));

    const refused = await place(service, {
      promoCode: "DOT05",
      lines: [{ productId: "p-nguoi", color: "black", size: "M", qty: 1 }],
    });
    expect(refused.error?.message).toBe("PROMO_INVALID");
  });

  it("refuses a code that is already over, and one that does not exist", async () => {
    expect((await manager.rpc("admin_end_promo", { p_code: "TET2026", p_now: now() })).error?.message).toBe("NOT_ALLOWED");
    expect((await manager.rpc("admin_end_promo", { p_code: "KHONGCO", p_now: now() })).error?.message).toBe("NOT_FOUND");
  });
});

// ─────────────────────────────────────────────────────────────── the styles
describe("admin_update_product", () => {
  it("changes a price everywhere the catalogue is read, and no receipt", async () => {
    const lines = await service.from("order_lines").select("unit_price_vnd").eq("product_id", "p-khoi");
    const { error } = await manager.rpc("admin_update_product", {
      p_id: "p-khoi",
      p_patch: { priceVnd: 420000 } as unknown as Json,
      p_now: now(),
    });
    expect(error).toBeNull();
    expect((await snapshot()).byId.get("p-khoi" as never)!.priceVnd).toBe(420000);
    const after = await service.from("order_lines").select("unit_price_vnd").eq("product_id", "p-khoi");
    expect(after.data).toEqual(lines.data);
    expect(await lastEvent()).toMatchObject({
      kind: "PRODUCT_EDITED",
      product_id: "p-khoi",
      payload: { before: { priceVnd: 390000 }, after: { priceVnd: 420000 } },
    });
  });

  it("moves a style to a new address segment; every order line still points at the style", async () => {
    const lines = await service.from("order_lines").select("order_code", { count: "exact", head: true }).eq("product_id", "p-khoi");
    const { error } = await manager.rpc("admin_update_product", {
      p_id: "p-khoi",
      p_patch: { slug: "khoi-den", name: "KHÓI ĐEN" } as unknown as Json,
      p_now: now(),
    });
    expect(error).toBeNull();
    const catalog = await snapshot();
    expect(catalog.bySlug.get("khoi-den")?.id).toBe("p-khoi");
    expect(catalog.bySlug.has("s05-khoi")).toBe(false);
    const after = await service.from("order_lines").select("order_code", { count: "exact", head: true }).eq("product_id", "p-khoi");
    expect(after.count).toBe(lines.count);
    expect(after.count).toBeGreaterThan(0);
    expect((await lastEvent()).payload).toEqual({
      before: { name: "KHÓI", slug: "s05-khoi" },
      after: { name: "KHÓI ĐEN", slug: "khoi-den" },
    });
  });

  it("files a style moved to another family's kind under that family", async () => {
    const { error } = await manager.rpc("admin_update_product", {
      p_id: "p-khoi",
      p_patch: { kind: "Áo hoodie" } as unknown as Json,
      p_now: now(),
    });
    expect(error).toBeNull();
    expect(await productRow("p-khoi")).toMatchObject({ kind: "Áo hoodie", family: "HOODIE" });
    expect((await lastEvent()).payload).toEqual({
      before: { kind: "Áo thun oversize", family: "TEE" },
      after: { kind: "Áo hoodie", family: "HOODIE" },
    });
  });

  it("never changes the cut, and refuses what the form could not have sent", async () => {
    const patch = (p: Record<string, unknown>) =>
      manager.rpc("admin_update_product", { p_id: "p-khoi", p_patch: p as unknown as Json, p_now: now() });
    expect((await patch({ cutUnits: 99 })).error?.message).toBe("BAD_INPUT");
    expect((await patch({ priceVnd: 0 })).error?.message).toBe("BAD_INPUT");
    expect((await patch({ priceVnd: "420000" })).error?.message).toBe("BAD_INPUT");
    expect((await patch({ slug: "Khói" })).error?.message).toBe("BAD_INPUT");
    expect((await patch({ dropNo: 99 })).error?.message).toBe("BAD_INPUT");
    expect((await patch({ fit: "SKINNY" })).error?.message).toBe("BAD_INPUT");
    expect((await patch({})).error?.message).toBe("BAD_INPUT");
    expect((await patch({ priceVnd: 390000 })).error?.message).toBe("BAD_INPUT");
    expect((await patch({ slug: "s05-bui" })).error?.message).toBe("NOT_ALLOWED");
    const none = await manager.rpc("admin_update_product", {
      p_id: "p-khong-co",
      p_patch: { priceVnd: 1 } as unknown as Json,
      p_now: now(),
    });
    expect(none.error?.message).toBe("NOT_FOUND");
    expect(await productRow("p-khoi")).toMatchObject({ cut_units: 35, price_vnd: 390000, slug: "s05-khoi" });
  });
});

// ──────────────────────────────────────────────────────────────── the log
describe("the log's new kinds", () => {
  it("names what each is about in its own column, or refuses the row", async () => {
    const base = { at: now(), actor_role: "admin", actor: "", payload: {} };
    for (const row of [
      { ...base, kind: "PROMO_PAUSED" },
      { ...base, kind: "INVENTORY_ADJUSTED" },
      { ...base, kind: "DROP_ADDED" },
      { ...base, kind: "PRODUCT_EDITED", product_id: "p-khoi", promo_code: "DOT05" },
    ]) {
      const { error } = await service.from("events").insert(row as never);
      expect(error, row.kind).not.toBeNull();
    }
  });
});

// ─────────────────────────────────────────────────────────────── the reset
describe("reset_demo after the catalogue was worked on", () => {
  it("puts back exactly the fixture's catalogue", async () => {
    const run = async (fn: string, args: Record<string, unknown>) => {
      const { error } = await manager.rpc(fn as never, { ...args, p_now: now() } as never);
      expect(error, fn).toBeNull();
    };
    await run("admin_update_product", { p_id: "p-khoi", p_patch: { priceVnd: 420000, slug: "khoi-den" } });
    await run("admin_adjust_stock", {
      p_product_id: "p-bui",
      p_cells: [{ color: "black", size: "L", before: 1, after: 0 }],
      p_reason: "Hư hỏng",
      p_ref: "",
      p_note: "",
    });
    await run("admin_add_drop", { p_no: 7, p_opens_at: dayAt20(30), p_closes_at: dayAt20(44) });
    await run("admin_add_teaser", {
      p_slug: "thu-7",
      p_name: "THỬ",
      p_garment: "Áo khoác dù",
      p_family: "JACKET",
      p_drop_no: 7,
      p_photo_key: "suong",
    });
    await run("admin_add_promo", { p_terms: terms() });
    await run("admin_pause_promo", { p_code: "DOT05", p_paused: true });
    await run("admin_end_promo", { p_code: "CHAOBAN" });
    // Slice B3c: a new style, a new band order, a new photo.
    await run("admin_add_product", { p_input: soi() });
    await run("admin_reorder_colors", { p_id: "p-bui", p_colors: ["grey", "black"] });
    await run("admin_set_product_photo", { p_id: "p-nang", p_color: FIXTURE_CATALOG.byId.get("p-nang" as never)!.colors[0], p_photo_key: "lua" });

    await resetTo(FIXTURE_ANCHOR);
    const catalog = await snapshot();
    expect(catalog.products).toEqual([...FIXTURE_CATALOG.products]);
    expect(catalog.drops).toEqual([...FIXTURE_CATALOG.drops]);
    expect(catalog.teasers).toEqual([...FIXTURE_CATALOG.teasers]);
    expect(catalog.promotions).toEqual([...FIXTURE_CATALOG.promotions]);
    // The manager, who also sees the styles of issues that have not opened,
    // sees exactly the fixture too: SỎI is gone, not hidden.
    expect((await snapshotAs(manager)).products).toEqual([...FIXTURE_CATALOG.products]);

    const catalogEvents = await service
      .from("events")
      .select("id", { count: "exact", head: true })
      .or("product_id.not.is.null,promo_code.not.is.null,drop_no.not.is.null");
    expect(catalogEvents.count).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════ slice B3c
// `20260924040000_photos.sql`: the bucket, a new style, a colour's photo, the
// band order, the shop not showing an issue before it opens, and a new issue
// that may not overlap another.

// ─────────────────────────────────────────────────────────────── the bucket
describe("the product-photo bucket", () => {
  it("is public to read, 1,5 MB and WebP/JPEG only, and written by the service role alone", async () => {
    const { data: bucket, error } = await service.storage.getBucket(BUCKET);
    expect(error).toBeNull();
    expect(bucket).toMatchObject({ public: true, file_size_limit: 1572864, allowed_mime_types: ["image/webp", "image/jpeg"] });

    const key = await upload();
    const visitor = await anon.storage.from(BUCKET).upload(ghostKey(), WEBP_1PX, { contentType: "image/webp" });
    expect(visitor.error, "a visitor uploaded").not.toBeNull();
    const shopper = await minhanh.storage.from(BUCKET).upload(ghostKey(), WEBP_1PX, { contentType: "image/webp" });
    expect(shopper.error, "a shopper uploaded").not.toBeNull();
    const png = await service.storage.from(BUCKET).upload(ghostKey().replace(".webp", ".png"), WEBP_1PX, {
      contentType: "image/png",
    });
    expect(png.error, "the bucket took a PNG").not.toBeNull();

    // Nobody but the service role lists or removes.
    expect((await anon.storage.from(BUCKET).list("up")).data ?? []).toEqual([]);
    expect((await manager.storage.from(BUCKET).remove([key])).data ?? []).toEqual([]);

    // …and anybody reads an object by its exact name.
    const res = await fetch(anon.storage.from(BUCKET).getPublicUrl(key).data.publicUrl);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(Buffer.from(await res.arrayBuffer()).equals(WEBP_1PX)).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────── a new style
describe("admin_add_product", () => {
  it("creates SỎI for Số 06 — band order, the cut as the sum, one event — which only the manager sees until 06 opens", async () => {
    const up = await upload();
    const before = await eventCount();
    const positions = (await service.from("products").select("position").order("position")).data!;
    const at = now();
    const { data, error } = await manager.rpc("admin_add_product", {
      p_input: soi({
        colors: [
          { color: "black", photoKey: up },
          { color: "cream", photoKey: "lua" },
          { color: "moss", photoKey: "tro" },
        ],
      }),
      p_now: at,
    });
    expect(error).toBeNull();
    expect(data).toBe("p-soi");

    expect(await productRow("p-soi")).toEqual({
      slug: "soi",
      name: "SỎI",
      kind: "Áo khoác dù",
      family: "JACKET",
      price_vnd: 420000,
      cut_units: 36,
      drop_no: 6,
      sold_out_at: null,
    });
    const row = await service.from("products").select("position, fit, material").eq("id", "p-soi").single();
    expect(row.data).toEqual({ position: positions.at(-1)!.position + 1, fit: "OVERSIZE", material: "Dù hai lớp" });
    const colors = await service
      .from("product_colors")
      .select("color, position, photo_key")
      .eq("product_id", "p-soi")
      .order("position");
    expect(colors.data).toEqual([
      { color: "black", position: 0, photo_key: up },
      { color: "cream", position: 1, photo_key: "lua" },
      { color: "moss", position: 2, photo_key: "tro" },
    ]);
    const cells = await service.from("stock_cells").select("on_hand").eq("product_id", "p-soi");
    expect(cells.data).toHaveLength(12);
    expect(await onHand("p-soi", "cream", "XL")).toBe(2);

    expect(await eventCount()).toBe(before + 1);
    const e = await lastEvent();
    expect(e).toMatchObject({
      kind: "PRODUCT_ADDED",
      actor_role: "admin",
      actor: DEMO_ADMIN.email,
      product_id: "p-soi",
      order_code: null,
      promo_code: null,
      drop_no: null,
      payload: {
        id: "p-soi",
        name: "SỎI",
        slug: "soi",
        dropNo: 6,
        colors: ["black", "cream", "moss"],
        cutUnits: 36,
        uploaded: 1,
        borrowed: 2,
      },
    });
    expect(Date.parse(e.at)).toBe(Date.parse(at));

    // The manager sees it, the shop does not: Số 06 has not opened.
    const seen = (await snapshotAs(manager)).bySlug.get("soi");
    expect(seen).toMatchObject({ colors: ["black", "cream", "moss"], photoKeys: [up, "lua", "tro"], cutUnits: 36, dropNo: 6 });
    expect((await snapshot()).bySlug.has("soi")).toBe(false);
    expect((await snapshotAs(minhanh)).bySlug.has("soi")).toBe(false);
    expect((await snapshot()).products).toHaveLength(FIXTURE_CATALOG.products.length);

    // …and checkout refuses it with the code it always had.
    const refused = await place(service, { lines: [{ productId: "p-soi", color: "black", size: "M", qty: 1 }] });
    expect(refused.error?.message).toBe("DROP_CLOSED");

    // The hour Số 06 opens, the shop has it.
    const six = (await snapshot()).dropByNo.get(6)!;
    const opened = await manager.rpc("admin_schedule_drop", {
      p_no: 6,
      p_opens_at: shifted(-1),
      p_closes_at: six.closesAt,
      p_now: now(),
    });
    expect(opened.error).toBeNull();
    expect((await snapshot()).bySlug.get("soi")?.photoKeys).toEqual([up, "lua", "tro"]);
  });

  it("puts a style of the issue that is selling on the shop at once, and checkout takes it", async () => {
    const { error } = await manager.rpc("admin_add_product", {
      p_input: soi({ dropNo: 5, slug: "soi-05", name: "SỎI" }),
      p_now: now(),
    });
    expect(error).toBeNull();
    const shop = await snapshot();
    expect(shop.bySlug.get("soi-05")).toMatchObject({ id: "p-soi-05", dropNo: 5, cutUnits: 36 });
    // Last in the catalogue order, as `position` = max + 1 puts it.
    expect(shop.products.at(-1)!.id).toBe("p-soi-05");
    const placed = await place(service, { lines: [{ productId: "p-soi-05", color: "moss", size: "L", qty: 1 }] });
    expect(placed.error).toBeNull();
    expect(await onHand("p-soi-05", "moss", "L")).toBe(3);
  });

  it("refuses what the form could not have sent, each with its code, and writes nothing", async () => {
    const products = (await snapshotAs(manager)).products.length;
    const events = await eventCount();
    const add = (over: Record<string, unknown>) =>
      manager.rpc("admin_add_product", { p_input: soi(over), p_now: now() });
    const colors3 = (black: string, cream: string, moss: string) => [
      { color: "black", photoKey: black },
      { color: "cream", photoKey: cream },
      { color: "moss", photoKey: moss },
    ];
    const cut = {
      black: { S: 3, M: 4, L: 4, XL: 1 },
      cream: { S: 2, M: 4, L: 4, XL: 2 },
      moss: { S: 3, M: 4, L: 4, XL: 1 },
    };

    // The address segment, and the id it makes.
    expect((await add({ slug: "khoi" })).error?.message).toBe("NOT_ALLOWED");
    // The issue: closed, or not there.
    expect((await add({ dropNo: 4 })).error?.message).toBe("DROP_CLOSED");
    expect((await add({ dropNo: 99 })).error?.message).toBe("NOT_FOUND");
    // The colours and the cut.
    expect((await add({ colors: [] })).error?.message).toBe("NO_COLORS");
    const empty = await add({ cells: { ...cut, cream: { S: 0, M: 0, L: 0, XL: 0 } } });
    expect(empty.error).toMatchObject({ message: "COLOR_EMPTY", details: "cream" });
    const unlisted = await add({ cells: { black: cut.black, cream: cut.cream } });
    expect(unlisted.error).toMatchObject({ message: "COLOR_EMPTY", details: "moss" });
    // The photos.
    const missing = await add({ colors: colors3("suong", "lua", "") });
    expect(missing.error).toMatchObject({ message: "PHOTO_MISSING", details: "moss" });
    const ghost = await add({ colors: colors3(ghostKey(), "lua", "tro") });
    expect(ghost.error).toMatchObject({ message: "PHOTO_UNKNOWN", details: "black" });
    const unknown = await add({ colors: colors3("suong", "khong-co", "tro") });
    expect(unknown.error).toMatchObject({ message: "PHOTO_UNKNOWN", details: "cream" });
    // Everything else a form could not have sent.
    for (const [what, over] of [
      ["a colour twice", { colors: [{ color: "black", photoKey: "suong" }, { color: "black", photoKey: "lua" }], cells: { black: cut.black } }],
      ["a cell of 1000", { cells: { ...cut, black: { ...cut.black, M: 1000 } } }],
      ["a cell of -1", { cells: { ...cut, black: { ...cut.black, M: -1 } } }],
      ["a size missing", { cells: { ...cut, black: { S: 3, M: 4, L: 4 } } }],
      ["a colour it does not come in", { cells: { ...cut, navy: cut.black } }],
      ["a price of 0", { priceVnd: 0 }],
      ["a price under 1.000", { priceVnd: 999 }],
      ["a price over 99.999.999", { priceVnd: 100000000 }],
      ["a kind nobody wears", { kind: "Áo len" }],
      ["a family the kind is not filed under", { family: "TEE" }],
      ["a segment with a capital", { slug: "Soi" }],
      ["a one-letter segment", { slug: "s" }],
      ["an empty name", { name: " " }],
      ["a fit that is not one", { fit: "SKINNY" }],
    ] as Array<[string, Record<string, unknown>]>) {
      expect((await add(over)).error?.message, what).toBe("BAD_INPUT");
    }

    // A segment that is free but makes a taken id: KHÓI moved to `khoi-den`
    // keeps `p-khoi`.
    const moved = await manager.rpc("admin_update_product", {
      p_id: "p-khoi",
      p_patch: { slug: "khoi-den" } as unknown as Json,
      p_now: now(),
    });
    expect(moved.error).toBeNull();
    expect((await add({ slug: "khoi", name: "KHÓI" })).error?.message).toBe("NOT_ALLOWED");

    expect((await snapshotAs(manager)).products).toHaveLength(products);
    expect(await eventCount()).toBe(events + 1); // the one edit above, nothing else
  });

  it("answers a shopper NOT_ADMIN, a visitor not at all, and holds the manager to the clock", async () => {
    expect((await minhanh.rpc("admin_add_product", { p_input: soi(), p_now: now() })).error?.message).toBe("NOT_ADMIN");
    const visitor = await anon.rpc("admin_add_product", { p_input: soi(), p_now: now() });
    expect(visitor.error).not.toBeNull();
    expect(visitor.error!.message).not.toBe("NOT_ADMIN");
    expect((await manager.rpc("admin_add_product", { p_input: soi(), p_now: shifted(10 / 60) })).error?.message).toBe(
      "BAD_INPUT",
    );
    expect((await snapshotAs(manager)).bySlug.has("soi")).toBe(false);
  });
});

// ─────────────────────────────────────────────────── one colour's photo
describe("admin_set_product_photo", () => {
  it("swaps KHÓI's cream photo for an upload and back, answering with the key it replaced; one event each", async () => {
    const up = await upload();
    const before = await eventCount();
    const swapped = await manager.rpc("admin_set_product_photo", {
      p_id: "p-khoi",
      p_color: "cream",
      p_photo_key: up,
      p_now: now(),
    });
    expect(swapped.error).toBeNull();
    expect(swapped.data).toBe("shot-khoi-cream");
    expect((await snapshot()).byId.get("p-khoi" as never)!.photoKeys).toEqual(["shot-khoi-black", up]);
    expect(await lastEvent()).toMatchObject({
      kind: "PRODUCT_PHOTO_SET",
      product_id: "p-khoi",
      payload: { id: "p-khoi", color: "cream", before: "shot-khoi-cream", after: up },
    });

    const back = await manager.rpc("admin_set_product_photo", {
      p_id: "p-khoi",
      p_color: "cream",
      p_photo_key: "shot-khoi-cream",
      p_now: now(),
    });
    expect(back.error).toBeNull();
    expect(back.data).toBe(up);
    expect(await eventCount()).toBe(before + 2);
  });

  it("refuses the photo the colour has, a colour the style lacks, a style that is not there, and a photo that is not one", async () => {
    const set = (over: Record<string, unknown>) =>
      manager.rpc("admin_set_product_photo", {
        p_id: "p-khoi",
        p_color: "cream",
        p_photo_key: "lua",
        p_now: now(),
        ...over,
      } as never);
    expect((await set({ p_photo_key: "shot-khoi-cream" })).error?.message).toBe("BAD_INPUT");
    expect((await set({ p_photo_key: "" })).error?.message).toBe("BAD_INPUT");
    expect((await set({ p_color: "moss" })).error?.message).toBe("NOT_FOUND");
    expect((await set({ p_id: "p-khong-co" })).error?.message).toBe("NOT_FOUND");
    expect((await set({ p_photo_key: "khong-co" })).error).toMatchObject({ message: "PHOTO_UNKNOWN", details: "cream" });
    expect((await set({ p_photo_key: ghostKey() })).error?.message).toBe("PHOTO_UNKNOWN");
    expect((await set({ p_now: shifted(10 / 60) })).error?.message).toBe("BAD_INPUT");
    expect(
      (await minhanh.rpc("admin_set_product_photo", { p_id: "p-khoi", p_color: "cream", p_photo_key: "lua", p_now: now() }))
        .error?.message,
    ).toBe("NOT_ADMIN");
    expect((await snapshot()).byId.get("p-khoi" as never)!.photoKeys).toEqual(["shot-khoi-black", "shot-khoi-cream"]);
  });
});

// ─────────────────────────────────────────────────────── the band order
describe("admin_reorder_colors", () => {
  it("puts KHÓI's cream first — its photo and its shelf travel with it — with one event", async () => {
    const was = (await snapshot()).byId.get("p-khoi" as never)!;
    const before = await eventCount();
    const { error } = await manager.rpc("admin_reorder_colors", {
      p_id: "p-khoi",
      p_colors: ["cream", "black"],
      p_now: now(),
    });
    expect(error).toBeNull();
    const now2 = (await snapshot()).byId.get("p-khoi" as never)!;
    expect(now2.colors).toEqual(["cream", "black"]);
    expect(now2.photoKeys).toEqual(["shot-khoi-cream", "shot-khoi-black"]);
    expect(now2.stock).toEqual(was.stock);
    expect(await eventCount()).toBe(before + 1);
    expect(await lastEvent()).toMatchObject({
      kind: "PRODUCT_COLORS_REORDERED",
      product_id: "p-khoi",
      payload: { id: "p-khoi", before: ["black", "cream"], after: ["cream", "black"] },
    });
  });

  it("turns a three-colour band round in one go", async () => {
    const nang = (await snapshot()).bySlug.get("s05-nang")!;
    expect(nang.colors).toHaveLength(3);
    const turned = [nang.colors[2]!, nang.colors[0]!, nang.colors[1]!];
    const { error } = await manager.rpc("admin_reorder_colors", { p_id: nang.id, p_colors: turned, p_now: now() });
    expect(error).toBeNull();
    const after = (await snapshot()).bySlug.get("s05-nang")!;
    expect(after.colors).toEqual(turned);
    expect(after.photoKeys).toEqual([nang.photoKeys[2], nang.photoKeys[0], nang.photoKeys[1]]);
    const positions = await service.from("product_colors").select("position").eq("product_id", nang.id).order("position");
    expect(positions.data!.map((r) => r.position)).toEqual([0, 1, 2]);
  });

  it("refuses anything but a new order of exactly the style's colours", async () => {
    const order = (colors: string[], id = "p-khoi") =>
      manager.rpc("admin_reorder_colors", { p_id: id, p_colors: colors as never, p_now: now() });
    for (const colors of [["black"], ["black", "cream", "moss"], ["cream", "cream"], ["black", "moss"], ["black", "cream"], []]) {
      expect((await order(colors)).error?.message, JSON.stringify(colors)).toBe("BAD_INPUT");
    }
    expect((await order(["black"], "p-khong-co")).error?.message).toBe("NOT_FOUND");
    expect(
      (await minhanh.rpc("admin_reorder_colors", { p_id: "p-khoi", p_colors: ["cream", "black"], p_now: now() })).error
        ?.message,
    ).toBe("NOT_ADMIN");
    expect((await snapshot()).byId.get("p-khoi" as never)!.colors).toEqual(["black", "cream"]);
  });
});

// ─────────────────────────────────────────── a new issue, and a teaser's photo
describe("admin_add_drop and photo_key_ok, slice B3c", () => {
  it("refuses a new issue that overlaps another, naming it; one that opens as the last closes is fine", async () => {
    const six = (await snapshot()).dropByNo.get(6)!;
    const inside = await manager.rpc("admin_add_drop", {
      p_no: 7,
      p_opens_at: six.opensAt,
      p_closes_at: dayAt20(60),
      p_now: now(),
    });
    expect(inside.error).toMatchObject({ message: "NOT_ALLOWED", details: "6" });

    const after = await manager.rpc("admin_add_drop", {
      p_no: 7,
      p_opens_at: six.closesAt,
      p_closes_at: dayAt20(60),
      p_now: now(),
    });
    expect(after.error).toBeNull();
  });

  it("lets a teaser show an uploaded photo that is in the bucket, and not one that is not", async () => {
    const up = await upload();
    const teaser = (slug: string, photo: string) =>
      manager.rpc("admin_add_teaser", {
        p_slug: slug,
        p_name: "THỬ",
        p_garment: "Áo khoác dù",
        p_family: "JACKET",
        p_drop_no: 6,
        p_photo_key: photo,
        p_now: now(),
      });
    expect((await teaser("thu-6", up)).error).toBeNull();
    expect((await teaser("thu-7", ghostKey())).error?.message).toBe("BAD_INPUT");
    // The borrowed rule is the old one: a frame the catalogue uses.
    expect((await teaser("thu-8", "vo")).error).toBeNull();
  });

  it("keeps the photo check out of reach of every API role", async () => {
    for (const client of [anon, minhanh, manager]) {
      const { error } = await client.rpc("photo_key_ok" as never, { p_key: "shot-khoi-black" } as never);
      expect(error).not.toBeNull();
    }
  });
});
