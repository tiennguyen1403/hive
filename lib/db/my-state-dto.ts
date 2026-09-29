import {
  COLOR_KEYS,
  NOTIFY_KEYS,
  SIZES,
  SIZE_SLOTS,
  productId,
  type ColorKey,
  type Favorite,
  type MySizes,
  type MyState,
  type NotifySwitches,
  type Size,
} from "@/data/types";

/**
 * `my_state()` and the B9 writes → `MyState` in `data/types.ts`.
 *
 * The functions answer with `jsonb`, which reaches here as `unknown`: a
 * migration that renamed a key would hand over a different document rather
 * than an error. So every field is checked on the way in, and a failure names
 * its path — the same stance as `catalog-snapshot.ts`.
 *
 * Pure and without `import "server-only"`, like `account-dto.ts`, so
 * `my-state-dto.test.ts` can run it without a database; `my-state.ts` is the
 * half that queries.
 */

const fail = (path: string, expected: string): never => {
  throw new Error(`my state: ${path} ${expected}`);
};

/** Every instant the app reads carries `+07:00` (`lib/datetime.ts` reads the offset out of the text). */
const VN_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/;

/** `products.id`'s own check. */
const PRODUCT_ID = /^p-[a-z0-9-]+$/;

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(path, "must be an object");
  }
  return value as Record<string, unknown>;
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) return fail(path, "must be an array");
  return value;
}

/** One saved style — also the row "Bỏ lưu" answers with. */
export function toFavorite(value: unknown, path = "favorite"): Favorite {
  const row = record(value, path);

  const id = row.productId;
  if (typeof id !== "string" || !PRODUCT_ID.test(id)) fail(`${path}.productId`, "must be a style id");

  const color = row.color;
  if (typeof color !== "string" || !(COLOR_KEYS as readonly string[]).includes(color)) {
    fail(`${path}.color`, `must be one of ${COLOR_KEYS.join(", ")}`);
  }

  // Null is a value: a style the seed saved has no moment. A missing key is not.
  const savedAt = row.savedAt;
  if (savedAt !== null && (typeof savedAt !== "string" || !VN_ISO.test(savedAt))) {
    fail(`${path}.savedAt`, "must be null or an ISO instant ending in +07:00");
  }

  return {
    productId: productId(id as string),
    color: color as ColorKey,
    savedAt: savedAt as string | null,
  };
}

function toSizes(value: unknown, path: string): MySizes {
  const row = record(value, path);
  const sizes = {} as MySizes;
  for (const slot of SIZE_SLOTS) {
    const size = row[slot];
    if (size !== null && (typeof size !== "string" || !(SIZES as readonly string[]).includes(size))) {
      fail(`${path}.${slot}`, `must be null or one of ${SIZES.join(", ")}`);
    }
    sizes[slot] = size as Size | null;
  }
  return sizes;
}

function toNotify(value: unknown, path: string): NotifySwitches {
  const row = record(value, path);
  const notify = {} as NotifySwitches;
  for (const key of NOTIFY_KEYS) {
    const on = row[key];
    if (typeof on !== "boolean") fail(`${path}.${key}`, "must be a boolean");
    notify[key] = on as boolean;
  }
  return notify;
}

/** The whole document. Throws, naming the field, when it is not one. */
export function toMyState(value: unknown): MyState {
  const doc = record(value, "state");

  const favorites = list(doc.favorites, "state.favorites").map((f, i) =>
    toFavorite(f, `state.favorites[${i}]`),
  );

  const reminders = list(doc.reminders, "state.reminders").map((no, i) => {
    if (typeof no !== "number" || !Number.isInteger(no) || no <= 0) {
      fail(`state.reminders[${i}]`, "must be a positive integer");
    }
    return no as number;
  });

  return {
    favorites,
    reminders,
    sizes: toSizes(doc.sizes, "state.sizes"),
    notify: toNotify(doc.notify, "state.notify"),
  };
}

/** `unsave_favorite()`: the row it took off (or null) and the state after. */
export function toUnsaveAnswer(value: unknown): { removed: Favorite | null; state: MyState } {
  const doc = record(value, "answer");
  return {
    removed: doc.removed === null ? null : toFavorite(doc.removed, "answer.removed"),
    state: toMyState(doc.state),
  };
}

/** `update_my_profile()`: the name and the phone as stored. */
export function toProfileAnswer(value: unknown): { name: string; phone: string } {
  const doc = record(value, "profile");
  const { name, phone } = doc;
  if (typeof name !== "string" || name === "") fail("profile.name", "must be a non-empty string");
  if (typeof phone !== "string" || !/^0\d{9}$/.test(phone)) fail("profile.phone", "must be ten digits");
  return { name: name as string, phone: phone as string };
}
