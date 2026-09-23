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
 * Needs a running stack, `.env.local` and the nine demo accounts
 * (`npm run seed:users`).
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
  const { data, error } = await anon.rpc("catalog_snapshot");
  if (error) throw new Error(`catalog_snapshot failed: ${error.message}`);
  return buildCatalog(parseCatalogSnapshot(data));
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
});

// ───────────────────────────────────────────── who may call them at all
describe("the role", () => {
  const calls = (): Array<[string, Record<string, unknown>]> => [
    ["admin_adjust_stock", { p_product_id: "p-khoi", p_cells: [{ color: "black", size: "XL", before: 1, after: 0 }], p_reason: "Khác", p_ref: "", p_note: "", p_now: now() }],
    ["admin_add_drop", { p_no: 7, p_opens_at: dayAt20(7), p_closes_at: dayAt20(21), p_now: now() }],
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
    const opens = dayAt20(7);
    const closes = dayAt20(21);
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
    expect((await manager.rpc("admin_add_teaser", teaser({ p_slug: "soi" }))).error?.message).toBe("NOT_ALLOWED");
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
    expect(catalog.bySlug.has("khoi")).toBe(false);
    const after = await service.from("order_lines").select("order_code", { count: "exact", head: true }).eq("product_id", "p-khoi");
    expect(after.count).toBe(lines.count);
    expect(after.count).toBeGreaterThan(0);
    expect((await lastEvent()).payload).toEqual({
      before: { name: "KHÓI", slug: "khoi" },
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
    expect((await patch({ slug: "bui" })).error?.message).toBe("NOT_ALLOWED");
    const none = await manager.rpc("admin_update_product", {
      p_id: "p-khong-co",
      p_patch: { priceVnd: 1 } as unknown as Json,
      p_now: now(),
    });
    expect(none.error?.message).toBe("NOT_FOUND");
    expect(await productRow("p-khoi")).toMatchObject({ cut_units: 35, price_vnd: 390000, slug: "khoi" });
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
    await run("admin_add_drop", { p_no: 7, p_opens_at: dayAt20(7), p_closes_at: dayAt20(21) });
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

    await resetTo(FIXTURE_ANCHOR);
    const catalog = await snapshot();
    expect(catalog.products).toEqual([...FIXTURE_CATALOG.products]);
    expect(catalog.drops).toEqual([...FIXTURE_CATALOG.drops]);
    expect(catalog.teasers).toEqual([...FIXTURE_CATALOG.teasers]);
    expect(catalog.promotions).toEqual([...FIXTURE_CATALOG.promotions]);

    const catalogEvents = await service
      .from("events")
      .select("id", { count: "exact", head: true })
      .or("product_id.not.is.null,promo_code.not.is.null,drop_no.not.is.null");
    expect(catalogEvents.count).toBe(0);
  });
});
