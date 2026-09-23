import type { NextRequest } from "next/server";
import { provincesByName, wardsInByName } from "@/data/regions";

/**
 * The commune list for one province.
 *
 * It is a route handler and not a plain import because `data/wards.json` is
 * 218KB of the 3,321 communes. Importing it into the checkout form would put
 * every one of them into the client bundle so that one dropdown can show at
 * most 168. Here it stays on the server and the form asks for the province
 * it needs.
 *
 * This is not the deferred backend — there are no orders, no accounts and no
 * payments behind it. It serves data the app already ships with, in the
 * shape the real address service will have to serve it in.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("province") ?? "";

  // Check the code against the list rather than trusting it into a lookup:
  // the query string is input, and an unknown key should be a 404, not an
  // empty array that the form would render as "this province has no wards".
  const known = provincesByName().some((p) => p.code === code);
  if (!known) {
    return Response.json(
      { error: { code: "UNKNOWN_PROVINCE", message: "Không có tỉnh/thành này." } },
      { status: 404 },
    );
  }

  return Response.json(
    { wards: wardsInByName(code) },
    // The administrative map changed once in 2025 and will change again, but
    // not between two page loads. A long cache with a revalidation window is
    // right for a list that is effectively static.
    { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
