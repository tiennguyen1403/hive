import type { Metadata } from "next";
import { AccountHome, type LiveCode } from "@/components/account/AccountHome";
import { loadCatalog } from "@/lib/db/catalog";
import { listMyOrders } from "@/lib/db/orders";
import { requireMe } from "@/lib/db/profiles";
import { clockLabel, dayMonth, openingLabel } from "@/lib/datetime";
import { dropBandLabel, dropCalendar, featuredDrop } from "@/lib/drop";
import { issueLabel } from "@/lib/lexicon";
import {
  livePromotions,
  promoOfferLabel,
  promoTermsLabel,
  promoWindowLabel,
} from "@/lib/promotions";
import { demoNow } from "@/lib/clock";

export const metadata: Metadata = {
  title: "Tổng quan",
  // An account page is personal and is rendered behind a server-side
  // session check. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

/**
 * Everything that depends on the calendar is decided HERE and handed down
 * as plain strings — which codes are running, when they expire, when the
 * next issue opens. All are read off the clock, and a clock read twice
 * (once on the server, once on the client) is two different answers and a
 * hydration mismatch. The codes arrive as finished strings rather than as
 * `Promotion` rows the screen would have to re-judge against the clock.
 */
export default async function AccountPage() {
  // The session check, on the server and before anything is rendered. A
  // visitor with no session lands on the sign-in form with this page in
  // `?next=`, rather than on a screen that flashes and then bounces.
  const me = await requireMe("/account");
  const now = demoNow();
  // The account's own orders, filtered by row level security; the layout
  // asked for the same rows for the rail, so this is `React.cache`'s answer.
  const [catalog, orders] = await Promise.all([loadCatalog(), listMyOrders()]);
  const { drop, state } = featuredDrop(catalog, undefined, now);

  const live = livePromotions(catalog, now);
  const codes: LiveCode[] = live.map((p) => ({
    code: String(p.code),
    offer: promoOfferLabel(p),
    terms: promoTermsLabel(p),
  }));

  // The last of them to expire, and — only when every one of them ends
  // inside the same issue's window — which issue that is. Nothing on a
  // promotion records an issue, so this is derived or left off.
  const lastEnd = live.reduce<string | undefined>(
    (best, p) => (!best || Date.parse(p.endsAt) > Date.parse(best) ? p.endsAt : best),
    undefined,
  );
  const issues = new Set(
    live.map((p) => {
      const t = Date.parse(p.endsAt);
      return catalog.drops.find(
        (d) => t > Date.parse(d.opensAt) && t <= Date.parse(d.closesAt),
      )?.no;
    }),
  );
  const codesIssueNo =
    issues.size === 1 ? [...issues][0] : undefined;

  const next = dropCalendar(catalog, now).upcoming;

  return (
    <AccountHome
      me={me}
      orders={orders}
      drop={drop}
      dropState={state}
      dropLabel={dropBandLabel(drop, state, now)}
      codes={codes}
      codesWindow={promoWindowLabel(live)}
      {...(codesIssueNo !== undefined ? { codesIssueNo } : {})}
      {...(lastEnd ? { codesEndLabel: `${clockLabel(lastEnd)} · ${dayMonth(lastEnd)}` } : {})}
      {...(next
        ? {
            nextDropNo: next.no,
            nextDropLine: `${issueLabel(next.no)} mở ${openingLabel(next.opensAt)}`,
          }
        : {})}
    />
  );
}
