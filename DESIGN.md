---
name: BRAND — nhãn dệt
description: Vải đen, chỉ mật ong, sàn trắng — cửa hàng bán theo Số, mỗi Số một bìa, một mục lục, một giờ đóng.
colors:
  brand: "#eba400"
  brand-ink: "#171410"
  brand-soft: "#fbf1da"
  brand-text: "#9e6817"
  mark: "#c28800"
  ink: "#171410"
  ink2: "#6b6250"
  placeholder: "#7a6f5a"
  hair: "#ece7dd"
  line: "#9c937f"
  bg: "#ffffff"
  plate: "#f4efe6"
  stage: "#171410"
  stage-ink: "#ffffff"
  stage-ink2: "#b9b0a0"
  stage-hair: "#3a352e"
  stage-hot: "#ff8f86"
  sel: "#171410"
  sel-ink: "#eba400"
  hot: "#b3261e"
  hot-bg: "#fbeaea"
  ok: "#1b6b3a"
  ok-bg: "#e6f4ea"
  warn: "#44505e"
  warn-bg: "#eaedf1"
  info: "#0c6289"
  info-bg: "#dceffa"
  gold-50: "#fdf9f2"
  gold-100: "#fbf1da"
  gold-200: "#fbe8bc"
  gold-300: "#f7d98e"
  gold-400: "#f1c04a"
  gold-500: "#eba400"
  gold-600: "#c28800"
  gold-700: "#9e6817"
  gold-800: "#6e4a12"
  gold-900: "#171410"
typography:
  num:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "96px"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.05em"
  display:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  h1:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    letterSpacing: "-0.03em"
  h2:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "18px"
    fontWeight: 800
    letterSpacing: "-0.03em"
  h3:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "15px"
    fontWeight: 800
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  ui:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
  small:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  micro:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.06em"
rounded:
  sm: "3px"
  md: "4px"
  pill: "99px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
  s8: "64px"
  s9: "96px"
  gut: "18px"
  gutd: "40px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
    typography: "{typography.ui}"
  button-primary-hover:
    backgroundColor: "{colors.gold-400}"
    textColor: "{colors.brand-ink}"
  button-ink:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-ink-hover:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "0 4px"
    height: "40px"
  button-disabled:
    backgroundColor: "{colors.gold-50}"
    textColor: "{colors.ink2}"
  button-small:
    height: "34px"
    padding: "0 14px"
    typography: "{typography.small}"
  badge-live:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.brand}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
    typography: "{typography.micro}"
  badge-quiet:
    backgroundColor: "{colors.hair}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  badge-hot:
    backgroundColor: "{colors.hot-bg}"
    textColor: "{colors.hot}"
  badge-info:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.info}"
  badge-flat:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.ink}"
  chip:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.sel}"
    textColor: "{colors.sel-ink}"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
    typography: "{typography.body}"
  card-action:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    typography: "{typography.small}"
  card-action-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.brand}"
  nav-issue-tag:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.brand}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "28px"
    typography: "{typography.micro}"
  count-bubble:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.brand}"
    rounded: "{rounded.pill}"
    height: "16px"
  cover:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.stage-ink}"
    padding: "16px 18px 32px"
  sold-out-stamp:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.brand}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
    typography: "{typography.small}"
---

# DESIGN.md — hệ thiết kế, đọc ra từ code đã dựng

Tài liệu này **mô tả cái đang chạy**, không mô tả ý định. Mọi token trong
frontmatter và dưới đây tồn tại thật trong `app/globals.css`; mọi con số lấy từ
`app/styles/*.css` (**3.740 dòng, mười sáu tệp** — đếm lại 2026-09-23 sau lát 6
của đợt v3 đã quét sạch lớp v2; `table.css` là tệp thứ mười bảy và đã đi cùng
route `/system`). Chỗ nào tài liệu và code lệch nhau thì **code đúng** — sửa tài
liệu, đừng sửa code cho khớp tài liệu.

Ghi lần đầu 2026-09-20 sau Phase 6 (đợt v2). **Viết lại 2026-09-23 sau đợt v3,
hướng NHÃN (nhãn dệt)**: vải đen, chỉ mật ong, sàn trắng. Những quyết định của
v2 còn sống được giữ nguyên và ghi rõ; những gì v3 thay thì ghi theo bản dựng.

---

## 1. Nguồn của sự thật

| Thứ | Ở đâu |
|---|---|
| Token màu, bo góc, font, chín bậc khoảng cách, chín vai chữ | `app/globals.css` — khối `@theme` (màu, bo góc, font) rồi bí danh ngắn và các bậc `--s*` / `--fs-*` trong `:root` |
| CSS thành phần | `app/styles/*.css`, nạp theo thứ tự đã ghi trong `globals.css` |
| Mock đã duyệt (thước đo của bản dựng) | `prototype/v3/*.html` + `v3.css`, `v3-pages.css`, `v3.js`; bảng thành phần `prototype/v3/brand.html`, họ badge `badges.html` (họ B "vải đen"), từ vựng `voice.html` |
| Từ vựng | `lib/lexicon.ts` — `LEX` ("Số"), `HOME_COVER`, `ABOUT_LEAD`, `issueLabel()` |
| Đồng hồ | `lib/clock.ts` — `demoNow()` (QĐ-24) |

**Tailwind chỉ là theme + preflight** (QĐ-23). `globals.css` nhập
`tailwindcss/theme.css` và `tailwindcss/preflight.css`, **không** nhập utilities:
Tailwind v4 quét cả `prototype/` và chính các stylesheet, sinh ra `.outline`,
`.grid`, `.grow`, `.table`, `.ring`… — đều là tên class hệ này cũng dùng, cùng
độ đặc hiệu, quyết bởi thứ tự nguồn. Đo trên `/cart`: nút "Áp dụng" mang
`.btn.outline` vẽ thêm một viền 1px chồng lên viền của chính nó.
`lib/classnames.test.ts` từ chối mọi tên class trùng một utility trần (danh sách
miễn trừ **rỗng**; `.grid`→`.cardgrid` rồi `.grid3`, `.grow`→`.fill`,
`.outline`→`.btn.ink`). `sr-only` do `base.css` tự định nghĩa.

**Không sắp xếp lại các `@import` trong `globals.css` theo bảng chữ cái.** Khi
hai quy tắc bằng nhau về độ đặc hiệu thì thứ tự nguồn quyết định. Đo lại ở lát 6
của v3: 1.181 nhánh quy tắc, 23.505 cặp liên tệp hoà nhau và chung khai báo,
**7 cặp** rơi lên cùng một phần tử (69 lượt route × 390/1280), tất cả đã được
giải bằng tệp nạp sau và ghi ngay trong `globals.css`. Thêm quy tắc mới vào bất
kỳ tệp nào trong bảy cặp ấy là phải đo lại.

Thứ tự nạp: `base` · `nav` · `buttons` · `cards` · `forms` · `lists` · `admin` ·
`sheet` · `home` · `listing` · `product` · `checkout` · `account` · `pages` ·
`interaction` · `desktop`. Các tệp từ `home` trở đi chỉ khai **tên class mới**;
`account.css` nạp sau `checkout.css` để tái dùng `.panel3`, `.pghead`, `.two3`,
`.tl3`, `.kvs`, `.sum3`, `.fine3`, `.field3` bằng thứ tự nguồn thay vì selector
sâu hơn.


### Ảnh — nguồn gốc từng raster (FINISH: mọi raster giao đi mang nguồn gốc)

Bản dựng **chưa có ảnh của thương hiệu**. Mọi ảnh sản phẩm, ảnh bìa và ảnh hé lộ là **ảnh thay thế**
lấy từ Unsplash qua `lib/photos.ts` (`photoUrl(key, width, quality)` → `images.unsplash.com/photo-<id>`,
Unsplash License), không có plate trong repo và không ghi tên tác giả trên màn. Chúng đứng chỗ cho ảnh
thật: khi có ảnh của cửa hàng, thay từng khoá dưới đây trong `PHOTO_IDS` (hoặc đổi `photoUrl` sang plate tự
chứa) là mọi màn đổi theo, bố cục không đổi. Ảnh tra cứu Unsplash bằng ID sau `photo-`.

| Khoá | ID Unsplash | Dùng ở |
|---|---|---|
| `hero` | `1593278641722-49b1047ede21` | bìa Số đang bán (hero) |
| `khoi` | `1503341338985-c0477be52513` | mẫu KHÓI |
| `bui` | `1620799140188-3b2a02fd9a77` | mẫu BỤI |
| `nguoi` | `1680292783974-a9a336c10366` | mẫu NGUỘI |
| `nang` | `1503341504253-dff4815485f1` | mẫu NẮNG |
| `suong` | `1564557287817-3785e38ec1f5` | mẫu SƯƠNG |
| `muoi` | `1601063476271-a159c71ab0b3` | mẫu MUỐI |
| `than` | `1508216310976-c518daae0cdc` | mẫu THAN |
| `cat` | `1578768079052-aa76e52ff62e` | mẫu CÁT |
| `gio` | `1615397587950-3cbb55f95b77` | mẫu GIÓ |
| `da` | `1542406775-ade58c52d2e4` | mẫu ĐÁ |
| `reu` | `1611817757591-c3f345024273` | mẫu RÊU |
| `tro` | `1614214191247-5b2d3a734f1b` | mẫu TRO |
| `song` | `1688111421205-a0a85415b224` | mẫu SÓNG |
| `vo` | `1565978771542-0db9ab9ad3de` | mẫu VỎ |
| `mua` | `1633292750937-120a94f5c2bb` | mẫu MƯA |
| `kho` | `1542327534-59a1fe8daf73` | mẫu KHÔ |
| `dat` | `1632682582909-2b3a2581eef7` | mẫu ĐẤT |
| `lua` | `1561151593-7059b6b4ff57` | mẫu LỬA |

19 khoá, 1 bìa + 18 mẫu (Số 03–06). `PHOTO_KEYS` xuất từ cùng bảng để form quản trị và sheet hé lộ
chỉ chọn được ảnh đã có nguồn.

---

## 2. Màu

Ba chất liệu, không phải một thang: **giấy trắng** là sàn hàng, **vải đen**
`--stage` là chất liệu của *Số*, **chỉ mật ong** `--brand` là sợi nhận diện duy
nhất. Mọi cặp chữ/nền đã tính trước khi viết (`scratchpad/v3/contrast.js`) và
đạt WCAG AA. **Không chỉnh một giá trị bằng mắt; tính lại trước.**

### Thang gốc — MẬT ONG

`--gold-50 #fdf9f2` · `100 #fbf1da` · `200 #fbe8bc` · `300 #f7d98e` ·
`400 #f1c04a` · `500 #eba400` · `600 #c28800` · `700 #9e6817` ·
`800 #6e4a12` · `900 #171410` (bậc 900 nay **là** mực, không còn là nâu sẫm).

### Tách theo việc nó làm

| Token | Dùng cho | Đo được |
|---|---|---|
| `--brand` (= `--fill`) | nút chính, số bìa, tick ô chọn, đường may đứt nét, gạch dưới tab đang mở, con nháy, bôi đen | nền/nét |
| `--brand-ink` (= `--fill-ink`) | chữ trên mật ong — **mực, không phải trắng** | 8,9:1 |
| `--brand-text` (= `--link`) | chữ và liên kết muốn "là" mật ong — bậc 700 là bậc sáng nhất còn đọc được | 4,72:1 trên trắng |
| `--brand-soft` (= `--band`) | ghi chú `.note3`, dòng bảng đang chọn, ô số lượng khi focus | 15,4:1 với mực |
| `--mark` | vòng focus, thanh tồn kho `.meter`; **không** còn là viền nút | 3,4:1 trên trắng, chỉ cần 3:1 |
| `--ink` / `--ink2` | chữ chính / chữ phụ | 18,5:1 / 6,2:1 |
| `#7a6f5a` | placeholder trong `.inp` (interaction.css) | 4,94:1 |
| `--line` | viền ô nhập, chip, hộp đánh dấu, vòng đĩa màu | 3,05:1 — vừa qua ngưỡng viền điều khiển |
| `--hair` | nét kẻ ngăn, viền panel/KPI, badge "vải mộc" | trang trí |
| `--plate` | nền sau ảnh, nền khu quản trị, nền hover của hàng/nút mực | nền |
| `--sel` / `--sel-ink` | thứ **đang chọn** đảo vào vải đen: chip lọc, dòng size, đoạn kỳ `.seg3`, trang đang mở | đen/mật ong |

### Vải đen — chất liệu của Số

`--stage #171410` · `--stage-ink #fff` (18,5:1) · `--stage-ink2 #b9b0a0`
(8,4:1) · `--stage-hair #3a352e` (kẻ **trên** vải) · `--stage-rule #eba400`
(mép may) · `--stage-hot #ff8f86` (đỏ nâng sáng để đạt 5,2:1 trên vải, vì
`--hot` chỉ 2,1:1 ở đó).

**Quy tắc Vải Đen Không Phải Theme.** Vải đen chỉ được dùng cho *Số* và những
gì thuộc về nó: bìa `.cover`, teaser Số kế tiếp `.cover.soon`, tem Số trên nav
`.itag`, dải nhắc `.band.remind`, dải bước tiếp theo của đơn `.nextstep`, thanh
bên quản trị `.side`, thanh hàng loạt `.bar.bulk`, badge trạng thái sống, dấu
SOLD OUT, bong bóng đếm. Không sơn một mặt nào khác thành đen vì nó "cần sức
nặng". Toast nền `--ink` là ngoại lệ có chủ ý (dải 12px sống 2,6 giây).

**Quy tắc Một Sợi Chỉ.** Mỗi màn chỉ có **một** mảng mật ong là hành động chính
(`.btn` mặc định). Nút thứ hai là mực viền mực (`.btn.ink`), nút thứ ba là chữ
gạch chân (`.btn.quiet`). Trên thẻ sản phẩm nút thêm giỏ là viền mực trên trắng,
**đảo thành đen/mật ong khi hover** — mượn chất liệu của Số thay vì đặt một mảng
vàng lên mọi ô lưới. Ở khung nhìn đầu tiên trên desktop 1280, nút "Xem mười mẫu"
là mảng mật ong duy nhất (ảnh `.impeccable/review/desktop.png`).

**Mật ong không mang nổi chữ trắng.** Đó là lý do `--brand-ink` là mực và lý do
chữ liên kết phải xuống `--brand-text`.

### Trạng thái

Mỗi sắc tách hẳn khỏi họ vàng: `--hot #b3261e` (còn ít, đã huỷ) · `--ok #1b6b3a`
(xong, checklist mật khẩu) · `--warn #44505e` (chờ — **xám, vì vàng đã là màu
thương hiệu**) · `--info #0c6289` (sắp mở, đang giao). Mỗi màu có một nền `-bg`.
Trên thẻ và trong dòng size, **đỏ chỉ tiêu cho một thứ**: số còn mà người mua vẫn
hành động được ("còn 2"); size đã hết là gạch xám, vì "hết S" là sự thật, không
phải báo động.

**Màu không bao giờ là kênh duy nhất.** Mọi `.badge` mang một chấm *và* một chữ
(`dot` mặc định bật trong `Badge.tsx`); mốc dòng thời gian `.tl3 .m` mang hình
dạng *và* chữ; chấm trên tem Số đổi màu (mật ong / xanh `--info` / xám) nhưng chữ
bên cạnh nói cùng điều đó.

---

## 3. Chữ

Hai họ, cả hai tự host qua `next/font` (không gọi `fonts.googleapis.com` lúc
chạy), cả hai nạp subset `vietnamese` — tên mẫu KHÓI, BỤI, SƯƠNG, NGUỘI và chính
chữ "Số" đặt bằng Unbounded có dấu. **Cặp D, chốt 22/09/2026.**

- `--font-display` → **Unbounded 800** (một weight tĩnh, không phải trục biến
  thiên) — số Số, tiêu đề, tên mẫu, wordmark, mã đơn, số KPI, đồng hồ.
- `--font-sans` → **Be Vietnam Pro 400/500/600/700** — mọi thứ khác. 700 vào từ
  v3 vì badge là 700.

### Chín vai chữ (token `--fs-*`, đổi ở breakpoint 900px)

| Vai | Điện thoại | Từ 900px | Ở đâu |
|---|---|---|---|
| num | **96** | **168** | số Số trên bìa (`.cover .issue .num`, mật ong, `line-height .9`, cách `-.05em`) |
| display | 30 | 44 | câu đề trên bìa `.cover .t` (`line-height 1.05`, tối đa 14ch / 12ch) |
| h1 | 24 | 28 | `h1.pghead`, câu đề teaser Số kế tiếp, "đã đóng" của đồng hồ |
| h2 | 18 | 21 | tiêu đề mục `.sec .hd h2`, `h1` khu quản trị, trạng thái rỗng |
| h3 | 15 | 16 | tên mẫu trong sheet, "Còn ít" |
| body | 14 | 14 | lead trên bìa, tên mẫu trên thẻ/mục lục, chữ ô nhập trong `.field3`, tên trong `.picks3` |
| ui | 13 | 13 | **nền** — `.s{ font-size:var(--fs-ui); line-height:1.55 }`, nút, hàng, bảng |
| small | 12 | 12 | dòng phụ `.sub`, `.kind`, ghi chú `.note3`, `.btn.sm`, nhãn trục |
| micro | 11 | 11 | badge, nhãn viết hoa (`.lbl`, `.foot3 h4`, `th`, "SỐ" trên bìa), bong bóng đếm, colophon |

Unbounded 800 vẽ rộng, nên mọi vai display kéo lại bằng `--ls-display -0.03em`
và số lớn kéo mạnh hơn `--ls-num -0.05em`. Ba class đổi *mặt chữ*: `.nm` (tên
mẫu), `.disp` (dòng prose cỡ display), `.num` (con số đọc như con số).

Ngoài chín vai, những cỡ literal còn tồn tại trong CSS và **thuộc về thế giới**:
32/40 đồng hồ bìa, 72/120 số Số kế tiếp (nhạt, `--stage-ink2`), 22 số KPI quản
trị, 20 số KPI khác, 16 wordmark trên nav, 14 wordmark chung, 13 wordmark thanh
bên. Cỡ 11,5 và 12,5 (`.lead`, `.err`, `.stockline`, `.row .t/.amt`, `details`,
`.band`, `.rules div`) là tàn dư v2 còn được render — xem §10.

**Sàn 11px cho chữ chức năng** (QĐ-22, giữ từ v2): không có cỡ dưới 11 ở bất cứ
đâu; máy dò trong `tools/layout-sweep.js` bắt vi phạm.

Quy ước đã cài sẵn:
- `font-variant-numeric: tabular-nums` cho mọi số so sánh theo cột — giá, tổng,
  đồng hồ, số còn, ô bảng, số đếm trên chip/tab/bong bóng.
- `text-wrap: balance` cho `h1`, `pretty` cho `p` và `.lead`.
- Nhãn viết hoa là **một giọng** dùng lại: 11px · 600 · cách `.06em` (`.lbl`,
  `th`, `.foot3 h4`, nhãn đồng hồ); `.14em` cho "SỐ" trên bìa và wordmark; badge
  `.08em` 700.
- Từ vựng: **"Số" thay "đợt"** ở mọi chữ trên màn (`LEX` trong `lib/lexicon.ts`,
  hai chữ số luôn: "Số 05"). URL, tên biến (`Drop`, `dropNo`) và khoá localStorage
  giữ tiếng Anh. **SOLD OUT** là từ tiếng Anh duy nhất trên màn khách — dấu trên
  ảnh mẫu đã hết; trong câu vẫn nói "đã hết". Giọng trung tính, không xưng hô.

---

## 4. Hình khối & khoảng cách

| Thứ | Giá trị |
|---|---|
| Bo góc chuẩn | `--r` = **4px** (ghi đè `--radius-md` của Tailwind) — nút, ô nhập, chip, panel, ảnh thẻ, menu, sheet |
| Bo góc nhỏ | `--r-sm` = **3px** — badge, tem Số, ảnh nhỏ, hộp đánh dấu, dấu SOLD OUT |
| Bo tròn hẳn | `99px` — chấm, bong bóng đếm, thanh tỉ lệ, đĩa màu, nút tròn, công tắc |
| Chín bậc khoảng cách | `--s1..--s9` = 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 — nhóm chặt s1–s3, mục s6–s8 (`.sec` cách `--s7` điện thoại, `--s8` desktop; chân trang cách `--s8`) |
| Lề ngang | `--gut` **18px** điện thoại, `--gutd` **40px** từ 900px (`.wrap3`); khung tối đa `--max` **1320px**; trang `.s` dừng ở **1280px** và canh giữa |
| Nét kẻ | 2px mực cho đầu mục `.sec .hd` và chân trang; 1px mực dưới đầu sheet, trên bảng size, trên `.sum3`, quanh `.menu3`; 1px `--hair` cho mọi nét ngăn khác; **1px đứt nét mật ong** cho mép may của Số (bìa, thanh bên, leader mục lục trên vải, dấu SOLD OUT) |
| Leader mục lục | chấm `--line` trên giấy (`.card3 .toc .ld`, `.sizes .ld`), đứt nét mật ong trên vải (`.tocrow .ld`); tối thiểu 12–18px, không bao giờ là hai chấm |
| Chiều cao nút | **40px** `.btn`, `.addbtn3`; **34px** `.btn.sm` (36 trong quản trị); ô số lượng `.qty3` 44 |
| Chiều cao ô nhập | `.inp` **40px** trần; **44px** trong `.field3` (form có nhãn) và trên thanh công cụ bảng quản trị; `.inp.area` 78 / `.field3 .inp.area` ≥ 88 |
| Khung trang | `.s.v3` = cột flex `min-height:100dvh`, `main{flex:1 0 auto}` — chân trang `.foot3` chạm đáy; quản trị `.s.adm3` là hàng flex |
| Cột hẹp | `.narrow` 600px từ 900px — **cột chính là lề**, mọi thứ bên trong bỏ lề 40 |
| Sheet | `.sheetbody` đáy màn, tối đa 86dvh, bo 4px hai góc trên, lề trong `--gut`; từ 900px là hộp **520px** giữa màn |
| Nav | `.nav3` dính, **56px** điện thoại / **64px** desktop; nội dung cuộn tới phải chừa `scroll-margin-top:72px` (`.s.v3 a, .s.v3 [tabindex]`, `.sec.anchor`) |

**Ảnh sản phẩm luôn là 4:5.** `.card3 .img` khai báo `aspect-ratio:4/5` *và*
`display:block` — bỏ `display:block` thì trên thẻ `<a>` cả hai khai báo bị bỏ
qua âm thầm. Ảnh bìa là **1:1 tràn lề** trên điện thoại (390×390) và cột 7/12
cao ≥ 640 trên desktop; ảnh trong ô bảng quản trị phải `display:inline-block`
vì preflight đặt `img{display:block}`.

**Bìa Số.** Điện thoại: ảnh rồi nhãn đen may đứt nét mật ong phía trên (`.face`,
`border-top:1px dashed var(--brand)`), "SỐ" 11px đặt lên baseline số 96px mật
ong, badge trạng thái + giờ đóng, đồng hồ 32px, câu đề 30px, lead `--stage-ink2`
44ch, nút mật ong full-width, liên kết gạch chân, "Còn ít" hai dòng `.tocrow`.
Desktop: lưới `5fr 7fr`, nhãn trái (mép may chuyển sang `border-right`), ảnh
phải `order:2`, `min-height:640`, đồng hồ 40px, số 168px. Teaser `.cover.soon` là
cùng bìa nhưng số nhạt 72/120, hai ô ảnh 4:5 mờ 45% với badge "Chưa mở".

---

## 5. Vùng chạm — đo, không ước

Sàn là **44×44px** trên mobile (PRODUCT.md). Cách hệ này đạt được nó — **giữ
nguyên từ v2, đo lại ở từng lát v3**:

Một điều khiển cao 34–40px vẫn **trông** nhẹ, nhưng mang một lớp phủ vô hình
(`::after` với `inset` âm) nới vùng chạm ra ≥ 44. Lớp phủ không tốn một pixel bố
cục nào. Đếm được 30 lớp phủ như thế trong 16 tệp.

**Phép đo là `elementFromPoint` dò ra từ tâm, không phải `getBoundingClientRect`.**
Và vì phép đo **dừng một pixel bên trong mỗi mép**, một hộp đúng 44 đo ra 42:
từ lát 1 của v3 mọi lớp phủ nhắm **danh nghĩa 46** để máy đọc ra 44 —
`.btn::after` ±3 (40 → 46), `.btn.sm::after` ±5 trong quản trị (36 → 46),
`.chip3::after` ±5 (36 → 46), `.seg3 a::after` ±5, `.itag::after` ±9 (28 → 46),
`.cb::after` −13 bốn phía (20 → 46). `<input>` là replaced element **không mang
được `::after`**, nên hộp tự cao 44 (`.field3 .inp`, `.qty3 input`) hoặc nhãn
bọc mang lớp phủ (`.qntap` ±5 quanh 34).

Sáu bẫy đã gặp thật, ghi lại để không gặp lần nữa:

1. **Cha có `overflow:hidden`/`overflow-x:auto` cắt mất lớp phủ.** `.seg3` từng
   thế (đo ra 37) — chữa bằng bỏ overflow và bo góc từng đoạn đầu/cuối; `.tabs3`
   và `.chips3` cuộn ngang chừa padding **bên trong** vùng bị cắt.
2. **Lớp phủ của phần tử bên cạnh đè lên.** Hai vùng 44 không chia nhau được
   một khe 6px; hàng nút chặt nhất trong app chừa 10px, hai lớp phủ lấy 6.
3. **"Hộp icon chính là vùng chạm" — sai.** `.ic` là 18px; nút icon nav `.ib`
   là 40×44, hộp `.rowmenu` 36 + phủ −4.
4. **Lớp phủ dài quá ăn vào ô nhập bên dưới** (`.cartline3 .n a` ±14, `.crumbs a`
   `-13px 0 -14px` ở ≤ 460 — đúng bằng padding của hàng, không hơn).
5. **Nút trong menu portal không đi qua `.s`** — `.menu3 button{min-height:44}`
   ở ≤ 460 tự khai.
6. **Đường dẫn 44px cho liên kết chữ** — `a.lnk`/`button.lnk` ở ≤ 460 mang hộp
   `max(100%,44px)×44` canh giữa chữ; liên kết đứng một mình trong quản trị
   (`td a`, `.kpi3 a`, `.queue3 .q b a`) mang phủ ±12/±14.

Hai miễn trừ có chủ ý, cả hai theo WCAG 2.5.5, **giữ từ v2**:
- **Nút icon trên nav rộng 40px** (cao 44) trên điện thoại; từ 900px là 44×44.
- **Liên kết chân trang cao 44px mỗi hàng trên điện thoại** (hàng lớn lên thay vì
  lớp phủ, vì năm liên kết nhịp 34 sẽ đè nhau), từ 900px về 32.

---

## 6. Con trỏ, hover, và những bề mặt trình duyệt tự vẽ

`app/styles/interaction.css` giữ tầng này (port muộn từ `prototype/shell.css`;
mỗi thành phần v3 tự khai hover/cursor/target nơi nó được vẽ).

Những gì hệ **tự vẽ** thay vì để mặc trình duyệt — **giữ từ v2**:

- Vòng focus: `2px solid var(--mark)` (#c28800, 3,4:1 — mật ong chỉ 1,9:1 nên
  không dùng), offset 2px, bo `--r-sm` — và **tắt hẳn khi con trỏ đang điều
  khiển** (`html[data-pointer]`, script đầu `<body>` trong `app/layout.tsx`
  đặt cờ trước paint đầu; Tab gỡ cờ), vì `:focus-visible` một mình không giữ
  được lời hứa đó trên Chrome. **Vòng focus là `outline` duy nhất trong hệ**
  (QĐ-23); đường may của dấu SOLD OUT từng là `outline: dashed` và đã thành
  `::after` có `border` thật. Muốn một đường thì vẽ một đường.
- Bôi đen (`::selection` mật ong/mực), con nháy (`caret-color` mật ong), thanh
  cuộn (`::-webkit-scrollbar` 10px, thumb `--line`).
- `input`, `textarea` gỡ `appearance`; **không có `<select>` gốc nào trong toàn
  bộ app** — `components/ui/Select.tsx` mở `Menu3`, nút `.selbtn` trông như ô nhập.

Hover/press: `.btn` sáng lên `--gold-400`, `.btn.ink` nền `--plate`, `.btn.quiet`
chữ `--brand-text`; hàng bảng/menu/nút icon nền `--plate`; liên kết gạch chân
`text-underline-offset 3px`; `:active` `translateY(1px)`; mọi transition ≤ 0,5s
và tắt dưới `prefers-reduced-motion`. Nút vô hiệu: nền `--gold-50`, chữ `--ink2`,
viền `--line`, `cursor:not-allowed` — **nút vô hiệu ghi việc cần làm** ("Chọn
size trước", "đang chuẩn bị").

### Lớp nổi: một panel portal ra `body` KHÔNG thừa kế gì từ `.s`

*Giữ từ v2 (2026-09-20), vẫn đúng cho bốn lớp v3.*

1. **Selector không được đi qua tổ tiên.** Mọi quy tắc bắt đầu bằng chính tên
   lớp nổi.
2. **Biến thể phải là class, không phải vị trí.**
3. **Panel phải tự khai kiểu chữ.** `font-family` · `font-size` · `line-height`
   · `color` viết thẳng; thiếu chúng thì menu hiện bằng serif 16px.

Danh sách lớp portal ra `body` hiện có: `.sheetwrap` (`components/ui/Sheet.tsx`
— scrim `rgba(23,20,16,.5)`, `role="dialog"`, khoá cuộn, tiêu điểm vào và trả về;
panel bên trong mang `.s` để nút, chip, bảng trong nó là của hệ), `.menu3`
(`components/ui/Menu3.tsx` — `position:fixed` vì thanh điều khiển điện thoại là
scroll container; viền 1px mực, **không bóng**; cả `SortControl` và `Select` mở
nó), `.toast` (`components/shop/Toast.tsx`, `role="status"`). Modal v2 đã đi;
khu quản trị dùng `AdminSheet` trên `.sheetwrap`.

---

## 7. Hai bề mặt

| | Cửa hàng | Khu quản trị |
|---|---|---|
| Gốc | `.s.v3` | `.s.adm3` (một tên, không phải `.s.adm.v3`, để mọi quy tắc ≥ 0,3,0 không đua với cửa hàng) |
| Nền | trắng | `--plate`, panel trắng viền `--hair` |
| Bề ngang | 390px → breakpoint 900px → khung 1280px | **chỉ desktop, `min-width:1180px`** |
| Điều hướng | `.nav3` + `.foot3` | thanh bên **208px** vải đen, dính 100dvh, wordmark mật ong, mục đang mở nền trắng 8%, số đếm mật ong/mực (đen/mật ong trên mục đang mở), chân `SimBar` may đứt nét mật ong |

Khu quản trị **không có bản điện thoại, và đó là chủ ý** (giữ từ v2). Bảng dữ
liệu là `.dt3` + `components/admin/Table3.tsx`: thanh công cụ 44px (ô tìm, chip,
select), **thanh hàng loạt thay thế thanh công cụ** bằng vải đen, tab trạng thái
có đếm, `th` micro viết hoa, hàng hover `--plate`, hàng chọn `--brand-soft`, ô
chọn `.cb` 20px đảo mực, menu `⋯` `.rowmenu`, chân trang có số trang (trang đang
mở `--sel`). **Lọc, tab, kỳ xem và trang sống trong URL** (QĐ-8, giữ từ v2:
`.seg3` là liên kết `?days=`); cột hiện/ẩn trong `brand.adminCols`. Cột số canh
phải là `td.right` (không phải `.num` — `.s .num` là vai chữ hiển thị).

Chỉ **một** breakpoint cho cửa hàng: `@media (min-width:900px)` trong
`desktop.css` và các khối desktop cuối mỗi tệp; `max-width:460px` chỉ dùng cho
vùng chạm; `max-width:899.98px` cho vài bố cục điện thoại.

---

## 8. Thành phần — bảng tra

| Lớp | Là gì | Ở đâu |
|---|---|---|
| `.btn` + `ink` `quiet` `ghost` `sm` `wide` | nút: mật ong (chính) · viền mực (thứ hai) · chữ gạch chân (lối ra) · viền mật ong chữ link (v2, chỉ còn trên bìa và restate màu trên vải) · 34px · đầy cột | `buttons.css`, hover ở `interaction.css` |
| `.btn:disabled` / `[aria-disabled]` | trạng thái nghỉ của nút vô hiệu, đứng **cuối** các tông để thắng thứ tự nguồn | `buttons.css` |
| `.lnk` | liên kết chữ đứng một mình, gạch chân mờ 45% | `buttons.css` |
| `.badge` + `ok` `warn` `info` `hot` `shut` `flat` | viên trạng thái họ B: 24px, 11/700 hoa `.08em`, không viền, luôn kèm chấm; `ok` = vải đen/mật ong (đang bán, đã thanh toán); `warn`/`""`/`shut` = vải mộc `--hair`; `flat` = nhãn tên, mật ong nhạt, không chấm | `buttons.css`, `components/ui/Badge.tsx` |
| `.chip3` (+ `.on` `.cnt` `.dot`) trong `.chips3(.wrapped)` | chip lọc 36px viền `--line`, chọn đảo `--sel`; hàng cuộn ngang có mask mờ mép | `listing.css` |
| `.tabs3` + `.cnt` | tab họ là liên kết, gạch dưới 2px mật ong khi `.on` | `listing.css` |
| `.card3` + `.img` `.imgbox` `.stamp` `.meta` `.toc(.n .ld .p)` `.ct(.low)` `.kind` `.act .addbtn3(.view)` `.unsave` | thẻ sản phẩm = **một mục trong mục lục**: ảnh 4:5, dòng tên…giá có leader, số còn, một nút viền mực; `.sold` mờ ảnh 50% + dấu SOLD OUT | `cards.css` |
| `.grid3` | lưới 2 cột → 3 cột từ 900px, `minmax(0,1fr)` | `home.css`, `listing.css` |
| `.cover` (+ `.soon` `.shut` `.first`) với `.photo` `.face` `.issue(.k .num)` `.state` `.clock` `.t` `.lead` `.cta` `.lows` | bìa Số ba trạng thái; đồng hồ chỉ dựng ở trình duyệt (`Countdown`, chữ "00" ẩn giữ chỗ) | `home.css` |
| `.tocrow` | một dòng mục lục trên vải: tên · leader đứt nét mật ong · giá, ≥ 44px | `home.css` |
| `.sec` + `.hd(h2 .meta .more)` `.anchor` | mục có tiêu đề, đếm, liên kết cuối, kẻ 2px mực | `home.css` |
| `.index .row` | chỉ mục họ: hàng 72px, ảnh 48×60 — **hàng, không phải ô** | `home.css` |
| `.sec .rules .r` | bốn quy tắc: danh sách định nghĩa, không icon, không thẻ | `home.css` |
| `.past` | dòng "Số 04 · đã đóng" | `home.css` |
| `.band.remind` | dải nhắc: vải đen, chuông và liên kết mật ong, 44px | `nav.css` + `home.css` |
| `.nav3` + `.wm` `.itag(.soon/.shut .cd)` `.links` `.icons .ib b` | nav dính: wordmark 16px cách `.14em`, tem Số vải đen 28/32px, 5 liên kết họ + đếm ngược trong tem từ 900px, 4 nút icon với bong bóng đếm đen/mật ong | `nav.css`, `desktop.css` |
| `.foot3` + `.in` `.cols` `.cal` `.colophon` | chân trang: kẻ 2px mực, 2 cột → 4 cột, lịch ra Số từ fixture, `NeedWrite` cho pháp nhân/kênh liên hệ | `base.css`, `desktop.css` |
| `.wrap3` | lề trang 18 → 40 + `max-width:1320` | `base.css`, `desktop.css` |
| `.ic` (+ `.sm` `.mk` `.duo`) | icon Iconsax Linear, hộp 18 / 15 / 12 (28 ở `.empty3`), stroke 1.5, **màu thừa kế**; `plus`/`minus`/`check` cắt viewBox quang học (`OPTICAL` trong `components/icon/Icon.tsx`: 4/16, 4/16, 6.5/11); `--il`/`--ir` cắt lề trong suốt khỏi hộp bố cục khi đứng cạnh chữ, **không** trong cột icon của menu | `nav.css`, `components/icon/` |
| `.note3(.hot)` | khối ghi chú trên mật ong nhạt / đỏ nhạt, icon một cột | `base.css` |
| `.needwrite` | chỗ **chưa ai viết** — khung gạch đứt nói rõ cái gì thuộc về chỗ đó | `admin.css` (restate trong `.foot3`) |
| `.empty3` | trạng thái rỗng: canh **trái**, 44ch, icon 28, h2, nút inline | `lists.css` |
| `.row` (+ `.thumb` `.t` `.d` `.amt` `.fill`) | hàng danh sách phẳng của tài khoản/quản trị | `lists.css` |
| `.inp` (+ `.area` `.sel` `.bad`), `.selbtn`, `.box(.on)`, `.radio(.on)` | ô nhập trần 40px, nút select, hộp đánh dấu 17px v2 | `forms.css` |
| `.field3` + `.lbl(.opt)` `.help` `.err` | trường form v3 (`components/ui/Field3.tsx`): nhãn micro viết hoa `--ink2`, ô 44px chữ 14, focus viền mật ong, lỗi `--hot` có icon | `checkout.css` |
| `.pdp3` + `.crumbs` `.gallery3` `.sw` `.sizes` `.mysize` `.switch3` `.stock .meter(.hot/.gone)` `.buybar3(.show)` | trang sản phẩm: đĩa màu 32px vòng `--line`, **bảng size một dòng một size** với leader chấm, ô đánh dấu 20px và dòng chọn đảo `--sel` tick mật ong, công tắc 40×24, thanh tồn kho 4px (`--mark` / `--hot` / mực khi hết), thanh mua dính đáy | `product.css` |
| `.steps3 .st(.done/.on)` | thanh bước: vòng 28px, xong = mực/tick mật ong, đang = mật ong | `checkout.css` |
| `.cartline3` + `.thumb` `.n` `.kind i` `.p` `.ctl` `.stockline(.hot)` `.acts` `.fixes` | dòng giỏ lưới 72px ảnh 4:5 | `checkout.css` |
| `.qty3` + `.qntap` | ô số lượng 44px: hai nút 40×44, ô 40 | `checkout.css`, `lists.css` |
| `.shipbar3(.ok)` `.promo3` `.promoon3` `.promises3` `.later` | thanh miễn phí giao, ô mã, mã đã áp, cam kết, "để dành" (`brand.later`) | `checkout.css` |
| `.picks3 .pick[aria-checked]` | hàng chọn kiểu radio 20px (địa chỉ, giao, thanh toán); chọn đảo mực | `checkout.css` |
| `.consent[aria-checked]` | ô đồng ý | `checkout.css` |
| `.sum3 .r(.total)` | cộng tiền: kẻ 1px mực trên, tổng bằng Unbounded | `checkout.css` |
| `.panel3` (+ `h2/h3 .meta .more`), `.panels3`, `.two3`, `.row2` | panel viền `--hair`, lưới hai cột | `checkout.css` |
| `.pghead` + `.back` `.meta` | đầu trang: h1 + dòng phụ + lối về | `checkout.css` |
| `.orderbox3` | `<details>` "Đơn của bạn · N món", mở sẵn từ 900px bằng `matchMedia` | `checkout.css` |
| `.done3` `.deadline` `.bank` `.qrrow` `.qrph` `.ol` `.tl3 .m(.done/.now/.late/.todo)` `.kvs` `.invoice` `.lookup` `.result3` | xác nhận đơn, hạn chuyển khoản 12 giờ (đồng hồ cùng cấu trúc bìa), thông tin ngân hàng, dòng thời gian (mốc 12px: xong = mực, đang = mật ong, trễ = viền đỏ), cặp khoá-giá trị, hoá đơn `@media print`, tra đơn | `checkout.css` |
| `.acct3` + `.acctrail3(.who .ava .out nav a .cnt .dotn)` `.content` `.acctgrid3` `.rows3` `.notif(.read)` `.prefrow .switch3` `.codes .code` `.thumbs3` `.authcard3` `.forgot` `.divider3` | tài khoản: rail trái từ 900px với số đếm, hàng đơn `OrderRow3`, thông báo (`brand.notif.read`), công tắc (`brand.prefs`), mã, thẻ đăng nhập | `account.css` |
| `.prose` `.prep` `.faq3` `.nf` `.solds` `.checks3` | trang chữ: giới thiệu, FAQ (`<details>`), đổi trả, liên hệ, 404, kho lưu trữ Số đã đóng, checklist mật khẩu | `pages.css` |
| `.s.adm3` + `.side(.wm nav a .cnt .simbar)` `.main` `.top(h1 .sub .crumb .acts)` `.seg3` `.kpis3(.five) .kpi3` `.panel3 .bd` `.split3` `.fine3` `.chart3(.hi .zero .peak) .axis .daytable` `.queue3 .q(.sub .late .act)` `.rank3 .r(.two)` `.dt3(.bar(.bulk) .stabs .cb .rowmenu .foot .pages .none)` `.avatar` `.nextstep` `.fgrid` `.totalbar` `.addrblock` `.notes3 .ni` `.invgrid` `.delta` `.log3` `.ctag` `.slips .slip` + `@media print` | khu quản trị v3 | `admin.css` |
| `.sheetwrap` + `.scrim` `.sheetbody` `.grab` `.shead(.x)` `.sact`; `.menu3` + `.ticked` `.tally` `.mk`; `.toast(.show)` | ba lớp nổi portal ra `body` | `sheet.css` |
| `.sr-only` | utility duy nhất, tự định nghĩa | `base.css` |

**Bẫy trùng tên đã gặp trong đợt v3** (mỗi cái tốn một buổi; tên mới được grep
trước khi đặt): `.sec` (mục trang chủ) vs `.btn.sec` của mock → `.btn.ink`;
`.num` (vai chữ) vs ô số bảng → `td.right`; `.ph` (ảnh v2) vs placeholder →
`data-ph`; `.lead` (đoạn dưới tiêu đề, 60ch + lề) rơi lên `<section>` → `.first`;
`.sub` là thanh phụ v2 (flex + kẻ) rơi lên dòng phụ quản trị → reset một lần
`.s.adm3 .sub`; `.lbl` viết hoa rơi lên nhãn biểu đồ → `.peak`; `.rules`
(checklist mật khẩu) vs bốn quy tắc → `.sec .rules`; `.row` (lists.css) vs
`.index .row` restate; `.grid`/`.grow` là utility Tailwind → `.grid3`/`.fill`;
`.kick` v2 rò rỉ đã xoá cùng lớp v2; preflight `img{display:block}` trong ô bảng.

**Kho trên thiết bị** (localStorage, mỗi khoá một phiên bản `v` và parse phòng
thủ): `brand.session` (bỏ ở B1: phiên là cookie Supabase Auth) · `brand.cart` giỏ · `brand.later` để dành
· `brand.promo` mã đang áp · `brand.wishlist` · `brand.orders` (bỏ ở B2: đơn nằm trong Postgres; người vãng lai giữ khoá biên nhận trong cookie httpOnly `guest_orders`) · `brand.addresses`
sổ địa chỉ · `brand.reminder` nhắc Số · `brand.searches` tìm gần đây ·
`brand.prefs` công tắc · `brand.notif.read` thông báo đã đọc · `brand.adminSim`
nhật ký sự kiện của khu quản trị (**một chiều từ B2**: chỉ khu quản trị đọc; màn khách đọc Postgres, nên nhận tiền / bàn giao / huỷ mô phỏng chưa tới khách cho tới B3)
· `brand.adminCols` cột bảng. Không khoá nào ở `sessionStorage`.

**Đồng hồ mẫu (QĐ-24).** App sống trong 24 giờ sau mốc
`2026-09-20T18:50:00+07:00`; `demoNow()` = mốc + (giờ thật − mốc) mod 24h, nên
**giờ trong ngày là giờ thật**, chỉ ngày bị ghim. `new Date()` chỉ được gọi
trong `lib/clock.ts` và test (`lib/clock.test.ts` quét `lib/`, `components/`,
`app/`). Trạng thái đơn chờ chuyển khoản quá hạn được suy ra bằng
`effectiveStatus()` (`lib/customer-orders.ts`) chứ không ghi vào fixture.

---

## 9. Ba quy tắc không thương lượng

*Giữ nguyên từ v2.*

**1 · Không bịa số.** Mọi con số trong khu quản trị suy ra từ `ORDERS` và
`CATALOG`. Chỗ nào dữ liệu không có thì **bỏ ô đó đi**, không điền một con số
nghe hợp lý. Mọi màn quản trị mang badge `dữ liệu mô phỏng` trong `AdminTop` và
`SimBar` nói rõ đồng hồ mẫu, không phải một prop tắt được. Trên bìa, "Mười mẫu"
là con số duy nhất được gõ thay vì đếm — vì nó là một câu (`HOME_COVER`).

**2 · Không bịa chữ.** Không có câu chuyện thương hiệu, xưởng may, đối tác,
giải thưởng hay testimonial. Chỗ chưa có sự thật dùng `NeedWrite` (`.needwrite`)
hoặc `.prep` trên `/about` — nói ra thay vì lấp tạm.

**3 · Nút phải làm được việc nó nói.** Không có nút chết. Nút vô hiệu ghi việc
cần làm; "Tải CSV" tải CSV thật; `Table3` bắt buộc hành động thật cho mọi thao
tác hàng loạt.

---

## 10. Đã đo, không phải đã tin

**Đợt v2** (2026-09-20/21, 34 route, 526 → 720 test): tương phản 0 chỗ dưới AA
trên 1.341/1.350 phần tử chữ; 342 điều khiển ở 390px, 0 dưới 44 ngoài hai miễn
trừ ở §5; 0 tràn ngang; 0 `<select>` gốc; lớp nổi mở từng cái rồi mới đo. Chi
tiết từng lát v2 nằm trong lịch sử của tệp này (bản 2026-09-21).

**Đợt v3** (21–23/09/2026, hướng NHÃN, sáu lát + lượt quét cuối):
- **Lát 0** (token, font cặp D, nav/footer/khung `.s.v3`): giá trị chép từ
  `prototype/v3/v3.css` khối `html[data-dir="nhan"]`; mọi cặp màu tính trước
  (`scratchpad/v3/contrast.js`); vòng focus chốt `--mark` vì mật ong 1,9:1.
- **Lát 1** (bìa, thẻ `.card3`, chỉ mục, bốn quy tắc, teaser): lớp phủ `.btn`
  nới 2 → 3 vì `elementFromPoint` đọc 44 ra 42; hình học bìa trùng mock từng hộp
  ở 390 và 1280 (`.impeccable/review/desktop.png`, `mobile.png`).
- **Lát 2** (danh mục, tìm kiếm, PDP, `Menu3`, `.btn.ink`): bảng size, đĩa màu,
  thanh tồn kho, thanh mua dính đo so `prototype/v3/product.html`
  (`desktop-products.png`, `mobile-product.png`).
- **Lát 3** (giỏ, thanh toán, xác nhận, tra đơn, hoá đơn in): `.field3` 44px,
  `.qty3` 44, `scroll-margin-top:72`.
- **Lát 4** (tài khoản, đăng nhập, trang chữ, kho Số đã đóng; bỏ utilities
  Tailwind — QĐ-23; `.outline` → `.btn.ink`, `.grid`/`.grow` → `.grid3`/`.fill`;
  `lib/classnames.test.ts`).
- **Lát 5** (khu quản trị `.s.adm3`, `Table3`, `AdminSheet`, `brand.adminSim`
  hai chiều; `admin-1280.png`).
- **Lát 6** (dọn lớp v2: xoá `table.css`, `/system`, modal, nav2, foot2, hero2,
  card v2, chips, steps, tl, sum…; đo lại 7 cặp hoà chỉ định trong
  `globals.css`): **16 tệp / 3.740 dòng CSS**.

Cách đo không đổi: `tools/layout-sweep.js` quét route cửa hàng × 390/1280 và
route quản trị × 1280 — console, tràn ngang, chữ < 11px, hộp inline sai, ảnh
lệch tỉ lệ, phần tử bị cắt, con trỏ mũi tên, vùng chạm bằng `elementFromPoint`;
lớp nổi **mở ra rồi mới đo**; ảnh chụp so mock từng hộp trước khi ghi vào đây.
