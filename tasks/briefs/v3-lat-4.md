# Brief lát 4 · v3 — tài khoản, đơn của tôi, thông báo, đã lưu, đăng nhập, trang nội dung, sổ Số

Phiên chính viết 22/09/2026, giao sau khi lát 3 ĐẠT. Agent `ui-implementer` thực thi; phiên chính
duyệt lại độc lập. Mock: `prototype/v3/account.html`, `account-orders.html`,
`account-notifications.html`, `account-saved.html`, `auth.html`, `pages.html` (năm route xếp
chồng), `so.html`; CSS ở `v3-pages.css` (`.acct3 .acctrail3 .panel3 .acctgrid3 .rows3 .codes
.prefrow .thumbs3 .notif .authcard3 .divider3 .forgot .prose .prep .faq3 .nf .solds .tl3
.deadline .kvs .ol .sum3 .tabs3 .empty3`), `v3.css` (`.cover.shut`, `.past`, `.card3`), `v3.js`.
Ảnh nộp vào `.playwright-cli/shots/v3/lat4/`.

## 1. Màn / phạm vi

| Route | Việc | Mock |
|---|---|---|
| `/account` (+ `AccountLayout`, `AccountRail`, `AccountHome`) | Khung `.acct3` (rail 240 dính desktop, nav cuộn ngang điện thoại) + Tổng quan: bốn panel + Tuỳ chọn | `account.html` |
| `/account/orders`, `/account/orders/[code]` (`OrdersScreen`, `OrderDetailScreen`) | Danh sách `.rows3` + tab; chi tiết mở **dưới danh sách** ở `/account/orders/[code]` (cùng trang, hàng đang mở `.on`, "Đóng chi tiết" → `/account/orders`); **khách tự huỷ đơn chưa thanh toán** (người dùng chốt 22/09) | `account-orders.html` |
| `/account/orders/[code]/tracking` | Gộp vào chi tiết (hành trình nằm trong chi tiết); route cũ chuyển hướng tới `/account/orders/[code]` | — |
| **`/account/notifications`** (mới) | Mục Thông báo tính từ thiết bị: ba nhóm thời gian, đã đọc/chưa, "Đánh dấu đã đọc", ba công tắc | `account-notifications.html` |
| `/account/wishlist` (`WishlistScreen`) | "Đã lưu": lưới `.card3` + sheet size chọn sẵn size ghi nhớ | `account-saved.html` |
| `/account/addresses`, `/account/addresses/new`, `/account/profile`, `/account/password` | Giữ nội dung và logic v2, đổi sang khung v3 (rail, `.pghead`, `.panel3`, `.inp3`, `.btn`) — mock không vẽ | — |
| `/sign-in`, `/sign-up`, `/forgot-password` | `.authcard3` | `auth.html` |
| `/about`, `/faq`, `/returns`, `/contact`, `not-found` | `.prose` + `.prep`, `.faq3`, `.nf` | `pages.html` |
| **`/so/[no]`** (mới, tính năng "Sổ tay các số") | Bìa đã đóng (dùng lại bìa CLOSED của lát 1) + bảng "Hết lúc nào" + lưới sold + dòng các số đã đóng; **`/?drop=N` với N đã đóng chuyển hướng tới `/so/N`**; mọi liên kết "xem lại"/"Số 04" (chân trang, `.listend`, dòng past, 404, thông báo) trỏ `/so/N` | `so.html` |
| Dùng chung | `lib/notifications.ts` (mới), `lib/wishlist.ts` (thêm mốc lưu, đọc tha thứ), `lib/prefs.ts` (thêm công tắc email/mã), `lib/sold-out-times.ts` (mới, "hết lúc nào" suy từ đơn), huỷ đơn phía khách ghi vào kho mô phỏng chung với quản trị | |

Giữ logic v2: phiên mô phỏng (`AccountGuard` chuyển tới `/sign-in`), `orderRows/rowsForTab`
(đơn fixture + đơn trên thiết bị), `orderTimeline/deviceTimeline`, `refundNote`, wishlist,
reminders, prefs, sổ địa chỉ. Không backend, không phụ thuộc mới.

## 2. Quyết định đã chốt

**Khung tài khoản `.acct3`** — điện thoại: `.who` (avatar 44 tròn vải đen chữ mật ong Unbounded
13, tên 14 600, dòng "email · số" 12 chữ phụ U+00A0) viền dưới mực; nav cuộn ngang tràn lề
(`margin:0 -18px; padding:0 18px`), mục 44 cao icon 15 + nhãn 13 + đếm 11, mục đang mở đậm gạch
mật ong; "Đăng xuất" `.lnk.tap`. Desktop ≥900: lưới `240px 1fr` gap 48, rail dính `top:84`, nav
dọc mỗi mục viền dưới hairline, đếm căn phải. Mục: Tổng quan (`user`), Đơn hàng (`bag`, đếm
tổng đơn), Thông báo (`bell`, chấm mật ong 8px khi có chưa đọc + đếm chưa đọc), Đã lưu (`heart`,
đếm), Địa chỉ (`pin`, đếm), Hồ sơ (`edit`). `.pghead` mỗi màn `padding-top:0`.

**Tổng quan `/account`** — h1 "Tổng quan" + meta "Số 05 đang bán · đóng sau 5 ngày 1 giờ";
`.note3` "Đăng nhập mô phỏng, chưa có máy chủ. Đơn đặt trên thiết bị này hiện trong Đơn hàng
với nhãn "lưu trên thiết bị này"."; `.acctgrid3` (một cột; hai cột ≥900, `.full` chiếm cả hàng):
- **Đơn gần nhất** (`.more` "Xem cả 4"): 3 `.rows3 .row` mới nhất từ `orderRows` (mã Unbounded
  13 600, sub "18:50 · 20/09 · lưu trên thiết bị này · KHÓI, BỤI" hoặc "12/06 · Số 04 · SÓNG,
  TRO", phải: badge B trạng thái + tổng 12px chữ phụ) → `/account/orders/[code]`.
- **Mã đang chạy** (meta "trong số 05"): `.codes .code` mỗi mã: mã Unbounded 13, mô tả từ
  `lib/promotions.ts` ("−10%, tối đa 150.000₫ · đơn từ 500.000₫", "· còn 82 lượt" chỉ khi mã có
  giới hạn), nút "Chép" `.btn.outline.sm`; `.fine3` "Mã hết hạn 20:00 · 25/09 cùng số 05." Không
  mã nào đang chạy → panel ẩn.
- **Thông báo mới** (`.more` "Xem cả"): 2 chưa đọc mới nhất từ `lib/notifications.ts` (dạng
  `.notif`: chấm mật ong 8px, tiêu đề 13 600, dòng 12 chữ phụ, `time` 11px phải "18:50"/"hôm
  nay"/"19/09"). Không có → "Không có gì mới." 12px chữ phụ.
- **Đã lưu** (`.more` "Xem cả 2"): 2 `.row` (tên Unbounded, sub "còn 3 · hết S · 1.450.000₫"
  với "còn 3" đỏ khi < 4, phải `.thumbs3` ảnh 36×45) → PDP. Trống → panel ẩn.
- **Tuỳ chọn** (`.full`, meta "lưu trên thiết bị này"): `.prefrow` 52+ với công tắc `.switch3`:
  "Nhắc giờ mở số mới / Hiện dải nhắc ở trang chủ khi còn 2 giờ, và một thông báo ở đây." (=
  `toggleReminder` cho Số sắp mở; không có Số sắp mở → dòng ghi "Chưa có số nào sắp mở", công
  tắc ẩn); "Email khi đơn đổi trạng thái / Đã thanh toán, đã bàn giao, đã giao. Gửi thư cần máy
  chủ, đang chuẩn bị." (pref `emailOnStatus`, chỉ lưu); "Size ghi nhớ · M / Chọn sẵn size M ở
  trang sản phẩm và sheet chọn size." (tắt = xoá `prefs.size`; chưa có size → "Chưa ghi nhớ size
  nào — bật ở trang sản phẩm", không công tắc); "Đã mua / Số 05 · 2 đơn · Số 04 · 1 đơn · Số 03 ·
  1 đơn" (đếm đơn không huỷ theo Số từ `orderRows`; không công tắc, không viền dưới).

**Đơn hàng `/account/orders`** — h1 "Đơn hàng" + meta "4 đơn · 2 chờ chuyển khoản" (đếm theo
trạng thái); `.tabs3` (giữ khoá `ORDER_TABS` v2, nhãn: Tất cả · Chờ thanh toán · Đã giao · Đã
huỷ, đếm; URL `?tab=`); `.rows3 .row` lưới `1fr auto` ≥56: mã (+ `.badge.flat` chữ phụ "lưu trên
thiết bị này" cho đơn trên thiết bị), sub "18:50 · 20/09 · KHÓI ×1, BỤI ×1 · giữ hàng tới 06:50
21/09" / "12/06 · Số 04 · SÓNG ×1, TRO ×1 · giao 16/06", phải badge B + tổng, hàng thứ ba
`.thumbs3` ảnh các món; hàng đang mở `.on` nền tấm nhạt. Trống → `.empty3` "Chưa có đơn nào" +
nút "Xem số 05". Tab trống → "Không có đơn nào ở mục này." 12px.

**Chi tiết `/account/orders/[code]`** (danh sách ở trên, chi tiết `.sec` ở dưới, cuộn tới
`#DH-2430` khi vào): `.hd` h2 mã (Unbounded 18/21) + meta "19:50 · 19/09 · chờ chuyển khoản" +
`.more` "Đóng chi tiết" (→ `/account/orders`). Chờ chuyển khoản: `.deadline` (vải đen may đứt
nét): "Giữ hàng tới 19:50 · 21/09", đồng hồ d/h/m (`role=timer`, cập nhật mỗi phút), p "Chuyển
khoản 2.680.000₫ với nội dung DH-2430. Quá giờ, đơn tự huỷ và hai chiếc này về kệ." + hai nút
"Chép" (số tiền, nội dung) chữ mật ong viền `--stage-ink2` nền trong (`.btn.outline.sm` biến
thể trên vải đen); quá hạn → `.late` "Đã quá giờ giữ hàng · đơn huỷ" và trạng thái Đã huỷ.
`.two3`: trái `.panel3` "Hành trình" `.tl3` (bước theo `orderTimeline`/`deviceTimeline`; mốc chờ
chuyển khoản không có liên kết vì nội dung đã ở khối trên); phải `.panel3` "2 món" (`.ol` +
`.sum3`), `.panel3` "Giao tới" `.kvs` (Người nhận, Địa chỉ, Cách giao, Thanh toán, Mã vận đơn +
Chép khi có, Ghi chú nếu có), nút "Tải hoá đơn" `.btn.outline` icon `printer` (`lib/invoice.ts`
của lát 3, `@media print` chỉ in `.invoice`), **"Huỷ đơn này"** `.btn.quiet` **chỉ khi đơn chưa
thanh toán** (chờ chuyển khoản, hoặc COD/thẻ chưa bàn giao): mở sheet xác nhận (`.sheetwrap`:
"Huỷ đơn DH-2430? / Hai chiếc về kệ ngay. Không hoàn tác." + "Giữ đơn" outline + "Huỷ đơn" mật
ong) → đơn trên thiết bị: ghi `cancelledAt` + `cancelReason:"customer"` vào `brand.orders` (đọc
tha thứ bản cũ); đơn fixture: ghi vào **kho mô phỏng dùng chung với quản trị** (`lib/admin-sim.ts`,
cùng khoá, cùng hình dạng ghi đè trạng thái + dòng nhật ký "Khách huỷ đơn") để `/admin/orders`
thấy "Đã huỷ · khách huỷ"; sau huỷ: toast "Đã huỷ DH-2430 · hai chiếc về kệ", badge "Đã huỷ",
tồn kho mô phỏng cộng lại nếu v2 đã trừ khi đặt; `refundNote` giữ. Đơn đã thanh toán/đang
giao: không nút, dòng 12px "Đơn đã thanh toán: liên hệ cửa hàng để huỷ." + liên kết `/contact`.

**Thông báo `/account/notifications`** — h1 + meta "2 mới · lưu trên thiết bị này" + nút
"Đánh dấu đã đọc" `.btn.quiet` (ẩn khi 0 chưa đọc); `.note3` (icon `info` bulk) "Gom ba nguồn
đang có: nhắc giờ mở, trạng thái đơn, mã sắp hết hạn. Không có máy chủ đẩy: mục này tính từ
đồng hồ và kho trên thiết bị mỗi lần mở, nên không có "thông báo" nào bịa."; nhóm `.sec`
"Hôm nay" (meta ngày) / "Tuần này" / "Cũ hơn" (ẩn nhóm trống); `.notif` lưới `12px 1fr auto`:
chấm mật ong (đã đọc: hairline), tiêu đề 600 (đã đọc 500), dòng 12 chữ phụ, `.act .lnk` 36
(lớp phủ 44), `time` 11px. **Nguồn (`lib/notifications.ts`, thuần, có test)**: (1) đơn chờ chuyển
khoản của khách đang đăng nhập + đơn trên thiết bị → "DH-2432 chờ chuyển khoản / Giữ hàng tới
06:50 · 21/09. Số tiền 1.152.000₫, nội dung DH-2432." + "Xem đơn" → chi tiết; (2) nhắc đã đặt
(`brand.reminder`) → "Số 06 mở 20:00 thứ Sáu 02/10 / Nhắc đã đặt. Trang chủ hiện dải nhắc khi
còn 2 giờ; hai mẫu SỎI và NGÓI đã hé lộ." + "Xem số 06" → `/#next`; (3) mã sắp hết hạn (≤ 5
ngày; công tắc "Mã sắp hết hạn" mặc định tắt) → "Mã DOT05 còn 5 ngày / …"; (4) đơn đã giao →
"DH-2310 đã giao / Nhận lúc 10:20 · 16/06. Đổi trả trong 7 ngày nếu chưa qua sử dụng, tới
23/06."; (5) Số đã đóng → "Số 04 đã đóng / 200 / 200 chiếc đã bán · 19/06." + "Xem lại số 04" →
`/so/4`. Mỗi mục có `id` ổn định (nguồn + mã + mốc); đã đọc lưu ở `brand.notif.read` (mảng id);
chưa đọc = chưa có trong mảng và mốc ≤ hôm nay. `.panel3` "Nhận thông báo về" (meta "lưu trên
thiết bị này"): ba `.prefrow` công tắc "Giờ mở số mới" (= nhắc), "Trạng thái đơn" (mặc định
bật), "Mã sắp hết hạn" (mặc định tắt) — tắt nguồn nào thì mục đó không tính. Đếm chưa đọc lên
rail và chuông nav (`data-wish` không đổi; chuông trên nav cửa hàng: giữ nút tim/túi như lát 0,
không thêm chuông).

**Đã lưu `/account/wishlist`** — h1 "Đã lưu" + meta "2 mẫu · lưu trên thiết bị này"; `.grid3`
`ProductCard` với dòng đếm "còn 12 · lưu 15/09" (mốc lưu: mở rộng `brand.wishlist` thành `{id,
at}`; bản cũ chỉ id → không in mốc); mẫu hết giữ SOLD OUT + "Xem chi tiết"; nút thẻ mở
`SizeSheet` với size ghi nhớ chọn sẵn + `.fine3` "Size M chọn sẵn theo "Size ghi nhớ" của thiết
bị này."; `.fine3` cuối "Mẫu đã hết vẫn nằm trong danh sách với dấu SOLD OUT, để dõi số sau. Mẫu
trong "Giữ lại sau" của giỏ là một danh sách khác: có size, đưa lại vào giỏ được ngay."; nút
bỏ lưu trên thẻ (tim Bulk góc ảnh, 44) như v2. Trống → `.empty3` "Chưa lưu mẫu nào" + "Xem số 05".

**Địa chỉ, Hồ sơ, Mật khẩu** — nội dung/logic v2, hình v3: `.pghead`, `.panel3`, `.rows3` cho sổ
địa chỉ (mặc định = `.badge.flat` "Mặc định"), form `.field .lbl .inp3` + `Select` `.selbtn3`
hai cấp, nút `.btn`/`.btn.outline`; không xưng hô.

**Đăng nhập / Đăng ký / Quên mật khẩu** — `.authcard3` (max 460, giữa; ≥900 viền hairline bo 4
padding 28): h1 Unbounded 24/28, `.lead` 13 chữ phụ; đăng nhập: `.note3` "Chưa có máy chủ xác
thực. Dùng email của một khách trong dữ liệu mẫu với mật khẩu bất kỳ. Không nhập mật khẩu
thật.", Email, Mật khẩu, `.forgot` phải "Quên mật khẩu", nút "Đăng nhập" mật ong icon `login`,
`.divider3` "hoặc", nút "Tiếp tục với Google · đang chuẩn bị" **vô hiệu** (không có nhà cung
cấp; nút vô hiệu ghi việc cần làm, không icon), `.alt` "Chưa có tài khoản? Đăng ký · Mua không
cần tài khoản" (→ `/cart`); lỗi đăng nhập `.err` từ `signInResult`; đăng ký: Tên, Email (lỗi
`.err` + icon `danger` như mock "Email thiếu phần sau dấu chấm, ví dụ minhanh@vidu.vn"), Mật khẩu
(`.opt` "· từ 8 ký tự"), `.consent` "Nhận email khi số mới mở và khi đơn đổi trạng thái. Tắt
được trong tài khoản." (= pref), "Tạo tài khoản" (logic v2 mô phỏng), `.alt` "Đã có tài khoản?
Đăng nhập"; quên: Email + "Gửi liên kết đặt lại" → thông báo mô phỏng v2 ("đã ghi nhận · chưa
có máy chủ gửi thư", không nói "đã gửi").

**Trang nội dung** — `.wrap` max 960; `/about`: h1 "Giới thiệu", `.prose` p "BRAND bán streetwear
unisex theo số: mỗi số mở đúng giờ, mỗi mẫu cắt đúng một lần, hết là hết." (câu này đổi cùng
giọng khi người dùng chốt câu đề bìa — lấy từ `lib/lexicon.ts` `ABOUT_LEAD`), `.prep` (khung
đứt nét nền tấm: "**Câu chuyện thương hiệu đang chuẩn bị.** Ai làm, làm ở đâu, vì sao bắt đầu:
phần này để trống cho tới khi có lời thật, không điền tạm."), h2 "Bốn quy tắc" + `.rules` như
trang chủ (dùng chung `FourRules`); `/faq`: h1 + meta "chỉ những gì code đang thực thi", `.faq3`
`details/summary` (52+, icon `down` 15 xoay 180° khi mở; mục đầu mở sẵn), năm câu đúng mock với
số từ `lib/shipping.ts`; `/returns`: p đậm "7 ngày kể từ khi nhận, nếu chưa qua sử dụng." +
"Đây là điều thanh toán và trang sản phẩm đang cam kết." + `.prep` "Điều kiện chi tiết đang
chuẩn bị…"; `/contact`: p với liên kết "tra cứu đơn" (→ `/track`) và "câu hỏi thường gặp" +
`.prep` "Kênh liên hệ đang chuẩn bị…"; `not-found`: `.nf` số "404" Unbounded 96/168 mực, h1
"Trang này không có.", p "Liên kết có thể thuộc một số đã đóng, hoặc gõ sai. Số 05 đang bán còn
5 ngày." (trạng thái từ `featuredDrop`), nút "Xem số 05" mật ong + "Các số đã đóng" outline
(→ `/so/4`, số đã đóng gần nhất).

**Sổ Số `/so/[no]`** — chỉ Số đã đóng (Số đang bán/sắp mở → chuyển hướng `/` hoặc `/?drop=`);
bìa CLOSED của lát 1 (ảnh mẫu đầu, h1 "Sáu mẫu. 200 / 200 chiếc đã bán.", câu dẫn, nút "Xem số
05 đang bán" + "Về số 03" → `/so/3`); `.sec` "Hết lúc nào" (meta "suy từ đơn đã thanh toán · dữ
liệu mô phỏng"): `.solds` lưới `1fr auto auto` subgrid, đầu bảng 11px hoa viền mực, mỗi dòng
tên Unbounded 13 + "· áo thun in lưng · 430.000₫" chữ phụ, "8 / 8", "14:20 · 06/06" (thời điểm
đơn đã thanh toán lấy chiếc cuối, `lib/sold-out-times.ts`; không suy được → "—" và chú thích
"không đủ dữ liệu đơn"; chiếc cuối bán đúng giờ đóng → "· giờ đóng"); `.sec` "Sáu mẫu của số 04"
(meta "tất cả đã hết") lưới sold; `.past` "Các số đã đóng: **04** · 03" + liên kết "Số 03 · 5 mẫu ·
20/03" → `/so/3`. Tiêu đề trang "Số 04 · đã đóng". `/?drop=4` → `redirect("/so/4")`; liên kết
"xem lại" ở chân trang, `.listend`, dòng past trang chủ, 404, thông báo → `/so/N`.

**Chung**: vải đen chỉ ở nav, badge, avatar, `.deadline`, bìa đã đóng; từ "Số" từ lexicon; giọng
không xưng hô ("Đơn hàng", không "Đơn hàng của tôi"); số từ dữ liệu; vùng chạm 44 đo nghiêm
(nav rail, hàng đơn, công tắc 46, Chép, liên kết trong thông báo); sàn 11px; U+00A0.

## 3. Lỗi kèm

Không có lỗi L. Sửa nền: (a) "Đơn hàng của tôi", "Yêu thích", "của bạn" → "Đơn hàng", "Đã lưu",
không xưng hô; (b) mọi liên kết tới Số đã đóng → `/so/N`; (c) route tracking cũ chuyển hướng.

## 4. Nghiệm thu (preview 3200, 390 và 1280, phiên `c-minhanh` + một đơn đặt trên thiết bị)

1. `/account`: rail đúng (đếm đơn, chấm + đếm thông báo, đếm đã lưu, địa chỉ), bốn panel + Tuỳ
   chọn với công tắc hoạt động (bật nhắc → thông báo mới xuất hiện; tắt size ghi nhớ → PDP không
   chọn sẵn), Chép mã.
2. `/account/orders`: tab đổi URL và đếm; hàng đơn trên thiết bị có nhãn; bấm hàng →
   `/account/orders/DH-2430` hiện chi tiết dưới danh sách, đồng hồ chạy, Chép, hành trình, "Huỷ
   đơn này" → sheet → huỷ → badge Đã huỷ + toast + `/admin/orders` thấy "Đã huỷ"; đơn đã giao
   không có nút huỷ; "Tải hoá đơn" mở print; "Đóng chi tiết".
3. `/account/notifications`: nhóm đúng, chưa đọc có chấm, "Đánh dấu đã đọc" xoá chấm và đếm
   trên rail; ba công tắc lọc nguồn; liên kết đúng đích.
4. `/account/wishlist`: thẻ, mốc lưu, SOLD OUT, sheet size chọn sẵn size ghi nhớ, bỏ lưu.
5. `/account/addresses` (+ `/new`), `/account/profile`, `/account/password`: khung v3, form hoạt
   động như v2.
6. `/sign-in` (lỗi sai email, đăng nhập đúng → `/account`), `/sign-up` (lỗi email), `/forgot-password`.
7. `/about`, `/faq` (mở/đóng), `/returns`, `/contact`, `/khong-ton-tai` (404).
8. `/so/4`: bìa, bảng hết lúc nào, lưới sold, dòng past; `/?drop=4` chuyển hướng; `/so/5` chuyển
   hướng `/`.
9. typecheck, test (thêm test `lib/notifications.ts`, `lib/sold-out-times.ts`, huỷ đơn, wishlist
   mốc lưu), build, sweep 0 tràn 0 lỗi, sàn 11px, vùng chạm 44; 0 "đợt"; 0 "của bạn/của tôi";
   0 yêu cầu mạng.

## 5. Ảnh nộp (`.playwright-cli/shots/v3/lat4/`)

`account-390.png`, `account-1280.png`, `orders-390.png`, `orders-1280.png`, `order-detail-390.png`,
`order-detail-1280.png`, `order-cancel-sheet-390.png`, `order-cancelled-390.png`,
`notifications-390.png`, `notifications-1280.png`, `wishlist-390.png`, `wishlist-sheet-390.png`,
`addresses-1280.png`, `profile-390.png`, `signin-390.png`, `signin-1280.png`, `signup-error-390.png`,
`forgot-390.png`, `about-390.png`, `faq-1280.png`, `returns-390.png`, `contact-390.png`, `404-390.png`,
`so-390-1.png`, `so-390-2.png`, `so-1280.png`.

Đọc trước: `AGENTS.md`, docs Next trong `node_modules/next/dist/docs/` (`redirect`, `generateMetadata`,
route động), `DESIGN.md` (v2, thua brief chỗ khác nhau), `PRODUCT.md`, `craft-floor.md`,
`impeccable context --target app/account/page.tsx`. Không sửa `prototype/`, `tasks/`, `DESIGN.md`.
Báo cáo sáu mục; để server 3200 chạy.
