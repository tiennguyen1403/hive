import type { NextRequest } from "next/server";
import { getSupabase } from "@/lib/db/server";

/**
 * Is the database awake?
 *
 * A Supabase Free project is paused after a week without traffic, and the
 * platform counts "a few user requests to the database each day" as enough to
 * keep it. So this route does a real (tiny) query rather than returning a
 * constant: a 200 that never touched Postgres would keep the monitor happy
 * while the project went to sleep underneath it. Slice B4 points a daily
 * Vercel Cron at it; `vercel.json` belongs to that slice.
 *
 * `head: true` with `count: "exact"` asks PostgREST for the row count and no
 * rows, which is the cheapest thing that still proves the connection and the
 * read policy both work.
 */
export async function GET(request: NextRequest) {
  // Vercel sends the project's `CRON_SECRET` as an `Authorization` header when
  // it invokes a cron job, and the endpoint compares the two
  // (https://vercel.com/docs/cron-jobs/manage-cron-jobs, "Securing cron jobs").
  // Vercel's own sample also rejects when the variable is unset; here an unset
  // secret means "no cron is configured", which is the case on a developer
  // machine, so the route stays callable. The moment the variable exists —
  // which is the moment the route is reachable from the internet — the header
  // is required.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const supabase = await getSupabase();
  const { count, error } = await supabase
    .from("drops")
    .select("no", { count: "exact", head: true });

  // The caller learns that the database is unreachable, not why: an error
  // string from Postgres names schemas, roles and constraints, and this
  // endpoint is public.
  if (error) {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  return Response.json(
    { ok: true, drops: count },
    // A cached health check answers for the shape the cache was in, not for
    // the shape the database is in now.
    { headers: { "Cache-Control": "no-store" } },
  );
}
