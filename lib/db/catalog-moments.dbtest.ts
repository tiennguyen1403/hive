import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TEASER_LEAD_HOURS } from "@/data/catalog";
import { CUSTOMERS } from "@/data/customers";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import type { ColorKey, Product } from "@/data/types";
import { buildCatalog, type Catalog } from "@/lib/catalog";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import { isFixed, lastSoldAtOf } from "@/lib/inventory";
import { parseCatalogSnapshot } from "./catalog-snapshot";
import type { Database, Json } from "./database.types";

/**
 * What slice B12 claims, checked against Postgres
 * (`supabase/migrations/20260930170000_last_sold_announced.sql`):
 *
 *   (a) every colour of every style the catalogue shows carries when it last
 *       sold — the placing of the most recent order still in force that took
 *       a piece of it — or null, and the dates agree with the orders
 *       themselves;
 *   (b) a cancelled order does not count, nor a transfer past its hold, and
 *       an order placed moves the date;
 *   (c) the catalogue says nothing else about any order — no code, no buyer,
 *       no quantity — to a visitor, a shopper or the manager, and a shopper
 *       sees the dates every visitor sees, not only those of their own
 *       orders; styles of an issue that has not opened are not dated for a
 *       visitor;
 *   (d) the sample teasers are announced fourteen days and eight hours before
 *       Số 06 opens, on whatever instant the demo is anchored;
 *   (e) a teaser the manager adds is announced the moment it is added.
 *
 * Needs a running stack, `.env.local` and the demo accounts
 * (`npm run seed:users`). Every test starts from the shop as the app sees it
 * (`reset_demo(demo_anchor())`), and the file leaves it that way.
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

const noSession = { auth: { autoRefreshToken: false, persistSession: false } };

/** What a visitor gets: the publishable key, no session. */
const anon: Client = createClient<Database>(url, publishableKey, noSession);

/** The service role — only a script or a test ever holds this. */
const service: Client = createClient<Database>(url, secretKey, noSession);

async function signedIn(email: string): Promise<Client> {
  const client = createClient<Database>(url!, publishableKey!, noSession);
  const { error } = await client.auth.signInWithPassword({ email, password: demoPassword! });
  if (error) throw new Error(`could not sign in as ${email}: ${error.message}`);
  return client;
}

let manager: Client;
let shopper: Client;

const FIXTURE_ANCHOR = "2026-09-20T18:50:00+07:00";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const VN_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/;

/** The app's clock, the way a Server Action sends it. */
const realNow = () => toVnIso(demoNow());
/** `realNow`, `hours` earlier. */
const hoursAgo = (hours: number) => toVnIso(new Date(demoNow().getTime() - hours * HOUR));

/** The shop on a given anchor, or — null — on the real clock's, as the app sees it. */
async function resetTo(anchor: string | null) {
  let p = anchor;
  if (p === null) {
    const a = await service.rpc("demo_anchor");
    if (a.error) throw new Error(`demo_anchor failed: ${a.error.message}`);
    p = a.data;
  }
  const { error } = await service.rpc("reset_demo", { p_anchor: p });
  if (error) throw new Error(`reset_demo failed: ${error.message}`);
}

async function rawSnapshot(client: Client): Promise<unknown> {
  const { data, error } = await client.rpc("catalog_snapshot");
  if (error) throw new Error(`catalog_snapshot failed: ${error.message}`);
  return data;
}

async function snapshotAs(client: Client): Promise<Catalog> {
  return buildCatalog(parseCatalogSnapshot(await rawSnapshot(client)));
}

/**
 * When each (style, colour) last sold, worked out here from the orders
 * themselves — read with the service role — by the slice's rule: the latest
 * placing among orders that are neither cancelled nor a transfer whose hold
 * has run out.
 */
async function lastSalesFromOrders(): Promise<Map<string, number>> {
  const orders = await service.from("orders").select("code, state, due_at, placed_at");
  const lines = await service.from("order_lines").select("order_code, product_id, color");
  if (orders.error || lines.error) throw new Error(orders.error?.message ?? lines.error?.message);
  const now = Date.now();
  const inForce = new Map<string, number>();
  for (const o of orders.data) {
    if (o.state === "CANCELLED") continue;
    if (o.state === "AWAITING_TRANSFER" && Date.parse(o.due_at!) <= now) continue;
    inForce.set(o.code, Date.parse(o.placed_at));
  }
  const last = new Map<string, number>();
  for (const l of lines.data) {
    const at = inForce.get(l.order_code);
    if (at === undefined) continue;
    const key = `${l.product_id}/${l.color}`;
    last.set(key, Math.max(last.get(key) ?? 0, at));
  }
  return last;
}

/** A style's dates, keyed `p-khoi/black`, instants as milliseconds (null for none). */
function datesOf(products: readonly Product[]): Map<string, number | null> {
  const out = new Map<string, number | null>();
  for (const p of products) {
    for (const c of p.colors) {
      const at = lastSoldAtOf(p, c);
      out.set(`${p.id}/${c}`, at === null ? null : Date.parse(at));
    }
  }
  return out;
}

beforeAll(async () => {
  manager = await signedIn(DEMO_ADMIN.email);
  shopper = await signedIn(CUSTOMERS[0]!.email);
});

beforeEach(async () => {
  await resetTo(null);
});

afterAll(async () => {
  await resetTo(null);
});

// ─────────────────────────────────────────── (a) every colour, dated
describe("(a) every colour of every style carries when it last sold, or null", () => {
  it("dates each colour exactly as the orders do — and gives every colour a key", async () => {
    const catalog = await snapshotAs(anon);
    const expected = await lastSalesFromOrders();
    let dated = 0;
    for (const p of catalog.products) {
      expect(Object.keys(p.lastSoldAt ?? {}).sort(), p.id).toEqual([...p.colors].sort());
      for (const c of p.colors) {
        const at = lastSoldAtOf(p, c);
        const want = expected.get(`${p.id}/${c}`);
        if (want === undefined) {
          expect(at, `${p.id}/${c}`).toBeNull();
        } else {
          expect(at, `${p.id}/${c}`).toMatch(VN_ISO);
          expect(Date.parse(at!), `${p.id}/${c}`).toBe(want);
          dated += 1;
        }
      }
    }
    // The sample sells a good share of its colours, and leaves the rest undated.
    expect(dated).toBeGreaterThan(10);
    expect([...datesOf(catalog.products).values()].filter((v) => v === null).length).toBeGreaterThan(10);
  });

  it("leaves a colour nobody bought null — a fixed style's, and SƯƠNG đen, whose only order was cancelled", async () => {
    const catalog = await snapshotAs(anon);
    const tee = catalog.products.find(isFixed)!;
    for (const c of tee.colors) expect(lastSoldAtOf(tee, c), `${tee.id}/${c}`).toBeNull();
    // DH-2418, the only order of SƯƠNG in black, was called off ("Khách đổi ý").
    const suong = catalog.byId.get("p-suong" as never)!;
    expect(lastSoldAtOf(suong, "black")).toBeNull();
    expect(lastSoldAtOf(suong, "moss")).toMatch(VN_ISO);
  });
});

// ─────────────────────────────── (b) cancelled, overdue, and a new order
describe("(b) an order moves the date; a cancelled one and a transfer past its hold do not count", () => {
  const TEE = FIXTURE_CATALOG.products.find(isFixed)!;
  const COLOR: ColorKey = TEE.colors[0]!;
  const OTHER: ColorKey = TEE.colors[1]!;

  /** A guest's order of one piece, placed at `at` through the service role. */
  async function placeAt(at: string, payment: "COD" | "BANK_TRANSFER"): Promise<string> {
    const { data, error } = await service.rpc("place_order", {
      p_input: {
        lines: [{ productId: TEE.id, color: COLOR, size: "M", qty: 1 }],
        recipient: "Khách Thử Mốc",
        phone: "0901234567",
        email: "moc@example.test",
        provinceCode: "29",
        wardCode: "70101063",
        line: "1 Thử Mốc",
        note: "",
        delivery: "STANDARD",
        payment,
        promoCode: null,
      } as unknown as Json,
      p_now: at,
    });
    if (error) throw new Error(`place_order refused: ${error.message}`);
    return (data as { code: string }).code;
  }

  async function dateOf(color: ColorKey): Promise<string | null> {
    const p = (await snapshotAs(anon)).byId.get(TEE.id)!;
    return lastSoldAtOf(p, color);
  }

  it("follows the newest order in force, and steps back past a cancelled one and an overdue transfer", async () => {
    const stock = await service
      .from("stock_cells")
      .update({ on_hand: 20 })
      .eq("product_id", TEE.id)
      .eq("color", COLOR)
      .eq("size", "M");
    expect(stock.error).toBeNull();
    expect(await dateOf(COLOR)).toBeNull();

    // A COD order three hours ago: that is when the colour last sold.
    const t1 = hoursAgo(3);
    await placeAt(t1, "COD");
    expect(await dateOf(COLOR)).toBe(t1);

    // A transfer two hours ago, inside its twelve hours: the newest.
    const t2 = hoursAgo(2);
    const b = await placeAt(t2, "BANK_TRANSFER");
    expect(await dateOf(COLOR)).toBe(t2);

    // Called off: it no longer counts, and the date is the COD order's again.
    const cancelled = await service
      .from("orders")
      .update({ state: "CANCELLED", cancelled_at: realNow(), cancel_reason: "khách huỷ" })
      .eq("code", b);
    expect(cancelled.error).toBeNull();
    expect(await dateOf(COLOR)).toBe(t1);

    // A transfer an hour ago whose hold has run out — not swept yet, but
    // every screen reads it as cancelled already: it does not count either.
    const c = await placeAt(hoursAgo(1), "BANK_TRANSFER");
    const overdue = await service
      .from("orders")
      .update({ due_at: toVnIso(new Date(demoNow().getTime() - 60_000)) })
      .eq("code", c);
    expect(overdue.error).toBeNull();
    expect(await dateOf(COLOR)).toBe(t1);

    // Another colour of the same style was never bought.
    expect(await dateOf(OTHER)).toBeNull();
  });
});

// ───────────────────────────────────────── (c) nothing else about orders
describe("(c) the catalogue shows when a colour sold, and nothing else about any order", () => {
  const PRODUCT_KEYS = [
    "id", "slug", "name", "kind", "family", "material", "fit", "priceVnd", "cutUnits",
    "dropNo", "soldOutAt", "colors", "photoKeys", "stock", "details", "lastSoldAt",
  ].sort();
  const TEASER_KEYS = ["slug", "name", "kind", "family", "dropNo", "photoKey", "announcedAt"].sort();

  /** Everything personal the sample holds: names, e-mails, numbers, addresses. */
  const PERSONAL = CUSTOMERS.flatMap((c) => [
    c.name,
    c.email,
    c.phone.replace(/\s/g, ""),
    ...c.addresses.flatMap((a) => [a.recipient, a.line, a.phone.replace(/\s/g, "")]),
  ]);

  for (const [who, client] of [
    ["a visitor", () => anon],
    ["a signed-in shopper", () => shopper],
    ["the manager", () => manager],
  ] as const) {
    it(`gives ${who} no order code, no buyer and no quantity — only a moment or null per colour`, async () => {
      const raw = (await rawSnapshot(client())) as {
        products: Array<Record<string, unknown>>;
        teasers: Array<Record<string, unknown>>;
      };
      const text = JSON.stringify(raw);
      expect(text).not.toMatch(/DH-\d{4,}/);
      for (const secret of PERSONAL) expect(text, secret).not.toContain(secret);
      for (const p of raw.products) {
        expect(Object.keys(p).sort(), String(p.id)).toEqual(PRODUCT_KEYS);
        for (const [color, at] of Object.entries(p.lastSoldAt as Record<string, unknown>)) {
          expect(at === null || (typeof at === "string" && VN_ISO.test(at)), `${String(p.id)}/${color}`).toBe(true);
        }
      }
      for (const t of raw.teasers) expect(Object.keys(t).sort(), String(t.slug)).toEqual(TEASER_KEYS);
    });
  }

  it("dates the colours for a shopper as for everybody — not only by that shopper's own orders", async () => {
    const seen = datesOf((await snapshotAs(anon)).products);
    expect(datesOf((await snapshotAs(shopper)).products)).toEqual(seen);
    // The manager also sees every style of an issue not yet open; the ones a visitor sees are dated alike.
    const all = datesOf((await snapshotAs(manager)).products);
    for (const [key, at] of seen) expect(all.get(key), key).toBe(at);
  });

  it("answers catalog_last_sold() with a style, a colour and a moment, and nothing more", async () => {
    const { data, error } = await anon.rpc("catalog_last_sold");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    for (const row of data!) expect(Object.keys(row).sort()).toEqual(["color", "product_id", "sold_at"]);
  });

  it("dates no style of an issue that has not opened for a visitor, only for the manager", async () => {
    // Anchored ten days ahead, Số 05 opens in the future — and so were its sample orders placed.
    await resetTo(toVnIso(new Date(demoNow().getTime() + 10 * DAY)));
    const five = new Set(FIXTURE_CATALOG.products.filter((p) => p.dropNo === 5).map((p) => String(p.id)));
    const visitor = await anon.rpc("catalog_last_sold");
    expect(visitor.error).toBeNull();
    expect(visitor.data!.filter((r) => five.has(r.product_id))).toEqual([]);
    const theShop = await manager.rpc("catalog_last_sold");
    expect(theShop.error).toBeNull();
    expect(theShop.data!.filter((r) => five.has(r.product_id)).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────── (d) the sample teasers
describe("(d) the sample teasers are announced TEASER_LEAD_HOURS before Số 06 opens, on any anchor", () => {
  async function teasersAndOpening() {
    const catalog = await snapshotAs(anon);
    return { teasers: catalog.teasers, opensAt: catalog.dropByNo.get(6)!.opensAt };
  }

  it("keeps the lead on the real clock's anchor, after reset_demo(demo_anchor())", async () => {
    const { teasers, opensAt } = await teasersAndOpening();
    expect(teasers).toHaveLength(2);
    for (const t of teasers) {
      expect(t.announcedAt, t.slug).toMatch(VN_ISO);
      expect((Date.parse(opensAt) - Date.parse(t.announcedAt!)) / HOUR, t.slug).toBe(TEASER_LEAD_HOURS);
    }
  });

  it("is the fixture's own minute on the fixture's anchor, and moves with it", async () => {
    await resetTo(FIXTURE_ANCHOR);
    let got = await teasersAndOpening();
    expect(got.teasers.map((t) => t.announcedAt)).toEqual(["2026-09-18T12:00:00+07:00", "2026-09-18T12:00:00+07:00"]);
    expect(got.teasers).toEqual([...FIXTURE_CATALOG.teasers]);

    await resetTo("2026-09-25T18:50:00+07:00");
    got = await teasersAndOpening();
    expect(got.opensAt).toBe("2026-10-07T20:00:00+07:00");
    expect(got.teasers.map((t) => t.announcedAt)).toEqual(["2026-09-23T12:00:00+07:00", "2026-09-23T12:00:00+07:00"]);
  });
});

// ──────────────────────────────────────── (e) a teaser the manager adds
describe("(e) a teaser the manager adds is announced the moment it is added", () => {
  it("carries the instant it was added, which its log line carries too", async () => {
    const at = realNow();
    const { error } = await manager.rpc("admin_add_teaser", {
      p_slug: "thu-moc-6",
      p_name: "THỬ",
      p_garment: "Áo khoác dù",
      p_family: "JACKET",
      p_drop_no: 6,
      p_photo_key: "suong",
      p_now: at,
    });
    expect(error).toBeNull();

    const teasers = (await snapshotAs(anon)).teasers;
    expect(teasers.find((t) => t.slug === "thu-moc-6")?.announcedAt).toBe(at);
    // The sample teasers keep theirs.
    expect(teasers.filter((t) => t.slug !== "thu-moc-6").every((t) => t.announcedAt !== null)).toBe(true);

    const logged = await service
      .from("events")
      .select("at")
      .eq("kind", "TEASER_ADDED")
      .order("id", { ascending: false })
      .limit(1)
      .single();
    expect(logged.error).toBeNull();
    expect(Date.parse(logged.data!.at)).toBe(Date.parse(at));
  });
});
