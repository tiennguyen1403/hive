# Brief lát 0 · v3 — nền: token, chữ, từ "Số", icon, badge B, nav, chân trang, thẻ mẫu

Phiên chính viết, 22/09/2026, sau khi người dùng duyệt 21 / 21 khung bước 2 và chốt
badge B lúc 01:02 22/09. Agent `ui-implementer` thực thi; phiên chính duyệt lại
độc lập. Vòng v3: mock ở `prototype/v3/`, ảnh nộp vào `.playwright-cli/shots/v3/lat0/`.

## 1. Màn / phạm vi

Lát 0 không phải một màn, mà là **nền chung cho mọi route**. Mọi route hiện tại
(v2) phải vẫn chạy, build sạch, test xanh; bố cục riêng của từng màn đổi ở các lát
sau (1 trang chủ · 2 danh mục, PDP, tìm kiếm · 3 giỏ, thanh toán, xác nhận, tra cứu ·
4 tài khoản, thông báo, đăng nhập, trang nội dung · 5 quản trị). Trong lát này chỉ đổi:

| Việc | Ở app | Mock để so |
|---|---|---|
| Token màu, bo góc, khoảng cách, vai chữ | `app/globals.css` (`@theme` + alias) và `app/styles/base.css` | `prototype/v3/v3.css` khối `:root`, `html[data-dir="nhan"]`, "ground" |
| Bộ chữ Unbounded 800 + Be Vietnam Pro 400/500/600/700 | `app/layout.tsx` (next/font/google, subset `vietnamese` + `latin`), bỏ Familjen Grotesk | `v3.css` `--font-display`/`--font-sans`, `type.html` mẫu D |
| Từ "Số" thay "đợt" ở **mọi** chuỗi tiếng Việt | `lib/lexicon.ts` (mới) + mọi file có "đợt/Đợt" (63 file trong `app/ components/ lib/ data/`) | `LEX.so` trong `v3.js`, `voice.html` |
| Icon: thang cỡ + cắt quang học | `components/icon/Icon.tsx`, `icon.test.ts`, CSS `.ic` | `v3.js` `OPTICAL`, `frame()`, `ink()`; `v3.css` `.ic` |
| Badge họ B (thẻ trạng thái, dấu SOLD OUT, bong bóng đếm, nhãn khách, số đếm thanh bên) | `components/ui/Badge.tsx` + CSS | `badges.html` mục B, `v3.css` khối "BADGES", `v3-pages.css` cuối (`.side nav a .cnt`, `.ctag`) |
| Nav + chân trang cửa hàng | `components/shop/SiteNav.tsx`, `SiteFooter.tsx`, `ShopFrame.tsx`, `app/styles/nav.css` | `home.html` (khung `.nav3`, `.foot3`), `v3.js` `navHtml()` `footerHtml()`, `v3.css` mục nav và footer |
| Thẻ mẫu | `components/product/ProductCard.tsx`, `app/styles/cards.css` | `home.html`/`products.html` `.card3`, `v3.css` mục cards, `brand.html` mục thẻ mẫu |
| Thanh bên quản trị: chỉ số đếm thành badge, còn lại giữ v2 | `components/admin/AdminNav.tsx` | `v3-pages.css` cuối |

Không đụng: bố cục bìa trang chủ, listing, PDP, giỏ, checkout, tài khoản, khung
quản trị (trừ số đếm). Chúng sẽ trông "v2 bố cục, v3 màu chữ" tạm thời — chấp nhận.

## 2. Quyết định đã chốt (coi là xong, không hỏi lại)

- **Hướng NHÃN** (21/09 22:38): nền trắng cho sàn hàng; **vải đen `#171410`** chỉ cho
  khối Số (bìa, teaser Số kế tiếp, tem Số trên nav, nhãn hạn chuyển khoản, thanh bên
  quản trị, thanh hàng loạt) — người dùng chọn, nên quy tắc "không nền tối" của v2
  không áp cho các khối này; **không sơn đen chỗ mock không sơn**. Chỉ mật ong
  `#eba400` (chữ trên đó `#171410`) chỉ cho nút chính, số bìa, tick ô chọn, đường may
  đứt nét; chữ liên kết `#9e6817`; mực `#171410`, mực phụ `#6b6250`, kẻ `#ece7dd`,
  viền điều khiển `#9c937f` (3,05:1), nền ảnh/tấm `#f4efe6`, vàng nhạt `#fbf1da`;
  trên vải đen: chữ trắng, chữ phụ `#b9b0a0`, kẻ `#3a352e`, đường viền `#eba400`.
  Trạng thái: `--hot #b3261e/#fbeaea`, `--ok #1b6b3a/#e6f4ea`, `--info #0c6289/#dceffa`,
  `--warn #44505e/#eaedf1`. Bo góc **4px** (3px nhỏ). Nav có bóng mềm
  `0 1px 0 rgba(23,20,16,.04), 0 10px 24px -14px rgba(23,20,16,.28)`, viền dưới `#ece7dd`.
  Alias v2 (`--fill`, `--link`, `--hair`, `--ink`…) giữ tên, trỏ sang giá trị mới để
  màn chưa đổi vẫn build.
- **Chữ D**: Unbounded 800 cho số, tiêu đề, tên mẫu, wordmark, mã đơn (`--font-display`,
  cách chữ -.03em, số bìa -.05em); Be Vietnam Pro cho mọi chữ khác. Chín vai:
  số 96/168, display 30/44, h1 24/28, h2 18/21, h3 15/16, body 14, ui 13, small 12,
  micro 11 (điểm gãy 900px). Sàn 11px (QĐ-22). Chín bậc khoảng cách 4 8 12 16 24 32
  48 64 96. Gutter 18 / 40 từ 900px, `--max` 1320.
- **Từ "Số"**: `Số`/`số`/`SỐ` thay `Đợt`/`đợt`/`ĐỢT` trong mọi chuỗi tiếng Việt
  (nhãn nav, tiêu đề, mô tả, thông báo, tên cột, nhãn form, `metadata.description`,
  toast, CSV header). Bảng từ chuẩn: `LEX.so` trong `prototype/v3/v3.js` (chép
  nguyên vào `lib/lexicon.ts`, có `issueLabel(no)` → "Số 05"). Test đang so chuỗi cũ
  ("Đợt đã đóng", "xem đợt 05", "Đợt 05") thì cập nhật theo. Không đổi: URL
  (`/admin/drops`), tên định danh trong code (`drop`, `dropNo`), khoá localStorage.
  Kiểm: `grep -rn "đợt\|Đợt" app components lib data` chỉ còn trong chú thích code
  giải thích lịch sử (được phép) — chuỗi hiển thị phải là 0.
- **Giọng chữ**: trung tính, không xưng hô ("Đơn gồm 2 món", không "của bạn"); các
  câu thật ở `prototype/v3/voice.html` mục 5. Lát này chỉ đổi những chuỗi nằm trong
  phạm vi (nav, chân trang, thẻ, badge); câu của từng màn đổi ở lát của màn đó.
- **Badge họ B "vải đen"** (`badges.html`, `v3.css` khối BADGES với `data-badge="b"`):
  nhãn đặc không viền, cao 24px, chữ 11px 700 chữ hoa cách .08em, luôn có chấm 6px;
  sống (đang bán, đã thanh toán, đã xác nhận) = nền `#171410` chữ `#eba400`; chờ, đã
  đóng, đã huỷ, trung tính = nền `#ece7dd` chữ mực (`.shut` chữ phụ); cảnh báo (còn 2,
  hết lượt, sắp hết) = `#fbeaea`/`#b3261e`; sắp mở, đang giao = `#dceffa`/`#0c6289`.
  Trên vải đen (bìa, thanh bên): nền `#3a352e` chữ `#eba400`. Dấu **SOLD OUT** trên
  ảnh mẫu đã hết: đen chữ vàng, Unbounded 12px cách .12em, padding 6px 10px, đường
  may đứt nét vàng `outline:1px dashed` lùi 4px, góc trên trái 10px. Bong bóng đếm
  trên túi và tim: đen chữ vàng, 16px, chỉ hiện khi > 0. Nhãn khách (`.ctag`): giữ
  nền nhạt của mock, chữ 700. **Số đếm trên thanh bên quản trị**: viên 18px bo tròn,
  vàng chữ đen khi mục thường, đen chữ vàng trên mục đang mở (người dùng chốt 22/09).
- **SOLD OUT** là từ tiếng Anh duy nhất trên màn khách (hai chữ, viết hoa); trong câu
  chữ vẫn "đã hết", "hết size", "14 / 14 đã bán".
- **Icon** Iconsax Linear, nét theo hộp; hộp 12 (dấu), 15 (cạnh chữ 12–13px), 18 (nav,
  nút icon), 28 (trạng thái trống). `.ic` là `inline-block; vertical-align:-.18em`
  để icon trong đoạn chữ nằm trên dòng. Bảng **`OPTICAL`**: `plus` và `minus` viewBox
  `4 4 16 16`, `check` `6.5 6.5 11 11` (mực nhỏ hơn nửa bộ nên phải cắt, cùng cách
  với `<Tick>`); `--il/--ir` tính theo khung đã cắt (xem `ink()` trong `v3.js`).
  Không cắt glyph Bulk. Thêm test trong `icon.test.ts` cho ba glyph này.
- **Nav cửa hàng** (`.nav3`): 56px điện thoại (wordmark 16px Unbounded cách .14em,
  tem Số đen chữ vàng "● SỐ 05", bốn nút icon 40×44: tìm, tim, tài khoản, túi), 64px
  desktop (wordmark, năm liên kết họ + "Số 05" đứng đầu với gạch vàng khi đang mở,
  tem Số kèm "· đóng sau 5 ngày 1 giờ" đếm từ `lib/drop.ts`, nút icon 44). Tem Số
  sắp mở: chấm xanh, "Số 06 · mở sau …". Sticky, bóng mềm như trên.
- **Chân trang** (`.foot3`): viền trên 2px mực; bốn cột từ 900px (Lịch ra số: Số 05
  đang bán + đóng sau…, Số 06 sắp mở + giờ, Số 04 đã đóng + đã bán · xem lại; Hỗ trợ;
  Giao & thanh toán; Về BRAND + ô NeedWrite "Chờ người viết · Kênh liên hệ và mạng xã
  hội"); điện thoại hai cột, hai cột dài chiếm cả hàng; colophon "BRAND · Streetwear
  unisex. Mỗi số cắt một lần. · Tên pháp nhân · MST — chờ chốt". Số liệu lấy từ
  `lib/drop.ts`/`data/`, không gõ tay.
- **Thẻ mẫu** (`.card3`): ảnh 4:5 bo 4px nền tấm; dòng mục lục `tên … giá` (tên
  Unbounded 14px, dấu dẫn chấm, giá tabular; dòng được xuống dòng, lưới
  `minmax(0,1fr)`); dòng đếm 12px chữ phụ "còn 17 · S M L XL" / "còn 2 · hết S M"
  (`còn 2` đỏ khi < 4) / mẫu hết: "14 / 14 đã bán"; thanh nút dưới thẻ 40px viền
  mực "Thêm vào giỏ" (icon túi 15) mở sheet size hiện có, hover đảo đen chữ vàng;
  mẫu hết: dấu SOLD OUT trên ảnh (ảnh mờ 50%, xám 50%) và nút "Xem chi tiết" viền
  `#9c937f` chữ phụ. Vùng chạm 44 qua lớp phủ như DESIGN.md §5.
- Số điện thoại và khoảng ngày không gãy dòng: `lib/phone.ts` (và chỗ ghép khoảng
  ngày trong `lib/datetime.ts`) dùng U+00A0 giữa các nhóm và quanh dấu "–"; giá trị
  trong `<input>` giữ khoảng trắng thường. Cập nhật test.
- Bài học mock v3 áp cho code: tên modifier khác tên khối (`.sec` mục vs `.btn.sec`
  từng va chạm), `td.right` cho ô số; lưới thẻ `minmax(0,1fr)`; span từ vựng không
  cần trong app (dùng hằng).
- Không tính năng mới ở lát này; không backend; không phụ thuộc mới (Unbounded qua
  next/font/google như hai font hiện tại).

## 3. Lỗi kèm

Không có mục nào trong L1–L12 (đã xong ở v2). Lát này mang ba việc sửa nền: (a) từ
"đợt" còn sót ở bất kỳ chuỗi nào; (b) `+`/`−`/`✓` quá nhỏ (OPTICAL); (c) số điện
thoại/khoảng ngày gãy dòng (U+00A0).

## 4. Nghiệm thu

Ở 390 và 1280, trên preview 3200 sau `npm run build`:

1. `/`, `/products`: nav đúng mock (wordmark Unbounded, tem Số đen chữ vàng, đếm
   ngược đúng `lib/drop.ts`, bong bóng đếm đen chữ vàng khi giỏ/tim > 0 và ẩn khi 0,
   liên kết họ desktop với gạch vàng ở mục đang mở); chân trang đúng bốn cột/hai cột,
   ô NeedWrite, colophon; không có "đợt".
2. `/products` (và lưới trang chủ nếu đang dùng `ProductCard`): thẻ theo mục 2, thẻ
   MUỐI có SOLD OUT + "Xem chi tiết", nút "Thêm vào giỏ" mở sheet size, hover đảo màu.
3. `/account/orders` (đăng nhập mô phỏng) và `/admin/orders`: thẻ trạng thái họ B
   (đen/vàng cho đã thanh toán, vải mộc cho chờ chuyển khoản, xanh cho đang giao);
   thanh bên quản trị: "Đơn hàng" có viên vàng số 5, đổi thành đen chữ vàng khi
   đang ở mục đó; nhãn nav "Các số".
4. `/cart`: nút `−`/`+` của bộ đếm có mực ≥ 12px trong hộp 15 (đo `getBBox`), tick ở
   ô chọn giữ như cũ.
5. Font: không có yêu cầu mạng lúc chạy; Unbounded hiển thị dấu tiếng Việt đúng
   ("SƯƠNG", "NGUỘI", "Số").
6. `npm run typecheck`, `npm test` xanh (cập nhật test đổi từ); build sạch; sweep
   `tools/layout-sweep.js` 0 tràn ngang, 0 lỗi console; sàn chữ 11px; vùng chạm 44
   trên nav, thẻ, chân trang (đo `elementFromPoint`).
7. Mọi route khác vẫn mở được và không lỗi console (bố cục v2 tạm thời là chấp nhận).

## 5. Ảnh nộp (`.playwright-cli/shots/v3/lat0/`)

`home-390.png`, `home-1280.png` (nav + phần đầu), `footer-390.png`, `footer-1280.png`,
`products-390.png`, `products-1280.png`, `products-sizesheet-390.png` (sheet mở từ
"Thêm vào giỏ" của thẻ), `cart-390.png` (bộ đếm), `account-orders-1280.png` (thẻ
trạng thái B), `admin-orders-1280.png` (thanh bên có badge số, thẻ B trong bảng),
`admin-orders-active-1280.png` (mục Đơn hàng đang mở: badge đen chữ vàng).

Đọc trước: `AGENTS.md`, docs Next trong `node_modules/next/dist/docs/`, `DESIGN.md`
(v2, thua brief này chỗ khác nhau), `PRODUCT.md`, `.claude/skills/impeccable/reference/craft-floor.md`,
`impeccable context --target app/page.tsx` (hợp đồng hướng v3 ở
`.impeccable/surfaces/app-page-tsx.md`). Không sửa `prototype/`, `tasks/`, `DESIGN.md`.
Báo cáo theo hợp đồng trong định nghĩa agent; để server preview 3200 chạy.
