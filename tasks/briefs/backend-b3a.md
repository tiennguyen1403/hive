# Brief — Lát B3a: quản trị thật, phần 1 — quyền admin, đơn hàng, nhật ký, đặt lại dữ liệu mẫu, đồng hồ thật *(giao 23/09/2026 sau B2 commit `142edd9`)*

Agent: `backend-implementer`. Hồ sơ nền: `tasks/backend.md` (QĐ-25 §6 điểm 5–7, §9 dòng B3). B3 tách đôi như B0: **B3a** (bản này) là
quyền admin + mọi thao tác trên **đơn hàng** + nhật ký `events` + nút đặt lại + đồng hồ thật; **B3b** (brief sau) là kho, Số, teaser, mã
giảm giá. Sau B3a, lớp phủ `brand.adminSim` chỉ còn phục vụ các thao tác của B3b.

Tiền đề đã đạt: B1 (Auth, `profiles`, `Me`, `requireMe`), B2 (`orders`/`order_lines`, `place_order(p_input, p_now)`, `cancel_order`,
`expire_transfers`, `track_order`, `receipt_order`, `order_json`, `reset_demo` bản 3 với `delta` từ mốc fixture `2026-09-20 18:50+07`).

## 1. Lát

Sau lát này:

- Có **vai admin**: một tài khoản quản trị thử công khai; `/admin/*` đòi phiên admin ở server (khách → chuyển tới đăng nhập; đăng nhập
  mà không phải admin → 404); mọi Server Action quản trị và mọi hàm SQL `admin_*` tự kiểm lại vai.
- **Mọi thao tác trên đơn** của khu quản trị ghi vào Postgres qua hàm SQL có **guard chuyển trạng thái**: ghi nhận tiền, bàn giao (có mã
  vận đơn và đơn vị), **đã giao** (bước còn thiếu từ mock), huỷ có lý do + ghi chú, ghi chú nội bộ, sửa địa chỉ giao. Khách thấy kết quả
  thật ở "Đơn hàng", biên nhận và `/track` — không còn lớp phủ trên trình duyệt cho đơn.
- Bảng **`events`** append-only là nhật ký duy nhất: mọi hàm ghi (kể cả `place_order`, `cancel_order`, `expire_transfers`, `reset_demo`)
  chèn sự kiện; màn "Nhật ký thao tác", ghi chú của đơn và CSV đọc từ đó. `reset_demo()` sinh cả sự kiện cho các mốc đã ghi trong 24 đơn
  mẫu (đúng luật `fromFixtures` hiện có) nên sau reset nhật ký không trống.
- Khu quản trị đọc **DB**: tổng quan, hàng đợi, đơn, khách hàng (từ `profiles`), phiếu giao (có ghi chú của khách), nhật ký.
- **Đồng hồ thật**: `demoNow()` trả giờ thật; dữ liệu mẫu được **neo lại** mỗi lần đặt lại vào mốc 18:50 giờ Việt Nam gần nhất đã qua,
  nên mọi giờ-phút trong fixture giữ nguyên, mọi mốc đã ghi nằm trong quá khứ, mọi hạn đếm ngược nằm ở tương lai. Nút "Đặt lại dữ liệu
  mẫu" gọi `reset_demo()` thật và cho biết lần đặt lại cuối.
- Khép hai việc mở của B2: `p_now` bị **kẹp** theo `now()` với mọi vai ngoài `service_role`; quản trị thấy đơn từ `DH-2432` trở đi.

Dependency: **không thêm gói nào.**

## 1b. Từ báo cáo B2 (23/09, đã đạt và commit `142edd9`)

- Stack cục bộ nay **7 container** (`config.toml` đã tắt analytics, realtime, storage, edge_runtime — đừng bật lại). Preview 3200 có thể
  đang chạy bản B2; tắt rồi dựng lại khi cần. Cổng 3100 không đụng. `.env.local` đủ bốn biến.
- `vitest.db.config.mts` có `fileParallelism: false`; tệp dbtest mới phải chịu được chạy sau/trước các tệp khác và tự `reset_demo`
  về trạng thái nó cần. **Từ B3a, test DB nào so với `FIXTURE_CATALOG`/mốc fixture phải gọi `reset_demo('2026-09-20 18:50+07')`
  tường minh** (xem §2.6), vì seed và app nay neo theo giờ thật.
- `tools/layout-sweep.js`, `tools/backend-shots.js` mở phiên bằng nút "Đăng nhập thử"; chạy `npx playwright cli --raw run-code
  --filename=tools/layout-sweep.js > .playwright-cli/sweep.json`. Không sửa được `tools/`; cần đổi thì chép sang `.playwright-cli/b3a-*.js`.
- Mẫu dùng lại: `getSupabase()`, `getSession()`/`requireSession()`, `requireMe()`, `lib/actions/state.ts`, `lib/db/order-dto.ts` +
  `order_json()` (mọi đường đọc đơn đi qua một mapper), `OrderError` với mã lỗi cố định, `scripts/env-local.ts`, `supabase/README.md`.
- Mốc kiểm: `npm test` **50 tệp / 1.072 test**; `npm run test:db` **3 tệp / 66 test**; build 44 route `ƒ` + `ƒ Proxy`; sweep 61 lượt
  0/0/0/0 (tồn dư `smallTarget 48`, `loneButton 2`); 16 ảnh `.playwright-cli/shots/backend/b2/after/`.
- Ba câu quản trị đã đổi tạm thành "mô phỏng, khách chưa thấy…" (`AdminOrderScreen.tsx` ×2, `CancelOrderModal.tsx`) — lát này thay bằng
  câu thật. DESIGN.md §8 do phiên chính cập nhật sau lát; bạn không sửa.
- Báo cáo 6 mục tiếng Việt; mục 4 lần này là **bảng guard chuyển trạng thái** (từ → tới, ai, điều kiện, sự kiện ghi) đối chiếu với test.

## 2. Quyết định áp dụng (đã chốt, không hỏi lại)

1. **Vai admin = `app_metadata.role = 'admin'`** trên `auth.users`, không dùng Custom Access Token Hook (lệch có chủ ý so với
   `tasks/backend.md` §6.5: ít mảnh ghép, không phải cấu hình hook ở cả cục bộ lẫn hosted; `app_metadata` chỉ service role ghi được
   và luôn nằm trong JWT). SQL: `public.is_admin()` = `coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)`.
   App: `getSession()` trả thêm `role` đọc từ `getClaims()`; `requireAdmin(nextPath)` — không phiên → `redirect('/sign-in?next=…')`,
   có phiên mà không admin → `notFound()` (QĐ-16 áp cho khu quản trị). Ba lớp: `app/admin/layout.tsx` gọi `requireAdmin` (kiểm lạc quan),
   **mỗi** trang admin gọi lại, **mỗi** Server Action gọi lại, và hàm SQL `admin_*` kiểm `is_admin()` → `NOT_ADMIN`.
2. **Tài khoản quản trị thử**: `quanly@email.com`, tên "Quản lý cửa hàng", handle `a-quanly`, mật khẩu `DEMO_PASSWORD`, tạo bởi
   `scripts/seed-users.ts` với `app_metadata: { role: 'admin' }` (đã tồn tại thì `updateUserById` để chắc còn vai — idempotent).
   Màn đăng nhập thêm nút **"Vào quản trị thử"** (→ `/admin`) và dòng "Quản trị thử: quanly@email.com · mật khẩu …" do server render như B1.
   Khu quản trị hiện tên/email đang đăng nhập và nút đăng xuất (form gọi `signOut`).
3. **RLS đọc**: policy select `to authenticated using (public.is_admin())` trên `orders`, `order_lines`, `profiles`, `addresses`,
   `events`; `anon` không gì. **Không** policy ghi nào cho admin trên bảng; ghi chỉ qua hàm `security definer set search_path = ''`.
4. **Hàm SQL `admin_*(…, p_now)`** — guard trạng thái cố định, sai → `NOT_ALLOWED`, thiếu vai → `NOT_ADMIN`, mã sai → `NOT_FOUND`:
   - `admin_mark_paid(code, p_now)`: `AWAITING_TRANSFER | RECEIVED → PAID` (`paid_at = p_now`).
   - `admin_hand_over(code, carrier, tracking_code, note, p_now)`: `PAID → SHIPPING`; `RECEIVED → SHIPPING` **chỉ khi** `payment = 'COD'`
     (COD thu tiền lúc giao). Cột mới `orders.carrier text null`; `OrderStatus` nhánh `SHIPPING` thêm `carrier?: string` (đơn mẫu
     không có). `note` không rỗng → thêm sự kiện `ORDER_NOTE`.
   - `admin_mark_delivered(code, p_now)`: `SHIPPING → DELIVERED`.
   - `admin_cancel_order(code, reason, note, p_now)`: `AWAITING_TRANSFER | RECEIVED | PAID → CANCELLED`, **hàng về kệ** (đơn chưa bàn
     giao thì hàng còn trên kệ — cùng luật với `cancel_order` của khách); `SHIPPING`/`DELIVERED` → `NOT_ALLOWED`. Câu trong
     `CancelOrderModal` đổi theo (§3.5). `used_count` của mã không hoàn (như B2).
   - `admin_note_order(code, text, p_now)`: chỉ chèn sự kiện.
   - `admin_edit_address(code, ship_to jsonb, reason, p_now)`: chỉ khi chưa `SHIPPING`; kiểm như `place_order` (người nhận, SĐT
     regex, dòng địa chỉ không rỗng); sự kiện mang `before`/`after`.
   - Hàng loạt "ghi nhận tiền" nhiều đơn: Server Action lặp `admin_mark_paid` từng mã; báo số thành công/thất bại.
   - "Gửi lại xác nhận" (`ORDER_CONFIRMATION_RESENT`): **không có máy chủ gửi thư → nút thành `disabled` "đang chuẩn bị"** như nút Google
     (DESIGN §9 rule 3: nút phải làm được việc nó nói). Không ghi sự kiện.
5. **`events`**: `id bigint generated always as identity`, `at timestamptz`, `actor_role text check in ('admin','customer','system')`,
   `actor text not null default ''` (email admin hoặc khách; hệ thống để trống), `kind text`, `order_code text null`, `product_id text null`,
   `promo_code text null`, `drop_no integer null`, `payload jsonb not null default '{}'`; index `(at desc, id desc)` và `(order_code)`.
   Kinds lát này: `ORDER_PLACED` (từ `place_order`, `customer`/khách vãng lai `actor = email`), `ORDER_PAID`, `ORDER_SHIPPED`,
   `ORDER_DELIVERED`, `ORDER_CANCELLED` (admin), `ORDER_CANCELLED_BY_CUSTOMER` (từ `cancel_order`), `ORDER_EXPIRED` (từ
   `expire_transfers`, `system`, một sự kiện mỗi đơn), `ORDER_NOTE`, `ORDER_ADDRESS_EDITED`, `DEMO_RESET`. Payload theo đúng các trường
   `SimAction` tương ứng (camelCase) để `lib/activity-log.ts` chỉ đổi nguồn, không đổi luật. **Không có update/delete** trên `events`.
6. **Đồng hồ thật và neo dữ liệu**: `lib/clock.ts` — `demoNow()` trả `new Date()` (giữ tên vì ~200 chỗ gọi; đổi chú giải), giữ
   `DEMO_ANCHOR` làm hằng mốc fixture cho test, xoá `DEMO_CLOCK_NOTE`; `lib/clock.test.ts` viết lại (vẫn quét cấm `new Date()` ngoài
   `lib/clock.ts`). SQL thêm `public.demo_anchor(p_at timestamptz default now()) returns timestamptz` = **mốc 18:50 giờ
   `Asia/Ho_Chi_Minh` gần nhất ≤ `p_at`**. `reset_demo(p_anchor)`: `null` vẫn = mốc fixture (test dùng); app, `seed.sql` (sinh lại từ
   `gen-seed.ts`: `select public.reset_demo(public.demo_anchor());`) và `scripts/seed-users.ts` gọi với `demo_anchor()`. Vì delta là số
   ngày nguyên, mọi giờ-phút giữ nguyên; `data/orders.test.ts` đã bảo đảm mọi mốc ≤ anchor và mọi hạn ≥ anchor + 24h nên sau neo: quá
   khứ thật là quá khứ, hạn thật là tương lai. Cron B4 nên chạy ngay sau 18:50 VN (ghi vào `supabase/README.md`).
7. **Kẹp `p_now`**: trong `place_order`, `cancel_order`, `expire_transfers` và mọi `admin_*`: nếu `auth.role() <> 'service_role'` và
   `abs(extract(epoch from (p_now - now()))) > 300` → `BAD_INPUT`. Test DB dùng service role nên vẫn thử được "quá hạn".
8. **`reset_demo(p_anchor)` bản 4** (vẫn `security definer`; grant execute thêm `authenticated` **nhưng** trong thân hàm: nếu
   `auth.role() <> 'service_role' and not is_admin()` → `NOT_ADMIN`): sau phần đơn: truncate `events`; chèn sự kiện cho các mốc của 24 đơn
   mẫu theo đúng luật `fromFixtures` trong `lib/activity-log.ts` (tiền về `AWAITING_TRANSFER→PAID` tác giả hệ thống, bàn giao tác giả
   cửa hàng, giao xong tác giả hệ thống, huỷ theo lý do: "quá hạn chuyển khoản" hệ thống / "khách huỷ" khách / khác cửa hàng; `at` =
   mốc tương ứng + delta); cuối cùng chèn `DEMO_RESET` (`at = now()` thật, `actor_role = 'system'` khi service role, `'admin'` + email
   khi admin bấm). Không đụng `on_hand`/`used_count` của seed. Vẫn idempotent (chạy hai lần cùng anchor → cùng dữ liệu, trừ `at` của
   `DEMO_RESET` và `access_key`).
9. **Khu quản trị đọc DB, không đọc `ORDERS`/`CUSTOMERS` nữa** cho đơn và khách: trang server gọi DAL (`requireAdmin` trước) rồi truyền
   DTO xuống màn hình. Khách hàng = `profiles` (8 mẫu + người đăng ký thật) với số đơn / tổng đã thanh toán / đơn gần nhất tính từ
   `orders` (hàm thuần trong `lib/`, có test); `/admin/customers/[id]` nhận `handle` (`c-minhanh`) hoặc uuid, không có → 404.
10. **Phần B3b vẫn mô phỏng**: điều chỉnh tồn kho, Số, teaser, mã giảm giá tiếp tục qua `brand.adminSim`/`SimProvider`. `SimBar` đếm
    chỉ những thao tác đó; `useSimNow` giữ. Không xoá `SimProvider`. Trong `lib/admin-sim.ts` xoá **các kind đơn hàng** và mọi hàm suy
    đơn (`orderPatches`, `simOrders`, `addressPatches`, `addressEditReason`, `shopOrders`, `carrierOf`, `simNotes`); test cập nhật.
11. **Chữ**: badge "Chế độ mô phỏng"/"Dữ liệu mô phỏng" → **"Dữ liệu mẫu"** (PRODUCT.md: số liệu quản trị phải hiện là dữ liệu mẫu);
    dòng `SimBar`: "Đồng hồ thật · dữ liệu mẫu đặt lại lần cuối HH:MM · dd/mm" (từ sự kiện `DEMO_RESET` mới nhất; chưa có → "chưa đặt
    lại"); toast của thao tác đơn bỏ "ghi nhật ký"/"lưu trên trình duyệt này" → "đã lưu"; ba câu tạm của B2 thành: "khách thấy mã này ở
    tra cứu đơn và Đơn hàng", "Khách thấy lý do ở màn đơn của họ. Hàng về kệ ngay."; mọi chữ mới ghi vào mục 4. Không đổi thiết kế.
12. **QĐ-25** giữ nguyên: 0 request tới 54321; không khoá nào vào tệp commit; báo cáo không in khoá; không email/thanh toán/vận chuyển.

## 3. Spec

### 3.1 Migration `supabase/migrations/<ts>_admin.sql` (append-only sau B2)

- `is_admin()`, `demo_anchor()`; `alter table public.orders add column carrier text null`; bảng `events` + RLS (select admin) + revoke ghi;
  policy select admin trên `orders`, `order_lines`, `profiles`, `addresses`.
- Sửa (`create or replace`) `place_order`, `cancel_order`, `expire_transfers` (kẹp `p_now`, chèn `events`), `order_json` (thêm `carrier`),
  `reset_demo` bản 4 (§2.8). Hàm mới `admin_mark_paid`, `admin_hand_over`, `admin_mark_delivered`, `admin_cancel_order`,
  `admin_note_order`, `admin_edit_address` (§2.4), `admin_events(p_limit, p_before)` hoặc đọc bảng qua RLS — chọn một, ghi lý do.
  Grant execute `admin_*` cho `authenticated` (thân hàm kiểm vai); revoke `public`, `anon`.
- `supabase/seed.sql` sinh lại (`reset_demo(public.demo_anchor())`); `database.types.ts` sinh lại.

### 3.2 DAL, action

- `lib/db/session.ts`: `getSession()` → `{ userId, email, role: 'admin' | 'customer' }`, `requireAdmin(nextPath)`.
- `lib/db/admin.ts` (`server-only`): `listAllOrders()`, `findOrderAdmin(code)`, `listCustomers()`, `findCustomer(idOrHandle)`,
  `listEvents({ kind?, days?, limit })`, `orderEvents(code)`, `lastReset()`; `lib/db/event-dto.ts` (thuần, test): `toEvent`.
- `lib/actions/admin.ts` (`"use server"`): `markPaid(codes[])`, `handOver(code, form)`, `markDelivered(code)`, `cancelOrderAdmin(code,
  reason, note)`, `noteOrder(code, text)`, `editAddress(code, form)`, `resetDemo()`; mỗi action `requireAdmin()` → rpc → `revalidatePath`
  (`/admin`, `/admin/orders`, `/account`, `/track` theo nhu cầu; dùng `revalidatePath('/', 'layout')` khi tồn kho đổi như B2) → trả
  `ActionState`. `demoAdminSignIn()` trong `lib/actions/auth.ts`.
- `lib/activity-log.ts`: `logRows(catalog, events, orders, now)` đọc từ `events` DTO; giữ `LogRow`, `inFilter`, `withinDays`,
  `logHaystack`, `diffText`, CSV; xoá `fromOverlay`/`fromFixtures` (luật của chúng nay nằm trong `reset_demo` và các hàm ghi).
- `lib/admin-customers.ts` (thuần, test): tổng hợp khách từ `profiles` + `orders`.

### 3.3 Màn hình (nối dữ liệu, giữ markup)

- `app/admin/layout.tsx`: `requireAdmin('/admin')`; `AdminNav` nhận `me` (tên, email) và số đơn chờ xử lý từ server; nút đăng xuất.
- `app/admin/page.tsx`, `orders/page.tsx`, `orders/[code]/page.tsx`, `customers/page.tsx`, `customers/[id]/page.tsx`, `log/page.tsx`,
  `slips/page.tsx`: đọc DAL, truyền `orders`/`customer`/`events`/`nowIso`. `DashboardScreen`, `AdminOrdersScreen`, `AdminOrderScreen`,
  `CustomersTable`, `CustomerScreen`, `ActivityLogScreen`, `SlipScreen` (in ghi chú của khách từ `Order.note`, địa chỉ đã sửa), `HandoverForm`,
  `CancelOrderModal`, `AddressEditForm`: bỏ `useSim` cho đơn, gọi action qua `useTransition`/`useActionState`, toast từ kết quả; nút
  đang chạy `disabled` không icon.
- `SimBar`: badge "Dữ liệu mẫu", dòng đặt lại lần cuối, nút "Đặt lại dữ liệu mẫu" → `resetDemo()` (xác nhận như hiện có) rồi xoá
  overlay B3b và `router.refresh()`. `AdminTop` badge "Dữ liệu mẫu".
- `SignInScreen`: nút "Vào quản trị thử" + dòng tài khoản.
- `components/account/*`, `/track`: không đổi (đã đọc DB; `carrier` hiện cạnh mã vận đơn nếu có — chỉ nối dữ liệu).

### 3.4 Xoá / dọn

`lib/admin-sim.ts` phần đơn (§2.10) + test; `DEMO_CLOCK_NOTE`; `fromOverlay`/`fromFixtures`; import `ORDERS`/`CUSTOMERS` trong
`components/admin/*` và `app/admin/*` (grep gate); `lib/admin-rows.ts`/`admin-metrics.ts` giữ (thuần), chỉ đổi nguồn gọi.

### 3.5 Chữ đổi (ghi hết vào mục 4)

Badge/simbar (§2.11); `HandoverForm`/`AdminOrderScreen`: "khách thấy mã này ở tra cứu đơn và Đơn hàng"; `CancelOrderModal`:
"Khách thấy lý do ở màn đơn của họ. Hàng về kệ ngay." (bỏ câu "Tồn kho không tự đổi…"); nút "Gửi lại xác nhận" → `disabled` "Gửi lại
xác nhận · đang chuẩn bị"; `CustomersTable` sub: "N khách · 8 tài khoản mẫu và người đăng ký thật · nhãn suy từ đơn đã thanh toán".

### 3.6 Test

- `npm test`: `clock.test.ts` mới; `event-dto`, `admin-customers`, `activity-log` (đầu vào là events), `admin-sim` thu gọn, mapper
  `order-dto` với `carrier`.
- `npm run test:db` (`lib/db/admin.dbtest.ts`; các tệp cũ gọi `reset_demo(fixture anchor)` tường minh ở `beforeAll`):
  (a) RLS: admin (đăng nhập bằng `quanly@email.com`) thấy đủ đơn/hồ sơ, khách chỉ thấy của mình, anon 0; (b) từng `admin_*` đúng bảng
  guard §2.4 (mỗi chuyển hợp lệ một test, mỗi chuyển cấm một test) và chèn đúng sự kiện; khách gọi `admin_*` → `NOT_ADMIN`; (c)
  `admin_cancel_order` trả hàng về kệ; (d) kẹp `p_now`: authenticated lệch 10 phút → `BAD_INPUT`, service role không; (e)
  `demo_anchor('2026-09-23 09:00+07')` = `2026-09-22 18:50+07`, `demo_anchor('2026-09-23 19:00+07')` = `2026-09-23 18:50+07`;
  `reset_demo(demo_anchor(now()))` giữ giờ-phút của mọi mốc và làm mọi `due_at` của đơn chờ > `now()`; số sự kiện sau reset đúng bằng
  số mốc trong 24 đơn mẫu + 1 `DEMO_RESET`; (f) `expire_transfers` và `place_order`/`cancel_order` chèn sự kiện; (g) `reset_demo` bởi
  khách → `NOT_ADMIN`, bởi admin → ok.
- Playwright (preview 3200, `db reset` + `seed:users`): khách vãng lai mở `/admin` → `/sign-in?next=%2Fadmin`; "Đăng nhập thử" (khách)
  rồi `/admin` → **404**; "Vào quản trị thử" → `/admin` KPI từ DB; `/admin/orders/DH-2430` ghi nhận tiền → mở tab khác đăng nhập
  `minhanh` thấy "Đã thanh toán"; bàn giao có mã vận đơn → `/track?code=DH-2430&phone=0912345678` hiện mã và đơn vị; đã giao; huỷ một
  đơn `RECEIVED` (đặt COD trước) → PDP size đó còn lại; ghi chú và sửa địa chỉ → phiếu giao in địa chỉ mới; `/admin/log` có đủ sự kiện và
  tải CSV được; "Đặt lại dữ liệu mẫu" → 24 đơn, nhật ký có `DEMO_RESET` và dòng "đặt lại lần cuối" đổi; `/admin/orders/DH-9999` 404;
  0 request ngoài 3200; sweep 0/0/0/0.

## 4. Kiểm nghiệm thu

1. `npx supabase db reset` sạch (4 migration + seed neo `demo_anchor()`); `npm run seed:users` in 9 tạo (8 khách + 1 admin) / lần hai 0
   tạo; `db:types`, `seed:gen` không đổi tệp commit.
2. Typecheck sạch; `npm test` xanh (ghi số); `npm run test:db` xanh; `npm run build` sạch với stack tắt.
3. Grep gate B0b/B1/B2 giữ; thêm: `grep -rn "from \"@/data/orders\"\|from \"@/data/customers\"" app/admin components/admin` → 0;
   `grep -rn "ORDER_PAID\|ORDER_SHIPPED\|ORDER_CANCELLED\|ORDER_NOTE\|ORDER_ADDRESS_EDITED\|ORDER_CONFIRMATION_RESENT" lib/admin-sim.ts` → 0;
   `grep -rn "DEMO_CLOCK_NOTE\|Chế độ mô phỏng\|Dữ liệu mô phỏng" app components lib` → 0; `new Date()` ngoài `lib/clock.ts` → 0.
4. Kịch bản Playwright §3.6, ảnh 390/1280 vào `.playwright-cli/shots/backend/b3a/`; sweep; `tools/backend-shots.js` → `…/b3a/after/`
   so `…/b2/after/` (ngày tháng nay theo neo nên mọi ảnh có ngày sẽ lệch; chỉ cần chứng minh khác biệt là ngày/giờ và phần quản trị).
5. Không khoá nào trong diff.

## 5. Sản phẩm nộp

Migration, seed + types sinh lại, `seed-users.ts`, DAL/DTO/actions, màn hình quản trị đã nối, `clock.ts` + test, `admin-sim.ts` thu gọn,
`activity-log.ts` đổi nguồn, ảnh `.playwright-cli/shots/backend/b3a/…`, `sweep.json`, báo cáo 6 mục — mục 4 gồm **bảng guard** và mọi câu chữ đổi.

## Đọc trước khi sửa

Supabase (WebFetch): https://supabase.com/docs/guides/auth/managing-user-data (app_metadata) ·
https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid · https://supabase.com/docs/guides/database/postgres/row-level-security ·
https://supabase.com/docs/guides/auth/jwts (claims trong JWT). Next (cục bộ): `02-guides/authentication.md` (layout không phải chỗ kiểm duy nhất),
`02-guides/server-actions.md`, `03-api-reference/04-functions/revalidatePath.md`. Dự án: `lib/admin-sim.ts`, `lib/activity-log.ts` (`fromFixtures`
là luật sinh sự kiện mẫu), `lib/admin-metrics.ts`, `lib/admin-rows.ts`, `components/admin/*`, `app/admin/*`, `lib/clock.ts` + test,
`supabase/migrations/*`, `scripts/seed-users.ts`, `tasks/plan.md` QĐ-15/16/24, `DESIGN.md` §8–§9.
