/**
 * The sweep's routes: the one list (round v6, tooling slice T1).
 *
 * Every page the layout sweep walks, every layer it opens, and the files that
 * draw them. Three readers:
 *
 *   - `gen.mjs` turns a selection of it into a `playwright cli run-code`
 *     script. `--zone=all` is the full sweep, the one `tools/layout-sweep.js`
 *     was until this slice; that file is now generated from here too
 *     (`npm run sweep:gen -- --legacy`), and a test keeps the two equal.
 *   - `diff.mjs` names what a partial run left out.
 *   - `../impact.mjs` maps a changed file to the routes and layers it draws.
 *
 * A route:
 *
 *   name        the sweep's own name for it, without the width: `/` is "home",
 *               every other path has `/ ? =` turned into `-`
 *               (`account-orders-DH-2430`); the shot is `<name>-<width>.png`
 *   path        what the browser opens, query included
 *   zone        "shop" (the Feed) or "admin" (Arc)
 *   widths      the full sweep's widths: 390 and 1280 for the shop; 1280 for
 *               the back office, which is desktop-only by design
 *               (`ArcAdminFrame.module.css`, `min-width: 1180px`)
 *   tags        groups to pick by (`--tag=lookup`)
 *   components  the files Next renders for the path: the page first, then the
 *               page a redirect lands on or the `not-found.tsx` it ends at, and
 *               at times the view the page renders (the receipt's
 *               `OrderConfirmedView`). Everything they import is found through
 *               the import graph, so this list stays short; a test checks each
 *               entry exists and that the first is the page Next picks
 *   overlays    the names of its layers (below). Picking a route picks them all:
 *               a menu that is shut measures like a page that has none.
 *
 * A layer (overlay):
 *
 *   name        its shot is `<name>-<width>.png`
 *   route       the route it belongs to. Picking that route picks the layer
 *   path        what the browser opens before `open` runs; it may differ from
 *               the route's (the address form opens on DH-2431, the one sample
 *               order whose address can still change)
 *   components  the files that draw ONLY this layer: a dialog, a drawer, a form
 *               that appears on a click. `impact.mjs` stops at them, so a change
 *               there picks the layer and not the page under it. A file the
 *               page also draws (a shared picker, a screen with its own menu)
 *               does not belong here; through the page it picks the route, and
 *               the route picks the layer
 *   open        what opens it. It runs inside the browser's `run-code` sandbox,
 *               not in Node: `gen.mjs` copies its source text into the script
 *               (`Function.prototype.toString`), so it may use only its one
 *               argument, `{ page, T, LANG }`, never a name from this module.
 *
 * The order of both lists is the order the sweep visits them, the same as the
 * three arrays of `tools/layout-sweep.js` on 07/10/2026, plus the receipt
 * (`/order-confirmed/DH-2430`) added on 08/10.
 */

export const ORIGIN = "http://127.0.0.1:3200";

/** The full sweep's widths per zone. */
export const SHOP_WIDTHS = Object.freeze([390, 1280]);
export const ADMIN_WIDTHS = Object.freeze([1280]);

/**
 * The narrowest width the back office is laid out for (`ArcAdminFrame.module.css`,
 * `min-width: 1180px`); below it the frame scrolls sideways, so a sweep there
 * measures nothing the admin promises.
 */
export const ADMIN_MIN_WIDTH = 1180;

/**
 * The viewport height for a width: 390 → 844 and 1280 → 800, as the sweep has
 * always used; 900 to 1199 → 1000 and 1440 → 900, as the round v6 audit did.
 */
export function heightOf(width) {
  if (width < 600) return 844;
  if (width < 1200) return 1000;
  if (width < 1440) return 800;
  return 900;
}

/** The sweep's name for a path (`/` is "home"; `/ ? =` become `-`). */
export function slugOf(path) {
  return path === "/" ? "home" : path.replace(/[/?=]+/g, "-").replace(/^-/, "");
}

/**
 * Elements whose pixels change with the clock alone: a countdown
 * (`FeedClock`, `role="timer"`). The sweep records their boxes beside each
 * shot (`volatile`), and `../pixdiff.mjs --regions` leaves them out.
 */
export const VOLATILE = Object.freeze(['[role="timer"]']);

// ───────────────────────────────────────────────────────────── the shop

const page = (file) => `app/${file}`;

/** @type {ReadonlyArray<{ path: string, tags: string[], components: string[] }>} */
const SHOP = [
  { path: "/", tags: ["catalog", "control"], components: [page("page.tsx")] },
  { path: "/products", tags: ["catalog"], components: [page("products/page.tsx")] },
  { path: "/products/s05-khoi", tags: ["catalog", "pdp", "control"], components: [page("products/[slug]/page.tsx")] },
  // slice B5: a fixed style's page
  { path: "/products/ao-thun-tron", tags: ["catalog", "pdp"], components: [page("products/[slug]/page.tsx")] },
  { path: "/search?q=khoi", tags: ["catalog", "search"], components: [page("search/page.tsx")] },
  { path: "/cart", tags: ["buy", "control"], components: [page("cart/page.tsx")] },
  { path: "/checkout", tags: ["buy", "control"], components: [page("checkout/page.tsx")] },
  { path: "/order-confirmed", tags: ["buy", "order"], components: [page("order-confirmed/page.tsx")] },
  // Tooling slice T1, the main session's choice on 08/10/2026: the receipt, which impact found outside the sweep
  // (R1's 900–1199 band, B19's `followLink`). DH-2430 is the demo shopper's own transfer order, so the page only
  // reads: no card to reconcile, nothing written.
  {
    path: "/order-confirmed/DH-2430",
    tags: ["buy", "order"],
    components: [page("order-confirmed/[code]/page.tsx"), "components/feed/order/OrderConfirmedView.tsx"],
  },
  // v3 slice 3: the public lookup page with a sample order, so the result renders. Since slice B19 an old link
  // with `phone=` still shows the order once, then drops the number from the address bar.
  { path: "/track?code=DH-2425&phone=0908221447", tags: ["lookup", "order"], components: [page("track/page.tsx")] },
  { path: "/track", tags: ["lookup"], components: [page("track/page.tsx")] },
  // v4 slice 4a: the app-wide 404, from an unknown path and from an issue that does not exist
  { path: "/khong-co-trang-nay", tags: ["notfound"], components: [page("not-found.tsx")] },
  { path: "/so/999", tags: ["notfound", "issue"], components: [page("so/[no]/page.tsx"), page("not-found.tsx")] },
  // v4 slice 4b: Hỏi đáp (plain and searching), the size guide, the kept pages, and /returns, which leads to Hỏi đáp
  { path: "/faq", tags: ["help"], components: [page("faq/page.tsx")] },
  { path: "/faq?q=cod", tags: ["help", "search"], components: [page("faq/page.tsx")] },
  { path: "/size-guide", tags: ["help"], components: [page("size-guide/page.tsx")] },
  { path: "/about", tags: ["help"], components: [page("about/page.tsx")] },
  { path: "/contact", tags: ["help"], components: [page("contact/page.tsx")] },
  { path: "/privacy", tags: ["help"], components: [page("privacy/page.tsx")] },
  { path: "/returns", tags: ["help", "redirect"], components: [page("returns/page.tsx"), page("faq/page.tsx")] },
  { path: "/so/4", tags: ["catalog", "issue"], components: [page("so/[no]/page.tsx")] },
  { path: "/so/5", tags: ["catalog", "issue", "redirect"], components: [page("so/[no]/page.tsx"), page("page.tsx")] },
  { path: "/sign-in", tags: ["auth"], components: [page("sign-in/page.tsx")] },
  { path: "/sign-up", tags: ["auth"], components: [page("sign-up/page.tsx")] },
  { path: "/forgot-password", tags: ["auth"], components: [page("forgot-password/page.tsx")] },
  { path: "/account", tags: ["account"], components: [page("account/page.tsx")] },
  { path: "/account/profile", tags: ["account"], components: [page("account/profile/page.tsx")] },
  {
    path: "/account/password",
    tags: ["account", "redirect"],
    components: [page("account/password/page.tsx"), page("account/profile/page.tsx")],
  },
  { path: "/account/orders", tags: ["account", "order"], components: [page("account/orders/page.tsx")] },
  { path: "/account/notifications", tags: ["account"], components: [page("account/notifications/page.tsx")] },
  {
    path: "/account/orders/DH-2430",
    tags: ["account", "order", "control"],
    components: [page("account/orders/[code]/page.tsx")],
  },
  { path: "/account/orders/DH-2310", tags: ["account", "order"], components: [page("account/orders/[code]/page.tsx")] },
  {
    path: "/account/orders/DH-2310/tracking",
    tags: ["account", "order", "redirect"],
    components: [page("account/orders/[code]/tracking/page.tsx"), page("account/orders/[code]/page.tsx")],
  },
  { path: "/account/addresses", tags: ["account"], components: [page("account/addresses/page.tsx")] },
  {
    path: "/account/addresses/new",
    tags: ["account", "redirect"],
    components: [page("account/addresses/new/page.tsx"), page("account/addresses/page.tsx")],
  },
  { path: "/account/wishlist", tags: ["account"], components: [page("account/wishlist/page.tsx")] },
];

// ───────────────────────────────────────────────────────── the back office

const ADMIN = [
  { path: "/admin", tags: ["admin-overview", "control"], components: [page("admin/page.tsx")] },
  { path: "/admin/orders", tags: ["admin-orders", "control"], components: [page("admin/orders/page.tsx")] },
  { path: "/admin/orders/DH-2429", tags: ["admin-orders", "admin-order"], components: [page("admin/orders/[code]/page.tsx")] },
  { path: "/admin/orders/DH-2430", tags: ["admin-orders", "admin-order"], components: [page("admin/orders/[code]/page.tsx")] },
  { path: "/admin/orders/DH-2418", tags: ["admin-orders", "admin-order"], components: [page("admin/orders/[code]/page.tsx")] },
  { path: "/admin/drops", tags: ["admin-drops"], components: [page("admin/drops/page.tsx")] },
  { path: "/admin/drops/05", tags: ["admin-drops"], components: [page("admin/drops/[no]/page.tsx")] },
  { path: "/admin/promotions", tags: ["admin-promotions"], components: [page("admin/promotions/page.tsx")] },
  { path: "/admin/products", tags: ["admin-products"], components: [page("admin/products/page.tsx")] },
  // v3 slice 12: Cố định is the first tab; an issue is ?drop=N
  { path: "/admin/products?drop=5", tags: ["admin-products"], components: [page("admin/products/page.tsx")] },
  { path: "/admin/products/new", tags: ["admin-products", "admin-product-form"], components: [page("admin/products/new/page.tsx")] },
  {
    path: "/admin/products/p-khoi",
    tags: ["admin-products", "admin-product-form"],
    components: [page("admin/products/[id]/page.tsx")],
  },
  {
    path: "/admin/products/p-ao-thun-tron",
    tags: ["admin-products", "admin-product-form"],
    components: [page("admin/products/[id]/page.tsx")],
  },
  { path: "/admin/customers", tags: ["admin-customers"], components: [page("admin/customers/page.tsx")] },
  { path: "/admin/customers/c-minhanh", tags: ["admin-customers"], components: [page("admin/customers/[id]/page.tsx")] },
  { path: "/admin/slips?codes=DH-2429", tags: ["admin-slips", "admin-orders"], components: [page("admin/slips/page.tsx")] },
  {
    path: "/admin/slips?codes=DH-2429,DH-2428,DH-2423,DH-2426",
    tags: ["admin-slips", "admin-orders"],
    components: [page("admin/slips/page.tsx")],
  },
  { path: "/admin/slips?codes=DH-9999", tags: ["admin-slips", "notfound"], components: [page("admin/slips/page.tsx")] },
  // v3 slice 5: the activity log
  { path: "/admin/log", tags: ["admin-log"], components: [page("admin/log/page.tsx")] },
  // round v5 slice 2: the overview's ranges and the log's filters, on Arc
  { path: "/admin?days=7", tags: ["admin-overview"], components: [page("admin/page.tsx")] },
  { path: "/admin?days=30", tags: ["admin-overview"], components: [page("admin/page.tsx")] },
  { path: "/admin/log?kind=order", tags: ["admin-log"], components: [page("admin/log/page.tsx")] },
  { path: "/admin/log?today=1", tags: ["admin-log"], components: [page("admin/log/page.tsx")] },
  { path: "/admin/log?q=zzz", tags: ["admin-log", "empty"], components: [page("admin/log/page.tsx")] },
  // round v5 slice 3: the customers and the codes, on Arc
  { path: "/admin/customers?group=loyal", tags: ["admin-customers"], components: [page("admin/customers/page.tsx")] },
  { path: "/admin/customers?q=zzz", tags: ["admin-customers", "empty"], components: [page("admin/customers/page.tsx")] },
  { path: "/admin/customers/c-namle", tags: ["admin-customers"], components: [page("admin/customers/[id]/page.tsx")] },
  { path: "/admin/promotions?state=ENDED", tags: ["admin-promotions"], components: [page("admin/promotions/page.tsx")] },
  { path: "/admin/promotions?state=PAUSED", tags: ["admin-promotions"], components: [page("admin/promotions/page.tsx")] },
  // round v5 slice 4: the issues on Arc, a closed one, one not open, one that does not exist
  { path: "/admin/drops/04", tags: ["admin-drops"], components: [page("admin/drops/[no]/page.tsx")] },
  { path: "/admin/drops/06", tags: ["admin-drops"], components: [page("admin/drops/[no]/page.tsx")] },
  { path: "/admin/drops/99", tags: ["admin-drops", "notfound"], components: [page("admin/drops/[no]/page.tsx")] },
  // round v5 slice 5a: the styles on Arc, each kind of tab, empty states
  { path: "/admin/products?drop=6", tags: ["admin-products"], components: [page("admin/products/page.tsx")] },
  { path: "/admin/products?drop=4", tags: ["admin-products"], components: [page("admin/products/page.tsx")] },
  { path: "/admin/products?fixed=1&gone=1", tags: ["admin-products"], components: [page("admin/products/page.tsx")] },
  { path: "/admin/products?drop=5&q=zzz", tags: ["admin-products", "empty"], components: [page("admin/products/page.tsx")] },
  { path: "/admin/products?drop=99", tags: ["admin-products", "notfound"], components: [page("admin/products/page.tsx")] },
];

// ─────────────────────────────────────────────────────────────── layers

const arc = (file) => `components/admin-arc/${file}`;

/**
 * Today's shop layer: since v4 slice 3a the address form is a sheet on /account/addresses (`?add=1` opens it), and
 * the province picker opens over the sheet. Neither the sheet (`AddressesView`) nor the picker (`FeedPicker`, also
 * on /checkout) is drawn by this layer alone, so its `components` are empty and the route brings it.
 */
const SHOP_OVERLAYS = [
  {
    name: "account-addresses-add-province",
    route: "/account/addresses",
    path: "/account/addresses?add=1#province",
    components: [],
    open: async ({ page }) => {
      await page.locator("#f-province").click();
    },
  },
];

/** The admin overlays and panels slice B3a wired to the database: shut, they measure like pages that have none. */
const ADMIN_OVERLAYS = [
  {
    name: "admin-order-more-menu",
    route: "/admin/orders/DH-2429",
    path: "/admin/orders/DH-2429#more",
    components: [],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác khác", "More actions") }).click();
    },
  },
  {
    name: "admin-order-cancel-sheet",
    route: "/admin/orders/DH-2429",
    path: "/admin/orders/DH-2429#cancel",
    components: [arc("ArcCancelOrderDialog.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác khác", "More actions") }).click();
      await page.waitForTimeout(250);
      await page.getByRole("menuitem", { name: T("Huỷ đơn", "Cancel order") }).click();
      await page.waitForTimeout(350);
      await page.getByRole("dialog").getByRole("combobox", { name: T("Lý do", "Reason") }).click();
    },
  },
  {
    name: "admin-order-handover",
    route: "/admin/orders/DH-2429",
    path: "/admin/orders/DH-2429#handover",
    components: [arc("ArcHandoverForm.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Bàn giao", "Hand over") }).click();
    },
  },
  {
    name: "admin-order-carrier-select",
    route: "/admin/orders/DH-2429",
    path: "/admin/orders/DH-2429#carrier",
    components: [arc("ArcHandoverForm.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Bàn giao", "Hand over") }).click();
      await page.waitForTimeout(300);
      await page.getByRole("combobox", { name: T("Hình thức giao", "Delivery service") }).click();
    },
  },
  {
    name: "admin-order-address-form",
    route: "/admin/orders/DH-2429",
    path: "/admin/orders/DH-2431#address",
    components: [arc("ArcAddressForm.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Sửa", "Edit") }).click();
    },
  },
  {
    name: "admin-order-address-province",
    route: "/admin/orders/DH-2429",
    path: "/admin/orders/DH-2431#province",
    components: [arc("ArcAddressForm.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Sửa", "Edit") }).click();
      await page.waitForTimeout(300);
      await page.getByRole("combobox", { name: T("Tỉnh / thành", "Province / city") }).click();
    },
  },
  {
    name: "admin-order-address-ward",
    route: "/admin/orders/DH-2429",
    path: "/admin/orders/DH-2431#ward",
    components: [arc("ArcAddressForm.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Sửa", "Edit") }).click();
      await page.waitForTimeout(300);
      await page.getByRole("combobox", { name: T("Phường / xã", "Ward / commune") }).click();
    },
  },
  {
    name: "admin-orders-row-menu",
    route: "/admin/orders",
    path: "/admin/orders#rowmenu",
    components: [],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác DH-2431", "Actions for DH-2431") }).click();
    },
  },
  {
    name: "admin-reset-sheet",
    route: "/admin",
    path: "/admin#reset",
    components: [arc("ArcResetDialog.tsx")],
    open: async ({ page, T }) => {
      // Opens the confirmation only; the sweep never presses its button.
      await page.locator("aside").getByRole("button", { name: T("Đặt lại dữ liệu mẫu", "Reset demo data") }).click();
    },
  },
  // round v5 slice 2: the overview's day table, the log's filter menu at both steps
  {
    name: "admin-overview-day-table",
    route: "/admin",
    path: "/admin#days",
    components: [],
    open: async ({ page, T }) => {
      await page.getByText(T("Xem dạng bảng", "View as table")).click();
    },
  },
  {
    name: "admin-log-filter-fields",
    route: "/admin/log",
    path: "/admin/log#filter",
    components: [],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thêm bộ lọc", "Add filter") }).click();
    },
  },
  {
    name: "admin-log-filter-values",
    route: "/admin/log",
    path: "/admin/log#filter-values",
    components: [],
    open: async ({ page, T, LANG }) => {
      await page.getByRole("button", { name: T("Thêm bộ lọc", "Add filter") }).click();
      await page.waitForTimeout(400);
      await page.getByRole("menuitem", { name: LANG === "en" ? /Action type/ : /Loại thao tác/ }).click();
    },
  },
  // slice B3b: the sheets and menus that now write to the database
  // v3 slice 12: the default tab is Cố định; an issue's style is named with its code
  {
    name: "admin-products-row-menu",
    route: "/admin/products",
    path: "/admin/products#rowmenu",
    components: [],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác HOODIE TRƠN", "Actions for PLAIN HOODIE"), exact: true }).click();
    },
  },
  {
    name: "admin-products-restock-sheet",
    route: "/admin/products",
    path: "/admin/products#restock",
    components: [arc("ArcStockDrawer.tsx")],
    open: async ({ page, T, LANG }) => {
      await page.getByRole("button", { name: T("Thao tác HOODIE TRƠN", "Actions for PLAIN HOODIE"), exact: true }).click();
      await page.getByRole("menuitem").first().waitFor({ state: "visible" });
      await page.waitForTimeout(400); // the menu animates in: a click before it settles can miss (07/10/2026)
      await page.getByRole("menuitem", { name: T("Nhập thêm", "Restock") }).click();
      await page.waitForTimeout(350);
      await page.getByRole("dialog").getByLabel(LANG === "en" ? /^Restock Grey M,/ : /^Nhập thêm Xám M,/).fill("4");
    },
  },
  {
    name: "admin-products-so05-row-menu",
    route: "/admin/products?drop=5",
    path: "/admin/products?drop=5#rowmenu",
    components: [],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác S05\u00a0\u2013 KHÓI", "Actions for D05\u00a0\u2013 KHÓI"), exact: true }).click();
    },
  },
  {
    name: "admin-products-adjust-sheet",
    route: "/admin/products?drop=5",
    path: "/admin/products?drop=5#adjust",
    components: [arc("ArcStockDrawer.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác S05\u00a0\u2013 KHÓI", "Actions for D05\u00a0\u2013 KHÓI"), exact: true }).click();
      await page.getByRole("menuitem").first().waitFor({ state: "visible" });
      await page.waitForTimeout(400);
      await page.getByRole("menuitem", { name: T("Điều chỉnh tồn kho", "Adjust stock") }).click();
      await page.waitForTimeout(350);
      // round v5 slice 5a: Arc Select, by role and label.
      await page.getByRole("dialog").getByRole("combobox", { name: T("Lý do", "Reason") }).click();
    },
  },
  // round v5 slice 5a: the filter menu at both steps, the drawers in use
  {
    name: "admin-products-filter-fields",
    route: "/admin/products?drop=5",
    path: "/admin/products?drop=5#filter",
    components: [],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thêm bộ lọc", "Add filter") }).click();
    },
  },
  {
    name: "admin-products-filter-values",
    route: "/admin/products?drop=5",
    path: "/admin/products?drop=5#filter-values",
    components: [],
    open: async ({ page, T, LANG }) => {
      await page.getByRole("button", { name: T("Thêm bộ lọc", "Add filter") }).click();
      await page.waitForTimeout(400);
      await page.getByRole("menuitem", { name: LANG === "en" ? /Type/ : /Loại/ }).click();
    },
  },
  {
    name: "admin-products-adjust-ready",
    route: "/admin/products?drop=5",
    path: "/admin/products?drop=5#adjust-ready",
    components: [arc("ArcStockDrawer.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác S05 – KHÓI", "Actions for D05 – KHÓI"), exact: true }).click();
      await page.getByRole("menuitem").first().waitFor({ state: "visible" });
      await page.waitForTimeout(400);
      await page.getByRole("menuitem", { name: T("Điều chỉnh tồn kho", "Adjust stock") }).click();
      await page.waitForTimeout(500);
      await page.getByRole("dialog").getByRole("button", { name: T("Bớt Đen M", "Decrease Black M") }).click();
      await page.getByRole("dialog").getByRole("combobox", { name: T("Lý do", "Reason") }).click();
      await page.waitForTimeout(300);
      await page.getByRole("option", { name: T("Hư hỏng", "Damaged") }).click();
    },
  },
  {
    name: "admin-products-adjust-fixed",
    route: "/admin/products",
    path: "/admin/products#adjust-fixed",
    components: [arc("ArcStockDrawer.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác HOODIE TRƠN", "Actions for PLAIN HOODIE"), exact: true }).click();
      await page.getByRole("menuitem").first().waitFor({ state: "visible" });
      await page.waitForTimeout(400);
      await page.getByRole("menuitem", { name: T("Điều chỉnh tồn kho", "Adjust stock") }).click();
    },
  },
  {
    name: "admin-drops-row-menu",
    route: "/admin/drops",
    path: "/admin/drops#rowmenu",
    components: [],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác Số 05", "Actions for Drop 05"), exact: true }).click();
    },
  },
  {
    name: "admin-drops-create-sheet",
    route: "/admin/drops",
    path: "/admin/drops#create",
    components: [arc("ArcDropFormDialog.tsx")],
    open: async ({ page, T }) => {
      // round v5 slice 4: the Arc heading has no v3 `.top`; the page's own "Tạo số".
      await page.getByRole("button", { name: T("Tạo số", "Create drop") }).first().click();
    },
  },
  {
    name: "admin-drops-edit-sheet",
    route: "/admin/drops",
    path: "/admin/drops#edit",
    components: [arc("ArcDropFormDialog.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác Số 06", "Actions for Drop 06"), exact: true }).click();
      await page.getByRole("menuitem").first().waitFor({ state: "visible" });
      await page.waitForTimeout(400);
      await page.getByRole("menuitem", { name: T("Sửa giờ", "Reschedule") }).click();
    },
  },
  {
    name: "admin-drops-close-sheet",
    route: "/admin/drops",
    path: "/admin/drops#close",
    components: [arc("ArcCloseDropDialog.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác Số 05", "Actions for Drop 05"), exact: true }).click();
      await page.getByRole("menuitem").first().waitFor({ state: "visible" });
      await page.waitForTimeout(400);
      await page.getByRole("menuitem", { name: T("Đóng sớm", "Close early") }).click();
    },
  },
  {
    name: "admin-drops-teaser-sheet",
    route: "/admin/drops/05",
    path: "/admin/drops/05#teaser",
    components: [arc("ArcTeaserDialog.tsx"), arc("ArcPhotoPicker.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thêm mẫu hé lộ", "Add teaser") }).click();
      await page.waitForTimeout(700);
      // round v5 slice 4: Arc's Select, found by its role and label, not v3's `.field3 button.selbtn`.
      await page.getByRole("dialog").getByRole("combobox", { name: T("Loại", "Type") }).click();
    },
  },
  // round v5 slice 4: the other states of the three Arc dialogs
  {
    name: "admin-drops-create-backwards",
    route: "/admin/drops",
    path: "/admin/drops#create-backwards",
    components: [arc("ArcDropFormDialog.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Tạo số", "Create drop") }).first().click();
      await page.waitForTimeout(700);
      await page.getByRole("dialog").getByLabel(T("Đóng lúc 20:00 ngày", "Closes at 20:00 on")).fill("01/10/2026");
    },
  },
  {
    name: "admin-drops-close-detail",
    route: "/admin/drops/05",
    path: "/admin/drops/05#close-detail",
    components: [arc("ArcCloseDropDialog.tsx")],
    open: async ({ page, T }) => {
      await page.locator("#detail").getByRole("button", { name: T("Đóng sớm", "Close early") }).click();
    },
  },
  {
    name: "admin-drops-teaser-ready",
    route: "/admin/drops/05",
    path: "/admin/drops/05#teaser-ready",
    components: [arc("ArcTeaserDialog.tsx"), arc("ArcPhotoPicker.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thêm mẫu hé lộ", "Add teaser") }).click();
      await page.waitForTimeout(700);
      await page.getByRole("dialog").getByLabel(T("Tên mẫu", "Style name")).fill("SỎI");
      await page.getByRole("dialog").getByRole("combobox", { name: T("Loại", "Type") }).click();
      await page.waitForTimeout(400);
      await page.getByRole("option", { name: "Áo khoác dù", exact: true }).click();
      await page.waitForTimeout(300);
      await page.getByRole("dialog").getByRole("radio", { name: T("Ảnh tro", "Photo tro") }).click();
    },
  },
  {
    name: "admin-drops-04-row-menu",
    route: "/admin/drops/04",
    path: "/admin/drops/04#rowmenu",
    components: [],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác Số 04", "Actions for Drop 04"), exact: true }).click();
    },
  },
  {
    name: "admin-promotions-row-menu",
    route: "/admin/promotions",
    path: "/admin/promotions#rowmenu",
    components: [],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác DOT05", "Actions for DOT05"), exact: true }).click();
    },
  },
  // round v5 slice 3: the same passes for the Arc screens
  {
    name: "admin-promotions-create-drawer",
    route: "/admin/promotions",
    path: "/admin/promotions#create-arc",
    components: [arc("ArcPromoDrawer.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Tạo mã", "Create code") }).click();
      await page.waitForTimeout(700);
      await page.getByRole("dialog").getByRole("combobox", { name: T("Loại", "Type") }).click();
    },
  },
  {
    name: "admin-promotions-edit-drawer",
    route: "/admin/promotions",
    path: "/admin/promotions#edit-arc",
    components: [arc("ArcPromoDrawer.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác DOT05", "Actions for DOT05"), exact: true }).click();
      await page.getByRole("menuitem").first().waitFor({ state: "visible" });
      await page.waitForTimeout(400);
      await page.getByRole("menuitem", { name: T("Sửa", "Edit"), exact: true }).click();
    },
  },
  {
    name: "admin-promotions-create-error",
    route: "/admin/promotions",
    path: "/admin/promotions#error-arc",
    components: [arc("ArcPromoDrawer.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Tạo mã", "Create code") }).click();
      await page.waitForTimeout(700);
      await page.getByRole("dialog").getByRole("button", { name: T("Lưu", "Save") }).click();
    },
  },
  {
    name: "admin-customers-row-menu",
    route: "/admin/customers",
    path: "/admin/customers#rowmenu",
    components: [],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Thao tác Trần Minh Anh", "Actions for Trần Minh Anh"), exact: true }).click();
    },
  },
  // round v5 slice 5b: the style form is Arc's. Its fields are found by role and label, not by v3's `.field3`,
  // `button.selbtn`, `.colorpick`, `.cslot` and `.sheetwrap`.
  {
    name: "admin-product-new-issue-menu",
    route: "/admin/products/new",
    path: "/admin/products/new#issue-menu",
    components: [],
    open: async ({ page, T }) => {
      await page.getByRole("combobox", { name: T("Số", "Drop"), exact: true }).click();
    },
  },
  {
    name: "admin-product-new-fixed",
    route: "/admin/products/new",
    path: "/admin/products/new#fixed",
    components: [],
    open: async ({ page, T }) => {
      await page.getByRole("combobox", { name: T("Số", "Drop"), exact: true }).click();
      await page.waitForTimeout(250);
      await page.getByRole("option", { name: T("Cố định", "Basics") }).click();
    },
  },
  {
    name: "admin-product-form-kind-menu",
    route: "/admin/products/p-khoi",
    path: "/admin/products/p-khoi#kind",
    components: [],
    open: async ({ page, T }) => {
      await page.getByRole("combobox", { name: T("Loại", "Type") }).click();
    },
  },
  // v3 slice 7: the crop dialog after a picked file, and the borrowed-photo grid open
  {
    name: "admin-product-new-crop-sheet",
    route: "/admin/products/new",
    path: "/admin/products/new#crop",
    components: [arc("ArcCropDialog.tsx")],
    open: async ({ page, T, LANG }) => {
      await page.getByRole("group", { name: T("Màu sẽ cắt", "Colours to cut") }).getByRole("button", { name: T("Đen", "Black"), exact: true }).click();
      await page.getByLabel(T("Chọn tệp cho Đen", "Choose file for Black")).setInputFiles("tools/fixtures/soi-den.png");
      await page.getByRole("dialog").getByRole("group", { name: LANG === "en" ? /^4:5 crop frame/ : /^Khung cắt/ }).waitFor({ state: "visible", timeout: 8000 });
    },
  },
  {
    name: "admin-product-new-photopick",
    route: "/admin/products/new",
    path: "/admin/products/new#photopick",
    components: [arc("ArcPhotoPicker.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("group", { name: T("Màu sẽ cắt", "Colours to cut") }).getByRole("button", { name: T("Đen", "Black"), exact: true }).click();
      await page.getByRole("button", { name: T("Mượn tạm", "Borrow") }).first().click();
    },
  },
  {
    name: "admin-product-edit-photopick",
    route: "/admin/products/p-khoi",
    path: "/admin/products/p-khoi#photopick",
    components: [arc("ArcPhotoPicker.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Mượn tạm", "Borrow") }).first().click();
    },
  },
  // round v5 slice 5b: three colours with their rows and grid, a fixed style's loan grid
  {
    name: "admin-product-new-colours",
    route: "/admin/products/new",
    path: "/admin/products/new#colours",
    components: [],
    open: async ({ page, T, LANG }) => {
      for (const c of LANG === "en" ? ["Black", "White", "Grey"] : ["Đen", "Trắng", "Xám"]) {
        await page.getByRole("group", { name: T("Màu sẽ cắt", "Colours to cut") }).getByRole("button", { name: c, exact: true }).click();
      }
    },
  },
  {
    name: "admin-product-fixed-photopick",
    route: "/admin/products/p-ao-thun-tron",
    path: "/admin/products/p-ao-thun-tron#photopick",
    components: [arc("ArcPhotoPicker.tsx")],
    open: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Đổi ảnh mượn", "Change borrowed photo") }).first().click();
    },
  },
];

// ───────────────────────────────────────────────────────────── assembled

/**
 * @typedef {{ name: string, route: string, path: string, zone: "shop" | "admin", widths: readonly number[],
 *   components: readonly string[], open: Function }} Overlay
 * @typedef {{ name: string, path: string, zone: "shop" | "admin", widths: readonly number[], tags: readonly string[],
 *   components: readonly string[], overlays: readonly string[] }} Route
 */

/** @type {readonly Overlay[]} */
export const OVERLAYS = Object.freeze([
  ...SHOP_OVERLAYS.map((o) => Object.freeze({ ...o, zone: "shop", widths: SHOP_WIDTHS, components: Object.freeze(o.components) })),
  ...ADMIN_OVERLAYS.map((o) => Object.freeze({ ...o, zone: "admin", widths: ADMIN_WIDTHS, components: Object.freeze(o.components) })),
]);

const layersOf = (path) => Object.freeze(OVERLAYS.filter((o) => o.route === path).map((o) => o.name));

/** @type {readonly Route[]} */
export const ROUTES = Object.freeze([
  ...SHOP.map((r) =>
    Object.freeze({
      name: slugOf(r.path),
      path: r.path,
      zone: "shop",
      widths: SHOP_WIDTHS,
      tags: Object.freeze(r.tags),
      components: Object.freeze(r.components),
      overlays: layersOf(r.path),
    }),
  ),
  ...ADMIN.map((r) =>
    Object.freeze({
      name: slugOf(r.path),
      path: r.path,
      zone: "admin",
      widths: ADMIN_WIDTHS,
      tags: Object.freeze(r.tags),
      components: Object.freeze(r.components),
      overlays: layersOf(r.path),
    }),
  ),
]);

/**
 * The control pages (round v6, the user's choice on 07/10/2026): checked on every slice whatever it touched, by
 * their shots against the baseline's, so a leak outside the slice's own routes shows. The routes carry the tag
 * `control` too.
 */
export const CONTROLS = Object.freeze([
  Object.freeze({ path: "/", widths: SHOP_WIDTHS }),
  Object.freeze({ path: "/products/s05-khoi", widths: SHOP_WIDTHS }),
  Object.freeze({ path: "/cart", widths: SHOP_WIDTHS }),
  Object.freeze({ path: "/checkout", widths: SHOP_WIDTHS }),
  Object.freeze({ path: "/account/orders/DH-2430", widths: SHOP_WIDTHS }),
  Object.freeze({ path: "/admin", widths: ADMIN_WIDTHS }),
  Object.freeze({ path: "/admin/orders", widths: ADMIN_WIDTHS }),
]);

/** A route by its path or its name. */
export function routeOf(key) {
  return ROUTES.find((r) => r.path === key || r.name === key) ?? null;
}

/** A layer by its name, with or without a width suffix (`admin-reset-sheet-1280`). */
export function overlayOf(key) {
  return OVERLAYS.find((o) => o.name === key || key.replace(/-\d+$/, "") === o.name) ?? null;
}

/** Every entry name the full sweep produces (`<name>-<width>`), pages and layers. */
export function allEntryNames() {
  const names = [];
  for (const r of ROUTES) for (const w of r.widths) names.push(`${r.name}-${w}`);
  for (const o of OVERLAYS) for (const w of o.widths) names.push(`${o.name}-${w}`);
  return names;
}
