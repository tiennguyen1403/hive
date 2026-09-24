import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { SIZES, type Product } from "@/data/types";
import { buildCatalog } from "@/lib/catalog";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import { dropState } from "@/lib/drop";
import { isFixed } from "@/lib/inventory";
import { parseCatalogSnapshot } from "./catalog-snapshot";
import type { Database, Json } from "./database.types";

/**
 * What slice B5 claims, checked against Postgres
 * (`20260925090000_fixed_styles.sql`): a FIXED style — `drop_no` and
 * `cut_units` both null — belongs to no issue.
 *
 *   · the catalogue always carries the eight, to a visitor too, while issue
 *     05 is open AND between two issues;
 *   · checkout sells one at any hour, and still refuses a closed issue's style;
 *   · its shelf has no ceiling, and "Nhập thêm" brings sizes back — for a
 *     fixed style only, and only upward;
 *   · an empty shelf never stamps it sold out;
 *   · the back office can create one, and cannot turn one kind into the other;
 *   · the table itself refuses a half-fixed row;
 *   · `reset_demo()` puts the eight back exactly, after any of it.
 *
 * `catalog_snapshot()` asks Postgres' own clock (`now()`) which issues have
 * opened, so "between two issues" is reached the way the demo reaches any
 * date: `reset_demo()` onto an anchor eight days back, which puts issue 05's
 * close behind the real clock and issue 06's opening ahead of it. Orders at
 * the fixture's own moments go through the service role, the one caller
 * exempt from the clock (`assert_now`), as in `orders.dbtest.ts`; the
 * manager's calls carry the real clock, as in `catalog-admin.dbtest.ts`.
 *
 * Needs a running stack, `.env.local` and the demo accounts
 * (`npm run seed:users`). Every test starts from the seed and the file resets
 * once more when it ends.
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

/** The service role — exempt from the clock, and the only writer of raw rows. */
const service = createClient<Database>(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let manager: Client;

/** The app's clock, exactly as a Server Action sends it. */
const now = () => toVnIso(demoNow());

/** The instant `data/` was frozen at: Số 05 is open, Số 06 opens on 02/10. */
const FIXTURE_ANCHOR = "2026-09-20T18:50:00+07:00";
/** Inside issue 05's window, on the fixture's own calendar. */
const IN_05 = "2026-09-20T19:00:00+07:00";
/** After issue 05 closed (25/09 20:00) and before 06 opens (02/10 20:00). */
const BETWEEN = "2026-09-28T12:00:00+07:00";

const TEE = "p-ao-thun-tron";
const GILE = "p-gile-phao";

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

async function snapshotAs(client: Client) {
  const { data, error } = await client.rpc("catalog_snapshot");
  if (error) throw new Error(`catalog_snapshot failed: ${error.message}`);
  return buildCatalog(parseCatalogSnapshot(data));
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

async function productRow(id: string) {
  const { data, error } = await service
    .from("products")
    .select("slug, name, cut_units, drop_no, sold_out_at")
    .eq("id", id)
    .maybeSingle();
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

interface LineIn {
  productId: string;
  color: string;
  size: string;
  qty: number;
}

/** `p_input` as checkout sends it, cash on delivery. */
function basket(lines: LineIn[]) {
  return {
    lines,
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
  };
}

/** A guest's order through the service role, at whatever instant is named. */
async function place(lines: LineIn[], at: string) {
  return service.rpc("place_order", { p_input: basket(lines) as unknown as Json, p_now: at });
}

const teeBlackM = (qty = 1): LineIn => ({ productId: TEE, color: "black", size: "M", qty });
const khoiBlackM = (qty = 1): LineIn => ({ productId: "p-khoi", color: "black", size: "M", qty });

/** The eight as the fixture has them — what the database must give back. */
const FIXED_IN_FIXTURE: Product[] = FIXTURE_CATALOG.products.filter(isFixed);

beforeAll(async () => {
  const client = fresh();
  const { error } = await client.auth.signInWithPassword({ email: DEMO_ADMIN.email, password: demoPassword! });
  if (error) throw new Error(`could not sign in as the demo manager: ${error.message}`);
  manager = client;
});

beforeEach(async () => {
  await resetTo(null);
});

afterAll(async () => {
  await resetTo(null);
});

// ──────────────────────────────────────────────────── the catalogue carries them
describe("catalog_snapshot and fixed styles", () => {
  it("shows a visitor all eight, no issue and no cut, while issue 05 is open", async () => {
    const catalog = await snapshotAs(anon);
    const five = catalog.dropByNo.get(5)!;
    expect(dropState(five, demoNow())).toBe("OPEN");

    const fixed = catalog.products.filter(isFixed);
    expect(fixed).toEqual(FIXED_IN_FIXTURE);
    for (const p of fixed) {
      expect(p.dropNo).toBeNull();
      expect(p.cutUnits).toBeNull();
    }
    // After every issue's style, as the fixture orders them.
    expect(catalog.products.slice(-8).map((p) => p.id)).toEqual(FIXED_IN_FIXTURE.map((p) => p.id));
  });

  it("still shows a visitor all eight between two issues", async () => {
    // Eight days back: issue 05 closed a few days ago, issue 06 opens in a few.
    await resetTo(toVnIso(new Date(Date.now() - 8 * 86_400_000)));
    const catalog = await snapshotAs(anon);
    expect(catalog.drops.map((d) => dropState(d, demoNow()))).not.toContain("OPEN");
    expect(catalog.products.filter(isFixed)).toEqual(FIXED_IN_FIXTURE);
    // And the raw document says null, not a missing key.
    const { data } = await anon.rpc("catalog_snapshot");
    const tee = (data as { products: Array<Record<string, unknown>> }).products.find((p) => p.id === TEE)!;
    expect(tee).toMatchObject({ dropNo: null, cutUnits: null, soldOutAt: null, slug: "ao-thun-tron" });
  });
});

// ────────────────────────────────────────────────────────────── checkout
describe("place_order and fixed styles", () => {
  it("sells a fixed style outside every issue's window, and takes it off the shelf", async () => {
    await resetTo(FIXTURE_ANCHOR);
    const before = await onHand(TEE, "black", "M");
    const { data, error } = await place([teeBlackM(2)], BETWEEN);
    expect(error).toBeNull();
    expect((data as { code: string }).code).toMatch(/^DH-\d{4,}$/);
    expect(await onHand(TEE, "black", "M")).toBe(before - 2);

    const { data: line } = await service
      .from("order_lines")
      .select("product_id, qty, unit_price_vnd")
      .eq("order_code", (data as { code: string }).code)
      .single();
    expect(line).toEqual({ product_id: TEE, qty: 2, unit_price_vnd: 400_000 });
  });

  it("still refuses a closed issue's style at that hour: DROP_CLOSED, and nothing is sold", async () => {
    await resetTo(FIXTURE_ANCHOR);
    const khoi = await onHand("p-khoi", "black", "M");
    const tee = await onHand(TEE, "black", "M");
    expect((await place([khoiBlackM()], BETWEEN)).error?.message).toBe("DROP_CLOSED");
    // One closed line spoils the whole basket.
    expect((await place([teeBlackM(), khoiBlackM()], BETWEEN)).error?.message).toBe("DROP_CLOSED");
    expect(await onHand("p-khoi", "black", "M")).toBe(khoi);
    expect(await onHand(TEE, "black", "M")).toBe(tee);
  });

  it("sells both kinds in one basket while the issue is open", async () => {
    await resetTo(FIXTURE_ANCHOR);
    const { error } = await place([teeBlackM(), khoiBlackM()], IN_05);
    expect(error).toBeNull();
  });

  it("checks a fixed style's shelf like any other: OUT_OF_STOCK past it", async () => {
    // HOODIE TRƠN has no M in any colour.
    const { error } = await place([{ productId: "p-hoodie-tron", color: "grey", size: "M", qty: 1 }], now());
    expect(error?.message).toBe("OUT_OF_STOCK");
  });

  it("never stamps a fixed style sold out, even with every cell sold", async () => {
    // GILE PHAO: one colour, S 3 · M 5 · L 5 · XL 2 — fifteen pieces.
    const all: LineIn[] = [
      { productId: GILE, color: "black", size: "S", qty: 3 },
      { productId: GILE, color: "black", size: "M", qty: 5 },
      { productId: GILE, color: "black", size: "L", qty: 5 },
      { productId: GILE, color: "black", size: "XL", qty: 2 },
    ];
    const { error } = await place(all, now());
    expect(error).toBeNull();
    for (const size of SIZES) expect(await onHand(GILE, "black", size)).toBe(0);
    expect((await productRow(GILE))!.sold_out_at).toBeNull();

    // Still on the shop — "tạm hết", not gone — and simply out of stock at checkout.
    const catalog = await snapshotAs(anon);
    expect(catalog.byId.get(GILE as never)?.soldOutAt).toBeUndefined();
    expect((await place([{ productId: GILE, color: "black", size: "M", qty: 1 }], now())).error?.message).toBe(
      "OUT_OF_STOCK",
    );
  });
});

// ────────────────────────────────────────────────────────────── the shelf
describe("admin_adjust_stock and fixed styles", () => {
  const adjust = (productId: string, cells: unknown[], reason: string) =>
    manager.rpc("admin_adjust_stock", {
      p_product_id: productId,
      p_cells: cells as unknown as Json,
      p_reason: reason,
      p_ref: "",
      p_note: "",
      p_now: now(),
    });

  it("lets a fixed style's shelf go past everything it opened with — there is no cut", async () => {
    const { error } = await adjust(TEE, [{ color: "white", size: "S", before: 10, after: 400 }], "Kiểm kê lệch");
    expect(error).toBeNull();
    expect(await onHand(TEE, "white", "S")).toBe(400);
    expect((await productRow(TEE))!.cut_units).toBeNull();
  });

  it("still holds an issue's style under its cut: BAD_INPUT, and nothing moves", async () => {
    // KHÓI: 35 cut, 17 on the shelf; black S holds 3.
    const { error } = await adjust("p-khoi", [{ color: "black", size: "S", before: 3, after: 40 }], "Hàng trả về");
    expect(error?.message).toBe("BAD_INPUT");
    expect(await onHand("p-khoi", "black", "S")).toBe(3);
  });

  it("'Nhập thêm' brings sizes back on a fixed style — every cell up, one event", async () => {
    const cells = [
      { color: "grey", size: "M", before: 0, after: 6 },
      { color: "black", size: "M", before: 0, after: 4 },
    ];
    const { error } = await adjust("p-hoodie-tron", cells, "Nhập thêm");
    expect(error).toBeNull();
    expect(await onHand("p-hoodie-tron", "grey", "M")).toBe(6);
    expect(await onHand("p-hoodie-tron", "black", "M")).toBe(4);
    const event = await lastEvent();
    expect(event.kind).toBe("INVENTORY_ADJUSTED");
    expect(event.product_id).toBe("p-hoodie-tron");
    expect(event.payload).toMatchObject({ reason: "Nhập thêm", delta: 10, cells });
  });

  it("refuses 'Nhập thêm' when any cell does not go up: BAD_INPUT, and nothing moves", async () => {
    const { error } = await adjust(
      "p-hoodie-tron",
      [
        { color: "grey", size: "M", before: 0, after: 6 },
        { color: "grey", size: "S", before: 5, after: 4 },
      ],
      "Nhập thêm",
    );
    expect(error?.message).toBe("BAD_INPUT");
    expect(await onHand("p-hoodie-tron", "grey", "M")).toBe(0);
    expect(await onHand("p-hoodie-tron", "grey", "S")).toBe(5);
  });

  it("refuses 'Nhập thêm' on an issue's style: BAD_INPUT, even within its cut", async () => {
    // KHÓI black XL holds 1, and the shelf is well under the cut of 35.
    const { error } = await adjust("p-khoi", [{ color: "black", size: "XL", before: 1, after: 2 }], "Nhập thêm");
    expect(error?.message).toBe("BAD_INPUT");
    expect(await onHand("p-khoi", "black", "XL")).toBe(1);
  });

  it("never stamps a fixed style sold out when an adjustment empties it", async () => {
    const cells = SIZES.map((size, i) => ({ color: "black", size, before: [3, 5, 5, 2][i]!, after: 0 }));
    const { error } = await adjust(GILE, cells, "Hư hỏng");
    expect(error).toBeNull();
    expect((await productRow(GILE))!.sold_out_at).toBeNull();
  });
});

// ────────────────────────────────────────────────── creating and editing one
describe("admin_add_product and admin_update_product with fixed styles", () => {
  /** ÁO MƯA as `createProduct` sends a fixed style: `dropNo: null`, written out. */
  const aoMua = (over: Record<string, unknown> = {}) =>
    ({
      name: "ÁO MƯA",
      kind: "Áo khoác dù",
      family: "JACKET",
      fit: "REGULAR",
      slug: "ao-mua",
      priceVnd: 520_000,
      material: "Dù chống nước",
      dropNo: null,
      colors: [
        { color: "black", photoKey: "suong" },
        { color: "navy", photoKey: "than" },
      ],
      cells: {
        black: { S: 4, M: 6, L: 5, XL: 2 },
        navy: { S: 3, M: 4, L: 0, XL: 1 },
      },
      ...over,
    }) as unknown as Json;

  const add = (input: Json) => manager.rpc("admin_add_product", { p_input: input, p_now: now() });

  it("creates a fixed style: no issue, no cut, its grid as the opening stock, one event", async () => {
    const { data, error } = await add(aoMua());
    expect(error).toBeNull();
    expect(data).toBe("p-ao-mua");
    expect(await productRow("p-ao-mua")).toEqual({
      slug: "ao-mua",
      name: "ÁO MƯA",
      cut_units: null,
      drop_no: null,
      sold_out_at: null,
    });
    expect(await onHand("p-ao-mua", "black", "M")).toBe(6);
    expect(await onHand("p-ao-mua", "navy", "L")).toBe(0);
    const event = await lastEvent();
    expect(event).toMatchObject({ kind: "PRODUCT_ADDED", product_id: "p-ao-mua" });
    expect(event.payload).toMatchObject({ dropNo: null, cutUnits: null, colors: ["black", "navy"] });

    // On the shop at once, for a visitor: it waits for no issue to open.
    const catalog = await snapshotAs(anon);
    const made = catalog.byId.get("p-ao-mua" as never)!;
    expect(made).toMatchObject({ dropNo: null, cutUnits: null, slug: "ao-mua" });
  });

  it("wants dropNo written out as null — left out is a bad request", async () => {
    const { dropNo: _left, ...noIssue } = aoMua() as Record<string, unknown>;
    expect((await add(noIssue as Json)).error?.message).toBe("BAD_INPUT");
    expect(await productRow("p-ao-mua")).toBeNull();
  });

  it("refuses to turn a fixed style into an issue's, or an issue's into a fixed one", async () => {
    const patch = (id: string, p: Record<string, unknown>) =>
      manager.rpc("admin_update_product", { p_id: id, p_patch: p as unknown as Json, p_now: now() });

    expect((await patch(TEE, { dropNo: 5 })).error?.message).toBe("BAD_INPUT");
    expect((await patch("p-khoi", { dropNo: null })).error?.message).toBe("BAD_INPUT");
    expect((await productRow(TEE))!.drop_no).toBeNull();
    expect((await productRow("p-khoi"))!.drop_no).toBe(5);

    // "No issue" on a fixed style is no change; the rest of the patch saves.
    expect((await patch(TEE, { dropNo: null, priceVnd: 420_000 })).error).toBeNull();
    expect((await lastEvent()).payload).toEqual({ before: { priceVnd: 400_000 }, after: { priceVnd: 420_000 } });
    // An issue's style still moves between issues, as before.
    expect((await patch("p-khoi", { dropNo: 6 })).error).toBeNull();
    expect((await productRow("p-khoi"))!.drop_no).toBe(6);
  });
});

// ────────────────────────────────────────────────────── the table itself
describe("the products table", () => {
  it("refuses a half-fixed row and a fixed style stamped sold out, whoever writes it", async () => {
    const cutOnly = await service.from("products").update({ drop_no: null }).eq("id", "p-khoi");
    expect(cutOnly.error?.code).toBe("23514");
    const issueOnly = await service.from("products").update({ cut_units: null }).eq("id", "p-khoi");
    expect(issueOnly.error?.code).toBe("23514");
    const stamped = await service.from("products").update({ sold_out_at: now() }).eq("id", TEE);
    expect(stamped.error?.code).toBe("23514");
    const intoIssue = await service.from("products").update({ drop_no: 5 }).eq("id", TEE);
    expect(intoIssue.error?.code).toBe("23514");
  });
});

// ──────────────────────────────────────────────────────────── the reset
describe("reset_demo and fixed styles", () => {
  it("puts back exactly the eight and their opening stock, after sales, restocks and a new one", async () => {
    // Everything below lands on one calendar, the fixture's: the sale at the
    // fixture's own hour through the service role, the manager's moves on the
    // real clock (neither of them asks an issue's window).
    await resetTo(FIXTURE_ANCHOR);
    expect((await place([teeBlackM(3)], BETWEEN)).error).toBeNull();
    expect(
      (
        await manager.rpc("admin_adjust_stock", {
          p_product_id: "p-quan-short-ni",
          p_cells: [{ color: "grey", size: "XL", before: 0, after: 9 }] as unknown as Json,
          p_reason: "Nhập thêm",
          p_ref: "",
          p_note: "",
          p_now: now(),
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await manager.rpc("admin_add_product", {
          p_input: {
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
          } as unknown as Json,
          p_now: now(),
        })
      ).error,
    ).toBeNull();
    // The moves really happened before the reset undoes them.
    expect(await onHand(TEE, "black", "M")).toBe(9);
    expect(await onHand("p-quan-short-ni", "grey", "XL")).toBe(9);
    expect(await productRow("p-ao-mua")).not.toBeNull();

    await resetTo(FIXTURE_ANCHOR);
    const catalog = await snapshotAs(anon);
    expect(catalog.products.filter(isFixed)).toEqual(FIXED_IN_FIXTURE);
    expect(catalog.byId.has("p-ao-mua" as never)).toBe(false);
    expect(catalog.products).toEqual([...FIXTURE_CATALOG.products]);
  });
});
