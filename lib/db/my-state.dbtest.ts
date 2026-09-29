import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CUSTOMERS, CUSTOMER_STATES } from "@/data/customers";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import type { MyState } from "@/data/types";
import { toVnIso } from "@/lib/datetime";
import type { Database } from "./database.types";
import { toMyState, toUnsaveAnswer } from "./my-state-dto";

/**
 * What slice B9 claims, checked against Postgres
 * (`20260929120000_account_state.sql`): saved styles, issue reminders, "Size
 * của tôi" and the four switches belong to the account now, and the profile's
 * name and phone are its owner's to change.
 *
 *   · row level security: an account reads its own rows and nobody else's,
 *     writes none of them directly — not even its own — and `anon` reaches
 *     nothing at all;
 *   · a style saved twice is one row; a colour the style is not made in, a
 *     style that is not there or not yet shown, is refused; with no colour the
 *     first one left is taken; "Bỏ lưu" then "Hoàn tác" puts it back exactly
 *     where it was;
 *   · a reminder for an issue that has opened, or does not exist, is refused;
 *     `my_state()` does not list a reminder once its issue has opened;
 *   · the profile: a short name or a wrong number is refused; spaces and dots
 *     go, ten digits stay; the e-mail and the handle do not move, through the
 *     function or around it;
 *   · `reset_demo()` puts the first demo account back to the mock's shopper
 *     (four styles, a reminder for Số 06, L/M, four switches on), the others
 *     back to nothing, and leaves an account somebody made themselves as it
 *     was — except what points at something the reset did not bring back.
 *
 * Needs a running stack, `.env.local` and the demo accounts
 * (`npm run seed:users`). Every block starts from a reset onto the real
 * clock's anchor, and the file ends on one.
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

/** What a visitor gets: the publishable key and no session. */
const anon = fresh();

/** The service role — scripts and tests only. */
const service = createClient<Database>(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function signedIn(email: string, password = demoPassword!): Promise<Client> {
  const client = fresh();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`could not sign in as ${email}: ${error.message}`);
  return client;
}

const DAY = 86_400_000;
const MINHANH = CUSTOMERS[0]!;
const NAMLE = CUSTOMERS[1]!;
/** What the first demo account keeps after a reset, straight from the fixture. */
const SEEDED = CUSTOMER_STATES.get(MINHANH.id)!;

/** An account that keeps nothing: the other seven after a reset, a new sign-up. */
const NOTHING: MyState = {
  favorites: [],
  reminders: [],
  sizes: { top: null, bottom: null },
  notify: { order: true, drop: true, wishlist: true, promo: true },
};

async function resetOnto(anchor: string) {
  const { error } = await service.rpc("reset_demo", { p_anchor: anchor });
  if (error) throw new Error(`reset_demo failed: ${error.message}`);
}

async function realAnchor(): Promise<string> {
  const { data, error } = await service.rpc("demo_anchor");
  if (error) throw new Error(`demo_anchor failed: ${error.message}`);
  return data as string;
}

/** `reset_demo(demo_anchor())`: the reset the app, the seed and the cron run. */
async function resetToRealAnchor() {
  await resetOnto(await realAnchor());
}

/** `my_state()` for this client, read through the mapper the app uses. */
async function stateOf(client: Client): Promise<MyState> {
  const { data, error } = await client.rpc("my_state");
  if (error) throw new Error(`my_state failed: ${error.message}`);
  return toMyState(data);
}

/** The code a B9 function raised — `raise exception using message = …` arrives as P0001. */
const raised = (error: PostgrestError | null) => (error?.code === "P0001" ? error.message : error?.code);

/** The ids of a state's saved styles, in their order. */
const ids = (state: MyState) => state.favorites.map((f) => f.productId as string);

/** A shopper who signed up themselves: no handle, not one of the demo accounts. */
const PROBE = { email: "b9-keeps-probe@example.test", password: "probe-2026-b9", name: "Người Thử B9" };

async function dropProbe() {
  const { data } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (u.email === PROBE.email) await service.auth.admin.deleteUser(u.id);
  }
}

let minhanh: Client;
let namle: Client;
let probe: Client;

beforeAll(async () => {
  await resetToRealAnchor();
  await dropProbe();
  const made = await service.auth.admin.createUser({
    email: PROBE.email,
    password: PROBE.password,
    email_confirm: true,
    user_metadata: { name: PROBE.name },
  });
  if (made.error) throw new Error(made.error.message);
  [minhanh, namle, probe] = await Promise.all([
    signedIn(MINHANH.email),
    signedIn(NAMLE.email),
    signedIn(PROBE.email, PROBE.password),
  ]);
});

afterAll(async () => {
  await dropProbe();
  await resetToRealAnchor();
});

// ─────────────────────────────────────────────────────────────────── RLS
describe("row level security", () => {
  beforeAll(resetToRealAnchor);

  it("gives a visitor nothing — no row, no state, no write", async () => {
    for (const table of ["favorites", "reminders", "account_settings"] as const) {
      const { data } = await anon.from(table).select("*");
      expect(data ?? [], table).toEqual([]);
    }
    const read = await anon.rpc("my_state");
    expect(read.data ?? null).toBeNull();
    expect(read.error).not.toBeNull();

    const write = await anon.rpc("save_favorite", { p_product_id: "p-khoi" });
    expect(write.error).not.toBeNull();
    const seeds = await anon.from("seed_favorites").select("handle");
    expect(seeds.data ?? []).toEqual([]);
  });

  it("shows each account its own rows and none of another's", async () => {
    const mine = await minhanh.from("favorites").select("profile_id, product_id");
    expect(mine.data).toHaveLength(SEEDED.favorites.length);
    const owner = mine.data![0]!.profile_id;
    expect(mine.data!.every((r) => r.profile_id === owner)).toBe(true);

    // B asks for A's rows by A's id, table by table: nothing comes back.
    for (const table of ["favorites", "reminders", "account_settings"] as const) {
      const peek = await namle.from(table).select("profile_id").eq("profile_id", owner);
      expect(peek.data, table).toEqual([]);
    }
    // And B's own state is B's: nothing saved, the defaults.
    expect(await stateOf(namle)).toEqual(NOTHING);
  });

  it("refuses every direct write, to somebody else's rows and to one's own", async () => {
    const owner = (await minhanh.from("favorites").select("profile_id").limit(1)).data![0]!.profile_id;
    const namleId = (await namle.from("profiles").select("id")).data![0]!.id;

    // Into B's list, as B's, from A: refused.
    const planted = await minhanh
      .from("favorites")
      .insert({ profile_id: namleId, product_id: "p-khoi", color: "black" });
    expect(planted.error).not.toBeNull();
    const plantedReminder = await minhanh.from("reminders").insert({ profile_id: namleId, drop_no: 6 });
    expect(plantedReminder.error).not.toBeNull();
    const plantedSize = await minhanh
      .from("account_settings")
      .insert({ profile_id: namleId, size_top: "XL" });
    expect(plantedSize.error).not.toBeNull();

    // A's own rows cannot be written around the functions either.
    const moved = await minhanh.from("account_settings").update({ size_top: "S" }).eq("profile_id", owner);
    expect(moved.error).not.toBeNull();
    const wiped = await minhanh.from("favorites").delete().eq("profile_id", owner);
    expect(wiped.error).not.toBeNull();

    expect(await stateOf(namle)).toEqual(NOTHING);
    expect(await stateOf(minhanh)).toEqual(SEEDED);
  });

  it("lets the functions write only the caller's own list", async () => {
    await minhanh.rpc("save_favorite", { p_product_id: "p-khoi" });
    await minhanh.rpc("set_my_size", { p_slot: "top", p_size: "S" });
    await minhanh.rpc("set_my_notify", { p_key: "promo", p_on: false });
    expect(await stateOf(namle)).toEqual(NOTHING);
  });
});

// ─────────────────────────────────────────────────────────── saved styles
describe("saved styles", () => {
  beforeEach(resetToRealAnchor);

  it("lists the first demo account's four, newest first, in their colours", async () => {
    expect((await stateOf(minhanh)).favorites).toEqual(SEEDED.favorites);
  });

  it("keeps one row per style, however often it is saved", async () => {
    const first = await minhanh.rpc("save_favorite", { p_product_id: "p-khoi", p_color: "cream" });
    expect(first.error).toBeNull();
    const again = await minhanh.rpc("save_favorite", { p_product_id: "p-khoi", p_color: "black" });
    expect(again.error).toBeNull();

    const rows = await minhanh.from("favorites").select("product_id, color").eq("product_id", "p-khoi");
    expect(rows.data).toEqual([{ product_id: "p-khoi", color: "cream" }]);

    const state = toMyState(again.data);
    expect(ids(state)).toEqual(["p-khoi", ...SEEDED.favorites.map((f) => f.productId)]);
    expect(state.favorites[0]).toMatchObject({ productId: "p-khoi", color: "cream" });
    // A save the account made has its moment, on the Vietnamese wall clock.
    expect(state.favorites[0]!.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/);
  });

  it("refuses a colour the style is not made in, and a style that is not there — writing nothing", async () => {
    const navy = await minhanh.rpc("save_favorite", { p_product_id: "p-khoi", p_color: "navy" });
    expect(raised(navy.error)).toBe("BAD_INPUT");
    const junk = await minhanh.rpc("save_favorite", { p_product_id: "p-khoi", p_color: "đen" });
    expect(raised(junk.error)).toBe("BAD_INPUT");
    const ghost = await minhanh.rpc("save_favorite", { p_product_id: "p-khong-co" });
    expect(raised(ghost.error)).toBe("BAD_INPUT");

    expect((await stateOf(minhanh)).favorites).toEqual(SEEDED.favorites);
  });

  it("takes the first colour with anything left when none is given (the mock's firstColor)", async () => {
    const khoi = FIXTURE_CATALOG.byId.get("p-khoi" as never)!;
    // Nothing left in the first colour: the next one is taken.
    const emptied = await service
      .from("stock_cells")
      .update({ on_hand: 0 })
      .eq("product_id", "p-khoi")
      .eq("color", khoi.colors[0]!);
    expect(emptied.error).toBeNull();

    const saved = await namle.rpc("save_favorite", { p_product_id: "p-khoi" });
    expect(saved.error).toBeNull();
    expect(toMyState(saved.data).favorites[0]).toMatchObject({ productId: "p-khoi", color: khoi.colors[1] });

    // With something left in it, the first colour itself.
    const other = await namle.rpc("save_favorite", { p_product_id: "p-cat" });
    const cat = FIXTURE_CATALOG.byId.get("p-cat" as never)!;
    expect(toMyState(other.data).favorites[0]).toMatchObject({ productId: "p-cat", color: cat.colors[0] });

    // Nothing left in any colour (MUỐI sold out in the fixture): the first.
    const muoi = FIXTURE_CATALOG.byId.get("p-muoi" as never)!;
    const gone = await namle.rpc("save_favorite", { p_product_id: "p-muoi" });
    expect(toMyState(gone.data).favorites[0]).toMatchObject({ productId: "p-muoi", color: muoi.colors[0] });
  });

  it("saves a closed issue's style and a fixed style alike", async () => {
    await namle.rpc("save_favorite", { p_product_id: "p-reu" }); // Số 04, closed
    const fixed = await namle.rpc("save_favorite", { p_product_id: "p-ao-thun-tron", p_color: "grey" });
    expect(ids(toMyState(fixed.data))).toEqual(["p-ao-thun-tron", "p-reu"]);
  });

  it("refuses, and does not list, a style whose issue has not opened", async () => {
    // Số 05 moved a day ahead: its styles are not shown to a shopper
    // (catalog_snapshot) and so are neither saved nor listed.
    const later = await service
      .from("drops")
      .update({
        opens_at: toVnIso(new Date(Date.parse(await realAnchor()) + 3 * DAY)),
        closes_at: toVnIso(new Date(Date.parse(await realAnchor()) + 10 * DAY)),
      })
      .eq("no", 5);
    expect(later.error).toBeNull();

    const refused = await namle.rpc("save_favorite", { p_product_id: "p-khoi" });
    expect(raised(refused.error)).toBe("BAD_INPUT");
    // The first account's three Số 05 styles drop out of its list; the fixed one stays.
    expect(ids(await stateOf(minhanh))).toEqual(["p-hoodie-tron"]);
  });

  it("answers Bỏ lưu with the row it took off, and Hoàn tác puts it back exactly where it was", async () => {
    const off = await minhanh.rpc("unsave_favorite", { p_product_id: "p-than" });
    expect(off.error).toBeNull();
    const answer = toUnsaveAnswer(off.data);
    expect(answer.removed).toEqual(SEEDED.favorites[1]);
    expect(ids(answer.state)).toEqual(["p-bui", "p-muoi", "p-hoodie-tron"]);

    // Something else saved in between goes on top and stays there.
    await minhanh.rpc("save_favorite", { p_product_id: "p-khoi" });

    const back = await minhanh.rpc("restore_favorite", { p_product_id: "p-than" });
    expect(back.error).toBeNull();
    expect(toMyState(back.data).favorites).toEqual([
      expect.objectContaining({ productId: "p-khoi" }),
      ...SEEDED.favorites,
    ]);
  });

  it("makes a style saved again after Bỏ lưu a new save, on top", async () => {
    await minhanh.rpc("unsave_favorite", { p_product_id: "p-muoi" });
    const again = await minhanh.rpc("save_favorite", { p_product_id: "p-muoi", p_color: "black" });
    const state = toMyState(again.data);
    expect(ids(state)).toEqual(["p-muoi", "p-bui", "p-than", "p-hoodie-tron"]);
    expect(state.favorites[0]).toMatchObject({ color: "black" });
    expect(state.favorites[0]!.savedAt).not.toBeNull();
  });

  it("answers removed: null for a style that was not saved, and NOT_FOUND for nothing to undo", async () => {
    const off = await namle.rpc("unsave_favorite", { p_product_id: "p-khoi" });
    expect(off.error).toBeNull();
    expect(toUnsaveAnswer(off.data).removed).toBeNull();

    const undo = await namle.rpc("restore_favorite", { p_product_id: "p-khoi" });
    expect(raised(undo.error)).toBe("NOT_FOUND");
  });
});

// ─────────────────────────────────────────────────────────────── reminders
describe("reminders", () => {
  beforeEach(resetToRealAnchor);

  it("turns on for an issue still to open, once, and off at any time", async () => {
    const on = await namle.rpc("set_reminder", { p_drop_no: 6, p_on: true });
    expect(on.error).toBeNull();
    expect(toMyState(on.data).reminders).toEqual([6]);

    const twice = await namle.rpc("set_reminder", { p_drop_no: 6, p_on: true });
    expect(toMyState(twice.data).reminders).toEqual([6]);
    expect((await namle.from("reminders").select("drop_no")).data).toEqual([{ drop_no: 6 }]);

    const off = await namle.rpc("set_reminder", { p_drop_no: 6, p_on: false });
    expect(toMyState(off.data).reminders).toEqual([]);
    // Off for one that was never on, or one that has opened: nothing to refuse.
    expect((await namle.rpc("set_reminder", { p_drop_no: 5, p_on: false })).error).toBeNull();
  });

  it("refuses an issue that has opened, one that has closed and one that does not exist", async () => {
    for (const no of [5, 3, 99]) {
      const { error } = await namle.rpc("set_reminder", { p_drop_no: no, p_on: true });
      expect(raised(error), `issue ${no}`).toBe("NOT_UPCOMING");
    }
    expect((await stateOf(namle)).reminders).toEqual([]);
  });

  it("stops listing a reminder once its issue has opened", async () => {
    expect((await stateOf(minhanh)).reminders).toEqual([6]);

    // Reset onto an anchor two weeks back: Số 06 opened two days ago and is
    // selling. The seed's reminder row is there; `my_state()` leaves it out,
    // and it cannot be turned on again.
    const earlier = toVnIso(new Date(Date.parse(await realAnchor()) - 14 * DAY));
    await resetOnto(earlier);

    expect((await minhanh.from("reminders").select("drop_no")).data).toEqual([{ drop_no: 6 }]);
    expect((await stateOf(minhanh)).reminders).toEqual([]);
    const { error } = await minhanh.rpc("set_reminder", { p_drop_no: 6, p_on: true });
    expect(raised(error)).toBe("NOT_UPCOMING");
  });
});

// ───────────────────────────────────────────────────── sizes and switches
describe("Size của tôi and the four switches", () => {
  beforeEach(resetToRealAnchor);

  it("sets áo and quần one at a time, and forgets one", async () => {
    const top = await minhanh.rpc("set_my_size", { p_slot: "top", p_size: "XL" });
    expect(toMyState(top.data).sizes).toEqual({ top: "XL", bottom: "M" });

    const cleared = await minhanh.rpc("set_my_size", { p_slot: "bottom" });
    expect(toMyState(cleared.data).sizes).toEqual({ top: "XL", bottom: null });

    // An account that never had a row gets one on its first change.
    const first = await namle.rpc("set_my_size", { p_slot: "bottom", p_size: "S" });
    expect(toMyState(first.data).sizes).toEqual({ top: null, bottom: "S" });
  });

  it("refuses a slot or a size that does not exist", async () => {
    const slot = await minhanh.rpc("set_my_size", { p_slot: "shoes", p_size: "M" });
    expect(raised(slot.error)).toBe("BAD_INPUT");
    const size = await minhanh.rpc("set_my_size", { p_slot: "top", p_size: "XXL" });
    expect(raised(size.error)).toBe("BAD_INPUT");
    expect((await stateOf(minhanh)).sizes).toEqual(SEEDED.sizes);
  });

  it("turns one switch at a time, all four starting on", async () => {
    expect((await stateOf(namle)).notify).toEqual(NOTHING.notify);

    const off = await namle.rpc("set_my_notify", { p_key: "wishlist", p_on: false });
    expect(toMyState(off.data).notify).toEqual({ order: true, drop: true, wishlist: false, promo: true });

    const on = await namle.rpc("set_my_notify", { p_key: "wishlist", p_on: true });
    expect(toMyState(on.data).notify).toEqual(NOTHING.notify);

    const bad = await namle.rpc("set_my_notify", { p_key: "sms", p_on: false });
    expect(raised(bad.error)).toBe("BAD_INPUT");
  });
});

// ──────────────────────────────────────────────────────────────── profile
describe("the profile's name and phone", () => {
  beforeEach(resetToRealAnchor);

  const row = async (client: Client) =>
    (await client.from("profiles").select("handle, name, email, phone").single()).data!;

  it("refuses a short name, a long one and a wrong number, and stores nothing", async () => {
    const before = await row(minhanh);
    for (const [name, phone] of [
      ["A", "0912345678"],
      ["  B  ", "0912345678"],
      ["x".repeat(61), "0912345678"],
      ["Trần Minh Anh", ""],
      ["Trần Minh Anh", "0912-345-678"],
      ["Trần Minh Anh", "+84912345678"],
      ["Trần Minh Anh", "091234567"],
      ["Trần Minh Anh", "1912345678"],
    ] as const) {
      const { error } = await minhanh.rpc("update_my_profile", { p_name: name, p_phone: phone });
      expect(raised(error), `${name} / ${phone}`).toBe("BAD_INPUT");
    }
    expect(await row(minhanh)).toEqual(before);
  });

  it("stores the name trimmed and the number as ten digits — spaces and dots gone", async () => {
    const saved = await minhanh.rpc("update_my_profile", {
      p_name: "  Trần Minh Anh Mới  ",
      p_phone: " 0987 654.321 ",
    });
    expect(saved.error).toBeNull();
    expect(saved.data).toEqual({ name: "Trần Minh Anh Mới", phone: "0987654321" });

    // A number copied off the screen: grouped with no-break spaces.
    const copied = await minhanh.rpc("update_my_profile", {
      p_name: "Trần Minh Anh",
      p_phone: "0912 345 678",
    });
    expect(copied.data).toEqual({ name: "Trần Minh Anh", phone: "0912345678" });
  });

  it("moves neither the e-mail nor the handle, through the function or around it", async () => {
    await minhanh.rpc("update_my_profile", { p_name: "Tên Khác", p_phone: "0900000000" });
    expect(await row(minhanh)).toEqual({
      handle: MINHANH.id,
      name: "Tên Khác",
      email: MINHANH.email,
      phone: "0900000000",
    });

    // The direct update the account once had is closed: e-mail, handle, name.
    const me = (await minhanh.from("profiles").select("id").single()).data!.id;
    for (const patch of [{ email: "khac@email.com" }, { handle: "c-khac" }, { name: "Đổi Thẳng" }]) {
      const { error } = await minhanh.from("profiles").update(patch).eq("id", me);
      expect(error, JSON.stringify(patch)).not.toBeNull();
    }
    expect((await row(minhanh)).email).toBe(MINHANH.email);
    expect((await row(minhanh)).handle).toBe(MINHANH.id);
  });

  it("changes the caller's own row only", async () => {
    const before = await row(namle);
    await minhanh.rpc("update_my_profile", { p_name: "Chỉ Mình Tôi", p_phone: "0911111111" });
    expect(await row(namle)).toEqual(before);
  });
});

// ─────────────────────────────────────────────────────────────── the reset
describe("reset_demo", () => {
  beforeAll(resetToRealAnchor);

  it("puts the first demo account back to the mock's shopper, and the others back to nothing", async () => {
    await minhanh.rpc("unsave_favorite", { p_product_id: "p-bui" });
    await minhanh.rpc("save_favorite", { p_product_id: "p-khoi" });
    await minhanh.rpc("set_reminder", { p_drop_no: 6, p_on: false });
    await minhanh.rpc("set_my_size", { p_slot: "top", p_size: "S" });
    await minhanh.rpc("set_my_size", { p_slot: "bottom" });
    for (const key of ["order", "drop", "wishlist", "promo"]) {
      await minhanh.rpc("set_my_notify", { p_key: key, p_on: false });
    }
    await minhanh.rpc("update_my_profile", { p_name: "Người Lạ", p_phone: "0900000000" });
    await namle.rpc("save_favorite", { p_product_id: "p-cat" });
    await namle.rpc("set_reminder", { p_drop_no: 6, p_on: true });
    await namle.rpc("set_my_notify", { p_key: "drop", p_on: false });

    await resetToRealAnchor();

    // Four styles in the mock's order, Số 06, áo L and quần M, all four on.
    expect(await stateOf(minhanh)).toEqual(SEEDED);
    expect(SEEDED).toEqual({
      favorites: [
        { productId: "p-bui", color: "black", savedAt: null },
        { productId: "p-than", color: "navy", savedAt: null },
        { productId: "p-muoi", color: "grey", savedAt: null },
        { productId: "p-hoodie-tron", color: "grey", savedAt: null },
      ],
      reminders: [6],
      sizes: { top: "L", bottom: "M" },
      notify: { order: true, drop: true, wishlist: true, promo: true },
    });
    // The name and the phone the fixture has, like the rest of the profile.
    const profile = (await minhanh.from("profiles").select("name, phone").single()).data;
    expect(profile).toEqual({ name: MINHANH.name, phone: MINHANH.phone.replace(/\s/g, "") });
    // Nothing kept aside from before the reset either.
    expect((await minhanh.from("favorites").select("product_id")).data).toHaveLength(4);

    expect(await stateOf(namle)).toEqual(NOTHING);
  });

  it("is idempotent for what the accounts keep", async () => {
    await resetToRealAnchor();
    const once = await stateOf(minhanh);
    await resetToRealAnchor();
    expect(await stateOf(minhanh)).toEqual(once);
  });

  it("leaves an account somebody made themselves as it was — but for a style the reset did not bring back", async () => {
    expect(await stateOf(probe)).toEqual(NOTHING);

    // A style the back office added after the seed: a fixed one, in black.
    const added = await service.from("products").insert({
      id: "p-b9-probe",
      slug: "b9-probe",
      name: "THỬ B9",
      kind: "Áo thun",
      family: "TEE",
      material: "Cotton",
      fit: "REGULAR",
      price_vnd: 100000,
      cut_units: null,
      drop_no: null,
      position: 9999,
    });
    expect(added.error).toBeNull();
    const colour = await service
      .from("product_colors")
      .insert({ product_id: "p-b9-probe", color: "black", position: 0, photo_key: "flat-ao-thun-tron-black" });
    expect(colour.error).toBeNull();

    await probe.rpc("save_favorite", { p_product_id: "p-b9-probe" });
    await probe.rpc("save_favorite", { p_product_id: "p-khoi", p_color: "cream" });
    await probe.rpc("save_favorite", { p_product_id: "p-bui" });
    await probe.rpc("unsave_favorite", { p_product_id: "p-bui" });
    await probe.rpc("set_reminder", { p_drop_no: 6, p_on: true });
    await probe.rpc("set_my_size", { p_slot: "top", p_size: "S" });
    await probe.rpc("set_my_notify", { p_key: "promo", p_on: false });
    const before = await stateOf(probe);
    expect(ids(before)).toEqual(["p-khoi", "p-b9-probe"]);

    await resetToRealAnchor();

    // The reset emptied the catalogue and did not bring p-b9-probe back, so
    // that one saved style is gone; everything else is as it was.
    const after = await stateOf(probe);
    expect(after).toEqual({ ...before, favorites: before.favorites.filter((f) => f.productId === "p-khoi") });
    // Even "Bỏ lưu" survived: Hoàn tác still brings BỤI back, on top.
    const undo = await probe.rpc("restore_favorite", { p_product_id: "p-bui" });
    expect(ids(toMyState(undo.data))).toEqual(["p-bui", "p-khoi"]);
  });
});
