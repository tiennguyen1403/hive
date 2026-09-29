"use server";

import type { ColorKey, MyState, NotifyKey, ProductId, Size, SizeSlot } from "@/data/types";
import * as keeps from "@/lib/db/my-state";
import { takeRate } from "@/lib/db/rate-limit";
import { getSession } from "@/lib/db/session";
import {
  keepRefusal,
  readColorChoice,
  readDropNo,
  readNotifyKey,
  readProductId,
  readSizeChoice,
  readSizeSlot,
  readSwitch,
  type KeepRefusal,
  type KeepResult,
  type KeepTopic,
  type UnsaveResult,
  type Written,
} from "@/lib/my-state";

/**
 * Saving a style, a reminder, a size, a switch (slice B9).
 *
 * PUBLIC ENDPOINTS, every one: "Server Functions are reachable via direct
 * POST requests, not just through your application's UI. Always verify
 * authentication and authorization inside every Server Function"
 * (`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`).
 * So each of them, in this order:
 *
 *   1. asks who is signed in (`getSession`, a verified token) — nobody:
 *      SIGNED_OUT, with the mock's invitation, and NOTHING IS WRITTEN. No
 *      redirect: the heart and "Nhắc tôi" answer with a toast in place
 *      (`feed.js#askSignIn`), which is the screen's call to make;
 *   2. reads what the browser sent as untrusted (`lib/my-state.ts`) — the
 *      types in the signatures are the contract for UI slice 3b, not a check;
 *   3. spends one token of the visitor's `keep` limit — a bucket of its own
 *      (`lib/rate-limit.ts`: 120 per ten minutes), so a run of hearts cannot
 *      use up `account`, which the address book and "Huỷ đơn" spend — and a
 *      request refused in 1 or 2 spends none;
 *   4. writes through the database function, which names the owner from the
 *      token itself and checks everything again
 *      (`20260929120000_account_state.sql`).
 *
 * Each answers with the whole `MyState` as the database now holds it, so the
 * screen can draw optimistically and then settle on the answer. Refusals are
 * values with a sentence (`KeepRefusal`); nothing expected is thrown, and no
 * database text reaches the browser (`02-guides/data-security.md`,
 * "Controlling return values").
 *
 * No `revalidatePath`: the answer IS the new state, and no page renders these
 * tables on the server yet — re-rendering the whole layout for a heart would
 * buy nothing. Slice 3b decides whether a server-rendered screen needs
 * `refresh()` (`02-guides/server-actions.md`, "Choosing a cache update").
 */

type Done<T> = { ok: true; value: T } | KeepRefusal;

/** Steps 1–4 above, once. `input` is null when step 2 refused it. */
async function keep<I, T>(
  topic: KeepTopic,
  input: I | null,
  run: (input: I) => Promise<Written<T>>,
): Promise<Done<T>> {
  if (!(await getSession())) return keepRefusal("SIGNED_OUT", topic);
  if (input === null) return keepRefusal("INVALID", topic);

  const pace = await takeRate("keep");
  if (!pace.ok) return keepRefusal("RATE_LIMITED", topic, pace.message);

  try {
    const done = await run(input);
    return done.ok ? done : keepRefusal(done.failure, topic);
  } catch (error) {
    // Plumbing (a missing variable, the network): logged, and a sentence.
    console.error(`keep(${topic}):`, error instanceof Error ? error.message : error);
    return keepRefusal("UNAVAILABLE", topic);
  }
}

const asState = (done: Done<MyState>): KeepResult =>
  done.ok ? { ok: true, state: done.value } : done;

/**
 * The heart: save `productId`, in `color` — or, with none, in the first of its
 * colours that has anything left (the mock's `firstColor`). A style already
 * saved stays as it is; one of a closed issue, or a fixed style, can be saved.
 */
export async function saveFavoriteAction(
  productId: ProductId,
  color: ColorKey | null = null,
): Promise<KeepResult> {
  const id = readProductId(productId);
  const choice = readColorChoice(color);
  return asState(
    await keep("favorites", id && choice ? { id, color: choice.color } : null, (i) =>
      keeps.saveFavorite(i.id, i.color),
    ),
  );
}

/**
 * The filled heart: take `productId` off the list. Answers with the row it
 * took off — hand its `productId` to `restoreFavoriteAction` for "Hoàn tác" —
 * or `removed: null` when the style was not saved.
 */
export async function unsaveFavoriteAction(productId: ProductId): Promise<UnsaveResult> {
  const done = await keep("favorites", readProductId(productId), (id) => keeps.unsaveFavorite(id));
  return done.ok ? { ok: true, state: done.value.state, removed: done.value.removed } : done;
}

/**
 * "Hoàn tác": the style just unsaved, back in exactly its old place — its
 * row was kept aside, so nothing sent from here decides where. NOT_FOUND when
 * there is nothing to undo; a style saved again meanwhile stays as it is.
 */
export async function restoreFavoriteAction(productId: ProductId): Promise<KeepResult> {
  return asState(await keep("favorites", readProductId(productId), (id) => keeps.restoreFavorite(id)));
}

/**
 * "Nhắc tôi" (`on: true`) and "Đã bật nhắc" pressed again (`on: false`).
 * On only for an issue that has not opened — NOT_UPCOMING otherwise; off at
 * any time. `state.reminders` lists only the issues still to open.
 */
export async function setReminderAction(dropNo: number, on: boolean): Promise<KeepResult> {
  const no = readDropNo(dropNo);
  const flag = readSwitch(on);
  return asState(
    await keep("reminders", no !== null && flag !== null ? { no, on: flag } : null, (i) =>
      keeps.setReminder(i.no, i.on),
    ),
  );
}

/** "Size của tôi": áo (`top`) or quần (`bottom`); `null` is "Bỏ chọn". */
export async function setMySizeAction(slot: SizeSlot, size: Size | null): Promise<KeepResult> {
  const which = readSizeSlot(slot);
  const choice = readSizeChoice(size);
  return asState(
    await keep("sizes", which && choice ? { slot: which, size: choice.size } : null, (i) =>
      keeps.setMySize(i.slot, i.size),
    ),
  );
}

/** One of the four switches under "Nhận thông báo về", on or off. */
export async function setNotifyAction(key: NotifyKey, on: boolean): Promise<KeepResult> {
  const which = readNotifyKey(key);
  const flag = readSwitch(on);
  return asState(
    await keep("notify", which && flag !== null ? { key: which, on: flag } : null, (i) =>
      keeps.setNotify(i.key, i.on),
    ),
  );
}
