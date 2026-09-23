# Brief — Lát B2: đơn hàng lên Postgres — `place_order()`, `cancel_order()`, xác nhận đơn, Đơn của tôi, `/track` *(giao 23/09/2026 sau khi B1 commit `26f2a62`)*

Agent: `backend-implementer`. Hồ sơ nền: `tasks/backend.md` (QĐ-25, §6 điểm 4 và 6, §9 dòng B2). Tiền đề đã đạt: B0a/B0b (catalog
trong Postgres, `loadCatalog()`, `reset_demo()`, `catalog_snapshot()`), B1 (Auth, `profiles`, `addresses`, `proxy.ts`, DAL
`lib/db/session.ts`/`profiles.ts`/`addresses.ts`, Server Actions `lib/actions/*`, `Me` DTO, tài khoản thử `xemthu-2026`).

Lát này đưa **đơn hàng** lên Postgres và xoá **hình dạng đơn thứ hai** (`PlacedOrder` trong `localStorage` `brand.orders`). Sau lát
này chỉ còn một `Order` — của khách, của tài khoản thử và của người vãng lai — và tồn kho **giảm thật** khi đặt, **về kệ** khi huỷ.
Quản trị vẫn là fixture + lớp phủ mô phỏng (B3). Giỏ, mã đang nhập, yêu thích vẫn ở `localStorage`.

## 1. Lát

Sau lát này:

- **Đặt hàng** là một hàm SQL nguyên tử `place_order()`: khoá ô tồn kho, kiểm Số đang mở, trừ `on_hand`, kiểm và tăng
  `used_count` của mã, sinh mã `DH-` từ sequence, tính phí và giảm giá **từ giá trong DB** theo đúng luật `lib/shipping.ts` và
  `lib/orders.ts`. Hai đơn tranh chiếc cuối cùng của một ô → đúng một đơn được.
- **Huỷ** là `cancel_order()`: chỉ chủ đơn, chỉ đơn chưa thu tiền, hàng về kệ, lý do "khách huỷ".
- **Quá hạn chuyển khoản** vẫn suy khi đọc (`effectiveStatus`), **và** có `expire_transfers()` trả hàng về kệ, gọi lười ở đầu
  `place_order()` và mỗi ngày bởi `/api/health`.
- `/order-confirmed/[code]` đọc đơn từ DB (chủ đơn qua phiên, hoặc người vãng lai qua cookie httpOnly); `/account/orders`,
  `/account/orders/[code]`, thông báo, `/track` đều đọc DB. 24 đơn mẫu được seed vào DB và gắn vào tài khoản thử theo `handle`.
- **Mọi 404 của đơn nằm ở server** (khép việc mở của B1: không còn "200 rồi 404 sau hydrate").
- `brand.orders`, `lib/placed-order.ts`, `components/shop/placed-order.ts`, mọi nhánh "đơn trên thiết bị" **xoá hết**.

Dependency: **không thêm gói nào.**

## 1b. Từ báo cáo B1 (23/09, đã đạt và commit `26f2a62`)

- Stack cục bộ và preview 3200 do phiên chính quản; khi bạn bắt đầu, stack **đang chạy** (12 container) và preview có thể đang
  chạy bản B1 — tắt bằng `netstat -ano | grep :3200` → `taskkill //PID <pid> //F` rồi dựng lại. Cổng 3100 không đụng.
- `.env.local` đã có `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DEMO_PASSWORD`; `scripts/env-local.ts`
  nạp nó cho script `tsx`; `vitest.db.config.mts` nạp cùng cách và **đã đặt `fileParallelism: false`** (hai tệp dbtest cùng
  gọi `reset_demo()`; chạy song song làm test idempotent đọc bảng rỗng). Tệp dbtest mới cũng phải chịu được thứ tự bất kỳ.
- `tools/layout-sweep.js` và `tools/backend-shots.js` **đã vá** để mở phiên bằng nút "Đăng nhập thử" (không còn khoá
  `brand.session`); chạy bằng `npx playwright cli --raw run-code --filename=tools/layout-sweep.js > .playwright-cli/sweep.json`.
  Bạn không sửa được `tools/`; nếu cần sửa thì chép sang `.playwright-cli/b2-*.js` và ghi rõ trong báo cáo như B1.
- Mẫu đã có, dùng lại: `getSupabase()` (`lib/db/server.ts`), `getSession()`/`requireSession()`, `loadMe()`/`requireMe()`,
  `lib/actions/state.ts` (`ActionState`, `IDLE`, `safeNext`), `lib/db/account-dto.ts` (mapper thuần, không `server-only`,
  có test), `supabase/README.md` (cập nhật thứ tự dev nếu đổi).
- **Đồng hồ mẫu QĐ-24 vẫn sống**: `demoNow()` = ngày 20–21/09/2026, giờ trong ngày là giờ thật. `new Date()` bị cấm ngoài
  `lib/clock.ts` (`lib/clock.test.ts` quét). Hệ quả cho lát này ở §2 điểm 4.
- Mốc kiểm hiện tại: `npm test` **49 tệp / 1.058 test**; `npm run test:db` **24 test**; build 43 route `ƒ` + `ƒ Proxy`; sweep
  61 lượt 0/0/0/0 (còn `smallTarget 48` + `loneButton 2` tồn dư từ 20/09, không phải việc của bạn); 16 ảnh
  `.playwright-cli/shots/backend/b1/after/`.
- Báo cáo 6 mục tiếng Việt như B1; mục 4 lần này ghi **bảng đối chiếu tổng tiền** TS ↔ SQL và kết quả test tranh chấp.

## 2. Quyết định áp dụng (đã chốt, không hỏi lại)

1. **QĐ-25**: đường dữ liệu chỉ qua server. Trình duyệt không gọi Supabase; 0 request tới 54321 trong nhật ký Playwright.
   Mọi ghi đi qua hàm SQL `security definer set search_path = ''`; **không** policy insert/update/delete nào trên `orders`,
   `order_lines`, `stock_cells`, `promotions` cho `anon`/`authenticated`.
2. **Một hình dạng `Order`** (`data/types.ts`) cho fixture, DB và màn hình. Mở rộng type, không tạo type mới:
   `OrderStatus` thêm `{ state: "RECEIVED" }` (đơn COD/thẻ đã nhận, chưa thu tiền — trước đây chỉ đơn trên thiết bị có);
   `Order` thêm `email: string`, `note: string`, `delivery: DeliveryMethod`, `codFeeVnd: number` (**bắt buộc**; `DeliveryMethod`
   định nghĩa trong `data/types.ts`, `lib/shipping.ts` re-export). Helper `order()` trong `data/orders.ts` điền cho 24 đơn mẫu:
   `email` = email khách, `note = ""`, `delivery = "STANDARD"`, `codFeeVnd = 0` kèm chú giải "phí thu hộ áp dụng từ B2; đơn mẫu
   giữ 0 để số liệu quản trị đã kiểm không đổi". `orderTotalVnd` cộng `codFeeVnd`. `RowState` thu về `OrderState`.
3. **Tiền tính trong DB, theo đúng luật TS**: `STANDARD` 30.000, miễn phí khi subtotal ≥ 1.000.000; `EXPRESS` 45.000, chỉ khi
   `province_code = '29'`; COD +15.000; giảm giá theo `promoDiscountVnd` (PERCENT: `floor`, trần `max_discount_vnd`, không quá
   subtotal; AMOUNT: không quá subtotal; FREE_SHIPPING: bằng phí giao); `min_order_vnd` so với subtotal; tổng `≥ 0`.
   Bằng chứng là **test đối chiếu**: cùng một bộ ≥ 8 ca (mỗi loại mã, ngưỡng miễn phí ±1đ, express, COD, không mã), tổng do
   `checkoutTotals()` và do `place_order()` phải bằng nhau.
4. **Thời gian nghiệp vụ là thời gian của app, không phải `now()` của Postgres.** Mọi hàm nhận `p_now timestamptz` do Server
   Action truyền (`toVnIso(demoNow())`): `placed_at = p_now`, `due_at = p_now + 12h`, kiểm Số mở và cửa sổ mã theo `p_now`,
   `expire_transfers(p_now)`. DB không tự đọc `now()` cho nghiệp vụ (chỉ dùng cho `created_at` kỹ thuật nếu có). Lý do: seed và
   màn hình sống trong đồng hồ mẫu; B3 đổi sang giờ thật chỉ bằng cách đổi `demoNow()`. Test DB nhờ vậy thử được "quá hạn" mà
   không phải chờ.
5. **Mã đơn** `DH-` + số từ sequence `order_seq` bắt đầu **2432** (đơn mẫu cuối là `DH-2431`), `lpad` 4 chữ số (qua 9999 thành
   5 chữ số, chấp nhận). `reset_demo()` chèn 24 đơn mẫu với mã của chúng và `setval` sequence về 2431.
6. **Quyền đọc**: `authenticated` đọc đơn có `profile_id = (select auth.uid())` qua RLS; `anon` không policy nào. Người vãng
   lai đọc qua hai hàm `security definer`: `track_order(p_code, p_phone)` (mã + đúng số điện thoại trên đơn — QĐ-16 với số
   điện thoại thay phiên) và `receipt_order(p_code, p_key uuid)` (khoá truy cập sinh lúc đặt, giữ trong cookie httpOnly
   `guest_orders`, tối đa 10 mã, 30 ngày, `sameSite=lax`). Cả hai trả cùng JSON như `orders` của người đăng nhập; sai mã hay
   sai khoá đều trả `null`, không phân biệt.
7. **QĐ-16**: `/account/orders/[code]` của người khác hoặc không tồn tại → `notFound()` **ở server** (DAL trả `null`). Xoá
   đoạn kiểm hai lần của B1.
8. **Huỷ**: `cancel_order(p_code, p_now)` chỉ khi `profile_id = (select auth.uid())` và trạng thái `AWAITING_TRANSFER` (còn
   hạn) hoặc `RECEIVED`; ghi `CANCELLED`, `cancelled_at = p_now`, `cancel_reason = 'khách huỷ'` (đúng chữ `cancelNote` hiện
   có); trả `on_hand`; **không** hoàn `used_count` của mã (mã đã dùng là đã dùng; ghi vào báo cáo). Người vãng lai không huỷ
   được (màn `/track` vốn không có nút huỷ).
9. **Quá hạn**: `expire_transfers(p_now)` chuyển mọi `AWAITING_TRANSFER` có `due_at <= p_now` sang `CANCELLED` với
   `cancelled_at = due_at`, `cancel_reason = 'quá hạn chuyển khoản'` (đúng `OVERDUE_REASON`) và trả `on_hand`. Gọi ở đầu
   `place_order()` (cùng giao dịch) và trong `GET /api/health` (grant execute cho `anon`; hàm chỉ áp dụng luật nên vô hại).
   `effectiveStatus()` giữ nguyên để màn hình đúng giữa hai lần chạy.
10. **Đầu vào `place_order` được kiểm hai lớp**: Server Action kiểm bằng `validateCheckout()` (`lib/checkout-form.ts`, kể cả
    `findWard`) và giới hạn (≤ 20 chiếc/đơn, ghi chú ≤ 500 ký tự); SQL kiểm lại những gì DB biết (mẫu tồn tại, màu thuộc mẫu,
    Số đang mở, chưa `sold_out_at`, `qty ≥ 1`, tồn đủ, mã còn hiệu lực, email/SĐT khớp regex của B1). Lỗi SQL dùng
    `raise exception using message = '<MÃ>'` với mã cố định: `EMPTY_ORDER`, `BAD_INPUT`, `DROP_CLOSED`, `OUT_OF_STOCK`,
    `PROMO_INVALID`, `NOT_OWNER`, `NOT_CANCELLABLE`; DAL đổi thành lỗi có kiểu, Server Action đổi thành câu tiếng Việt.
11. **Đồng thời**: khoá `stock_cells` bằng `select … for update` theo thứ tự `(product_id, color, size)` cố định để hai đơn
    không deadlock; khoá dòng `promotions` khi có mã. Test DB chạy hai `place_order` **song song** (Promise.all, hai client
    riêng) cho chiếc cuối của một ô: đúng một thành công, `on_hand = 0`, `used_count` đúng.
12. **Màn hình chỉ nối dữ liệu, không đổi thiết kế.** Chữ mới chỉ ở chỗ chữ cũ sai (ghi hết vào mục 4). Nút đang chạy là
    `disabled` không icon (luật dự án).
13. **Quản trị không đụng** (B3): admin vẫn đọc fixture + lớp phủ `brand.adminSim`; riêng nhánh đọc `brand.orders` trong
    `components/admin/SlipScreen.tsx` xoá. Lớp phủ mô phỏng **rút khỏi màn khách** (`OrdersScreen`, `AccountHome`,
    `notif-center.ts`, `TrackScreen`): nó chỉ từng có tác dụng trong cùng một trình duyệt và giờ đơn đã ở DB.
14. Bí mật: không khoá nào vào tệp commit; `access_key` không in ra nhật ký; báo cáo không in khoá.

## 3. Spec

### 3.1 Migration `supabase/migrations/<ts>_orders.sql` (append-only sau B1)

```sql
create type public.payment_method  as enum ('BANK_TRANSFER', 'CARD', 'COD');
create type public.delivery_method as enum ('STANDARD', 'EXPRESS');
create type public.order_state     as enum ('AWAITING_TRANSFER', 'RECEIVED', 'PAID', 'SHIPPING', 'DELIVERED', 'CANCELLED');
create sequence public.order_seq start 2432;

create table public.orders (
  code            text primary key check (code ~ '^DH-[0-9]{4,}$'),
  profile_id      uuid null references public.profiles (id) on delete set null,
  customer_handle text null,                 -- fixture owner; reset_demo() maps it to profile_id when that demo user exists
  access_key      uuid not null default gen_random_uuid(),
  email           text not null,
  recipient       text not null check (length(trim(recipient)) > 0),
  phone           text not null check (phone ~ '^0[0-9]{9}$'),
  line            text not null check (length(trim(line)) > 0),
  province_code   text not null, ward_code text not null,
  note            text not null default '' check (length(note) <= 500),
  delivery        public.delivery_method not null,
  payment         public.payment_method not null,
  shipping_fee_vnd integer not null check (shipping_fee_vnd >= 0),
  cod_fee_vnd     integer not null check (cod_fee_vnd >= 0),
  discount_vnd    integer not null check (discount_vnd >= 0),
  promo_code      text null references public.promotions (code),
  placed_at       timestamptz not null,
  state           public.order_state not null,
  due_at timestamptz null, paid_at timestamptz null, shipped_at timestamptz null, tracking_code text null,
  delivered_at timestamptz null, cancelled_at timestamptz null, cancel_reason text null,
  check (case state
    when 'AWAITING_TRANSFER' then due_at is not null
    when 'RECEIVED'          then true
    when 'PAID'              then paid_at is not null
    when 'SHIPPING'          then shipped_at is not null and tracking_code is not null
    when 'DELIVERED'         then delivered_at is not null
    when 'CANCELLED'         then cancelled_at is not null and cancel_reason is not null end)
);
create index orders_profile on public.orders (profile_id, placed_at desc);
create table public.order_lines (
  order_code     text not null references public.orders (code) on delete cascade,
  position       integer not null,
  product_id     text not null references public.products (id),
  color          public.color_key not null,
  size           public.garment_size not null,
  qty            integer not null check (qty >= 1),
  unit_price_vnd integer not null check (unit_price_vnd > 0),
  primary key (order_code, position)
);
```

- Không lưu `subtotal`/`total` (suy từ dòng và phí, như `Order` hiện có). `unit_price_vnd` là giá lúc đặt, chép từ
  `products.price_vnd` trong cùng giao dịch.
- Bảng seed `seed_orders`, `seed_order_lines` (`like … including all`, bỏ FK tới `profiles`), `revoke all … from anon, authenticated`.
- RLS bật trên `orders`, `order_lines`: policy select `to authenticated` `profile_id = (select auth.uid())` (dòng qua
  `exists` trên đơn); không policy nào khác; `anon` không gì.
- **`place_order(p_input jsonb, p_now timestamptz) returns jsonb`** (`security definer set search_path = ''`, grant execute
  `anon, authenticated`): gọi `expire_transfers(p_now)`; đọc `auth.uid()` làm `profile_id` (null = vãng lai); kiểm và khoá như
  §2.10–11; chèn `orders` + `order_lines`; trả `{ "code": "DH-2432", "accessKey": "<uuid>" }`. `p_input`:
  `{ lines: [{ productId, color, size, qty }], recipient, phone, email, provinceCode, wardCode, line, note, delivery, payment, promoCode }`.
- **`cancel_order(p_code text, p_now timestamptz) returns void`** (`security definer`, grant `authenticated`): §2.8.
- **`expire_transfers(p_now timestamptz) returns integer`** (số đơn vừa huỷ; grant `anon, authenticated`): §2.9.
- **`track_order(p_code, p_phone) returns jsonb`** và **`receipt_order(p_code, p_key uuid) returns jsonb`**
  (`security definer`, grant `anon, authenticated`): trả một đơn dạng JSON camelCase như `catalog_snapshot()` (timestamp
  `+07:00`), `null` khi không khớp. Cùng hàm dựng JSON `order_json(code)` dùng chung với DAL của người đăng nhập để **một mapper**
  (`lib/db/order-dto.ts`, thuần, có test) đọc cả ba đường.
- **`reset_demo(p_anchor)` bản 3**: sau hồ sơ/địa chỉ: truncate `order_lines`, `orders`; chèn từ `seed_orders`/`seed_order_lines`
  với mọi timestamp `+ delta` (delta như phần catalog); `profile_id = (select id from profiles where handle = customer_handle)`
  (null khi chưa có user thử); `setval('order_seq', 2431)`; **không** đụng `on_hand` của seed (tồn kho seed đã trừ sẵn các đơn
  mẫu — đúng như `cut_units − Σ on_hand` hôm nay) và không tăng `used_count` (seed đã có). Vẫn idempotent: chạy hai lần cho
  cùng bộ mã, cùng `access_key`? — **không**: `access_key` sinh lại mỗi lần reset là chấp nhận (cookie khách cũ mất hiệu lực
  sau reset, ghi vào báo cáo).

### 3.2 `scripts/gen-seed.ts`

Sinh `seed_orders` (24) và `seed_order_lines` từ `data/orders.ts` (đã có `email`, `note`, `delivery`, `codFeeVnd` theo §2.2);
`customer_handle` = `customerId` của fixture; trạng thái flatten theo `OrderStatus`. Test chống lệch cập nhật (số đơn, số dòng, mọi
đơn có ≥ 1 dòng, mã duy nhất, `DH-2431` là lớn nhất).

### 3.3 DAL, action, cookie

- `lib/db/order-dto.ts` (thuần): `toOrder(json): Order`; test với JSON mẫu đủ 6 trạng thái.
- `lib/db/orders.ts` (`server-only`): `listMyOrders(): Order[]` (RLS), `findMyOrder(code): Order | null`,
  `loadReceipt(code): Order | null` (phiên trước, cookie sau), `trackOrder(code, phone): Order | null`,
  `placeOrder(input, now)`, `cancelOrder(code, now)`; lỗi có kiểu `OrderError { code: 'OUT_OF_STOCK' | … }`.
- `lib/guest-orders.ts` (thuần) + đọc/ghi cookie trong DAL: `parseGuestOrders`, `rememberGuestOrder` (đầu danh sách, tối đa 10).
- `lib/actions/orders.ts` (`"use server"`): `placeOrderAction(payload)` → kiểm (§2.10) → `placeOrder` → nếu vãng lai, ghi
  cookie → trả `{ ok: true, code }` hoặc `{ ok: false, message }` (câu tiếng Việt: hết hàng nói rõ "Một món vừa hết — mở giỏ
  để đổi size hoặc bỏ món.", Số đóng, mã hết hạn, lỗi chung); `cancelOrderAction(code)` → `requireSession` → `cancelOrder` →
  `revalidatePath('/account/orders')`.
- `app/api/health/route.ts`: sau `select 1`, gọi `rpc('expire_transfers', { p_now })`, trả thêm `expired: n`.

### 3.4 Màn hình (nối dữ liệu, giữ markup)

- **Checkout** (`CheckoutScreen.tsx`): `placeOrder()` gọi `placeOrderAction` (import từ module `"use server"`, gọi như hàm)
  trong `useTransition`; thành công → `clear()` giỏ + `router.push('/order-confirmed/' + code)`; thất bại → thông báo tại chỗ
  (dùng `Toast` sẵn có; với `OUT_OF_STOCK` thêm `router.refresh()` để giỏ đọc lại tồn kho). Nút đặt hàng `disabled` không
  icon khi đang gửi. Bỏ `nextOrderCode`, `writePlacedOrder`, `PlacedOrder`.
- **Xác nhận** `app/order-confirmed/[code]/page.tsx` + `OrderConfirmed` nhận `order: Order` và `addressLine` (server dựng bằng
  `formatAddressLine`), `dropNo`; `robots noindex`. `/order-confirmed` (không mã) giữ trạng thái rỗng với chữ mới: "Mở lại từ
  liên kết trong email xác nhận hoặc tra cứu bằng mã đơn và số điện thoại." Câu "Đơn lưu trên thiết bị này…" thay bằng sự thật
  mới (đơn trong tài khoản / tra cứu bằng mã + SĐT). Câu về email vẫn "đang chuẩn bị".
- **Đơn của tôi**: `app/account/orders/page.tsx` và `[code]/page.tsx` gọi `listMyOrders()` (và `findMyOrder(code)` → `notFound()`),
  truyền `orders` xuống `OrdersScreen`; bỏ `usePlacedOrders`, `useSimOverlay`, `shopOrders`, `fixtureOrdersOf`, `deviceOrdersOf`,
  `visibleDeviceOrder`. `AccountHome`, `notif-center.ts`/`NotificationsScreen`, `app/account/page.tsx`,
  `app/account/notifications/page.tsx` nhận `orders` từ server tương tự. Huỷ: `CancelOrderSheet` → `cancelOrderAction`.
- **Tra cứu**: `app/track/page.tsx` gọi `trackOrder(code, phone)`; `TrackScreen` bỏ nhánh thiết bị và lớp phủ; `lookup.ts` giữ
  `normaliseOrderCode`, `phoneDigits`, `samePhone`, `trackHref`, `notFoundMessage`, `trackedOfOrder` (nay đọc `note`,
  `codFeeVnd` từ `Order`), bỏ `findFixtureOrder`, `findDeviceOrder`, `lookupOrder`, `trackedOfPlaced`.
- **`lib/customer-orders.ts`**: `orderTimeline` thêm nhánh `RECEIVED` (= nhánh không-chuyển-khoản của `deviceTimeline` cũ),
  `noteOfOrder`/`refundNote`/`inTab` xử lý `RECEIVED`; `visibleOrder` xoá (DB quyết). `lib/order-rows.ts` chỉ còn
  `rowOfOrder`, `orderRows(catalog, orders, now)`, `rowsForTab`, `rowCount`, `canCancel`, `cancelNote` (đọc từ `status.reason`).
  `TRANSFER_HOLD_HOURS`, `transferDeadlineIso`, `transferReference` chuyển sang `lib/orders.ts`.
- **`lib/me.ts`**: bỏ `fixtureOrdersOf`; `Me` giữ nguyên.
- **Xoá**: `lib/placed-order.ts` (+ test), `components/shop/placed-order.ts`, nhánh `ShopperNote` trong `SlipScreen.tsx` (ghi chú
  của đơn DB lên phiếu là việc B3).

### 3.5 Test

- `npm test` (không Docker): mapper `order-dto`, `guest-orders`, `validateCheckout` không đổi, `orderTimeline`/`effectiveStatus`
  với `RECEIVED`, `gen-seed` chống lệch, `data/orders.test.ts` giữ các bất biến, `clock.test.ts` xanh (không `new Date()` mới).
- `npm run test:db` (`lib/db/orders.dbtest.ts`, chịu được `fileParallelism: false`): (a) đối chiếu tổng tiền ≥ 8 ca (§2.3);
  (b) tranh chấp chiếc cuối (§2.11); (c) Số đóng → `DROP_CLOSED`; mã hết lượt/hết hạn/dưới ngưỡng → `PROMO_INVALID`;
  `used_count` tăng đúng 1; (d) `cancel_order`: hàng về kệ, người khác → `NOT_OWNER`, đơn `PAID` mẫu → `NOT_CANCELLABLE`;
  (e) `expire_transfers` với `p_now` sau hạn: huỷ đúng đơn, `on_hand` cộng lại, chạy lần hai trả 0; (f) RLS: user thấy đúng đơn
  của mình (đơn mẫu của `c-minhanh` là 5), `anon` thấy 0; `track_order` sai SĐT → `null`; `receipt_order` sai khoá → `null`;
  (g) `reset_demo` sau khi đặt/huỷ vài đơn đưa về đúng 24 đơn, mã kế tiếp lại là `DH-2432`.
- Playwright (preview 3200, `db reset` + `seed:users` trước): vãng lai đặt chuyển khoản → `/order-confirmed/DH-2432` có đếm
  ngược 12 giờ và khối chuyển khoản → `/track` đúng SĐT thấy, sai SĐT không; đăng nhập thử → chọn một ô có `on_hand = 1`
  (tra trong `supabase/seed.sql`), đặt COD → `/account/orders` có đơn `RECEIVED`, PDP báo size đó hết → huỷ → "khách huỷ",
  PDP size đó còn lại; hai tab cùng đặt chiếc cuối → một tab nhận "vừa hết"; `/order-confirmed/DH-2210` khi không phải chủ →
  404 thật; `/account/orders/DH-2210` bằng tài khoản khác → 404; đăng xuất, vãng lai mở lại `/order-confirmed/<mã vừa đặt>`
  vẫn thấy (cookie); **0 request ngoài 3200**; sweep 0/0/0/0 (ngoài tồn dư).

## 4. Kiểm nghiệm thu

1. `npx supabase db reset` sạch (3 migration + seed); `npm run seed:users` idempotent như B1; `npm run db:types`, `npm run seed:gen`
   không đổi tệp commit sau khi bạn đã chạy chúng.
2. Typecheck sạch; `npm test` xanh (số test tăng, ghi số); `npm run test:db` xanh gồm test tranh chấp; `npm run build` sạch với
   stack tắt.
3. Grep gate B1 giữ nguyên; thêm: `grep -rn "brand.orders\|PLACED_ORDERS\|placed-order\|PlacedOrder\|nextOrderCode" app components lib`
   → 0 dòng; `grep -rn "useSimOverlay\|shopOrders" components/account components/shop lib/lookup.ts lib/order-rows.ts` → 0.
4. Kịch bản Playwright §3.5, ảnh mỗi bước ở 390 và 1280 vào `.playwright-cli/shots/backend/b2/`; sweep; `tools/backend-shots.js`
   chạy lại vào `…/b2/after/` (sửa `OUT` qua bản chép nếu cần) và so `…/b1/after/`: chỉ lệch ở đồng hồ và phần đơn hàng.
5. Không khoá nào trong diff (`git diff | grep -E 'eyJ[A-Za-z0-9_-]{20,}|sb_secret'` rỗng).

## 5. Sản phẩm nộp

Migration, seed sinh lại, `database.types.ts` sinh lại, `gen-seed.ts` + test, DAL/DTO/cookie, actions, màn hình đã nối, tệp xoá;
ảnh `.playwright-cli/shots/backend/b2/…`; `.playwright-cli/sweep.json`; báo cáo 6 mục — mục 4 gồm bảng đối chiếu tổng tiền TS ↔ SQL,
kết quả test tranh chấp, và mọi câu chữ đã bỏ/đổi.

## Đọc trước khi sửa

Supabase (WebFetch): https://supabase.com/docs/guides/database/functions · https://supabase.com/docs/guides/database/postgres/row-level-security ·
https://supabase.com/docs/reference/javascript/rpc · https://www.postgresql.org/docs/current/explicit-locking.html ·
https://www.postgresql.org/docs/current/plpgsql-errors-and-messages.html. Next (cục bộ): `02-guides/server-actions.md` (gọi action như
hàm từ client component, `useTransition`), `03-api-reference/04-functions/cookies.md` (`cookies()` async, httpOnly), `02-guides/data-security.md`,
`03-api-reference/03-file-conventions/dynamic-routes.md`. Dự án: `lib/shipping.ts`, `lib/orders.ts`, `lib/promotions.ts`, `lib/cart.ts`,
`lib/checkout-form.ts`, `lib/customer-orders.ts`, `lib/order-rows.ts`, `lib/lookup.ts`, `lib/placed-order.ts`, `data/orders.ts`,
`components/checkout/*`, `components/account/{OrdersScreen,OrderDetailScreen,CancelOrderSheet,AccountHome,notif-center}.tsx/ts`,
`components/shop/TrackScreen.tsx`, `supabase/migrations/*`, `tasks/plan.md` QĐ-15/16/24, `DESIGN.md` §9.
