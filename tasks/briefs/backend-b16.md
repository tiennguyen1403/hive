# Brief B16: đăng nhập bằng Google

*06/10/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `supabase/README.md`, `tasks/`, `.impeccable/`, `.claude/`,
  `tools/`, `registry/`.
- **Chỉ stack Docker cục bộ.** Không đọc `.env.hosted.local`. Không `supabase link`, `db push`, `config push`. Không dùng `vercel`
  CLI. Không bật lại Studio hay pg_meta.
- **Bí mật:**
  - mã và khoá OAuth của Google do người dùng tự ghi vào tệp mà Supabase CLI đọc cho `env()` của `config.toml`. Tài liệu
    (supabase.com/docs/guides/local-development/managing-config) nói là `.env` ở gốc dự án, không phải `supabase/.env`. Pattern
    `.env*` của `.gitignore` gốc đã bỏ qua tệp này;
  - **người dùng chưa ghi khoá thật.** Đo tệp nào được đọc bằng giá trị giả (ví dụ `hive-probe-client-id`):
    - lần lượt đặt giá trị giả vào từng tệp ứng viên (`.env` gốc, `supabase/.env`, `.env.local` gốc nếu cần);
    - khởi động lại stack, rồi xem `Location` của `http://127.0.0.1:54321/auth/v1/authorize?provider=google…` có `client_id`
      là giá trị giả không;
    - xong thì xoá giá trị giả và trả các tệp về như cũ (tệp mới tạo thì xoá). Ghi tệp được đọc vào báo cáo để phiên chính dặn
      người dùng;
  - Next.js cũng nạp `.env` gốc vào môi trường server: kiểm xem việc đó có hại gì không;
  - không in giá trị ra màn hình, báo cáo, test hay chú giải. Chỉ được kiểm tệp có tồn tại không và có đủ tên biến không.
- Máy xem thử 3200: muốn dừng thì chạy `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1` thành một lệnh
  riêng. Mã 1 thì dừng lại và báo. Khởi lại theo định nghĩa agent.
- Không git commit, stash, reset hay checkout. Harness không cho subagent ghi tệp báo cáo: báo cáo chỉ nằm trong tin cuối.
- **Lệnh bị hệ thống quyền từ chối** thì không thử cách khác để làm cùng việc. Ghi lại lệnh và câu từ chối, làm tiếp phần còn
  lại, rồi báo trong tin cuối.
- Lát có sửa giao diện cửa hàng (nút, một dòng báo lỗi), nên đọc `.agents/skills/design-taste-frontend/SKILL.md` trước khi sửa
  `components/feed/`.
- **Sửa tệp bằng Edit hay Write**, không sửa hàng loạt bằng script: hook impeccable chỉ chạy sau Edit và Write (lát E5 sửa bằng
  script Python nên hook không chạy lần nào).
- **Giữ ngữ cảnh gọn:** kết quả script ghi ra tệp JSON, chỉ in tóm tắt; không in diff lớn; xem tận mắt tối đa khoảng 8 ảnh.

## 1. Vì sao

Đợt v6 làm demo cho khách nước ngoài (cuối `tasks/plan.md`, mục "Đợt v6"). Đọc kỹ ở đó:
- **QĐ-41:** đăng nhập Google qua Supabase Auth, kể cả các dòng ngày 06/10;
- QĐ-40: song ngữ, và các mục "Mẫu…" của E0 tới E5;
- QĐ-44, QĐ-45: lát B17 (commit `eb694c6`) đã làm phần che dữ liệu người thật ở quản trị và xoá tài khoản thật mỗi ngày.
  - Tài khoản Google không có `handle`, nên tự là người thật: bị che ở quản trị, bị cron xoá mỗi ngày.
  - Lát này không đụng hai việc đó, chỉ kiểm một tài khoản Google thử hiện đã che ở `/admin/customers`.

Hiện trạng:
- đăng nhập chỉ có email và mật khẩu (`signIn`, `signUp`, `demoSignIn`, `demoAdminSignIn` trong `lib/actions/auth.ts`);
- trang `/sign-in` và `/sign-up` (`components/feed/account/SignInView.tsx`, `AccountForm`) đã có nút "Tiếp tục với Google" /
  "Continue with Google" của mock. Nút đang `disabled`, kèm nhãn "Đang chuẩn bị" / "Coming soon";
- hồ sơ mới do trigger `handle_new_user()` ghi (`supabase/migrations/20260923124500_accounts.sql`). Tên lấy từ
  `raw_user_meta_data ->> 'name'`, thiếu thì lấy phần trước @ của email.

## 2. Luật

**Luồng (PKCE, phía server):**
- Bấm nút thì gửi form tới Server Action mới, ví dụ `googleSignIn`.
  - Action gọi `getActionLocale()` và `takeRate(…, locale)` như mẫu E2. Chọn bucket và ghi lý do.
  - Action gọi `signInWithOAuth({ provider: "google", options: { redirectTo } })` bằng client server của dự án, rồi
    `redirect(data.url)`.
- `redirectTo` là `<origin>/auth/callback?next=<next đã qua safeNext>`.
  - `origin` lấy từ request (host và proto đã forward), để bản preview của Vercel cũng chạy.
  - Supabase tự so `redirectTo` với danh sách cho phép, nên host giả bị từ chối.
- Route Handler mới `app/auth/callback/route.ts`, nhận GET:
  - có `code` thì `exchangeCodeForSession(code)`. Thành công thì chuyển tới `safeNext(next)`;
  - thiếu `code`, có `error` (khách bấm huỷ ở Google), đổi mã lỗi, hoặc thiếu cookie verifier (ví dụ bắt đầu ở trình duyệt khác)
    thì chuyển về `/sign-in`, giữ `next`, kèm một cờ để trang in dòng báo lỗi;
  - `next` là URL ngoài (`https://evil.example`, `//evil.example`) thì về `/`.
- **Trình duyệt không gọi Supabase bằng JS** (QĐ-25, QĐ-41). Nó chỉ chuyển trang: app → `/auth/v1/authorize` → Google →
  `/auth/v1/callback` → `/auth/callback` của app. Không `createBrowserClient`, không biến `NEXT_PUBLIC_SUPABASE_*`.
- Đọc kỹ tài liệu Next 16 trong `node_modules/next/dist/docs/01-app/` về Route Handler, `cookies()`, `redirect` trong Server Action,
  và `proxy.ts`. Kiểm `proxy.ts` (matcher, xử lý `?lang=`, làm mới phiên) không chặn hay đổi hướng `/auth/callback`.

**Cookie phiên (gia cố, đo trước):**
- Cookie `sb-…-auth-token` hiện theo mặc định của `@supabase/ssr`: không `HttpOnly`, không `Secure`, sống 400 ngày, chứa token cùng
  email và tên (kiểm kê 06/10).
- Trình duyệt không dùng Supabase JS, nên script trang không cần đọc cookie này. Đo xem đặt `HttpOnly`, và `Secure` khi chạy https,
  có làm hỏng gì không: làm mới phiên ở `proxy.ts`, Server Action, callback mới, đăng xuất.
- Không hỏng thì đặt, kèm test. Hỏng thì giữ nguyên và báo lý do đo được.

**Cấu hình cục bộ:**
- `supabase/config.toml` thêm `[auth.external.google]`:
  - `enabled = true`;
  - `client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"`;
  - `secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"`;
  - `skip_nonce_check = false`.
- `.env.example` ghi tên hai biến (giá trị giả) và tệp chứa chúng, theo giọng các chú giải đã có trong tệp.
- **Đo, đừng đoán:**
  - thiếu tệp đó, hay thiếu hai biến, thì `npx supabase start` có còn chạy không. Máy của người khác clone repo không có
    khoá Google, và stack cục bộ vẫn phải chạy cho `npm run test:db`. Nếu hỏng, chọn cách an toàn và ghi lý do;
  - `additional_redirect_urls` (hiện có `http://localhost:3200`…) có nhận `http://localhost:3200/auth/callback?next=…` không, hay
    cần mẫu đại diện (`/**`). Sửa danh sách cục bộ cho đủ;
  - Supabase bản hosted cần những URL nào trong "Redirect URLs". Ghi danh sách chính xác vào báo cáo cho người dùng dán; agent
    không tự sửa hosted.

**Hồ sơ của tài khoản Google:**
- Google gửi tên trong `raw_user_meta_data`, khoá nào thì chưa đo (`name`, `full_name`). Nếu không có khoá `name` thì mọi khách
  Google sẽ mang tên theo phần trước @ của email.
- Viết migration mới (append-only) cho `handle_new_user()`: lấy `name`, thiếu thì `full_name`, rồi mới tới email. Trigger vẫn không
  bao giờ được ném lỗi. Có test DB cho các trường hợp metadata khác nhau (dựng `raw_user_meta_data` qua Auth admin API).
- Ảnh đại diện của Google: không dùng. Giữ chữ cái đầu như mọi tài khoản, vì trang không tải gì từ máy chủ khác.

**Tài khoản chỉ có Google:**
- Không có mật khẩu, nên tấm "Đổi mật khẩu" ở Hồ sơ (`ProfileView`, đòi mật khẩu hiện tại) không dùng được.
- Phiên chính quyết: ẩn dòng "Đổi mật khẩu" / "Change password" với tài khoản không có identity `email`.
- `changePassword` cũng phải từ chối tài khoản đó ở phía server, trả về một câu báo, không ném lỗi.
- Đo xem dấu hiệu nào đáng tin: `user.identities`, `app_metadata.providers`. Ghi lại.

**Email trùng (đo trên stack cục bộ nếu được, không thì ghi rõ là chưa đo):**
- Supabase tự nối identity Google vào tài khoản email/mật khẩu cùng địa chỉ. Ghi lại hành vi đo được.
- Đo `signUp` với một email đã có tài khoản Google: câu "Email này đã có tài khoản" còn đúng không.
- Không đổi mặc định của Supabase nếu không có lý do đo được.

**Giao diện** (đã duyệt trong mock; chỉ những chỗ sau đổi):
- **Nút:**
  - bỏ `disabled`, `aria-describedby` và nhãn "Đang chuẩn bị" / "Coming soon";
  - nút thành nút gửi của một form nhỏ có ô ẩn `next`;
  - lúc chờ thì làm như các nút gửi khác của `AccountForm`;
  - giữ class `btn btn-line si-google`, hình viên thuốc, chữ Mona Sans, chữ "Tiếp tục với Google" / "Continue with Google".
- **Chữ G:** người dùng chọn chữ G bốn màu chuẩn thay chữ G đơn sắc của mock (QĐ-41, 06/10).
  - Dùng tài sản chính thức theo https://developers.google.com/identity/branding-guidelines, phần nút tự vẽ.
  - SVG nội tuyến, cùng cỡ với icon hiện tại, `aria-hidden`.
  - Kiểm nền của nút đúng luật trang đó (nền sáng hay nền trung tính). Nếu luật đòi đổi nền hay viền của nút thì dừng lại và báo,
    vì đó là việc thiết kế.
- **Dòng báo lỗi** khi quay về từ Google thất bại: đặt ở chỗ lỗi cấp form đang in, cùng kiểu. Chữ: "Chưa đăng nhập được bằng
  Google." / "Couldn't sign in with Google.".
- **Hỏi đáp**, câu "Đăng nhập bằng gì?" (`lib/feed-help.ts`): "Email và mật khẩu, hoặc tài khoản Google." / "Email and password,
  or your Google account.".
- Chú giải ở `app/about/page.tsx` đang lấy nút Google làm ví dụ "Đang chuẩn bị": sửa chú giải cho đúng.
- Mọi chữ mới có cả `vi` lẫn `en` (`picker`).
- Bản VI không đổi pixel nào ngoài vùng nút, trừ lúc có dòng báo lỗi.

**Không thuộc lát này:**
- che dữ liệu người thật ở quản trị (B17);
- Google cho tài khoản quản trị: tài khoản Google không bao giờ là quản trị, vì vai trò chỉ nằm trong `app_metadata`;
- One Tap, nút do script của Google vẽ, tên miền riêng cho màn đồng ý.

## 3. Kiểm

- `npm run typecheck`, `npm test`, `npm run test:db`, `npm run build` sạch.
- `npm run test:db` chỉ chạy với stack cục bộ (chốt chặn của B17 trong `vitest.db.config.mts`). Test cũ
  `lib/db/order-lookup.dbtest.ts` (d) hỏng ngẫu nhiên khi lượt chạy vắt qua mốc cửa sổ 10 phút, vì chờ tới 32 giây mà timeout là
  5 giây. Phiên chính cho sửa: thêm timeout riêng khoảng 45 giây cho test đó, ghi lý do.
- Test cũ xanh mà không sửa, trừ test đang khẳng định nút "Đang chuẩn bị" hay câu Hỏi đáp cũ. Liệt kê từng test đã sửa và lý do.
- **Test mới:**
  - action dựng đúng yêu cầu: provider, `redirectTo` có origin, đường dẫn, `next` đã mã hoá, và giới hạn tần suất;
  - callback:
    - thành công thì tới `next`;
    - `next` ngoài thì về `/`;
    - có `error` thì về `/sign-in` kèm cờ;
    - đổi mã thất bại thì về `/sign-in` kèm cờ;
  - trigger với metadata có `name`, chỉ `full_name`, hay không có tên;
  - `changePassword` từ chối tài khoản chỉ có Google;
  - chữ `en` của mọi câu mới.
- **Trên stack cục bộ, không cần đăng nhập Google thật:**
  - bấm nút ở 390 và 1280, cả hai ngôn ngữ;
  - lần theo từng `Location` (curl, không theo sang máy ngoài): action → `127.0.0.1:54321/auth/v1/authorize` →
    `accounts.google.com/...`;
  - URL cuối có `client_id` (lúc đo dùng giá trị giả), `redirect_uri` là callback của Supabase cục bộ, và `code_challenge`.
    Playwright chỉ cho gọi loopback, nên đừng để trình duyệt sang Google;
  - khi không có khoá nào, nút và trang vẫn chạy: đo xem bấm nút thì người dùng thấy gì, và báo lại.
- **Phiên chính và người dùng sẽ chạy thật** sau báo cáo: đăng nhập bằng tài khoản Google thật trên 3200, rồi đọc metadata và
  `profiles`. Ghi sẵn trong báo cáo các bước và câu SQL đọc lại (không xoá gì).
- **Ảnh** ở `.playwright-cli/shots/backend/b16/`: `/sign-in` và `/sign-up`, `vi` và `en`, 390 và 1280, trước và sau. Thêm trạng thái
  dòng báo lỗi, và Hồ sơ của tài khoản chỉ có Google (dựng bằng Auth admin API) không còn dòng "Đổi mật khẩu".
- Sweep `tools/layout-sweep.js` (chép bản sao, đặt `LANG` cả hai) không thêm phát hiện. JS nén của `/sign-in` trước và sau.
- Xong thì `select public.reset_demo(public.demo_anchor());`. Xoá tài khoản thử tạo trong lát, trừ tài khoản người dùng tự tạo
  khi chạy thật.

## 4. Báo cáo

Theo hợp đồng sáu mục, trọn trong tin cuối. Thêm:
- danh sách URL cho Google Cloud và cho Supabase hosted, chép dán được;
- mọi chữ mới, đặt `vi` cạnh `en`;
- hành vi đo được: khoá metadata nếu đo được, email trùng, cờ phân biệt tài khoản chỉ có Google, `supabase start` khi thiếu khoá.
