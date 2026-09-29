import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import type { Database } from "./database.types";

/**
 * What slice B10 claims about "Hoàn tác" in the address book, checked against
 * Postgres (`20260930090000_step_moments_address_undo.sql`). The mock puts the
 * book back exactly as it was (`addresses.js`: `saveAddresses(before)`), so:
 *
 *   · `remove_address()` keeps the address it removed aside — one per
 *     account, the last — where no role the API hands out can read or write
 *     it;
 *   · `restore_address(id)` puts that address back: the same id, the same
 *     place in the book, the same fields, and the default role if it had it —
 *     the address that took the role over when it went lets go of it;
 *   · the browser names the address and nothing else, so another account
 *     cannot put it back, nor can a visitor with no session;
 *   · an address added since, which took the old place, moves one down;
 *   · only the last removal can be undone, and twice is once;
 *   · deleted addresses are not kept (review of B10): a removal older than
 *     ten minutes is not put back, only forgotten, and the reset forgets
 *     every account's — a sign-up's as well as a demo account's
 *     (`20260930110000_address_undo_window.sql`).
 *
 * Needs a running stack, `.env.local` and the demo accounts
 * (`npm run seed:users`); every test starts from `reset_demo(demo_anchor())`
 * and the file ends on one.
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

/** The service role — scripts and tests only. It bypasses row level security. */
const service = createClient<Database>(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function signedIn(email: string): Promise<Client> {
  const client = fresh();
  const { error } = await client.auth.signInWithPassword({ email, password: demoPassword! });
  if (error) throw new Error(`could not sign in as a demo account: ${error.message}`);
  return client;
}

/** c-minhanh: Nhà (default) and Công ty. */
const MINHANH = CUSTOMERS[0]!;
/** c-namle: one Nhà, the default. */
const NAMLE = CUSTOMERS[1]!;

async function resetToRealAnchor() {
  const anchor = await service.rpc("demo_anchor");
  if (anchor.error) throw new Error(`demo_anchor failed: ${anchor.error.message}`);
  const { error } = await service.rpc("reset_demo", { p_anchor: anchor.data as string });
  if (error) throw new Error(`reset_demo failed: ${error.message}`);
}

/** The book in its own order, every column the screen reads, plus the place. */
async function bookOf(client: Client) {
  const { data, error } = await client
    .from("addresses")
    .select("id, position, label, recipient, phone, line, province_code, ward_code, is_default")
    .order("position");
  if (error) throw new Error(error.message);
  return data;
}

async function add(client: Client, label: string, line: string, isDefault = false): Promise<string> {
  const { data, error } = await client.rpc("add_address", {
    p_recipient: "Trần Minh Anh",
    p_phone: "0912345678",
    p_line: line,
    p_province_code: "29",
    p_ward_code: "70125111",
    p_label: label,
    p_default: isDefault,
  });
  if (error || !data) throw new Error(`add_address: ${error?.message ?? "null"}`);
  return data as string;
}

async function remove(client: Client, id: string) {
  const { data, error } = await client.rpc("remove_address", { p_id: id });
  expect(error).toBeNull();
  expect(data).toBe(true);
}

async function restore(client: Client, id: string) {
  const { data, error } = await client.rpc("restore_address", { p_id: id });
  expect(error).toBeNull();
  return data as string | null;
}

const idOf = async (client: Client, label: string) => (await bookOf(client)).find((a) => a.label === label)!.id;

/** The signed-in account's own profile id (its "read own" policy shows it one row). */
const profileIdOf = async (client: Client) => (await client.from("profiles").select("id")).data![0]!.id;

/** What the database kept for an account, read past row level security. */
async function keptFor(profileId: string) {
  const { data, error } = await service.from("removed_addresses").select("address_id").eq("profile_id", profileId);
  if (error) throw new Error(error.message);
  return data;
}

/** Moves an account's kept removal `minutes` into the past, as if it had waited that long. */
async function backdate(profileId: string, minutes: number) {
  const { error } = await service
    .from("removed_addresses")
    .update({ removed_at: new Date(Date.now() - minutes * 60_000).toISOString() })
    .eq("profile_id", profileId);
  if (error) throw new Error(error.message);
}

let minhanh: Client;
let namle: Client;

beforeAll(async () => {
  minhanh = await signedIn(MINHANH.email);
  namle = await signedIn(NAMLE.email);
});

beforeEach(async () => {
  await resetToRealAnchor();
});

afterAll(async () => {
  await resetToRealAnchor();
});

describe("restore_address(): Hoàn tác puts the book back as it was", () => {
  it("puts the middle one of three back in its place, with its id and every field", async () => {
    await add(minhanh, "Khác", "12 Nguyễn Huệ");
    const before = await bookOf(minhanh);
    expect(before.map((a) => a.label)).toEqual(["Nhà", "Công ty", "Khác"]);
    const middle = before[1]!;

    await remove(minhanh, middle.id);
    expect((await bookOf(minhanh)).map((a) => a.label)).toEqual(["Nhà", "Khác"]);

    expect(await restore(minhanh, middle.id)).toBe(middle.id);
    expect(await bookOf(minhanh)).toEqual(before);
  });

  it("gives the default its role back, and the address that took it over lets go", async () => {
    await add(minhanh, "Khác", "12 Nguyễn Huệ");
    const before = await bookOf(minhanh);
    const home = before[0]!;
    expect(home).toMatchObject({ label: "Nhà", is_default: true });

    await remove(minhanh, home.id);
    // The earliest left took the role over, as removing a default always does.
    const during = await bookOf(minhanh);
    expect(during.filter((a) => a.is_default).map((a) => a.label)).toEqual(["Công ty"]);

    expect(await restore(minhanh, home.id)).toBe(home.id);
    const after = await bookOf(minhanh);
    expect(after).toEqual(before);
    expect(after.filter((a) => a.is_default).map((a) => a.id)).toEqual([home.id]);
  });

  it("moves an address added since, which took the old place, one down", async () => {
    const work = await idOf(minhanh, "Công ty");
    await remove(minhanh, work);
    // A new address goes after the last one left: into the place just freed.
    const later = await add(minhanh, "Khác", "12 Nguyễn Huệ");
    expect((await bookOf(minhanh)).find((a) => a.id === later)!.position).toBe(1);

    expect(await restore(minhanh, work)).toBe(work);
    const after = await bookOf(minhanh);
    expect(after.map((a) => [a.label, a.position])).toEqual([
      ["Nhà", 0],
      ["Công ty", 1],
      ["Khác", 2],
    ]);
    expect(after.filter((a) => a.is_default).map((a) => a.label)).toEqual(["Nhà"]);
  });

  it("undoes only the last removal, and undoing twice is undoing once", async () => {
    const other = await add(minhanh, "Khác", "12 Nguyễn Huệ");
    const work = await idOf(minhanh, "Công ty");
    await remove(minhanh, work);
    await remove(minhanh, other);

    expect(await restore(minhanh, work)).toBeNull();
    expect(await restore(minhanh, other)).toBe(other);
    const once = await bookOf(minhanh);
    expect(await restore(minhanh, other)).toBe(other);
    expect(await bookOf(minhanh)).toEqual(once);
    expect(once.map((a) => a.label)).toEqual(["Nhà", "Khác"]);
  });

  it("answers null when there is nothing to undo", async () => {
    expect(await restore(minhanh, "00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("makes the address the default when it comes back to an empty book", async () => {
    const extra = await add(namle, "Công ty", "1 Tràng Tiền");
    await remove(namle, extra);
    // The book's last address, deleted without the function: nothing is kept for it.
    const home = await idOf(namle, "Nhà");
    const gone = await namle.from("addresses").delete().eq("id", home);
    expect(gone.error).toBeNull();
    expect(await bookOf(namle)).toEqual([]);

    expect(await restore(namle, extra)).toBe(extra);
    const after = await bookOf(namle);
    expect(after.map((a) => [a.id, a.is_default])).toEqual([[extra, true]]);
  });
});

describe("restore_address(): nobody else's hand", () => {
  it("will not let another account put this account's address back — and leaves it to its owner", async () => {
    const work = await idOf(minhanh, "Công ty");
    await remove(minhanh, work);
    const theirs = await bookOf(namle);

    expect(await restore(namle, work)).toBeNull();
    expect(await bookOf(namle)).toEqual(theirs);
    expect((await bookOf(minhanh)).map((a) => a.id)).not.toContain(work);

    // Its owner still can: the other account's try spent nothing of it.
    expect(await restore(minhanh, work)).toBe(work);
  });

  it("is not a visitor's to call at all", async () => {
    const work = await idOf(minhanh, "Công ty");
    await remove(minhanh, work);
    const refused = await anon.rpc("restore_address", { p_id: work });
    expect(refused.error).not.toBeNull();
    expect((await bookOf(minhanh)).map((a) => a.id)).not.toContain(work);
  });

  it("keeps what was removed where no API role can read or write it", async () => {
    const work = await idOf(minhanh, "Công ty");
    await remove(minhanh, work);

    for (const client of [anon, minhanh]) {
      const read = await client.from("removed_addresses").select("address_id");
      expect(read.data ?? []).toEqual([]);
    }
    const me = (await minhanh.from("profiles").select("id")).data![0]!.id;
    const forged = await minhanh.from("removed_addresses").insert({
      profile_id: me,
      address_id: "00000000-0000-4000-8000-000000000001",
      recipient: "Kẻ lạ",
      phone: "0900000009",
      line: "1 Đường Nào Đó",
      province_code: "29",
      ward_code: "70101063",
      label: "Khác",
      was_default: true,
      position: 0,
    });
    expect(forged.error).not.toBeNull();

    // The service role, which bypasses row level security, sees the one row.
    const kept = await service
      .from("removed_addresses")
      .select("address_id, position, was_default")
      .eq("profile_id", me);
    expect(kept.data).toEqual([{ address_id: work, position: 1, was_default: false }]);
  });
});

describe("restore_address(): the undo lasts ten minutes", () => {
  it("puts nothing back once ten minutes have passed, and forgets the address", async () => {
    const work = await idOf(minhanh, "Công ty");
    await remove(minhanh, work);
    const me = await profileIdOf(minhanh);
    await backdate(me, 11);

    expect(await restore(minhanh, work)).toBeNull();
    expect(await keptFor(me)).toEqual([]);
    expect((await bookOf(minhanh)).map((a) => a.id)).not.toContain(work);
  });

  it("still puts it back nine minutes on", async () => {
    const before = await bookOf(minhanh);
    const work = await idOf(minhanh, "Công ty");
    await remove(minhanh, work);
    await backdate(await profileIdOf(minhanh), 9);

    expect(await restore(minhanh, work)).toBe(work);
    expect(await bookOf(minhanh)).toEqual(before);
  });
});

describe("the reset", () => {
  it("forgets a demo account's removal: its book is the fixture's again", async () => {
    const work = await idOf(minhanh, "Công ty");
    await remove(minhanh, work);
    await resetToRealAnchor();

    const back = await bookOf(minhanh);
    expect(back.map((a) => a.label)).toEqual(MINHANH.addresses.map((a) => a.label));
    expect(await restore(minhanh, work)).toBeNull();
    expect(await bookOf(minhanh)).toEqual(back);
  });

  describe("an account somebody made themselves", () => {
    const email = `undo-probe-${Date.now()}@example.test`;
    let userId = "";
    let stranger: Client;

    beforeAll(async () => {
      const { data, error } = await service.auth.admin.createUser({
        email,
        password: "probe-2026",
        email_confirm: true,
        user_metadata: { name: "Người Thử", phone: "0900000002" },
      });
      if (error) throw new Error(error.message);
      userId = data.user.id;
      stranger = fresh();
      const signed = await stranger.auth.signInWithPassword({ email, password: "probe-2026" });
      if (signed.error) throw new Error(signed.error.message);
    });

    afterAll(async () => {
      if (userId) await service.auth.admin.deleteUser(userId);
    });

    it("loses its removal too — nothing a shopper deleted outlives the day — and keeps its book", async () => {
      const home = await add(stranger, "Nhà", "1 Đường Thử", true);
      const work = await add(stranger, "Công ty", "2 Đường Thử");
      await remove(stranger, work);
      await remove(minhanh, await idOf(minhanh, "Công ty"));
      expect(await keptFor(userId)).toEqual([{ address_id: work }]);

      await resetToRealAnchor();

      // Every account's, not only the demo ones'.
      const left = await service.from("removed_addresses").select("profile_id");
      expect(left.data).toEqual([]);
      expect(await restore(stranger, work)).toBeNull();
      // The reset leaves a book it did not seed as it was.
      expect((await bookOf(stranger)).map((a) => a.id)).toEqual([home]);
    });
  });
});
