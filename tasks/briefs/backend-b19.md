# B19: bốn việc an toàn của lượt rà v6

*Phiên chính viết 07/10/2026. Agent: `backend-implementer`. Nguồn: bước soát lượt rà v6, các mục F8, F9, F16, F17. Người dùng chốt
07/10: làm cả bốn; với số điện thoại thì **bỏ khỏi URL**.*

## 0. Đọc trước

- `.agents/skills/design-taste-frontend/SKILL.md`: lát này có sửa `TrackView` và `LookupForm`.
- `tasks/plan.md`: QĐ-16 (tra đơn không tiết lộ đơn có tồn tại hay không), QĐ-41, QĐ-44, QĐ-45; mục "Lượt rà toàn app, đợt v6".
- `supabase/README.md`: các mục B16, B17, B18.
- Next 16: `node_modules/next/dist/docs/` cho Server Actions, `useActionState`, form không cần JavaScript.

## 1. Số điện thoại không bao giờ nằm trên URL (F8)

**Hiện trạng** (bước soát đã đo): số điện thoại vào URL ở năm chỗ:
- `lib/lookup.ts` `trackHref(code, phone)`, dùng ở `lib/feed-order.ts` `followLink` (nút "Tra cứu đơn" trên hoá đơn của đơn đặt khi
  chưa đăng nhập);
- `lib/feed-account.ts` `lookupCheck` (ô tra đơn ở `/account` khi chưa đăng nhập, `LookupForm.tsx` `router.push`);
- `TrackView.tsx` `writeUrl` và `queryOf` (`history.replaceState` sau mỗi lần tra);
- link đăng nhập của `TrackView` mang `next=/track?code&phone`;
- hai form GET `action="/track"` (`TrackView`, `LookupForm`) khi không có JavaScript.

**Luật mới:**
- Không URL nào app tạo ra mang số điện thoại: link, `replaceState`, `redirect`, tham số `next=`, form GET.
- **`/track?code=DH-…`** (chỉ mã) là dạng chia sẻ được.
  - Trình duyệt vốn đã xem được đơn đó thì trang hiện kết quả ngay, không hỏi số. "Vốn đã xem được" nghĩa là `loadReceipt(code)` ra
    đơn: đơn của tài khoản đang đăng nhập, hoặc đơn trình duyệt này đã đặt khi chưa đăng nhập, nhận ra qua cookie hoá đơn.
  - Trình duyệt khác: form với mã điền sẵn, khách nhập số điện thoại.
- **Nút "Tra cứu đơn"** trên hoá đơn dẫn tới `/track?code=…`; trên chính trình duyệt đó, kết quả hiện ngay. `trackHref(code)` bỏ tham
  số phone.
- **Hai form tra đơn** gửi số điện thoại bằng POST qua Server Action, có JavaScript lẫn không. Kết quả hiện tại chỗ; URL nhiều nhất chỉ
  mang `code`.
  - Ô tra đơn ở `/account` (chưa đăng nhập) được chọn một trong hai cách: tra ngay tại chỗ; hoặc chuyển sang `/track?code=…` mà không
    mất số đã gõ, kèm cả trường hợp không có JavaScript. Chọn cách gọn hơn và ghi lý do.
- **Link cũ có `?phone=`** vẫn chạy: dùng số đó một lần như hiện nay, rồi xoá `phone` khỏi thanh địa chỉ.
- **Không đổi:**
  - giới hạn tần suất `order_lookup`;
  - câu báo chung khi không khớp (QĐ-16);
  - việc hỏi lại Stripe cho đơn thẻ đang chờ trong `lookupOrderAction`.
- **Ngoài phạm vi:** mã QR vẫn "đang chuẩn bị"; chỉ cần `trackHref(code)` không còn mang số.

## 2. Trigger không tin `handle` do người dùng gửi (F9)

- **Hiện trạng:**
  - `handle_new_user()` (`supabase/migrations/20261007120000_google_names.sql`) đọc `raw_user_meta_data ->> 'handle'`. Ai gọi thẳng
    `/auth/v1/signup` với publishable key thì tự đặt được trường này.
  - Tài khoản có `handle` bị B17 coi là dữ liệu mẫu: không bị che, không bị xoá hằng ngày (`real_accounts()`).
  - Hôm nay chưa với tới được, vì key không có trong bundle; nhưng không nên để luật an toàn dựa vào chuyện đó.
- **Sửa:**
  - migration mới thay `handle_new_user()`: đọc `handle` từ `raw_app_meta_data` (chỉ service role ghi được), và chỉ nhận handle có
    trong dữ liệu mẫu (`public.seed_customers` hoặc handle của quản trị mẫu; kiểm tên bảng và cột thật);
  - `scripts/seed-users.ts` chuyển `handle` sang `app_metadata`; `name` và `phone` giữ ở `user_metadata`;
  - kiểm `npm run seed:users` vẫn tạo đúng 9 tài khoản mẫu có `handle`.
- **Test DB:**
  - đăng ký kèm `data: { handle: 'x' }` thì `profiles.handle` là null;
  - handle hợp lệ trong `app_metadata` thì được nhận;
  - handle lạ trong `app_metadata` thì bị bỏ.

## 3. Giới hạn tần suất cho `/auth/callback` (F16)

- **Hiện trạng:** callback gọi `exchangeCodeForSession` với mọi `code`. Một verifier giả biến mỗi request thành một lần gọi `/token`
  của Supabase từ IP của Vercel, tức tiêu vào giới hạn Auth chung của mọi người.
- **Sửa:**
  - bucket mới `auth_callback` trong `lib/rate-limit.ts` (`RATE_RULES`, `RateBucket`, `rateLimitMessage`), con số hợp lý cho một
    người, ví dụ 10 lần trong 5 phút;
  - migration thêm tên bucket vào `rate_hits_bucket_check` và vào `take_rate()`, theo mẫu `20260930150000_order_lookup.sql`;
  - gọi `takeRate` trước `exchangeCodeForSession`; bị từ chối thì chuyển về trang lỗi Google đang có, với cùng câu báo.
- **Test:** quá giới hạn thì không gọi exchange.

## 4. Tên dài quá 60 ký tự (F17)

- **Hiện trạng:**
  - trigger ghi tên lấy từ Google không giới hạn độ dài;
  - Hồ sơ chặn tên dài hơn 60 (`NAME_MAX`, `update_profile`), nên tài khoản đó không lưu được Hồ sơ, kể cả khi chỉ đổi số điện thoại;
  - đăng ký bằng email không có trần độ dài.
- **Sửa:**
  - trigger cắt tên còn 60 ký tự sau `btrim`, rồi `btrim` thêm một lần;
  - `signErrors("up")` và action `signUp` thêm trần 60, dùng câu báo đang có ở `PROFILE_FIELD_TEXT`;
  - dọn một lần trong migration: `update public.profiles set name = left(btrim(name), 60) where char_length(name) > 60`, rồi `btrim`.
- **Test:** tên 80 ký tự từ metadata vào trigger thì ra đúng 60 ký tự, không có khoảng trắng ở cuối.

## 5. Kiểm

- `npm run typecheck`, `npm test`, `npm run test:db`, `npm run build` sạch. Test cũ xanh mà không sửa, trừ test đang khẳng định số
  điện thoại trên URL; liệt kê từng test đã sửa và lý do.
- `npx supabase db reset` sạch, rồi `npm run seed:users`, rồi `reset_demo(demo_anchor())`.
- **Trên 3200** (playwright, bản build cuối):
  - đặt đơn khi chưa đăng nhập, bấm "Tra cứu đơn": URL không có `phone`, kết quả hiện ngay;
  - cửa sổ khác (không cookie) mở `/track?code=…`: hỏi số;
  - nhập số đúng: kết quả, URL không có `phone`;
  - link cũ có `?phone=`: ra kết quả, rồi thanh địa chỉ mất `phone`;
  - không JavaScript (`Emulation.setScriptExecutionDisabled`): cả hai form vẫn tra được, và URL sau đó không có `phone`;
  - ô tra đơn ở `/account` khi chưa đăng nhập.
- **Ảnh** ở `.playwright-cli/shots/backend/b19/`: `/track` hỏi số, `/track` có kết quả, ô tra ở `/account`; vi và en; 390 và 1280.
- **Bản VI:** ngoài các màn tra đơn, không trang nào đổi pixel.

## 6. Luật

- Chỉ Edit/Write. Không commit.
- Lệnh nào bị hệ thống quyền chặn: đừng tìm đường vòng, ghi vào báo cáo.
- Không đọc `supabase/.env`. Không in khoá. Không đổi mật khẩu mẫu. Không bấm "Đặt lại dữ liệu mẫu" trên UI; ghi DB xong thì chạy
  `reset_demo(demo_anchor())`.
- `db reset` xoá tài khoản thật trên máy, như vậy là được.
- Để 3200 (bản build cuối) và stack Supabase chạy khi xong.

## 7. Báo cáo

- **Đã đổi:** tệp, migration, test mới và test đã sửa.
- **Kết quả kiểm:** lệnh, ảnh, kết quả các ca ở mục 5.
- **Câu chữ mới,** nếu có, cả vi và en. Lát này không nên có câu mới; nếu buộc phải có thì liệt kê để người dùng duyệt.
- **Lệch so với brief,** kèm lý do.
- **Các bước lên hosted:** `db push` trước `git push`; seed không đổi; kiểm `proacl` và kiểm trigger bằng câu SQL ngắn một dòng.
