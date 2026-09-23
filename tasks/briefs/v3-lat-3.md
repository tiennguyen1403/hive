# Brief lát 3 · v3 — giỏ, thanh toán, xác nhận đơn, tra cứu đơn

Phiên chính viết 22/09/2026 sau khi lát 2 ĐẠT. Agent `ui-implementer` thực thi; phiên chính duyệt
lại độc lập. Mock: `prototype/v3/cart.html`, `checkout.html`, `order-confirmed.html`, `track.html`;
CSS ở `v3-pages.css` (`.pghead .two3 .steps3 .cartlist .cartline3 .qty3 .later .shipbar3 .promo3
.promoon3 .sum3 .promises3 .fine3 .lnk.tap .field .row2 .row3 .inp3.area .selbtn3 .picks3 .consent
.addrform .orderbox3 .ol .done3 .deadline .bank .qrrow .qrph .tl3 .lookup .result3 .kvs .panel3
.empty3`), `v3.css` (`.note3 .needwrite .btn3.quiet`), `v3.js` (`.qty3` chặn ở `max` + `data-maxmsg`,
`.picks3 .pick` radio với `data-show/hide`, `[data-copy]`, `details.autoopen` ≥ 900, đồng hồ `boxes`
h/m/s). Ảnh nộp vào `.playwright-cli/shots/v3/lat3/`.

## 1. Màn / phạm vi

| Route | Việc | Mock |
|---|---|---|
| `/cart` (`components/cart/*`, `app/styles/checkout.css`) | Dựng lại theo `.steps3` + `.pghead` + `.two3`: dòng giỏ `.cartline3`, bộ đếm `.qty3` chặn ở tồn, "Giữ lại sau" (mới), thanh miễn phí giao `.shipbar3`, mã giảm giá `.promo3/.promoon3`, tổng `.sum3`, nút thanh toán, `.promises3`, trạng thái trống `.empty3` | `cart.html` |
| `/checkout` (`components/checkout/*`) | Bốn panel `.panel3`: Liên hệ, Giao tới (sổ địa chỉ `.picks3` + form `.addrform`), Giao hàng (+ **ghi chú cho người giao**, mới), Thanh toán; aside `.orderbox3` (details tự mở ≥ 900) + đồng ý + nút đặt | `checkout.html` |
| `/order-confirmed` (`OrderConfirmed.tsx`) | `.done3` (câu đề, mã đơn + Chép), nhãn đen `.deadline` đếm ngược 12 giờ h/m/s, khối `.bank` (số tiền, nội dung, tài khoản "đang chuẩn bị"), hai ô QR `.qrph`, aside: đơn, giao tới, ba liên kết, ghi chú | `order-confirmed.html` |
| **`/track`** (mới: `app/track/page.tsx`, `components/shop/TrackScreen.tsx`, `lib/lookup.ts`) | Tra cứu không cần đăng nhập bằng mã đơn + số điện thoại; kết quả: đầu đơn + badge, hành trình `.tl3`, aside đơn + giao tới + mã vận đơn Chép, **hoá đơn in** (`window.print`), liên kết hỗ trợ; trạng thái không tìm thấy | `track.html` |
| Dùng chung | `Steps` → `.steps3`; `lib/checkout-form.ts` (note đã có trong `CheckoutDraft`), `lib/placed-order.ts` (`note` đã có), `lib/later.ts` (mới, giữ lại sau), `lib/lookup.ts` (mới), `lib/invoice.ts` (mới, dữ liệu hoá đơn từ đơn) | |

Giữ nguyên logic v2: giỏ là hàm thuần `lib/cart.ts` (`resolveCart`, chặn theo `onHandOf`), mã giảm giá
`lib/promotions.ts`, phí và cửa sổ giao `lib/shipping.ts`, sổ địa chỉ trên thiết bị
(`AddressBookContext`), phiên mô phỏng, đặt đơn ghi `brand.orders` (`lib/placed-order.ts`), hai
cấp địa giới (tỉnh/thành → phường/xã, `data/wards.json`), `Select` tuỳ biến không dùng `<select>`
gốc. Không backend, không phụ thuộc mới. Tài khoản/đơn của tôi/chi tiết đơn có đăng nhập là
lát 4; phiếu giao và quản trị là lát 5.

## 2. Quyết định đã chốt

**Thanh bước `.steps3`** (giỏ, thanh toán, xác nhận): bốn bước "Giỏ · Địa chỉ · Thanh toán · Xong",
mỗi bước vòng 28px viền `--line` số Unbounded 11px; bước xong: đen chữ mật ong với tick 11×8;
bước đang: mật ong chữ mực, nhãn 600; đường nối hairline 1px ở `top:14px`; nhãn 11px chữ phụ.

**Giỏ `/cart`**
- `.pghead`: h1 "Giỏ" (Unbounded 24/28), meta 12px "2 món · Số 05 · đóng sau 5 ngày 1 giờ" (đếm
  ngược `lib/drop.ts`).
- `.two3`: điện thoại một cột; desktop `7fr 5fr` gap 48, aside dính `top:84`.
- `.shipbar3`: "Mua thêm **610.000₫** nữa để được miễn phí giao (đơn từ 1.000.000₫)." + thanh 4px
  (`--brand-text`); đủ: `.ok` nền `--ok-bg` "**Đơn từ 1.000.000₫: miễn phí giao tiêu chuẩn.** Giao
  nhanh nội thành TP.HCM vẫn tính 45.000₫." thanh đầy. Số từ `lib/shipping.ts`.
- `.cartlist` viền trên mực; mỗi `.cartline3`: lưới `72px 1fr auto`, ảnh 72×90 bo 3, tên Unbounded
  13px (liên kết PDP, lớp phủ ±14), giá phải 600 tabular, dòng loại "Áo thun oversize · ●Đen ·
  size M" (swatch 10px + tên màu bọc `.nw`), hàng điều khiển: `.qty3` (46px, hai nút 40×44 icon
  `minus`/`plus` 15px cắt quang học, ô số 40 tabular, viền `--line`, chặn ở tồn còn: bấm quá →
  không tăng + toast "Chỉ còn 4 chiếc size M màu Đen" / "Chiếc cuối size L màu Đen"), liên kết
  "Giữ lại sau" và "Bỏ" 12px chữ phụ 36px cao (lớp phủ 44); dòng `.stockline` 12px: "còn 4 chiếc
  size M màu Đen" hoặc `.hot` "chiếc cuối size L màu Đen · giỏ không giữ hàng"; dòng có vấn đề
  (hết size, Số đóng) giữ cách xử lý v2 (`LineIssue`, đổi size `swapSizesFor`) nhưng hình theo
  `.stockline.hot` + liên kết đổi size.
- `.fine3` "Về số 05" (`.lnk.tap` 44).
- **Giữ lại sau** (`section.later`, `lib/later.ts` + `useLater` trong `CartContext` hoặc context
  riêng, khoá `brand.later`, phiên bản schema như `brand.cart`): mục đầu `.sec .hd` "Giữ lại sau"
  + meta "1 món · lưu trên thiết bị, giữ size đã chọn"; mỗi `.row` lưới `48px 1fr auto`: ảnh 48×60,
  tên Unbounded 13, dòng phụ "Áo thun · Trắng · size M · 450.000₫ · còn 12" (còn từ tồn hiện tại;
  hết thì "hết size M" đỏ), nút "Đưa vào giỏ" `.btn.outline.sm` 36 (lớp phủ 44; vô hiệu khi hết,
  nhãn "Hết size M") + "Bỏ" `.lnk` 44. "Giữ lại sau" ở dòng giỏ chuyển cả dòng (giữ size, màu, qty
  về 1) sang danh sách này + toast "Đã chuyển KHÓI sang Giữ lại sau · giữ size M"; "Đưa vào giỏ"
  gọi `addToCart` (chặn tồn) + toast. Ẩn mục khi trống. Không trùng với Đã lưu (wishlist) — người
  dùng chốt giữ cả hai.
- Aside: nhãn "Mã giảm giá" + `.promo3` (ô 44 chữ hoa cách .04em + nút "Áp dụng" `.btn.outline`
  44); mã đang áp `.promoon3` viền đứt nét `--line`: icon `tag` 15, mã Unbounded, "giảm 10%, tối đa
  150.000₫ · đơn từ 500.000₫", liên kết "Bỏ mã" 36 (lớp phủ 44) `nowrap`; lỗi mã (không đủ điều
  kiện, hết lượt, hết hạn) `.note3.hot` như v2 với câu của `lib/promotions.ts`.
- `.sum3` viền trên mực: Tạm tính · 2 món / Giảm giá · DOT05 (−128.000₫) / Phí giao (Miễn phí hoặc
  30.000₫; COD +15.000₫ chỉ ở thanh toán) / Dự kiến nhận "23/09 – 25/09" (U+00A0, cửa sổ giao
  tiêu chuẩn từ hôm nay) / Tổng Unbounded 20 — tất cả từ `checkoutTotals`.
- Nút "Thanh toán · 1.152.000₫" mật ong full-width icon `card` 15 (→ `/checkout`); vô hiệu với lý
  do khi giỏ có dòng chặn (`hasBlockingIssue`): nhãn "Sửa giỏ trước" (nút vô hiệu ghi việc cần làm).
- `.promises3` 11px chữ phụ: `truck` "2–4 ngày" · `refund` "Đổi trả 7 ngày" · `card` "Chuyển khoản ·
  COD · Thẻ" (icon 15). `.fine3` "Giỏ không giữ hàng. Đơn đặt trước nhận trước. Chuyển khoản giữ
  hàng 12 giờ."
- Giỏ trống: `.empty3` icon `bag` 28, h2 "Giỏ trống", p "Chưa có món nào. Số 05 đang bán tới 20:00
  thứ Sáu 25/09.", nút "Xem số 05" mật ong; mục Giữ lại sau vẫn hiện nếu có món.

**Thanh toán `/checkout`**
- `.pghead`: liên kết lùi "‹ Giỏ" (icon `back` 15, 36 cao lớp phủ 44), h1 "Thanh toán", meta "2 món
  · 1.152.000₫".
- Panel `.panel3` (viền hairline bo 4, padding 14 16 16; h3 Unbounded 15/16 viền dưới mực, meta
  chữ thân 12px chữ phụ):
  1. **Liên hệ** — meta "đã đăng nhập · Trần Minh Anh" khi có phiên (điền sẵn email/số điện thoại
     của tài khoản), không thì không meta; `.row2` (xếp một cột ≤ 480): "Email nhận xác nhận đơn"
     (`type=email`), "Số điện thoại" (`type=tel`); lỗi `.err` 12px đỏ + icon `danger` 15 ghim dòng
     đầu (`validateCheckout`).
  2. **Giao tới** — meta "2 địa chỉ đã lưu trên thiết bị" (0 thì "chưa có địa chỉ lưu");
     `.picks3` radio-button: mỗi `.pick` lưới `24px 1fr auto` 44+: vòng 20px (chọn: viền mực + chấm
     mực 10), `b` 14px "Nhà · Trần Minh Anh · 0912 345 678" (U+00A0 trong số), dòng phụ địa chỉ,
     hàng đang chọn nền chuyển sắc tấm→trong 60%; hàng cuối "Giao tới địa chỉ khác / Nhập địa chỉ
     mới, lưu vào sổ nếu muốn" mở `.addrform` (viền đứt nét `--line`, padding 14): `.row2` Người
     nhận + Số điện thoại; địa giới hai cấp `Select` tuỳ biến hình `.selbtn3` (44, chữ 14, icon
     `down` 15 chữ phụ, `.ph` khi chưa chọn): "Tỉnh / thành" + "Phường / xã" — **hai ô, không
     ba** (dữ liệu hai cấp; mock vẽ ba là lệch đã biết); "Số nhà, đường"; Nhãn: chip `Nhà / Công
     ty / Khác` (`.chip3` 36 lớp phủ 44, đang chọn đen chữ vàng); `.consent` checkbox 44 "Lưu địa
     chỉ này vào sổ trên thiết bị" (ô 20 → đen tick mật ong). Không có địa chỉ lưu → form mở sẵn,
     không có `.picks3`.
  3. **Giao hàng** — `.picks3`: "Giao tiêu chuẩn · 2–4 ngày / Nhận 23/09 – 25/09 · miễn phí cho đơn
     từ 1.000.000₫ / Miễn phí|30.000₫" và "Giao nhanh nội thành · 24 giờ / Nhận trước 20:00 ngày
     21/09 · chỉ nội thành TP. Hồ Chí Minh / 45.000₫" (vô hiệu + lý do khi tỉnh khác, như
     `isDeliveryAvailable`); **Ghi chú cho người giao** (mới, `CheckoutDraft.note` đã có): nhãn +
     `.opt` "· không bắt buộc", `textarea.inp3.area` 88px, placeholder "VD: gọi trước 10 phút, gửi
     bảo vệ toà nhà nếu không có người nhận", help "In lên phiếu giao và lưu cùng đơn."; lưu vào
     `PlacedOrder.note`, hiện ở xác nhận (Giao tới · Ghi chú) và sau này ở phiếu giao (lát 5).
  4. **Thanh toán** — `.picks3`: "Chuyển khoản / Giữ hàng 12 giờ kể từ khi đặt · nội dung chuyển
     khoản hiện ở màn xác nhận", "Thanh toán khi nhận (COD) / Thu hộ 15.000₫ · kiểm hàng trước khi
     trả / +15.000₫", "Thẻ (nội địa, Visa) / Cổng thẻ chưa nối · đơn ghi "chưa thu tiền" cho tới
     khi có cổng". Giữ `PaymentMethod` v2.
- Aside dính: `details.orderbox3` (viền hairline bo 4; summary 48px "Đơn gồm 2 món" + tổng + icon
  `down` xoay khi mở; **tự mở từ 900px**, đóng mặc định trên điện thoại); dòng `.ol` `44px 1fr
  auto` (ảnh 44×55, tên Unbounded 12, "Đen · M · ×1", giá); `.sum3` trong hộp; `.fine3` "Sửa giỏ"
  (`.lnk.tap`); `.consent` "Đồng ý điều kiện đổi trả trong 7 ngày nếu chưa qua sử dụng. Giỏ không
  giữ hàng, đơn đặt trước nhận trước."; nút "Đặt hàng · 1.152.000₫" mật ong full-width icon
  `check` 15 (vô hiệu tới khi hợp lệ + đồng ý; nhãn vô hiệu "Điền đủ địa chỉ" / "Đồng ý điều kiện"
  theo `checkoutStep`); `.fine3` "Đặt xong, chuyển khoản trong 12 giờ để giữ hàng. Quá giờ, đơn tự
  huỷ và chiếc đó về kệ." (câu theo hình thức thanh toán: COD → "Đặt xong, cửa hàng gọi xác nhận
  trước khi giao."; thẻ → "Đặt xong, đơn ghi chưa thu tiền cho tới khi có cổng thẻ.").
- Đặt hàng: logic v2 (`PlacedOrder`, trừ tồn mô phỏng nếu v2 có, xoá dòng khỏi giỏ, chuyển
  `/order-confirmed`).

**Xác nhận `/order-confirmed`**
- `.steps3` ba bước xong + "Xong" đang.
- `.done3`: h1 `.big` Unbounded 30/44 `max-width:14ch`: chuyển khoản "Đã nhận đơn. Chuyển khoản
  trong 12 giờ để giữ hàng." · COD "Đã nhận đơn. Cửa hàng gọi xác nhận trước khi giao." · thẻ "Đã
  nhận đơn. Chưa thu tiền cho tới khi có cổng thẻ."; `.code` "Mã đơn **DH-2432**" + nút "Chép"
  `.btn.outline.sm` icon `doc` (clipboard; xong → "Đã chép" 1,5 giây; không có clipboard → chọn
  đoạn chữ).
- Chuyển khoản: `.deadline` vải đen bo 4 đường may đứt nét mật ong trên, padding 16: `.lh` 11px
  hoa chữ phụ "Giữ hàng tới 06:50 · 21/09" (`transferDeadlineIso`), đồng hồ `role=timer` h/m/s
  số 28px Unbounded mật ong tabular (cập nhật mỗi giây; hết → "Đã quá giờ giữ hàng"), p 12px chữ
  phụ "Quá giờ, đơn tự huỷ và hai chiếc này về kệ cho người sau. Đã chuyển thì đơn đổi sang "đã
  thanh toán" khi cửa hàng nhận được tiền." (số chiếc bằng chữ); `dl.bank` viền mực bo 4, hàng
  `104px 1fr auto` ≥56: Số tiền **1.152.000₫** + Chép · Nội dung **DH-2432** "· ghi đúng mã để tự
  khớp" + Chép · Tài khoản "Số tài khoản và tên ngân hàng đang chuẩn bị" (người dùng chốt: chưa
  có tài khoản); `.fine3` "Không chép tự động được thì chọn đoạn trên rồi chép tay."; `.qrrow` (một
  cột, hai cột ≥ 600): `.qrph` viền đứt nét, ô lưới 96px giả, "**Mã QR nhận tiền** / Hiện khi có tài
  khoản ngân hàng thật. Quét là điền sẵn số tiền và nội dung." và "**Mã QR tra cứu đơn** / Sinh từ
  liên kết tra cứu — đang chuẩn bị. Liên kết: /track?code=DH-2432 (Chép)" — in liên kết thật +
  nút Chép để ô này không phải lời hứa suông; không tự viết bộ mã hoá QR (cần thư viện, quyết sau).
- COD/thẻ: không `.deadline`/`.bank`/QR nhận tiền; chỉ ô QR tra cứu.
- Aside: `.panel3` "Đơn gồm 2 món" + meta "đặt 18:50 · 20/09", dòng `.ol`, `.sum3` (giảm, phí,
  tổng); `.panel3` "Giao tới" `dl.kvs` (`110px 1fr`): Người nhận (tên · số U+00A0), Địa chỉ, Cách
  giao "Tiêu chuẩn · nhận 23/09 – 25/09", Ghi chú (chữ phụ; "không có" khi trống), Thanh toán;
  ba nút xếp dọc gap 8: "Xem đơn trong tài khoản" mật ong (đăng nhập → `/account/orders`; khách →
  `/track?code=…&phone=…` với nhãn "Xem hành trình đơn"), "Tra cứu đơn không cần đăng nhập"
  `.btn.outline` (→ `/track?code=DH-2432`), "Về số 05" lặng; `.note3` icon `info`: "Đơn lưu trên
  thiết bị này và hiện trong "Đơn hàng" của tài khoản. Xác nhận qua email tới minhanh@vidu.vn:
  đang chuẩn bị, chưa có máy chủ gửi thư." — **không được viết "đã gửi"** (không có máy chủ).
- Không có đơn vừa đặt (vào thẳng URL): `.empty3` "Chưa có đơn nào vừa đặt" + nút "Về số 05".

**Tra cứu `/track`** (`?code=&phone=` điền sẵn nếu có; tra tự động khi đủ cả hai)
- `.pghead` h1 "Tra cứu đơn" + meta "không cần đăng nhập"; `form.lookup` (max 520): `.row2` (một
  cột ≤ 480) "Mã đơn" (placeholder DH-0000, chữ hoa) + "Số điện thoại đặt hàng" (`tel`); `.help`
  dưới cả hai ô "Đúng số đã dùng khi đặt, để người khác không tra được đơn chỉ bằng mã."; nút
  "Tra cứu" mật ong icon `search` 15 (`type=submit`, Enter chạy). Tra: `lib/lookup.ts` —
  `lookupOrder(code, phone, placed)` chuẩn hoá mã (hoa, thêm "DH-" nếu chỉ số) và số
  (`normalisePhone`); khớp đơn fixture qua `customerId → customer.phone`, hoặc đơn đặt trên thiết
  bị (`brand.orders`) qua `phone` của đơn; không khớp → `.err` dưới form "Không tìm thấy đơn
  DH-0000 với số này. Kiểm lại mã trong email hoặc màn xác nhận." Ghi URL `?code=&phone=` khi
  tìm thấy (để chia sẻ và làm QR sau).
- Kết quả `.result3` (viền trên 2px mực): `.two3`: trái `.pghead` h2 mã đơn Unbounded 18 + badge B
  trạng thái (`ROW_STATE_LABEL`) + meta "đặt 20:30 · 16/09 · 2 món · 759.000₫"; `.panel3` "Hành
  trình" meta "cập nhật 10:15 · 17/09" (mốc mới nhất); `.tl3` (viền trái 2px hairline, chấm 12:
  `done` đen, `now` mật ong, `late` viền đỏ, `todo` viền `--line`): tiêu đề 13px 600 + dòng 12px
  chữ phụ; bước từ `orderTimeline` (đơn fixture) hoặc `deviceTimeline` (đơn trên thiết bị); mốc
  "Đang giao" ghi "đơn vị vận chuyển chưa nối, mốc này cập nhật tay từ cửa hàng"; chờ chuyển khoản
  quá hạn → `late`. Phải: `.panel3` "Đơn gồm N món" (`.ol` + `.sum3` với dòng cuối "Đã thanh toán"
  hoặc "Cần thanh toán"), `.panel3` "Giao tới" `dl.kvs` (Người nhận, Địa chỉ, Mã vận đơn **VNP-…**
  + Chép khi đang giao/đã giao), nút "Tải hoá đơn" `.btn.outline` icon `printer` (mở
  `window.print()`; trang có `@media print` chỉ in khối `.invoice`: BRAND, mã đơn, ngày đặt, người
  nhận, dòng hàng, tổng, hình thức thanh toán, "Đã thanh toán"/"Chưa thu tiền" — `lib/invoice.ts`
  gom dữ liệu, không gõ tay) + "Cần hỗ trợ về đơn này" lặng (→ `/contact`).
- Đơn fixture nào cũng tra được bằng số của khách đó (không giới hạn phiên); DH-2425 + 0987 654 321
  là ví dụ nghiệm thu (Lê Hoàng Nam, đang giao, VNP-2425-01 nếu fixture có).

**Chung**: vải đen chỉ ở nav, badge, `.deadline`; mọi bề mặt còn lại trắng; từ "Số" từ lexicon; giọng
không xưng hô ("Đơn gồm 2 món", không "của bạn"); số từ dữ liệu; vùng chạm 44 đo nghiêm; sàn
11px; `.row2` xếp cột ≤ 480; số điện thoại và khoảng ngày U+00A0; toast dùng chung.

## 3. Lỗi kèm

Không có lỗi L. Sửa nền: (a) mọi chuỗi "của bạn/của tôi" trong bốn màn → giọng không xưng hô;
(b) `Steps` cũ (`.steps`) thay hẳn bằng `.steps3`; (c) không được có câu "đã gửi email".

## 4. Nghiệm thu (preview 3200, 390 và 1280)

1. `/cart` với 2 dòng (gieo `brand.cart` KHÓI M đen ×1 + BỤI L đen ×1): thanh bước, đầu trang, thanh
   giao, dòng giỏ đủ mục, bấm + vượt tồn → toast chặn, "Giữ lại sau" chuyển dòng xuống mục dưới
   (toast), "Đưa vào giỏ" đưa về, "Bỏ" xoá, áp mã DOT05 → `.promoon3` + tổng đổi, "Bỏ mã", tổng và
   dự kiến nhận đúng `checkoutTotals`; giỏ trống `.empty3`.
2. `/checkout`: đăng nhập mô phỏng → meta liên hệ + điền sẵn; sổ địa chỉ 2 mục + "địa chỉ khác" mở
   form (Select tỉnh/phường hoạt động, chip nhãn, consent); đổi cách giao đổi phí và dự kiến; ghi
   chú lưu; đổi thanh toán đổi câu cuối; orderbox mở ở 1280, đóng ở 390 và mở khi bấm; nút đặt vô
   hiệu tới khi hợp lệ + đồng ý; đặt → `/order-confirmed`.
3. `/order-confirmed`: ba biến thể (chuyển khoản có đồng hồ chạy từng giây + bank + hai QR; COD;
   thẻ), Chép hoạt động (toast/"Đã chép"), ghi chú giao hiện ở "Giao tới", ba liên kết đúng đích,
   ghi chú email "đang chuẩn bị"; vào thẳng không có đơn → `.empty3`.
4. `/track`: điền DH-2425 + 0987 654 321 → kết quả đầy đủ (badge "Đang giao", hành trình, mã vận
   đơn + Chép, hoá đơn in: mở print preview không lỗi và `@media print` chỉ hiện `.invoice`); mã
   sai/số sai → `.err`; đơn vừa đặt trên thiết bị tra được bằng mã + số đã nhập; URL `?code=&phone=`.
5. typecheck, test (thêm test cho `lib/later.ts`, `lib/lookup.ts`, `lib/invoice.ts`, chuẩn hoá mã),
   build, sweep 0 tràn 0 lỗi, sàn 11px, vùng chạm 44 kể cả trong details mở và form địa chỉ mở; 0
   "đợt"; 0 yêu cầu mạng.

## 5. Ảnh nộp (`.playwright-cli/shots/v3/lat3/`)

`cart-390.png`, `cart-1280.png`, `cart-later-390.png` (sau khi chuyển một dòng sang Giữ lại sau),
`cart-promo-390.png` (mã đang áp), `cart-empty-390.png`, `checkout-390-1.png`, `checkout-390-2.png`
(cuộn tới thanh toán + orderbox mở), `checkout-1280.png`, `checkout-addrform-390.png` (địa chỉ khác
mở, Select đang mở), `checkout-select-1280.png`, `confirmed-transfer-390.png`, `confirmed-transfer-1280.png`,
`confirmed-cod-390.png`, `track-390.png` (form + kết quả DH-2425), `track-1280.png`,
`track-error-390.png`, `track-print-1280.png` (bản in: `page.emulateMedia({media:"print"})`).

Đọc trước: `AGENTS.md`, docs Next trong `node_modules/next/dist/docs/`, `DESIGN.md` (v2, thua brief
chỗ khác nhau), `PRODUCT.md`, `craft-floor.md`, `impeccable context --target app/cart/page.tsx`.
Không sửa `prototype/`, `tasks/`, `DESIGN.md`. Báo cáo sáu mục; để server 3200 chạy.
