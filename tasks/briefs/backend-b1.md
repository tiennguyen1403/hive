# Brief — Lát B1: tài khoản thật (Supabase Auth), hồ sơ, sổ địa chỉ *(nháp 23/09/2026, giao sau khi B0b commit)*

Agent: `backend-implementer`. Hồ sơ nền: `tasks/backend.md` (QĐ-25). Tiền đề: B0a và B0b đã đạt — catalog đọc từ
Postgres qua `loadCatalog()`, `lib/db/server.ts` dựng server client, stack cục bộ chạy bằng `npx supabase start`,
`supabase/seed.sql` sinh từ `scripts/gen-seed.ts`, hàm `reset_demo()` dựng lại catalog.

Lát này thay **đăng nhập mô phỏng** (QĐ-15: `lib/session.ts` khớp email với fixture, mật khẩu không kiểm) bằng Supabase
Auth email + mật khẩu; đưa **hồ sơ** và **sổ địa chỉ** lên Postgres với RLS; phiên đọc trên server. Đơn hàng vẫn là
fixture (B2). Quản trị chưa có cổng (B3). Giỏ, yêu thích, để dành, tìm kiếm gần đây, tuỳ chọn vẫn ở `localStorage`.

## 1. Lát

Sau lát này:

- Đăng ký, đăng nhập, đăng xuất, đổi mật khẩu là **Server Actions** gọi Supabase Auth qua server client; trình duyệt
  không gọi Supabase (QĐ-25). Cookie phiên do `@supabase/ssr` đặt; `proxy.ts` ở gốc làm mới token bằng `getClaims()`.
- `profiles` (1–1 `auth.users`) và `addresses` trong Postgres, RLS "chỉ chủ đọc/ghi". Bảng seed + `reset_demo()` mở
  rộng để hồ sơ và địa chỉ của 8 khách fixture có mặt trong DB khi các user thử đã được tạo.
- Tám **tài khoản thử** tạo bằng `auth.admin.createUser` (script riêng), cùng một mật khẩu thử lấy từ env
  `DEMO_PASSWORD`; màn đăng nhập có nút **"Đăng nhập thử"** (vào thẳng tài khoản `c-minhanh`) và in email + mật khẩu
  thử vì demo công khai.
- `AccountGuard` (client) thay bằng kiểm phiên trên server trong từng trang `/account/*`; `SessionContext` thay bằng
  `MeProvider` nhận DTO hồ sơ từ server. QĐ-16 giữ: đơn của người khác → `notFound()`.
- Mọi ghi chú "không có máy chủ", "đừng nhập mật khẩu thật", "lưu trên thiết bị này" ở các màn đăng nhập/đăng ký/đổi
  mật khẩu/sổ địa chỉ **bỏ**, vì chúng không còn đúng (DESIGN §9 rule 3). Quên mật khẩu **giữ** trạng thái "đang chuẩn
  bị" vì chưa có máy chủ gửi thư; không gọi `resetPasswordForEmail`.

Dependency: **không thêm gói nào**. Bốn gói của B0b đủ.

## 2. Quyết định áp dụng (đã chốt, không hỏi lại)

- **QĐ-25**: đường dữ liệu chỉ qua server. Không `NEXT_PUBLIC_SUPABASE_*`, không `createBrowserClient`, không import
  `@supabase/*` trong tệp `"use client"`. Kiểm bằng nhật ký request của Playwright: **0 request tới 54321**.
- **QĐ-15 (bản backend thật)**: đăng nhập sai trả **một** câu chung "Email hoặc mật khẩu chưa đúng." dù lỗi là gì; đăng ký
  với email đã có trả "Không tạo được tài khoản với email này." — không lộ email tồn tại. Đổi mật khẩu yêu cầu mật khẩu
  hiện tại (`updateUser({ password, current_password })` hoặc đăng nhập lại trước khi đổi; chọn cách docs Supabase mô
  tả và ghi vào báo cáo).
- **QĐ-16**: `/account/orders/[code]` của người khác → `notFound()`, không phải "không có quyền".
- **Demo công khai** (người dùng chốt 23/09): ai cũng đăng ký được; xác nhận email **tắt** (`[auth.email]
  enable_confirmations = false`, mặc định cục bộ); tài khoản thử công khai; rate limit mặc định của Supabase.
- **Quy tắc mật khẩu của app giữ**: ≥ 8 ký tự, có chữ và số (`lib/account-form.ts` `PASSWORD_MIN`), kiểm trong Server
  Action trước khi gọi Supabase; `config.toml` `[auth] minimum_password_length = 8` cho khớp.
- **Số điện thoại** vẫn theo `lib/checkout-form.ts` (10 số, bắt đầu 0, lưu 10 số).
- **Kiểu domain giữ**: `Customer`, `Address`, `AddressId` trong `data/types.ts` là DTO; `AddressId` nay là chuỗi uuid,
  `CustomerId` nay là uuid của `auth.users` — **nhưng** `handle` (`c-minhanh`) giữ trong `profiles.handle` để đơn
  fixture (B2 mới lên DB) còn tra được bằng `ordersOf(handle)`.
- **Đồng hồ mẫu QĐ-24 giữ**; `joined_at` của user thử lấy từ fixture qua `reset_demo()`, user đăng ký mới lấy `now()`
  thật (chấp nhận, ghi vào báo cáo).
- Bí mật: khoá service chỉ đọc từ env lúc chạy script (`SUPABASE_SECRET_KEY` trong `.env.local`, git-ignored) hoặc từ
  `npx supabase status -o env`; **không** vào tệp commit, không in ra báo cáo. `DEMO_PASSWORD` cũng từ env, có giá trị
  mặc định `xemthu-2026` trong `.env.example` (đây là mật khẩu công khai của demo, được phép hiện trên màn).

## 3. Spec

### 3.1 Migration `supabase/migrations/<ts>_accounts.sql` (append-only sau B0b)

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique,                       -- fixture id such as 'c-minhanh'; null for real sign-ups
  name text not null check (length(trim(name)) > 0),
  email text not null,                      -- copy of auth email for lists; kept in sync by trigger
  phone text not null check (phone ~ '^0[0-9]{9}$' or phone = ''),
  joined_at timestamptz not null default now()
);
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  recipient text not null, phone text not null check (phone ~ '^0[0-9]{9}$'),
  line text not null, province_code text not null, ward_code text not null,
  label text not null check (label in ('Nhà','Công ty','Khác')),
  is_default boolean not null default false,
  position integer not null,
  unique (profile_id, position)
);
create unique index addresses_one_default on public.addresses (profile_id) where is_default;
create index addresses_profile on public.addresses (profile_id);
```

- Trigger `public.handle_new_user()` (`security definer set search_path = ''`) sau `insert on auth.users`: chèn
  `profiles` từ `new.raw_user_meta_data` (`name`, `phone`, `handle`) và `new.email`. Đúng mẫu docs
  https://supabase.com/docs/guides/auth/managing-user-data. Chỉ tham chiếu `auth.users(id)`, không cột khác.
- RLS bật; policy đặt tên rõ, luôn có `to authenticated`, dùng `(select auth.uid())`:
  `profiles`: select/update own (`id = (select auth.uid())`); không insert (trigger làm), không delete.
  `addresses`: select/insert/update/delete own qua `profile_id = (select auth.uid())`; insert `with check` cùng điều kiện.
  `anon`: không policy nào. Nguồn: https://supabase.com/docs/guides/database/postgres/row-level-security.
- Bảng seed: `seed_customers(handle, name, email, phone, joined_at)` và `seed_addresses(handle, recipient, phone, line,
  province_code, ward_code, label, is_default, position)`; `revoke all … from anon, authenticated`.
- `reset_demo(p_anchor)` **mở rộng**: sau phần catalog, với mỗi `seed_customers` mà `auth.users` có email trùng
  (đọc `auth.users` được vì `security definer`): upsert `profiles` (`handle`, `name`, `phone`, `joined_at + delta`) và
  thay toàn bộ `addresses` của profile đó bằng `seed_addresses` cùng `handle`. Handle chưa có user → bỏ qua, không lỗi.
  Vẫn idempotent.
- `scripts/gen-seed.ts` mở rộng để sinh hai bảng seed này từ `data/customers.ts` (8 khách, 9 địa chỉ); test chống lệch
  cập nhật.

### 3.2 Tài khoản thử: `scripts/seed-users.ts` + script `seed:users`

- `createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)` (service role, chỉ server/script) →
  `auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { handle, name, phone } })`
  cho 8 khách trong `data/customers.ts`; email đã tồn tại thì bỏ qua (idempotent); xong gọi `rpc('reset_demo')`
  để hồ sơ/địa chỉ về đúng fixture. In ra **số** user tạo/bỏ qua, không in khoá, không in mật khẩu.
- Thứ tự dev: `npx supabase db reset` → `npm run seed:users`. Ghi vào `README` ngắn trong `supabase/README.md`
  (tệp mới, được phép vì nằm trong `supabase/`).

### 3.3 `config.toml`

`[auth] site_url = "http://127.0.0.1:3200"`, `additional_redirect_urls` thêm `http://127.0.0.1:3100`,
`minimum_password_length = 8`; `[auth.email] enable_confirmations = false` (giữ mặc định, ghi rõ bằng chú giải).

### 3.4 `proxy.ts` (gốc dự án) và DAL

- `proxy.ts`: đúng mẫu "Setting up Server-Side Auth for Next.js" của Supabase (bản Next 16 gọi tệp là `proxy.ts`):
  tạo server client với cookie adapter trên `request`/`response`, gọi `supabase.auth.getClaims()` để làm mới token,
  không kiểm DB, không redirect (kiểm phiên nằm trong trang/action — docs Next: proxy chỉ là kiểm lạc quan). `matcher`
  loại `_next/static`, `_next/image`, `favicon`, ảnh, và `/api/wards`.
- `lib/db/session.ts` (`server-only`): `getSession = cache(async () => ({ userId, email } | null))` từ `getClaims()`;
  `requireSession(nextPath)` → `redirect('/sign-in?next=' + nextPath)` khi chưa đăng nhập. Không bao giờ dùng
  `getSession()` của Supabase trên server.
- `lib/db/profiles.ts`: `loadMe(): Promise<MeDto | null>` (`{ id, handle, name, email, phone, joinedAt }`),
  `updateMe(patch)`; `lib/db/addresses.ts`: `listAddresses()`, `addAddress()`, `updateAddress()`, `removeAddress()`,
  `setDefaultAddress()` — tất cả đi qua server client của phiên (RLS lọc), trả kiểu domain `Address`.
- Đơn: `ordersOf(handle)` từ fixture như cũ; `me.handle` null (user mới) → không có đơn fixture, danh sách trống hợp lệ.

### 3.5 Server Actions: `lib/actions/auth.ts`, `lib/actions/addresses.ts` (`"use server"`, mỏng, gọi DAL)

- `signIn(prev, formData)`: kiểm định dạng bằng `lib/account-form.ts`; `signInWithPassword`; lỗi bất kỳ → câu chung
  QĐ-15; thành công → `redirect(next)` với `next` chỉ nhận đường dẫn cùng origin bắt đầu bằng `/` (giữ kiểm hiện có).
- `signUp(prev, formData)`: kiểm đủ luật (tên, email, SĐT, mật khẩu, đồng ý điều khoản); `signUp({ email, password,
  options: { data: { name, phone } } })`; vì tắt xác nhận nên có phiên ngay → `redirect('/account')`.
- `signOut()`: `auth.signOut()` rồi `redirect('/')`.
- `changePassword(prev, formData)`: luật hiện có (khác mật khẩu cũ, xác nhận khớp) rồi `updateUser` theo cách docs.
- `demoSignIn()`: `signInWithPassword` với email `CUSTOMERS[0].email` và `process.env.DEMO_PASSWORD` → `/account`.
- Địa chỉ: `addAddress`, `editAddress`, `removeAddress`, `makeDefault` — mỗi action `requireSession()` rồi DAL;
  `revalidatePath('/account/addresses')` (mô hình cũ, `cacheComponents` chưa bật). Mọi action **tự** kiểm phiên và
  quyền sở hữu, không tin id từ client (docs Next: Server Actions là endpoint công khai).
- Lỗi mong đợi trả về dạng giá trị `{ errors }` cho `useActionState`; không `throw` cho lỗi kiểm.

### 3.6 Màn hình (chỉ nối dữ liệu, không đổi thiết kế)

- `app/sign-in`, `app/sign-up`, `app/account/password`, `app/account/profile`, `app/account/addresses*`, `app/account`
  và các trang `/account/*` khác: trang server gọi `requireSession()`/`loadMe()`; component client hiện có chuyển sang
  `<form action={…}>` + `useActionState`, giữ nguyên markup, class, lời chữ (trừ các ghi chú "mô phỏng" bị bỏ).
- `components/account/SessionContext.tsx` → `MeProvider`/`useMe()` nhận DTO từ server (root layout gọi `loadMe()`,
  null khi khách); `AccountGuard` xoá; `AccountRail` nút đăng xuất là form gọi `signOut`; `SiteNav` đọc `useMe()` cho
  trạng thái biểu tượng tài khoản.
- `SignInScreen`: thêm nút **"Đăng nhập thử"** (form gọi `demoSignIn`) và dòng "Tài khoản thử: <email> · mật khẩu:
  <DEMO_PASSWORD>" do server render; nút Google vẫn `disabled` "đang chuẩn bị".
- `ForgotPasswordScreen`: giữ "đang chuẩn bị · chưa có máy chủ gửi thư", không gọi Supabase.
- Checkout: khi đăng nhập, sổ địa chỉ lấy từ DB (`listAddresses()` ở trang server, truyền xuống); khách vãng lai giữ
  sổ trên thiết bị như hiện nay (B2 quyết phần đơn). Wishlist/giỏ không đổi.
- `lib/session.ts` và test của nó: xoá hoặc thu về phần thuần còn dùng (`normalisePhone` v.v.); `data/customers.ts`
  giữ làm fixture/seed.

### 3.7 Test

- `npm test` (không Docker): validator của action, mapper DTO, `gen-seed` chống lệch (cập nhật), `lib/clock.test.ts`.
- `npm run test:db`: (a) trigger tạo `profiles` khi tạo user bằng admin API; (b) RLS: client anon không đọc `profiles`;
  user A đăng nhập (`signInWithPassword` bằng client thường trong test) không thấy địa chỉ của user B; (c) `reset_demo()`
  sau `seed:users` cho đúng 8 profiles có handle và 9 địa chỉ, chạy hai lần không đổi; (d) `seed:users` idempotent.
- Playwright (preview 3200, stack chạy, đã `db reset` + `seed:users`): đăng nhập thử → `/account` hiện "Minh Anh";
  đăng ký user mới → vào `/account` với 0 đơn; `/account/orders/DH-2210` của người khác → 404; thêm/sửa/xoá/đặt mặc định
  địa chỉ; đổi mật khẩu rồi đăng nhập lại bằng mật khẩu mới; đăng xuất về `/`; `/account` khi chưa đăng nhập →
  `/sign-in?next=/account`. **0 request ngoài 3200** (đặc biệt không có 54321). Sweep 0/0/0/0.

## 4. Kiểm nghiệm thu

1. `npx supabase db reset` sạch; `npm run seed:users` in 8 tạo (lần đầu) / 8 bỏ qua (lần hai).
2. `npm run db:types`, `npm run seed:gen` không làm đổi tệp commit; `npm test` xanh khi stack stop; `npm run test:db`
   xanh khi stack chạy; typecheck sạch; `npm run build` sạch khi stack stop.
3. Grep gate B0b giữ nguyên (không `NEXT_PUBLIC_SUPABASE`, không `@supabase/` trong tệp `"use client"` hay `components/`,
   không `createBrowserClient`); thêm: `grep -rl "chế độ mô phỏng\|không có máy chủ\|đừng nhập mật khẩu thật"
   components/account app/sign-in app/sign-up` chỉ còn ở `ForgotPasswordScreen` và các màn quản trị (B3).
4. Kịch bản Playwright §3.7 chạy qua, mỗi bước một ảnh ở 390 và 1280 vào `.playwright-cli/shots/backend/b1/`; sweep
   sạch; `tools/backend-shots.js` (16 ảnh) chạy lại và so với `…/b0b/after/*`: chỉ được lệch ở phần tài khoản.
5. Không khoá nào trong diff (`grep -E 'eyJ[A-Za-z0-9_-]{20,}|sb_secret'` rỗng).

## 5. Sản phẩm nộp

Migration, seed, `database.types.ts` sinh lại, `scripts/seed-users.ts`, `supabase/README.md`, `proxy.ts`, DAL, actions,
màn hình đã nối; ảnh `.playwright-cli/shots/backend/b1/…`; `.playwright-cli/sweep.json`; báo cáo 6 mục, mục 4 ghi rõ
cách đổi mật khẩu đã chọn theo docs và mọi câu chữ đã bỏ/đổi trên màn hình.

## Đọc trước khi sửa

Supabase (WebFetch): https://supabase.com/docs/guides/auth/server-side/nextjs ·
https://supabase.com/docs/guides/auth/server-side/creating-a-client · https://supabase.com/docs/guides/auth/passwords ·
https://supabase.com/docs/guides/auth/managing-user-data · https://supabase.com/docs/guides/database/postgres/row-level-security ·
https://supabase.com/docs/reference/javascript/auth-admin-createuser · https://supabase.com/docs/guides/local-development/cli/config.
Next (cục bộ): `02-guides/authentication.md` (DAL, `verifySession`, proxy chỉ kiểm lạc quan), `01-getting-started/07-mutating-data.md`,
`02-guides/server-actions.md`, `02-guides/data-security.md`, `03-api-reference/03-file-conventions/proxy.md`,
`03-api-reference/04-functions/cookies.md`. Dự án: `lib/session.ts`, `components/account/*`, `lib/account-form.ts`,
`lib/address-book.ts`, `data/customers.ts`, `tasks/plan.md` mục QĐ-15/QĐ-16, `DESIGN.md` §8–§9.
