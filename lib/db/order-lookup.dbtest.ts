import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { ORDERS } from "@/data/orders";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { phoneDigits } from "@/lib/lookup";
import { LOOKED_UP_KEYS, readLookup } from "@/lib/order-lookup";
import { RATE_RULES, rateKeyOf, subjectOf } from "@/lib/rate-limit";
import type { Database, Json } from "./database.types";
import { toLookupAnswer } from "./order-dto";

/**
 * What slice B11 claims about the Feed's order lookup, checked against
 * Postgres (`supabase/migrations/20260930150000_order_lookup.sql`):
 *
 *   (a) the right code and number find the order — with nothing of where it
 *       goes: no recipient, no address, no phone, no e-mail, no courier — and
 *       the order is the document the guest's receipt hands out whole
 *       (`receipt_order()`), cut down to its listed keys;
 *   (b) a code no order carries is NO_ORDER; a code with another number on
 *       it is PHONE_MISMATCH — for every sample order, a guest's COD order,
 *       and whoever asks, signed in or not;
 *   (c) through the app's own door (`lookupOrder`), a number written with
 *       spaces or dots still matches, and a code typed in lower case or
 *       without its dash still finds it;
 *   (d) the eleventh lookup in ten minutes is refused — in `take_rate()`
 *       with the `lookup` rule, and through `lookupOrder` with the app's
 *       sentence — one token per lookup, and another visitor is untouched;
 *   (e) `anon` may call the lookup and read no table it touches directly, nor
 *       spend a token itself;
 *   (f) the old door is gone (slice B13, `20260930190000_drop_track_order.sql`):
 *       `track_order()`, which handed the whole order to anybody holding the
 *       publishable key, is no function at all to a visitor or a signed-in
 *       shopper — PGRST202, HTTP 404 — while `lookup_order()` still answers.
 *
 * `lookupOrder` runs as it does in the app, against the local stack: the
 * visitor's client with the publishable key, the rate limit through the
 * service role. Only what Next hands a request is stood in for
 * (`next/headers`: the visitor's address, an empty cookie jar) and the
 * build-time `server-only` marker. Every visitor is a made-up address
 * (`t-lookup-…`), counted under its own HMAC, so no test sees another's
 * tokens — nor the app's, if a preview is running — and the file removes
 * every token it spent when it ends.
 *
 * Needs a running stack, `.env.local` and the demo accounts
 * (`npm run seed:users`). The shop is put back on the real clock's anchor
 * (`reset_demo(demo_anchor())`) before and after.
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

vi.mock("server-only", () => ({}));

/** Who is asking, as `x-forwarded-for` names them — set per test. */
let visitorIp = "t-lookup-unset";
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": visitorIp }),
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const { lookupOrder } = await import("./order-lookup");

type Client = SupabaseClient<Database>;

const noSession = { auth: { autoRefreshToken: false, persistSession: false } };

/** What a visitor gets: the publishable key, no session. */
const anon: Client = createClient<Database>(url, publishableKey, noSession);

/** The service role — only a script or a test ever holds this. */
const admin: Client = createClient<Database>(url, secretKey, noSession);

/** Every rate-limit subject this file spent tokens under, for the clean-up. */
const spent: string[] = [];

/** A visitor nobody else has been: the address `lookupOrder` will count them by. */
function newVisitor(): string {
  visitorIp = `t-lookup-${randomBytes(8).toString("hex")}`;
  spent.push(subjectOf(rateKeyOf(visitorIp), secretKey!));
  return visitorIp;
}

/** The subject a raw `take_rate()` call counts under, in (d). */
function rawSubject(): string {
  const s = `t-${randomBytes(8).toString("hex")}`;
  spent.push(s);
  return s;
}

/** The `lookup` tokens one visitor has spent, per window. */
async function tokensOf(ip: string): Promise<number[]> {
  const { data, error } = await admin
    .from("rate_hits")
    .select("hits")
    .eq("bucket", "lookup")
    .eq("subject", subjectOf(rateKeyOf(ip), secretKey!))
    .order("window_start");
  if (error) throw new Error(error.message);
  return data.map((r) => r.hits);
}

/** The shop as the app sees it: anchored on the most recent 18:50, on the real clock. */
async function resetToRealAnchor() {
  const anchor = await admin.rpc("demo_anchor");
  if (anchor.error) throw new Error(`demo_anchor failed: ${anchor.error.message}`);
  const { error } = await admin.rpc("reset_demo", { p_anchor: anchor.data });
  if (error) throw new Error(`reset_demo failed: ${error.message}`);
}

/** The ten-minute windows are aligned on the epoch; wait for a fresh one if this one is nearly over. */
async function awayFromWindowEdge() {
  const window = RATE_RULES.lookup.windowSeconds;
  const left = window - (Math.floor(Date.now() / 1000) % window);
  if (left < 30) await new Promise((done) => setTimeout(done, (left + 2) * 1000));
}

/** Every key anywhere in a JSON document, however deep. */
function keysIn(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysIn);
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([k, v]) => [k, ...keysIn(v)]);
}

/** The keys an order must never carry out through the lookup. */
const WHERE_IT_GOES = [
  "shipTo",
  "recipient",
  "phone",
  "line",
  "provinceCode",
  "wardCode",
  "email",
  "note",
  "customerId",
  "delivery",
  "carrier",
];

const sample = (code: string) => ORDERS.find((o) => o.code === code)!;
/** A number no sample order was placed with. */
const NOBODYS = "0900000000";

/** DH-2425: c-namle's card order on the road, with a code on it. */
const DH2425 = sample("DH-2425");
const DH2425_PHONE = phoneDigits(DH2425.shipTo.phone);

/** A guest's COD order placed here, for a RECEIVED order nobody's account holds. */
let guestCode = "";
/** Its receipt key, which opens the whole order through `receipt_order()`. */
let guestKey = "";
const GUEST = {
  recipient: "Khách Tra Cứu",
  phone: "0977123456",
  line: "15 Đường Thử Tra",
  provinceCode: "29",
  wardCode: "70101063",
  email: "tracuu@example.test",
  note: "gọi trước khi giao",
};

beforeAll(async () => {
  expect(ORDERS.every((o) => phoneDigits(o.shipTo.phone) !== NOBODYS)).toBe(true);
  await resetToRealAnchor();

  // A piece on the shelf for the guest's order, whatever the sample left there.
  const stock = await admin
    .from("stock_cells")
    .update({ on_hand: 5 })
    .eq("product_id", "p-khoi")
    .eq("color", "black")
    .eq("size", "M");
  if (stock.error) throw new Error(stock.error.message);

  const placed = await admin.rpc("place_order", {
    p_input: {
      lines: [{ productId: "p-khoi", color: "black", size: "M", qty: 1 }],
      ...GUEST,
      delivery: "STANDARD",
      payment: "COD",
      promoCode: null,
    } as unknown as Json,
    // The real clock, as a Server Action sends it (slice B3a).
    p_now: toVnIso(demoNow()),
  });
  if (placed.error) throw new Error(`place_order refused: ${placed.error.message}`);
  ({ code: guestCode, accessKey: guestKey } = placed.data as { code: string; accessKey: string });

  // The handover recorded a courier on DH-2425: the lookup must not print it.
  const courier = await admin.from("orders").update({ carrier: "Giao tiêu chuẩn" }).eq("code", "DH-2425");
  if (courier.error) throw new Error(courier.error.message);
});

afterAll(async () => {
  if (spent.length > 0) await admin.from("rate_hits").delete().in("subject", spent);
  await resetToRealAnchor();
});

// ───────────────────────────────────────────── (a) found, and only that
describe("(a) the right code and number find the order — and nothing of where it goes", () => {
  it("answers FOUND with exactly the listed keys", async () => {
    const { data, error } = await anon.rpc("lookup_order", { p_code: "DH-2425", p_phone: DH2425_PHONE });
    expect(error).toBeNull();
    const doc = data as { outcome: string; order: Record<string, unknown> };
    expect(doc.outcome).toBe("FOUND");
    expect(Object.keys(doc).sort()).toEqual(["order", "outcome"]);
    expect(Object.keys(doc.order).sort()).toEqual([...LOOKED_UP_KEYS].sort());
  });

  it("carries no recipient, address, phone, e-mail, note, owner, service or courier — by key or by value", async () => {
    for (const [code, phone, secrets] of [
      [
        "DH-2425",
        DH2425_PHONE,
        [DH2425.shipTo.recipient, DH2425.shipTo.line, DH2425.shipTo.wardCode, DH2425.email!, DH2425_PHONE, "Giao tiêu chuẩn"],
      ],
      [guestCode, GUEST.phone, [GUEST.recipient, GUEST.line, GUEST.email, GUEST.note, GUEST.phone]],
    ] as const) {
      const { data, error } = await anon.rpc("lookup_order", { p_code: code, p_phone: phone });
      expect(error, code).toBeNull();
      const keys = keysIn(data);
      for (const hidden of WHERE_IT_GOES) expect(keys, `${code}: ${hidden}`).not.toContain(hidden);
      const text = JSON.stringify(data);
      for (const secret of secrets) expect(text, `${code}: ${secret}`).not.toContain(secret);
    }
  });

  it("reads back as the order the app knows, for a sample order and a guest's COD order", async () => {
    const hit = await anon.rpc("lookup_order", { p_code: "DH-2425", p_phone: DH2425_PHONE });
    const got = toLookupAnswer(hit.data);
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect(got.order.code).toBe("DH-2425");
    expect(got.order.payment).toBe("CARD");
    expect(got.order.promo).toBe("CHAOBAN");
    expect(got.order.lines).toEqual(DH2425.lines);
    expect(got.order.status).toMatchObject({ state: "SHIPPING", trackingCode: "VNP-8842204" });
    expect("carrier" in got.order.status).toBe(false);
    expect(got.order.moments?.shippedAt).toBeDefined();

    const guest = toLookupAnswer((await anon.rpc("lookup_order", { p_code: guestCode, p_phone: GUEST.phone })).data);
    expect(guest.ok && guest.order.status).toEqual({ state: "RECEIVED" });
    expect(guest.ok && guest.order.payment).toBe("COD");
    expect(guest.ok && guest.order.codFeeVnd).toBe(15_000);
  });

  // Until slice B13 the whole document came from `track_order()`, which is gone
  // (f). The guest's receipt hands out the same `order_json()`, whole, to its key.
  it("is the document the receipt hands out, cut down: its listed keys, less the courier", async () => {
    const samples = [DH2425, ...ORDERS.slice(0, 6)];
    const keys = await admin.from("orders").select("code, access_key").in("code", samples.map((o) => o.code));
    if (keys.error) throw new Error(keys.error.message);
    const keyOf = new Map(keys.data.map((row) => [row.code, row.access_key]));

    for (const [code, phone, key] of [
      [guestCode, GUEST.phone, guestKey],
      ...samples.map((o) => [o.code, phoneDigits(o.shipTo.phone), keyOf.get(o.code) ?? ""] as const),
    ] as const) {
      const receipt = await anon.rpc("receipt_order", { p_code: code, p_key: key });
      expect(receipt.error, code).toBeNull();
      expect(receipt.data, code).not.toBeNull();
      const whole = receipt.data as Record<string, unknown>;
      const cut = (await anon.rpc("lookup_order", { p_code: code, p_phone: phone })).data as {
        order: Record<string, unknown>;
      };
      const expected: Record<string, unknown> = {};
      for (const k of LOOKED_UP_KEYS) expected[k] = whole[k] ?? null;
      const { carrier: _courier, ...status } = expected.status as Record<string, unknown>;
      expect(cut.order, code).toEqual({ ...expected, status });
    }
  });
});

// ───────────────────────────────────────────────── (b) the two misses
describe("(b) which of the two did not match", () => {
  it("answers NO_ORDER for a code no order carries — whatever the number", async () => {
    for (const [code, phone] of [
      ["DH-9999", DH2425_PHONE],
      ["DH-9999", NOBODYS],
      ["DH-123", DH2425_PHONE],
      ["", DH2425_PHONE],
    ]) {
      const { data, error } = await anon.rpc("lookup_order", { p_code: code!, p_phone: phone! });
      expect(error, `${code}`).toBeNull();
      expect(data, `${code} / ${phone}`).toEqual({ outcome: "NO_ORDER" });
    }
  });

  it("answers PHONE_MISMATCH for a code that exists with another number on it", async () => {
    for (const phone of [NOBODYS, "", "0908 221 447", phoneDigits(CUSTOMERS[0]!.phone)]) {
      const { data, error } = await anon.rpc("lookup_order", { p_code: "DH-2425", p_phone: phone });
      expect(error, phone).toBeNull();
      expect(data, `DH-2425 / "${phone}"`).toEqual({ outcome: "PHONE_MISMATCH" });
    }
  });

  it("finds every one of the twenty-four sample orders by its own number, and none by another", async () => {
    for (const o of ORDERS) {
      const own = await anon.rpc("lookup_order", { p_code: o.code, p_phone: phoneDigits(o.shipTo.phone) });
      expect(own.error, o.code).toBeNull();
      const got = toLookupAnswer(own.data);
      expect(got.ok, o.code).toBe(true);
      if (got.ok) {
        expect(got.order.code).toBe(o.code);
        expect(got.order.status.state, o.code).toBe(o.status.state);
        expect(got.order.lines, o.code).toEqual(o.lines);
      }
      const other = await anon.rpc("lookup_order", { p_code: o.code, p_phone: NOBODYS });
      expect(other.data, o.code).toEqual({ outcome: "PHONE_MISMATCH" });
    }
  });

  it("answers a signed-in shopper the same, for an order that is not theirs", async () => {
    const shopper = createClient<Database>(url!, publishableKey!, noSession);
    const signIn = await shopper.auth.signInWithPassword({ email: CUSTOMERS[0]!.email, password: demoPassword! });
    expect(signIn.error).toBeNull();
    const hit = await shopper.rpc("lookup_order", { p_code: "DH-2425", p_phone: DH2425_PHONE });
    expect(hit.error).toBeNull();
    expect((hit.data as { outcome: string }).outcome).toBe("FOUND");
    const miss = await shopper.rpc("lookup_order", { p_code: "DH-2425", p_phone: NOBODYS });
    expect(miss.data).toEqual({ outcome: "PHONE_MISMATCH" });
    await shopper.auth.signOut();
  });
});

// ─────────────────────────────────────── (c) the app's own door, as typed
describe("(c) lookupOrder reads a code and a number the way people type them", () => {
  it("matches a number written with spaces or dots, and a code in lower case or without its dash", async () => {
    newVisitor();
    for (const [code, phone] of [
      ["DH-2425", "0908 221 447"],
      ["DH-2425", "0908.221.447"],
      ["dh2425", "0908221447"],
      [" dh-2425 ", "+84 908 221 447"],
    ]) {
      const read = readLookup(code, phone);
      expect(read.ok, `${code} / ${phone}`).toBe(true);
      if (!read.ok) continue;
      const got = await lookupOrder(read.input);
      expect(got.ok, `${code} / ${phone}`).toBe(true);
      if (got.ok) {
        expect(got.order.code).toBe("DH-2425");
        expect(keysIn(got.order).filter((k) => WHERE_IT_GOES.includes(k))).toEqual([]);
      }
    }
  });

  it("says which of the two did not match, through the same door", async () => {
    newVisitor();
    const noOrder = readLookup("DH-9999", "0908 221 447");
    const wrongPhone = readLookup("DH-2425", "0912 345 678");
    expect(noOrder.ok && wrongPhone.ok).toBe(true);
    if (!noOrder.ok || !wrongPhone.ok) return;
    expect(await lookupOrder(noOrder.input)).toEqual({ ok: false, reason: "NO_ORDER" });
    expect(await lookupOrder(wrongPhone.input)).toEqual({ ok: false, reason: "PHONE_MISMATCH" });
  });
});

// ───────────────────────────────────────────── (d) the eleventh lookup
describe("(d) ten lookups per ten minutes per visitor, and not an eleventh", () => {
  /** 10:04:10 in Vietnam on 24/09/2026: inside one ten-minute window, 350 s before its end. */
  const T = "2026-09-24T10:04:10+07:00";

  it("take_rate() with the lookup rule lets ten through and refuses the eleventh, spending nothing more", async () => {
    const s = rawSubject();
    const rule = RATE_RULES.lookup;
    const answers: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      const { data, error } = await admin.rpc("take_rate", {
        p_bucket: "lookup",
        p_subject: s,
        p_cost: 1,
        p_limit: rule.limit,
        p_window_seconds: rule.windowSeconds,
        p_now: T,
      });
      expect(error, `lookup ${i + 1}`).toBeNull();
      answers.push(data as number);
    }
    expect(answers.slice(0, 10)).toEqual(Array(10).fill(0));
    expect(answers[10]).toBe(350);
    const rows = await admin.from("rate_hits").select("hits").eq("subject", s);
    expect(rows.data?.map((r) => r.hits)).toEqual([10]);
  });

  it("lookupOrder answers ten lookups and refuses the eleventh with the app's sentence, one token each", async () => {
    await awayFromWindowEdge();
    const ip = newVisitor();
    const found = readLookup("DH-2425", DH2425_PHONE);
    const miss = readLookup("DH-9999", DH2425_PHONE);
    if (!found.ok || !miss.ok) throw new Error("the inputs must read");

    for (let i = 0; i < 10; i += 1) {
      // Hits and misses alike: every real lookup costs one.
      const got = await lookupOrder(i % 2 === 0 ? found.input : miss.input);
      expect(got.ok || (got as { reason: string }).reason, `lookup ${i + 1}`).not.toBe("RATE_LIMITED");
    }
    expect(await tokensOf(ip)).toEqual([10]);

    const eleventh = await lookupOrder(found.input);
    expect(eleventh.ok).toBe(false);
    expect(eleventh).toMatchObject({ reason: "RATE_LIMITED" });
    expect((eleventh as { message: string }).message).toMatch(
      /^Quá nhiều lượt liên tiếp\. Thử lại sau ([1-9]|10) phút\.$/,
    );
    // Refused, it spent nothing more.
    expect(await tokensOf(ip)).toEqual([10]);

    // Another visitor, in the same window, is untouched.
    newVisitor();
    expect((await lookupOrder(found.input)).ok).toBe(true);
  });
});

// ─────────────────────────────── (e) anon: the lookup, and no table at all
describe("(e) a visitor with no session may call the lookup and read no table it touches", () => {
  const PRIVATE_TABLES = [
    "orders",
    "order_lines",
    "rate_hits",
    "profiles",
    "addresses",
    "removed_addresses",
    "events",
    "favorites",
    "reminders",
    "account_settings",
    "seed_orders",
    "seed_order_lines",
    "seed_customers",
    "seed_addresses",
    "seed_favorites",
    "seed_reminders",
    "seed_account_settings",
    "seed_drops",
    "seed_products",
    "seed_product_colors",
    "seed_stock_cells",
    "seed_teasers",
    "seed_promotions",
  ] as const;

  it("calls lookup_order() and gets an answer", async () => {
    const { data, error } = await anon.rpc("lookup_order", { p_code: "DH-2425", p_phone: DH2425_PHONE });
    expect(error).toBeNull();
    expect((data as { outcome: string }).outcome).toBe("FOUND");
  });

  it("reads not one row of any table that is not the public catalogue", async () => {
    for (const table of PRIVATE_TABLES) {
      const { data } = await anon.from(table).select("*").limit(1);
      expect(data ?? [], table).toEqual([]);
    }
  });

  it("cannot call order_json() or track the tokens itself", async () => {
    expect((await anon.rpc("order_json", { p_code: "DH-2425" })).error).not.toBeNull();
    const took = await anon.rpc("take_rate", {
      p_bucket: "lookup",
      p_subject: rawSubject(),
      p_cost: 1,
      p_limit: 10,
      p_window_seconds: 600,
    });
    expect(took.error).not.toBeNull();
    expect((await anon.rpc("tidy_rate_hits", { p_clear: ["lookup"] })).error).not.toBeNull();
  });
});

// ──────────────────────────────────── (f) the old door is gone (slice B13)
describe("(f) track_order() is gone; lookup_order() still answers", () => {
  /**
   * The generated types no longer know the old name, so this client has none:
   * it makes the call exactly as a stranger with the publishable key would,
   * `POST /rest/v1/rpc/track_order`.
   */
  const untyped = () => createClient(url!, publishableKey!, noSession);

  /** The right pair for DH-2425 — the one the old door would have opened. */
  const RIGHT_PAIR = { p_code: "DH-2425", p_phone: DH2425_PHONE };

  it("answers a visitor calling track_order() that there is no such function — PGRST202, 404 — and lookup_order() as before", async () => {
    const gone = await untyped().rpc("track_order", RIGHT_PAIR);
    expect(gone.data).toBeNull();
    expect(gone.status).toBe(404);
    expect(gone.error?.code).toBe("PGRST202");
    // Nothing of the order leaks through the refusal either.
    expect(JSON.stringify(gone.error)).not.toContain(DH2425.shipTo.line);

    const open = await anon.rpc("lookup_order", RIGHT_PAIR);
    expect(open.error).toBeNull();
    expect(open.status).toBe(200);
    expect((open.data as { outcome: string }).outcome).toBe("FOUND");
  });

  it("answers a signed-in shopper the same: the function is gone, not merely closed to anon", async () => {
    const shopper = untyped();
    const signIn = await shopper.auth.signInWithPassword({ email: CUSTOMERS[0]!.email, password: demoPassword! });
    expect(signIn.error).toBeNull();
    const gone = await shopper.rpc("track_order", RIGHT_PAIR);
    expect(gone.status).toBe(404);
    expect(gone.error?.code).toBe("PGRST202");
    await shopper.auth.signOut();
  });
});
