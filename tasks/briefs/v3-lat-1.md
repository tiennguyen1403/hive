# Brief lát 1 · v3 — trang chủ: bìa Số (ba trạng thái), Còn ít, Trong số này, Theo loại, Bốn quy tắc, teaser Số kế tiếp

Phiên chính viết 22/09/2026 sau khi lát 0 ĐẠT. Agent `ui-implementer` thực thi; phiên chính
duyệt lại độc lập. Mock: `prototype/v3/home.html` (bìa đang bán + teaser sắp mở), `so.html`
(bìa đã đóng của một Số), `brand.html` mục "Bìa số · ba trạng thái", `v3.css` (mục cover,
tocrow, sec, cards, index, rules, past), `v3.js` (`tickCountdowns`, `label`, `HERO`).
Ảnh nộp vào `.playwright-cli/shots/v3/lat1/`.

## 1. Màn / phạm vi

| Route | Việc | Mock |
|---|---|---|
| `/` (`app/page.tsx`, `app/styles/home.css`, `components/shop/*` của trang chủ) | Dựng lại toàn bộ trang chủ theo v3 trong ba trạng thái của `featuredDrop` (OPEN · UPCOMING · CLOSED); giữ `?drop=` chọn Số, trạng thái vẫn suy từ đồng hồ (`lib/drop.ts`) | `home.html`, `so.html` phần bìa, `brand.html` |
| `lib/datetime.ts` | Thêm tên thứ ("thứ Hai" … "Chủ nhật") tự tính từ ngày theo múi +07:00, không dùng `Intl` (lý do ở đầu tệp); dùng cho "Đóng 20:00 thứ Sáu 25/09", "Mở 20:00 thứ Sáu 02/10", và dòng lịch chân trang (`SiteFooter`) | `home.html` `.state`, chân trang mock |
| `lib/lexicon.ts` | Thêm `HOME_COVER = { headline, lead }` — **một chỗ duy nhất** giữ câu đề và câu dẫn của bìa (người dùng đang cân nhắc đổi câu; chốt xong chỉ đổi hai chuỗi này) | `v3.js` `HERO.a` |

Thành phần của lát 0 dùng lại nguyên: `SiteNav`, `SiteFooter`, `ProductCard` (`.card3`), `Badge`
họ B, `Icon` (+`OPTICAL`), token trong `app/globals.css`. Không đụng listing, PDP, giỏ, tài
khoản, quản trị.

## 2. Quyết định đã chốt

**Bố cục chung (mọi trạng thái)**: nav → (ReminderBand nếu có nhắc đang tới giờ; giữ chức năng
v2, đổi token: nền `--stage`, chữ `--stage-ink`, giờ `--brand`, cao 44) → bìa → `.wrap` các mục
→ teaser Số kế tiếp (nếu có Số sắp mở) → dòng "Số 04 · đã đóng …" → chân trang.

**Bìa đang bán** (`.cover.open`, OPEN) — `home.html`:
- Điện thoại 390: ảnh bìa tràn lề 1:1 (`photoUrl("hero")`, `priority`, `alt=""`), rồi nhãn
  vải đen `#171410` có đường may đứt nét mật ong phía trên (`border-top:1px dashed --brand`),
  padding 16/18/32. Desktop ≥900: lưới 5/12 nhãn đen bên trái (đường may thành viền phải đứt nét,
  padding 48 32 48 0, lề trái = gutter trang) và ảnh 7/12 tràn mép phải, `min-height:640`.
- Lockup: "SỐ" 11px cách .14em hoa + số Số **96px** Unbounded 800 mật ong (168px desktop),
  cách chữ -.05em, `line-height:.9`, canh đáy (`align-items:flex-end`, "SỐ" cách đáy 10px).
- Dòng trạng thái: badge B `Đang bán` (trên vải đen: nền `#3a352e` chữ mật ong) + "Đóng 20:00
  thứ Sáu 25/09" (chữ phụ `#b9b0a0`, tabular).
- Đồng hồ: `role="timer"`, `aria-label` "Còn 5 ngày 1 giờ tới khi đóng"; ba cặp số + đơn vị:
  số 32px (40 desktop) Unbounded 700–800 trắng tabular, đơn vị 11px hoa cách .06em chữ phụ,
  cách nhau 12px; cập nhật mỗi phút, không hộp nền (khác v2). Về 0 thì hiện "đã đóng" và trang
  đổi trạng thái theo `featuredDrop` ở lần tải sau (không đổi trạng thái tại chỗ).
- Câu đề `h1` 30px (44 desktop) trắng, `max-width:14ch` (12ch desktop), cách chữ -.025em,
  `text-wrap:balance`, chữ từ `HOME_COVER.headline`; câu dẫn 14px chữ phụ `max-width:44ch` từ
  `HOME_COVER.lead`. **Mặc định hiện tại**: "Mười mẫu. Cắt một lần. Hết là hết." / "Mỗi mẫu cắt
  đúng một lần từ khổ vải đã đặt. Số còn lại của từng mẫu hiện ngay bên dưới. Hết size là hết,
  không may thêm." — người dùng có thể đổi sau, không hỏi lại.
- Nút: mật ong full-width "Xem mười mẫu" (→ `/products`; số mẫu bằng chữ 1–10 từ số mẫu thật
  của Số: "Xem mười mẫu", "Xem sáu mẫu"; ngoài 1–10 thì "Xem 12 mẫu") + nút lặng gạch chân
  "Bốn quy tắc" (→ `#rules`, `<a>` thường). Desktop: hàng ngang, nút chính `min-width:200`.
- **Còn ít**: chỉ khi có mẫu còn < 4 chiếc (`lowStockIn`); tiêu đề "Còn ít" Unbounded 15/16 +
  "dưới 4 chiếc" 11px hoa, gạch dưới mật ong; mỗi dòng `tocrow` 44px: tên Unbounded 14, "còn 2"
  đỏ `#ff8f86` trên vải đen + "· hết S M" (size hết gạch ngang `<s>`), dấu dẫn đứt nét mật ong
  mờ .7, giá tabular; cả dòng là liên kết tới PDP. Không có mẫu nào < 4 thì bỏ cả khối.

**Trong số này** (`.sec` đầu tiên trong `.wrap`, OPEN): đầu mục `.hd` viền dưới 2px mực: h2
"Trong số này" (Unbounded 18/21), meta "10 mẫu · 73 / 181 còn" (12px chữ phụ, tabular), liên
kết phải "Xem cả 10 mẫu" (gạch chân, → `/products`; điện thoại xuống hàng riêng theo mock).
Lưới `.grid3` **6 thẻ đầu** của Số (thứ tự catalog), `ProductCard` lát 0 nguyên vẹn (sheet size
mở từ nút thẻ). 2 cột điện thoại (gap 24/12), 3 cột desktop (gap 48/24).

**Theo loại** (`.sec`, OPEN): đầu mục h2 "Theo loại" + meta "trong số này"; danh sách dòng
`.index .row` (48×60 ảnh mẫu đầu của họ, tên họ 14px 600, dòng mô tả 12px chữ phụ "3 mẫu · oversize,
tay lỡ và cơ bản", giá phải "từ 390.000₫", 1 mẫu thì giá đúng không "từ"), viền dưới hairline,
cao ≥72; desktop hai cột chảy theo cột (`grid-auto-flow:column`, 3 hàng). Mô tả suy từ dữ liệu:
lấy `kind` của từng mẫu trong họ, bỏ phần tên họ đứng đầu ("Áo thun oversize" → "oversize",
"Áo hoodie in" → "in", "Áo hoodie" → "trơn"; "Áo khoác dù"/"bomber" → "dù và bomber"; "Sơ mi
dệt" → "sơ mi dệt"; "Quần jogger"/"cargo" → "jogger và cargo"), viết thường, nối ", " và " và "
trước phần tử cuối; nếu mọi mẫu cùng kind thì chỉ in kind. Liên kết → `/products?family=…`.

**Bốn quy tắc** (`.sec#rules`, mọi trạng thái): đầu mục h2 "Bốn quy tắc" + meta "áp dụng cho
mọi số"; bốn dòng định nghĩa `b` 14px 600 + `span` 13px chữ phụ, viền dưới hairline, **không
icon, không thẻ** (bỏ icon của v2); desktop hai cột. Chữ đúng mock: "Cắt đúng một lần / Mỗi mẫu
cắt từ khổ vải đã đặt. Không may thêm giữa số." · "Có giờ mở, giờ đóng / Mở theo lịch công bố
trước. Đóng khi hết hàng hoặc hết giờ." · "Số còn lại là số thật / Còn bao nhiêu chiếc hiện ngay
trên lưới, không đợi bấm vào mới biết." · "Một dải size cho tất cả / Không chia nam nữ. Chọn
theo form và số đo."

**Teaser Số kế tiếp** (`.cover.soon#next`, khi có Số sắp mở; ở trạng thái UPCOMING nó là bìa
chính đứng đầu trang): vải đen, `margin-top:64` khi đứng sau `.wrap`; ảnh là lưới 2 ô 4:5 nền
`#3a352e`, ảnh mờ .45, badge B "Chưa mở" (info) góc trên trái, chú thích trắng "SỎI / Áo khoác dù
· giá công bố khi mở" (từ `teasersIn(no)`); lockup "SỐ 06" số 72px (120 desktop) màu chữ phụ
`#b9b0a0`; badge "Sắp mở" + "Mở 20:00 thứ Sáu 02/10"; đồng hồ tới giờ mở (aria "Còn 12 ngày 1
giờ tới giờ mở"); h2 24/28 trắng "Hai mẫu đã hé lộ. Giá và số lượng công bố đúng lúc mở." (số
mẫu bằng chữ từ số teaser thật); nút phụ viền trắng "Đặt nhắc giờ mở" (icon chuông; hành vi
`RemindButton` v2: lưu trên thiết bị, sau khi đặt đổi thành "Đã đặt nhắc" và toast "Đã đặt nhắc
giờ mở · lưu trên thiết bị này"); ghi chú 12px chữ phụ "Nhắc lưu trên thiết bị này. Trang chủ
hiện lại khi còn 2 giờ tới giờ mở." Không có teaser nào thì lưới ảnh ẩn, khối vẫn hiện với
"Chưa hé lộ mẫu nào" thay câu h2 (chuỗi duy nhất không có trong mock, dùng cho trường hợp dữ liệu
trống).

**Bìa đã đóng** (`.cover.shut`, CLOSED — `so.html`): cùng khung với bìa đang bán; ảnh bìa xám .6
mờ .85; số Số màu chữ phụ; badge "Đã đóng" (`.shut`, trên vải đen chữ phụ); dòng "Mở 20:00 ·
05/06 · đóng 20:00 · 19/06"; **không đồng hồ**; h1 "Sáu mẫu. 30 / 30 chiếc đã bán." (số mẫu bằng
chữ, số chiếc từ `dropSummary`); câu dẫn "Bản ghi của số 04: mẫu nào, cắt bao nhiêu, hết lúc
nào. Không mua được nữa; mẫu có thể quay lại ở một số sau, cũng có thể không."; nút chính mật
ong "Xem số 05 đang bán" (→ `/products`) khi có Số đang bán, nếu không thì "Số 06 sắp mở" (→
`#next`); nút lặng "Về số 03" (→ `/?drop=3`) khi có Số trước. Dưới bìa: mục "Sáu mẫu của số 04"
(meta "tất cả đã hết") với lưới thẻ sold (SOLD OUT + "14 / 14 đã bán" + "Xem chi tiết"), rồi
Bốn quy tắc, rồi teaser Số kế tiếp nếu có, rồi dòng past. Bảng "Hết lúc nào" của `so.html`
**không** làm ở lát này (thuộc lát 4, trang sổ Số).

**Trạng thái UPCOMING** (không Số nào đang bán, Số kế tiếp chưa mở): teaser đứng đầu trang làm
bìa chính (không `margin-top`), rồi Bốn quy tắc, rồi dòng past của Số vừa đóng.

**Dòng past** (`.past`): "Số 04 · đã đóng 19/06 · 200 / 200 đã bán   Xem lại" từ
`previousDropNote` (liên kết `.lnk` 44px → `/?drop=4`). Ẩn khi không có Số trước.

**Từ vựng, giọng**: "Số"/"số" từ `lib/lexicon.ts`; không xưng hô; các chuỗi khác đúng mock.
Mọi số (mẫu, còn/đã cắt, giá từ, giờ) suy từ `data/` qua `lib/`; không gõ tay.

**Vùng chạm** 44px (tocrow, dòng họ, liên kết past, nút lặng qua lớp phủ); sàn chữ 11px (đơn vị
đồng hồ, "dưới 4 chiếc"); tương phản trên vải đen: trắng, `#b9b0a0` (6,9:1), mật ong (9,6:1),
`#ff8f86` cho "còn 2" (5,2:1) — không dùng `--hot` đỏ tối trên nền đen.

**Ảnh**: hero `photoUrl("hero", …)` như v2; ảnh teaser và ảnh dòng họ từ `photoUrl(photoKey)`;
`next/image` đúng kích thước thật, không kéo giãn.

## 3. Lỗi kèm

Không có lỗi L. Việc sửa nền đi kèm: tên thứ trong ngày (mục 1); chuỗi "Cách đợt hoạt động"/"Cách
chúng tôi bán" nếu còn ở đâu → "Bốn quy tắc".

## 4. Nghiệm thu (preview 3200, 390 và 1280)

1. `/` (Số 05 đang bán): bìa đúng mục 2 — ảnh 1:1 rồi nhãn đen ở 390; lưới 5/7 cao ≥640 ở 1280,
   số 96/168 mật ong, badge "Đang bán", "Đóng 20:00 thứ Sáu 25/09", đồng hồ 3 cặp đang chạy,
   câu đề/câu dẫn từ `HOME_COVER`, hai nút, khối Còn ít với BỤI và SƯƠNG (số thật từ fixture).
2. "Trong số này" 6 thẻ, meta "10 mẫu · 73 / 181 còn", "Xem cả 10 mẫu"; sheet size mở từ thẻ.
3. "Theo loại" 5 dòng với mô tả suy từ `kind`, giá "từ …", ảnh 48×60; desktop hai cột.
4. "Bốn quy tắc" không icon, hai cột desktop; `#rules` là đích của nút lặng.
5. Teaser Số 06: hai ô SỎI, NGÓI với "Chưa mở", số 72/120, "Mở 20:00 thứ Sáu 02/10", đồng hồ,
   "Hai mẫu đã hé lộ…", nút "Đặt nhắc giờ mở" hoạt động (đặt → đổi nhãn + toast + ReminderBand
   hiện khi tới giờ; kiểm bằng cách đặt đồng hồ giả trong test của `lib/reminder.ts` hiện có).
6. Dòng past "Số 04 · đã đóng 19/06 · 200 / 200 đã bán · Xem lại" → `/?drop=4`.
7. `/?drop=4` (CLOSED): bìa xám, không đồng hồ, "Sáu mẫu. 200 / 200 chiếc đã bán.", nút "Xem số
   05 đang bán", lưới sold, Bốn quy tắc, teaser, past (Số 03).
8. `/?drop=6` (UPCOMING): teaser là bìa đầu trang, rồi Bốn quy tắc, rồi past (Số 05 … khi nó
   còn mở thì dòng past nói "đang bán"? — không: `previousDropNote` đã xử lý, in đúng như nó trả).
9. `npm run typecheck`, `npm test` (thêm test tên thứ, số mẫu bằng chữ, mô tả họ), build sạch,
   sweep 0 tràn 0 lỗi console, sàn 11px, vùng chạm 44 (đo `elementFromPoint`).

## 5. Ảnh nộp (`.playwright-cli/shots/v3/lat1/`)

`home-open-390-1.png` (bìa), `home-open-390-2.png` (Còn ít + đầu lưới), `home-open-390-3.png`
(Theo loại + Bốn quy tắc), `home-open-390-4.png` (teaser + past), `home-open-1280-1.png` (bìa),
`home-open-1280-2.png` (lưới + Theo loại), `home-open-1280-3.png` (quy tắc + teaser),
`home-sizesheet-390.png` (sheet mở từ thẻ), `home-remind-390.png` (sau khi bấm Đặt nhắc),
`home-closed-390.png`, `home-closed-1280.png` (`/?drop=4`), `home-upcoming-390.png`,
`home-upcoming-1280.png` (`/?drop=6`).

Đọc trước: `AGENTS.md`, docs Next trong `node_modules/next/dist/docs/`, `DESIGN.md` (v2, thua
brief chỗ khác nhau), `PRODUCT.md`, `craft-floor.md`, `impeccable context --target app/page.tsx`.
Không sửa `prototype/`, `tasks/`, `DESIGN.md`. Báo cáo sáu mục; để server 3200 chạy.
