import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import type { Database } from "./database.types";

/**
 * Slice B16 against the local stack: the name a new account's profile gets,
 * from whichever key the sign-in's metadata carries it under
 * (`20261007120000_google_names.sql`), and the claim the app reads to tell an
 * account made with Google from one with a password (`SessionInfo.oauthOnly`).
 *
 * The metadata is set through the Auth admin API, the way `seed-users.ts`
 * sets the demo accounts'; a real Google sign-in fills the same
 * `raw_user_meta_data` column. Which keys Google really sends is read back
 * after the first real sign-in (the report of slice B16 has the query).
 */

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const demoPassword = process.env.DEMO_PASSWORD;
if (!url || !publishableKey || !secretKey || !demoPassword) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY and DEMO_PASSWORD must be in .env.local — see .env.example.",
  );
}

const noSession = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient<Database>(url, secretKey, noSession);

/** Every account this file makes, deleted at the end whatever happened. */
const made: string[] = [];

/** A new account with this metadata and no password, as a provider's sign-in has none. */
async function accountWith(email: string, metadata: Record<string, unknown>): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: metadata });
  if (error) throw new Error(`createUser(${email}) refused: ${error.message}`);
  made.push(data.user.id);
  return data.user.id;
}

async function nameOf(id: string): Promise<string> {
  const { data, error } = await admin.from("profiles").select("name").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data.name;
}

afterAll(async () => {
  for (const id of made) await admin.auth.admin.deleteUser(id);
});

describe("handle_new_user(): the name, from name, then full_name, then the address", () => {
  it("takes `name` when there is one", async () => {
    const id = await accountWith("b16-name@example.test", { name: "Lê Văn Gờ", full_name: "Lê Văn Gờ (đầy đủ)" });
    expect(await nameOf(id)).toBe("Lê Văn Gờ");
  });

  it("takes `full_name` when `name` is missing", async () => {
    const id = await accountWith("b16-full@example.test", { full_name: "Trần Thị Gờ" });
    expect(await nameOf(id)).toBe("Trần Thị Gờ");
  });

  it("takes `full_name` when `name` is only spaces, trimming whichever it takes", async () => {
    const id = await accountWith("b16-blank@example.test", { name: "   ", full_name: "  Phạm Gờ  " });
    expect(await nameOf(id)).toBe("Phạm Gờ");
  });

  it("falls back to the part of the address before the @ when neither says a name", async () => {
    const id = await accountWith("b16-noname@example.test", { avatar_url: "https://example.test/a.png" });
    expect(await nameOf(id)).toBe("b16-noname");
  });

  it("never fails the sign-up over a name it cannot use", async () => {
    const id = await accountWith("b16-odd@example.test", { name: 42, full_name: { given: "x" }, phone: "12" });
    // `->>` reads the JSON number as its text; the phone that is not ten digits is stored empty.
    expect(await nameOf(id)).toBe("42");
    const { data } = await admin.from("profiles").select("phone, handle").eq("id", id).single();
    expect(data).toEqual({ phone: "", handle: null });
  });
});

describe("the claim SessionInfo.oauthOnly reads", () => {
  it("lists `email` among a password account's providers, so no demo account loses its password sheet", async () => {
    const client = createClient<Database>(url!, publishableKey!, noSession);
    const { error } = await client.auth.signInWithPassword({ email: "minhanh@email.com", password: demoPassword! });
    expect(error).toBeNull();
    const { data } = await client.auth.getClaims();
    expect(data?.claims.app_metadata?.providers).toEqual(["email"]);
    const { data: user } = await client.auth.getUser();
    expect(user.user?.identities?.map((i) => i.provider)).toEqual(["email"]);
  });
});
