# Backend — hồ sơ quyết định và hướng thực thi (QĐ-25, 23/09/2026)

Bản này là kết quả của skill `idea-refine` (hỏi → biến thể → stress-test → hướng) và
`source-driven-development` (mọi số liệu lấy từ trang chính thức, đọc 23/09/2026). Nó là
hợp đồng cho các brief `tasks/briefs/backend-b*.md`. Khi code và bản này lệch, code đang
chạy đúng, bản này phải sửa.

## 1. Bài toán

Làm sao để cửa hàng streetwear demo có một backend **thật** (đơn hàng, tồn kho, tài khoản,
quản trị ghi được), chạy **0đ**, **không "ngủ" đúng lúc người xem mở link**, **không dính
pháp lý thanh toán**, và vẫn thể hiện được kỹ năng backend đáng tin trong portfolio, với
**ít mảnh ghép nhất**?

## 2. Ràng buộc người dùng chốt (23/09/2026, không hỏi lại)

- Mục tiêu: **demo / portfolio chạy thật**; không khách thật, không tiền thật. Gắn vào CV.
- Thanh toán: **chuyển khoản, admin đối chiếu tay + COD**. Nguyên văn: "tránh các cổng thanh
  toán có liên quan đến pháp lý. càng đơn giản càng tốt."
- Ngân sách hạ tầng: **0đ**, chỉ gói miễn phí.
- Hạ tầng: **không ràng buộc** (dịch vụ nước ngoài, vùng Singapore là ổn).

## 3. Hiện trạng mã nguồn (quét 23/09/2026)

- Next.js 16.3.5, React 19, TypeScript 7; 45 route; 191 tệp TS/TSX (93 `"use client"`);
  1.025 test; 1 route handler (`/api/wards`). Chưa bật `cacheComponents`, chưa có `proxy.ts`.
- `data/types.ts` tự tuyên bố là **wire format**: enum UPPER_SNAKE, id branded, tiền là số
  nguyên đồng (`…Vnd`), không lưu thứ suy được (`sold`, `remaining`, trạng thái Số).
- Fixture: 21 mẫu, 38 màu, 152 ô tồn kho (màu×size), 4 Số, 2 teaser, 24 đơn (mẫu, không
  phải sổ), 8 khách, 6 mã, 34 tỉnh / 3.321 xã.
- Trạng thái: 13 khoá `localStorage` `brand.*`; quản trị là nhật ký 16 loại sự kiện phát lại
  trên fixture (`lib/admin-sim.ts`); đơn đặt ở checkout là hình dạng thứ hai (`PlacedOrder`)
  không tới được admin.
- Lỗ hổng chỉ backend mới đóng: tồn kho không giảm khi đặt hàng; `usedCount` mã tĩnh; admin
  sửa mã không tới checkout; mã đơn sinh theo phút, có thể trùng; đăng nhập không mật khẩu;
  admin không kiểm quyền; không có bước Đang giao → Đã giao; reducer không có guard.
- Ràng buộc giữ nguyên: QĐ-15 (backend thật không lộ "email không tồn tại"), QĐ-16 (đơn
  người khác trả 404), DESIGN §9 (không số bịa, không nút chết), bộ kiểm Playwright chặn mọi
  origin ngoài loopback, `ui-implementer` bị cấm backend → agent riêng.

## 4. Biến thể đã xét

| # | Hướng | Kết luận |
|---|---|---|
| 1 | **Supabase trọn gói, đường dữ liệu chỉ qua server** | **Chọn** |
| 2 | Supabase tối giản (Postgres + Auth, ảnh vẫn Unsplash) | Chính là phạm vi MVP của #1 |
| 3 | Neon + Neon Auth (Better Auth) + Drizzle: không bao giờ tạm dừng | Dự phòng nếu rủi ro "ngủ" không chấp nhận được |
| 4 | Convex: backend TypeScript phản ứng | Không SQL, lệch `types.ts`, ít gặp ở VN |
| 5 | Lai: catalog trong code, chỉ đơn/tài khoản lên DB | Admin sửa tồn kho không lưu được → vi phạm "không nút chết" |
| 6 | Haravan/Shopify headless, Medusa/Saleor/Payload | Phí cố định hoặc quá nặng; trùng admin đã có |

## 5. So sánh gói miễn phí (trang chính thức, 23/09/2026)

| Dịch vụ | DB | Auth | Ảnh | "Ngủ"? | Ghi chú |
|---|---|---|---|---|---|
| Supabase Free | Postgres 500 MB, RLS, hàm SQL, pg_cron | 50k MAU; email mặc định 2 thư/giờ, chỉ tới team | 1 GB, resize cần Pro | **Tạm dừng sau 7 ngày không truy vấn DB**, khôi phục tay; 2 dự án; không backup | Hướng dẫn chính thức Next 16 (`proxy.ts`) |
| Neon Free | Postgres 0,5 GB/dự án, 100 CU-giờ | Neon Auth (Better Auth) 60k MAU | 5 GB object storage | Không; tắt sau 5 phút, tự bật | Data API + Auth mới |
| Convex Free | document DB 0,5 GB, 1M calls | Convex Auth/Clerk | 1 GB | Không ghi rõ | Không SQL |
| Firebase Spark | Firestore 1 GiB, 50k đọc/ngày | 50k MAU | bucket mới có thể cần Blaze | Không | NoSQL |
| Appwrite Free | 1 DB, 2 GB, 2 functions | 75k MAU | 1 bucket | Tạm dừng sau 1 tuần | Không lợi hơn |
| Cloudflare D1 | SQLite 5 GB, 5M đọc/ngày | tự lo | R2 riêng | Không | Cần OpenNext, Next 16 chưa chắc |
| Vercel Hobby | — | — | 5.000 transform/tháng | — | Phi thương mại; cron 1 lần/ngày (±59 phút); 1 vùng chọn được |

## 6. Hướng đã chọn

**Supabase Free (vùng `ap-southeast-1`) + Vercel Hobby (vùng Singapore), đường dữ liệu chỉ
qua server.**

1. **Đọc** trong Server Components, **ghi** bằng Server Actions; cả hai qua server client của
   `@supabase/ssr` với cookie. `proxy.ts` chỉ làm mới token bằng `getClaims()`, không kiểm DB
   (docs Next: proxy chỉ kiểm lạc quan). **Trình duyệt không gọi Supabase** → giữ luật "0
   request ngoài loopback"; không cần khoá `NEXT_PUBLIC_` cho tới khi có Realtime.
2. **DAL** `lib/db/*` với `import "server-only"`, `verifySession` bọc `React.cache`, trả DTO.
   **Mỗi Server Action tự kiểm quyền** (docs Next: Server Actions là endpoint công khai).
   `data/types.ts` vẫn là hợp đồng của app; DAL đổi hàng DB (kiểu sinh bằng
   `supabase gen types typescript`) sang kiểu domain.
3. **Schema dịch thẳng từ `types.ts`**: `products`, `product_colors` (thứ tự màu + ảnh),
   `stock_cells(product_id, color, size, on_hand)`, `drops`, `teasers`, `promotions`,
   `profiles` (1–1 `auth.users`), `addresses`, `orders`, `order_lines`, `events` (nhật ký
   append-only thay `brand.adminSim`). Enum UPPER_SNAKE giữ nguyên. `sold` vẫn suy
   = `cut_units − Σ on_hand`.
4. **Hàm SQL `place_order()`** trong một giao dịch: khoá ô tồn kho `FOR UPDATE`, kiểm Số đang
   mở, trừ `on_hand`, kiểm và tăng `used_count`, sinh mã `DH-` từ sequence, tính tổng từ giá
   trong DB, `due_at = now + 12h`. `cancel_order()` trả hàng về kệ. **Quá hạn chuyển khoản
   vẫn suy khi đọc** như `effectiveStatus` hiện tại → không cần cron nghiệp vụ.
5. **Auth**: email + mật khẩu, **tắt xác nhận email** (SMTP mặc định 2 thư/giờ, chỉ tới team).
   Đăng nhập qua Server Action, lỗi chung → thoả QĐ-15. **Admin** = `app_metadata.role = 'admin'` trên `auth.users` (chốt ở B3a 23/09 thay cho
   Custom Access Token Hook: ít mảnh ghép, chỉ service role ghi được, luôn trong JWT) + `is_admin()` trong RLS và trong
   mọi hàm `admin_*`; một tài khoản admin seed (`quanly@email.com`).
6. **RLS**: catalog đọc công khai; khách chỉ thấy đơn/địa chỉ của mình (QĐ-16 → `notFound()`);
   ghi chỉ qua hàm SQL hoặc role admin. `/track` mã + SĐT qua hàm `security definer` với
   `search_path` cố định.
7. **Seed**: `data/*.ts` vẫn là nguồn sự thật → script sinh `supabase/seed.sql`; hàm
   `reset_demo(anchor)` chèn dữ liệu với mốc thời gian **tương đối** anchor; nút "Đặt lại" khu
   quản trị và cron hằng ngày gọi nó. Khi toàn bộ dữ liệu đã lên DB: anchor mặc định = `now()`,
   `lib/clock.ts` về đồng hồ thật (khép QĐ-24).
8. **Chống ngủ**: `GET /api/health` chạy `select 1`; Vercel Cron 1 lần/ngày. Docs Supabase:
   "a few user requests to the database each day over the previous 7-day period is enough".
9. **Cache**: chưa bật `cacheComponents` → trang có DB render động; dedupe theo request bằng
   `React.cache`; `products/[slug]` bỏ prerender lúc build. Không bật Cache Components đợt này.
10. **Ảnh**: giữ Unsplash qua `next/image`; Supabase Storage để sau.

Đường mở rộng nếu thành shop thật: Supabase Pro 25 USD (hết ngủ, có backup); webhook
SePay/PayOS vào một route handler khớp `code` với nội dung chuyển khoản; Resend làm SMTP;
GHN/GHTK API. Schema đã chừa chỗ.

## 7. Năm câu đã chốt (23/09/2026)

1. **Đồng hồ mẫu QĐ-24**: bỏ khi toàn bộ dữ liệu đã lên DB; seed ngày tương đối với mốc reset.
2. **Demo công khai** (gắn portfolio/CV): ai cũng đăng ký được, có nút "Đăng nhập thử";
   tài khoản admin demo công khai mật khẩu; reset dữ liệu hằng ngày. *(Cách hiểu của phiên
   chính từ câu trả lời "demo công khai"; sửa nếu sai.)*
3. **Git**: `git init` 23/09; GitHub qua `gh` (đã đăng nhập).
4. **Quy trình**: agent `backend-implementer` (Opus 5, effort max) thực thi theo brief; phiên
   chính viết brief và duyệt output. `ui-implementer` giữ nguyên cho việc UI thuần.
5. **Hồ sơ**: bản này + QĐ-25 trong `tasks/plan.md`; brief ở `tasks/briefs/backend-b*.md`.

## 8. Giả định cần kiểm

- [ ] **A1** Ping hằng ngày đủ chống tạm dừng. Kiểm: 8 ngày không đụng tay, dự án còn sống.
- [ ] **A2** Vercel Hobby (phi thương mại) hợp lệ cho portfolio. Kiểm: fair-use guidelines.
- [ ] **A3** Tắt xác nhận email chấp nhận được với người xem demo. Áp dụng từ B1 23/09 (`enable_confirmations = false`, tài khoản thử công khai); chờ phản hồi người xem để tick.
- [ ] **A4** Đăng ký/đặt đơn tự do + reset hằng ngày là đủ vệ sinh; rate limit mặc định của
  Supabase Auth (30 yêu cầu/5 phút/IP) đủ. Kiểm: chạy demo 1 tuần.
- [x] **A5** Docker Desktop chạy được để `supabase start` — kiểm ở B0b 23/09: lần đầu 9 phút 29
  giây (tải image), lần sau 30 giây; `db reset` 31 giây.
- [x] **A6** Playwright sweep chạy được trên DB cục bộ sau `reset_demo()` — kiểm ở B0b 23/09: 59
  lượt, 0 console / 0 tràn / 0 chữ nhỏ / 0 request ngoài 3200.

## 9. Lát thực thi (rủi ro giảm dần)

| Lát | Nội dung | Bằng chứng đạt |
|---|---|---|
| **B0 Nền** | Supabase CLI + stack cục bộ; migration catalog (`products`, `product_colors`, `stock_cells`, `drops`, `teasers`, `promotions`); seed sinh từ `data/*.ts` qua `reset_demo(anchor)`; DAL `lib/db`; kiểu sinh; `CatalogProvider` cho component client; trang catalog đọc DB; `/api/health` + `vercel.json` cron; `.env.example` | tsc, vitest, `supabase db reset`, build, sweep 0 lỗi; trang chủ/listing/PDP/search hiển thị từ DB |
| **B1 Tài khoản** | Auth email+mật khẩu (auto-confirm), `profiles`, `addresses`; `proxy.ts`; `AccountGuard` thành kiểm phiên server; bỏ mọi ghi chú "mô phỏng / đừng nhập mật khẩu thật"; nút "Đăng nhập thử" | đăng ký → đăng nhập → sổ địa chỉ ghi được; đơn người khác 404 |
| **B2 Đặt hàng** | `place_order()`, `cancel_order()`; xác nhận đơn, Đơn của tôi, `/track` đọc DB; một hình dạng `Order`; xoá `brand.orders` | 2 đơn cùng ô tồn kho song song → không bán quá; huỷ trả hàng về kệ |
| **B3 Quản trị** | Claim admin; 16 hành động thành Server Actions (guard chuyển trạng thái trong SQL); `events` thay `brand.adminSim`; "Đặt lại dữ liệu mẫu" gọi `reset_demo()`; đổi lời simbar; đồng hồ thật, anchor = `now()`. **Đã làm:** B3a 24/09 (vai, 6 hàm đơn, `events`, reset neo), B3b 24/09 (10 hàm `admin_*` kho/Số/teaser/mã/sửa mẫu, `promotions.paused`, `sold_out_at` sống, xoá `admin-sim`); B3c 24/09 (bucket `product-photos`, `/photos/[...key]`, `admin_add_product`/`set_product_photo`/`reorder_colors`, ẩn mẫu Số chưa mở, purge ảnh khi reset) | mọi nút admin ghi DB; log/CSV từ `events`; reset đưa về seed |
| **B4 Triển khai** — **XONG 24/09** | Dự án Supabase hosted `hive-demo` (`ap-southeast-1`, PG 17), 6 migration + seed + 9 tài khoản mẫu; Vercel Hobby dự án `hive` (`sin1`), `vercel.json` hai cron UTC: health `0 3`, reset `0 12` (Hobby chỉ hứa đúng giờ ±59 phút nên reset nằm trọn sau mốc 18:50 VN); `GET /api/reset` sau `CRON_SECRET` (404 khi không có khoá); GitHub public; `TZ` là biến reserved trên Vercel, không đặt được (app đúng giờ VN dưới UTC) | https://hive-neon-three.vercel.app chạy; cron đăng ký trong project |
| **B5 Tuỳ chọn** | Storage cho ảnh, Realtime tồn kho, Resend SMTP, tên miền | theo nhu cầu |

Giữ nguyên: mọi hàm thuần trong `lib/`; giỏ, yêu thích, giữ lại sau, tìm kiếm gần đây, tuỳ
chọn vẫn ở `localStorage` (tiện ích thiết bị).

## 10. Không làm (và vì sao)

- Cổng thanh toán / webhook ngân hàng (SePay, PayOS, Casso, VNPay, MoMo) — người dùng chốt
  tránh pháp lý; schema chừa chỗ.
- API vận chuyển (GHN/GHTK/Viettel Post) — mã vận đơn nhập tay; chưa ký đối tác nào.
- Gửi email/SMS/push — "đang chuẩn bị" giữ nguyên; Resend là bước sau.
- Supabase Realtime, Edge Functions, Storage, Cache Components của Next 16 — thêm mảnh.
- Đưa giỏ/yêu thích/tìm kiếm gần đây lên server — tiện ích thiết bị.
- Tự host, Medusa/Payload, Haravan/Shopify — phí hoặc nặng, trái ngân sách 0đ.

## 11. Nguồn (chính thức, đọc 23/09/2026)

- Supabase: https://supabase.com/pricing · https://supabase.com/docs/guides/platform/free-project-pausing ·
  https://supabase.com/docs/guides/platform/regions · https://supabase.com/docs/guides/auth/server-side/nextjs ·
  https://supabase.com/docs/guides/auth/auth-smtp · https://supabase.com/docs/guides/auth/rate-limits ·
  https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac ·
  https://supabase.com/docs/guides/database/functions · https://supabase.com/docs/guides/api/rest/generating-types ·
  https://supabase.com/docs/guides/local-development/overview · https://supabase.com/docs/guides/cron ·
  https://supabase.com/docs/guides/storage/serving/image-transformations ·
  https://supabase.com/docs/guides/realtime/postgres-changes · https://supabase.com/docs/guides/integrations/vercel-marketplace
- Vercel: https://vercel.com/docs/plans/hobby · https://vercel.com/docs/cron-jobs/usage-and-pricing ·
  https://vercel.com/docs/functions/configuring-functions/region · https://vercel.com/docs/cli/deploy
- Next.js 16.3.5 (docs kèm gói, `node_modules/next/dist/docs/01-app/`): `02-guides/authentication.md`,
  `02-guides/server-actions.md`, `02-guides/data-security.md`, `02-guides/caching-without-cache-components.md`,
  `01-getting-started/16-proxy.md`, `03-api-reference/03-file-conventions/proxy.md`, `02-guides/upgrading/version-16.md`
- Phương án khác: https://neon.com/pricing · https://neon.com/docs/auth/overview · https://www.convex.dev/pricing ·
  https://developers.cloudflare.com/d1/platform/pricing/ · https://firebase.google.com/pricing ·
  https://appwrite.io/docs/advanced/platform/free
- Thanh toán / vận chuyển VN (chỉ để biết đường mở rộng): https://docs.sepay.vn/tich-hop-webhooks.html ·
  https://payos.vn/docs/ · https://www.vietqr.io/en/danh-sach-api/link-tao-ma-nhanh/ ·
  https://api.ghtk.vn/docs/submit-order/calculate-shipping-fee/ · https://api.ghn.vn/home/docs/detail?id=95
