import "server-only";

import Stripe from "stripe";
import { isTestKey } from "./card-checkout";

/**
 * The Stripe client, for the server alone (slice B18, QĐ-42, QĐ-46).
 *
 * `import "server-only"`: a Client Component importing this module fails the
 * build, so the secret key cannot reach a bundle. The key is read from the
 * environment at call time — `STRIPE_SECRET_KEY`, which Vercel's Stripe
 * integration puts in the project and `.env.local` holds on a developer
 * machine — and never logged. Its publishable twin, the `NEXT_PUBLIC_…` key
 * the same integration adds, is not read anywhere and not named in any source
 * file: Next inlines a `NEXT_PUBLIC_` variable into the browser's JavaScript
 * wherever it is referenced (`node_modules/next/dist/docs/01-app/02-guides/
 * environment-variables.md`, "Bundling Environment Variables for the
 * Browser"), and the browser has no use for it — it only navigates to Stripe.
 *
 * TEST MODE ONLY. A key that is not `sk_test_…` is refused here, before any
 * request: card payment is then off (null), the order is still placed and
 * kept, and its page says no payment page could be opened. The reason goes to
 * the server log once per process.
 *
 * Created lazily, as the SDK's README advises for a key that may be missing at
 * build time, and reused. Configured
 * (`node_modules/stripe/README.md`, "Initialize with config object"):
 *   · `timeout` 10 s instead of 80: a page that asks Stripe while it is drawn
 *     must not hang for over a minute when Stripe does not answer;
 *   · `maxNetworkRetries: 1`, the SDK's default, said out loud — a retried
 *     create carries an idempotency key the SDK adds itself;
 *   · `telemetry: false`: the SDK would otherwise send the latency of earlier
 *     requests along with later ones. It goes to Stripe only, but this demo
 *     sends nobody anything it does not have to.
 */

let client: Stripe | null = null;
let refusalLogged = false;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!isTestKey(key)) {
    if (!refusalLogged) {
      refusalLogged = true;
      console.error("stripe: STRIPE_SECRET_KEY is missing or not a test key (sk_test_…) — card payment is off");
    }
    return null;
  }
  client ??= new Stripe(key, { timeout: 10_000, maxNetworkRetries: 1, telemetry: false });
  return client;
}
