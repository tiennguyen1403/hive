import "server-only";

import { cache } from "react";
import type { ColorKey, Favorite, MyState, NotifyKey, ProductId, Size, SizeSlot } from "@/data/types";
import { keepFailureOf, type KeepFailure, type Written } from "@/lib/my-state";
import { toMyState, toUnsaveAnswer } from "./my-state-dto";
import { getSupabase } from "./server";
import { getSession } from "./session";

/**
 * What the signed-in account keeps, in Postgres (slice B9): saved styles,
 * issue reminders, "Size của tôi" and the four notification switches
 * (`supabase/migrations/20260929120000_account_state.sql`).
 *
 * Nothing here passes an owner to the database. Every function below reads
 * `auth.uid()` from the session's token itself, so a caller cannot reach
 * another account's list by changing a parameter — the Data Access Layer of
 * `02-guides/data-security.md`, with the check where the data is.
 *
 * Reads go through `my_state()`, once per request (`React.cache`). Writes go
 * through one function each, and each answers with `my_state()` after the
 * change, so an action hands the screen the new state without a second read.
 * A refusal the function meant (SIGNED_OUT, BAD_INPUT, NOT_UPCOMING,
 * NOT_FOUND) comes back as a `Written` failure; anything else is
 * UNAVAILABLE, with its text in the server log and never in the answer.
 */

/**
 * Everything the signed-in account keeps, or null.
 *
 * Null when nobody is signed in — the brief's contract — and also when the
 * read fails, logged: this is meant for the root layout, beside `loadMe()`
 * (`app/layout.tsx`, UI slice 3b), and like `loadMe()` it must not turn a
 * hiccup into an error page on every route. A signed-in visitor with a null
 * state is one whose saved styles could not be read, not one with none.
 */
export const getMyState = cache(async (): Promise<MyState | null> => {
  const session = await getSession();
  if (!session) return null;

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("my_state");
  if (error) {
    console.error("my_state:", error.message);
    return null;
  }
  if (data === null) return null;

  try {
    return toMyState(data);
  } catch (e) {
    console.error("my_state:", e instanceof Error ? e.message : e);
    return null;
  }
});

/** The failure for a PostgREST error; the text goes to the log, not the caller. */
function refused(where: string, error: { code?: string; message: string }): { ok: false; failure: KeepFailure } {
  const failure = keepFailureOf(error);
  if (failure === "UNAVAILABLE") console.error(`${where}:`, error.message);
  return { ok: false, failure };
}

/** A document that does not read is the database's bug, and UNAVAILABLE to the caller. */
function answered<T>(where: string, data: unknown, read: (data: unknown) => T): Written<T> {
  try {
    return { ok: true, value: read(data) };
  } catch (e) {
    console.error(`${where}:`, e instanceof Error ? e.message : e);
    return { ok: false, failure: "UNAVAILABLE" };
  }
}

/** "Lưu" — in `color`, or with none in the first colour that has anything left. */
export async function saveFavorite(id: ProductId, color: ColorKey | null): Promise<Written<MyState>> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc(
    "save_favorite",
    color === null ? { p_product_id: id } : { p_product_id: id, p_color: color },
  );
  if (error) return refused("save_favorite", error);
  return answered("save_favorite", data, toMyState);
}

/** "Bỏ lưu" — the row it took off (null if the style was not saved), and the state after. */
export async function unsaveFavorite(
  id: ProductId,
): Promise<Written<{ removed: Favorite | null; state: MyState }>> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("unsave_favorite", { p_product_id: id });
  if (error) return refused("unsave_favorite", error);
  return answered("unsave_favorite", data, toUnsaveAnswer);
}

/** "Hoàn tác" — the style back where it was. NOT_FOUND when there is nothing to undo. */
export async function restoreFavorite(id: ProductId): Promise<Written<MyState>> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("restore_favorite", { p_product_id: id });
  if (error) return refused("restore_favorite", error);
  return answered("restore_favorite", data, toMyState);
}

/** "Nhắc tôi" on (only before the issue opens: NOT_UPCOMING otherwise) or off. */
export async function setReminder(dropNo: number, on: boolean): Promise<Written<MyState>> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("set_reminder", { p_drop_no: dropNo, p_on: on });
  if (error) return refused("set_reminder", error);
  return answered("set_reminder", data, toMyState);
}

/** "Size của tôi" for áo or quần; null forgets it. */
export async function setMySize(slot: SizeSlot, size: Size | null): Promise<Written<MyState>> {
  const supabase = await getSupabase();
  // The parameter defaults to NULL, so leaving it out is how "Bỏ chọn" is said.
  const { data, error } = await supabase.rpc(
    "set_my_size",
    size === null ? { p_slot: slot } : { p_slot: slot, p_size: size },
  );
  if (error) return refused("set_my_size", error);
  return answered("set_my_size", data, toMyState);
}

/** One of the four switches. */
export async function setNotify(key: NotifyKey, on: boolean): Promise<Written<MyState>> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("set_my_notify", { p_key: key, p_on: on });
  if (error) return refused("set_my_notify", error);
  return answered("set_my_notify", data, toMyState);
}
