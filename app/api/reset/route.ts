import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { toVnIso } from "@/lib/datetime";
import { purgeUploadedPhotos } from "@/lib/db/photos";
import { getServiceSupabase } from "@/lib/db/service";

/**
 * The daily reset of the public demo (slice B4).
 *
 * WHY IT EXISTS. QĐ-25, answer 2: the demo is public — anybody can register,
 * "Đăng nhập thử" opens a sample shopper, the manager's password is printed
 * on the sign-in screen — and the data goes back to the sample once a day.
 * Every order a visitor placed, every style they added (and its uploaded
 * photo), every hour they moved or code they paused is undone, and the sample
 * is re-anchored on today's 18:50, so the transfers are waiting again and the
 * open issue is still open. Vercel Cron calls this route (`vercel.json`);
 * nothing in the UI does. The back office's "Đặt lại dữ liệu mẫu" is the
 * `resetDemo` action, which checks the manager's session, not a key — this
 * route cannot reuse it, because a cron job has no session.
 *
 * WHY 404 WITHOUT A KEY. `/api/health` stays callable when `CRON_SECRET` is
 * unset: counting the drops harms nobody. This route empties every order, so
 * "no key configured" must not turn into "anybody may call it" — it answers
 * as a route that does not exist. A developer who wants to try it sets the
 * variable in the shell that runs `next start`. With the variable set, the
 * header must be exactly `Bearer <CRON_SECRET>` (`lib/cron-auth.ts`), which is
 * what Vercel sends (https://vercel.com/docs/cron-jobs/manage-cron-jobs,
 * "Securing cron jobs").
 *
 * WHY THE SERVICE CLIENT. With no session there is no user to act as.
 * `reset_demo()` lets the `service_role` through — and logs the reset as the
 * system, not as a manager — and `demo_anchor()` is granted to it, so the
 * secret key (`getServiceSupabase()`, server-only) makes exactly those two
 * calls; the photo bucket needs that key anyway. No table is read or written
 * here directly.
 *
 * WHY THE SCHEDULE — `vercel.json` cannot hold a comment, so it is here.
 * Vercel reads a cron schedule in UTC, always (https://vercel.com/docs/cron-jobs,
 * "Cron expression limitations"). On the Hobby plan a job runs at most once a
 * day, and "Vercel may invoke these cron jobs at any point within the
 * specified hour": `0 8 * * *` fires anywhere between 08:00:00 and 08:59:59
 * (https://vercel.com/docs/cron-jobs/manage-cron-jobs, "Cron jobs accuracy";
 * https://vercel.com/docs/cron-jobs/usage-and-pricing, "Per-hour (±59 min)").
 * So only the HOUR of the schedule is a promise. `demo_anchor()` answers with
 * the most recent 18:50 in Vietnam; a run at 18:20 would get YESTERDAY's
 * 18:50 and hand the demo a day-old sample, with the 19:50 transfer about to
 * lapse. The reset therefore names the first whole hour after the anchor:
 * `0 12 * * *` is 12:00 UTC, 19:00 in Vietnam, and fires between 19:00 and
 * 19:59 — always after 18:50, so the anchor is always today's. (On a day it
 * fires after 19:50, the sample's earliest hold — 19:50, a day after its
 * anchor — reads as lapsed for those few minutes, until the reset puts it
 * back.) `/api/health` runs at `0 3 * * *`, 10:00–10:59 in Vietnam, a quiet
 * hour.
 * `regions: ["sin1"]` is Singapore, beside the Supabase project in
 * `ap-southeast-1`; a Hobby project may pick any single region
 * (https://vercel.com/docs/project-configuration/vercel-json#regions).
 *
 * A MISSED OR DOUBLED RUN. Vercel does not retry a failed cron invocation and
 * may, rarely, deliver the same run twice (manage-cron-jobs, "Cron job error
 * handling", "Cron job delivery and idempotency"). Both are harmless here: a
 * second run rebuilds the same sample on the same anchor and finds `up/`
 * already empty (`photosRemoved: 0`), and a missed day is caught by the next.
 *
 * THE ANSWER. `{ ok: true, anchor, photosRemoved }` — the anchor written as
 * Vietnamese wall-clock time, and how many uploaded photos went. When the
 * database cannot be reached or refuses, `{ ok: false }` with 503, and the
 * reason goes to the server log only: this endpoint is public, and a Postgres
 * error names schemas and roles. When the database part went through but the
 * bucket could not be emptied, the reset still happened, so the answer is
 * still 200, with `photosRemoved: null` — the same reasoning as `resetDemo`.
 */

// Never prerendered, never served from a cache: a cached answer would report
// a reset that did not run (`02-guides/caching-without-cache-components.md`,
// "`dynamic`"; Vercel's cron troubleshooting guide asks for the same).
export const dynamic = "force-dynamic";

// Seconds. The reset is one transaction and a bucket listing; 60 leaves room
// on a cold start and is well inside the Hobby limit of 300 with fluid
// compute (https://vercel.com/docs/functions/configuring-functions/duration).
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const auth = cronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET);
  if (auth === "no-secret") return new Response("Not Found", { status: 404 });
  if (auth === "unauthorized") return new Response("Unauthorized", { status: 401 });

  const service = getServiceSupabase();
  if (!service) {
    console.error("reset: SUPABASE_SECRET_KEY is not set");
    return Response.json({ ok: false }, { status: 503, headers: NO_STORE });
  }

  const anchor = await service.rpc("demo_anchor");
  if (anchor.error) {
    console.error("demo_anchor:", anchor.error.message);
    return Response.json({ ok: false }, { status: 503, headers: NO_STORE });
  }
  const reset = await service.rpc("reset_demo", { p_anchor: anchor.data });
  if (reset.error) {
    console.error("reset_demo:", reset.error.message);
    return Response.json({ ok: false }, { status: 503, headers: NO_STORE });
  }

  // The sample uses borrowed frames only, so after the reset no row shows an
  // upload and every object under `up/` is one nobody links to.
  let photosRemoved: number | null;
  try {
    photosRemoved = await purgeUploadedPhotos();
  } catch (e) {
    console.error("reset: uploaded photos left in the bucket:", e instanceof Error ? e.message : e);
    photosRemoved = null;
  }

  // Every page reads something the reset rebuilt. From a Route Handler this
  // marks them stale for their next visit (`03-api-reference/04-functions/revalidatePath.md`).
  revalidatePath("/", "layout");

  return Response.json(
    // PostgREST writes a timestamptz in the database's zone (UTC); the app
    // writes every instant as Vietnamese wall-clock time.
    { ok: true, anchor: toVnIso(new Date(anchor.data)), photosRemoved },
    { headers: NO_STORE },
  );
}
