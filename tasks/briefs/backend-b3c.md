# Brief — Lát B3c: ảnh mẫu lên Supabase Storage, hàm tạo mẫu, ảnh và thứ tự màu; mẫu của Số chưa mở ẩn với khách *(viết 24/09/2026, giao sau khi B3b ĐẠT)*

Agent: `backend-implementer`. Hồ sơ nền: `tasks/backend.md` (QĐ-25), brief B3b (`tasks/briefs/backend-b3b.md`) và **báo cáo của nó**
(tên hàm, mã lỗi trong `lib/catalog-admin.ts`, cách `updateProduct` gọi `admin_update_product` + `admin_adjust_stock`). Quyết định
người dùng: **QĐ-27** (`tasks/plan.md`, 24/09): ảnh tải lên lưu ở Supabase Storage, đi qua máy chủ; khách cắt ảnh trong trình duyệt
(khung kéo 4:5); màu chốt lúc cắt; ảnh mượn tạm vẫn chọn được, luôn có nhãn. Lát này **chỉ làm phần máy chủ và dữ liệu**; form
"Thêm mẫu" theo mock vòng 7 do `ui-implementer` dựng ở lát UI 7 (`tasks/briefs/v3-lat-7.md`) ngay sau lát này, **trên đúng hợp đồng
action ở §3.5** — đừng đổi tên, chữ ký hay mã lỗi mà không ghi vào báo cáo.

## 1. Lát

Sau lát này:

- Có **bucket `product-photos`** (công khai đọc, chỉ máy chủ ghi). Ảnh do quản trị tải lên nằm dưới khoá `up/<32 hex>.webp`; mọi ảnh
  mượn tạm vẫn là khoá ngắn (`khoi`, `reu`…) như cũ. `photo_key` trong `product_colors` mang một trong hai loại khoá.
- **Tải ảnh** là một Server Action nhận `FormData` (đã cắt và thu nhỏ ở trình duyệt, ≤ 1,5 MB, WebP hoặc JPEG), kiểm vai admin, kiểm
  byte đầu, đẩy lên bucket bằng khoá bí mật, trả khoá. Ảnh phục vụ qua **route của chính app** `/photos/<khoá>` (stream từ bucket,
  cache dài) rồi `next/image` như mọi ảnh khác → trình duyệt **vẫn không gọi Supabase**, `remotePatterns` không thêm host, không có
  biến `NEXT_PUBLIC_*`.
- **Tạo mẫu** (`admin_add_product`): tên, loại, họ, form, mã địa chỉ, giá, chất liệu, Số, 1–7 màu theo thứ tự dải, mỗi màu một ảnh, lưới
  cắt màu × size; `cut_units` = tổng lưới; sự kiện `PRODUCT_ADDED`.
- **Ảnh và thứ tự màu của mẫu đã có** (`admin_set_product_photo`, `admin_reorder_colors`): thay ảnh từng màu (mượn → thật, thật → thật),
  đổi thứ tự dải màu; **không thêm/bớt màu** (QĐ-27 câu 3). Sự kiện `PRODUCT_PHOTO_SET`, `PRODUCT_COLORS_REORDERED`.
- **Mẫu thuộc Số chưa mở không hiện với khách** (mock nói "tạo cho Số chưa mở thì lên kệ đúng giờ mở"): `catalog_snapshot()` bỏ mẫu có
  `drops.opens_at > now()` trừ khi `is_admin()`. Quản trị vẫn thấy đủ.
- **Đặt lại dữ liệu mẫu** xoá luôn ảnh đã tải lên (`up/*`) khỏi bucket; cron B4 dùng cùng hàm TS.
- `lib/activity-log.ts` biết ba loại sự kiện mới. Form hiện tại (`ProductForm`) **không dựng thêm ô nào** ở lát này — chỉ giữ typecheck;
  nút "Tạo mẫu mới · đang chuẩn bị" giữ nguyên tới lát UI 7.

Dependency: **không thêm gói nào** (`@supabase/supabase-js` đã có `storage`). Không `sharp`, không thư viện ảnh: kích thước ảnh do trình
duyệt quyết, máy chủ kiểm byte đầu và dung lượng.

## 1b. Từ báo cáo B3b

- Đọc báo cáo B3b trước khi sửa: tên hàm SQL và migration cuối cùng, `CATALOG_ERROR_CODES`, `catalogFailureMessage`, cách `updateProduct`
  gộp patch + `cells`, `readCells`, `PRODUCT_EDIT_REASON`, cách sự kiện được chèn (`events`), cách `reset_demo` được gọi từ TS
  ("Đặt lại dữ liệu mẫu" và `seed.sql`).
- Stack cục bộ đang tắt `storage` (`supabase/config.toml`, tỉa 23/09). Lát này **bật lại** `[storage] enabled = true`,
  `file_size_limit = "2MiB"`, để `[storage.image_transformation] enabled = false` (không cần imgproxy) → thêm ~1 container; ghi RAM đo được
  vào báo cáo. `npx supabase stop && npx supabase start` rồi `db reset`.
- Preview 3200 có thể đang chạy bản B3b — tắt rồi dựng lại. Cổng 3100 không đụng.

## 1c. Từ báo cáo B3b (24/09, ĐẠT) — những gì lát này phải khớp và hai việc nhỏ gộp vào

- Tên đã có: migration `20260924020000_catalog_admin.sql` (`catalog_snapshot` v2, `admin_update_product(p_id, p_patch, p_now)` với patch
  `name kind slug priceVnd material fit dropNo`, family suy từ loại; `admin_adjust_stock`; `admin_add_teaser` kiểm ảnh mượn; check
  `events_kind_check` + `events_product_check`/`events_promo_check`/`events_drop_check` — sự kiện mẫu phải ghi `product_id`).
  `lib/catalog-admin.ts`: `CATALOG_ERROR_CODES`, `catalogFailureMessage`, `CatalogMove`; `lib/actions/catalog-admin.ts`: 11 action,
  `updateProduct(id, form)` gộp patch + `cells` (lý do "Sửa mẫu"); `lib/actions/state.ts` `ActionState`; `lib/teasers.ts` `asciiSlug`;
  `lib/db/event-dto.ts` + `lib/activity-log.ts` cho 10 kind. Mã lỗi B3b: slug/mã trùng = `NOT_ALLOWED`, không đổi gì = `BAD_INPUT`.
  **Giữ cách đặt này**: `SLUG_TAKEN` ở §2.7/§3.3 đổi thành `NOT_ALLOWED` với message "Mã địa chỉ đã có mẫu khác dùng" (phân biệt bằng
  `CatalogMove`), `NO_CHANGE` = `BAD_INPUT` với message "Chưa có thay đổi nào để lưu."; các mã còn lại của §3.3 vẫn thêm mới.
- Đặt lại dữ liệu mẫu: action đang gọi `reset_demo(demo_anchor())` — nối `purgeUploadedPhotos()` vào đó (§3.3).
- **Việc nhỏ gộp vào (mở từ B3b):** (1) lịch đề xuất cho Số mới đang là "bây giờ + 7 ngày" nên Số 07 có thể mở trước Số 06; đề xuất =
  mở 20:00 ngày sau `closes_at` của Số cuối, đóng sau 14 ngày; `admin_add_drop` từ chối khung giờ chồng lên Số khác (`NOT_ALLOWED`,
  message "Lịch chồng lên Số NN"). (2) `photopick` của sheet teaser đã được phiên chính ép 44×55 (`admin.css`) — giữ.

## 2. Quyết định đã chốt (không hỏi lại)

1. **Ảnh qua máy chủ, phục vụ từ chính app.** Không host Supabase trong HTML; không `NEXT_PUBLIC_SUPABASE_URL`. Route `GET /photos/[...key]`
   chỉ nhận khoá khớp `^up/[0-9a-f]{32}\.webp$` (khác → 404), tải object từ bucket bằng client publishable (bucket công khai đọc), trả
   `Content-Type: image/webp`, `Cache-Control: public, max-age=31536000, immutable` (khoá là ngẫu nhiên theo nội dung nên bất biến).
   `photoUrl(key, w, q)`: khoá `up/…` → `/photos/<key>` (bỏ qua `w`, `q` — `next/image` tự đổi cỡ); khoá khác → Unsplash như cũ.
   Thêm `isUploadedKey(key)` và `UPLOAD_KEY_RE` xuất từ `lib/photos.ts`.
2. **Khoá bí mật chỉ cho Storage.** `lib/db/service.ts` (`import "server-only"`): `getServiceSupabase()` = `createClient(url,
   SUPABASE_SECRET_KEY)`, dùng **chỉ** cho `storage.from("product-photos").upload/remove/list`; **không** đọc/ghi bảng bằng client này
   (RLS là hàng rào của mọi truy vấn dữ liệu, giữ nguyên). Không có `SUPABASE_SECRET_KEY` → action tải ảnh trả `UNAVAILABLE`.
3. **Bucket tạo bằng migration**, không bằng dashboard: `insert into storage.buckets (id, name, public, file_size_limit,
   allowed_mime_types) values ('product-photos', 'product-photos', true, 1572864, array['image/webp','image/jpeg']) on conflict (id) do
   nothing;`. Không policy insert/update/delete nào trên `storage.objects` cho anon/authenticated (ghi chỉ qua service role). Đọc công khai
   do cờ `public` của bucket.
4. **Khoá object** = `up/` + 32 hex (`crypto.randomUUID()` bỏ gạch) + `.webp` (JPEG cũng lưu đuôi `.webp`? **Không** — giữ đúng đuôi:
   `.webp` hoặc `.jpg`; regex ở §2.1 và SQL nhận cả hai: `^up/[0-9a-f]{32}\.(webp|jpg)$`). Trình duyệt ưu tiên WebP, JPEG là dự phòng.
5. **Máy chủ kiểm**: dung lượng ≤ 1.572.864 byte; byte đầu `RIFF….WEBP` hoặc `FF D8 FF`; `type` khai báo khớp. Không kiểm kích thước
   pixel (không có thư viện ảnh; lát UI 7 thu về ≤ 1.200×1.500 và ghi rõ). `contentType` đúng, `cacheControl: "31536000"`,
   `upsert: false`.
6. **Khoá ảnh hợp lệ trong SQL** (dùng chung cho tạo mẫu, thay ảnh, teaser): hoặc là khoá mượn đang có (`exists` trong
   `product_colors.photo_key` ∪ `teasers.photo_key` ∪ `seed_product_colors.photo_key` ∪ `seed_teasers.photo_key`, đúng luật B3b), hoặc
   khớp regex `up/…` **và** `exists (select 1 from storage.objects where bucket_id = 'product-photos' and name = p_key)`. Sai →
   `PHOTO_UNKNOWN`. (`search_path = ''` nên viết đủ `storage.objects`.)
7. **Mẫu mới**: `id = 'p-' || slug`; `slug` `^[a-z0-9][a-z0-9-]{1,39}$`, chưa có trong `products.slug` và `products.id` (`SLUG_TAKEN`);
   TS sinh slug từ tên bằng `asciiSlug` (`lib/teasers.ts`) khi ô để trống, thêm `-2`, `-3` nếu trùng **trước** khi gọi SQL. `position` =
   max + 1. Số phải tồn tại (`DROP_NOT_FOUND`) và chưa đóng (`closes_at > p_now`, sai → `DROP_CLOSED`). 1–7 màu, không trùng
   (`NO_COLORS` / `BAD_INPUT`); mỗi màu tổng lưới ≥ 1 (`COLOR_EMPTY` kèm màu); mỗi ô 0..999; `cut_units` = tổng, > 0; `sold_out_at` null.
   Họ (`family`) do TS suy từ loại: mẫu đang có cùng `kind` → `family` của nó; loại chưa từng có → TS từ chối ("Loại chưa có trong mục
   lục") — loại mới là việc sau. `fit` là enum. Giá 1.000..99.999.999 ₫. Tên viết hoa theo `toLocaleUpperCase("vi")`, ≤ 40 ký tự.
8. **Thay ảnh** trả khoá cũ; nếu khoá cũ là `up/…` và **không còn** dòng nào (`product_colors`, `teasers`) dùng nó, action TS xoá object
   sau khi SQL xong (best effort, lỗi xoá chỉ ghi console). **Đổi thứ tự** phải là hoán vị đúng tập màu hiện có; giống thứ tự cũ →
   `NO_CHANGE` (TS chặn trước, SQL vẫn kiểm). Viết lại `position` hai pha (âm rồi dương) để không vấp `unique (product_id, position)`.
9. **Ảnh tải lên mà chưa gắn** (đóng form, huỷ) là rác chấp nhận được: `removeUploadedPhoto(key)` cho UI dọn khi biết; "Đặt lại dữ liệu
   mẫu" xoá toàn bộ `up/*` (`list` phân trang 100 + `remove`); cron B4 gọi cùng hàm.
10. **Ẩn mẫu của Số chưa mở** ở `catalog_snapshot()` theo `now()` của Postgres (đồng hồ thật từ B3a) — **không** ở TS, để `/products/<slug>`
    của mẫu ấy tự 404 với khách và `place_order` không thấy mẫu (giữ luật hiện có của `place_order` về Số đang mở; không nới).
11. **Sự kiện** thêm vào check `events.kind`: `PRODUCT_ADDED { id, name, slug, dropNo, colors, cutUnits, uploaded, borrowed }`,
    `PRODUCT_PHOTO_SET { id, color, before, after }`, `PRODUCT_COLORS_REORDERED { id, before, after }`. `lib/activity-log.ts` hiện:
    "Thêm mẫu SỎI · Số 06 · 3 màu · 36 chiếc", "Thay ảnh Đen của KHÓI", "Đổi thứ tự màu KHÓI: Kem · Đen".
12. **Giới hạn thân request** Server Action: nâng theo tài liệu `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`
    lên `"2mb"` (một ảnh ≤ 1,5 MB + trường). Chỉ nâng đúng khoá cấu hình tài liệu ghi.
13. **Không đổi ranh giới**: agent không sửa `prototype/`, `DESIGN.md`, `PRODUCT.md`, `tasks/`, `.impeccable/`, `.claude/`, `tools/`
    (trừ khi brief nêu). Không commit. Không key trong tệp commit hay báo cáo.

## 3. Đặc tả

### 3.1 Migration `supabase/migrations/2026092404xxxx_photos.sql`

- Bucket (§2.3). Hàm `public.photo_key_ok(p_key text) returns boolean` (security definer, `search_path = ''`) theo §2.6; **dùng lại** trong
  `admin_add_teaser` (thay đoạn kiểm hiện có, giữ hành vi cũ cho khoá mượn).
- `admin_add_product(p_input jsonb, p_now timestamptz) returns text` — §2.7; `p_input` = `{ name, kind, family, fit, slug, priceVnd,
  material, dropNo, colors: [{ color, photoKey }], cells: { [color]: { S, M, L, XL } } }`; thứ tự `colors` = `position` 1..n; chèn
  `products`, `product_colors`, `stock_cells` (đủ 4 size, 0 cho phép), sự kiện; trả id.
- `admin_set_product_photo(p_id text, p_color public.color_key, p_photo_key text, p_now timestamptz) returns text` (khoá cũ) — §2.8;
  `NOT_FOUND` mẫu/màu; `NO_CHANGE` nếu cùng khoá.
- `admin_reorder_colors(p_id text, p_colors public.color_key[], p_now timestamptz) returns void` — §2.8.
- `catalog_snapshot()` — §2.10 (bỏ mẫu của Số chưa mở trừ admin; teaser không đổi).
- `events.kind` check mở rộng (§2.11). `reset_demo` không đổi (ảnh dọn ở TS).
- Mọi hàm: `is_admin()` đầu tiên, `assert_now(p_now)`, `security definer`, `set search_path = ''`, `raise exception using message =
  '<MÃ>'` như B3a/B3b; grant execute cho `authenticated`, revoke `anon` với hàm `admin_*`.

### 3.2 Cấu hình

- `supabase/config.toml`: `[storage] enabled = true`, `file_size_limit = "2MiB"`, image transformation tắt. Ghi chú ngày và lý do.
- `next.config.mjs`: `bodySizeLimit` (§2.12). `remotePatterns` **không đổi**.
- `npm run db:types` chạy lại; `lib/db/database.types.ts` commit kèm.

### 3.3 TS máy chủ

- `lib/db/service.ts` (§2.2). `lib/photos.ts` (§2.1). `app/photos/[...key]/route.ts` (§2.1; `export const dynamic = "force-static"`?
  **Không** — route đọc bucket lúc gọi, để mặc định; cache bằng header). `robots`: thêm `/photos/` vào `Disallow` nếu app có
  `robots.ts`.
- `lib/actions/catalog-admin.ts` (giữ tệp B3b): thêm bốn action (§3.5). Kiểm vai bằng `requireAdmin` như các action B3b; mọi lỗi thành
  `ActionState` qua `catalogFailureMessage` với mã mới: `SLUG_TAKEN` "Mã địa chỉ đã có mẫu khác dùng", `DROP_CLOSED` "Số đã đóng, không thêm
  mẫu vào đó", `NO_COLORS` "Chọn ít nhất một màu", `COLOR_EMPTY` "Điền số cắt cho {màu}", `PHOTO_MISSING` "Chọn ảnh cho {màu}",
  `PHOTO_UNKNOWN` "Ảnh không còn trên kho, chọn lại", `NO_CHANGE` "Chưa có thay đổi nào để lưu", `UPLOAD_BAD` "Tệp không phải WebP/JPEG
  hoặc nặng hơn 1,5 MB", `UNAVAILABLE` giữ nghĩa cũ.
- `lib/catalog-admin.ts` (thuần, có test): `readNewProduct(form, catalog)` → `Checked<NewProductInput>`; `productSlug(name)`;
  `uniqueSlug(base, catalog)`; `familyOfKind(catalog, kind)`; `readPhotoMap`, `readColorOrder`; mở rộng `CATALOG_ERROR_CODES`,
  `CatalogMove` (`ADD_PRODUCT`, `SET_PHOTO`, `REORDER_COLORS`, `UPLOAD_PHOTO`).
- `lib/actions/demo.ts` (hay tệp đang giữ "Đặt lại dữ liệu mẫu"): sau `reset_demo`, gọi `purgeUploadedPhotos()` (`lib/db/photos.ts`:
  list `up/` phân trang, remove theo lô 100; trả số xoá). Xuất riêng để B4 gọi từ route cron.
- `lib/activity-log.ts` + test: ba loại mới (§2.11).
- `ProductForm.tsx`: chỉ những gì cần để typecheck (không thêm ô). Nếu B3b đã để nút "Tạo mẫu mới · đang chuẩn bị", giữ.

### 3.4 Test

- `lib/db/catalog-admin.dbtest.ts` (giữ `fileParallelism: false`): tạo mẫu đủ 3 màu (2 ảnh mượn + 1 `up/` tải lên thật bằng service client
  trong test rồi xoá cuối test) → `catalog_snapshot()` với admin có mẫu, với khách/anon **không có** khi Số chưa mở, **có** khi Số đang
  mở; từng từ chối: `SLUG_TAKEN`, `DROP_CLOSED`, `DROP_NOT_FOUND`, `NO_COLORS`, `COLOR_EMPTY`, `PHOTO_UNKNOWN` (khoá `up/` không tồn tại),
  `BAD_INPUT` (màu trùng, ô 1000, giá 0), `NOT_ADMIN`; thay ảnh trả khoá cũ, `NO_CHANGE`; đổi thứ tự hoán vị đúng/sai; ba sự kiện có
  payload đúng; `assert_now` kẹp. `place_order` từ chối mẫu của Số chưa mở (mã hiện có).
- `lib/catalog-admin.test.ts`: `readNewProduct` mọi nhánh; `productSlug("SỎI") === "soi"`, `uniqueSlug` thêm `-2`; `familyOfKind`.
- `lib/photos.test.ts`: `photoUrl("up/<hex>.webp")` → `/photos/…`; khoá mượn không đổi; `isUploadedKey`.
- Route `/photos`: test bằng playwright cli hoặc `fetch` trong `tools/backend-shots.js` bản B3c: 200 + header cache cho khoá thật
  (tải lên trong kịch bản), 404 cho khoá lạ, 404 cho `up/../x`.
- Không mock Supabase trong test đơn vị; test DB chạy trên stack thật (storage bật).

### 3.5 Hợp đồng action (lát UI 7 dựa vào đây — không đổi)

```ts
// lib/actions/catalog-admin.ts
export async function uploadProductPhoto(form: FormData): Promise<ActionState & { key?: string }>;
//   form.get("file"): Blob WebP/JPEG ≤ 1,5 MB · form.get("color"): ColorKey (chỉ để ghi lỗi) → ok + key "up/<hex>.webp|jpg"
export async function removeUploadedPhoto(key: unknown): Promise<ActionState>;
//   chỉ xoá khoá up/ chưa được dòng nào dùng; khoá đang dùng → NO_CHANGE
export async function createProduct(draft: unknown): Promise<ActionState & { id?: string }>;
//   draft = { name, kind, fit, slug?, priceVnd, material, dropNo, colors: ColorKey[] (thứ tự dải),
//             photos: Record<ColorKey, string> (khoá mượn hoặc up/), cells: Record<ColorKey, Record<Size, number>> }
export async function updateProduct(id: unknown, form: unknown): Promise<ActionState>;
//   giữ B3b, thêm hai trường tuỳ chọn: colors?: ColorKey[] (thứ tự mới, phải là hoán vị) · photos?: Partial<Record<ColorKey, string>>
//   (chỉ màu đổi ảnh). Thứ tự gọi: admin_update_product (nếu patch) → admin_adjust_stock (nếu cells) → admin_reorder_colors →
//   admin_set_product_photo từng màu → xoá object cũ không còn dùng. Lỗi ở bước nào thì message nói bước đó, các bước trước vẫn giữ.
```

Mọi action: `requireAdmin`, `revalidatePath("/admin/products")`, `/admin/products/[id]`, `/products`, `/products/[slug]`, `/` như B3b.

## 4. Nghiệm thu

- `npm run typecheck`, `npm test`, `npm run test:db` xanh; `npm run build` đủ route (thêm `ƒ /photos/[...key]`).
- `tools/backend-shots.js` bản B3c (OUT `.playwright-cli/shots/b3c/after`): đăng nhập quản lý; kịch bản qua `fetch`/`page.request`
  **không** cần form mới: (1) tải một ảnh 3:2 nhỏ tự sinh (canvas trong playwright → WebP) qua action? — action chỉ gọi được từ UI; thay
  bằng **test DB** cho SQL và **route** `/photos` cho phục vụ: tải lên bằng service client trong script, mở `/photos/<key>` → 200, header
  cache, `content-type: image/webp`; `/photos/up/zz.webp` → 404; `/photos/khoi` → 404. (2) Sau khi test DB tạo mẫu SỎI cho Số 05 (đang
  mở) rồi **không** dọn: `/products` với khách hiện SỎI với ảnh qua `/_next/image?url=%2Fphotos%2Fup%2F…`, 0 request ngoài 3200;
  `/admin/products` có SỎI; đổi Số của SỎI sang 06 (upcoming) bằng `admin_update_product` → khách không thấy, admin thấy; "Đặt lại
  dữ liệu mẫu" → SỎI biến mất **và** bucket không còn `up/*` (list = 0). Chụp: `/products` có SỎI, PDP SỎI, `/admin/products`, `/admin/log`
  có ba dòng sự kiện, sau đặt lại.
- Sweep `tools/layout-sweep.js` không đổi kết quả (0/0/0/0).
- Báo cáo: RAM stack sau khi bật storage; dung lượng object thật; số lệnh; danh sách mã lỗi và message; những gì lát UI 7 cần biết ngoài
  §3.5 (nếu có).

## 5. Bàn giao

Sáu mục như B3a/B3b; kèm: migration cuối, `config.toml` diff, `next.config` diff, `database.types.ts` đã sinh, bảng mã lỗi ↔ message,
đường dẫn ảnh chụp. **Không commit.**

## Đọc trước khi sửa

`AGENTS.md` → tài liệu Next 16 về Server Actions (`bodySizeLimit`), Route Handlers, `next/image` (`remotePatterns`, src tương đối) →
`tasks/backend.md` → brief + báo cáo B3b → migration B3b (`admin_add_teaser`, `admin_update_product`, `admin_adjust_stock`,
`catalog_snapshot`, check `events.kind`) → `lib/catalog-admin.ts`, `lib/actions/catalog-admin.ts`, `lib/photos.ts`, `lib/activity-log.ts`
và test bên cạnh → `lib/db/server.ts`, `lib/db/session.ts` → `supabase/config.toml` → tài liệu Supabase Storage (`storage.from().upload`,
`list`, `remove`, bucket public, `storage.objects`).
