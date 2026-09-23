# Brief — Lát B3b: quản trị thật, phần 2 — tồn kho, Số, teaser, mã giảm giá, sửa mẫu; xoá lớp mô phỏng *(giao 24/09/2026 sau B3a commit `ab70373`)*

Agent: `backend-implementer`. Hồ sơ nền: `tasks/backend.md` (QĐ-25 §6, §9 dòng B3), brief B3a (`tasks/briefs/backend-b3a.md`) và báo cáo
của nó (bảng guard, `events`, `demo_anchor`, `assert_now`). Sau lát này **không còn gì mô phỏng trên trình duyệt** trong khu quản trị:
`brand.adminSim`, `SimProvider`, `lib/admin-sim.ts` xoá hẳn; mọi thao tác ghi Postgres qua hàm `admin_*` và chèn `events`.

## 1. Lát

Sau lát này:

- **Điều chỉnh tồn kho** (`InventoryAdjustSheet`) ghi `stock_cells` thật với lý do, tham chiếu, ghi chú; kiểm tồn cũ để hai người cùng sửa
  không đè nhau. Trang sản phẩm và giỏ thấy ngay.
- **Các Số**: tạo Số mới, sửa lịch, đóng sớm — ghi `drops`; cửa hàng đổi trạng thái theo đúng luật `dropState` hiện có.
- **Teaser**: "Thêm mẫu hé lộ" ghi `teasers`; trang chủ hiện.
- **Mã giảm giá**: tạo, sửa (mã không đổi; nhân bản là tạo mã mới), tạm dừng / tiếp tục, nâng giới hạn, kết thúc sớm — ghi `promotions`
  (cột mới `paused`); `place_order` từ chối mã đang tạm dừng.
- **Sửa mẫu** (`/admin/products/[id]`): tên, loại, mã địa chỉ, giá, chất liệu, form, Số — ghi `products`; lưới tồn kho trên form đi qua
  cùng hàm điều chỉnh tồn kho. **Tạo mẫu mới** (`/admin/products/new`) **chưa mở**: form của mock không có ô chọn màu và ảnh, thêm ô là đổi
  thiết kế (§2.9).
- `sold_out_at` thành sự thật sống: `place_order` đặt khi chiếc cuối của mẫu bán đi, điều chỉnh tồn kho xoá khi hàng về.
- Nhật ký đọc `events` cho tất cả; `simLogRows` xoá; `scheduleRows` (mở/đóng Số suy từ lịch) **giữ** vì là sự thật suy ra, không phải mô phỏng.
- Hai việc nhỏ mở từ B3a: đăng nhập từ link sâu `/admin/...` quay về đúng trang; đơn khách vãng lai hiện tên người nhận ở cột Khách.

Dependency: **không thêm gói nào.**

## 1b. Từ báo cáo B3a (24/09, đã đạt và commit `ab70373`)

- Stack 7 container đang chạy; preview 3200 có thể đang chạy bản B3a — tắt rồi dựng lại khi cần. Cổng 3100 không đụng. `.env.local` đủ.
- Đồng hồ thật: `demoNow()` = `new Date()`; seed và `seed:users` neo `reset_demo(public.demo_anchor())`; test DB so fixture gọi
  `reset_demo('2026-09-20 18:50+07')` tường minh và **trả DB về mốc thật** khi xong (các tệp dbtest hiện có làm vậy — theo mẫu đó).
- Kẹp giờ: mọi hàm ghi có `p_now` phải gọi `assert_now(p_now)` (±300 s, trừ service_role/phiên DB trực tiếp). Hàm mới cũng vậy.
- `events` có check constraint theo `kind` và trigger `APPEND_ONLY`: thêm kind mới bằng migration mới (drop + add constraint).
- Mọi đường đọc đơn đi qua `order_json` → `toOrder`; catalog đi qua `catalog_snapshot()` → `parseCatalogSnapshot` → `Catalog`. Sửa
  `catalog_snapshot` thì sửa guard trong `lib/db/catalog-snapshot.ts` và test của nó.
- `tools/layout-sweep.js` (67 lượt, đăng nhập quản lý cho nửa admin, 6 lớp nổi admin) và `tools/backend-shots.js` đã là bản B3a; chạy
  `npx playwright cli --raw run-code --filename=tools/layout-sweep.js > .playwright-cli/sweep.json`. Cần đổi thì chép sang `.playwright-cli/b3b-*.js`.
- Mốc kiểm: `npm test` **54 tệp / 1.114 test**; `npm run test:db` **4 tệp / 109 test**; build 44 route; sweep 67 lượt 0/0/0/0 (tồn dư 48 + 2).
- Báo cáo 6 mục tiếng Việt; mục 4 lần này: **bảng hàm ↔ guard ↔ sự kiện** cho tất cả hàm mới, và danh sách chữ đã bỏ/đổi.

## 2. Quyết định áp dụng (đã chốt, không hỏi lại)

1. **Ghi chỉ qua hàm** `security definer set search_path = ''`, `is_admin()` → `NOT_ADMIN`, `assert_now(p_now)` → `BAD_INPUT`, guard sai →
   `NOT_ALLOWED`, không tìm thấy → `NOT_FOUND`, tồn cũ lệch → `STALE`. Grant `authenticated`, revoke `public`/`anon`. Mỗi hàm chèn đúng
   một sự kiện (điều chỉnh tồn kho: một sự kiện cho cả lượt, payload `cells[]`).
2. **`admin_adjust_stock(product_id, cells jsonb, reason, ref, note, p_now)`**: `cells = [{ color, size, before, after }]`, mỗi ô: ô tồn
   tại (màu thuộc mẫu), `after >= 0`, **`before` phải bằng `on_hand` hiện tại** (khoá `for update`), khác → `STALE` (UI: "Tồn kho đã đổi ở
   nơi khác — tải lại rồi sửa tiếp"); `reason` thuộc danh sách lý do hiện có của sheet; `ref`, `note` ≤ 200/500. Sau khi ghi: nếu tổng
   `on_hand` của mẫu > 0 và `sold_out_at` không null → `sold_out_at = null`; nếu tổng = 0 và null → `sold_out_at = p_now`. Sự kiện
   `INVENTORY_ADJUSTED { cells, reason, ref, note, delta }`.
3. **`place_order`**: sau khi trừ tồn, mẫu nào tổng `on_hand` về 0 mà `sold_out_at` null → `sold_out_at = p_now`. (Huỷ/quá hạn trả hàng
   về: `sold_out_at = null` khi tổng > 0 — áp cho `cancel_order`, `admin_cancel_order`, `expire_transfers`.) Mã `paused` → `PROMO_INVALID`.
4. **Số**: `admin_add_drop(no, opens_at, closes_at, p_now)` — `no` = max hiện có + 1 (đúng `nextDropNo`), `closes_at > opens_at`, sự kiện
   `DROP_ADDED`; `admin_schedule_drop(no, opens_at, closes_at, p_now)` — mọi Số, `closes_at > opens_at`; "Đóng số sớm" là
   `admin_schedule_drop` với `closes_at = p_now` (UI giữ nút, không thêm hàm); sự kiện `DROP_SCHEDULED { before, after }`. Không xoá Số.
5. **Teaser**: `admin_add_teaser(slug, name, garment, family, drop_no, photo_key, p_now)` — `slug` do Server Action tính bằng `teaserSlug()`
   hiện có (chuyển từ `admin-sim.ts` sang `lib/teasers.ts`), SQL kiểm `^[a-z0-9-]+$` và chưa tồn tại; `photo_key` phải nằm trong
   `product_colors.photo_key` hoặc `teasers.photo_key` đã có (ảnh mượn, PRODUCT.md); `position` = max + 1. Sự kiện `TEASER_ADDED`.
6. **Mã giảm giá**: cột `promotions.paused boolean not null default false` (seed: false; `catalog_snapshot` trả `paused`; `Promotion`
   thêm `paused?: boolean`; `isPromoLive`/`livePromotions`/`promoState` coi `paused` là không hiệu lực với nhãn "Tạm dừng" như sim).
   `admin_add_promo(terms jsonb, p_now)` (mã `upper`, không khoảng trắng, chưa tồn tại; ràng buộc theo `kind` như check của bảng),
   `admin_edit_promo(code, terms, p_now)` (**mã không đổi**; `used_count` giữ; ô "Mã" trong `PromoFormSheet` chỉ đọc khi sửa — lệch có chủ
   ý so với sim vì `orders.promo_code` tham chiếu mã; nhân bản = tạo mã mới), `admin_pause_promo(code, paused, p_now)`,
   `admin_raise_promo_limit(code, after, p_now)` (`after` > `usage_limit` hiện có, hoặc từ `null`), `admin_end_promo(code, p_now)`
   (`ends_at = p_now`, chỉ khi `ends_at > p_now`). Sự kiện `PROMO_ADDED`, `PROMO_EDITED { before, after }`, `PROMO_PAUSED`,
   `PROMO_LIMIT_RAISED { before, after }`, `PROMO_ENDED`.
7. **Sửa mẫu**: `admin_update_product(id, patch jsonb, p_now)` với `patch` ⊆ `{ name, kind, slug, priceVnd, material, fit, dropNo }`:
   `slug` khớp `^[a-z0-9-]+$` và duy nhất; `priceVnd > 0`; `dropNo` tồn tại; `cut_units` **không** đổi được (model "cắt một lần"). Sự kiện
   `PRODUCT_EDITED { before, after }` chỉ với trường đổi. Form: nút lưu = `admin_update_product` + (nếu lưới tồn đổi) `admin_adjust_stock`
   với `reason = 'Sửa mẫu'` (thêm vào danh sách lý do nếu chưa có), cùng một Server Action, hai rpc tuần tự; thất bại ở bước hai thì báo
   rõ bước một đã lưu. Sau lưu: `revalidatePath('/', 'layout')` (giá/slug đổi khắp cửa hàng) và chuyển về `/admin/products/[id]` (slug
   mới nếu đổi).
8. **Đọc**: khu quản trị dùng `loadCatalog()` như cửa hàng (đã là DB); xoá mọi `simProducts/simDrops/simTeasers/simPromotions`.
9. **Tạo mẫu mới chưa mở**: `/admin/products/new` giữ trang, nút lưu `disabled` "Tạo mẫu mới · đang chuẩn bị", ghi chú: "Tạo mẫu cần chọn màu
   và ảnh cho từng màu; ô đó chưa có trong thiết kế." Không xoá trang (link từ bảng Mẫu vẫn tới). Phiên chính sẽ hỏi người dùng có dựng ô chọn
   màu/ảnh không.
10. **Xoá mô phỏng**: `lib/admin-sim.ts` + test, `components/admin/SimContext.tsx`, `brand.adminSim`, `useSimNow` (mọi màn nhận `nowIso`
    từ server và gọi `router.refresh()` sau action như B3a), `simLogRows`; `SimBar` bỏ dòng "Tồn kho, số và mã giảm giá còn mô phỏng…";
    `AdminNav` bỏ bộ đếm thay đổi; footer dashboard "đơn hàng lưu trên máy chủ; tồn kho, số và mã còn mô phỏng…" → "mọi thao tác lưu trên
    máy chủ"; sub của Nhật ký → "Nhật ký trên máy chủ · mỗi thao tác một dòng, có trước và sau". Mọi hậu tố "· ghi nhật ký" → "· đã lưu".
11. **Link sâu**: `proxy.ts` đặt header `x-pathname` = `request.nextUrl.pathname + search`; `requireAdmin()`/`requireSession()` đọc `headers()`
    để lấy `next` khi tham số không được truyền; `app/admin/layout.tsx` gọi `requireAdmin()` không tham số. Test Playwright: khách vãng lai mở
    `/admin/orders/DH-2430` → đăng nhập quản trị → về `/admin/orders/DH-2430`.
12. **Cột Khách của đơn vãng lai**: hiện `recipient` kèm hậu tố "· vãng lai" (`lib/admin-rows.ts`, có test); link hồ sơ chỉ khi có `profile_id`.
13. **QĐ-25** giữ: 0 request tới 54321; không khoá vào tệp commit; không email/thanh toán/vận chuyển. Không đổi thiết kế ngoài §2.9 và ô "Mã" chỉ đọc.

## 3. Spec

### 3.1 Migration `supabase/migrations/<ts>_catalog_admin.sql`

- `alter table public.promotions add column paused boolean not null default false`; `seed_promotions` (bảng `like`) tự có cột — `gen-seed.ts`
  ghi `false`; `reset_demo` chèn cột này; `catalog_snapshot` trả `paused`.
- Sửa `place_order`, `cancel_order`, `admin_cancel_order`, `expire_transfers` (§2.3); `events` constraint kind mới:
  `INVENTORY_ADJUSTED, DROP_ADDED, DROP_SCHEDULED, TEASER_ADDED, PROMO_ADDED, PROMO_EDITED, PROMO_PAUSED, PROMO_LIMIT_RAISED, PROMO_ENDED,
  PRODUCT_EDITED` (cột `product_id`/`promo_code`/`drop_no` điền tương ứng).
- 9 hàm mới (§2.2, §2.4–§2.7). `seed.sql`, `database.types.ts` sinh lại.

### 3.2 DAL, action

- `lib/db/admin.ts`: không cần hàm đọc mới (catalog đủ) ngoài `listEvents` đã có; `lib/db/event-dto.ts` thêm kind mới.
- `lib/actions/catalog-admin.ts` (`"use server"`): `adjustStock`, `addDrop`, `scheduleDrop`, `closeDropNow`, `addTeaser`, `addPromo`,
  `editPromo`, `pausePromo`, `raisePromoLimit`, `endPromo`, `updateProduct`; mỗi action `requireAdmin()` → kiểm đầu vào (luật đã có trong
  các sheet/form, chuyển sang module thuần `lib/catalog-admin.ts` có test) → rpc → `revalidatePath('/', 'layout')` → `ActionState`.
- `lib/teasers.ts`: `teaserSlug` (từ `admin-sim.ts`) + test.

### 3.3 Màn hình (nối dữ liệu, giữ markup)

`ProductsTable` + `InventoryAdjustSheet`, `AdminDropsScreen` + `DropFormModal` + `TeaserFormSheet`, `AdminPromotionsScreen` + `PromoFormSheet`
(ô "Mã" chỉ đọc khi sửa), `ProductForm` (lưu thật ở chế độ sửa; chế độ mới theo §2.9), `ActivityLogScreen` (kind mới), `SimBar`,
`AdminNav`, `AdminTop`/`DashboardScreen` (chữ §2.10), `app/admin/products/[id]/page.tsx` (`requireAdmin`, đọc `loadCatalog`), `app/admin/layout.tsx`.
Cửa hàng: `lib/promotions.ts` (`paused`), `components/cart/PromoBox` nếu hiện nhãn trạng thái mã.

### 3.4 Test

- `npm test`: `catalog-admin` (validator), `teasers`, `promotions` với `paused`, `admin-rows` (khách vãng lai), `event-dto` kind mới,
  `catalog-snapshot` với `paused`, `admin-sim.test.ts` xoá.
- `npm run test:db` (`lib/db/catalog-admin.dbtest.ts`, neo fixture trong test, trả về mốc thật khi xong): mỗi hàm một ca hợp lệ + một ca
  guard; `STALE` khi `before` lệch; `sold_out_at` đặt bởi `place_order` khi chiếc cuối đi và xoá khi điều chỉnh/huỷ trả hàng; mã `paused`
  bị `place_order` từ chối; `admin_end_promo` rồi `place_order` với mã đó → `PROMO_INVALID`; `admin_update_product` đổi slug thì
  `catalog_snapshot` trả slug mới và `order_lines` vẫn tham chiếu `product_id`; khách gọi bất kỳ hàm mới → `NOT_ADMIN`; mỗi hàm chèn đúng
  một sự kiện với payload đúng; `reset_demo` sau khi sửa vài thứ đưa catalog về đúng `FIXTURE_CATALOG`.
- Playwright (`db reset` + `seed:users`, đăng nhập quản trị): điều chỉnh tồn kho KHÓI đen XL 1 → 0 → PDP "XL hết", nhật ký có dòng, sửa lại
  → 1; tạo Số 07 (lịch tự đề xuất) → hiện ở "Các số" và cửa hàng ("Số 07 · sắp mở"); sửa lịch Số 06; đóng sớm Số 05 → trang chủ đổi sang
  Số đã đóng (rồi mở lại bằng sửa lịch cho các bước sau); thêm teaser → trang chủ hiện; tạo mã `TEST10` → giỏ áp được; tạm dừng → giỏ
  báo không dùng được; nâng giới hạn; kết thúc sớm; sửa giá KHÓI → PDP giá mới; `/admin/products/new` nút chuẩn bị; đăng nhập từ link sâu
  quay đúng trang; đặt lại dữ liệu mẫu → mọi thứ về seed; **0 request ngoài 3200**; sweep.

## 4. Kiểm nghiệm thu

1. `npx supabase db reset` sạch (5 migration + seed); `npm run seed:users` như B3a; `db:types`, `seed:gen` không đổi tệp commit.
2. Typecheck sạch; `npm test` xanh (ghi số); `npm run test:db` xanh; `npm run build` sạch với stack tắt.
3. Grep gate cũ giữ; thêm: `grep -rn "admin-sim\|SimContext\|useSim\b\|useSimNow\|brand.adminSim\|simLogRows\|mô phỏng" app components lib`
   → 0 (trừ chú giải lịch sử nếu có, liệt kê); `grep -rn "ghi nhật ký" components/admin` → 0.
4. Kịch bản Playwright §3.4, ảnh 390/1280 vào `.playwright-cli/shots/backend/b3b/`; sweep; `tools/backend-shots.js` → `…/b3b/after/` so `…/b3a/after/`.
5. Không khoá nào trong diff.

## 5. Sản phẩm nộp

Migration, seed + types sinh lại, DAL/actions/validators, màn hình đã nối, tệp mô phỏng đã xoá, ảnh, `sweep.json`, báo cáo 6 mục — mục 4 là
bảng hàm ↔ guard ↔ sự kiện và mọi chữ đã bỏ/đổi.

## Đọc trước khi sửa

Supabase (WebFetch): https://supabase.com/docs/guides/database/functions · https://supabase.com/docs/guides/database/postgres/row-level-security ·
https://www.postgresql.org/docs/current/functions-json.html. Next (cục bộ): `03-api-reference/03-file-conventions/proxy.md` (đặt header
request), `03-api-reference/04-functions/headers.md`, `02-guides/server-actions.md`. Dự án: brief và báo cáo B3a, `lib/admin-sim.ts`,
`lib/activity-log.ts`, `lib/admin-rows.ts`, `lib/promotions.ts`, `lib/inventory.ts`, `lib/sold-out-times.ts`, `components/admin/{ProductsTable,
InventoryAdjustSheet,AdminDropsScreen,DropFormModal,TeaserFormSheet,AdminPromotionsScreen,PromoFormSheet,ProductForm,SimBar,AdminNav}.tsx`,
`supabase/migrations/*`, `scripts/gen-seed.ts`, `lib/db/catalog-snapshot.ts`.
