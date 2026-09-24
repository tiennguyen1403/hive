# Brief B4b — Gia cố demo công khai: tài khoản mẫu, giới hạn tần suất, toast lỗi, BRAND → HIVE

*24/09/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit. Không đụng `prototype/`,
`DESIGN.md`, `PRODUCT.md`, `README.md`, `tasks/`, `.impeccable/`, `.claude/`, `tools/` (cần sửa tool thì đưa bản vá
vào báo cáo). **Không đọc `.env.hosted.local`, không chạy gì trỏ vào dự án hosted** (không `supabase link/push`, không
`vercel` CLI): mọi kiểm chạy trên stack Docker cục bộ; phiên chính đẩy migration lên hosted sau khi duyệt.*

## 1. Lát

Demo đang chạy công khai ở https://hive-neon-three.vercel.app, mật khẩu tài khoản mẫu in sẵn trên màn đăng nhập, ai
cũng vào được khu quản trị (QĐ-25 câu 2). Đợt quét 24/09 tìm ra ba cách **một người lạ** làm hỏng demo cho mọi người
khác, và lát này đóng cả ba. Kèm hai việc nhỏ người dùng đã duyệt cùng lúc.

| Việc | Có | Không |
|---|---|---|
| Tài khoản mẫu | chặn đổi mật khẩu cho 9 tài khoản mẫu; cron đặt lại cũng đặt lại mật khẩu mẫu; `seed:users` đặt lại mật khẩu tài khoản đã có | không chặn gì khác của tài khoản mẫu; nút "Đặt lại dữ liệu mẫu" **không** đụng mật khẩu |
| Giới hạn tần suất | bảng `rate_hits` + 2 hàm SQL chỉ `service_role`; `lib/rate-limit.ts` (thuần) + `lib/db/rate-limit.ts`; gắn vào các action ở §3.4 | không dịch vụ ngoài, không gói mới, không WAF, không giới hạn `/track`, không công tắc tắt |
| Toast lỗi | `Toast` có `tone`; lỗi dùng icon `danger` + `role="alert"` như `Field3`; mọi chỗ báo lỗi qua toast truyền `tone` đúng | không màu mới, không kiểu mới, không đổi thời lượng |
| BRAND → HIVE | thay chữ giữ chỗ ở 9 chỗ người xem thấy + 2 chú giải + 1 test | không thêm mark, không thêm số ("HIVE.05"), không favicon/OG |

## 1b. Đã có sẵn

- Đợt quét 24/09 (phiên chính, đọc mã): `changePassword` (`lib/actions/auth.ts`) kiểm mật khẩu hiện tại bằng một lượt
  đăng nhập thử rồi `updateUser` — không có gì chặn tài khoản mẫu, mà mật khẩu `xemthu-2026` là công khai.
  `app/api/reset/route.ts` chỉ gọi `demo_anchor` → `reset_demo` → `purgeUploadedPhotos`, không đụng `auth.users`.
  `scripts/seed-users.ts` gặp tài khoản đã có thì `skipped += 1` (quản lý: chỉ ghi lại `app_metadata.role`). Hệ quả: một
  lượt đổi mật khẩu làm hỏng "Đăng nhập thử" / "Vào quản trị thử" tới khi chủ dự án sửa tay trong dashboard.
- Grep `rate|limit|throttle` trong `lib/actions`, `lib/db`, migrations, `proxy.ts`: 0 kết quả. Đơn tối đa 20 chiếc
  (`MAX_UNITS_PER_ORDER`, `lib/order-payload.ts`) nhưng số đơn không giới hạn → mua sạch kho được; tải ảnh 1,5 MB/tệp nhưng
  không giới hạn số tệp (bucket gói Free 1 GB).
- Supabase Auth có giới hạn riêng theo IP (local `supabase/config.toml` `[auth.rate_limit] sign_in_sign_ups = 30`,
  `token_refresh = 150`, mỗi 5 phút). Mọi lời gọi Auth đi từ **máy chủ Next**, không từ trình duyệt.
- `lib/db/service.ts` `getServiceSupabase()` trả `null` khi thiếu `SUPABASE_SECRET_KEY`. Vercel production đã có 5 biến:
  `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DEMO_PASSWORD`, `CRON_SECRET`.
- Danh sách tài khoản mẫu có trong code: `CUSTOMERS` (`data/customers.ts`, 8 email) + `DEMO_ADMIN` (`lib/demo-admin.ts`,
  `quanly@email.com`). `getSession()` (`lib/db/session.ts`) trả `SessionInfo` có `email`.
- Toast: `components/shop/Toast.tsx` luôn `role="status"` + icon `confirm`. `AdminToast` (`say(message)`) và
  `CheckoutScreen` (toast `failure`, dòng ~438 và ~819) đẩy cả lỗi lẫn xác nhận qua nó → lỗi hiện kèm dấu tích (việc mở từ
  lát 7). `Field3` báo lỗi bằng `<p className="err" role="alert"><Icon name="danger" …/>`.
- Tên **HIVE** chốt 24/09 (QĐ-28 trong `tasks/plan.md`); repo đã đổi thành `tiennguyen1403/hive`, `package.json` name
  `hive` (phiên chính đã commit, đừng sửa).

## 2. Quyết định đã chốt (không hỏi lại)

1. **Tài khoản mẫu không đổi được mật khẩu.** Hai lớp: (a) `changePassword` từ chối khi email của phiên là tài khoản mẫu,
   **trước** mọi lời gọi Supabase; (b) `GET /api/reset` (cron hằng ngày) đặt lại mật khẩu cả 9 tài khoản về
   `DEMO_PASSWORD` **vô điều kiện** sau khi `reset_demo` xong. Không so hash, không dò bằng đăng nhập. Nút "Đặt lại dữ liệu
   mẫu" trong admin **không** đặt lại mật khẩu (tránh tự đăng xuất người đang bấm). `seed:users` đặt lại mật khẩu cho tài
   khoản đã có (đây là lệnh sửa tay của chủ dự án).
2. **Giới hạn tần suất đếm trong Postgres**, cửa sổ cố định, không dịch vụ ngoài. Chỉ `service_role` đọc/ghi bảng và gọi
   hàm; app gọi qua `getServiceSupabase()`. Khoá chủ thể = **HMAC-SHA256 của IP người xem**, khoá HMAC là
   `SUPABASE_SECRET_KEY`, lấy 32 ký tự hex đầu — không lưu IP thô. Giới hạn "toàn cục" dùng chủ thể cố định `everyone`.
3. **Mở khi hỏng (fail open):** thiếu service client, hoặc RPC lỗi (ví dụ migration chưa lên hosted) → cho qua,
   `console.error` (thiếu khoá: một lần mỗi tiến trình). Giới hạn là lớp bảo vệ, không được làm hỏng luồng mua.
4. **IP người xem:** đọc header theo docs Vercel (WebFetch https://vercel.com/docs/headers/request-headers — xác minh header
   nào Vercel ghi đè để chống giả mạo, ghi nguồn vào báo cáo). Nhiều giá trị → lấy giá trị đầu, `trim`. Không có header
   (máy local) → `local`. Đọc bằng `headers()` của Next (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/headers.md`).
5. **Con số** (không nâng/hạ, không đưa ra biến môi trường):

   | Bucket | Chủ thể | Giới hạn | Cửa sổ | Dùng ở |
   |---|---|---|---|---|
   | `order_place` | người xem | 5 | 10 phút | `placeOrderAction` |
   | `order_units` | người xem | 60 (cost = tổng số chiếc của đơn) | 24 giờ | `placeOrderAction` |
   | `sign_in` | người xem | 10 | 5 phút | `signIn`, `demoSignIn`, `demoAdminSignIn` |
   | `sign_up` | người xem | 3 | 1 giờ | `signUp` |
   | `password` | người xem | 5 | 10 phút | `changePassword` |
   | `account` | người xem | 30 | 10 phút | `saveAddress`, `rememberAddress`, `removeAddress`, `makeDefault`, `cancelOrderAction` |
   | `admin` | người xem | 120 | 10 phút | **mọi** action trong `lib/actions/admin.ts` và `lib/actions/catalog-admin.ts` |
   | `admin_create` | người xem | 20 | 1 giờ | `createProduct`, `addDrop`, `addTeaser`, `addPromo` |
   | `upload` | người xem | 40 | 1 giờ | `uploadProductPhoto` |
   | `upload_global` | `everyone` | 300 | 24 giờ | `uploadProductPhoto` (≤ 450 MB/ngày, bucket 1 GB) |
   | `reset` | người xem | 3 | 10 phút | `resetDemo` |

6. **Trừ trước, không hoàn:** token bị trừ trước khi làm việc thật; việc thất bại (hết hàng, sai mật khẩu) không hoàn
   token. Lượt **bị từ chối** thì không trừ gì (kể cả cost > giới hạn).
7. **Câu chữ** (giọng trung tính, không xưng hô; `n` = số phút làm tròn lên, tối thiểu 1; từ 3.600 giây trở lên đổi sang
   `h` giờ làm tròn lên):
   - mặc định: `Quá nhiều lượt liên tiếp. Thử lại sau {n} phút.` / `… Thử lại sau {h} giờ.`
   - `order_units`: `Mỗi người mua đặt tối đa 60 chiếc mỗi ngày. Thử lại sau {h} giờ.` (dưới 1 giờ thì `{n} phút`)
   - `upload_global`: `Kho ảnh hôm nay đã nhận đủ ảnh. Thử lại sau {h} giờ.` (dưới 1 giờ thì `{n} phút`)
   - tài khoản mẫu đổi mật khẩu: `Tài khoản thử dùng chung nên không đổi được mật khẩu. Tạo tài khoản riêng để thử việc này.`
8. **Toast lỗi dùng lại ngôn ngữ sẵn có:** icon `danger` (như `Field3`), `role="alert"`, cùng hộp `.toast`, cùng màu icon
   hiện có. Xác nhận giữ nguyên `confirm` + `role="status"`.
9. **BRAND → HIVE** đúng các chỗ ở §3.7, viết hoa như wordmark. Không đụng `.wm` CSS, không thêm phần tử.
10. Không đổi `next.config.mjs`, không thêm `NEXT_PUBLIC_*`, không thêm gói. `reset_demo` và `supabase/seed.sql` **không đổi**.

## 3. Đặc tả

### 3.1 Migration `supabase/migrations/20260924150000_rate_limits.sql`

- Bảng `public.rate_hits(bucket text, subject text, window_start timestamptz, hits integer)`: PK
  `(bucket, subject, window_start)`; `bucket` check đúng 11 giá trị ở §2.5; `subject` check độ dài 1–64; `hits >= 0`.
  RLS bật, **0 policy**; thu mọi quyền khỏi `anon`, `authenticated`; cấp cho `service_role` đúng quyền cần.
- `public.take_rate(p_bucket text, p_subject text, p_cost integer, p_limit integer, p_window_seconds integer,
  p_now timestamptz default now()) returns integer` — `0` = cho qua; `> 0` = số giây tới hết cửa sổ (≥ 1).
  `window_start` = sàn `p_now` theo bội số `p_window_seconds` tính từ epoch. `p_cost > p_limit` → từ chối, không ghi.
  Còn lại: `insert … on conflict do update set hits = hits + cost where hits + cost <= p_limit returning` — không có
  dòng trả về là từ chối. Tham số sai (cost < 1, limit < 1, window ngoài 1–86.400, bucket lạ) → lỗi theo quy ước lỗi của
  các migration trước. `set search_path = ''`; `execute` chỉ `service_role`.
- `public.tidy_rate_hits(p_now timestamptz default now(), p_clear text[] default '{}') returns integer` — xoá dòng có
  `window_start < p_now - interval '2 days'` và mọi dòng thuộc bucket trong `p_clear`; trả số dòng đã xoá. Chỉ `service_role`.
- Sinh lại `lib/db/database.types.ts`.

### 3.2 `lib/rate-limit.ts` (thuần) + `lib/rate-limit.test.ts`

`RateBucket` (11 giá trị), `RATE_RULES: Record<RateBucket, { limit; windowSeconds; per: "visitor" | "everyone" }>` đúng bảng
§2.5; `clientIpOf(get: (name: string) => string | null): string`; `subjectOf(ip: string, key: string): string` (HMAC,
`node:crypto`); `rateLimitMessage(bucket, retryAfterSeconds): string` theo §2.7. Test: đủ 11 bucket và khớp bảng; tách
header nhiều giá trị, khoảng trắng, thiếu header → `local`; HMAC ổn định, 32 hex, khác khoá thì khác; câu chữ ở 30 giây,
60 giây, 61 giây, 3.599, 3.600, 3.601 giây cho mặc định, `order_units`, `upload_global`.

### 3.3 `lib/db/rate-limit.ts` (`server-only`)

`takeRate(bucket: RateBucket, cost = 1): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number; message: string }>`
— `await headers()` → `clientIpOf` → `subjectOf(ip, SUPABASE_SECRET_KEY)` (hoặc `everyone`) → `rpc("take_rate", …)`; mở khi
hỏng theo §2.3. `tidyRateHits(clear: RateBucket[] = []): Promise<number | null>` → `rpc("tidy_rate_hits")`, lỗi trả `null`.

### 3.4 Gắn vào action

- `placeOrderAction`: sau khi `readPlaceOrderPayload` ok → `order_place` → `order_units` (cost = tổng `qty`) → `placeOrder`.
  Từ chối trả `{ ok: false, failure: "RATE_LIMITED", message }`; `failureMovesCatalog` trả `false` cho nó.
- `signIn`, `demoSignIn`, `demoAdminSignIn`: `sign_in` ngay trước lời gọi Supabase Auth → `{ errors: { form: message } }`
  (`SignInScreen` đã hiện `errors.form` của cả ba).
- `signUp`: `sign_up` sau khi form hợp lệ, trước `auth.signUp` → `{ errors: { form: message } }`.
- `changePassword`: form hợp lệ → phiên → **tài khoản mẫu thì từ chối** `{ errors: { current: <câu §2.7> } }` → `password`
  (`{ errors: { next: message } }`) → lượt kiểm mật khẩu hiện tại → `updateUser`.
- Bốn action sổ địa chỉ và `cancelOrderAction`: `account` sau khi kiểm phiên, trả theo hình dạng lỗi sẵn có của từng action.
- Mọi action quản trị: `admin` ngay sau `requireAdmin`; thêm `admin_create` / `upload` rồi `upload_global` / `reset` theo
  bảng. Từ chối → `{ errors: { form: message } }`. `resetDemo`: xoá ảnh thành công thì `tidyRateHits(["upload_global"])`.
- `GET /api/reset`: sau `purgeUploadedPhotos` → `tidyRateHits(["upload_global"])` (dọn cả cửa sổ đã hết hạn).

### 3.5 Tài khoản mẫu

- `lib/demo-accounts.ts` (thuần) + test: `DEMO_EMAILS` (8 khách từ `CUSTOMERS` + `DEMO_ADMIN.email`, không gõ lại),
  `isDemoEmail(email)` (trim + không phân biệt hoa thường). Test: đủ 9, hoa thường, email thường → `false`, chuỗi rỗng → `false`.
- `lib/db/demo-accounts.ts` (`server-only`): `restoreDemoPasswords(): Promise<number | null>` — service client + `DEMO_PASSWORD`
  (thiếu một trong hai → `null` + `console.error`); tìm id theo email (bảng `profiles` hoặc `auth.admin.listUsers`, chọn cách
  đơn giản hơn, ghi lý do); `auth.admin.updateUserById(id, { password })` cho từng tài khoản; trả số tài khoản đã đặt lại.
- `GET /api/reset`: gọi sau `reset_demo`; JSON thêm `passwordsRestored: number | null`; lỗi ở đây **không** làm hỏng reset
  (vẫn 200, như `photosRemoved`). Cập nhật doc comment của route.
- `scripts/seed-users.ts`: tài khoản đã có (khách và quản lý) → đặt lại mật khẩu `DEMO_PASSWORD` (quản lý: gộp với lượt ghi
  lại vai), in thêm số mật khẩu đã đặt lại.
- **Đo và báo lại** (không đổi quyết định): `updateUserById` kèm mật khẩu có thu hồi phiên đang mở của tài khoản đó không
  (xem `auth.refresh_tokens` / `auth.sessions` trên DB local trước và sau).

### 3.6 Toast

- `Toast`: prop `tone?: "ok" | "error"` (mặc định `"ok"`) theo §2.8; cập nhật doc comment (câu "nothing has gone wrong" không
  còn đúng cho mọi trường hợp).
- `AdminToast`: `say(message, tone?)`. Duyệt **từng** chỗ gọi `say(` trong `components/admin/` (đợt quét thấy ở
  `AdminDropsScreen`, `AdminOrderScreen`, `AdminOrdersScreen`, `AdminPromotionsScreen`, `CustomersTable`, `DashboardScreen`,
  `ProductForm`, `ProductsTable`, `SimBar`): kết quả action → `ok` thì xác nhận, không `ok` thì `"error"`; câu từ chối viết
  tay (ví dụ "Ghi chú trống thì chưa có gì để lưu", "Trình duyệt không cho chép tự động…", "Không đọc được ảnh này…") →
  `"error"`. Liệt kê cách phân loại từng chỗ trong báo cáo.
- `CheckoutScreen`: hai toast `failure` → `tone="error"`. Các toast xác nhận khác của cửa hàng giữ nguyên.

### 3.7 BRAND → HIVE

`app/layout.tsx` (`title.default` "HIVE", `template` "%s · HIVE"), `app/admin/layout.tsx` ("%s · Quản trị · HIVE"),
`components/shop/SiteNav.tsx`, `components/shop/SiteFooter.tsx` (hai chỗ, gồm "Về HIVE"), `components/admin/AdminNav.tsx`,
`components/admin/SlipScreen.tsx`, `lib/invoice.ts` (+ `lib/invoice.test.ts`), `lib/lexicon.ts` (`ABOUT_LEAD`); chú giải
ở `app/products/page.tsx`, `app/search/page.tsx`. Sau khi xong: `git grep -n "BRAND" -- app components lib` rỗng.

## 4. Nghiệm thu

- `npm run typecheck` sạch; `npm test` xanh kể cả test mới; `npx supabase db reset` sạch; types sinh lại khớp tệp;
  `npm run build` sạch.
- `npm run test:db` xanh (161 cũ + tệp mới `lib/db/rate-limit.dbtest.ts`): cho qua tới đúng giới hạn rồi từ chối; từ
  chối không trừ; cost > giới hạn bị từ chối và không ghi; sang cửa sổ mới (qua `p_now`) thì cho lại; số giây trả về đúng;
  **hai client tranh token cuối → đúng một thắng** (theo mẫu tranh chấp ở `orders.dbtest.ts`); `tidy_rate_hits` xoá đúng dòng
  hết hạn và đúng bucket trong `p_clear`; `anon` / `authenticated` không gọi được hai hàm và không đọc được bảng.
- Preview 3200 trên stack local (`npm run seed:users` đã chạy; muốn thử cron thì đặt `CRON_SECRET=test-secret` trong env
  của `next start`). Giả hai người xem bằng header IP §2.4 qua `extraHTTPHeaders` trong `run-code`:
  1. "Đăng nhập thử" → `/account/password` → hiện tại `xemthu-2026`, mật khẩu mới hợp lệ → câu §2.7 dưới "Mật khẩu hiện tại";
     đăng xuất, "Đăng nhập thử" lại vẫn vào được. Lặp lại với "Vào quản trị thử".
  2. Đăng ký tài khoản mới → đổi mật khẩu thành công như cũ (hồi quy).
  3. Tự hỏng rồi tự lành: đổi mật khẩu `minhanh@email.com` bằng service key **local** → "Đăng nhập thử" báo lỗi →
     `GET /api/reset` (bearer `test-secret`) → JSON có `passwordsRestored: 9` → "Đăng nhập thử" vào được.
  4. Chạy `npm run seed:users` lần hai: in số mật khẩu đặt lại, 9 tài khoản vẫn đăng nhập được.
  5. Người xem A đặt 5 đơn → đơn thứ 6 hiện câu §2.7 trong toast lỗi (icon `danger`, `role="alert"`); người xem B vẫn đặt được.
  6. Người xem A đăng nhập sai 10 lần → lần 11 hiện câu giới hạn trong form; người xem B vẫn đăng nhập được.
  7. Quản lý bấm "Đặt lại dữ liệu mẫu" 4 lần trong 10 phút → lần 4 là toast lỗi; toast xác nhận (lần 1–3) vẫn dấu tích.
- Sweep `tools/layout-sweep.js`: 0 console / 0 tràn / 0 chữ < 11px / 0 request ngoài 3200 (tồn dư `smallTarget 48` +
  `loneButton 2` như cũ). Sweep và kịch bản đều đăng nhập từ cùng chủ thể `local`: nếu một lượt đăng nhập bị từ chối thì
  chờ hết cửa sổ — **không** nâng giới hạn, không thêm công tắc.
- Mọi walk: 0 request ngoài loopback, 0 lỗi console.

## 5. Bàn giao

Ảnh vào `.playwright-cli/shots/backend/b4b/`: `password-demo-refused-{390,1280}.png`, `checkout-rate-limited-{390,1280}.png`,
`signin-rate-limited-390.png`, `admin-toast-error-1280.png`, `admin-toast-ok-1280.png`, `nav-hive-{390,1280}.png`,
`footer-hive-390.png`, `admin-hive-1280.png`, `slip-hive-1280.png`, `about-hive-390.png`. Tệp sinh: migration §3.1,
`lib/db/database.types.ts`. Báo cáo theo hợp đồng sáu mục, kèm: header IP đã chọn và nguồn docs Vercel; kết quả đo §3.5 (thu
hồi phiên); **Supabase Auth tính giới hạn theo IP nào khi mọi lời gọi đi từ máy chủ** (WebFetch
https://supabase.com/docs/guides/auth/rate-limits — chỉ báo lại, không cấu hình hosted); bảng phân loại toast §3.6. Không
đổi giới hạn nào ngoài bảng §2.5. Không commit.

## Ngoài phạm vi (đừng làm)

Giới hạn cho `/track` (mã + 10 chữ số điện thoại, dò mù không khả thi); đổi cấu hình Supabase hosted hay Vercel; tách dữ liệu
theo từng người xem hoặc đổi tần suất đặt lại (người dùng chưa chốt); favicon, ảnh OG, mark, README; CI; Cache Components;
các việc mở khác (bìa Số 3 teaser, form sửa hồ sơ, toast khi trang mẫu vừa bị xoá).

## Đọc trước khi sửa

`lib/actions/auth.ts` · `lib/actions/orders.ts` · `lib/actions/addresses.ts` · `lib/actions/admin.ts` ·
`lib/actions/catalog-admin.ts` · `lib/order-payload.ts` · `lib/db/session.ts` · `lib/db/service.ts` · `lib/db/photos.ts` ·
`app/api/reset/route.ts` · `scripts/seed-users.ts` · `components/shop/Toast.tsx` · `components/admin/AdminToast.tsx` ·
`components/ui/Field3.tsx` · `components/checkout/CheckoutScreen.tsx` · `lib/db/orders.dbtest.ts` (mẫu tranh chấp) · migration
gần nhất `20260924040000_photos.sql` (quy ước grant, lỗi, `search_path`) · `tasks/backend.md` §6, §9 ·
`node_modules/next/dist/docs/` (`headers()`, Server Actions) · docs Vercel request headers và Supabase Auth rate limits qua WebFetch.
