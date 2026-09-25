# Brief — v3 lát 13: soát UI toàn app, sửa lỗi nhỏ (polish)

Phiên chính soát 26/09/2026 theo yêu cầu người dùng: *"quét hết tất cả các màn hình, tìm các điểm lỗi UI, polish lại cho
chỉn chu và check layout, spacing … hoàn thiện phần UI không để lại lỗi nhỏ nào"*. Phiên chính đã chụp mọi route ở 360 /
390 / 768 / 1280 / 1440, mở lớp nổi, chạy `tools/layout-sweep.js` và máy dò riêng, so với mock v3. Lát này **chỉ sửa
lỗi**: không đổi hướng thiết kế, không đổi màu/chữ/bo góc, không thêm tính năng. Mọi mục dưới đây đã được đo; nguyên
nhân ghi "đo được" là đã chứng minh, "nghi" là giả thuyết — tự đo lại trước khi sửa.

Ảnh bằng chứng của phiên chính (chỉ đọc):
`C:\Users\PC\AppData\Local\Temp\claude\D--Code-e-commerce\76f6b540-d502-4d00-87d4-f759ede57308\scratchpad\audit\`
(`p1/` mọi route 390+1280, `p2/` lớp nổi, `p3/` 360/768/1440, `p4/` trạng thái giữa hai Số, `mock/` mock v3,
`findings.md` sổ ghi). Máy chủ xem thử 3200 đang chạy bản dựng của `main` hiện tại.

---

## 1. Màn và route

Toàn app. Route chạm tới: `/`, `/products`, `/products/[slug]`, `/so/[no]` (đang bán và đã đóng), `/search`, `/cart`,
`/checkout`, `/track`, `/sign-up`, `/about`, `/account`, `/account/orders/[code]`, `/account/addresses`,
`/account/addresses/new`, và quản trị `/admin`, `/admin/orders`, `/admin/orders/[code]`, `/admin/drops`,
`/admin/customers/[id]`. Mock đối chiếu: `prototype/v3/*.html` (mock là chuẩn cho mọi thứ lát này **không** nhắc tới).

## 2. Quyết định đã chốt áp cho lát này (không hỏi lại)

- Phiên chính quyết mọi mục ở §3 là **sửa lỗi trong hệ đã duyệt**. Chỗ nào §3 đi xa hơn mock (P8, P12, P15, P21, P25),
  §3 thắng mock — đó là quyết định của phiên chính, không phải thiết kế lại.
- Không đổi token, không thêm màu hex mới. Được dùng token có sẵn `--gold-800` (#6e4a12) cho chữ liên kết trên nền
  màu (P24) — tính tương phản trước khi viết, ghi số vào chú thích.
- Luật cũ còn nguyên: tên lớp không trùng tiện ích Tailwind (`lib/classnames.test.ts`), grep tên lớp trước khi đặt;
  lớp portal không thừa kế `.s`; vùng chạm ≥ 44 trên điện thoại đo bằng `elementFromPoint`; vòng focus chỉ khi đi bằng
  bàn phím (`html[data-pointer]`), **không** thêm outline nào khác; sàn chữ 11px; chú giải code bằng tiếng Anh.
- Thứ tự nạp `@import` trong `globals.css` giữ nguyên. Thêm quy tắc vào tệp nào trong bảy cặp hoà ở `globals.css` thì
  nói ra trong báo cáo.
- **Tablet 600–899px và câu chữ giải thích: KHÔNG làm trong lát này** — phiên chính đang hỏi người dùng; nếu có việc sẽ
  gửi thêm tin nhắn.

## 3. Các lỗi phải sửa

Mỗi mục: hiện trạng (đã đo) → việc cần làm → cách kiểm. Tên tệp:dòng là chỗ phiên chính thấy, có thể lệch vài dòng.

### A. Cửa hàng — khung, thanh, lớp nổi

**P1 · Thanh mua dính đáy che cuối trang (PDP, < 900px).** `.buybar3` fixed đáy (~61px) hiện khi cuộn qua nút mua; cuộn
tới đáy thì dòng cuối chân trang ("Tên pháp nhân · MST — chờ chốt") nằm dưới thanh, không đọc được
(`p1/guest/pdp-khoi-390-strip2.png`, khung 2). Việc: khi trang có `.buybar3`, chừa đáy trang đúng bằng chiều cao thanh
(kể cả `env(safe-area-inset-bottom)`) để cuộn hết thì chân trang nằm trọn trên thanh; ≥ 900px không đổi (thanh ẩn).
Kiểm: 390, cuộn hết — dòng colophon cách mép trên thanh ≥ 12px; `/products/s05-khoi` và `/products/ao-thun-tron`.

**P2 · Toast trên điện thoại bị bóp còn ~195px.** `.toast{left:50%; transform:translate(-50%,…)}` với bề rộng tự co →
hộp chỉ được co trong nửa khung nhìn, câu ngắn rớt hai dòng: "Đã thêm S05 – KHÓI / size M vào giỏ", "Mã DOT05 đã áp
dụng · / −119.000₫", "Đã đặt nhắc giờ mở · lưu / trên thiết bị này" (`p2/home-added-toast-390.png`,
`p2/pdp-added-390.png`, `p2/cart-promo-valid-390.png`, `p2/remind-on-390.png`). `app/styles/sheet.css:242`. Việc: toast
rộng theo nội dung tới tối đa `calc(100vw - 36px)`, vẫn canh giữa; một dòng khi vừa. Kiểm: bốn toast trên ở 390 đều một
dòng; một câu dài thật sự thì xuống dòng trong hộp ≤ 354px; 1280 không đổi.

**P3 · Khung trang rộng hơn 1280px.** `desktop.css:25` `.s{max-width:1280px; margin-inline:auto}` chặn MỌI khung:
- thanh điều hướng: ở 1440 nền, nét `--hair` và bóng mềm dừng ở x=80 và x=1360 — hai đầu bóng lộ ra
  (`p3/guest/home-1440-01.png`); kẻ 2px mực của chân trang cũng dừng ở đó;
- khu quản trị `.s.adm3`: ở 1440 thanh bên đen trôi cách mép trái 80px, hai dải trắng hai bên app
  (`p3/admin/admin-1440-01.png`).
Việc: (a) khung cửa hàng `.s.v3` trải hết bề ngang; **nội dung vẫn 1280**: `main` chặn 1280 canh giữa; `.nav3 .in` và
`.foot3 .in` chặn 1280 (thay `--max` 1320) để mép logo, mép nội dung và mép chân trang thẳng một đường ở mọi bề ngang;
nền/nét/bóng của thanh và kẻ chân trang chạy mép tới mép. Ở ≤ 1280 **không pixel nào đổi** (so ảnh trước/sau ở 1280,
900, 390). Bìa đen vẫn là khối 1280 như hiện nay. (b) `.s.adm3` lấp đầy khung nhìn: thanh bên dính mép trái, nền
`--plate` tới mép phải; `.main` giãn theo. Kiểm: 1280 trùng ảnh cũ; 1440 và 1920: thanh và kẻ chân trang trọn bề ngang,
logo thẳng mép với nội dung (x = (W−1280)/2 + 40), quản trị không còn dải trắng; không tràn ngang.

### B. Cửa hàng — chữ, nhịp, canh hàng

**P4 · Bốn quy tắc: tiêu đề quy tắc màu chữ phụ.** Trang chủ `#rules` và `/about`: "Cắt đúng một lần"… ra `--ink2`
(107,98,80), mock là mực (23,20,16) — đo được. Nguyên nhân (đo được): khối v2 đã chết trong `admin.css:40-46`
(`.s .rules{…}` `.s .rules div{color:var(--ink2); font-size:11.5px;…}` — checklist mật khẩu cũ; mật khẩu nay dùng
`.checks3`) vẫn rơi lên `FourRules`; `home.css` `.s .sec .rules .r` đè bố cục nhưng không đè màu. Việc: xoá khối chết
(grep chắc chắn không còn ai render `.rules` ngoài `FourRules`), sửa chú thích đầu `admin.css` cho đúng. Kiểm: tiêu đề
quy tắc mực 600, dòng dưới `--ink2`, ở `/` và `/about`, 390 + 1280.

**P5 · Tên người mua trên rail tài khoản màu chữ phụ.** `.s .acctrail3 .who span{color:var(--ink2); font-size:…}`
(`account.css:67`) trúng luôn `<span class="txt">` bọc `<b>{name}</b>` (`AccountRail.tsx:91`) → "Trần Minh Anh" ra
`--ink2`; mock là mực (`p1/shopper/account-390-strip1.png`, so `mock/account-390.png`). Việc: quy tắc email/số chỉ
trúng dòng phụ. Kiểm: tên mực 14/600, dòng email 12 `--ink2`, 390 + 1280.

**P6 · Hàng form ghép đôi dính vào hàng trên.** `.row2` (cửa hàng, `checkout.css:263-266`) và `.fgrid` (quản trị,
`admin.css:389-390`) đặt `margin-top:0` cho ô con và bản thân không có khoảng cách trên → nhãn "TỈNH / THÀNH" nằm ngay
dưới ô nhập phía trên (khe 0 so với 14px giữa các ô đơn). Đo: form địa chỉ thanh toán 1280 — ô "Người nhận" đáy 519,
nhãn "Tỉnh / thành" đỉnh 519. Gặp ở: địa chỉ khác ở `/checkout` (390, 1280, cả khách lẫn đã đăng nhập), sổ địa chỉ
`/account/addresses/new`, form sửa địa chỉ trong `/admin/orders/[code]` (`.playwright-cli/shots/admin-order-address-form-1280.png`).
Việc: mọi hàng form liền kề (đơn ↔ đôi ↔ đôi) cách nhau đúng bằng khe giữa hai ô đơn của cùng form. Kiểm: đo khe nhãn ↔
ô trên ở cả ba form, 390 + 1280: đều nhau.

**P7 · Giỏ, điện thoại: cột tiền dính vào "Giữ lại sau".** Cột `.aside3` xếp thẳng dưới danh sách để dành, khe 0 (đo:
đáy `.later` 777 = đỉnh `.aside3` 777), nhãn "MÃ GIẢM GIÁ" 8px dưới nét của món để dành (`cmp/cart-in-390-02-top.png`).
Việc: < 900px, cột tiền cách khối phía trên một nhịp mục (`--s5`, 24px); `/checkout` < 900 giữ khe hiện có giữa panel
cuối và hộp đơn (đo trước, đừng làm lệch). Kiểm: `/cart` 390 có và không có "Giữ lại sau", `/checkout` 390.

**P8 · `/checkout` ≥ 900: cột phải thấp hơn cột trái 14px.** Đỉnh panel "Liên hệ" 219, đỉnh hộp "Đơn gồm…" 233; mock
cả hai 219. Nguyên nhân (đo được): quy tắc v2 `.s details{margin-top:14px; font-size:11.5px}` (`admin.css:22`) rơi lên
`<details class="orderbox3">`. Việc: hộp đơn đầu cột phải không nhận margin đó từ 900px (điện thoại đang cần khe phía
trên — xem P7); không đổi `/faq` và bảng ngày của biểu đồ quản trị. Kiểm: 1280 hai đỉnh bằng nhau; `/faq` trùng ảnh cũ.

**P9 · Nút "Chép" trong cặp khoá–giá trị bị thụt 8px khi xuống dòng.** `.s .kvs dd .btn{margin-left:8px}`
(`checkout.css:474`): khi nút rớt xuống dòng dưới mã vận đơn nó vẫn giữ lề trái 8px (`p2/order-invoice-390.png`,
`p2/order-detail-scroll-1280.png`, `p1/guest/track-found-390-strip1.png`). Việc: mã và nút cách nhau 8px khi cùng dòng,
thẳng mép trái khi xuống dòng (flex-wrap + gap). Kiểm: 390 + 1280, `/account/orders/DH-2422`, `/track?code=DH-2425&phone=0908221447`.

**P10 · Chữ trợ giúp ở `/track` trông như chữ thân.** `TrackScreen.tsx:139` `<p className="help" style={{marginTop:8}}>`
nằm ngoài `.field3` nên không nhận kiểu `.help` của hệ (12px `--ink2`) và mang style inline. Việc: dòng này là dòng trợ
giúp của hệ — 12px `--ink2`, cách hàng ô 8px, không style inline. Kiểm: 390 + 1280.

**P11 · Bấm "Tra cứu" khi để trống không có phản hồi.** `/track`, ô trống → bấm → không gì xảy ra
(`p2/track-empty-submit-1280.png`). Việc: bấm khi thiếu thì hiện lỗi dưới từng ô thiếu, cùng kiểu `.err` của
`Field3` ("Cần mã đơn." / "Cần số điện thoại đã dùng khi đặt."), focus ô thiếu đầu tiên; form GET không script vẫn
chạy như cũ. Kiểm: trống cả hai, thiếu một, đủ cả hai (tra được như cũ).

**P12 · Chữ mồ côi / ngắt dòng xấu.** Đo được:
- lịch ra Số ở chân trang, **mọi trang** ở 390: "… · 2 mẫu hé / lộ", "… · xem / lại" (`.foot3 .cal .st`);
- teaser Số kế tiếp khi là mục thứ hai (h2, trang chủ lúc đang bán) ở 1280: "… công bố đúng lúc / mở." — mock cân dòng;
  `.s h1{text-wrap:balance}` không tới h2 (`home.css:112` `.cover .t`);
- chú thích ảnh hé lộ (figcaption) ở 390: "Áo khoác dù · giá công bố khi / mở";
- câu "Size … chọn sẵn theo “Size ghi nhớ” của thiết bị / này." trên PDP;
- KPI quản trị: liên kết "xử lý / ngay" gãy đôi, "chỉ tính đơn đã thanh / toán".
Việc: `.cover .t` cân dòng như h1; các dòng phụ nhỏ (`.sub`, `.meta`, `.help`, `.fine3`, `figcaption`, `.note3`,
`.foot3 .cal .st`) dùng `text-wrap:pretty`; cụm từ không được tách ("hé lộ", "xem lại", "khi mở") giữ bằng khoảng trắng
không ngắt ở chỗ sinh chuỗi; liên kết trong KPI không gãy. Kiểm: đọc lại đúng các chỗ trên ở 390 + 1280.

**P13 · Danh sách nhiều mẫu gãy giữa tên.** "…S05 – SƯƠNG, S05 – / THAN", "S05 – GIÓ ×1, S05 – / KHÓI ×1" (tài khoản
tổng quan/đơn hàng, bảng đơn quản trị, hàng đợi tổng quan, nhật ký). Chuỗi ghép ở `lib/admin-rows.ts:52`,
`components/account/OrderRow3.tsx:50` và chỗ tương tự (tự grep). Việc: trong danh sách, mỗi mục "S05 – TÊN ×n" là một
khối không gãy (khoảng trắng sau gạch và trước "×" không ngắt); dấu phẩy giữa các mục vẫn ngắt được; tên mẫu cố định
nhiều chữ ("ÁO THUN TAY DÀI") vẫn được xuống dòng giữa các chữ. DESIGN §3 giữ nguyên cho tên đứng một mình. Kiểm:
`/account` 390, `/account/orders` 390, `/admin/orders` 1280, `/admin` 1280.

**P14 · Hồ sơ Số đã đóng.** (a) Đầu bảng "Hết lúc nào": "MẪU" 11px `--ink2` nhưng "ĐÃ BÁN", "HẾT LÚC" 13px mực — đo
được: `.s .solds .r > span:nth-child(n+2)` (0,4,1) thắng `.s .solds .hrow > span` (0,3,1) (`pages.css:94-100`,
`p4/guest/so5-1280-02.png`). Việc: ba nhãn đầu bảng cùng một giọng micro. (b) Câu đề bìa gãy giữa con số: "…108 /" ⏎
"181 chiếc đã bán." (`ClosedIssue.tsx:103`, 390 + 1280). Việc: "108 / 181" không bao giờ tách. Kiểm: đóng tạm Số 05 trên
DB **cục bộ** (xem §4 cách làm và khôi phục), `/so/5` 390 + 1280; `/so/4` không đổi.

**P15 · Sổ địa chỉ trên điện thoại.** Cột thao tác (Sửa · Đặt mặc định · Xoá) bóp địa chỉ còn ~150px và đẩy badge "Công
ty" xuống dòng riêng, hai hàng trông khác nhau (`p1/shopper/account-addresses-390-strip1.png`). Việc: ≤ 460px thao tác
xếp dưới địa chỉ, canh trái, vùng chạm 44 giữ nguyên; > 460 không đổi. Kiểm: 360 + 390 + 1280.

**P16 · Cột "Mã đang chạy" (tài khoản) lởm chởm.** Mỗi hàng `.codes .code` tự tính cột `auto` nên dòng mô tả bắt đầu ở
x khác nhau (DOT05 880, CHAOBAN 909, FREESHIP 904 ở 1280). Việc: ba cột thẳng hàng qua mọi hàng (cột mã chung một bề
rộng — subgrid như `.solds` hoặc tương đương); dòng ghi chú cuối vẫn trải hết. Kiểm: 390 + 1280.

**P17 · Vòng focus bị cắt trong hàng cuộn ngang.** Tab bằng bàn phím: tab họ `.tabs3` mất cạnh trên/dưới của vòng, chip
đầu `.chips3` mất cạnh trái (`focus/sheet.png`); rail tài khoản điện thoại `.acctrail3 nav` cùng cấu trúc (nghi, đo lại).
Việc: vòng focus của phần tử trong ba hàng cuộn này hiện đủ bốn cạnh (vòng vẽ vào trong, hoặc chừa chỗ trong vùng cắt);
không thêm outline nào lúc dùng chuột. Kiểm: Tab tới tab đầu, chip đầu/cuối, mục rail đầu ở 390 và 1280; chạy lại phép
dò "0 outline lúc nghỉ ở chế độ chuột".

**P18 · Câu lỗi email ở đăng ký nói sai.** `lib/account-form.ts:42`: mọi email sai dạng đều ra "Email này thiếu phần sau
dấu chấm." — "khong-hop-le" (không có @) cũng vậy (`p2/signup-errors-390.png`). Việc: dùng câu của thanh toán
"Email chưa đúng định dạng." (`lib/checkout-form.ts:74`); sửa test đi kèm. Kiểm: vitest + ảnh 390.

### C. Quản trị (1280, và 1440 sau P3)

**P19 · Nút của form trong panel không có kiểu.** `.ft` chỉ được tạo kiểu dưới `.sheetwrap .sheetbody .ft`
(`admin.css:501`); trong panel (form Bàn giao `HandoverForm.tsx:124`, form sửa địa chỉ `AddressEditForm.tsx:154`) hai
nút dính nhau (khe 0), canh trái, lệch nhau 4px theo chiều dọc (nút có icon / không icon canh baseline), không có khe
phía trên (`.playwright-cli/shots/admin-order-handover-1280.png`, `admin-order-address-form-1280.png`). Mock
`admin-order.html`: `display:flex; gap:8px; justify-content:flex-end; margin-top:16px`. Việc: như mock, hai nút cùng
đỉnh, cùng cao. Kiểm: mở cả hai form ở `/admin/orders/DH-2429` (Bàn giao) và `/admin/orders/DH-2431` (Sửa địa chỉ).

**P20 · "Bán chạy trong số 05" (tổng quan): tên gãy đôi, thanh lệch.** Mỗi hàng `.rank3 .r` là một lưới riêng
(`20px 36px 1fr 120px auto`, `admin.css:276`): cột `auto` của số đếm ("16 / 31 · 52%" dài hơn "14 / 14 · hết") làm cột
tên co giãn theo từng hàng → "S05 –" ⏎ "KHÓI", thanh bắt đầu ở x 1029/1033/1040. Tên có tiền tố từ lát 11 nên mock (tên
trần) không gặp. Việc: tên một dòng; thanh bắt đầu và kết thúc ở cùng x mọi hàng; số đếm canh phải trong một cột.
Cùng họ lỗi (thanh + số cạnh nhau tự co theo hàng): bảng mẫu của Số trong `/admin/drops` (thanh 812→935 vs 812→952),
cột "Tồn kho" `/admin/products`, cột "Lượt" `/admin/promotions` — sửa cùng một cách. Kiểm: 1280 + 1440, đo x đầu/cuối
thanh mọi hàng.

**P21 · Tổng quan: khoảng trống 66px trong cột trái.** Hai hàng `.split3` canh panel theo hàng, nên khi "Cần xử lý"
ngắn hơn "Bán chạy", cột trái hở 66px trước "Đơn mới nhất" (các khe khác 16px) — tuỳ dữ liệu
(`p1/admin/admin-1280-02.png`, y 237→303). Việc: hai cột độc lập (trái: Cần xử lý, Đơn mới nhất; phải: Bán chạy, Sắp
hết, Khách trong 14 ngày), mọi khe dọc 16px; thứ tự Tab theo cột. Kiểm: 1280 + 1440.

**P22 · Tổng tiền không thẳng cột số của bảng món.** `/admin/orders/[code]`: số cuối bảng món kết thúc ở x=838 (td
padding 12), các dòng Tạm tính/Giảm giá/Phí giao/Tổng kết thúc ở x=834 (padding 16). Việc: một mép phải chung. Kiểm: đo
ở DH-2429, DH-2431.

**P23 · "Liên hệ" trong hồ sơ khách: dòng số/email lệch 8px so với tên.** `.ctagrow .sub{padding-left:36px}`
(`admin.css:407`) → x 920, tên x 928. Việc: dòng phụ thẳng mép chữ của tên (đo, đừng đoán hằng số). Kiểm:
`/admin/customers/c-minhanh`.

**P24 · Tương phản dưới AA trong quản trị.** Liên kết `--brand-text` #9e6817 trên nền màu: "Chi tiết" cuối tổng quan
trên `--plate` 4,12:1; số Số "05" trong hàng đang bán của `/admin/drops` trên `--brand-soft` 4,20:1 (cần 4,5). Việc: liên
kết đặt trên hai nền này dùng `--gold-800`; tính và ghi tỉ lệ. Kiểm: máy dò tương phản 0 chỗ trong quản trị.

**P25 · Dòng phụ trong bảng đơn gãy lẻ ngày.** Cột Thanh toán: "nhận 07:52 ·" ⏎ "23/09", "hạn 08:05 ·" ⏎ "26/09"
(`AdminOrdersScreen.tsx:489,505`; `lib/admin-rows.ts:84`). Việc: cụm giờ · ngày không tách (dòng phụ không xuống dòng
hoặc cụm không ngắt, miễn bảng không tràn ở 1280). Kiểm: `/admin/orders` 1280.

## 4. Tiêu chí nghiệm thu

- `npm run typecheck`, `npm test` xanh (báo số test trước/sau); `npm run build` sạch.
- `tools/layout-sweep.js` chạy lại: 0 tràn ngang, 0 chữ < 11, 0 con trỏ mũi tên, 0 bị cắt; `smallTarget` chỉ còn hai
  miễn trừ nav đã ghi (40×44); `loneButton` chỉ còn hai nút trạng thái rỗng canh trái có chủ ý.
- Ở **1280 và 390, không màn nào đổi ngoài các chỗ §3 nêu** — chụp trước khi sửa (các route trong §1) và sau, so
  từng cặp; nêu mọi khác biệt ngoài §3 trong báo cáo.
- Lớp nổi phải mở khi kiểm: sheet chọn size (thẻ + mẫu cố định), sheet bảng số đo, sheet lọc 390, menu sắp xếp, gợi ý
  tìm, menu tỉnh ở `/checkout` và `/account/addresses/new`, toast (P2), form Bàn giao + Sửa địa chỉ (P19).
- **Đóng tạm Số 05 để kiểm P14 — chỉ DB cục bộ**: ghi lại `closes_at` gốc (`2026-09-29 13:00:00+00`), chạy
  `docker exec supabase_db_e-commerce psql -U postgres -d postgres -c "update public.drops set closes_at = now() - interval '2 hours' where no=5"`,
  chụp xong **khôi phục đúng giá trị gốc** và nói trong báo cáo là đã khôi phục. Không đụng hosted.

## 5. Ảnh cần nộp — `.playwright-cli/shots/v3/polish/`

Mỗi mục một cặp `before-*` / `after-*` (cùng khung, cùng vị trí cuộn):
`p1-pdp-bottom-390`, `p2-toast-{home,pdp,promo,remind}-390`, `p3-home-{1280,1440,1920}`, `p3-admin-{1280,1440,1920}`,
`p4-rules-{home,about}-{390,1280}`, `p5-account-rail-{390,1280}`, `p6-{checkout-address,account-address,admin-address}-{390,1280}`
(quản trị chỉ 1280), `p7-cart-{later,nolater}-390`, `p8-checkout-1280`, `p9-{order-detail,track}-{390,1280}`,
`p10-track-{390,1280}`, `p11-track-errors-{390,1280}`, `p12-{footer-cal-390,teaser-1280,figcaption-390,pdp-remembered-390,admin-kpi-1280}`,
`p13-{account-390,orders-390,admin-orders-1280,admin-queue-1280}`, `p14-so5-closed-{390,1280}`, `p15-addresses-{360,390,1280}`,
`p16-codes-{390,1280}`, `p17-focus-{tabs,chip-first,chip-last,rail}-{390,1280}`, `p18-signup-email-390`,
`p19-{handover,address}-1280`, `p20-{rank,drops,products,promotions}-1280`, `p21-dashboard-{1280,1440}`, `p22-order-sum-1280`,
`p23-customer-1280`, `p25-orders-1280`.

---

## Bổ sung 26/09 — người dùng đã trả lời hai câu (gửi sau khi lát bắt đầu)

Người dùng chọn **"Tinh chỉnh nhẹ"** cho tablet và **"Bỏ số trùng với tab"**. Hai mục dưới thuộc lát này, cùng luật §2
(không đổi token/màu/chữ). Ảnh nộp thêm vào `.playwright-cli/shots/v3/polish/` như §5.

**P26 · Tablet 600–899.98px: tinh chỉnh nhẹ.** Chỉ trong `@media (min-width:600px) and (max-width:899.98px)`:
- lưới thẻ `.grid3` (và `.grid3.four`) **3 cột** `minmax(0,1fr)`; `.grid3.single` giữ một cột 340px;
- ảnh bìa `.cover .photo` (bìa đang bán, bìa Số đã đóng; khi teaser là bìa đầu thì hai ô hé lộ giữ 4:5 như cũ): bỏ tỉ lệ
  1:1, cao **tối đa 60svh**, ảnh `object-fit:cover` như hiện có;
- khung ảnh trang sản phẩm `.gal figure`: cao **tối đa 70svh**, ảnh `object-fit:cover`; vẫn vuốt ngang, chấm và "1 / 2"
  như cũ.
Dưới 600px và từ 900px **không pixel nào đổi** (so ảnh trước/sau ở 390 và 1280). Kiểm: 600, 768, 899 — `/`, `/products`,
`/so/5`, `/products/s05-khoi`, `/products/ao-thun-tron`, `/account/wishlist`; ghi chiều cao ảnh bìa/ảnh sản phẩm đo được
ở 768×1024. Ảnh: `p26-{home,products,pdp,wishlist}-768` trước/sau, `p26-home-{600,899}` sau.

**P27 · Bỏ số đếm trùng với hàng tab ngay dưới tiêu đề.** Luật người dùng: số nào hàng tab đã nói ("Tất cả N" hay số của
một tab) thì dòng dưới tiêu đề không nói lại; dòng còn gì khác thì giữ phần đó, không còn gì thì bỏ dòng. Chỉ đổi đúng
các chỗ sau (các vế giải thích còn lại trên cùng dòng **giữ nguyên** — đang chờ bảng duyệt câu chữ riêng):
- `/account/orders` — `OrdersScreen.tsx:86` "5 đơn" (tab "Tất cả 5") → bỏ cả dòng;
- `/so/N` đang bán — `Listing.tsx:77` "10 mẫu · 73 / 181 còn · đóng sau …" (tab "Tất cả 10") → "73 / 181 còn · đóng sau …";
- `/admin/orders` — `AdminOrdersScreen.tsx:199` "24 đơn trong dữ liệu mẫu · 4 cần xử lý" (tab "Tất cả 24") → "4 cần xử lý";
- `/admin/customers` — `CustomersTable.tsx:119` bỏ vế đầu "8 khách ·" (tab "Tất cả 8"), giữ phần sau;
- `/admin/promotions` — `AdminPromotionsScreen.tsx:147` bỏ vế `{summary} ·` ("3 đang chạy · 2 hết hạn · 1 hết lượt" —
  các tab đã nói), giữ phần sau.
Không đụng `/admin/products` (không tab nào nói 29 hay 18), trang chủ "Trong số này" (không có tab), số trên rail tài khoản.
Sửa test nếu có test khoá chuỗi cũ. Ảnh: `p27-{account-orders-390,so5-1280,admin-orders-1280,admin-customers-1280,admin-promotions-1280}` trước/sau.

---

## Bổ sung 26/09 (2) — P28 · dọn câu giải thích (người dùng đã duyệt từng câu)

Bảng `prototype/v3/copy.html`; người dùng dán kết quả: **đồng ý toàn bộ đề xuất** — 29 xoá, 21 rút gọn, 6 giữ. Luật:
chỉ đổi đúng các câu dưới; câu "giữ" không đụng; chữ mới viết **đúng nguyên văn** dưới đây; bỏ câu thì bỏ luôn phần tử
bọc nó nếu nó trống (khối `.note3` cùng icon, `.meta`, `sub` của `AdminTop`, `help` của `Field3`); sửa test đang khoá
chuỗi cũ (ít nhất `lib/admin-products.test.ts`). Sau khi bỏ, soát lại nhịp: tiêu đề không còn dòng phụ vẫn canh đúng
(AdminTop, `.pghead`, `.sec .hd`, `.panel3 h2`), không để lại khe trống chỗ khối vừa bỏ.

**Cửa hàng**
- K1 `/faq` — `app/faq/page.tsx:41` bỏ meta "chỉ những gì code đang thực thi".
- K2 `/so/N` đã đóng — `app/so/[no]/page.tsx:163-168` bỏ đoạn "Chưa mẫu nào có mốc “hết lúc”: …".
- K3 cùng trang — `app/so/[no]/page.tsx:129` bỏ meta "theo sổ cửa hàng · dữ liệu mẫu".
- K5 trang chủ — `app/page.tsx:406` bỏ "Nhắc lưu trên thiết bị này. Trang chủ hiện lại khi còn 2 giờ tới giờ mở." (toast
  sau khi bấm giữ nguyên).
- K6 trang sản phẩm — `app/products/[slug]/page.tsx:85` và `:129` bỏ meta "{loại}, cùng tầm giá" / "cùng loại, cùng tầm giá".
- K7 `/track` — `TrackScreen.tsx:140` → **"Đúng số đã dùng khi đặt."**
- K8 `/sign-up` — `SignUpScreen.tsx:93` → **"Một email, một mật khẩu."**
- K9 `/returns` — đoạn đầu → **"7 ngày kể từ khi nhận, nếu chưa qua sử dụng."** (bỏ câu "Đây là điều …").
- K10 ba khối `.prep` → giữ tiêu đề đậm + danh sách, bỏ vế cuối:
  `app/about/page.tsx` **"Câu chuyện thương hiệu đang chuẩn bị."** + "Ai làm, làm ở đâu, vì sao bắt đầu.";
  `app/returns/page.tsx` **"Điều kiện chi tiết đang chuẩn bị."** + "Còn tag hay không, ai chịu phí gửi về, mẫu giảm giá có đổi được không.";
  `app/contact/page.tsx` **"Kênh liên hệ đang chuẩn bị."** + "Email, số điện thoại, giờ làm việc, mạng xã hội."
- K11 thanh toán — `CheckoutScreen.tsx:721` bỏ help "In lên phiếu giao và lưu cùng đơn."

**Tài khoản**
- T1 `NotificationsScreen.tsx:103` bỏ khối ghi chú "Gom ba nguồn …".
- T2 bỏ vế "lưu trên thiết bị …" ở năm chỗ: `NotificationsScreen.tsx:86` → "{n} mới"; `NotificationsScreen.tsx:130` bỏ meta;
  `WishlistScreen.tsx:59` bỏ meta, `:82` → "{n} mẫu"; `AccountHome.tsx:230` bỏ meta (Tuỳ chọn); `RecentSearches.tsx:41` bỏ
  meta; `LaterList.tsx:40` → "{n} món". Toast của nút Lưu và nút nhắc giữ nguyên.
- T3 `AccountHome.tsx:241` bỏ dòng mô tả của công tắc "Nhắc giờ mở số mới".
- T4 `AccountHome.tsx:262` → **"Đang chuẩn bị."**
- T7 `ProfileScreen.tsx:27` bỏ meta "tài khoản đang đăng nhập".
- T8 `ProfileScreen.tsx:33` → **"Sửa tên và số điện thoại đang chuẩn bị."**
- T9 `PasswordScreen.tsx:169` bỏ đoạn "Đổi xong, thiết bị này vẫn giữ đăng nhập. …".
- T10 `AddressesScreen.tsx:111` bỏ khối ghi chú cuối sổ; T11 `AddressFormScreen.tsx:256` bỏ khối ghi chú dưới form.
- T12 `WishlistScreen.tsx:64` → **"Bấm “Lưu” ở trang sản phẩm."**
- T13 `WishlistScreen.tsx:103` → **"Mẫu đã hết vẫn nằm trong danh sách."**
- T14 `lib/customer-orders.ts:217` → **"Không có gì để hoàn."**
- T15 `OrderConfirmed.tsx:283-287` → trong tài khoản **"Đơn nằm trong “Đơn hàng” của tài khoản. Email xác nhận đang chuẩn
  bị."**; khách vãng lai cùng luật: **"Tra cứu lại bằng mã đơn và số điện thoại đã đặt. Email xác nhận đang chuẩn bị."**

**Quản trị**
- Q1 `AdminDropsScreen.tsx:124` bỏ sub "Trạng thái suy từ giờ mở …". Q2 `:546` bỏ meta "hiện ở trang chủ từ giờ tới khi mở".
  Q3 `:432` → **"Số này chưa có mẫu nào."**
- Q4 `DropFormModal.tsx:120-124` bỏ sub. Q5 `TeaserFormSheet.tsx:111` bỏ sub.
- Q6 `DashboardScreen.tsx:203` bỏ meta "cột trống = …". Q7 `:213` → **"{n} đơn"**. Q8 `:421-427` bỏ dòng "Dữ liệu mẫu: …
  · Chi tiết" (P24 phần "Chi tiết" không còn đối tượng).
- Q9 `CustomersTable.tsx:119` bỏ phần còn lại của sub → không còn sub. Q10 chú giải nhãn cạnh ô tìm (chuỗi ở
  `lib/customer-tags.ts:189`) bỏ khỏi màn. Q11 `CustomerScreen.tsx:193` bỏ meta "suy từ đơn, không gõ tay".
- Q12 `AdminPromotionsScreen.tsx:147` bỏ phần còn lại → không còn sub. Q13 `:271` bỏ dòng "Hết lượt: …".
  Q14 `PromoFormSheet.tsx:352` bỏ ghi chú "Khách đang thấy mã …".
- Q16 `lib/admin-products.ts:88` → **"{n} mẫu · {m} đang bán"**.
- Q17 `app/admin/products/[id]/page.tsx:71-75` → mẫu của Số **"Số 05 đã cắt 35 chiếc."**; mẫu cố định: không sub.
- Q18 `ProductForm.tsx:760-761` bỏ đoạn dưới lưới tồn kho (cả hai biến thể). Q19 `:809` → **"{màu · màu}."** (bỏ "Thứ tự dải
  màu và ảnh thì đổi được.").
- Q21 `CropSheet.tsx:181` → **"Kéo khung để dời, kéo góc để đổi cỡ."**
- Q22 `AdminOrderScreen.tsx:512` → **"{Chuyển khoản} · đối chiếu tay · {tổng}"**.
- Q23 `CancelOrderModal.tsx:83` (đơn đã thanh toán) → **"Đơn đã thanh toán {tổng}. Huỷ thì phải hoàn tiền tay."** rồi giữ
  " Khách thấy lý do ở màn đơn của họ. Hàng về kệ ngay."; biến thể chưa thanh toán không đổi.
- Q24 `HandoverForm.tsx:77` bỏ help dưới ô Hình thức giao (help dưới ô Mã vận đơn giữ).
- Q26 `AddressEditForm.tsx:138` → **"Chỉ sửa được trước khi bàn giao."**
- Q27 `AdminOrderScreen.tsx:365` dòng giao hàng trong "Giao tới" chỉ còn nhãn hình thức ("Giao tiêu chuẩn · 2–4 ngày");
  không sửa `lib/shipping.ts` (thanh toán còn dùng `note`).
- Q28 `SlipScreen.tsx:60` → **"{mã · mã} · {n} phiếu"**. Q29 `SlipScreen.tsx:183-…` bỏ đoạn cuối trang.
- Q30 `ActivityLogScreen.tsx:110` bỏ sub.

Ảnh: `p28-{faq,so5-closed,home-teaser,pdp-related,track,signup,returns,about,contact,checkout-note}-{390,1280}` (chỉ những
chỗ đổi), `p28-account-{home,notifications,profile,password,addresses,address-new,wishlist,wishlist-empty,order-cancelled,confirmed}-390`,
`p28-admin-{drops,drop06,dashboard,customers,customer,promotions,products,product-edit,product-edit-fixed,order-awaiting,slips,log}-1280`
và các sheet `p28-sheet-{create-drop,teaser,promo,crop,cancel-paid}-1280`, form `p28-form-{handover,address}-1280` — mỗi cái chỉ cần
bản `after-`.

---

## Bổ sung 26/09 (3) — sau lượt duyệt của phiên chính: P29–P36

Phiên chính đã duyệt P1–P28 (ảnh chụp lại của phiên chính + ảnh `after-*`): đạt. Còn các việc dưới, gồm bốn câu agent
hỏi ở mục 6 của báo cáo (đã quyết) và bốn chỗ phiên chính thấy thêm. **Máy đang thiếu RAM** (một lượt chụp nền của phiên
chính đã bị hệ thống dừng): chỉ chụp đúng các ảnh liệt kê, không chạy lại bộ so 81 cặp; `tools/layout-sweep.js` chạy
**một lần** ở cuối.

- **P29 · Chip "Nhãn" bị ẩn từ 900px** (agent tìm, phiên chính xác nhận ở `p1/…/account-addresses-new-1280` — có từ
  trước lát này): `.s .chips3:not(.wrapped){display:none}` (listing.css) ẩn nhóm chip nhãn ở `/account/addresses/new`
  (và chỗ sửa `?edit=`), nên không chọn được nhãn trên desktop. Thêm `wrapped` cho nhóm chip nhãn ở
  `AddressFormScreen.tsx` và `CheckoutScreen.tsx` (checkout đang hiện nhờ `.addrform .chips3`, thêm để hai chỗ cùng một
  luật). Kiểm: 1280 thấy ba chip, bấm đổi được, lưu đúng nhãn; 390 không đổi pixel.
- **P30 · Khoảng ngày gãy sau gạch** — `lib/datetime.ts` `DASH = " – "` → `" –⁠ "` (LB12a, như
  `styleInList`), thêm test. Kiểm: "nhận 20/09 – 22/09" ở trang xác nhận đơn 390 không tách.
- **P31 · CSV không mang ký tự dàn chữ** — `lib/csv.ts` `field()`: bỏ U+2060, đổi U+00A0 thành khoảng trắng thường
  trước khi ghi; thêm test (tên "S05 – KHÓI ×1", số điện thoại "0912 345 678"). Chuỗi trên màn không đổi.
- **P32 · Bỏ `sampleAccounts()`** (`lib/admin-customers.ts`) và test của nó — không còn nơi gọi.
- **P33 · Tên lựa chọn ở thanh toán không gãy trong cụm**: "Giao nhanh nội thành · 24 / giờ" và "Thanh toán khi nhận /
  (COD)" ở 360 (`p3/…/checkout-in-360`). Giữ "24 giờ" và "nhận (COD)" liền bằng khoảng trắng không ngắt ở chỗ sinh chuỗi
  (`lib/shipping.ts:87` label, `CheckoutScreen.tsx:849`); kiểm các nơi khác in cùng label (chân trang, FAQ, trang sản
  phẩm) không đổi dáng. Kiểm: 360 + 390.
- **P34 · Tên màu gãy đôi trong bảng quản trị**: "Trắng · Xanh / than" (`/admin/products?drop=5`, cột Màu). Mỗi tên màu
  một khối không gãy khi ghép danh sách màu trong ô bảng (`ProductsTable.tsx:376,466`), dấu " · " giữa các màu vẫn ngắt
  được. Kiểm: 1280.
- **P35 · Chú thích QR trên phiếu giao mồ côi**: "QR tra cứu đơn · / chờ" (`SlipScreen.tsx:131`). Giữ "· chờ" dính chữ
  trước. Kiểm: `/admin/slips?codes=DH-2429` 1280.
- **P36 · Dòng phụ sheet "Tạo mã" viết thường đầu câu**: khi tạo mới (không có `standing`) dòng phụ bắt đầu "đổi điều
  kiện…" (`PromoFormSheet.tsx:183`). Viết hoa chữ đầu khi đứng đầu câu; câu giữ nguyên (người dùng chọn Giữ ở Q15). Kiểm:
  sheet Tạo mã và Sửa mã 1280.

Ảnh `after-p29-…` đến `after-p36-…` theo đúng các chỗ "Kiểm" ở trên (P29 thêm `before-`).

---

## Bổ sung 26/09 (4) — P37 · câu chữ vòng 2 (người dùng đã duyệt)

Bảng `prototype/v3/copy.html` vòng 2; người dùng **nhận hết đề xuất**. Cùng luật P28: chữ mới đúng nguyên văn, bỏ câu
thì bỏ luôn phần tử bọc nó nếu trống, sửa test đang khoá chuỗi cũ, soát lại nhịp sau khi bỏ. Câu "giữ" (V6, V7, V14)
không đụng.

- **V1** `lib/lookup.ts:169,203` — bỏ hẳn phần nối `· ${HAND_UPDATED}` vào mốc "Đang trên đường giao" (mốc còn
  "09:15 · 21/09 · mã vận đơn VNP-8842204"); xoá hằng `HAND_UPDATED`; test `lib/lookup.test.ts:174-177` ("says out loud
  that the courier feed is not connected") đổi thành kiểm mốc **không** còn câu đó.
- **V2** `lib/invoice.ts:63-65` → **"Bản in dành cho người mua, không phải hoá đơn giá trị gia tăng."** (test
  `lib/invoice.test.ts:81` vẫn đúng).
- **V3** `ProfileScreen.tsx:68` → **"Đang chuẩn bị."**
- **V4** `ProfileScreen.tsx:76-77` → **"Xoá hồ sơ và sổ địa chỉ. Đơn đã đặt vẫn được giữ. Đang chuẩn bị."**
- **V5** `NotificationsScreen.tsx:125` — công tắc "Giờ mở số mới" không còn dòng mô tả khi có Số sắp mở (`detail` của
  `SourceRow` thành tuỳ chọn như `PrefRow`); nhánh "Chưa có số nào sắp mở." giữ nguyên.
- **V8** `AddressFormScreen.tsx:77` — bỏ meta "lưu vào tài khoản" (cả Thêm lẫn Sửa).
- **V9** `OrderConfirmed.tsx:175` → **"Đang chuẩn bị. Liên kết:"** rồi liên kết và nút "Chép liên kết" như cũ.
- **V10** `TeaserFormSheet.tsx:162` — bỏ help dưới lưới ảnh.
- **V11** `AdminDropsScreen.tsx:284` — bỏ câu cuối "Cùng một cơ chế, không phải một trạng thái thứ tư."; hai câu trước giữ.
- **V12** `InventoryAdjustSheet.tsx:149-158` — mẫu thuộc Số → **"Tăng quá {cutUnits} chiếc đã cắt thì bị chặn."**; mẫu cố
  định: nhánh này chỉ gồm đúng phần người dùng vừa bỏ (định nghĩa số + khi nào chỉnh), nên **không còn dòng phụ**.
- **V13** `ProductPhotoSlot.tsx:163-165` → badge "mượn tạm" + **"ảnh của mẫu {tên}"**, bỏ "· thay bằng ảnh thật khi có";
  không có tên thì chỉ còn badge.

Ảnh `after-p37-{track-timeline-390,invoice-print-1280,profile-390,notifications-390,address-new-1280,confirmed-390}` và
`after-p37-{sheet-teaser,sheet-close,sheet-adjust-issue,sheet-adjust-fixed,product-edit-photos}-1280`.
