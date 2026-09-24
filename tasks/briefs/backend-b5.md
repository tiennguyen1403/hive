# Brief B5 — Mẫu cố định: mẫu không thuộc Số nào, tiền tố Số trong tên, nhập thêm hàng

*25/09/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit. Không đụng `prototype/`, `DESIGN.md`,
`PRODUCT.md`, `README.md`, `tasks/`, `.impeccable/`, `.claude/`, `tools/` (cần sửa tool thì đưa bản vá vào báo cáo).
**Không đọc `.env.hosted.local`, không chạy gì trỏ vào dự án hosted** (không `supabase link/push`, không `vercel` CLI):
mọi kiểm chạy trên stack Docker cục bộ; người dùng tự đẩy migration lên hosted sau khi phiên chính duyệt. **Studio và
pg_meta của stack cục bộ đã tắt có chủ ý** (`supabase/config.toml`): đừng bật lại.*

## 1. Lát

Người dùng muốn, bên cạnh các Số (cắt một lần, hết là hết), có **mẫu cố định**: đồ cơ bản không thuộc Số nào, bán mọi
lúc, hết size nào thì nhập thêm size đó. Thiết kế đã duyệt qua bốn vòng trên bảng `prototype/v3/line.html` (người dùng
duyệt vòng 4 ngày 25/09; bản ghi trong `tasks/plan.md`, mục "mẫu cố định vòng 1–4"). Lát này làm **phần dữ liệu và luật**;
hai lát giao diện theo sau (lát 11 cửa hàng, lát 12 quản trị) dựng màn hình trên nền này.

| Việc | Có | Không |
|---|---|---|
| Mô hình | `drop_no` và `cut_units` được null (null cả hai = mẫu cố định); snapshot, đặt hàng, thêm mẫu, sửa mẫu, chỉnh tồn, đánh dấu hết hiểu mẫu cố định | không bảng mới, không cột mới ngoài nới hai ràng buộc, không đổi `stock_cells` |
| Nhập thêm | lý do `Nhập thêm` trong `admin_adjust_stock`, chỉ cho mẫu cố định, chỉ tăng; action `restockProduct` | không giao diện (lát 12 dựng sheet và mục menu) |
| Dữ liệu mẫu | tám mẫu cố định trong `data/catalog.ts`; `slug` mẫu theo Số và mẫu hé lộ mang tiền tố `s05-`; seed sinh lại | không đổi `id` nào; không đổi giá, tồn, màu, ảnh của mẫu có sẵn |
| Luật thuần | `issueCode`, `styleName`, `isFixed`, `productsOnSale`, `fixedLowCells`, `slugFor` + test | không đổi `LOW_STOCK_AT` của mẫu theo Số |
| Giữ app chạy | mọi chỗ TypeScript báo vì null được xử lý tối thiểu, không trang nào vỡ với mẫu cố định | **không thiết kế giao diện**: lát 11/12 làm; chỉ ẩn thứ sẽ in sai (ví dụ "/ null chiếc đã cắt") |
| Việc tồn từ lát 10 | `proxy.ts` matcher bỏ các route metadata | — |

## 1b. Đã có sẵn (phiên chính đọc mã 25/09)

- `products.drop_no integer not null references drops`, `cut_units integer not null check (> 0)`
  (`20260923083130_catalog.sql`); `seed_products` là `like products including all` nên mang cùng ràng buộc.
- `catalog_snapshot()` bản mới nhất ở `20260924040000_photos.sql`: bỏ mẫu của Số chưa mở trừ khi `is_admin()`.
- `place_order` bản mới nhất ở `20260924020000_catalog_admin.sql`: `join public.drops d on d.no = p.drop_no` rồi
  `DROP_CLOSED` khi ngoài khung mở–đóng.
- `admin_adjust_stock(p_product_id, p_cells, p_reason, p_ref, p_note, p_now)`: lý do trong
  `['Hàng trả về', 'Kiểm kê lệch', 'Hư hỏng', 'Khác', 'Sửa mẫu']`; ô gửi `before`/`after`; từ chối khi tổng tồn > `cut_units`;
  ghi sự kiện `INVENTORY_ADJUSTED`; gọi `sync_sold_out`.
- `admin_add_product(p_input jsonb, p_now)` (`photos.sql`), `admin_update_product` (`catalog_admin.sql`, cho đổi `drop_no`).
- `data/catalog.ts`: `styles: Array<Omit<Product, "id">>`, `CATALOG` gán `id = p-${slug}` — **id suy từ slug**. `TEASERS`
  có `slug` là khoá chính. `ORDERS` và nhiều test tham chiếu id `p-khoi`…
- `data/types.ts` `Product.cutUnits: number`, `dropNo: number`. Dòng đơn chỉ mang `productId`; tên lấy từ catalogue.
- `photo_key_ok()`: khoá mượn hợp lệ là khoá một mẫu/mẫu hé lộ đang dùng hoặc khoá của seed.
- `lib/inventory.ts` `LOW_STOCK_AT = 3` (tổng của mẫu theo Số).
- Việc tồn lát 10: `proxy.ts` vẫn chạy trên `/opengraph-image`, `/twitter-image`, `/manifest.webmanifest`; docs Next khuyên
  loại các route metadata khỏi matcher.

## 2. Quyết định đã chốt (không hỏi lại)

1. **Mẫu cố định = `drop_no is null`**, và khi đó `cut_units is null` (không có "số cắt"); mẫu theo Số giữ nguyên hai cột
   not-null như cũ. Ràng buộc: `(drop_no is null) = (cut_units is null)`; `sold_out_at` chỉ có trên mẫu theo Số.
2. **Bán mọi lúc.** `catalog_snapshot()` luôn có mẫu cố định (cả khách lẫn quản lý). `place_order` không kiểm khung Số cho
   mẫu cố định; kiểm tồn như mọi mẫu. Giữa hai Số, mẫu cố định vẫn đặt được.
3. **Không bao giờ "hết là hết".** `sync_sold_out` không bao giờ đặt `sold_out_at` cho mẫu cố định (hết cả kệ vẫn là "tạm
   hết", sẽ có lại).
4. **Nhập thêm là một lý do của `admin_adjust_stock`**: `'Nhập thêm'`. Chỉ nhận khi mẫu là cố định, và **mọi ô gửi lên phải
   `after > before`**; sai thì `BAD_INPUT`. Các lý do cũ vẫn dùng được cho mẫu cố định (kiểm kê, hư hỏng…). Trần tổng
   `cut_units` chỉ áp khi `cut_units` không null. Sự kiện vẫn là `INVENTORY_ADJUSTED` với lý do trong payload.
5. **Không đổi loại sau khi tạo.** `admin_update_product` từ chối (`BAD_INPUT`) đổi `drop_no` từ null sang số hoặc ngược
   lại; đổi giữa các Số giữ luật cũ.
6. **Thêm mẫu cố định**: `admin_add_product` nhận `dropNo: null`; lưới ô là tồn ban đầu; `cut_units` null. Mẫu theo Số giữ
   luật cũ (`cut_units` = tổng lưới).
7. **Tên hiển thị = mã Số + tên**, sinh lúc hiển thị, **không lưu** vào cột `name`: `issueCode(5) = "S05"`,
   `styleName(name, dropNo)` = `"S05 – KHÓI"` (khoảng trắng không ngắt trước gạch ngang ngắn U+2013, khoảng trắng
   thường sau) với mẫu theo Số, `name` nguyên vẹn với mẫu cố định. Mẫu hé lộ dùng cùng hàm với Số của nó.
8. **Đường dẫn mẫu theo Số mang tiền tố**: `slug` = `s05-khoi` (tên có thể dùng lại ở Số sau). Áp cho **mọi** mẫu theo Số và
   mẫu hé lộ trong fixture. **`id` giữ nguyên** (`p-khoi`…): đơn, sự kiện, test tham chiếu id không đổi. Mẫu cố định: slug là
   tên mô tả không dấu (`ao-thun-tron`). `slugFor(name, dropNo)` sinh slug tự động của form thêm mẫu: `s06-` + slug tên cho
   mẫu theo Số, slug tên cho mẫu cố định; `uniqueSlug` giữ luật chống trùng cũ. **Đường dẫn cũ** `/products/<slug cũ>` chuyển
   hướng vĩnh viễn (308) sang đường dẫn mới khi đúng một mẫu theo Số có slug `sNN-<slug cũ>`.
9. **Sắp hết của mẫu cố định** = có ít nhất một ô (màu × size) còn ≤ 2: `FIXED_LOW_AT = 2`. Luật tổng `LOW_STOCK_AT = 3` của
   mẫu theo Số không đổi.
10. **Đang bán** = mẫu của Số đang mở (kể cả mẫu đã hết của Số đó) + mọi mẫu cố định (kể cả mẫu tạm hết). Thứ tự: theo
    `position` như cũ; tám mẫu cố định đứng sau mọi mẫu có sẵn.
11. **Ảnh tám mẫu cố định là hình phẳng**, khoá `flat-<dáng>-<màu>` (bảng §3.4). Lát này **chỉ ghi khoá** vào fixture; tệp
    ảnh và ánh xạ trong `lib/photos.ts` do lát 11 làm (tới lúc đó `photoUrl` rơi về khung `hero` như mọi khoá lạ — chấp nhận).
12. Không gói mới, không `NEXT_PUBLIC_*`, không đổi `next.config.mjs`, không đổi tần suất đặt lại. `reset_demo` chỉ đổi nếu
    cần để chép hàng có `drop_no` null (đo trước, ghi lý do).

## 3. Đặc tả

### 3.1 Migration `supabase/migrations/20260925090000_fixed_styles.sql`

- `products` và `seed_products`: bỏ not-null của `drop_no`, `cut_units`; giữ `check (cut_units > 0)` cho giá trị không null;
  thêm check `(drop_no is null) = (cut_units is null)` và `(drop_no is not null or sold_out_at is null)`.
- `catalog_snapshot()`: điều kiện lọc thêm `p.drop_no is null`; JSON `dropNo`, `cutUnits` là `null` cho mẫu cố định.
- `place_order`: `left join` Số; kiểm khung chỉ khi `p.drop_no is not null`; mọi lỗi khác giữ nguyên.
- `admin_add_product`, `admin_update_product`, `admin_adjust_stock`, `sync_sold_out`: theo §2.3–2.6.
- Mọi hàm thay thế giữ `security definer`, `set search_path = ''`, quyền `execute` như bản trước; chú giải đầu tệp nói hàm nào
  thay bản ở tệp nào. Sinh lại `lib/db/database.types.ts`.

### 3.2 Kiểu và DAL

- `data/types.ts`: `dropNo: number | null`, `cutUnits: number | null`, cập nhật doc comment (câu "Never restocked — that is
  the model" chỉ còn đúng với mẫu theo Số). Tương tự cho kiểu `Teaser` nếu cần (mẫu hé lộ luôn có Số: giữ `number`).
- `lib/db/catalog.ts` và `catalog-snapshot.ts` đọc được null; `data/fixture-catalog.ts` như vậy.
- Mọi chỗ TypeScript báo lỗi: xử lý tối thiểu, đúng nghĩa. Mẫu cố định **không** vào `productsInDrop`, doanh thu Số, bảng
  "hết lúc nào", "Còn ít" trên bìa, số mẫu của Số. Trang mẫu của mẫu cố định không in dòng Số/đồng hồ/"chiếc đã cắt" và không
  vỡ; giỏ, thanh toán, xác nhận, đơn của tôi, quản trị đơn chạy được với dòng mẫu cố định. **Đừng thiết kế** gì thêm: liệt
  kê từng chỗ đã chạm và cách xử lý trong báo cáo để lát 11/12 làm tiếp.

### 3.3 Luật thuần (mỗi hàm một test bên cạnh)

- `lib/lexicon.ts`: `issueCode(no)`, `styleName(name, dropNo)` theo §2.7 (test: 5 → "S05", 12 → "S12", mẫu cố định trả
  nguyên tên, ký tự U+00A0 và U+2013 đúng chỗ).
- `lib/inventory.ts`: `isFixed(p)`, `productsOnSale(catalog, now?)` theo §2.10 (dùng `dropState` như chỗ khác; kiểm cả lúc
  giữa hai Số: chỉ còn mẫu cố định), `FIXED_LOW_AT = 2`, `fixedLowCells(p)` trả các ô ≤ 2 theo thứ tự màu rồi size,
  `isRunningLow(p)` cho mẫu cố định.
- `lib/catalog-admin.ts` (hoặc nơi `uniqueSlug` đang ở): `slugFor(name, dropNo)`; form thêm mẫu nhận "Cố định" (`dropNo`
  null) ở luật đọc form (`readNewProduct` / `lib/product-form.ts` — theo chỗ luật đang ở).

### 3.4 Dữ liệu mẫu (`data/catalog.ts`, rồi `npm run seed:gen`)

Tám mẫu, nối **sau** mọi mẫu có sẵn, đúng thứ tự và số liệu của bảng đã duyệt (`prototype/v3/line/line-mock.js`, hằng
`LINE`). Tồn theo thứ tự S, M, L, XL:

| slug | name | kind | family | material | fit | giá | màu → tồn | ảnh |
|---|---|---|---|---|---|---|---|---|
| `ao-thun-tron` | ÁO THUN TRƠN | Áo thun | TEE | Cotton 220gsm | REGULAR | 400.000 | white 10·14·11·6, black 8·12·9·5, grey 6·9·7·4 | `flat-tee-white`, `flat-tee-black`, `flat-tee-grey` |
| `ao-thun-tay-dai` | ÁO THUN TAY DÀI | Áo thun tay dài | TEE | Cotton 220gsm | REGULAR | 450.000 | black 5·8·6·3, white 6·7·5·3 | `flat-longsleeve-black`, `flat-longsleeve-white` |
| `hoodie-tron` | HOODIE TRƠN | Áo hoodie | HOODIE | Nỉ bông 340gsm | OVERSIZE | 750.000 | grey 5·0·4·2, black 4·0·6·3, cream 3·0·2·2 | `flat-hoodie-grey`, `flat-hoodie-black`, `flat-hoodie-cream` |
| `ao-khoac-du` | ÁO KHOÁC DÙ | Áo khoác dù | JACKET | Dù 1 lớp | OVERSIZE | 850.000 | black 3·5·4·3, navy 3·4·3·3 | `flat-jacket-black`, `flat-jacket-navy` |
| `gile-phao` | GILE PHAO | Áo gile phao | VEST | Dù chần bông | REGULAR | 750.000 | black 3·5·5·2 | `flat-vest-black` |
| `so-mi-oxford` | SƠ MI OXFORD | Áo sơ mi oxford | SHIRT | Cotton oxford | REGULAR | 590.000 | white 4·7·6·3, navy 3·5·4·3 | `flat-shirt-white`, `flat-shirt-navy` |
| `quan-kaki` | QUẦN KAKI | Quần kaki | PANTS | Kaki 280gsm | REGULAR | 650.000 | cream 3·5·4·3, black 4·7·6·3 | `flat-trousers-cream`, `flat-trousers-black` |
| `quan-short-ni` | QUẦN SHORT NỈ | Quần short nỉ | PANTS | Nỉ da cá 300gsm | REGULAR | 450.000 | grey 5·6·5·0, black 6·9·7·0 | `flat-shorts-grey`, `flat-shorts-black` |

`dropNo: null`, `cutUnits: null`, không `soldOutAt`. Họ `VEST` và màu `navy`, `grey` phải có sẵn trong enum; nếu thiếu thì
**dừng và hỏi** (đừng thêm enum). Id theo luật cũ: `p-ao-thun-tron`…

Đổi slug mẫu theo Số và mẫu hé lộ sang `s<NN>-<slug cũ>` (§2.8), **không đổi id**: chọn cách ít đụng nhất (id tường minh cho
từng dòng hay suy từ slug cũ), ghi lý do. Sửa mọi test, link cố định trong app (ví dụ "Bảng số đo" ở chân trang
`/products/khoi#size`) theo slug mới. `catalog.test.ts` ghim thêm tám mẫu. `tools/layout-sweep.js` có route theo slug cũ thì
đưa bản vá vào báo cáo (đừng sửa `tools/`).

### 3.5 Action

- `lib/actions/catalog-admin.ts`: `restockProduct(productId, cells: { color; size; before; add }[])` → `admin_adjust_stock`
  với `after = before + add`, lý do `Nhập thêm`; kiểm đầu vào như các action cùng tệp (`add` nguyên 1–999); giới hạn tần suất
  `admin` như mọi action quản trị; trả lỗi dạng giá trị như `adjustStock`. `createProduct` nhận mẫu cố định.
- Đường dẫn cũ chuyển hướng: trong `app/products/[slug]/page.tsx` (dùng `permanentRedirect` theo docs Next trong
  `node_modules/next/dist/docs/`).

### 3.6 `proxy.ts`

Matcher loại `opengraph-image`, `twitter-image`, `manifest.webmanifest`, `icon`, `apple-icon`, `favicon.ico` theo mẫu trong
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (đọc để lấy đúng cú pháp). Kiểm: gọi
từng route metadata không đi qua proxy (log hoặc header), các route khác vẫn qua.

## 4. Nghiệm thu

- `npm run typecheck` sạch; `npm test` xanh kể cả test mới; `npx supabase db reset` sạch; types sinh lại khớp tệp;
  `npm run build` sạch.
- `npm run test:db` xanh (cũ + tệp mới `lib/db/fixed-styles.dbtest.ts`):
  - anon đọc snapshot thấy tám mẫu cố định với `dropNo`/`cutUnits` null, lúc Số 05 mở **và** với `p_now` giữa hai Số;
  - `place_order` một mẫu cố định với `p_now` ngoài mọi khung Số → thành công, trừ tồn; mẫu của Số đã đóng vẫn `DROP_CLOSED`;
  - `admin_adjust_stock` mẫu cố định vượt tổng ban đầu → được; mẫu theo Số vượt `cut_units` → `BAD_INPUT` như cũ;
  - lý do `Nhập thêm`: mẫu cố định, mọi ô tăng → được; một ô không tăng → `BAD_INPUT`; mẫu theo Số → `BAD_INPUT`;
  - bán hết mọi ô của một mẫu cố định → `sold_out_at` vẫn null;
  - `admin_add_product` mẫu cố định → hàng có `drop_no`/`cut_units` null, ô đúng lưới; `admin_update_product` đổi cố định ↔
    Số → `BAD_INPUT`;
  - `reset_demo` trả lại đúng tám mẫu và tồn ban đầu sau khi đã bán/nhập thêm.
- Preview 3200 trên stack cục bộ (`npm run seed:users` đã chạy). Ảnh vào `.playwright-cli/shots/backend/b5/`:
  1. `/products/ao-thun-tron` ở 390 và 1280: trang dựng được, không dòng Số, không "chiếc đã cắt" (`pdp-fixed-{390,1280}.png`);
  2. thêm ÁO THUN TRƠN màu Đen size M vào giỏ → thanh toán → xác nhận đơn (`order-fixed-390.png`);
  3. `/products/khoi` → 308 sang `/products/s05-khoi` (ghi mã trạng thái trong báo cáo);
  4. `/products` và `/` ở 390: vẫn như trước ngoài đường dẫn thẻ (`products-390.png`, `home-390.png`);
  5. quản trị: `/admin/products/p-ao-thun-tron` mở được (`admin-edit-fixed-1280.png`).
- Sweep `tools/layout-sweep.js`: 0 console / 0 tràn / 0 chữ < 11px / 0 request ngoài 3200 (tồn dư như lát trước).

## 5. Bàn giao

Báo cáo theo hợp đồng sáu mục, kèm: danh sách mọi chỗ đã xử lý null (tệp + cách) cho lát 11/12; cách giữ id khi đổi slug;
bản vá `tools/` nếu có; mã trạng thái của chuyển hướng; `reset_demo` có phải đổi không và vì sao. Không commit.

## Ngoài phạm vi (đừng làm)

Giao diện của mẫu cố định (danh sách tất cả mẫu, `/so/N` cho Số đang mở, biển Số trên ảnh, SOLD OUT cỡ mới, tiền tố trên
màn, "Đang bán" trên trang chủ, tab quản trị, sheet nhập thêm, form "Cố định"): lát 11 và 12. Tệp ảnh hình phẳng: lát 11.
Thêm màu cho mẫu đã tạo; báo khi có lại; ngày may lại; giá theo màu; đổi tần suất đặt lại; CI.

## Đọc trước khi sửa

`supabase/migrations/*.sql` (bản mới nhất của từng hàm ở trên) · `data/types.ts` · `data/catalog.ts` ·
`data/fixture-catalog.ts` · `scripts/gen-seed.ts` (+ test) · `lib/db/catalog.ts` · `lib/db/catalog-snapshot.ts` ·
`lib/inventory.ts` · `lib/lexicon.ts` · `lib/drop.ts` · `lib/catalog-admin.ts` · `lib/product-form.ts` ·
`lib/actions/catalog-admin.ts` · `lib/db/catalog-admin.dbtest.ts` và `orders.dbtest.ts` (mẫu test) ·
`app/products/[slug]/page.tsx` · `proxy.ts` · `prototype/v3/line/line-mock.js` (hằng `LINE`, chỉ đọc) · `tasks/backend.md`
§6, §9 · docs Next trong `node_modules/next/dist/docs/` (redirect, proxy).
