import { describe, expect, it } from "vitest";
import { ROUTES } from "./sweep/manifest.mjs";
import { addedFile, analyze, globalZones, memoryTree, parseDiff } from "./impact.mjs";

/**
 * `tools/impact.mjs` on small invented trees: each case is a diff, the files before and after it, and what the
 * change must reach. The trees use the manifest's real page paths, so a route comes out by its real name.
 */

const SHOP = ROUTES.filter((r) => r.zone === "shop").map((r) => r.path);
const ADMIN = ROUTES.filter((r) => r.zone === "admin").map((r) => r.path);

/** A unified diff of one modified file, from its hunks. */
function diffOf(file: string, hunks: string): string {
  return `diff --git a/${file} b/${file}\nindex 1111111..2222222 100644\n--- a/${file}\n+++ b/${file}\n${hunks}`;
}

/** `analyze` over a tree before and after, with the given diff. */
function run(before: Record<string, string>, after: Record<string, string>, diff: string) {
  return analyze({ head: memoryTree(after), base: memoryTree(before), changes: parseDiff(diff) });
}

// A shop with three pages: the bag, the checkout, an order. The order shows both prices.
const MONEY = [
  "export function formatA(n: number): string {", // 1
  "  return `${helper(n)}a`;", // 2
  "}", // 3
  "", // 4
  "export function formatB(n: number): string {", // 5
  "  return `${n}b`;", // 6
  "}", // 7
  "", // 8
  "function helper(n: number): number {", // 9
  "  return n * 2;", // 10
  "}", // 11
  "",
].join("\n");

const SHOP_TREE: Record<string, string> = {
  "lib/money.ts": MONEY,
  "components/feed/cart/CartView.tsx": [
    'import { formatA } from "@/lib/money";',
    "",
    "export function CartView() {",
    '  return <p className="cart-total">{formatA(1)}</p>;',
    "}",
    "",
  ].join("\n"),
  "components/feed/checkout/CheckoutView.tsx": [
    'import { formatB } from "@/lib/money";',
    'import { t } from "@/lib/words";',
    "",
    "export function CheckoutView() {",
    "  return (",
    "    <button className=\"co-place\">",
    '      {t({ vi: "Đặt hàng", en: "Place order" })} {formatB(2)}',
    "    </button>",
    "  );",
    "}",
    "",
  ].join("\n"),
  "components/feed/account/OrderView.tsx": [
    'import { formatA, formatB } from "@/lib/money";',
    "",
    "export function OrderView() {",
    '  return <div className="od">{formatA(1)} {formatB(2)}</div>;',
    "}",
    "",
  ].join("\n"),
  "lib/words.ts": "export function t(p: { vi: string; en: string }): string {\n  return p.vi;\n}\n",
  "app/cart/page.tsx": 'import { CartView } from "@/components/feed/cart/CartView";\n\nexport default function Page() {\n  return <CartView />;\n}\n',
  "app/checkout/page.tsx": 'import { CheckoutView } from "@/components/feed/checkout/CheckoutView";\n\nexport default function Page() {\n  return <CheckoutView />;\n}\n',
  "app/account/orders/[code]/page.tsx": 'import { OrderView } from "@/components/feed/account/OrderView";\n\nexport default function Page() {\n  return <OrderView />;\n}\n',
};

const ORDER_PAGES = ["/account/orders/DH-2430", "/account/orders/DH-2310", "/account/orders/DH-2310/tracking"];

describe("impact: a Feed stylesheet", () => {
  const before = { ...SHOP_TREE, "app/styles/feed/account.css": '[data-ui="feed"] .cart-total { font-size: 15px; }\n' };
  const after = {
    ...SHOP_TREE,
    "app/styles/feed/account.css": [
      '[data-ui="feed"] .cart-total { font-size: 15px; }',
      "",
      "/* the order page in one column between 900 and 1199px */",
      "@media (min-width: 900px) and (max-width: 1199.98px) {",
      '  [data-ui="feed"] .od { grid-template-columns: minmax(0, 1fr); }',
      "}",
      "",
    ].join("\n"),
  };
  const diff = diffOf(
    "app/styles/feed/account.css",
    [
      "@@ -1,0 +2,5 @@",
      "+",
      "+/* the order page in one column between 900 and 1199px */",
      "+@media (min-width: 900px) and (max-width: 1199.98px) {",
      '+  [data-ui="feed"] .od { grid-template-columns: minmax(0, 1fr); }',
      "+}",
      "",
    ].join("\n"),
  );

  it("reaches the routes that draw the rule's class, at the band's edges and a point below it", () => {
    const r = run(before, after, diff);
    expect(r.routes).toEqual(Object.fromEntries(ORDER_PAGES.map((p) => [p, [899, 900, 1199]])));
    expect(r.routes["/cart"]).toBeUndefined();
    expect(r.langs).toEqual(["vi", "en"]);
    expect(r.build).toBe(true);
    expect(r.db).toBe(false);
  });

  it("always lists the control pages, at their own widths", () => {
    const r = run(before, after, diff);
    expect(r.controls).toEqual({
      "/": [390, 1280],
      "/products/s05-khoi": [390, 1280],
      "/cart": [390, 1280],
      "/checkout": [390, 1280],
      "/account/orders/DH-2430": [390, 1280],
      "/admin": [1280],
      "/admin/orders": [1280],
    });
  });

  it("reads a rule limited to English as English only", () => {
    const en = {
      ...SHOP_TREE,
      "app/styles/feed/account.css": '[data-ui="feed"] .cart-total { font-size: 15px; }\n[data-ui="feed"]:lang(en) .cart-total { letter-spacing: 0; }\n',
    };
    const r = run(before, en, diffOf("app/styles/feed/account.css", '@@ -1,0 +2 @@\n+[data-ui="feed"]:lang(en) .cart-total { letter-spacing: 0; }\n'));
    expect(r.langs).toEqual(["en"]);
    expect(r.routes).toEqual({ "/cart": [390, 1280] });
  });

  it("takes a selector without a class, or a class no file names, as the whole shop", () => {
    const loose = { ...SHOP_TREE, "app/styles/feed/account.css": '[data-ui="feed"] .cart-total { font-size: 15px; }\n[data-ui="feed"] a { color: inherit; }\n[data-ui="feed"] .nobody-uses-this { gap: 0; }\n' };
    const r = run(
      before,
      loose,
      diffOf("app/styles/feed/account.css", '@@ -1,0 +2,2 @@\n+[data-ui="feed"] a { color: inherit; }\n+[data-ui="feed"] .nobody-uses-this { gap: 0; }\n'),
    );
    expect(Object.keys(r.routes).sort()).toEqual([...SHOP].sort());
    expect(Object.keys(r.routes).some((p) => p.startsWith("/admin"))).toBe(false);
  });

  it("does nothing for a change in comments alone", () => {
    const commented = { ...SHOP_TREE, "app/styles/feed/account.css": '/* the bag */\n[data-ui="feed"] .cart-total { font-size: 15px; }\n' };
    const r = run(before, commented, diffOf("app/styles/feed/account.css", "@@ -0,0 +1 @@\n+/* the bag */\n"));
    expect(r.routes).toEqual({});
    expect(r.langs).toEqual([]);
    expect(r.reasons).toContain("app/styles/feed/account.css: comments only");
  });
});

describe("impact: a lib file with several importers", () => {
  it("follows only the importers of the export that changed", () => {
    const after = { ...SHOP_TREE, "lib/money.ts": MONEY.replace("return `${n}b`;", "return `${n} b`;") };
    const r = run(SHOP_TREE, after, diffOf("lib/money.ts", "@@ -6 +6 @@\n-  return `${n}b`;\n+  return `${n} b`;\n"));
    // formatB: the checkout and the order show it, the bag does not.
    expect(Object.keys(r.routes).sort()).toEqual(["/checkout", ...ORDER_PAGES].sort());
    expect(r.routes["/checkout"]).toEqual([390, 1280]);
  });

  it("follows a private helper to every export that uses it", () => {
    const after = { ...SHOP_TREE, "lib/money.ts": MONEY.replace("return n * 2;", "return n * 3;") };
    const r = run(SHOP_TREE, after, diffOf("lib/money.ts", "@@ -10 +10 @@\n-  return n * 2;\n+  return n * 3;\n"));
    // helper → formatA: the bag and the order, not the checkout.
    expect(Object.keys(r.routes).sort()).toEqual(["/cart", ...ORDER_PAGES].sort());
  });

  it("marks only the binding a changed import line adds", () => {
    const view = SHOP_TREE["components/feed/cart/CartView.tsx"];
    const after = { ...SHOP_TREE, "components/feed/cart/CartView.tsx": view.replace("import { formatA }", "import { formatA, formatB }") };
    const r = run(
      SHOP_TREE,
      after,
      diffOf(
        "components/feed/cart/CartView.tsx",
        '@@ -1 +1 @@\n-import { formatA } from "@/lib/money";\n+import { formatA, formatB } from "@/lib/money";\n',
      ),
    );
    // formatB is imported and not yet used: nothing CartView draws changed.
    expect(r.routes).toEqual({});
  });
});

describe("impact: a global file", () => {
  const chrome = 'export function FeedChrome() {\n  return <nav className="bar">HIVE</nav>;\n}\n';

  it("reaches the whole shop for the Feed's chrome", () => {
    const before = { ...SHOP_TREE, "components/feed/FeedChrome.tsx": chrome };
    const after = { ...SHOP_TREE, "components/feed/FeedChrome.tsx": chrome.replace('"bar"', '"bar slim"') };
    const r = run(
      before,
      after,
      diffOf("components/feed/FeedChrome.tsx", '@@ -2 +2 @@\n-  return <nav className="bar">HIVE</nav>;\n+  return <nav className="bar slim">HIVE</nav>;\n'),
    );
    expect(Object.keys(r.routes).sort()).toEqual([...SHOP].sort());
    expect(Object.values(r.routes).every((w) => JSON.stringify(w) === "[390,1280]")).toBe(true);
    expect(r.overlays).toEqual({ "account-addresses-add-province": [390, 1280] });
  });

  it("reaches both zones for the language module, the back office at 1280 and 1440", () => {
    const i18n = 'export type Locale = "vi" | "en";\nexport const DEFAULT_LOCALE = "vi";\n';
    const r = run(
      { "lib/i18n.ts": i18n },
      { "lib/i18n.ts": i18n.replace('"vi";', '"vi" as const;') },
      diffOf("lib/i18n.ts", '@@ -2 +2 @@\n-export const DEFAULT_LOCALE = "vi";\n+export const DEFAULT_LOCALE = "vi" as const;\n'),
    );
    expect(Object.keys(r.routes).sort()).toEqual([...SHOP, ...ADMIN].sort());
    expect(r.routes["/admin/orders"]).toEqual([1280, 1440]);
    expect(r.widths).toEqual({ shop: [390, 1280], admin: [1280, 1440] });
  });

  it("names the brief's global files", () => {
    for (const f of ["lib/lexicon.ts", "lib/i18n.ts", "lib/locale.ts", "components/i18n/LocaleContext.tsx", "app/globals.css", "app/layout.tsx"]) {
      expect(globalZones(f)).toEqual(["shop", "admin"]);
    }
    expect(globalZones("components/feed/FeedChrome.tsx")).toEqual(["shop"]);
    expect(globalZones("components/feed/FeedFrame.tsx")).toEqual(["shop"]);
    for (const f of ["components/admin-arc/ArcAdminFrame.tsx", "components/admin-arc/ArcSidebar.tsx", "components/admin-arc/ArcPage.module.css"]) {
      expect(globalZones(f)).toEqual(["admin"]);
    }
    expect(globalZones("lib/money.ts")).toBeNull();
  });
});

describe("impact: a migration", () => {
  it("asks for the database tests and no build, and reaches no route", () => {
    const sql = "alter table public.orders add column note text;\n";
    const r = analyze({
      head: memoryTree({ ...SHOP_TREE, "supabase/migrations/20261008000000_order_note.sql": sql }),
      base: memoryTree(SHOP_TREE),
      changes: [addedFile("supabase/migrations/20261008000000_order_note.sql", sql)],
    });
    expect(r.db).toBe(true);
    expect(r.build).toBe(false);
    expect(r.routes).toEqual({});
    expect(r.langs).toEqual([]);
    expect(r.reasons).toEqual(["supabase/migrations/20261008000000_order_note.sql: the database (test:db)"]);
  });

  it("reads a change to the npm scripts alone as nothing to build or shoot", () => {
    const pkg = (scripts: Record<string, string>, deps: Record<string, string>) => JSON.stringify({ name: "hive", scripts, dependencies: deps }, null, 2);
    const before = { "package.json": pkg({ test: "vitest run" }, { next: "16.3.5" }) };
    const scripts = run(before, { "package.json": pkg({ test: "vitest run", impact: "node tools/impact.mjs" }, { next: "16.3.5" }) }, diffOf("package.json", '@@ -4,0 +5 @@\n+    "impact": "node tools/impact.mjs",\n'));
    expect([scripts.build, Object.keys(scripts.routes).length, scripts.reasons]).toEqual([false, 0, ["package.json: npm scripts only"]]);
    const deps = run(before, { "package.json": pkg({ test: "vitest run" }, { next: "16.4.0" }) }, diffOf("package.json", '@@ -7 +7 @@\n-    "next": "16.3.5"\n+    "next": "16.4.0"\n'));
    expect(deps.build).toBe(true);
    expect(Object.keys(deps.routes).length).toBe(ROUTES.length);
  });

  it("asks for both when lib/db changes", () => {
    const q = "export function readOrders(): string {\n  return \"select 1\";\n}\n";
    const r = run({ "lib/db/orders.ts": q }, { "lib/db/orders.ts": q.replace("1", "2") }, diffOf("lib/db/orders.ts", '@@ -2 +2 @@\n-  return "select 1";\n+  return "select 2";\n'));
    expect(r.db).toBe(true);
    expect(r.build).toBe(true);
  });
});

describe("impact: a copy string", () => {
  const view = SHOP_TREE["components/feed/checkout/CheckoutView.tsx"];

  it("counts a changed English side as English only", () => {
    const after = { ...SHOP_TREE, "components/feed/checkout/CheckoutView.tsx": view.replace('en: "Place order"', 'en: "Place the order"') };
    const r = run(
      SHOP_TREE,
      after,
      diffOf(
        "components/feed/checkout/CheckoutView.tsx",
        '@@ -7 +7 @@\n-      {t({ vi: "Đặt hàng", en: "Place order" })} {formatB(2)}\n+      {t({ vi: "Đặt hàng", en: "Place the order" })} {formatB(2)}\n',
      ),
    );
    expect(r.langs).toEqual(["en"]);
    expect(r.routes).toEqual({ "/checkout": [390, 1280] });
  });

  it("counts a changed Vietnamese side as Vietnamese only, and code as both", () => {
    const vi = { ...SHOP_TREE, "components/feed/checkout/CheckoutView.tsx": view.replace('vi: "Đặt hàng"', 'vi: "Đặt đơn"') };
    const r1 = run(
      SHOP_TREE,
      vi,
      diffOf(
        "components/feed/checkout/CheckoutView.tsx",
        '@@ -7 +7 @@\n-      {t({ vi: "Đặt hàng", en: "Place order" })} {formatB(2)}\n+      {t({ vi: "Đặt đơn", en: "Place order" })} {formatB(2)}\n',
      ),
    );
    expect(r1.langs).toEqual(["vi"]);
    const code = { ...SHOP_TREE, "components/feed/checkout/CheckoutView.tsx": view.replace("{formatB(2)}", "{formatB(3)}") };
    const r2 = run(
      SHOP_TREE,
      code,
      diffOf(
        "components/feed/checkout/CheckoutView.tsx",
        '@@ -7 +7 @@\n-      {t({ vi: "Đặt hàng", en: "Place order" })} {formatB(2)}\n+      {t({ vi: "Đặt hàng", en: "Place order" })} {formatB(3)}\n',
      ),
    );
    expect(r2.langs).toEqual(["vi", "en"]);
  });

  it("reads a `*_EN` constant as English", () => {
    const words = 'const NOTE_EN = "Central HCMC only, during office hours";\n\nexport function note(): string {\n  return NOTE_EN;\n}\n';
    const tree = { ...SHOP_TREE, "lib/words.ts": words, "components/feed/cart/CartView.tsx": 'import { note } from "@/lib/words";\n\nexport function CartView() {\n  return <p>{note()}</p>;\n}\n' };
    const after = { ...tree, "lib/words.ts": words.replace("during office hours", "office hours") };
    const r = run(tree, after, diffOf("lib/words.ts", '@@ -1 +1 @@\n-const NOTE_EN = "Central HCMC only, during office hours";\n+const NOTE_EN = "Central HCMC only, office hours";\n'));
    expect(r.langs).toEqual(["en"]);
    expect(r.routes).toEqual({ "/cart": [390, 1280] });
  });
});

describe("impact: layers and actions", () => {
  it("stops at a file only a layer draws: the layer, not the page under it", () => {
    const form = 'export function ArcAddressForm() {\n  return <form>{"Chọn tỉnh trước"}</form>;\n}\n';
    const screen = 'import { ArcAddressForm } from "./ArcAddressForm";\n\nexport function ArcOrderScreen() {\n  return <ArcAddressForm />;\n}\n';
    const page = 'import { ArcOrderScreen } from "@/components/admin-arc/ArcOrderScreen";\n\nexport default function Page() {\n  return <ArcOrderScreen />;\n}\n';
    const tree = { "components/admin-arc/ArcAddressForm.tsx": form, "components/admin-arc/ArcOrderScreen.tsx": screen, "app/admin/orders/[code]/page.tsx": page };
    const after = { ...tree, "components/admin-arc/ArcAddressForm.tsx": form.replace("Chọn tỉnh trước", "Tỉnh trước") };
    const r = run(tree, after, diffOf("components/admin-arc/ArcAddressForm.tsx", '@@ -2 +2 @@\n-  return <form>{"Chọn tỉnh trước"}</form>;\n+  return <form>{"Tỉnh trước"}</form>;\n'));
    expect(r.routes).toEqual({});
    expect(r.overlays).toEqual({
      "admin-order-address-form": [1280, 1440],
      "admin-order-address-province": [1280, 1440],
      "admin-order-address-ward": [1280, 1440],
    });
  });

  it("puts a Server Action under actions, with the routes whose forms call it, not under routes", () => {
    const tree = {
      ...SHOP_TREE,
      "lib/actions/orders.ts": '"use server";\n\nimport { formatB } from "@/lib/money";\n\nexport async function placeOrderAction(): Promise<string> {\n  return formatB(1);\n}\n',
      "components/feed/checkout/CheckoutView.tsx": 'import { placeOrderAction } from "@/lib/actions/orders";\n\nexport function CheckoutView() {\n  return <form action={placeOrderAction} />;\n}\n',
      "components/feed/account/OrderView.tsx": 'export function OrderView() {\n  return <div className="od" />;\n}\n',
    };
    const after = { ...tree, "lib/money.ts": MONEY.replace("return `${n}b`;", "return `${n} b`;") };
    const r = run(tree, after, diffOf("lib/money.ts", "@@ -6 +6 @@\n-  return `${n}b`;\n+  return `${n} b`;\n"));
    expect(r.routes).toEqual({});
    expect(r.actions).toEqual({ "lib/actions/orders.ts": { exports: ["placeOrderAction"], routes: ["/checkout"] } });
  });

  it("lists a changed file that reaches no route of the manifest", () => {
    const tree = { "app/api/health/route.ts": "export function GET(): Response {\n  return new Response(\"ok\");\n}\n" };
    const after = { "app/api/health/route.ts": tree["app/api/health/route.ts"].replace('"ok"', '"fine"') };
    const r = run(tree, after, diffOf("app/api/health/route.ts", '@@ -2 +2 @@\n-  return new Response("ok");\n+  return new Response("fine");\n'));
    expect(r.routes).toEqual({});
    expect(r.unmapped).toEqual([{ file: "app/api/health/route.ts", why: "not a page (a route handler or a generated image)" }]);
  });
});

describe("parseDiff", () => {
  it("numbers removed lines from the old file and added lines from the new one", () => {
    const [c] = parseDiff(diffOf("a.ts", "@@ -3,2 +3 @@\n-one\n-two\n+three\n@@ -9,0 +10,2 @@\n+four\n+five\n"));
    expect(c.file).toBe("a.ts");
    expect(c.hunks).toEqual([
      { removed: [{ line: 3, text: "one" }, { line: 4, text: "two" }], added: [{ line: 3, text: "three" }] },
      { removed: [], added: [{ line: 10, text: "four" }, { line: 11, text: "five" }] },
    ]);
  });

  it("knows a new, a deleted and a binary file", () => {
    const text = [
      "diff --git a/n.ts b/n.ts",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/n.ts",
      "@@ -0,0 +1 @@",
      "+x",
      "diff --git a/d.ts b/d.ts",
      "deleted file mode 100644",
      "--- a/d.ts",
      "+++ /dev/null",
      "@@ -1 +0,0 @@",
      "-y",
      "diff --git a/p.png b/p.png",
      "Binary files a/p.png and b/p.png differ",
      "",
    ].join("\n");
    const [n, d, p] = parseDiff(text);
    expect([n.status, d.status, p.binary]).toEqual(["added", "deleted", true]);
    expect(n.hunks[0].added).toEqual([{ line: 1, text: "x" }]);
    expect(d.hunks[0].removed).toEqual([{ line: 1, text: "y" }]);
  });
});
