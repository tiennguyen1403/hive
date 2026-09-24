import { describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

// `proxy.ts` reads the Supabase settings through a `server-only` module; the
// matcher under test is a constant and needs neither.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/server", () => ({ supabaseEnv: () => ({ url: "", publishableKey: "" }) }));

import { config } from "@/proxy";

/**
 * Which paths `proxy.ts` runs on — asked of Next's own matcher code, the one
 * the build compiles `config.matcher` with, through the helper the proxy
 * reference documents for this ("Unit testing (experimental)",
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
 * The page calls it `unstable_doesProxyMatch`; Next 16.3.5 still exports it
 * as `unstable_doesMiddlewareMatch`.
 *
 * The proxy refreshes the Supabase session, so it has to run on everything a
 * person navigates to and on every Server Action's POST — and on nothing a
 * machine fetches with no session to refresh. Slice B5 took the metadata
 * routes out.
 */
const runs = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("proxy.ts matcher", () => {
  it("leaves out the metadata routes (slice B5)", () => {
    for (const url of [
      "/opengraph-image",
      "/opengraph-image?5a1c0f3e2b9d7c11",
      "/twitter-image",
      "/twitter-image?5a1c0f3e2b9d7c11",
      "/manifest.webmanifest",
      "/icon",
      "/icon?5a1c0f3e2b9d7c11",
      "/apple-icon",
      "/apple-icon.png",
      "/favicon.ico",
    ]) {
      expect(runs(url), url).toBe(false);
    }
  });

  it("still leaves out static files, optimised images, the commune list and image files", () => {
    for (const url of [
      "/_next/static/chunks/main.js",
      "/_next/image?url=%2Fphotos%2Fup%2Fa.webp&w=640&q=75",
      "/api/wards?province=29",
      "/brand/mark.svg",
    ]) {
      expect(runs(url), url).toBe(false);
    }
  });

  it("still runs on every page a person navigates to, the old addresses included", () => {
    for (const url of [
      "/",
      "/about",
      "/products",
      "/products/s05-khoi",
      "/products/khoi",
      "/products/ao-thun-tron",
      "/so/4",
      "/cart",
      "/checkout",
      "/account/orders",
      "/admin/products/p-ao-thun-tron",
      "/sign-in",
      "/api/health",
    ]) {
      expect(runs(url), url).toBe(true);
    }
  });
});
