# Brief B4 — Triển khai: `vercel.json` + cron, route đặt lại hằng ngày, README công khai

*24/09/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit. Không đụng `prototype/`,
`DESIGN.md`, `PRODUCT.md`, `tasks/`, `.impeccable/`, `.claude/`, `tools/`. **Không đọc `.env.hosted.local`,
không chạy gì trỏ vào dự án hosted** (không `supabase link/push`, không `vercel` CLI): mọi kiểm của lát này
chạy trên stack Docker cục bộ; phần hosted phiên chính tự kiểm sau khi deploy.*

## 1. Lát

Lát cuối của QĐ-25: app lên Vercel Hobby, trỏ vào dự án Supabase Free đã có. Hạ tầng đã xong sáng 24/09
(§1b), và bản build hiện tại đã chạy đúng trên DB hosted, nên lát này **không sửa đường dữ liệu**. Việc còn
lại nhỏ nhưng phải đúng: khai báo cron, route đặt lại dữ liệu mẫu cho cron gọi, vệ sinh repo công khai, README.

| Việc | Có | Không |
|---|---|---|
| `vercel.json` | vùng `sin1`; 2 cron: health, reset | không `builds`, `rewrites`, `env`, `functions` |
| `app/api/reset/route.ts` | GET; bảo vệ bằng `CRON_SECRET`; `demo_anchor` + `reset_demo` qua service client; xoá `up/*`; revalidate | không POST, không tham số, không gọi từ UI |
| `lib/cron-auth.ts` (+ test) | hàm thuần kiểm header cron, health và reset cùng dùng | — |
| `app/api/health/route.ts` | chỉ đổi sang `cronAuthorized`, hành vi y nguyên | — |
| `.gitignore`, `.env.example` | thêm `.vercel/`; chú giải `CRON_SECRET` nhắc thêm `/api/reset` | — |
| `README.md` gốc | tiếng Việt, ≤ 60 dòng | không viết lại tài liệu |
| Bằng chứng TZ | `TZ=UTC npm test` + preview `TZ=UTC` đi ba chỗ có giờ | không sửa `lib/datetime.ts` trừ khi bằng chứng bắt |

## 1b. Đã có sẵn (phiên chính, 24/09 sáng)

- Dự án Supabase hosted, vùng `ap-southeast-1`, Postgres 17.6 (local cũng 17). 6 migration đã `db push`,
  `seed.sql` đã chạy, 9 tài khoản mẫu đã tạo bằng `ENV_FILE=.env.hosted.local npm run seed:users`. Bucket
  `product-photos` đúng cấu hình (public, 1.572.864 byte, webp+jpeg). "Confirm email" đã tắt trên hosted.
- `scripts/env-local.ts` nay nhận biến `ENV_FILE` (mặc định `.env.local`) — phiên chính sửa, đang ở working
  tree; **giữ nguyên**, sẽ commit cùng lát này.
- Build lát 7 chạy trên cổng 3201 trỏ hosted: kịch bản lát 7 đi trọn (tạo mẫu với ảnh thật cắt qua sheet, khách
  thấy ảnh qua `/photos/up/…`, sửa KHÓI, đặt lại xoá 2 ảnh, bucket trống, 0 request ngoài loopback, 0 lỗi console).
- `/api/health` đã có: bearer `CRON_SECRET` khi biến tồn tại, đếm `drops`, `expire_transfers`. Trên 3201 với
  secret: `{"ok":true,"drops":4,"expired":0}`; không header → 401.
- `TZ=UTC npm test`: 1.244/1.244. `lib/datetime.ts` đọc giờ từ chuỗi ISO `+07:00`; `toVnIso` bù
  `getTimezoneOffset()`; `weekdayLabel` dùng UTC. Không chỗ nào gọi `toLocale*String` cho ngày giờ.
- Build hiện tại: chỉ `/_global-error` tĩnh; mọi route còn lại động (không lo ISR giữ dữ liệu cũ sau reset).
- Người dùng sẽ import repo vào Vercel và đặt 6 biến: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SECRET_KEY`, `DEMO_PASSWORD`, `CRON_SECRET`, `TZ=Asia/Ho_Chi_Minh`. Repo sẽ công khai.
- `reset_demo(timestamptz)`: grant `authenticated` (tự kiểm admin bên trong) và `service_role`.
  `demo_anchor(timestamptz default now())`: grant `authenticated`, `service_role`; trả mốc **18:50 gần nhất**
  theo giờ VN. `purgeUploadedPhotos(): Promise<number>` ở `lib/db/photos.ts` dùng `getServiceSupabase()`.

## 2. Quyết định đã chốt (không hỏi lại)

1. **Hai cron, đúng giới hạn Hobby** (2 cron/tài khoản, mỗi cron tối đa 1 lần/ngày, có thể trễ tới 59 phút —
   xác minh lại trong docs Vercel và ghi nguồn vào báo cáo). Lịch viết theo **UTC** (Vercel không nhận múi giờ
   trong schedule):
   - `/api/health` · `0 3 * * *` (10:00 VN, giờ vắng).
   - `/api/reset` · `55 11 * * *` (18:55 VN). `demo_anchor()` lấy mốc 18:50 gần nhất nên chạy trễ tới 19:54 vẫn
     ra mốc hôm nay; chạy sớm không xảy ra (Vercel không kích trước giờ).
2. **`vercel.json` tối thiểu:** `{"regions":["sin1"],"crons":[…]}`. Không `framework` (tự nhận Next), không
   `functions`. Xác minh `regions` hợp lệ trên Hobby (một vùng) trong docs, ghi nguồn.
3. **Route reset, `GET /api/reset`:**
   - `CRON_SECRET` **không đặt → 404** (khác health: đặt lại dữ liệu không được phép gọi từ internet khi chưa có
     khoá; máy dev muốn thử thì đặt biến trong shell của `next start`).
   - Có đặt mà header thiếu/sai → **401** `Unauthorized` (như health).
   - Đúng: `getServiceSupabase()` (secret key) → `rpc("demo_anchor")` → `rpc("reset_demo", { p_anchor })` →
     `purgeUploadedPhotos()` → `revalidatePath("/", "layout")` → **200** `{ ok: true, anchor: <iso>, photosRemoved: n }`,
     `Cache-Control: no-store`.
   - Service client `null` (thiếu secret key) → **503** `{ ok: false }`. `demo_anchor`/`reset_demo` lỗi → **503**
     `{ ok: false }`, `console.error` message (không trả về: endpoint công khai không kể tên schema/role).
   - Bucket không xoá được → vẫn **200** với `photosRemoved: null` và `console.error`: DB đã reset xong thì
     không nói là hỏng (cùng lý lẽ với action `resetDemo`).
   - `export const dynamic = "force-dynamic"`, `export const maxDuration = 60` (Hobby cho phép; đọc docs Next về
     segment config trong `node_modules/next/dist/docs/` trước).
   - **Không** gọi lại action `resetDemo` (nó `requireAdmin` bằng session). Nếu tách phần chung (anchor → reset →
     purge) thành một hàm trong `lib/db/` thì action phải giữ nguyên hành vi và **từng chuỗi toast**.
4. **`lib/cron-auth.ts`:** `cronAuthorized(header: string | null, secret: string | undefined)` trả
   `"no-secret" | "ok" | "unauthorized"`. So sánh bằng `crypto.timingSafeEqual` khi cùng độ dài, khác độ dài →
   `"unauthorized"`. Chỉ nhận đúng dạng `Bearer <secret>` (phân biệt hoa thường ở secret; không so khớp tiền tố).
   Health: `"no-secret"` → chạy tiếp (như cũ). Reset: `"no-secret"` → 404. Test vitest 6 ca.
5. **`.gitignore`:** thêm `.vercel/`. **`.env.example`:** chú giải `CRON_SECRET` nhắc cả `/api/reset` và nói
   rõ reset **tắt** khi biến trống.
6. **README gốc, tiếng Việt, ≤ 60 dòng:** HIVE là gì (demo/portfolio streetwear, không khách thật, không tiền
   thật); stack (Next 16 App Router, Supabase Postgres + Auth + Storage chỉ qua server, Vercel Hobby, cron
   hằng ngày đặt lại dữ liệu mẫu 18:55 VN); chạy cục bộ (Docker, `npx supabase start`, `.env.example` →
   `.env.local`, `npm run seed:users`, `npm run preview`); kiểm (`npm test`, `npm run test:db`,
   `node tools/layout-sweep.js`); tài khoản mẫu (mật khẩu `xemthu-2026`, công khai theo thiết kế, nút "Đăng
   nhập thử"/"Vào quản trị thử"); **cố ý không có** (QĐ-25 §10: cổng thanh toán, webhook ngân hàng, API vận
   chuyển, email/SMS); dòng `Demo: (đang đặt)` — phiên chính điền URL sau. Không lặp lại `tasks/backend.md`.
   Chữ trên README là văn bản người đọc → tiếng Việt; code và chú giải trong code vẫn tiếng Anh.
7. **TZ:** không thêm `TZ` vào code, không sửa `lib/datetime.ts` trước khi có bằng chứng. Bằng chứng: chạy
   preview thứ hai với `TZ=UTC` trong env của `next start` (cổng 3210), đi ba chỗ có giờ — trang chủ (đồng hồ
   Số), một đơn ở `/account/orders/…` (giờ đặt, hạn chuyển khoản), `/admin/log` (cột giờ) — và so từng ký tự
   với preview bình thường (3200). Lệch ở đâu sửa đúng chỗ đó, kèm test.
8. Không đổi `next.config.mjs`, không thêm `NEXT_PUBLIC_*`, không thêm gói.

## 3. Đặc tả

### 3.1 `vercel.json`

```json
{
  "regions": ["sin1"],
  "crons": [
    { "path": "/api/health", "schedule": "0 3 * * *" },
    { "path": "/api/reset", "schedule": "55 11 * * *" }
  ]
}
```

Chú giải không đặt được trong JSON → lý do (UTC, giới hạn Hobby, vì sao 18:55) ghi trong doc comment của
`app/api/reset/route.ts`.

### 3.2 `lib/cron-auth.ts` + `lib/cron-auth.test.ts`

Hàm thuần, không import Next. Ca test: không secret → `no-secret`; đúng → `ok`; thiếu header → `unauthorized`;
sai một ký tự → `unauthorized`; khác độ dài → `unauthorized`; `bearer` viết thường hoặc thiếu tiền tố →
`unauthorized`.

### 3.3 `app/api/reset/route.ts`

Theo §2.3. Doc comment: vì sao route này tồn tại (QĐ-25 câu 2: demo công khai, reset hằng ngày), vì sao 404
khi không có khoá, vì sao service client, vì sao lịch 18:55 và cron Hobby trễ tới 59 phút không sao.

### 3.4 `app/api/health/route.ts`

Thay đoạn so sánh header bằng `cronAuthorized`; mọi mã trả về và JSON y nguyên.

### 3.5 `.gitignore`, `.env.example`, `README.md`

Theo §2.5–2.6.

## 4. Nghiệm thu

- `npx tsc --noEmit` sạch; `npm test` xanh kể cả test mới; **`TZ=UTC npm test` xanh**; `npm run test:db`
  không đổi (161); `next build` sạch; `vercel.json` parse được, đúng 2 cron, mỗi schedule 5 trường.
- Preview 3200 với `CRON_SECRET=test-secret` trong env của `next start` (stack Docker cục bộ, `npm run seed:users`
  đã chạy):
  1. `GET /api/reset` không header → 401; header sai → 401; đúng → 200 JSON có `ok`, `anchor` (ISO `+07:00`,
     giờ 18:50), `photosRemoved`.
  2. Trước khi gọi: đặt một đơn qua UI (khách thử) **và** tải một ảnh thật lên qua form mẫu (`tools/fixtures/soi-den.png`,
     mẫu mới cho Số đang mở). Sau khi gọi: đơn đó không còn, mẫu mới không còn, `up/` trống (kiểm bằng supabase-js
     với secret key **local** từ `.env.local`), `photosRemoved` = 1.
  3. Gọi lần hai ngay sau → 200, `photosRemoved` = 0.
  4. `/api/health` không header → 401, đúng → 200 như cũ.
  5. Nút "Đặt lại dữ liệu mẫu" trong admin vẫn chạy với toast y như lát 7.
- Preview **không** có `CRON_SECRET` → `GET /api/reset` 404; `/api/health` 200 không cần header (như cũ).
- TZ walk §2.7: ba cặp ảnh chụp (3200 vs 3210), kết luận từng ký tự.
- Mọi walk: 0 request ngoài loopback, 0 lỗi console.

## 5. Bàn giao

Báo cáo: file đã sửa/thêm; số test (thường và `TZ=UTC`); kết quả từng mục §4 với mã trả về và JSON (không có
secret nào trong báo cáo — `test-secret` là giá trị giả, được phép); nội dung `vercel.json` cuối; nguồn docs
Vercel đã đọc (cron Hobby, `regions`); điều gì trong brief sai so với thực tế. Không commit.

## Đọc trước khi sửa

`app/api/health/route.ts` · `lib/actions/admin.ts` (`resetDemo`) · `lib/db/service.ts` · `lib/db/photos.ts` ·
`lib/clock.ts` · `lib/datetime.ts` · `scripts/env-local.ts` · `.env.example` · `tasks/backend.md` §9–§10 ·
`node_modules/next/dist/docs/` (route handlers, route segment config `dynamic`/`maxDuration`, `revalidatePath`) ·
Vercel docs qua WebFetch: cron jobs, cron usage & pricing (giới hạn Hobby), project configuration (`regions`,
`crons`), functions max duration theo gói.
