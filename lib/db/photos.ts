import "server-only";

import { createClient } from "@supabase/supabase-js";
import { isUploadedKey, type UploadType } from "@/lib/photos";
import type { Database } from "./database.types";
import { getSupabase, supabaseEnv } from "./server";
import { getServiceSupabase } from "./service";

/**
 * The product-photo bucket, from the server's side (slice B3c).
 *
 * Writing — an upload, a removal, emptying `up/` — needs the service role
 * (`./service.ts`), because the bucket has no policy that lets any other role
 * write. Reading needs nothing: the bucket is public, so an object is served
 * by its exact name to anybody who asks — and the one who asks is the app's
 * own `/photos/<key>` route, never the browser. Whether a photo is still
 * shown anywhere is a question about TABLES, so it is asked with the
 * visitor's own session (`getSupabase()`), as every table read is.
 *
 * Sources: https://supabase.com/docs/guides/storage/serving/downloads ("For
 * public buckets, make a request to the URL returned from `getPublicUrl`");
 * the `upload`, `remove` and `list` signatures of `@supabase/storage-js`
 * 2.117 (`node_modules/@supabase/storage-js/dist/index.d.mts`).
 */

export const PHOTO_BUCKET = "product-photos";

/** The folder every upload lives in — the `up/` of `UPLOAD_KEY_RE`. */
const UPLOAD_FOLDER = "up";

/** The Storage API's own page size for `list`, and the batch `remove` takes. */
const PAGE = 100;

/**
 * Store one photo under `key`. False when it could not be stored — no
 * service key in this environment, the bucket refused it, the network — and
 * the reason is logged for the server, never returned: a Storage error names
 * buckets and policies.
 *
 * `upsert: false`: a key is random, so a clash means something is wrong, and
 * an object must never change under a URL that is cached for a year.
 */
export async function storeUploadedPhoto(
  key: string,
  bytes: Uint8Array,
  type: UploadType,
): Promise<boolean> {
  if (!isUploadedKey(key)) return false;
  const service = getServiceSupabase();
  if (!service) {
    console.error("product photo upload: SUPABASE_SECRET_KEY is not set");
    return false;
  }
  const { error } = await service.storage.from(PHOTO_BUCKET).upload(key, bytes, {
    contentType: type,
    // Seconds; the Storage API serves it back as `max-age=31536000`.
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("product photo upload:", error.message);
    return false;
  }
  return true;
}

/**
 * Remove uploaded photos by key, in batches of a hundred. Best effort: a
 * failure is logged and reported as `failed`, never thrown — a photo left
 * behind is an object nobody links to, while a thrown error here would turn
 * a save that already went through into a red toast. Keys of any other shape
 * are ignored: a borrowed frame is not an object. `removed` counts the
 * objects that went; a key that was already gone is not one of them.
 */
export async function removeUploadedPhotos(
  keys: readonly string[],
): Promise<{ removed: number; failed: boolean }> {
  const uploads = [...new Set(keys.filter(isUploadedKey))];
  if (uploads.length === 0) return { removed: 0, failed: false };
  const service = getServiceSupabase();
  if (!service) {
    console.error("product photo removal: SUPABASE_SECRET_KEY is not set");
    return { removed: 0, failed: true };
  }
  let removed = 0;
  let failed = false;
  for (let i = 0; i < uploads.length; i += PAGE) {
    const { data, error } = await service.storage.from(PHOTO_BUCKET).remove(uploads.slice(i, i + PAGE));
    if (error) {
      console.error("product photo removal:", error.message);
      failed = true;
      continue;
    }
    removed += data.length;
  }
  return { removed, failed };
}

/**
 * After a write that may have let go of some uploads: remove each one that no
 * style's colour and no teaser shows any more. Best effort, like
 * `removeUploadedPhotos` — the write it follows has already gone through.
 */
export async function removeLoosePhotos(keys: readonly string[]): Promise<void> {
  const loose: string[] = [];
  for (const key of new Set(keys.filter(isUploadedKey))) {
    if (!(await photoKeyInUse(key))) loose.push(key);
  }
  if (loose.length > 0) await removeUploadedPhotos(loose);
}

/**
 * Every uploaded photo, gone: what "Đặt lại dữ liệu mẫu" does after
 * `reset_demo()` has put the sample catalogue back (which uses borrowed
 * frames only), and what the daily cron of slice B4 does the same way.
 *
 * The whole of `up/` is listed first, page by page, and only then removed in
 * batches — removing while paging would shift the pages under the offset.
 * Returns how many objects went. THROWS when the bucket cannot be listed or
 * emptied (no service key, the Storage API down): the caller decides whether
 * that fails its answer — the reset reports it, a cron logs it.
 */
export async function purgeUploadedPhotos(): Promise<number> {
  const service = getServiceSupabase();
  if (!service) throw new Error("purgeUploadedPhotos: SUPABASE_SECRET_KEY is not set");
  const bucket = service.storage.from(PHOTO_BUCKET);

  const keys: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await bucket.list(UPLOAD_FOLDER, {
      limit: PAGE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`purgeUploadedPhotos: listing failed (${error.message})`);
    // A folder entry has no id; `up/` holds files only, but a folder is not
    // an object to remove.
    for (const item of data) if (item.id !== null) keys.push(`${UPLOAD_FOLDER}/${item.name}`);
    if (data.length < PAGE) break;
  }

  let removed = 0;
  for (let i = 0; i < keys.length; i += PAGE) {
    const { data, error } = await bucket.remove(keys.slice(i, i + PAGE));
    if (error) throw new Error(`purgeUploadedPhotos: removal failed (${error.message})`);
    removed += data.length;
  }
  return removed;
}

/**
 * Whether a style's colour or a teaser still shows this photo — read fresh
 * from the tables (both are public to read), after the write that may have
 * let go of it. When the answer is unknown the photo counts as in use: a
 * left-over object costs nothing, a missing one is a broken image.
 */
export async function photoKeyInUse(key: string): Promise<boolean> {
  const supabase = await getSupabase();
  const [colors, teasers] = await Promise.all([
    supabase.from("product_colors").select("product_id", { count: "exact", head: true }).eq("photo_key", key),
    supabase.from("teasers").select("slug", { count: "exact", head: true }).eq("photo_key", key),
  ]);
  if (colors.error || teasers.error) return true;
  return (colors.count ?? 0) + (teasers.count ?? 0) > 0;
}

/**
 * Where the bucket serves an uploaded photo to anybody — the URL the photo
 * route fetches. Built by a publishable-key client with no session: a public
 * object needs no key and no cookie, and this URL never reaches the browser.
 */
export function publicPhotoUrl(key: string): string {
  const { url, publishableKey } = supabaseEnv();
  const reader = createClient<Database>(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return reader.storage.from(PHOTO_BUCKET).getPublicUrl(key).data.publicUrl;
}
