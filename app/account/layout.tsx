import { AccountLayout } from "@/components/account/AccountLayout";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { listAddresses } from "@/lib/db/addresses";
import { listMyOrders } from "@/lib/db/orders";
import { loadMe } from "@/lib/db/profiles";

/**
 * The frame every account screen sits in, assembled once.
 *
 * Until slice B1 each screen wrapped itself in `<ShopFrame><AccountGuard>`,
 * and the guard was a Client Component that read `localStorage`, waited a
 * paint and then bounced. The session is a cookie now, so the question is
 * answered here, before any HTML is produced — and the layout is where the
 * answer belongs, because the rail is the same on all ten screens.
 *
 * It does NOT redirect. `/account/wishlist` is deliberately readable signed
 * out — saving a style is not a reason to demand an account — so a null `me`
 * is a legitimate state that renders the plain column. The nine screens that
 * do need a session ask `requireMe()` for themselves, which is also the rule
 * the Next guide gives: check as close to the data as possible
 * (`02-guides/authentication.md`, "Creating a Data Access Layer").
 */
export default async function AccountAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await loadMe();
  // The rail counts both, and its unread dot reads the orders too. One query
  // each for the layout; `React.cache` hands the same rows to the page below
  // (`/account/addresses`, `/account/orders`, …) without a second round trip.
  const [addresses, orders] = me
    ? await Promise.all([listAddresses(), listMyOrders()])
    : [[], []];

  return (
    <ShopFrame>
      <AccountLayout me={me} {...(me ? { addressCount: addresses.length, orders } : {})}>
        {children}
      </AccountLayout>
    </ShopFrame>
  );
}
