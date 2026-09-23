import type { Metadata } from "next";
import { TrackScreen } from "@/components/shop/TrackScreen";
import { formatAddressLine } from "@/data/regions";
import { loadCatalog } from "@/lib/db/catalog";
import { findFixtureOrder, trackedOfOrder } from "@/lib/lookup";

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
 * The lookup runs HERE, on the pair in the URL, for one reason that cannot
 * be worked around in the browser: turning an order's ward and province
 * codes into "Phường Bến Nghé, TP. Hồ Chí Minh" needs `data/regions.ts`,
 * which carries 3.321 communes and stays on the server. So the server
 * resolves what the fixtures know and hands the screen one finished object;
 * the screen adds the one thing the server cannot see, an order placed in
 * that browser.
 *
 * `await props.searchParams` is not optional in Next 16 — it is a promise
 * now, and reading it synchronously is gone.
 */
export default async function TrackPage(props: PageProps<"/track">) {
  const sp = await props.searchParams;
  const code = first(sp.code);
  const phone = first(sp.phone);

  const catalog = await loadCatalog();
  const order = findFixtureOrder(code, phone) ?? null;
  const addressLine = order ? formatAddressLine(order.shipTo) : "";
  const found = order ? trackedOfOrder(catalog, order, addressLine) : null;

  return (
    <TrackScreen
      code={code}
      phone={phone}
      found={found}
      base={order}
      addressLine={addressLine}
    />
  );
}
