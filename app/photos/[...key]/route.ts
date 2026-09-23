import type { NextRequest } from "next/server";
import { publicPhotoUrl } from "@/lib/db/photos";
import { isUploadedKey, uploadTypeOf } from "@/lib/photos";

/**
 * A product photo the back office uploaded, served from the app's own origin
 * (slice B3c).
 *
 * The object lives in the public `product-photos` bucket; this route fetches
 * it server-side and streams it back, so a page shows `/photos/up/<hex>.webp`
 * — through `next/image`, which optimises a local path by requesting it here
 * — and the browser never learns the Supabase host (QĐ-25: no request leaves
 * loopback; `images.remotePatterns` still names Unsplash only).
 *
 *   · Only a key of the upload's own shape is looked up (`isUploadedKey`,
 *     the pattern `public.photo_key_ok()` uses): anything else — a borrowed
 *     frame's short key, `up/../x`, a longer path — is a 404 before any
 *     request leaves the server.
 *   · A key is random and an object is never overwritten (`upsert: false`),
 *     so a found photo never changes under its URL: cached for a year,
 *     `immutable`. A photo that is not there (the bucket answers 400 for a
 *     missing object) is a 404 that nobody caches — it may be uploaded yet.
 *   · Not `force-static`: the bucket is read when the photo is asked for,
 *     and a GET Route Handler is not cached by default
 *     (`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`,
 *     "Caching"); the cache is the response header.
 *
 * `proxy.ts` never runs here: its matcher skips every path ending in `.webp`
 * or `.jpg`, so a photo costs no session refresh.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/photos/[...key]">) {
  const { key: segments } = await ctx.params;
  const key = segments.join("/");
  if (!isUploadedKey(key)) return notFound();

  let upstream: Response;
  try {
    // `no-store`: the photo is streamed, not kept in the data cache — the
    // response below is what browsers and the image optimiser cache.
    upstream = await fetch(publicPhotoUrl(key), { cache: "no-store" });
  } catch {
    return unavailable();
  }

  if (!upstream.ok || !upstream.body) {
    // The Storage API answers a missing object with 400 (or 404); anything
    // else is the bucket being unreachable, which is not "no such photo".
    return upstream.status === 400 || upstream.status === 404 ? notFound() : unavailable();
  }

  // The type is the one the key was stored as, not whatever the upstream
  // said; no length is copied, because `fetch` hands over a body it may have
  // decoded, and a stale length would cut the image short.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": uploadTypeOf(key),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function notFound(): Response {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

function unavailable(): Response {
  return new Response("Bad gateway", { status: 502, headers: { "Cache-Control": "no-store" } });
}
