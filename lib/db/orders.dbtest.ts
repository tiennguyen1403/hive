import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { ORDERS, ordersOf } from "@/data/orders";
import { PROMOTIONS } from "@/data/promotions";
import type { Order, Promotion } from "@/data/types";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { orderSubtotalVnd, orderTotalVnd } from "@/lib/orders";
import { checkoutTotals } from "@/lib/shipping";
import type { Database, Json } from "./database.types";
import { toOrder, toOrders } from "./order-dto";

/**
 * What slice B2 claims, checked against Postgres.
 *
 *   (a) the database prices an order exactly as `checkoutTotals()` does;
 *   (b) two orders racing for the last piece of a cell: exactly one wins;
 *   (c) a closed issue and an unusable code are refused, and a code is spent
 *       exactly once per order;
 *   (d) cancelling puts the pieces back, and only the owner can, and only
 *       while nothing was paid;
 *   (e) the twelve-hour sweep releases exactly the holds that ran out, once;
 *   (f) row level security and the two guest doors show an order to its
 *       owner, its receipt key, or its phone number — to nobody else;
 *   (g) `reset_demo()` puts the twenty-four sample orders and the numbering
 *       back.
 *
 * Every business instant is passed in (`p_now`), never read from Postgres'
 * own clock — which is what lets this file ask "and twelve hours later?"
 * without waiting twelve hours.
 *
 * SINCE SLICE B3A the database refuses a `p_now` more than five minutes off
 * its own clock from anybody but the service role, and the app runs on the
 * real clock. So the orders this file places at the fixture's own moments
 * (20/09/2026, 19:00) are placed through the service role, as a guest — the
 * same pricing, locking and sweeping code runs either way — and every reset
 * names the fixture's anchor explicitly, because the seed and the app now
 * anchor on the most recent 18:50 instead. The tests that need a signed-in
 * shopper's own hand (cancelling, filing an order under an account) start
 * from `reset_demo(demo_anchor())` and use the real clock, as the app does.
 *
 * Needs a running stack, `.env.local` and the demo accounts
 * (`npm run seed:users`). EVERY TEST starts from the seed (`reset_demo()` in
 * a `beforeEach`) and sets up the stock and prices it needs itself, and the
 * file resets once more when it ends — so it holds whatever order the runner
 * picks, for the files and for the tests inside this one
 * (`--sequence.shuffle`).
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

/** A client that is nobody until it signs in, and keeps its session to itself. */
function fresh(): Client {
  return createClient<Database>(url!, publishableKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** What a visitor gets: the publishable key, no session. */
const anon = fresh();

/** The service role — only a script or a test ever holds this. */
const admin = createClient<Database>(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Another service-role client with its own connection, for the races in (b):
 * two clients, two requests, two transactions at once.
 */
function serviceClient(): Client {
  return createClient<Database>(url!, secretKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** The instant `data/` was frozen at — what the fixture-comparing tests reset onto. */
const FIXTURE_ANCHOR = "2026-09-20T18:50:00+07:00";

/** The real clock, the way a Server Action sends it (slice B3a). */
const realNow = () => toVnIso(demoNow());

async function signedIn(email: string): Promise<Client> {
  const client = fresh();
  const { error } = await client.auth.signInWithPassword({ email, password: demoPassword! });
  if (error) throw new Error(`could not sign in as a demo account: ${error.message}`);
  return client;
}

const MINHANH = CUSTOMERS[0]!; // c-minhanh, five sample orders
const NAMLE = CUSTOMERS[1]!; // c-namle
const HAPHAM = CUSTOMERS[2]!; // c-hapham, owns DH-2427 (PAID)

/** Inside issue 05's window and every live code's, on the demo day. */
const NOW = "2026-09-20T19:00:00+07:00";

/** A ward of TP. Hồ Chí Minh — express runs there. */
const HCM = { provinceCode: "29", wardCode: "70101063" };

interface LineIn {
  productId: string;
  color: string;
  size: string;
  qty: number;
}

/** `p_input` as checkout sends it, for one basket. */
function input(lines: LineIn[], over: Record<string, unknown> = {}) {
  return {
    lines,
    recipient: "Khách Thử",
    phone: "0901234567",
    email: "khach@example.test",
    ...HCM,
    line: "1 Thử Nghiệm",
    note: "",
    delivery: "STANDARD",
    payment: "BANK_TRANSFER",
    promoCode: null,
    ...over,
  };
}

const khoi = (qty = 1): LineIn => ({ productId: "p-khoi", color: "black", size: "M", qty });
const bui = (qty = 1): LineIn => ({ productId: "p-bui", color: "black", size: "L", qty });
const cat = (qty = 1): LineIn => ({ productId: "p-cat", color: "cream", size: "S", qty });
const nguoi = (qty = 1): LineIn => ({ productId: "p-nguoi", color: "black", size: "M", qty });

async function place(client: Client, body: unknown, now = NOW) {
  return client.rpc("place_order", { p_input: body as Json, p_now: now });
}

/** Place, and read the order back through the guest's own door. */
async function placeAndRead(client: Client, body: unknown, now = NOW): Promise<Order> {
  const { data, error } = await place(client, body, now);
  if (error) throw new Error(`place_order refused: ${error.message}`);
  const { code, accessKey } = data as { code: string; accessKey: string };
  const back = await client.rpc("receipt_order", { p_code: code, p_key: accessKey });
  if (back.error || back.data === null) throw new Error(`receipt_order: ${back.error?.message}`);
  return toOrder(back.data);
}

async function onHand(productId: string, color: string, size: string): Promise<number> {
  const { data, error } = await admin
    .from("stock_cells")
    .select("on_hand")
    .eq("product_id", productId)
    .eq("color", color as never)
    .eq("size", size as never)
    .single();
  if (error) throw new Error(error.message);
  return data.on_hand;
}

async function setOnHand(productId: string, color: string, size: string, n: number) {
  const { error } = await admin
    .from("stock_cells")
    .update({ on_hand: n })
    .eq("product_id", productId)
    .eq("color", color as never)
    .eq("size", size as never);
  if (error) throw new Error(error.message);
}

async function setPrice(productId: string, priceVnd: number) {
  const { error } = await admin.from("products").update({ price_vnd: priceVnd }).eq("id", productId);
  if (error) throw new Error(error.message);
}

async function usedCount(code: string): Promise<number> {
  const { data, error } = await admin.from("promotions").select("used_count").eq("code", code).single();
  if (error) throw new Error(error.message);
  return data.used_count;
}

async function stateOf(code: string) {
  const { data, error } = await admin
    .from("orders")
    .select("state, cancelled_at, cancel_reason, due_at")
    .eq("code", code)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function reset() {
  const { error } = await admin.rpc("reset_demo", { p_anchor: FIXTURE_ANCHOR });
  if (error) throw new Error(`reset_demo failed: ${error.message}`);
}

/** The shop as the app sees it: anchored on the most recent 18:50, on the real clock. */
async function resetToRealAnchor() {
  const anchor = await admin.rpc("demo_anchor");
  if (anchor.error) throw new Error(`demo_anchor failed: ${anchor.error.message}`);
  const { error } = await admin.rpc("reset_demo", { p_anchor: anchor.data });
  if (error) throw new Error(`reset_demo failed: ${error.message}`);
}

const promo = (code: string): Promotion => PROMOTIONS.find((p) => p.code === code)!;

beforeEach(async () => {
  await reset();
});

// Leave the shop the way the app expects to find it: on the real clock's
// anchor, not on the fixture's (slice B3a) — otherwise a preview opened after
// `npm run test:db` shows the sample's transfers four days past their hold.
afterAll(async () => {
  await resetToRealAnchor();
});

/**
 * Enough pieces for baskets that are about money rather than stock, whatever
 * the sample left on these shelves. The next test's reset puts the real
 * figures back.
 */
async function plentyOfStock() {
  await setOnHand("p-khoi", "black", "M", 50);
  await setOnHand("p-bui", "black", "L", 50);
  await setOnHand("p-cat", "cream", "S", 50);
  await setOnHand("p-nguoi", "black", "M", 50);
}

// ───────────────────────────────────────────────────── (a) the money agrees
describe("(a) place_order() prices a basket exactly as checkoutTotals() does", () => {
  interface Case {
    name: string;
    lines: LineIn[];
    delivery?: "STANDARD" | "EXPRESS";
    payment?: "BANK_TRANSFER" | "CARD" | "COD";
    promoCode?: string;
    /** Temporarily reprice KHÓI, to land on the free-delivery line to the đồng. */
    khoiPrice?: number;
  }

  const cases: Case[] = [
    { name: "no code · standard · transfer · under the line", lines: [khoi()] },
    { name: "free-delivery line − 1₫", lines: [khoi()], khoiPrice: 999_999 },
    { name: "free-delivery line exactly", lines: [khoi()], khoiPrice: 1_000_000 },
    { name: "free-delivery line + 1₫", lines: [khoi()], khoiPrice: 1_000_001 },
    { name: "express in TP. HCM", lines: [khoi()], delivery: "EXPRESS" },
    { name: "express over the line (never free)", lines: [nguoi()], delivery: "EXPRESS" },
    { name: "COD handling", lines: [khoi()], payment: "COD" },
    { name: "card, nothing extra", lines: [khoi(2)], payment: "CARD" },
    { name: "PERCENT DOT05 under its cap", lines: [bui()], promoCode: "DOT05" },
    { name: "PERCENT DOT05 stops at the cap", lines: [nguoi(2)], promoCode: "DOT05" },
    { name: "PERCENT DOT05 floored", lines: [khoi()], promoCode: "DOT05", khoiPrice: 999_999 },
    { name: "AMOUNT CHAOBAN", lines: [cat()], promoCode: "CHAOBAN" },
    { name: "FREE_SHIPPING FREESHIP, standard", lines: [bui()], promoCode: "FREESHIP" },
    { name: "FREE_SHIPPING FREESHIP, express", lines: [bui()], promoCode: "FREESHIP", delivery: "EXPRESS" },
    { name: "FREE_SHIPPING over the line: worth nothing", lines: [nguoi()], promoCode: "FREESHIP" },
    {
      name: "COD + express + DOT05 together",
      lines: [nguoi()],
      promoCode: "DOT05",
      delivery: "EXPRESS",
      payment: "COD",
    },
  ];

  const table: Array<Record<string, string | number>> = [];

  beforeEach(plentyOfStock);

  afterAll(() => {
    // The evidence the slice report quotes: one row per basket, both sides.
    console.table(table);
  });

  for (const c of cases) {
    it(c.name, async () => {
      await setPrice("p-khoi", c.khoiPrice ?? 390_000);
      const order = await placeAndRead(
        admin,
        input(c.lines, {
          delivery: c.delivery ?? "STANDARD",
          payment: c.payment ?? "BANK_TRANSFER",
          promoCode: c.promoCode ?? null,
        }),
      );

      const subtotalVnd = orderSubtotalVnd(order);
      const ts = checkoutTotals({
        subtotalVnd,
        delivery: c.delivery ?? "STANDARD",
        payment: c.payment ?? "BANK_TRANSFER",
        ...(c.promoCode ? { promo: promo(c.promoCode) } : {}),
      });

      table.push({
        case: c.name,
        subtotal: subtotalVnd,
        "ship TS": ts.shippingFeeVnd,
        "ship SQL": order.shippingFeeVnd,
        "cod TS": ts.codFeeVnd,
        "cod SQL": order.codFeeVnd,
        "disc TS": ts.discountVnd,
        "disc SQL": order.discountVnd,
        "total TS": ts.totalVnd,
        "total SQL": orderTotalVnd(order),
      });

      expect(order.shippingFeeVnd).toBe(ts.shippingFeeVnd);
      expect(order.codFeeVnd).toBe(ts.codFeeVnd);
      expect(order.discountVnd).toBe(ts.discountVnd);
      expect(orderTotalVnd(order)).toBe(ts.totalVnd);
      // The line price is the database's, copied at the moment of ordering.
      expect(order.lines[0]!.unitPriceVnd).toBe(
        c.lines[0]!.productId === "p-khoi" ? (c.khoiPrice ?? 390_000) : order.lines[0]!.unitPriceVnd,
      );
    });
  }

  it("prices from the database, not from anything the request says", async () => {
    const order = await placeAndRead(
      admin,
      input([khoi()], { unitPriceVnd: 1, totalVnd: 1, discountVnd: 999_999, shippingFeeVnd: 0 }),
    );
    expect(order.lines[0]!.unitPriceVnd).toBe(390_000);
    expect(order.shippingFeeVnd).toBe(30_000);
    expect(order.discountVnd).toBe(0);
  });

  it("issues a transfer the twelve-hour hold, and a COD order no deadline", async () => {
    const transfer = await placeAndRead(admin, input([khoi()]));
    expect(transfer.status).toEqual({ state: "AWAITING_TRANSFER", dueAt: "2026-09-21T07:00:00+07:00" });
    expect(transfer.placedAt).toBe(NOW);

    const cod = await placeAndRead(admin, input([khoi()], { payment: "COD" }));
    expect(cod.status).toEqual({ state: "RECEIVED" });
  });
});

// ─────────────────────────────────────────────────── (b) the last piece
describe("(b) two orders racing for the last piece of a cell", () => {
  it("lets exactly one through, five times over, and spends the code once", async () => {
    for (let round = 0; round < 5; round += 1) {
      await setOnHand("p-bui", "black", "L", 1);
      const before = await usedCount("DOT05");

      // Two separate clients, two connections, two transactions at once.
      const body = input([bui()], { promoCode: "DOT05" });
      const [a, b] = await Promise.all([place(serviceClient(), body), place(serviceClient(), body)]);

      const wins = [a, b].filter((r) => r.error === null);
      const losses = [a, b].filter((r) => r.error !== null);
      expect(wins, `round ${round}`).toHaveLength(1);
      expect(losses, `round ${round}`).toHaveLength(1);
      expect(losses[0]!.error!.message).toBe("OUT_OF_STOCK");
      expect(losses[0]!.error!.code).toBe("P0001");

      expect(await onHand("p-bui", "black", "L")).toBe(0);
      expect(await usedCount("DOT05")).toBe(before + 1);
    }
  });

  it("never deadlocks two orders that want the same two cells in opposite order", async () => {
    await plentyOfStock();
    for (let round = 0; round < 10; round += 1) {
      const [a, b] = await Promise.all([
        place(serviceClient(), input([khoi(), cat()])),
        place(serviceClient(), input([cat(), khoi()])),
      ]);
      // Both have stock to spare, so both must go through: a deadlock would
      // surface here as SQLSTATE 40P01 on one of them.
      expect(a.error, `round ${round}`).toBeNull();
      expect(b.error, `round ${round}`).toBeNull();
    }
  });
});

// ─────────────────────────────────────────────── (c) windows and codes
describe("(c) a closed issue and an unusable code are refused", () => {
  it("refuses an order once issue 05 has closed — and changes nothing on the way", async () => {
    const before = await onHand("p-khoi", "black", "M");
    const { error } = await place(admin, input([khoi()]), "2026-09-26T10:00:00+07:00");
    expect(error?.message).toBe("DROP_CLOSED");
    expect(await onHand("p-khoi", "black", "M")).toBe(before);
    // The sweep at the top of place_order() ran inside the same transaction
    // and went down with it: DH-2430 is still waiting for its transfer.
    expect((await stateOf("DH-2430")).state).toBe("AWAITING_TRANSFER");
  });

  it("refuses an exhausted code, an expired code, an unknown code and one under its minimum", async () => {
    const counts = {
      VIP20: await usedCount("VIP20"),
      DOT04: await usedCount("DOT04"),
      CHAOBAN: await usedCount("CHAOBAN"),
    };

    // VIP20: 50 of 50 used. DOT04: over since June. CHAOBAN: from 400.000₫,
    // and one KHÓI is 390.000₫.
    for (const [lines, code] of [
      [[nguoi(2)], "VIP20"],
      [[nguoi()], "DOT04"],
      [[khoi()], "KHONGCO"],
      [[khoi()], "CHAOBAN"],
    ] as const) {
      const { error } = await place(admin, input([...lines], { promoCode: code }));
      expect(error?.message, code).toBe("PROMO_INVALID");
    }

    expect(await usedCount("VIP20")).toBe(counts.VIP20);
    expect(await usedCount("DOT04")).toBe(counts.DOT04);
    expect(await usedCount("CHAOBAN")).toBe(counts.CHAOBAN);
  });

  it("spends a code exactly once for an order that goes through", async () => {
    const before = await usedCount("CHAOBAN");
    await placeAndRead(admin, input([cat()], { promoCode: "chaoban" }));
    expect(await usedCount("CHAOBAN")).toBe(before + 1);
  });

  it("refuses what the cart could never have sent", async () => {
    const cases: Array<[unknown, string]> = [
      [input([]), "EMPTY_ORDER"],
      [input([{ ...khoi(), qty: 0 }]), "BAD_INPUT"],
      [input([{ ...khoi(), qty: 21 }]), "BAD_INPUT"],
      [input([{ ...khoi(), color: "pink" }]), "BAD_INPUT"],
      [input([{ ...khoi(), color: "navy" }]), "BAD_INPUT"], // KHÓI does not come in navy
      [input([khoi(), khoi()]), "BAD_INPUT"],
      [input([khoi()], { phone: "12345" }), "BAD_INPUT"],
      [input([khoi()], { email: "khong-phai-email" }), "BAD_INPUT"],
      [input([khoi()], { delivery: "EXPRESS", provinceCode: "01" }), "BAD_INPUT"],
      [input([khoi()], { note: "x".repeat(501) }), "BAD_INPUT"],
      [{ lines: "khoi" }, "EMPTY_ORDER"],
    ];
    for (const [body, code] of cases) {
      const { error } = await place(admin, body);
      expect(error?.message, JSON.stringify(body).slice(0, 80)).toBe(code);
    }
  });
});

// ───────────────────────────────────────────────────── (d) cancelling
/**
 * A shopper's own hand, so the shopper's own session — and since slice B3a a
 * signed-in caller's `p_now` has to be the real clock. These tests therefore
 * start from the shop as the app sees it (`reset_demo(demo_anchor())`, where
 * issue 05 is open and the sample transfers are inside their hold) and act at
 * `realNow()`. A hold that has already run out is made by moving the order's
 * deadline back through the service role, not by naming a later instant.
 */
describe("(d) cancel_order()", () => {
  let minhanh: Client;
  let namle: Client;

  beforeAll(async () => {
    minhanh = await signedIn(MINHANH.email);
    namle = await signedIn(NAMLE.email);
  });

  beforeEach(resetToRealAnchor);

  it("puts the pieces back, says who cancelled, and keeps the code spent", async () => {
    await setOnHand("p-cat", "cream", "S", 5);
    const used = await usedCount("CHAOBAN");

    const placed = await place(
      minhanh,
      input([cat(2)], { payment: "COD", promoCode: "CHAOBAN" }),
      realNow(),
    );
    expect(placed.error).toBeNull();
    const { code } = placed.data as { code: string };
    expect(await onHand("p-cat", "cream", "S")).toBe(3);
    expect(await usedCount("CHAOBAN")).toBe(used + 1);

    const at = realNow();
    const cancelled = await minhanh.rpc("cancel_order", { p_code: code, p_now: at });
    expect(cancelled.error).toBeNull();

    expect(await onHand("p-cat", "cream", "S")).toBe(5);
    expect(await usedCount("CHAOBAN")).toBe(used + 1);
    const row = await stateOf(code);
    expect(row.state).toBe("CANCELLED");
    expect(row.cancel_reason).toBe("khách huỷ");
    expect(Date.parse(row.cancelled_at!)).toBe(Date.parse(at));

    // Twice is not a second cancellation.
    const again = await minhanh.rpc("cancel_order", { p_code: code, p_now: realNow() });
    expect(again.error?.message).toBe("NOT_CANCELLABLE");
  });

  it("cancels a transfer still inside its hold, and not one past it", async () => {
    const inside = await place(minhanh, input([khoi()]), realNow());
    const code = (inside.data as { code: string }).code;
    const inTime = await minhanh.rpc("cancel_order", { p_code: code, p_now: realNow() });
    expect(inTime.error).toBeNull();

    const late = await place(minhanh, input([khoi()]), realNow());
    const lateCode = (late.data as { code: string }).code;
    // Twelve hours are up: the deadline is moved to a minute ago.
    const moved = await admin
      .from("orders")
      .update({ due_at: toVnIso(new Date(Date.now() - 60_000)) })
      .eq("code", lateCode);
    expect(moved.error).toBeNull();
    const refused = await minhanh.rpc("cancel_order", { p_code: lateCode, p_now: realNow() });
    expect(refused.error?.message).toBe("NOT_CANCELLABLE");
  });

  it("answers somebody else's order and a made-up one alike: NOT_OWNER", async () => {
    const placed = await place(minhanh, input([khoi()], { payment: "COD" }), realNow());
    const code = (placed.data as { code: string }).code;

    const theirs = await namle.rpc("cancel_order", { p_code: code, p_now: realNow() });
    expect(theirs.error?.message).toBe("NOT_OWNER");
    const nobody = await namle.rpc("cancel_order", { p_code: "DH-9999", p_now: realNow() });
    expect(nobody.error?.message).toBe("NOT_OWNER");

    // …and minhanh's order is untouched.
    expect((await stateOf(code)).state).toBe("RECEIVED");
  });

  it("will not cancel an order that has been paid for", async () => {
    const hapham = await signedIn(HAPHAM.email);
    const { error } = await hapham.rpc("cancel_order", { p_code: "DH-2427", p_now: realNow() });
    expect(error?.message).toBe("NOT_CANCELLABLE");
    expect((await stateOf("DH-2427")).state).toBe("PAID");
  });

  it("is not open to a visitor with no session at all", async () => {
    const { error } = await anon.rpc("cancel_order", { p_code: "DH-2430", p_now: realNow() });
    expect(error).not.toBeNull();
    expect((await stateOf("DH-2430")).state).toBe("AWAITING_TRANSFER");
  });
});

// ──────────────────────────────────────────────────────── (e) the sweep
describe("(e) expire_transfers()", () => {
  it("releases exactly the holds that ran out, at their deadline, once", async () => {
    await setOnHand("p-bui", "black", "L", 3);

    // Placed 19:00 on the 20th, so the hold runs to 07:00 on the 21st.
    const placed = await place(admin, input([bui(2)]));
    const code = (placed.data as { code: string }).code;
    expect(await onHand("p-bui", "black", "L")).toBe(1);

    // A minute early: nothing, not even the two sample transfers.
    const early = await admin.rpc("expire_transfers", { p_now: "2026-09-21T06:59:00+07:00" });
    expect(early.data).toBe(0);

    // On the minute: this one, and only this one.
    const due = await admin.rpc("expire_transfers", { p_now: "2026-09-21T07:00:00+07:00" });
    expect(due.error).toBeNull();
    expect(due.data).toBe(1);
    expect(await onHand("p-bui", "black", "L")).toBe(3);
    const row = await stateOf(code);
    expect(row.state).toBe("CANCELLED");
    expect(row.cancel_reason).toBe("quá hạn chuyển khoản");
    expect(Date.parse(row.cancelled_at!)).toBe(Date.parse(row.due_at!));

    // Run again with the same clock: nothing left to release.
    const twice = await admin.rpc("expire_transfers", { p_now: "2026-09-21T07:00:00+07:00" });
    expect(twice.data).toBe(0);
    expect(await onHand("p-bui", "black", "L")).toBe(3);
  });

  it("gives the sample transfers' pieces back too, once their own deadlines pass", async () => {
    const suong = await onHand("p-suong", "moss", "M");
    const than = await onHand("p-than", "black", "L");
    const cat = await onHand("p-cat", "brown", "XL");

    // DH-2430 (due 21/09 19:50) and DH-2431 (due 22/09 08:05).
    const swept = await admin.rpc("expire_transfers", { p_now: "2026-09-22T09:00:00+07:00" });
    expect(swept.data).toBe(2);

    expect(await onHand("p-suong", "moss", "M")).toBe(suong + 1);
    expect(await onHand("p-than", "black", "L")).toBe(than + 1);
    expect(await onHand("p-cat", "brown", "XL")).toBe(cat + 1);
    expect((await stateOf("DH-2430")).state).toBe("CANCELLED");
    expect((await stateOf("DH-2431")).state).toBe("CANCELLED");
  });

  it("runs at the top of place_order(), in the same transaction", async () => {
    // DH-2430 holds one SƯƠNG M moss until 21/09 19:50. An order placed after
    // that minute finds the piece back on the shelf.
    await setOnHand("p-suong", "moss", "M", 0);
    const blocked = await place(admin, input([{ productId: "p-suong", color: "moss", size: "M", qty: 1 }]));
    expect(blocked.error?.message).toBe("OUT_OF_STOCK");

    // Issue 05 is still open at 20:00 on the 21st, and DH-2430's hold is over.
    const after = await place(
      admin,
      input([{ productId: "p-suong", color: "moss", size: "M", qty: 1 }]),
      "2026-09-21T20:00:00+07:00",
    );
    expect(after.error).toBeNull();
    expect((await stateOf("DH-2430")).state).toBe("CANCELLED");
    expect(await onHand("p-suong", "moss", "M")).toBe(0);
  });
});

// ─────────────────────────────────────────────── (f) who may read what
describe("(f) row level security and the two guest doors", () => {
  it("shows Trần Minh Anh her five sample orders, and they are the fixture's", async () => {
    const minhanh = await signedIn(MINHANH.email);
    const { data, error } = await minhanh.rpc("my_orders");
    expect(error).toBeNull();
    const mine = toOrders(data);

    const expected = ordersOf(MINHANH.id);
    expect(mine.map((o) => o.code)).toEqual(expected.map((o) => o.code));
    for (const o of expected) {
      const got = mine.find((m) => m.code === o.code)!;
      // The fixture writes the number as typed; the column holds ten digits.
      expect(got).toEqual({ ...o, shipTo: { ...o.shipTo, phone: o.shipTo.phone.replace(/\s/g, "") } });
    }

    const rows = await minhanh.from("orders").select("code");
    expect(rows.data).toHaveLength(5);
  });

  it("brings all twenty-four sample orders back unchanged through order_json()", async () => {
    // Each through its owner's own session — the only door that reads them.
    for (const customer of CUSTOMERS) {
      const client = await signedIn(customer.email);
      const got = toOrders((await client.rpc("my_orders")).data);
      const want = ORDERS.filter((o) => o.customerId === customer.id);
      expect(got.map((o) => o.code).sort()).toEqual(want.map((o) => String(o.code)).sort());
      for (const o of want) {
        const back = got.find((g) => g.code === o.code)!;
        expect(orderTotalVnd(back), o.code).toBe(orderTotalVnd(o));
        expect(back.status, o.code).toEqual(o.status);
      }
    }
  });

  it("shows another account nothing of hers, even asked by code", async () => {
    const namle = await signedIn(NAMLE.email);
    const peek = await namle.rpc("order_json", { p_code: "DH-2210" });
    expect(peek.error).toBeNull();
    expect(peek.data).toBeNull();
    const rows = await namle.from("orders").select("code").eq("code", "DH-2210");
    expect(rows.data).toEqual([]);
    const lines = await namle.from("order_lines").select("order_code").eq("order_code", "DH-2210");
    expect(lines.data).toEqual([]);
  });

  it("shows a visitor with no session no order, no line and no receipt key", async () => {
    expect((await anon.from("orders").select("code")).data ?? []).toEqual([]);
    expect((await anon.from("order_lines").select("order_code")).data ?? []).toEqual([]);
    expect((await anon.from("seed_orders").select("code")).data ?? []).toEqual([]);
    // The account-only functions are not theirs to call at all.
    expect((await anon.rpc("my_orders")).error).not.toBeNull();
    expect((await anon.rpc("order_json", { p_code: "DH-2210" })).error).not.toBeNull();
  });

  it("will not let an account write an order row directly", async () => {
    const minhanh = await signedIn(MINHANH.email);
    const insert = await minhanh.from("orders").insert({
      code: "DH-9998",
      email: "x@example.test",
      recipient: "X",
      phone: "0900000000",
      line: "x",
      province_code: "29",
      ward_code: "70101063",
      delivery: "STANDARD",
      payment: "COD",
      shipping_fee_vnd: 0,
      cod_fee_vnd: 0,
      discount_vnd: 0,
      placed_at: NOW,
      state: "DELIVERED",
      delivered_at: NOW,
    });
    expect(insert.error).not.toBeNull();

    const update = await minhanh.from("orders").update({ state: "DELIVERED" }).eq("code", "DH-2430");
    expect((await stateOf("DH-2430")).state).toBe("AWAITING_TRANSFER");
    expect(update.error !== null || (update.count ?? 0) === 0).toBe(true);
  });

  it("track_order(): the right number opens it, a wrong one or a wrong code does not", async () => {
    const hit = await anon.rpc("track_order", { p_code: "DH-2425", p_phone: "0908221447" });
    expect(hit.error).toBeNull();
    expect(toOrder(hit.data).code).toBe("DH-2425");

    for (const [code, phone] of [
      ["DH-2425", "0912345678"],
      ["DH-2425", ""],
      ["DH-9999", "0908221447"],
    ]) {
      const miss = await anon.rpc("track_order", { p_code: code!, p_phone: phone! });
      expect(miss.error).toBeNull();
      expect(miss.data, `${code} / ${phone}`).toBeNull();
    }
  });

  it("receipt_order(): the key opens the guest's order, another key does not", async () => {
    const placed = await place(admin, input([khoi()]));
    const { code, accessKey } = placed.data as { code: string; accessKey: string };

    const own = await anon.rpc("receipt_order", { p_code: code, p_key: accessKey });
    expect(toOrder(own.data).code).toBe(code);

    const wrong = await anon.rpc("receipt_order", {
      p_code: code,
      p_key: "00000000-0000-4000-8000-000000000000",
    });
    expect(wrong.error).toBeNull();
    expect(wrong.data).toBeNull();

    // A sample order's key is not the guest's to know — nor is any other.
    const other = await anon.rpc("receipt_order", { p_code: "DH-2430", p_key: accessKey });
    expect(other.data).toBeNull();
  });

  it("files a guest's order under nobody, and a demo account's under its handle", async () => {
    // A signed-in shopper orders on the real clock, so the shop is anchored on it too.
    await resetToRealAnchor();
    const guest = await placeAndRead(admin, input([khoi()]), realNow());
    expect(guest.customerId).toBe("");

    const minhanh = await signedIn(MINHANH.email);
    const placed = await place(minhanh, input([khoi()], { payment: "COD" }), realNow());
    const code = (placed.data as { code: string }).code;
    const mine = toOrders((await minhanh.rpc("my_orders")).data);
    const row = mine.find((o) => o.code === code)!;
    expect(row.customerId).toBe(MINHANH.id);
    // Newest first: the one just placed leads her list.
    expect(mine[0]!.code).toBe(code);
  });
});

// ──────────────────────────────────────────────────────── (g) the reset
describe("(g) reset_demo() after orders were placed and cancelled", () => {
  it("puts back exactly the twenty-four sample orders and the numbering", async () => {
    // Something to undo: an order placed and one cancelled — on the real
    // clock, since a signed-in shopper's hand is part of it.
    await resetToRealAnchor();
    await setOnHand("p-khoi", "black", "M", 10);
    const minhanh = await signedIn(MINHANH.email);
    const a = await place(admin, input([khoi()]), realNow());
    const b = await place(minhanh, input([khoi()], { payment: "COD" }), realNow());
    expect(a.error).toBeNull();
    const undone = await minhanh.rpc("cancel_order", {
      p_code: (b.data as { code: string }).code,
      p_now: realNow(),
    });
    expect(undone.error).toBeNull();

    await reset();

    const orders = await admin.from("orders").select("code", { count: "exact", head: true });
    expect(orders.count).toBe(24);
    const lines = await admin.from("order_lines").select("order_code", { count: "exact", head: true });
    expect(lines.count).toBe(33);
    expect((await stateOf("DH-2430")).state).toBe("AWAITING_TRANSFER");

    const next = await place(admin, input([khoi()]));
    expect((next.data as { code: string }).code).toBe("DH-2432");
  });

  it("gives the sample orders back to the demo accounts that exist", async () => {
    const owned = await admin
      .from("orders")
      .select("code", { count: "exact", head: true })
      .not("profile_id", "is", null);
    // Every sample order belongs to one of the eight demo accounts.
    expect(owned.count).toBe(24);
  });
});
