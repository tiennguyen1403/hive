# Brief B6: chi tiết may của mẫu (`details`)

*27/09/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `tasks/`, `.impeccable/`, `.claude/`, `tools/`.
- **Không đọc `.env.hosted.local`, không chạy gì trỏ vào dự án hosted** (không `supabase link/push`, không `vercel` CLI).
  Mọi phép kiểm chạy trên stack Docker cục bộ. Người dùng tự đẩy migration lên hosted khi deploy.
- Studio và pg_meta của stack cục bộ đã tắt có chủ ý: đừng bật lại.
- Máy xem thử 3200 đang chạy bản dựng của lát v4 1a. Được dừng và khởi lại theo cách trong định nghĩa agent.

## 1. Lát

Đợt v4 đưa giao diện Feed vào app (cuối `tasks/plan.md`, mục "Đợt v4 Feed"). Trong Feed:
- thẻ rộng ở trang chủ in danh sách **chi tiết may** của mẫu;
- trang sản phẩm có mục **"Chi tiết"**.

App chưa có trường này, và người dùng đã chốt màn phải giống Feed (QĐ-36). Lát này **chỉ thêm dữ liệu**. Giao diện do lát v4
1b dùng sau.

| Việc | Có | Không |
|---|---|---|
| Dữ liệu mẫu | Thêm `details: string[]` cho **10 mẫu Số 05** trong `data/catalog.ts`, chép **nguyên văn** từ `prototype/explore/shared/data.js`, mảng `ISSUE_05[].details`, đúng thứ tự dòng. Mẫu khác (Số 03/04, hé lộ Số 06, tám mẫu Cố định) để `[]`. | Không viết thêm dòng nào; không sửa chữ. |
| Kiểu | `Product.details: string[]` trong `data/types.ts`, có chú giải. | — |
| Cơ sở dữ liệu | Migration mới: `products.details text[] not null default '{}'`. `seed_products` mang cùng cột. `reset_demo` chép cột này từ seed. Snapshot (`catalog_snapshot()`, bản mới nhất) trả thêm `details`. Seed sinh lại bằng `npm run seed:gen`. | Không đổi bảng khác; không đổi luật đặt hàng. |
| Đọc | DAL catalog (`lib/db/catalog.ts` và nơi map snapshot sang `Product`) đọc `details`. `lib/db/database.types.ts` sinh lại. | — |
| Quản trị | Tạo mẫu mới và sửa mẫu **vẫn chạy**: cột có mặc định `{}`. Mẫu tạo mới có `details` rỗng. | **Không** thêm ô nhập chi tiết vào form quản trị. Ghi vào báo cáo như việc còn mở. |

Nguồn gốc dòng chữ: `shared/data.js` của mock ghi các dòng này lấy từ brief may mặc ở `tasks/anh-san-pham-prompt.md`, tức cấu
tạo thật của từng mẫu dùng để tạo ảnh. Đây không phải chữ quảng cáo bịa. Đối chiếu nhanh 2 hoặc 3 mẫu với tệp đó; chỉ **đọc**
tệp, không sửa. Nếu thấy lệch, ghi ra, **không tự sửa**.

## 2. Quyết định đã chốt

- QĐ-36: màn giống Feed hoàn toàn. Chi tiết may là một phần của Feed.
- Luật dữ liệu cũ còn nguyên:
  - seed sinh từ `data/*.ts`, không gõ tay;
  - không đổi `id`, giá, tồn, màu, ảnh của mẫu nào;
  - lát này **được phép** thêm trường `details` vào fixture, và đó là ngoại lệ duy nhất cho luật "không đổi giá trị fixture".

## 3. Kiểm

- `npx supabase db reset` sạch; `select slug, details from products` trả đúng 10 mẫu Số 05 có chi tiết.
- `select public.reset_demo(public.demo_anchor())` giữ nguyên `details`.
- `npm run test:db` xanh. Thêm test: snapshot có `details`; `reset_demo` giữ `details`; mẫu tạo mới có `details = '{}'`.
- `npm run typecheck`, `npm test`, `npm run build` sạch.
- Một test trong `data/` ghim rằng `details` của 10 mẫu khớp mock từng chữ.
- Không đổi hình màn nào: trang chủ Feed và các route v3 vẫn như trước. Lát 1b mới in chi tiết.

## 4. Nộp

- `supabase/migrations/<timestamp>_product_details.sql`, `supabase/seed.sql` sinh lại, `lib/db/database.types.ts` sinh lại.
- Báo cáo theo hợp đồng của agent, kèm:
  - lệnh người dùng cần chạy trên hosted khi deploy (`supabase db push --linked`, rồi nạp lại seed theo `tasks/plan.md`);
  - các việc còn mở, ví dụ ô nhập chi tiết trong form quản trị.
