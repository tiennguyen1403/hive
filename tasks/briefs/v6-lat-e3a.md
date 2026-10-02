# Brief: v6 lát E3a, tài khoản bằng tiếng Anh: đăng nhập, Tôi, đơn, địa chỉ, thông báo, đã lưu

*02/10/2026. Agent `ui-implementer`. Không commit.*

Đợt v6 làm app song ngữ (QĐ-40). Đã xong:
- E0 (`e363ab3`): nền;
- B15 (`a00c5ea`): chữ tiếng Anh của mẫu trong DB;
- E1 (`da8114e`): trang chủ, Cửa hàng, trang mẫu, Tìm;
- E2 (`2cff7ca`): giỏ, thanh toán, đặt hàng xong, tra đơn.

Lát này dịch **vùng tài khoản**: đăng nhập và đăng ký, trang Tôi cùng mọi trang con, các lớp nổi và câu báo của server. Bản tiếng
Việt không được đổi một pixel nào. Các trang trợ giúp (Hỏi đáp, Bảng size, Đổi trả, Giới thiệu, Liên hệ) và trang 404 là lát E3b,
không thuộc lát này.

**Luật chung:**
- Đọc trước, trong `tasks/plan.md`, mục "Đợt v6":
  - QĐ-40;
  - "Thuật ngữ tiếng Anh": bắt buộc;
  - mọi mục "Mẫu…" của E0, E1, E2: làm đúng các mẫu đó. Đặc biệt `getActionLocale()` cho câu báo của Server Action, và
    `takeRate(bucket, cost, locale)`.
- Đọc `node_modules/next/dist/docs/` cho `generateMetadata` trước khi viết.
- **Phạm vi ghi:**
  - được ghi trong `app/`, `components/`, `lib/`, `data/` và test bên cạnh;
  - không đụng `proxy.ts`, `registry/`, `tools/` (dùng bản sao sweep ở scratchpad), `supabase/`, `prototype/`, `tasks/`,
    `DESIGN.md`, `PRODUCT.md`, `.impeccable/`, `.claude/`.
- Không thêm thư viện. Không commit.
- **DB:** được ghi DB cục bộ để dựng trạng thái (sửa hồ sơ, thêm địa chỉ, lưu mẫu, đọc thông báo). Xong thì
  `npx supabase db query "select public.reset_demo(public.demo_anchor());"`.
  - **Không đổi mật khẩu** của tài khoản thử. B4b chặn việc đó, và đổi được thì hỏng nút thử cho mọi người.
  - Muốn thấy câu báo của trang đổi mật khẩu thì dùng nhánh từ chối có sẵn.
- **Server:** giải phóng cổng 3200 bằng `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`, chạy thành
  một lệnh riêng. Mã 1 thì dừng lại và báo.
- Harness không cho subagent ghi tệp báo cáo: báo cáo chỉ nằm trong tin cuối.

## 1. Ảnh "trước", chụp trước mọi thay đổi
- Mọi route và trạng thái ở §2, ở 390 và 1280, ở **cả hai ngôn ngữ** (cookie `hive-lang`).
- Khung nhìn cao bằng trang, không dùng `fullPage`.
- Trang cần đăng nhập thì mở phiên bằng nút "Đăng nhập thử", như sweep.

## 2. Phạm vi
- **Route và trạng thái:**
  - `/sign-in`, `/sign-up`, `/forgot-password`: trống, lỗi kiểm form, lỗi từ server;
  - `/account`: đã đăng nhập, và chưa đăng nhập (`MeOut`);
  - `/account/orders`, `/account/orders/[code]` (một đơn mỗi trạng thái có trong dữ liệu mẫu),
    `/account/orders/[code]/tracking`;
  - `/account/addresses`, `/account/addresses/new`: sổ trống và có địa chỉ; sửa, xoá, hoàn tác;
  - `/account/profile`, `/account/password`;
  - `/account/notifications`: có và không có thông báo chưa đọc;
  - `/account/wishlist`: có và không có mẫu đã lưu.
- **Lớp nổi:** mọi sheet, hộp xác nhận và toast của các trang này: huỷ đơn, xoá địa chỉ, đăng xuất, đổi size của tôi, các
  công tắc thông báo…
- **Mã:**
  - `components/feed/account/`: mọi tệp, trừ phần E2 đã dịch trong `TrackView`, `OrderBits` và `OrderView`;
  - `lib/`: phần còn lại của `feed-account.ts` (`paymentTitle`, `deliveryTitle`, `tileLabel`, `FEED_STATE_LABEL`…),
    `feed-inbox.ts`, `feed-me.ts`, `feed-sign-in.ts`, phần còn lại của `my-state.ts`, `lib/db/account-dto.ts` (nhãn địa chỉ);
  - câu báo của các action các trang này gọi: `lib/actions/auth.ts`, `addresses.ts`, `profile.ts`, `state.ts`, `my-state.ts`.
    Mọi `takeRate` trong đó truyền ngôn ngữ.
- **`<title>` và mô tả** của các route này theo ngôn ngữ. Ảnh chia sẻ giữ tiếng Việt.

## 3. Luật dịch
- **Thuật ngữ** theo bảng, không tự chọn từ khác:
  - Account, Sign in, Sign up, Sign out;
  - Try a demo account, Try the admin;
  - Saved (hành động là Save), Notifications;
  - trạng thái đơn và cách trả như E2;
  - Drop 05, Basics.
- **Nhãn địa chỉ** ("Nhà", "Công ty", "Khác") là tập cố định lưu trong DB:
  - in ra là Home, Work, Other, dịch trong code khi in;
  - giá trị lưu vào DB vẫn là chữ Việt;
  - nút chọn nhãn ở form đổi chữ hiển thị, không đổi giá trị gửi đi.
- **Tên riêng và địa chỉ tiếng Việt** (tên người, email, dòng địa chỉ, tỉnh, phường) giữ nguyên, phần tử chứa chúng mang
  `lang="vi"`, chỉ ở bản EN (mẫu E2).
- **Chữ của mẫu** chỉ lấy qua `productText`/`colorLabel`, kể cả trong thông báo và trang đã lưu.
- **Thông báo** (`feed-inbox.ts`) dựng câu trong code: dịch câu, giữ mã đơn, tên mẫu và số.
- **Mật khẩu thử** (`DEMO_PASSWORD`) in trên màn đăng nhập, cố ý. Giữ nguyên giá trị, chỉ dịch nhãn quanh nó.
- Viết kiểu Anh, ngắn như bản Việt, cùng giọng. Không thêm câu giải thích khái niệm.

## 4. Kiểm
- `npm run typecheck`, `npm test`, `npm run build` sạch. Test cũ xanh mà không sửa; test `en` mới cho các hàm `lib/` và action đã
  đổi.
- **Bản VI không đổi một pixel** ở mọi route, trạng thái và lớp nổi của §2. Chỗ nào lệch thì giải thích kèm ảnh.
- **Không còn chữ Việt ở bản EN:** chạy script soát của E2 (`.playwright-cli/shots/v6/e2/scripts/`) trên mọi route, trạng thái và
  lớp nổi của §2. Kết quả phải là 0, trừ chỗ ghi rõ lý do.
- **Chữ tràn:** ở bản EN, ở 390, 600, 900 và 1280. Báo chỗ bản EN xuống dòng mà bản VI không. Nếu sửa thì đo phương án ngay trên
  trang, như E2.
- **Hành vi bản EN:**
  - đăng nhập sai rồi đúng, bằng tài khoản thử;
  - thêm một địa chỉ, xoá rồi hoàn tác;
  - lưu rồi bỏ lưu một mẫu;
  - đọc một thông báo;
  - mở một đơn và hộp huỷ đơn, rồi đóng hộp, không huỷ;
  - đăng xuất;
  - đổi ngôn ngữ khi đang sửa hồ sơ: chữ đã gõ còn nguyên.
- **Sweep:** bản sao `tools/layout-sweep.js` ở cả `vi` lẫn `en`. Nút "Đăng nhập thử" của sweep cần qua `T(vi, en)` khi bản `en`
  của trang đăng nhập đổi chữ. Ghi rõ chỗ đổi, để phiên chính sửa bản gốc.
- `impeccable detect` cho `app components`: trước và sau.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 5. Ảnh
`.playwright-cli/shots/v6/e3a/`: `before-{vi,en}-*`, `after-{vi,en}-*`, và ảnh cho từng hành vi ở §4.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, gửi trọn trong **tin cuối**. Thêm các mục:
- **mọi chữ tiếng Anh tự viết**, đặt cạnh bản Việt;
- kết quả script chữ Việt, theo route;
- test trước và sau;
- tệp đã sửa;
- chỗ sweep gốc cần sửa;
- mẫu mới nếu có;
- "Xung đột luật" và "Chưa làm".

Để server 3200 chạy cho phiên chính duyệt.
