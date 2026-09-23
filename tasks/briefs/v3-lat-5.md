# Brief lát 5 · v3 — khu quản trị (9 màn) + nhật ký thao tác

Phiên chính viết 22/09/2026, giao sau khi lát 4 ĐẠT. Agent `ui-implementer` thực thi; phiên chính
duyệt lại độc lập. Mock: `prototype/v3/admin-dashboard.html`, `admin-orders.html`, `admin-order.html`,
`admin-so.html`, `admin-promotions.html`, `admin-products.html`, `admin-customers.html`,
`admin-log.html`, `admin-slips.html`; CSS ở `v3-pages.css` (khối ADMIN: `.s.adm3 .side .simbar
.main .top .seg3 .kpis3 .kpi3 .panel3 .split3 .chart3 .axis .queue3 .rank3 .dt3 .bar .stabs .cb
.rowmenu .foot .avatar .nextstep .fgrid .totalbar .addrblock .notes3 .invgrid .delta .log3 .ctag
.slips .slip` + `@media print`, `.sheetwrap .panel.wide .ft .title .sub`, `.menu3`), `v3.js`
(`adminNavHtml`, `.cb` chọn dòng + thanh hàng loạt, `[data-menu]`, `[data-simreset]`, `bumpSim`).
Quản trị **chỉ desktop** (khung 1180 tối thiểu, quyết định v2 giữ). Ảnh nộp vào
`.playwright-cli/shots/v3/lat5/` ở 1280×800 (và 1440×900 cho bảng rộng).

## 1. Màn / phạm vi

| Route | Việc | Mock |
|---|---|---|
| Khung (`AdminNav`, `AdminTop`, `SimBar`, `app/styles/admin.css`, `table.css`) | `.s.adm3`: thanh bên vải đen 208 (đã có badge số đếm từ lát 0), `.simbar` đáy, `.main` nền tấm, `.top`, `.dt3`, `.menu3` (lát 2), sheet `.panel.wide` | mọi mock quản trị |
| `/admin` (`DashboardScreen`, `RevenueChart`) | KPI 4 ô, biểu đồ 14 ngày + "Xem dạng bảng", Cần xử lý (hành động ngay), Bán chạy, Đơn mới nhất, Sắp hết, Khách trong 14 ngày | `admin-dashboard.html` |
| `/admin/orders` (`AdminOrdersScreen`, `CustomersTable`-style table) | tab trạng thái, tìm, ba menu lọc, chọn dòng + thanh hàng loạt, menu ⋯ dòng, phân trang, CSV | `admin-orders.html` |
| `/admin/orders/[code]` (`AdminOrderScreen`, `HandoverForm`, `CancelOrderModal`) | đầu đơn + badge, hành động, `.nextstep` theo trạng thái, bàn giao, món + tổng, ghi chú nội bộ, **sửa địa chỉ giao có lý do** (mới), hành trình, khách, huỷ có lý do, **gửi lại xác nhận** (chỉ ghi nhật ký) | `admin-order.html` |
| `/admin/drops`, `/admin/drops/[no]` (`AdminDropsScreen`, `DropDetailScreen`, `DropFormModal`) | nhãn "Các số"; bảng + chi tiết dưới bảng (như đơn của khách), 5 KPI, bảng mẫu, mẫu hé lộ, **Tải CSV theo Số** (mới), Tạo số, Đóng sớm | `admin-so.html` |
| `/admin/promotions` (`AdminPromotionsScreen`) | bảng + **form sửa mã** (mới: sửa, nâng giới hạn +50, nhân bản, tạm dừng, kết thúc sớm) | `admin-promotions.html` |
| `/admin/products`, `/new`, `/[id]` (`ProductsTable`, `ProductForm`) | tab theo Số, lọc, bảng tồn kho, **điều chỉnh tồn kho size×màu có lý do** (mới); form thêm/sửa giữ logic v2 trong khung v3 | `admin-products.html` |
| `/admin/customers`, `/[id]` | tab nhóm, **nhãn khách suy từ đơn** (mới; ngưỡng người dùng chốt), bảng, menu ⋯; hồ sơ khách giữ v2 trong khung v3 | `admin-customers.html` |
| **`/admin/log`** (mới, `lib/activity-log.ts`) | nhật ký thao tác đọc từ kho mô phỏng + sự kiện hệ thống suy từ dữ liệu | `admin-log.html` |
| `/admin/slips?codes=` (`SlipScreen`) | phiếu giao hai cột A4, có ghi chú giao của khách (lát 3) và ô QR tra cứu | `admin-slips.html` |

**Dùng chung với lát 4 (bắt buộc, không viết lại):** `effectiveStatus(order, now)` — đơn chờ chuyển
khoản quá `dueAt` là **Đã huỷ · quá hạn chuyển khoản** (`cancelledAt = dueAt`), mọi bảng/KPI/hàng đợi/
nhật ký quản trị đọc qua hàm này, dòng nhật ký "Hệ thống · Huỷ đơn / quá 12 giờ chưa chuyển khoản";
`lib/sold-out-times.ts` (ưu tiên trường fixture `soldOutAt`, rồi suy từ đơn) cho KPI "Hết hàng · MUỐI ·
hết 19/09"; `ORDER_CANCELLED_BY_CUSTOMER` trong `brand.adminSim` hiện là "Đã huỷ · khách huỷ" với tác
giả "Khách" trong ghi chú nội bộ và nhật ký; tên lớp không được trùng tiện ích Tailwind (`lib/classnames.test.ts`
đang canh; `.btn.ink` là nút viền mực, `.cardgrid`, `.fill`).

Giữ logic v2: mọi thao tác quản trị là sự kiện trong `brand.adminSim` (`lib/admin-sim.ts`
`SimAction` + `pushSim`, `simOrders/simDrops/simPromotions/simNotes`), đọc qua `SimContext`, nút
"Đặt lại dữ liệu mẫu"; `admin-rows`, `admin-metrics`, `csv.ts`. Thêm `SimAction` mới cho: sửa địa
chỉ giao, gửi lại xác nhận, điều chỉnh tồn kho, sửa/nhân bản/nâng giới hạn/kết thúc sớm mã, thêm
mẫu hé lộ, huỷ bởi khách (lát 4 đã ghi — đọc lại đúng hình dạng đó). Kho mô phỏng chỉ có ở quản
trị và các màn khách chạy trong trình duyệt (tài khoản); trang cửa hàng render từ fixture — ghi
rõ ở `.simbar`. Không backend, không phụ thuộc mới.

## 2. Quyết định đã chốt

**Khung** — `.side` 208 vải đen `#171410`: wordmark Unbounded 13 mật ong cách .14em (padding 4 10
18), nav mục 44 (icon 15 + nhãn 13 chữ `#b9b0a0`, đang mở nền `rgba(255,255,255,.08)` chữ trắng
600 icon mật ong; badge đếm của lát 0), `.simbar` `margin-top:auto` viền trên đứt nét mật ong:
badge B "Chế độ mô phỏng" (trên vải đen: nền `#3a352e` chữ mật ong), "Thao tác lưu trên trình
duyệt này, không có máy chủ. **N** thay đổi." (N = `simCount`; "Chưa có thay đổi nào" khi 0), liên
kết "Đặt lại dữ liệu mẫu" mật ong 36 (lớp phủ 44) → sheet "Đặt lại dữ liệu mẫu? / Mọi thay đổi
đã ghi trên trình duyệt này sẽ bị xoá." (Giữ nguyên outline · Đặt lại mật ong). `.main` padding
18 28 64 nền `#f4efe6`. `.top`: h1 Unbounded 18/21 + `.sub` 12 chữ phụ (có thể chứa badge và đếm
ngược), `.acts` phải: badge B "Dữ liệu mô phỏng" (`.tag3` trung tính vải mộc) + nút `.btn.ink.sm`
(icon `export` "Tải CSV") + nút chính `.btn.sm` mật ong khi có. Nhãn nav: Tổng quan · Các số ·
Đơn hàng · Mẫu · Khách hàng · Mã giảm giá · Nhật ký (thứ tự mock; `/admin/drops` giữ URL).

**Nguyên tử quản trị** — `.kpis3` 4 cột gap 12 (`.five` 5 cột): `.kpi3` trắng hairline bo 4
padding 12 14: `.k` 12 chữ phụ, `b` Unbounded 22 tabular, dòng 12 chữ phụ, `.meter` 4px khi có.
`.panel3` quản trị: padding 0, `h2/h3` Unbounded 15/16 padding 12 16 viền dưới hairline (meta
chữ thân 12 chữ phụ, `.more` liên kết gạch chân phải), `.bd` 12 16 14. `.split3` `1.6fr 1fr` gap
16. `.dt3` trắng hairline bo 4: `.stabs` tab 44 (đếm 11px, đang mở 600 gạch mật ong 2px),
`.bar.tools` (ô tìm 44 max 280, chip `.chip3` 44 có icon/`down`, `.fill`), `.bar.bulk` vải đen
(b đếm "3 đơn đã chọn" + nút outline viền `#b9b0a0` chữ trắng, hover `rgba(255,255,255,.1)`), bảng:
`th` 11px hoa cách .06em viền dưới mực, `td` 10 12 hairline, hover nền tấm, `tr.on` `--brand-soft`,
`tr.paused` chữ phụ, `td.right` số căn phải tabular, `td.nw` thời gian/khách không gãy, liên kết
mã `--brand-text` gạch chân (lớp phủ ±14), `.cb` 20 (chọn: đen tick mật ong; `mixed` ở đầu bảng),
`.rowmenu` 36 icon `more` 15 → `.menu3` (fixed, viền mực, không bóng, mục 40 icon 15 chữ phụ,
`.hot` đỏ, `.ticked` 600 + tick), `.foot` (đếm, chip "10 dòng mỗi trang" 44 → menu 10/25/50, trang
36 `.on` đen chữ mật ong). `.avatar` 28 tròn đen chữ mật ong Unbounded 11 (`lib/initials.ts`).
Sheet quản trị: `.sheetwrap .panel` giữa màn 520 (`.wide` 680), `h3.title` Unbounded 15, `.sub`
12 chữ phụ, `.ft` viền trên hairline nút phải (outline "Huỷ" + mật ong xác nhận).

**Tổng quan `/admin`** — `.sub` "Số 05 · 11/09 → 25/09 [Đang bán] đóng sau 5 ngày 1 giờ"; `.acts`:
badge mô phỏng, `.seg3` 7/14/30 ngày (`?days=`, đang chọn đen chữ mật ong), "Tải CSV 14 ngày".
KPI: "Doanh thu 14 ngày / **14,2tr₫** / 14.256.000₫ · chỉ tính đơn đã thanh toán" (rút gọn
`tr₫` từ `lib/money.ts` nếu có, không thì in đủ), "Đơn trong 14 ngày / 15 / trung bình 950.400₫
mỗi đơn · 8 khách", "Cần xử lý / 5 / 2 chờ chuyển khoản · 3 đã trả, chưa giao · xử lý ngay" (→
`#queue`, liên kết trong chữ có lớp phủ ±14), "Còn trong số 05 / 73 chiếc / 108 / 181 đã bán ·
60% · 10 mẫu + meter". Panel "Doanh thu 14 ngày gần nhất" (meta "cột trống = ngày không có đơn
đã thanh toán"): tổng Unbounded 24 + "08/09 → 21/09 · ngày cao nhất 11/09 · 2.793.000₫", `.chart3`
14 cột (`--brand-text`, cao nhất `.hi` mật ong, ngày 0 `.zero` hairline 2px; `aria-label` + nhãn
giá trị trên cột cao nhất), `.axis` 5 mốc, "Xem dạng bảng" mở bảng ngày/đơn/doanh thu dưới biểu
đồ (details). `.split3`: "Cần xử lý" (`queueRows`; mỗi `.q`: mã link + tên + tổng, sub "Chờ
chuyển khoản · hạn 08:05 ngày 22/09 · CÁT ×1" hoặc "Đã thanh toán 09:43 · 18/09 · chưa bàn giao
**2 ngày**" (`.late` đỏ khi ≥ 2 ngày), hành động: outline "Đã nhận tiền" (icon `check`) → sim
PAID + toast; mật ong "Đóng gói và bàn giao" (icon `box`) → `/admin/orders/[code]#handover`) và
"Bán chạy trong số 05" (`dropRanking`: số thứ tự, ảnh 36×45, tên, meter (hot ≥ 85%, đen khi hết),
"18 / 35 · 51%"; "Xem cả 10 mẫu của số" → `/admin/drops/5`). `.split3`: "Đơn mới nhất" bảng 5 dòng
(`.more` "Xem tất cả") và cột phải: "Sắp hết" (`stockAlerts`: ảnh, tên, "hết S · M", badge B "Còn
2"/"Hết" hot) + "Khách trong 14 ngày" (`customerSplit`: meter 8px, "4 khách mới (tham gia trong
số) · 4 khách quay lại"). Chân "Dữ liệu mô phỏng: 24 đơn, 10 mẫu · thao tác lưu trên trình duyệt
này · Chi tiết" (→ `/admin/log`).

**Đơn hàng `/admin/orders`** — `.sub` "24 đơn trong dữ liệu mẫu · 5 cần xử lý"; `.acts`: badge,
"Tải CSV" (`don-hang.csv`, tôn trọng bộ lọc), mật ong "In phiếu giao" (→ `/admin/slips?codes=` các
đơn đã thanh toán chưa bàn giao). `.stabs` Tất cả · Chờ chuyển khoản · Đã thanh toán · Đang giao ·
Đã giao · Đã huỷ (đếm; `?state=`); `.bar.tools`: tìm (mã, tên, số điện thoại; `?q=`), chip
"Thanh toán" (menu Tất cả/Chuyển khoản/COD/Thẻ, `?pay=`), chip "Số" (menu Số 05/04/03, `?drop=`),
chip "Cột" phải (menu bật/tắt cột Món, Thanh toán, Địa chỉ, Mã giảm giá; lưu `brand.adminCols`).
Chọn dòng → `.bar.bulk` thay `.bar.tools`: "3 đơn đã chọn" + "Đã nhận tiền" (chỉ áp cho đơn chờ
chuyển khoản trong chọn, toast ghi số đơn đổi) + "In phiếu giao" (→ slips với các mã) + "Bỏ chọn".
Cột: chọn · Mã đơn (link) · Khách (avatar + tên, sub số điện thoại U+00A0 thụt 36) · Thời gian
`nw` "20/09 · 08:05" · Món "CÁT ×1" · Giá trị `.right` · Thanh toán ("Chuyển khoản" + sub "hạn
08:05 · 22/09" / "nhận 07:52 · 19/09" / "COD +15.000 · thu khi giao" / "Thẻ · chưa thu tiền · chưa
nối cổng") · Trạng thái badge B + sub ("chưa bàn giao · 2 ngày", mã vận đơn) · ⋯. Đơn huỷ
`tr.paused`. Menu dòng: Mở chi tiết · Đã nhận tiền (chỉ chờ chuyển khoản) · In phiếu giao · Gửi lại
xác nhận (ghi nhật ký, toast "Đã ghi nhật ký: gửi lại xác nhận DH-2431 tới khavy@vidu.vn (chưa có
máy chủ gửi)") · ─ · Huỷ đơn (`.hot`, mở sheet huỷ có lý do bắt buộc). `.foot`: "Hiện 8 / 24 đơn"
+ chip dòng/trang (`?per=`) + trang (`?page=`). Trống → dòng 12px "Không có đơn nào khớp."

**Chi tiết đơn `/admin/orders/[code]`** — `.top`: đường dẫn "Đơn hàng / DH-2429" 12 chữ phụ, h1
mã + badge B, `.sub` "Đặt 22:15 · 18/09 · Hoàng Mỹ Linh · 0987 222 333 · Chuyển khoản · Số 05";
`.acts`: "Gửi lại xác nhận" outline (icon `send`, chỉ ghi nhật ký), "In phiếu giao" outline (icon
`printer` → slips), ⋯ menu (Huỷ đơn). `.nextstep` vải đen may đứt nét (b Unbounded + span chữ phụ
+ nút mật ong phải) theo trạng thái: chờ chuyển khoản → "Bước tiếp theo: xác nhận đã nhận tiền /
Hạn 19:50 ngày 21/09 · 2.680.000₫ · nội dung DH-2430" + "Đã nhận tiền"; đã thanh toán → "Bước tiếp
theo: đóng gói và bàn giao / Đã thanh toán 1 ngày trước · 2 chiếc MUỐI · Giao tiêu chuẩn tới quận
1" + "Bàn giao" (mở panel `#handover` tại chỗ: `.fgrid` "Hình thức giao" `Select` (mặc định cách
khách chọn; help "Chưa ký đơn vị vận chuyển nào: ô này là hình thức giao khách đã chọn, mã vận
đơn nhập tay.") + "Mã vận đơn" bắt buộc (chữ hoa, placeholder VNP-2429-01) + "Ghi chú cho khách"
tuỳ chọn; `.ft` "Để sau" outline + "Bàn giao" mật ong → sim SHIPPING + toast "DH-2429 → đang giao ·
VNP-2429-01 · khách thấy mã này ở tra cứu đơn"); đang giao → "Bước tiếp theo: xác nhận đã giao /
Bàn giao 10:15 · 17/09 · VNP-2425-01" + "Đã giao"; đã giao/huỷ → không `.nextstep`. `.split3`
trái: panel "Món trong đơn" (meta "2 chiếc") bảng Mẫu (ảnh 36×45 + tên + "· quần jogger") · Màu ·
size · SL (`abbr`) · Đơn giá · Thành tiền, rồi `.sum3` (giảm, phí) và `.totalbar` "Tổng đã thanh
toán / Tổng cần thu" Unbounded 20; panel "Ghi chú nội bộ" (meta "khách không thấy"): `.ni` (meta
11px "Hệ thống · 07:52 · 19/09" / "Cửa hàng · …", `.sys` chữ phụ; từ `simNotes` + sự kiện fixture)
+ `.add` ô 44 + "Thêm" outline. Phải: panel "Giao tới" với `.more` "Sửa" (chỉ trước khi bàn giao;
sau đó ẩn và dòng 12px "Đã bàn giao, không sửa được"): `.addrblock` (tên · số, địa chỉ, chữ phụ
"Giao tiêu chuẩn · ghi chú: giao sau 14:00" — ghi chú của khách từ đơn); **form sửa** `#addredit`:
`.fgrid` Người nhận + Số điện thoại, "Số nhà, đường", `.fgrid` Tỉnh/thành + Phường/xã (`Select` hai
cấp), "Lý do sửa" bắt buộc (help "Ghi vào nhật ký và phiếu giao. Chỉ sửa được trước khi bàn
giao."), `.ft` Huỷ + "Lưu" → sim `address-edit` (trước/sau + lý do) + toast; panel "Hành trình"
`.tl3` (Đã nhận đơn · Đã thanh toán · Chờ bàn giao "1 ngày · mục tiêu bàn giao trong 1 ngày sau
thanh toán" · Đang giao · Đã giao; `.late` khi trễ); panel "Khách" (`.more` "Hồ sơ" → `/admin/
customers/[id]`): avatar + tên + `.ctag` + sub "3 đơn · 3.612.000₫ · mua số 04, 05 · email". Sheet
huỷ: "Huỷ đơn DH-2429? / Đơn đã thanh toán 1.272.000₫. Huỷ thì 2 chiếc MUỐI về kệ và phải hoàn
tiền tay." (câu theo trạng thái), `Select` lý do (Khách đổi ý · Quá hạn chuyển khoản · Hết hàng
thật · Khác) + ghi chú, `.ft` "Giữ đơn" + "Huỷ đơn" đỏ nền `--hot-bg`? — **không**: nút xác nhận
huỷ là `.btn` mật ong như mọi xác nhận, chữ "Huỷ đơn"; màu đỏ chỉ ở mục menu.

**Các số `/admin/drops`** — h1 "Các số", `.sub` "Trạng thái suy từ giờ mở và giờ đóng, không có
cờ bật tắt"; `.acts`: badge + mật ong "Tạo số" (icon `plus`) → sheet v2 `DropFormModal` trong khung
v3 ("Tạo số 07 / Một số chỉ cần giờ mở và giờ đóng…", trường giờ mở/đóng, mẫu hé lộ tuỳ chọn).
Bảng: Số (Unbounded, link) · Trạng thái badge B (Sắp mở soon · Đang bán on · Đã đóng shut) · Mở ·
Đóng (`nw`) · Mẫu ("2 hé lộ" cho sắp mở) · Đã cắt · Đã bán ("108 · 60%") · Doanh thu · ⋯ (Mở chi
tiết · Tải CSV · Đóng sớm (chỉ đang bán, sheet "Đóng số 05 sớm? / Giờ đóng đổi từ 20:00 · 25/09
thành bây giờ…" → sim) · Sửa giờ (chỉ sắp mở)). Dòng đang chi tiết `.on`. Chi tiết `/admin/drops/
[no]` **dưới bảng** (`.sec#detail`): `.hd` viền 2px: h2 "Số 05" + meta "đang bán · 5 ngày 1 giờ" +
phải "Tải CSV số này" outline (`so-05.csv`: mẫu, size, màu, đã cắt, đã bán, còn, doanh thu) +
"Đóng sớm" outline; `.kpis3.five`: Doanh thu 77,5tr₫ (đơn đã thanh toán) · Đơn 62 (trung bình) ·
Đã bán 108 / 181 (60% · còn 73 + meter) · Hết hàng 1 / 10 (MUỐI · hết 19/09 — từ `lib/sold-out-
times.ts` lát 4) · Còn dưới 4 chiếc 2 mẫu (BỤI còn 2 · SƯƠNG còn 3); `.dt3` bảng mẫu: Mẫu · Loại ·
Giá · Đã cắt · Đã bán / còn (`.cellmeter` meter + "18 · còn 17"; hot ≥ 85%; đen khi hết) · Size
hết ("S · M", "tất cả", "—") · Doanh thu; `.foot` "10 mẫu · 181 đã cắt · 108 đã bán · doanh thu theo
giá niêm yết, chưa trừ mã giảm giá"; panel "Số 06 · mẫu hé lộ" (meta "hiện ở trang chủ từ giờ tới
khi mở"): ảnh 44×55 + tên + "Áo khoác dù · giá công bố khi mở", nút "Thêm mẫu hé lộ" outline →
sheet (tên, loại `Select`, ảnh chọn từ `photoKey` có sẵn; "Chỉ tên, loại và ảnh. Không giá, không
số lượng.") → sim `teaser-add`, trang chủ khách đọc fixture nên ghi rõ "hiện ở quản trị; trang chủ
đọc dữ liệu mẫu" trong `.sub` của sheet. Số đã đóng: chi tiết không có "Đóng sớm", có "Xem sổ số
04" → `/so/4`.

**Mã giảm giá `/admin/promotions`** — `.sub` "3 đang chạy · 1 tạm dừng · 1 hết hạn · 1 hết lượt ·
số lượt đã dùng là dữ liệu mô phỏng"; `.acts` badge + "Tạo mã" mật ong. `.stabs` Tất cả · Đang chạy ·
Sắp chạy · Tạm dừng · Hết hạn · Hết lượt. Bảng: Mã (Unbounded cách .04em) · Giảm (`promoValueLabel`)
· Điều kiện · Hiệu lực ("11/09 → 25/09", giờ khi trong ngày) · Lượt (`.cellmeter` "46 / 200" hoặc
"31 · không giới hạn"; hết lượt meter đen) · Trạng thái badge B (Đang chạy on · Sắp chạy soon · Tạm
dừng shut · Hết hạn shut · Hết lượt hot) · ⋯: Sửa · Nâng giới hạn thêm 50 (chỉ mã có giới hạn) ·
Nhân bản · Tạm dừng/Tiếp tục · ─ · Kết thúc sớm (`.hot`, chỉ đang chạy; toast "Đã kết thúc sớm ·
giờ kết thúc = bây giờ · ghi nhật ký"). Sheet sửa/tạo/nhân bản (`.panel.wide`): tiêu đề "Sửa mã
DOT05" / "Tạo mã" / "Nhân bản DOT05", `.sub` "Đang chạy · 46 / 200 lượt · đổi điều kiện chỉ áp cho
đơn đặt từ lúc lưu."; `.fgrid` 2 cột: Mã (chữ hoa) · Loại `Select` (Giảm theo phần trăm / Giảm số
tiền / Miễn phí giao) · Giảm (%) hoặc (₫) theo loại · Giảm tối đa (₫, chỉ phần trăm) · Đơn từ (₫) ·
Giới hạn lượt (`.opt` "· trống = không giới hạn") · Bắt đầu · Kết thúc (chuỗi "20:00 11/09/2026",
kiểm định dạng); `.note3` "Khách đang thấy mã này trong "Mã đang chạy" của tài khoản. Đổi mã hoặc
kết thúc sớm thì mục đó cập nhật ngay."; `.ft` Huỷ · (nhân bản: "Nhân bản thành SO06" outline khi
sửa) · "Lưu" mật ong → sim `promo-edit`/`promo-create` (mã mới hiện trong bảng với `SIM_SUFFIX`),
trang thanh toán và tài khoản đọc `simPromotions` khi chạy trong trình duyệt. Trùng mã → `.err`.

**Mẫu `/admin/products`** — `.sub` "21 mẫu qua 3 số · 10 đang bán · tồn kho theo size và màu";
`.acts` badge + "Tải CSV" + mật ong "Thêm mẫu" (→ `/admin/products/new`, form v2 trong khung v3:
`.panel3`, `.fgrid`, `.inp3`, `Select`, nút v3). `.stabs` theo Số (Số 05 10 · Số 06 · hé lộ 2 · Số
04 6 · Số 03 5; `?drop=`); `.bar.tools`: tìm tên, chip "Loại" menu, chip bật/tắt "Sắp hết" (< 4)
và "Hết". Bảng: Mẫu (ảnh 36×45 + tên, `nw`) · Loại · form · Giá · Màu ("Đen · Kem") · Tồn kho
(`.cellmeter` "còn 17 / 35"; hot < 4; đen hết) · Size hết · Trạng thái badge B (Đang bán · Hết ·
Đã đóng · Hé lộ soon) · ⋯: Sửa mẫu (→ `/admin/products/[id]`) · Điều chỉnh tồn kho (sheet) · Xem
ở cửa hàng (→ `/products/[slug]`, mở tab mới). `.foot` "10 mẫu · 181 đã cắt · 73 còn · tồn kho là
số đã cắt trừ đơn chưa huỷ". **Sheet điều chỉnh tồn kho** (`.panel.wide`): "Điều chỉnh tồn kho ·
BỤI", `.sub` như mock ("…Không phải cách để "may thêm": tăng quá số đã cắt thì bị chặn."), `.invgrid`
hàng = màu (chấm 10 + tên), cột = size + Cộng: mỗi ô `.cell` (− ô số + , 36 cao, nút 32 lớp phủ 44;
ô đổi `.changed` số mật ong đậm + `.delta` "+1 · trả hàng DH-2419" dưới; Cộng in tổng + `(+1)`);
`.fgrid` Lý do `Select` (Hàng trả về · Kiểm kê lệch · Hư hỏng · Khác, bắt buộc) + Tham chiếu
(`.opt` "· đơn, biên bản"); Ghi chú; `.ft` Huỷ · "Lưu điều chỉnh" (vô hiệu khi không có ô đổi hoặc
thiếu lý do, nhãn "Chưa có thay đổi"/"Chọn lý do") → sim `inventory-adjust` {sản phẩm, màu, size,
trước, sau, lý do, tham chiếu, ghi chú}; bảng mẫu, KPI Các số và tổng quan (client) đọc tồn kho
sau điều chỉnh (`onHandOf` + overlay); tăng quá số đã cắt bị chặn tại ô (toast "Không vượt số đã
cắt: 18").

**Khách hàng `/admin/customers`** — `.sub` "12 khách trong dữ liệu mẫu · nhãn suy từ đơn đã thanh
toán, không gõ tay"; `.acts` badge + CSV. `.stabs` Tất cả · Thân thiết · Quay lại · Mới trong số 05
· Có đơn chờ (đếm; `?group=`); `.bar.tools`: tìm + chú giải phải 12 chữ phụ "Thân thiết: mua ≥ 3 số
· Quay lại: ≥ 2 đơn · Mới: đơn đầu trong số 05". Bảng: Khách (avatar + tên `nw`) · Liên hệ (số
U+00A0, sub email) · Đơn · Tổng chi (đơn đã thanh toán, chưa trừ hoàn) · Đã mua ("Số 03 · 04 · 05")
· Nhãn `.ctag` (mặc định "3 số liên tiếp" nền `--brand-soft`; `.back` "quay lại" ok-bg; `.new` "mới"
info-bg; ưu tiên thân thiết > quay lại > mới; ngưỡng: thân thiết = mua ở ≥ 3 Số liên tiếp, quay
lại = ≥ 2 đơn, mới = đơn đầu trong Số đang bán — người dùng chốt 22/09) · Đơn gần nhất ("20/09 ·
DH-2431" + badge B nhỏ) · ⋯: Hồ sơ (→ `/admin/customers/[id]`) · Đơn của khách (→ `/admin/orders?
customer=`) · Chép email. `.foot` "Hiện 8 / 12 khách · tổng chi tính từ đơn đã thanh toán, chưa trừ
hoàn tiền" + trang. Hồ sơ khách: v2 trong khung v3 + `.ctag` + "Đã mua" theo Số.

**Nhật ký `/admin/log`** — h1 "Nhật ký thao tác", `.sub` "Đọc từ kho mô phỏng trên trình duyệt này ·
mỗi thao tác một dòng, có trước và sau"; `.acts` badge + CSV (`nhat-ky.csv`). `.dt3.log3`: `.bar.tools`
chip "Loại thao tác" menu (Tất cả · Đơn hàng · Tồn kho · Mã giảm giá · Số · Hệ thống) + chip bật/
tắt "Hôm nay" (đếm) · "7 ngày" (đếm). Bảng: Lúc (`nw` "18:52 · 20/09") · Thao tác (`.what` b + sub:
"Đã nhận tiền / đánh dấu tay", "Điều chỉnh tồn kho / lý do: hàng trả về", "Sửa địa chỉ giao / trước
khi bàn giao", "Gửi lại xác nhận / chưa có máy chủ gửi, chỉ ghi", "Ghi chú nội bộ", "Khớp chuyển
khoản / tự động theo nội dung", "Bàn giao", "Tạm dừng mã", "Huỷ đơn / quá 12 giờ chưa chuyển khoản"
hoặc "/ khách huỷ", "Hết lượt", "Tạo số", "Đóng sớm", "Sửa mã", "Nhân bản mã", "Nâng giới hạn", "Thêm
mẫu hé lộ") · Đối tượng (link mã đơn + tên khách / "BỤI · Đen · L" / mã / "Số 06") · Trước → sau
(`.diff`: "chờ chuyển khoản → **đã thanh toán** · 400.000₫") · Ai ("Cửa hàng" cho `SimAction`,
"Khách" cho huỷ từ tài khoản, "Hệ thống" cho sự kiện suy từ fixture: chuyển khoản khớp, huỷ quá
hạn, mã hết lượt, số tạo/đóng theo lịch). `lib/activity-log.ts` thuần: `logRows(overlay, fixtures,
now)` sắp xếp mới nhất trước; test. `.foot` "11 thao tác trong 7 ngày · "Hệ thống" là việc suy từ
đồng hồ và dữ liệu, không ai bấm". Chưa có thao tác nào → vẫn có dòng hệ thống; nếu cả hai trống →
`.empty3` "Chưa có thao tác nào".

**Phiếu giao `/admin/slips?codes=`** — `.top`: đường dẫn "Đơn hàng / Phiếu giao", h1 "Phiếu giao ·
2 đơn", `.sub` "DH-2429 · DH-2428 · in hai phiếu một trang A4"; `.acts` mật ong "In" (icon
`printer`, `window.print`). `.slips` 2 cột gap 16: `.slip` trắng viền mực bo 4 padding 16 18:
`.hd` (wordmark Unbounded cách .14em + mã Unbounded 15) viền dưới 2px; `.grid2` `1fr 100px`:
`.addrblock` ("NGƯỜI NHẬN" 11px hoa, tên đậm · số, địa chỉ, chữ phụ "Giao tiêu chuẩn · giao sau
14:00" = cách giao + **ghi chú giao của khách**) + `.qrph` ô QR tra cứu (chờ) "QR tra cứu đơn";
bảng món (tên đậm · loại, "Đen · L", ×2); `.totalbar` "2 chiếc · đã thanh toán" + tổng 16px; COD:
`.cod` nền `--brand-soft` "Thu hộ khi giao / 1.287.000₫"; chân 11px "Mã vận đơn: VNP-2429-01 (hoặc
"chờ bàn giao") · Số 05 · in 18:50 · 20/09". `@media print`: ẩn `.side`, `.top`, `.noprint`; nền
trắng; hai phiếu một trang. Không có `codes` → chọn tất cả đơn đã thanh toán chưa bàn giao; trống
→ `.empty3` "Không có đơn nào để in".

**Chung**: từ "Số" từ lexicon (nhãn nav "Các số", cột "Số"); giọng không xưng hô; số từ dữ liệu +
overlay; vải đen chỉ ở thanh bên, thanh hàng loạt, `.nextstep`, badge sống; vùng chạm 44 (chip,
ô tìm, checkbox lớp phủ ±12, link mã ±14, rowmenu ±4, trang ±5); sàn 11px; U+00A0; bảng không tràn
1265 (cột ngắn `nw`, cột dài xuống dòng); mọi lớp nổi (menu, sheet, thanh hàng loạt, panel bàn
giao, form sửa địa chỉ) mở rồi mới đo.

## 3. Lỗi kèm

Không có lỗi L. Sửa nền: (a) nhãn v2 "Đợt bán"/"Khuyến mãi"/"Sản phẩm" → "Các số"/"Mã giảm
giá"/"Mẫu" (nav, h1, đường dẫn, tiêu đề trang); (b) "Đơn đầu tiên của số này" v.v. giữ như lát 0;
(c) huỷ bởi khách (lát 4) hiện đúng "Đã huỷ · khách huỷ" ở bảng, chi tiết và nhật ký.

## 4. Nghiệm thu (preview 3200, 1280×800; bảng rộng thêm 1440×900)

1. Khung: thanh bên, badge đếm, `.simbar` đếm thay đổi thật, đặt lại xoá overlay.
2. `/admin`: KPI đúng `salesWindow`, seg đổi `?days=`, biểu đồ + bảng, "Đã nhận tiền" trong hàng
   đợi đổi trạng thái + nhật ký, "Đóng gói và bàn giao" tới đơn với panel mở, xếp hạng, sắp hết,
   khách.
3. `/admin/orders`: tab/tìm/ba menu → URL, chọn 2 dòng → thanh hàng loạt → "Đã nhận tiền" chỉ áp
   đơn chờ, "In phiếu giao" → slips đúng mã, menu dòng đủ mục, gửi lại xác nhận ghi nhật ký, huỷ có
   lý do, phân trang + dòng/trang, CSV.
4. `/admin/orders/DH-2429`: `.nextstep` → bàn giao (mã vận đơn bắt buộc) → đang giao; sửa địa chỉ
   có lý do → khối cập nhật + nhật ký; sau bàn giao "Sửa" ẩn; ghi chú nội bộ thêm; hành trình; khách.
   `/admin/orders/DH-2431` (chờ chuyển khoản) và một đơn đã giao: `.nextstep` đúng/ẩn.
5. `/admin/drops`, `/admin/drops/5`: bảng, chi tiết dưới bảng, 5 KPI, bảng mẫu, CSV số, đóng sớm
   (sheet) đổi trạng thái, tạo số, thêm mẫu hé lộ; `/admin/drops/4` liên kết sổ số.
6. `/admin/promotions`: bảng, sửa/lưu, nâng giới hạn, nhân bản (mã mới `SIM_SUFFIX`), tạm dừng/tiếp
   tục, kết thúc sớm; mã mới hiện ở giỏ khi áp (client).
7. `/admin/products`: tab Số, lọc, bảng, sheet điều chỉnh tồn kho (+1 rồi lưu → bảng và nhật ký
   đổi; vượt số đã cắt bị chặn), form thêm/sửa trong khung v3.
8. `/admin/customers`: nhóm, nhãn đúng ngưỡng, menu, hồ sơ; `/admin/log`: dòng thật + hệ thống, lọc,
   CSV; `/admin/slips?codes=DH-2429,DH-2428`: hai phiếu, ghi chú giao, print preview chỉ phiếu.
9. typecheck, test (thêm test `lib/activity-log.ts`, nhãn khách, điều chỉnh tồn kho, sửa mã, sửa
   địa chỉ), build, sweep 12 route quản trị 0 tràn 0 lỗi, sàn 11px, vùng chạm 44 kể cả lớp nổi; 0
   "đợt"; 0 yêu cầu mạng.

## 5. Ảnh nộp (`.playwright-cli/shots/v3/lat5/`)

`dashboard-1280.png`, `dashboard-table-1280.png` (bảng ngày mở), `orders-1280.png`, `orders-bulk-1280.png`
(2 dòng chọn + thanh hàng loạt), `orders-menu-1280.png` (menu dòng mở), `orders-filter-1280.png` (menu
Thanh toán mở), `orders-cancel-sheet-1280.png`, `order-paid-1280.png` (DH-2429 + panel bàn giao mở),
`order-addr-edit-1280.png`, `order-awaiting-1280.png` (DH-2431), `order-shipping-1280.png`,
`drops-1280.png`, `drop-detail-1280.png`, `drop-close-sheet-1280.png`, `drop-create-sheet-1280.png`,
`promotions-1280.png`, `promo-edit-sheet-1280.png`, `products-1280.png`, `inventory-sheet-1280.png`,
`product-form-1280.png`, `customers-1280.png`, `customer-1280.png`, `log-1280.png`, `slips-1280.png`,
`slips-print-1280.png` (`emulateMedia print`), `reset-sheet-1280.png`, `orders-1440.png`.

Đọc trước: `AGENTS.md`, docs Next trong `node_modules/next/dist/docs/`, `DESIGN.md` (v2, thua brief
chỗ khác nhau), `PRODUCT.md`, `craft-floor.md`, `impeccable context --target app/admin/page.tsx`.
Không sửa `prototype/`, `tasks/`, `DESIGN.md`. Báo cáo sáu mục; để server 3200 chạy.
