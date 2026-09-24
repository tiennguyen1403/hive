# B4 — việc phía chủ dự án (tài khoản, khoá, hai lệnh)

*24/09/2026.* Phiên chính không có tài khoản của bạn, nên các bước dưới đây là của bạn. Phần còn
lại — đẩy schema và seed lên dự án hosted, tạo tài khoản mẫu, `vercel.json` + cron, route đặt lại
hằng ngày, xoá ảnh tải lên, kiểm sau khi lên — là của phiên chính và agent `backend-implementer`.

Thứ tự: **A → báo tôi → tôi làm phần giữa → C → báo tôi → tôi kiểm.** B làm lúc nào cũng được.

**Trạng thái 24/09 10:30 — A đạt.** DB hosted đã có schema, seed và 9 tài khoản mẫu; bản hiện tại chạy đúng
trên DB hosted (đi trọn kịch bản lát 7 từ máy này). **C làm được ngay**, không cần đợi code B4: lần deploy
đầu đã chạy được, cron sẽ xuất hiện ở lần deploy sau khi B4 lên.

Không dán khoá vào chat. Mọi giá trị đi vào `.env.hosted.local` ở gốc repo — file đã tạo sẵn với
chỗ trống và `CRON_SECRET` đã sinh; git bỏ qua theo mẫu `.env*`, và Next.js không đọc tên file này
nên bản local vẫn chạy trên stack Docker như cũ.

## A · Supabase — khoảng 15 phút

- [x] **A1 Tài khoản.** supabase.com → đăng nhập bằng GitHub. Gói Free, không cần thẻ.
- [x] **A2 Dự án.** New project → Organization: tạo mới nếu chưa có (Free) → Name: `hive-demo`
      (tuỳ bạn) → Database password: bấm *Generate* rồi **lưu lại** (cần cho A5; sau này không
      xem lại được, chỉ đặt lại được; không cần đưa tôi) → Region: **Southeast Asia (Singapore)**
      → Create. Đợi dự án lên xanh, khoảng 2 phút.
- [x] **A3 Hai khoá → `.env.hosted.local`.** Project Settings (bánh răng) → *API Keys*:
      - *Publishable key* (`sb_publishable_…`) → thay giá trị `SUPABASE_PUBLISHABLE_KEY`.
      - *Secret keys* → sao chép khoá `sb_secret_…` có sẵn, hoặc bấm tạo một khoá nếu danh sách
        trống (khoá chỉ hiện đầy đủ một lần lúc tạo) → thay giá trị `SUPABASE_SECRET_KEY`.
      - Nếu trang chỉ có khoá kiểu cũ (`anon` / `service_role`, chuỗi dài bắt đầu `eyJ`), dùng
        chúng cũng chạy: `anon` → PUBLISHABLE, `service_role` → SECRET.
      - `SUPABASE_URL` tôi tự điền từ mã dự án sau A5; để nguyên cũng được.
- [x] **A4 Tắt xác nhận email.** Authentication → *Sign In / Providers* (bản cũ: *Providers*) →
      Email → tắt **Confirm email** → Save. Lý do: app có trang đăng ký nhưng demo không có máy
      chủ email (QĐ-25); local đã tắt sẵn trong `supabase/config.toml`.
- [x] **A5 Hai lệnh, trong PowerShell của bạn tại `D:\Code\e-commerce`** (không qua tôi, vì
      cần gõ mật khẩu):

      ```
      npx supabase login
      npx supabase link --project-ref <mã dự án>
      ```

      Mã dự án là đoạn 20 ký tự trong địa chỉ dashboard `supabase.com/dashboard/project/<mã>`.
      `login` mở trình duyệt, xong tự quay về terminal; nếu không mở được, tạo token ở
      Account → Access Tokens rồi chạy `npx supabase login --token <token>`. `link` hỏi
      Database password của A2 (gõ vào, không hiện chữ). Cả hai lưu trong Windows Credential
      Manager của máy này; tôi không cần và không xem. `link` chỉ ghi vào `supabase/.temp/`
      (git bỏ qua), không đổi file nào đã commit.
- [x] **Báo tôi một câu.** Tôi đọc mã dự án từ `supabase/.temp/project-ref`.

## B · GitHub — 1 phút, lúc nào cũng được

- [ ] Repo `tiennguyen1403/khoi-store` đang **Private**; QĐ-25 chốt công khai (portfolio).
      Settings → General → Danger Zone → *Change visibility* → Public. Hoặc trả lời "đổi công
      khai đi", tôi chạy `gh repo edit`. Đã soát toàn bộ lịch sử git ngày 24/09: không có khoá
      nào (`.env*` bị bỏ qua từ lúc `git init`); mật khẩu demo `xemthu-2026` công khai theo
      thiết kế.

## C · Vercel — khoảng 10 phút, làm được ngay

- [ ] **C1 Tài khoản.** vercel.com → Sign up with GitHub → gói Hobby (miễn phí, không thẻ).
- [ ] **C2 Nhập repo.** Add New… → Project → Import Git Repository → cài Vercel GitHub App,
      cho quyền repo `khoi-store` → Import.
- [ ] **C3 Màn cấu hình.** Project Name: `hive-demo` (địa chỉ sẽ là `hive-demo.vercel.app`,
      Vercel đổi nếu trùng). Framework Preset: Next.js (tự nhận). Root Directory và Build
      Settings: để nguyên. **Environment Variables:** mở `.env.hosted.local`, sao chép toàn bộ
      nội dung, dán vào ô *Key* đầu tiên — Vercel tự tách thành 6 biến:
      `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DEMO_PASSWORD`,
      `CRON_SECRET`, `TZ`. Kiểm đủ 6, không dòng nào còn chữ "dan-…-vao-day". Environment: để mặc
      định (tất cả). Bấm **Deploy**, đợi 2–3 phút.
- [ ] **C4 Gửi tôi địa chỉ** `https://<tên>.vercel.app`.
- [ ] **C5 (tuỳ chọn)** để tôi đọc được log deploy và log cron từ terminal:

      ```
      npx vercel login
      npx vercel link
      ```

      Bỏ qua cũng được; khi đó tôi nhờ bạn nhìn trang Project → Settings → Cron Jobs một lần.

## Phần tôi làm giữa A và C

1. ~~`npx supabase db push` (6 migration), seed, `npm run seed:users` trỏ vào dự án hosted, kiểm bucket và
   `catalog_snapshot`~~ — xong 24/09 sáng (bạn chạy lệnh push, tôi tạo tài khoản và kiểm).
2. Brief `tasks/briefs/backend-b4.md` → agent: `vercel.json` (vùng `sin1`, hai cron: health
   hằng ngày, đặt lại dữ liệu mẫu sau 18:50 giờ VN), route đặt lại nhận `CRON_SECRET`, xoá
   `up/*` trong bucket khi đặt lại, `.vercel/` vào `.gitignore`; kiểm; commit; push.
3. Sau C4: đi thử trên địa chỉ thật (mua, đăng nhập thử, quản trị, tải ảnh), xác nhận trình
   duyệt không gọi thẳng Supabase, cron có trong log, dự án Supabase không ngủ.

Lưu ý đã biết: cron gói Hobby chạy tối đa 1 lần/ngày và có thể trễ tới một giờ so với giờ
đặt; seed dùng ngày tương đối với mốc đặt lại (QĐ-25 câu 1) nên lệch giờ không hỏng dữ liệu.
