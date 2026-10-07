# Đợt v6, lượt rà toàn app, bước 1: SOÁT (chỉ đọc, không sửa)

*Phiên chính viết 07/10/2026. Agent: `ui-implementer`. Người dùng chốt 07/10: rà cả cửa hàng lẫn quản trị, tiếng Việt và tiếng
Anh, ở 390, 900 và 1280, kèm 4 việc an toàn; câu chữ đổi thì người dùng duyệt từng câu.*

## 0. Đọc trước

- `.agents/skills/design-taste-frontend/SKILL.md`. Luật dự án: mọi việc dính giao diện phải đọc tệp này, kể cả khi chỉ soát.
- `.claude/skills/playwright-cli/SKILL.md`.
- `DESIGN.md`: Feed cho cửa hàng, Arc cho quản trị, mục Ngôn ngữ. `PRODUCT.md`.
- `tasks/plan.md`:
  - QĐ-36 (luật cũ đã nhường cho Feed) và QĐ-40..46;
  - mục "Thuật ngữ tiếng Anh";
  - các dòng "Để lượt rà cuối" (dòng 3465, 3532, 3588, 3600, 3635–3644, 3711–3716, 3804–3809, 3844, 3930);
  - bảng "Chữ Việt còn ở bản EN" (dòng 3718).
- `tasks/briefs/v3-lat-13-polish.md`: lượt rà lần trước, để biết mức chi tiết cần có.

## 1. Việc: soát, KHÔNG sửa

- **Không Edit hay Write** vào `app/`, `components/`, `lib/`, `data/`, `supabase/`, `tools/`, `prototype/`, `registry/`, `DESIGN.md`,
  `PRODUCT.md`, `tasks/`. Chỉ ghi vào `.playwright-cli/audit-v6/` (script, ảnh, JSON, báo cáo). Không commit.
- **Không thiết kế lại.** Đề xuất sửa phải nằm trong hệ đã duyệt (DESIGN.md, các QĐ). Lượt này **được** đổi pixel bản tiếng Việt:
  luật "bản VI không đổi pixel" chỉ áp dụng trong đợt làm tiếng Anh.
- **Đề xuất, không quyết.** Mục nào đổi thiết kế, thêm hoặc bớt giao diện, hay đổi câu chữ thì đánh dấu "cần người dùng quyết".

## 2. Phạm vi

**Route:** mọi route của cửa hàng, tài khoản và quản trị. Lấy danh sách từ `tools/layout-sweep.js` và `app/`. Có cả `/privacy`, 404,
`/track`, `/sign-in`.

**Ngôn ngữ:** đặt cookie `hive-lang` là `vi`, rồi `en`. Kiểm thêm đường vào `?lang=en` và nút đổi ngôn ngữ.

**Khung nhìn:**
- 390×844, 900×1000 và 1280×800 cho mọi route;
- thêm 360 và 1440 cho trang chủ, trang sản phẩm, giỏ, thanh toán, hoá đơn, Tổng quan và Đơn hàng của quản trị.

**Lớp nổi:** mở hết, gồm menu, sheet, dialog, drawer, toast, picker tỉnh và phường, chọn size, tìm kiếm.

**Trạng thái:**
- rỗng, lỗi form, hết hàng;
- giữa hai Số: đóng tạm Số 05 trên DB cục bộ, rồi `reset_demo`;
- đã đăng nhập và chưa;
- khách vãng lai;
- **đơn thẻ đang chờ, quay về chưa trả, đã trả, đã huỷ**, ở cả 900. Chưa ai xem các khối thẻ mới ở 900.
  - Đặt đơn thẻ qua UI: trình duyệt bị chặn khi sang Stripe, nhưng đơn vẫn được tạo, ở trạng thái chờ.
  - Trạng thái đã trả: gọi `card_mark_paid` bằng service role với id giả, như ảnh B18 đã làm.

**Hành trình khách nước ngoài** (xem kỹ nhất, bản EN):
1. vào bằng `?lang=en`;
2. Bảng tin, sản phẩm, giỏ, thanh toán bằng thẻ, hoá đơn;
3. đăng nhập (nút Google, "Sign in with the demo account");
4. "Try the back office", rồi Tổng quan, Đơn hàng, trang một đơn Stripe.

## 3. Công cụ

Mỗi công cụ dưới đây kèm mốc hiện tại; ghi kết quả so với mốc.

- **`tools/layout-sweep.js`**, chạy riêng bản VI và bản EN. Lần trước máy hết bộ nhớ khi chạy chung; đóng trình duyệt giữa hai lượt
  lớn.
  - Mốc: VI 110 phát hiện (inlineBox 72, smallTarget 13, tinyText 25); EN 109 (72/12/25).
  - Phân loại từng nhóm: lỗi thật (sửa) hay miễn trừ đúng (ghi lý do).
  - Công cụ vừa sửa để chờ menu mở rồi mới bấm (thay đổi chưa commit). Ba ảnh lớp nổi quản trị phải ra hộp thoại.
- **`npx impeccable detect --json app components`**. Mốc: 2 phát hiện (`ArcCountField.module.css:47,51`).
- **Dò chữ Việt ở bản EN.** Chữ hiển thị có dấu tiếng Việt mà không nằm trong phần tử `lang="vi"`. Đối chiếu bảng "Chữ Việt còn ở bản
  EN": mục nào đúng thiết kế thì đưa vào "Không sửa".
- **So số dòng VI với EN** của các phần tử chữ, cùng route và cùng khung nhìn. Đánh dấu chỗ bản EN xuống dòng thêm hoặc cắt chữ.
- **Grep chữ "hay" mang nghĩa "hoặc"** trong chuỗi giao diện tiếng Việt (`lib/`, `components/`, `app/`). Từ 07/10 người dùng dặn viết
  "hoặc". Liệt kê ứng viên, không sửa.
- **Mắt:** xem ảnh mọi route ở 390 và 1280 cho mỗi ngôn ngữ, ở 900 cho các route trong danh sách đã biết và các khối thẻ, và mọi ảnh
  máy dò đánh dấu. Nhớ luật dự án: test xanh không có nghĩa trông đúng; menu đóng thì ảnh nào cũng đẹp.

## 4. Việc đã biết: xác nhận còn hay không, rồi đưa vào danh sách

1. Bản EN xuống dòng mà bản VI không:
   - dải 900 trang chủ (dòng tồn của BỤI, `.soon-note`);
   - ô `/so/4`, `/so/3` ở 390 và 900 (`.b-tile-meta`, `.b-tile-kind` "Funnel-neck hoodie");
   - tiêu đề `/so/5` ở 390.
2. Trang một đơn ở 900 (mốc giờ các bước, meta món, ô tài khoản ngân hàng); hộp thư ở 900 (bản VI 3 dòng, EN 4).
3. `/faq#doi-tra` dừng khi nhóm cách đỉnh 172px, chưa sát dưới thanh trên (cả bản VI).
4. Không có script thì lưới Cửa hàng trống (thẻ `opacity: 0`). Giả thuyết chưa đo: `[data-ui="feed"] .rv:not(.in)` thắng luật dự
   phòng trong `<noscript>`.
5. Chân trang gọn ở 900, bản VI chỉ còn 8px trước khi link rớt xuống hàng hai.
6. Quản trị, trang một đơn: cột "Style" ra 3 dòng ở bản EN ở 1280 (DH-2418, DH-2311). Gợi ý tiêu đề ngắn hơn, ví dụ "Variant".
7. Quản trị có hai kiểu ngày đứng cạnh nhau: hàng chờ Tổng quan "Paid 07:52 30 Sep" và "due 08:05, 3 Oct"; sổ đơn "due 08:05 · 3
   Oct" ở cột Thanh toán và "due 08:05 3 Oct" ở cột Trạng thái.
8. Form mẫu: câu thứ tự màu ra 2 dòng ở bản EN (gợi ý "Pick order sets the colour band; the first is the cover."). Ô loại · fit và
   ô màu của bảng Mẫu xuống dòng thêm ở 1280.
9. Từ mượn không dấu lọt máy dò chữ Việt: "Form", "Size", "oversize", "VD" trong chữ quản trị.
10. Chỗ vá `select` gắn `lang` lên cả dòng option, nên chữ phụ tiếng Anh ("12 styles", "Jackets") cũng mang `lang="vi"`. Gắn vào
    `ItemText` thì đúng hơn.
11. Chân thanh bên quản trị bản EN in "Quản lý cửa hàng", tên đã lưu của tài khoản quản trị mẫu. Đề xuất hướng xử lý; cần người dùng
    quyết.
12. **Bốn việc an toàn** (backend; đã nằm trong phạm vi):
    - a. Link tra đơn `/track?code=…&phone=…` đưa số điện thoại vào URL, tức vào lịch sử trình duyệt và log;
    - b. trigger tạo hồ sơ tin `handle` trong `raw_user_meta_data`. Ai có publishable key thì tự đặt được `handle`, và B17 sẽ coi đó
      là dữ liệu mẫu (không che, không xoá). Hướng gợi ý: đọc từ `raw_app_meta_data`, thứ chỉ service role ghi được;
    - c. callback Google (`/auth/callback`) chưa có giới hạn tần suất riêng;
    - d. tên Google dài quá 60 ký tự thì không lưu được Hồ sơ cho tới khi rút ngắn.

    Với bốn việc này: đọc mã, mô tả hiện trạng, đề xuất cách sửa cụ thể (tệp, hàm, migration nếu cần). Không sửa.
13. `DESIGN.md` thiếu B18 (khối `.hold-pay`, nhãn theo cách trả) và còn dòng B16 "nút Google tắt vẫn có icon". Chỉ ghi lại; phiên
    chính giao documenter sau.

## 5. Báo cáo (hợp đồng đầu ra)

Ghi `.playwright-cli/audit-v6/findings.md`. **Kèm nguyên danh sách trong tin cuối**, phòng khi việc ghi tệp bị chặn.

**Mỗi phát hiện** đánh số F1, F2, … gồm:
- route, khung nhìn, ngôn ngữ, trạng thái;
- đường dẫn ảnh;
- loại: `lỗi` (vỡ, tràn, cắt chữ, lỗi console, a11y), `EN-bố cục`, `VI-bố cục`, `câu chữ`, `nhất quán`, `an toàn`, `dữ liệu`;
- mức:
  - `cao`: hỏng, hoặc khách nước ngoài sẽ thấy ngay;
  - `vừa`;
  - `thấp`;
- sai gì: một câu, có số đo khi đo được;
- cách sửa đề xuất: tệp, selector hoặc chuỗi, giá trị;
- `cần người dùng quyết`: có hoặc không;
- số của mục đã biết, nếu có.

**Ba mục riêng ở cuối:**
- **"Câu chữ đề xuất"**: mọi câu muốn đổi, dạng bảng: chỗ, câu VI cũ, câu VI mới, câu EN cũ, câu EN mới, lý do. Bảng này thành trang
  duyệt từng câu cho người dùng.
- **"Không sửa (đúng thiết kế)"**: những gì đã kiểm và giữ nguyên, kèm lý do.
- **"Số liệu"**: số route, số ảnh, kết quả từng máy dò so với mốc, lỗi console.

**Sắp theo mức:** `cao` trước. Mục giống nhau ở nhiều route thì gộp làm một, liệt kê các route.

## 6. Luật

- Không bấm "Đặt lại dữ liệu mẫu" trên UI. Sau khi ghi DB thì chạy `select public.reset_demo(public.demo_anchor());` qua service role
  hoặc `npx supabase db query`.
- Không đổi mật khẩu tài khoản mẫu. Không đọc `supabase/.env`. Không in khoá.
- Lệnh nào bị hệ thống quyền chặn: đừng tìm đường vòng, ghi vào báo cáo.
- 3200 đang chạy bản build mới nhất (B18 vòng 2). Stack Supabase cục bộ đang chạy. Để nguyên cả hai khi xong.
- Trình duyệt playwright chỉ cho loopback. Trang của Stripe và Google không mở được, và điều đó đúng như cấu hình.
