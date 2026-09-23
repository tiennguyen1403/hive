import type { Metadata } from "next";
import { TrackScreen } from "@/components/shop/TrackScreen";
import { formatAddressLine } from "@/data/regions";
import { loadCatalog } from "@/lib/db/catalog";
import { trackOrder } from "@/lib/db/orders";
import { trackedOfOrder } from "@/lib/lookup";

export const metadata: Metadata = {
  title: "Tra cứu đơn",
  // Somebody's order behind a code and a phone number. Nothing here belongs
  // in a search index.
  robots: { index: false, follow: false },
};

/** `?code=DH-2425` — one value, however the query happens to be written. */
function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * Looking an order up without signing in.
 *
 * The lookup runs HERE, on the pair in the URL, and since slice B2 it runs in
 * the database: `track_order()` returns the order only when the phone number
 * on it matches, and the same null for a wrong code, a wrong number or a code
 * that does not exist (QĐ-16 with the number standing in for the session).
 * Every order is found this way, whoever placed it and wherever — there is no
 * browser-only half any more.
 *
 * Turning the ward and province codes into "Phường Bến Nghé, TP. Hồ Chí
 * Minh" needs `data/regions.ts`, which carries 3.321 communes and stays on the
 * server, so the screen is handed one finished object.
 *
 * `await props.searchParams` is not optional in Next 16 — it is a promise
 * now, and reading it synchronously is gone.
 */
export default async function TrackPage(props: PageProps<"/track">) {
  const sp = await props.searchParams;
  const code = first(sp.code);
  const phone = first(sp.phone);

  const [catalog, order] = await Promise.all([loadCatalog(), trackOrder(code, phone)]);
  const found = order ? trackedOfOrder(catalog, order, formatAddressLine(order.shipTo)) : null;

  return <TrackScreen code={code} phone={phone} found={found} />;
}
