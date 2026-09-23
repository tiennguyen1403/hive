# Brief — Lát B0a: catalog là một giá trị, không phải module fixture *(23/09/2026)*

Agent: `backend-implementer`. Hồ sơ nền: `tasks/backend.md` (QĐ-25). Lát này là **refactor thuần,
hành vi bằng 0 thay đổi**: không Docker, không Supabase, không dependency mới, không đụng
`data/orders.ts` / `data/customers.ts`. Mục đích là để lát B0b thay nguồn catalog bằng Postgres ở
**một module duy nhất** mà không phải sửa 40 tệp lần nữa.

## 1. Lát

**B0a — Catalog as a value.** Hôm nay 13 module `lib/` và 27 component client `import` thẳng
`@/data/catalog` (`CATALOG`, `byId`, `bySlug`, `DROPS`, `TEASERS`, `teasersIn`, `CURRENT_DROP_NO`,
`COLORS`) và `@/data/promotions` (`PROMOTIONS`, `promoByCode`). Sau lát này:

- mọi hàm trong `lib/` nhận `catalog: Catalog` làm **tham số đầu tiên** thay vì đọc module fixture;
- component client lấy catalog qua `useCatalog()` từ một provider ở root layout;
- trang server lấy catalog qua **một** hàm `loadCatalog()` trong `lib/db/catalog.ts` (lát B0a trả
  fixture; lát B0b đổi thân hàm sang Postgres, chữ ký giữ nguyên);
- `COLORS` (bảng 7 màu, dữ liệu tham chiếu tĩnh) dời sang `data/colors.ts`.

Tệp thuộc phạm vi: 13 tệp `lib/` sau (`lib/activity-log.ts`, `admin-options.ts`, `admin-rows.ts`,
`cart.ts`, `catalog-query.ts`, `customer-tags.ts`, `drop.ts`, `inventory.ts`, `later.ts`, `lookup.ts`,
`order-rows.ts`, `suggest.ts`, `wishlist.ts`) cộng `lib/promotions.ts` và bất kỳ tệp `lib/` nào khác
import `@/data/promotions`; 27 component client trong danh sách ở mục 3.4; 9 tệp `app/` import
fixture catalog/promotions; test đi kèm. Kiểm lại bằng grep trước khi bắt đầu, con số có thể lệch một
hai tệp.

## 2. Quyết định áp dụng (đã chốt, không hỏi lại)

- **QĐ-25**: đường dữ liệu chỉ qua server; lát này chuẩn bị cho điều đó, chưa có DB.
- **QĐ-9**: quy tắc là hàm thuần, React là vỏ. Không đưa fetching vào `lib/` (trừ `lib/db/`).
- **QĐ-24**: đồng hồ mẫu `demoNow()` **giữ nguyên** trong lát này. Mọi tham số `now = demoNow()`
  hiện có giữ vị trí và mặc định của nó.
- **QĐ-6**: code tiếng Anh; tên tham số là `catalog`.
- **DESIGN.md §9**: không số bịa, không nút chết. Lát này không đổi một chữ nào trên UI.
- Không dependency mới. Không tạo `supabase/`. Không sửa `data/catalog.ts` ngoài việc dời `COLORS`
  và giữ nguyên các export hiện có cho test (`CATALOG`, `byId`, `bySlug`, `DROPS`, `TEASERS`,
  `teasersIn`, `CURRENT_DROP_NO`).

## 3. Spec

### 3.1 `lib/catalog.ts` (mới, thuần)

```ts
import type { Color, ColorKey, Drop, Product, ProductId, PromoCode, Promotion, Teaser } from "@/data/types";

export interface CatalogInput {
  products: Product[];      // order matters: it is the "newest" sort key (lib/catalog-query.ts)
  drops: Drop[];
  teasers: Teaser[];
  promotions: Promotion[];
}

export interface Catalog {
  readonly products: readonly Product[];
  readonly drops: readonly Drop[];
  readonly teasers: readonly Teaser[];
  readonly promotions: readonly Promotion[];
  readonly byId: ReadonlyMap<ProductId, Product>;
  readonly bySlug: ReadonlyMap<string, Product>;
  readonly dropByNo: ReadonlyMap<number, Drop>;
  readonly promoByCode: ReadonlyMap<PromoCode, Promotion>;
  /** Highest dropNo that has at least one product. Fixture: 5. */
  readonly currentDropNo: number;
}

export function buildCatalog(input: CatalogInput): Catalog;
export function teasersIn(catalog: Catalog, dropNo: number): Teaser[];
```

`buildCatalog` là hàm thuần, không sắp xếp lại `products` (giữ thứ tự đầu vào), không đụng
`demoNow()`. `currentDropNo` thay cho hằng `CURRENT_DROP_NO`; test khẳng định bằng 5 trên fixture.
Không tạo class, không getter lười, không cache module-level.

### 3.2 `data/colors.ts` (mới) và `data/fixture-catalog.ts` (mới)

- `data/colors.ts`: chuyển nguyên `COLORS` (và kiểu đi kèm) từ `data/catalog.ts` sang đây;
  `data/catalog.ts` import từ đó, **không re-export** (để grep ở mục 4 có nghĩa).
- `data/fixture-catalog.ts`: `export const FIXTURE_CATALOG: Catalog = buildCatalog({ products: CATALOG,
  drops: DROPS, teasers: TEASERS, promotions: PROMOTIONS })`. Đây là **nguồn duy nhất** mà test và
  `lib/db/catalog.ts` dùng để lấy catalog fixture.

### 3.3 `lib/db/catalog.ts` (mới, chỉ server)

```ts
import "server-only";
import type { CatalogInput } from "@/lib/catalog";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";

/** Lát B0a: fixture. Lát B0b: Postgres qua @supabase/ssr. Chữ ký không đổi. */
export async function loadCatalog(): Promise<Catalog>;
/** Dạng tuần tự hoá được để đưa qua ranh giới server → client (mảng thuần, không Map). */
export function catalogInput(catalog: Catalog): CatalogInput;
```

Kiểm trong `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
(mục về `server-only`) xem có cần cài gói `server-only` không; theo docs Next 16 thì Next tự xử lý
import này. Nếu docs nói phải cài, dừng và hỏi (đó là dependency mới).

### 3.4 `components/shop/CatalogContext.tsx` (mới, `"use client"`)

```tsx
export function CatalogProvider({ input, children }: { input: CatalogInput; children: React.ReactNode });
export function useCatalog(): Catalog;   // throws a clear error when used outside the provider
```

Provider nhận `CatalogInput` (mảng thuần) và `buildCatalog` bằng `useMemo`; **không** đưa `Map`
qua props từ Server Component sang Client Component. Gắn provider ở `app/layout.tsx` ngay trong
`<body>`, bao mọi provider hiện có (Session, Cart, Wishlist, AddressBook…): `const catalog = await
loadCatalog()` rồi `<CatalogProvider input={catalogInput(catalog)}>`. Kích thước payload (~21 mẫu) ghi
vào báo cáo (đo bằng `curl -s http://127.0.0.1:3200/ | wc -c` trước/sau).

27 component client cần chuyển sang `useCatalog()` (kiểm lại bằng grep): `components/account/notif-center.ts`
(hook/module — nhận `catalog` qua tham số từ nơi gọi nếu không phải component), `components/admin/ActivityLogScreen.tsx`,
`AdminDropsScreen.tsx`, `AdminOrderScreen.tsx`, `AdminOrdersScreen.tsx`, `AdminPromotionsScreen.tsx`, `CustomerScreen.tsx`,
`CustomersTable.tsx`, `DashboardScreen.tsx`, `DropFormModal.tsx`, `InventoryAdjustSheet.tsx`, `ProductForm.tsx`,
`ProductsTable.tsx`, `SlipScreen.tsx`, `TeaserFormSheet.tsx`, `components/cart/CartLineRow.tsx`, `CartScreen.tsx`,
`LaterList.tsx`, `components/checkout/CheckoutScreen.tsx`, `OrderBox.tsx`, `components/product/FilterSheet.tsx`,
`ListingControls.tsx`, `ProductCard.tsx`, `ProductView.tsx`, `SizeSheet.tsx`, `components/shop/ReminderBand.tsx`,
`SiteFooter.tsx`. Component server (không `"use client"`) nhận `catalog` qua props từ trang.

Quy tắc chọn: một component **client** gọi `useCatalog()`; một module `.ts` không phải component
(`notif-center.ts`, `sim-store.ts`, …) nhận `catalog` qua tham số; một component **server** nhận qua
props. Không tạo context thứ hai, không đưa catalog vào `localStorage`.

### 3.5 Chữ ký `lib/`

Quy tắc máy móc: mọi hàm export trong 13 module `lib/` (và `lib/promotions.ts`) hiện đọc
`CATALOG`/`byId`/`bySlug`/`DROPS`/`TEASERS`/`teasersIn`/`CURRENT_DROP_NO`/`PROMOTIONS`/`promoByCode`
nhận thêm `catalog: Catalog` làm **tham số đầu tiên**; các tham số còn lại giữ nguyên thứ tự và mặc
định. Hàm nội bộ cũng vậy. Ví dụ: `resolveCart(now, cart)` → `resolveCart(catalog, now, cart)`;
`dropState(drop, now = demoNow())` không đổi nếu nó đã nhận `drop` (chỉ những hàm tự tra `DROPS` mới
thêm `catalog`). Không dùng biến module-level, không dùng `setCatalog()` toàn cục.

Test hiện có: đổi call site sang `FIXTURE_CATALOG` (import từ `@/data/fixture-catalog`), giữ nguyên
mọi kỳ vọng. Thêm `lib/catalog.test.ts`: chỉ mục `byId`/`bySlug`/`dropByNo`/`promoByCode` khớp fixture;
`currentDropNo === 5`; thứ tự `products` giữ nguyên; `teasersIn(FIXTURE_CATALOG, 6)` trả 2 teaser và
`teasersIn(FIXTURE_CATALOG, 5)` trả `[]`.

### 3.6 `app/`

Mỗi trang server import fixture catalog/promotions hôm nay chuyển sang `const catalog = await
loadCatalog()` và truyền vào `lib`/component. `app/products/[slug]/page.tsx`: `generateStaticParams`
cũng lấy slug từ `loadCatalog()`. `app/api/wards/route.ts` không đổi.

## 4. Kiểm nghiệm thu (theo thứ tự; tất cả phải đạt)

1. **Grep gate** (chạy từ gốc dự án, Git Bash):
   ```
   grep -rlE 'from "@/data/(catalog|promotions|fixture-catalog)"' app components lib | grep -v '\.test\.'
   ```
   chỉ được ra **đúng một dòng**: `lib/db/catalog.ts`. `grep -rl 'CURRENT_DROP_NO' app components lib |
   grep -v test` phải rỗng. `grep -rl '"use client"' lib` phải rỗng.
2. `npm run typecheck` sạch; `npm test`: mọi test cũ xanh, tổng ≥ 1.025 + test mới; `lib/clock.test.ts`
   vẫn xanh (không `new Date()` mới).
3. `npm run build` sạch; số trang build không đổi (56).
4. Preview 3200 chạy detached; sweep `tools/layout-sweep.js` → 0 lỗi console, 0 tràn, 0 chữ < 11px,
   0 request ngoài 3200.
5. **Ảnh trước/sau giống hệt**: chụp **trước khi sửa** (build hiện tại) và **sau khi sửa** cùng kịch
   bản, cùng trạng thái, các route: `/`, `/products`, `/products/<slug đầu tiên trong CATALOG>`,
   `/search?q=áo`, `/cart` (seed `brand.cart` như `tools/layout-sweep.js`), `/account` (seed
   `brand.session` như sweep), `/admin`, `/admin/products` ở 390 và 1280 (admin chỉ 1280). Mở size
   sheet trên PDP và filter sheet trên `/products` ở 390 trước khi chụp. So từng cặp bằng mắt; lệch
   pixel do ảnh lazy thì cuộn hết trang rồi chụp lại, lệch khác thì là lỗi.
6. Payload HTML trang chủ trước/sau (`curl … | wc -c`) ghi vào báo cáo.

## 5. Sản phẩm nộp

- Ảnh: `.playwright-cli/shots/backend/b0a/before/<route>-<width>[-<state>].png` và `…/after/…`, tên
  giống nhau từng cặp.
- `.playwright-cli/sweep.json` sau khi sửa.
- Báo cáo 6 mục theo hợp đồng của agent; mục "Đã đổi" liệt kê từng tệp và chữ ký đã đổi.

## Đọc trước khi sửa

`AGENTS.md`; `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
(ranh giới server/client, những gì tuần tự hoá được qua props, `server-only`) và
`06-fetching-data.md` (đọc dữ liệu trong Server Component, `React.cache`); `data/types.ts`;
`tasks/backend.md` §6 và §9; `lib/*.test.ts` của các module chạm tới; `DESIGN.md` §8–§9.
