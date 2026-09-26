---
name: HIVE — nhãn dệt
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
  plate: "5px"
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
  nav-logo:
    height: "30px"
  nav-logo-desktop:
    height: "32px"
  nav-issue-tag:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.brand}"
    rounded: "{rounded.plate}"
    padding: "0 17px"
    height: "28px"
  nav-issue-tag-hover:
    backgroundColor: "{colors.stage-hair}"
    textColor: "{colors.brand}"
  nav-issue-tag-desktop:
    padding: "0 19px"
    height: "32px"
  nav-icon-button:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    width: "40px"
    height: "44px"
  nav-icon-button-desktop:
    width: "44px"
    height: "44px"
  count-bubble:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "16px"
    padding: "0 4px"
  cover:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.stage-ink}"
    padding: "16px 18px 32px"
  sold-out-stamp:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.brand}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "28px"
  sold-out-stamp-desktop:
    padding: "0 12px"
    height: "32px"
  card-issue-tag:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.brand}"
    rounded: "{rounded.plate}"
    padding: "0 17px"
    height: "28px"
  card-issue-tag-desktop:
    padding: "0 19px"
    height: "32px"
---

# DESIGN.md — hệ thiết kế, đọc ra từ code đã dựng

Tài liệu này **mô tả cái đang chạy**, không mô tả ý định. Mọi token trong
frontmatter và dưới đây tồn tại thật trong `app/globals.css`; mọi con số lấy từ
`app/styles/*.css` (**4.340 dòng, mười sáu tệp** — đếm lại 2026-09-26 sau lát 14;
sau lát 13 là 4.324; sau lát 12 (đợt mẫu cố định) là 4.108; sau lát 10 của v3 là 4.003; lát 6 đã quét sạch lớp v2 và để lại 3.740; `table.css` là tệp thứ
mười bảy và đã đi cùng route `/system`). Chỗ nào tài liệu và code lệch nhau thì
**code đúng** — sửa tài liệu, đừng sửa code cho khớp tài liệu.

Ghi lần đầu 2026-09-20 sau Phase 6 (đợt v2). **Viết lại 2026-09-23 sau đợt v3,
hướng NHÃN (nhãn dệt)**: vải đen, chỉ mật ong, sàn trắng. Những quyết định của
v2 còn sống được giữ nguyên và ghi rõ; những gì v3 thay thì ghi theo bản dựng.

**Cập nhật 2026-09-25 sau lát 8–10 của v3**, đọc từ code trên `main`: thanh
điều hướng biển số (§2, §4, §8), lớp chờ khi chuyển trang và thứ tự chồng lớp
(§6, §8), tệp thương hiệu QĐ-31 (§1), các phép đo tương ứng (§10).

**Cập nhật 2026-09-25 sau đợt mẫu cố định** — B5 dữ liệu (`28ee1bc`), lát 11
cửa hàng (`8558b82`, `3c04d6f`), lát 12 quản trị (`bd44b0c`, `50c3aeb`): hình
phẳng của mẫu cố định (§1), biển Số trên ảnh thẻ (§2, §4, §8), dấu SOLD OUT cùng
cỡ biển và thẻ hẹp (§4, §8), tên có tiền tố Số (§3), hai trang danh sách, thẻ mẫu
cố định và trang chủ (§8), lớp chờ (§6), tab Cố định trong quản trị (§7, §8).

**Cập nhật 2026-09-26 sau lát 13 của v3** — lượt đánh bóng toàn app (`025fc2d`,
duyệt `0e16821`, brief `tasks/briefs/v3-lat-13-polish.md`). Không token, màu,
mặt chữ, bo góc hay thành phần nào đổi danh tính. Đổi: khung trải hết bề ngang,
chỉ nội dung dừng ở 1280 (§4, §7, §8); dải tablet 600–899 (§7); `text-wrap-style`
và ký tự giữ cụm chữ (§3); vòng focus lõm trong hàng cuộn, toast `max-content`
(§6); liên kết trên dòng đã chọn của bảng quản trị (§2); nhịp hàng form và các
luật căn hàng mới (§4, §8); khối checklist mật khẩu v2 `.s .rules` đã xoá (§3,
§8); chữ trên màn không giải thích khái niệm (§3); phép đo (§10).

**Cập nhật 2026-09-26 sau lát 14 của v3** — Số 05 mặc ảnh của chính nó
(`b73c6cf`, brief `tasks/briefs/v3-lat-14-photos.md`). Không token, màu, mặt
chữ hay bo góc nào đổi. Đổi: nguồn ảnh — ảnh thẻ và ảnh mặc trên người sinh bằng
AI trong `public/shots/`, danh sách khung còn mượn (§1); bìa Số đã đóng giữ ảnh
cao (§4); dải tablet giữ khung 4:5 nguyên, không cắt (§7); gallery trang sản
phẩm là các khung của màu đang chọn, ô ảnh quản trị "Ảnh thật", tên khung mượn
có màu (§8); phép đo (§10).

---

## 1. Nguồn của sự thật

| Thứ | Ở đâu |
|---|---|
| Token màu, bo góc, font, chín bậc khoảng cách, chín vai chữ | `app/globals.css` — khối `@theme` (màu, bo góc, font) rồi bí danh ngắn và các bậc `--s*` / `--fs-*` trong `:root` |
| CSS thành phần | `app/styles/*.css`, nạp theo thứ tự đã ghi trong `globals.css` |
| Mock đã duyệt (thước đo của bản dựng) | `prototype/v3/*.html` + `v3.css`, `v3-pages.css`, `v3.js`; bảng thành phần `prototype/v3/brand.html`, họ badge `badges.html` (họ B "vải đen"), từ vựng `voice.html` |
| Từ vựng | `lib/lexicon.ts` — `LEX` ("Số"), `HOME_COVER`, `ABOUT_LEAD`, `issueLabel()`; tên có tiền tố `issueCode()` · `stylePrefix()` · `styleName()` (§3); `FIXED_WORD` "Cố định", chữ chỉ khu quản trị nói |
| Địa chỉ của Số | `lib/drop.ts` — `issueHref(no)` → `/so/N`, `wayToShop()` (§8) |
| Đồng hồ | `lib/clock.ts` — `demoNow()` (QĐ-24) |
| Logo | `prototype/name/logo/` — mark M2 (QĐ-29), chữ W3 (QĐ-30). Thanh điều hướng chép `hive-lockup-nav.svg` vào `components/shop/NavLogo.tsx`, lớp chờ chép `hive-mark.svg` vào `components/shop/WaitVeil.tsx`, ảnh chia sẻ đọc `lib/brand/logo.ts` do script sinh. Màu của logo viết thẳng, **không đọc token**: logo không theo theme |
| Tên, mô tả, màu trình duyệt | `lib/site.ts` — `SITE_NAME`, `SITE_DESCRIPTION` (mô tả A), `THEME_COLOR`, `siteOrigin()` → `metadataBase` |
| Ảnh | `lib/photos.ts` — `photoUrl()` (mọi URL ảnh, bốn loại khoá), `lookbookUrl()`, `PHOTO_IDS`; `lib/shots.ts` — ảnh đi kèm app (`SHOTS`, `shotKey`); `lib/flats.ts` — hình phẳng. Xem mục con "Ảnh" dưới |
| Nhịp lớp chờ | `lib/wait.ts` — `WAIT` (mọi thời lượng), `shouldVeil` (khi nào), `showingFrame` / `closingFrame` (từng frame) |

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

Mọi URL ảnh dựng ở **một chỗ**, `photoUrl(key, width, quality)` trong `lib/photos.ts`, và khoá tự nói nó là
loại nào, xét theo thứ tự: **ảnh tải lên** (`up/<32 hex>.webp|jpg`) · **ảnh đi kèm app** (`shot-<mẫu>-<màu>`) ·
**hình phẳng** (`flat-<dáng>-<màu>`, mục con dưới) · còn lại là **khung mượn** Unsplash (`PHOTO_IDS`); khoá lạ, kể
cả `shot-…`/`flat-…` không có tệp, rơi về `hero`. Tệp nhận diện — favicon, biểu tượng, ảnh chia sẻ — ở mục con cuối.

**Ảnh của Số 05 — sinh bằng AI, đi kèm app (lát 14, 26/09/2026).** Mười mẫu của Số 05, **21 phối màu**, mặc ảnh
của chính chúng trong `public/shots/`: ảnh thẻ (món đồ trên ma-nơ-canh vô hình, trước giấy studio)
`<mẫu>-<màu>.webp` và ảnh mặc trên người `<mẫu>-<màu>-look.webp` — **42 tệp WebP 1200×1500** (4:5), tổng
**7,2 MB**. Làm bằng ChatGPT (GPT Image) từ prompt trong `tasks/anh-san-pham-prompt.md` và
`tasks/lookbook-register.md`. Khoá `shot-<mẫu>-<màu>` (`shotKey`; `<mẫu>` là gốc `khoi`, không phải `s05-khoi`),
danh sách `SHOTS` trong `lib/shots.ts`, `lib/shots.test.ts` giữ khớp với tệp trên đĩa và catalogue. `photoUrl`
trả **ảnh thẻ** (`/shots/khoi-black.webp`, `next/image` tối ưu như ảnh tải lên) — đó là ảnh của màu ấy ở mọi nơi
có ảnh. **Ảnh mặc trên người** chỉ tới qua `lookbookUrl(key)`, suy ra từ chính khoá ảnh thẻ, không có cột riêng,
và chỉ gallery trang sản phẩm gọi nó (§8); màu có ảnh thẻ bị thay bằng ảnh tải lên thì mất luôn khung ấy, vì nó
cho thấy món đồ đã bị thay.

Đường ống **`scripts/shots.ts`** biến `photos-raw/` (không vào git) thành `public/shots/`:
- **Ảnh thẻ** vào một khung chung: món đồ vừa hộp **84% bề ngang hoặc 82% chiều cao**, cái nào chạm trước; mép
  trên (cổ áo, mũ, cạp quần) ở **12%** chiều cao; căn theo trục của chính nó. **Chỉ nền** được đưa về một tông
  giấy chung **`PAPER = #C3BBB2`** — trung vị giấy của 19 ảnh thẻ không phải KHÓI, ghi thành hằng để ảnh làm lại
  sau rơi đúng tông ấy; điểm ảnh của món đồ giữ nguyên. **KHÓI giữ nền gốc** (`KEEP_PAPER`: `khoi-black`,
  `khoi-cream`) — nền vải xám loang có vignette, làm phẳng thì làm sáng luôn hình in sát gấu — cho tới khi hai ảnh
  được tạo lại trên giấy chuẩn.
- **Ảnh mặc trên người** chỉ đổi cỡ về 1200×1500 (Lanczos): không chỉnh tông, không cắt.
- WebP chất lượng **90** (ảnh thẻ) / **86** (ảnh mặc). **Nguồn gốc ghi bằng XMP** trong từng tệp: IPTC digital
  source type `trainedAlgorithmicMedia`, công cụ, tên tệp gốc và prompt như tệp prompt ghi — C2PA của ChatGPT
  không sống qua lần nén lại. `impeccable embed-prompt --scan` không đọc XMP nên báo thiếu cả 42 tệp; đã chấp nhận.

Chạy lại cho đúng cặp đã làm lại: `npx tsx scripts/shots.ts khoi-black` (`--measure` in lại trung vị giấy,
`--debug <dir>` ghi mặt nạ để xem trước khi tin một tệp); `lib/shots.test.ts` đỏ khi thiếu tệp.

**Còn mượn — khung Unsplash** qua `PHOTO_IDS` (`images.unsplash.com/photo-<id>`, Unsplash License, không plate
trong repo, không ghi tên tác giả trên màn): **bìa trang chủ `hero`**, mọi mẫu **Số 03 và 04**, hai teaser **Số 06**.
Khung mượn không bao giờ là món đồ nó đứng thay, và khu quản trị nói vậy ("mượn tạm", §8). Thay một khoá dưới
đây, hoặc đưa màu sang `shot-…` / ảnh tải lên, là mọi màn đổi theo, bố cục không đổi. Ảnh tra cứu Unsplash bằng
ID sau `photo-`.

| Khoá | ID Unsplash | Dùng ở |
|---|---|---|
| `hero` | `1593278641722-49b1047ede21` | bìa trang chủ |
| `khoi` | `1503341338985-c0477be52513` | — (không màu nào mang từ lát 14) |
| `bui` | `1620799140188-3b2a02fd9a77` | S03 – BÃO |
| `nguoi` | `1680292783974-a9a336c10366` | teaser S06 – NGÓI |
| `nang` | `1503341504253-dff4815485f1` | S03 – MEN |
| `suong` | `1564557287817-3785e38ec1f5` | S03 – VÔI; teaser S06 – SỎI |
| `muoi` | `1601063476271-a159c71ab0b3` | — (không màu nào mang từ lát 14) |
| `than` | `1508216310976-c518daae0cdc` | màu Đen của S04 – TRO và S03 – ĐẤT |
| `cat` | `1578768079052-aa76e52ff62e` | — (không màu nào mang từ lát 14) |
| `gio` | `1615397587950-3cbb55f95b77` | — (không màu nào mang từ lát 14) |
| `da` | `1542406775-ade58c52d2e4` | — (không màu nào mang từ lát 14) |
| `reu` | `1611817757591-c3f345024273` | S04 – RÊU; màu Rêu của S04 – KHÔ |
| `tro` | `1614214191247-5b2d3a734f1b` | S04 – TRO |
| `song` | `1688111421205-a0a85415b224` | S04 – SÓNG; màu Trắng của S03 – LỬA |
| `vo` | `1565978771542-0db9ab9ad3de` | S04 – VỎ; màu Xám của S03 – VÔI |
| `mua` | `1633292750937-120a94f5c2bb` | S04 – MƯA |
| `kho` | `1542327534-59a1fe8daf73` | S04 – KHÔ; màu Kem của S04 – VỎ |
| `dat` | `1632682582909-2b3a2581eef7` | S03 – ĐẤT |
| `lua` | `1561151593-7059b6b4ff57` | S03 – LỬA |

19 khoá trong bảng; **14 còn được mang** — bìa và 13 khung của Số 03, 04 và teaser Số 06. Năm khoá `khoi` `muoi`
`cat` `gio` `da` còn trong `PHOTO_IDS` nhưng không màu nào mang, nên danh sách "Mượn tạm" của form quản trị
(`loanPhotos`: khoá catalogue đang mang, trừ ảnh tải lên, chỉ khoá có trong `PHOTO_IDS`) có **13 khung**. Mẫu cố
định không dùng bảng này — xem "Hình phẳng" dưới.

**Từ B3c (24/09/2026) có ảnh do quản trị tải lên:** nằm ở bucket `product-photos` (Supabase Storage, công khai đọc, chỉ máy chủ
ghi) dưới khoá `up/<32 hex>.webp|jpg`, phục vụ qua route của chính app `/photos/<khoá>` (cache một năm, bất biến) rồi `next/image` như
mọi ảnh khác, nên trình duyệt vẫn không gọi Supabase. `photo_key` của `product_colors` mang một trong bốn loại khoá. Ảnh tải lên
và ảnh đi kèm app đều là **ảnh thật** (`isRealPhotoKey`), không mang nhãn mượn; "Đặt lại dữ liệu mẫu" xoá mọi ảnh tải lên.

### Hình phẳng của mẫu cố định — sinh bằng máy (lát 11)

Tám mẫu cố định (B5) chưa có ảnh. Mỗi phối màu mang khoá `flat-<dáng>-<màu>` (`flatKey`), và cửa hàng
phục vụ hình phẳng của món đồ từ chính `public/flats/`: **17 tệp PNG 1040×1300** — 4:5, trên mức 760px
mà khung lớn nhất của trang sản phẩm xin — nền `--plate` `#f4efe6` (`PLATE` trong `lib/flats.ts`), không chữ.

| Dáng | Màu có tệp |
|---|---|
| `tee` | white · black · grey |
| `longsleeve` | black · white |
| `hoodie` | grey · black · cream |
| `jacket` | black · navy |
| `vest` | black |
| `shirt` | white · navy |
| `trousers` | cream · black |
| `shorts` | grey · black |

Vẽ bằng **`scripts/flats.ts`** từ `lib/flats.ts` (đường viền `FLATS` và `flatSvg`, chép từ bảng đã duyệt
`prototype/v3/line/line-mock.js` vòng 4, `lib/flats.test.ts` giữ khớp từng ký tự; màu từ `data/colors.ts`),
bằng Chrome qua Playwright như `brand-assets.ts`: khung 200×250 của bảng phóng lên 1040×1300, mỗi tệp một
trang mới. **Mỗi tệp mang chunk `impeccable:prompt`** ghi script, `lib/flats.ts` và bảng. Chạy lại
(`npx tsx scripts/flats.ts`, cần Google Chrome) khi `lib/flats.ts` hay phối màu của mẫu cố định đổi;
`lib/flats.test.ts` đỏ cho tới khi tệp khớp khoá.

Khoá `flat-*` **đi nhánh riêng trong `photoUrl`**, sau ảnh tải lên và ảnh đi kèm app, trước Unsplash: `flatPath(key)` trả
`/flats/<dáng>-<màu>.png`, `next/image` tối ưu như ảnh tải lên. Chỉ 17 khoá có tệp (`isFlatKey`); khoá
`flat-…` khác rơi về `hero` như mọi khoá lạ. Chúng **không nằm trong `PHOTO_IDS`**, nên `PHOTO_KEYS` của form
quản trị và sheet hé lộ không đổi. Ngày có ảnh thật, khoá đổi và không gì khác đổi.

### Tệp thương hiệu — sinh bằng máy, không vẽ tay (lát 10, QĐ-31: F2, P2, O2, mô tả A)

Không raster thương hiệu nào được sửa trong trình vẽ ảnh. Tất cả do **`scripts/brand-assets.ts`** sinh ra từ
nguồn đã duyệt — logo trong `prototype/name/logo/` (`hive-mark.svg`, `hive-lockup.svg`, `hive-number.json`) và
bảng `prototype/name/share.html` (lưới 16px `MASTER16.f2`, CSS câu đề `.o2 .hl`, font Unbounded 800 của bảng)
— bằng Chrome qua Playwright, **đúng cách chế độ xuất của bảng vẽ**, nên tệp và `share.html?icon=…|touch=…`
giữ cùng pixel. Chạy lại (`npx tsx scripts/brand-assets.ts`, cần Google Chrome) sau khi logo, lưới F2 hoặc
`HOME_COVER.headline` đổi; `scripts/brand-assets.test.ts` và `lib/brand/share-image.test.ts` đỏ cho tới khi chạy.

| Tệp | Là gì | Nguồn gốc |
|---|---|---|
| `app/favicon.ico` | ba khung PNG: **16px là F2** — lưới vẽ tay từng pixel, mực trên đĩa mật ong; **32 và 48px là mark M2** vẽ từ vector | mỗi khung mang chunk `impeccable:prompt` *trước khi* đóng gói (công cụ không ghi được vào .ico); chú giải đầu `brand-assets.ts` là bản ghi của chính tệp ICO |
| `app/apple-icon.png` | 180×180, **P2**: vuông mật ong, con ong mực ở `scale(.9)`, không trong suốt | chunk `impeccable:prompt` |
| `public/icons/hive-192.png`, `hive-512.png` | P2 như đã duyệt — manifest `purpose: "any"` | chunk `impeccable:prompt` |
| `public/icons/hive-maskable-192.png`, `hive-maskable-512.png` | cùng hình, con ong ở **`scale(.879)`** — manifest `purpose: "maskable"`. Điện thoại chỉ hứa giữ vòng tròn 80% ô, nên không gì được vươn quá 40% cạnh tính từ tâm (400/1000 đơn vị); con ong vươn 454,74 ở scale 1 (góc ngoài chân chữ H), 400 / 454,74 = 0,8796, hạ xuống 0,879 → 399,7 | chunk `impeccable:prompt` |
| `/opengraph-image`, `/twitter-image` | **O2**, 1200×630, vẽ **lúc có request** bằng `next/og` từ một SVG toàn nét viền (không đặt font, không tải gì): vải đen `CLOTH`; lockup `HIVE.NN` cao 170, cách đỉnh 140, chữ trắng, `.NN` mật ong; đường may đứt nét mật ong 3px từ x 480 đến 720 ở y 366 (27 mũi, 6 bật 3 tắt); câu đề bìa hai dòng trắng. `NN` là Số của bìa trang chủ (`featuredDrop`), đọc mỗi request nên ảnh theo Số mới không cần deploy; **không in giờ đóng, không số tồn** — ứng dụng giữ ảnh đã cào bao lâu tuỳ nó. `twitter-image.tsx` xuất lại đúng module OG | `app/opengraph-image.tsx`, `lib/brand/share-image.ts`, `lib/brand/lockup.ts`; nét logo trong `lib/brand/logo.ts` và nét câu đề trong `lib/brand/share-headline.ts`, cả hai do script sinh, không sửa tay |

**Câu đề trên ảnh chia sẻ là nét viền, và không thể cũ.** Satori không đọc woff2, và Unbounded TrueType duy
nhất có sẵn là font biến thiên mà Satori sẽ đặt ở 400; nên script để Chrome dàn dòng bằng CSS của bảng rồi lấy
nét từng glyph từ chính tệp woff2 Chrome đã dùng. `share-headline.ts` mang sha-256 của câu nó vẽ;
`lib/brand/share-image.ts` **ném lỗi ngay khi nạp** — build và mọi test nhập nó đều dừng — nếu
`HOME_COVER.headline` không còn khớp. Ảnh chia sẻ không bao giờ in câu hôm qua.

Màu trong mọi ảnh: `lib/brand/palette.ts` (`HONEY #eba400`, `INK`/`CLOTH #171410`, `WHITE`) — cùng giá trị
token, viết thẳng vì ảnh không đọc được stylesheet.

**Đầu trang** (`app/layout.tsx`): `metadataBase = siteOrigin(process.env)` — miền production
(`VERCEL_PROJECT_PRODUCTION_URL`) trên Vercel, `http://localhost:$PORT` nơi khác; `og:image` phải tuyệt đối.
Mô tả A "Streetwear unisex bán theo số. Mỗi số cắt một lần." cho cả `description` và thẻ OG (`vi_VN`,
`website`), không trang nào tự khai `openGraph`; `twitter.card = summary_large_image`. `themeColor` và
manifest `theme_color`/`background_color` là **`#ffffff` — sàn trắng**; manifest `display: "browser"` (mở
như một tab, cửa hàng không tự cài thành app). **Cố ý không có favicon SVG hay `icon.*`**: trình duyệt sẽ
ưu tiên nó hơn khung 16px vẽ tay.

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
gì thuộc về nó: bìa `.cover`, teaser Số kế tiếp `.cover.soon`, biển Số trên nav
`.itag` (mảnh vải đen duy nhất trên thanh, và chỉ khi Số đang bán), cùng biển ấy
trên ảnh mẫu thuộc Số `.card3 .sotag` (chỉ ở lưới trộn hai loại mẫu, §8), dải nhắc
`.band.remind`, dải bước tiếp theo của đơn `.nextstep`, thanh bên quản trị
`.side`, thanh hàng loạt `.bar.bulk`, badge trạng thái sống, dấu SOLD OUT, ảnh
chia sẻ O2. Không sơn một mặt nào khác thành đen vì nó "cần sức nặng". Toast
nền `--ink` là ngoại lệ có chủ ý (dải 12px sống 2,6 giây). Bong bóng đếm trên
nav **đã rời vải đen** ngày 24/09 (lát 8): nay là mật ong chữ mực.

**Quy tắc Một Sợi Chỉ.** Mỗi màn chỉ có **một** mảng mật ong là hành động chính
(`.btn` mặc định). Nút thứ hai là mực viền mực (`.btn.ink`), nút thứ ba là chữ
gạch chân (`.btn.quiet`). Trên thẻ sản phẩm nút thêm giỏ là viền mực trên trắng,
**đảo thành đen/mật ong khi hover** — mượn chất liệu của Số thay vì đặt một mảng
vàng lên mọi ô lưới. Ở khung nhìn đầu tiên trên desktop 1280, nút "Xem mười mẫu"
là mảng mật ong **hành động** duy nhất (ảnh `.impeccable/review/desktop.png`,
chụp trước lát 8 — khi thanh chưa có logo).

Quy tắc đếm **mảng mật ong mà người mua bấm để làm việc chính**, không đếm mọi
pixel vàng. Thanh điều hướng từ lát 8 có ba chỗ mật ong, không chỗ nào là hành
động chính, nên quy tắc giữ nguyên ý:
- **Đĩa của logo** (30/32px) là màu của logo, không phải token và không phải
  nút — nhận diện, không phải hành động; nó theo logo ở mọi nơi logo đứng.
- **Chữ, đường chỉ và hai chốt trên biển Số** là chỉ may trên vải — chất liệu
  của Số, cùng lối với số 96/168 trên bìa, không phải một mảng nền mật ong.
- **Bong bóng đếm** là một con số 16px báo trạng thái, chỉ hiện khi > 0, chỉ ở
  đã lưu và giỏ; một dấu, không phải một mảng.

Thêm mật ong vào thanh ngoài ba chỗ ấy là phải xét lại quy tắc này.

**Mật ong không mang nổi chữ trắng.** Đó là lý do `--brand-ink` là mực và lý do
chữ liên kết phải xuống `--brand-text`.

**Trên nền mật ong nhạt, liên kết xuống thêm một bậc** (lát 13). Liên kết trong
dòng bảng quản trị đang chọn (`.s.adm3 tr.on td a`, nền `--brand-soft`) dùng
`--gold-800` — 7,05:1 ở đó; `--brand-text` chỉ còn 4,20:1, dưới AA cho chữ 13px.
Tính trước khi viết, như mọi cặp khác.

### Trạng thái

Mỗi sắc tách hẳn khỏi họ vàng: `--hot #b3261e` (còn ít, đã huỷ) · `--ok #1b6b3a`
(xong, checklist mật khẩu) · `--warn #44505e` (chờ — **xám, vì vàng đã là màu
thương hiệu**) · `--info #0c6289` (sắp mở, đang giao). Mỗi màu có một nền `-bg`.
Trên thẻ và trong dòng size, **đỏ chỉ tiêu cho một thứ**: số còn mà người mua vẫn
hành động được ("còn 2"); size đã hết là gạch xám, vì "hết S" là sự thật, không
phải báo động.

**Màu không bao giờ là kênh duy nhất.** Mọi `.badge` mang một chấm *và* một chữ
(`dot` mặc định bật trong `Badge.tsx`); mốc dòng thời gian `.tl3 .m` mang hình
dạng *và* chữ. Biển Số trên nav **không mang màu trạng thái**: từ lát 10 nó chỉ
hiện khi Số đang bán, nên chỉ có một trạng thái và một màu (chữ mật ong trên
vải); tên đầy đủ "Số 05, đang bán" nằm ở `aria-label` và `title`
(`plateLabel`). Biển xanh "sắp mở" và biển xám "đã đóng" đã bỏ — lúc ấy thanh
không có biển, bìa và lịch chân trang nói Số kế tiếp.

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
trị, 20 số KPI khác, 14 wordmark chung, 13 wordmark thanh bên. Thanh điều hướng
cửa hàng **không còn wordmark bằng chữ** từ lát 8: nó vẽ logo SVG (§8), và chữ
trên biển Số là Unbounded 800 theo token 11 / 12 (`--fs-xs` / `--fs-sm`). Cỡ 11,5 và 12,5 (`.lead`, `.err`, `.stockline`, `.row .t/.amt`, `details`,
`.band`) là tàn dư v2 còn được render — xem §10. `.rules div` (checklist mật
khẩu v2) đã xoá ở lát 13.

**Sàn 11px cho chữ chức năng** (QĐ-22, giữ từ v2): không có cỡ dưới 11 ở bất cứ
đâu; máy dò trong `tools/layout-sweep.js` bắt vi phạm.

Quy ước đã cài sẵn:
- `font-variant-numeric: tabular-nums` cho mọi số so sánh theo cột — giá, tổng,
  đồng hồ, số còn, ô bảng, số đếm trên chip/tab/bong bóng.
- `text-wrap: balance` cho `h1`, `pretty` cho `p` và `.lead`. Từ lát 13 **dòng
  phụ cũng không để một chữ mồ côi**: `text-wrap-style: pretty` trên `.sub`,
  `.meta`, `.help`, `.fine3`, `figcaption`, `.note3`, `.foot3 .cal .st`,
  `.mysize > div`, `.kpi3`, `.codes .code > span`, `.picks3 .pick .t > span`;
  câu đề bìa `.cover .t` dùng `text-wrap-style: balance`. **Viết dạng dài
  (`text-wrap-style`) là có chủ ý**: dạng tắt `text-wrap` đặt lại cả
  `text-wrap-mode` và bật ngắt dòng trở lại trên dòng mà quy tắc khác giữ
  `white-space: nowrap`.
- Nhãn viết hoa là **một giọng** dùng lại: 11px · 600 · cách `.06em` (`.lbl`,
  `th`, `.foot3 h4`, nhãn đồng hồ); `.14em` cho "SỐ" trên bìa và wordmark; badge
  `.08em` 700.
- Từ vựng: **"Số" thay "đợt"** ở mọi chữ trên màn (`LEX` trong `lib/lexicon.ts`,
  hai chữ số luôn: "Số 05"). URL, tên biến (`Drop`, `dropNo`) và khoá localStorage
  giữ tiếng Anh. **SOLD OUT** là từ tiếng Anh duy nhất trên màn khách — dấu trên
  ảnh mẫu đã hết; trong câu vẫn nói "đã hết". Giọng trung tính, không xưng hô.
- **Tên mẫu thuộc Số mang mã Số** (B5): `styleName(name, dropNo)` → "S05 – KHÓI";
  mẫu cố định (`dropNo` null) in tên trần. `issueCode(5)` = "S05",
  `stylePrefix(5)` = "S05 –". Giữa mã và gạch là **khoảng trắng không ngắt
  U+00A0** để "S05 –" không tách dòng; gạch là en dash U+2013; sau gạch là
  khoảng trắng thường, tên dài được ngắt ở đó. Tên ghép lúc hiển thị, không
  lưu — cột `name` vẫn là "KHÓI". Mã **in như chính tên**, cùng mặt chữ, không
  tách thành một khúc riêng (chỉ ô tên trong form quản trị tách nó ra, §8).
  Địa chỉ mang mã chữ thường: `/products/s05-khoi`; địa chỉ cũ `/products/khoi`
  trả **308** về địa chỉ mới khi đúng một mẫu khớp (`legacySlugTarget`,
  `permanentRedirect`); địa chỉ mẫu cố định không có tiền tố.
- **Cụm không được tách giữ bằng ký tự, ở nơi chuỗi được sinh** (lát 13). Trong
  **danh sách** mẫu ("S05 – KHÓI ×1, …"), `styleInList()` (`lib/lexicon.ts`) giữ
  cả một mục liền: sau gạch là **U+2060 WORD JOINER rồi U+00A0**, trước `×n` là
  U+00A0 — vì UAX #14 LB12a vẫn cho ngắt trước một khoảng trắng không ngắt đứng
  sau gạch, nên NBSP một mình không đủ. `DASH` của khoảng ngày trong
  `lib/datetime.ts` ("20/09 – 22/09") giữ cùng cách. "nhận {window}", số đếm với
  đơn vị, "24 giờ", "nhận (COD)" và tên màu trong bảng quản trị giữ bằng NBSP.
  `lib/csv.ts` bỏ U+2060 và đổi U+00A0 thành khoảng trắng thường trước khi ghi,
  nên CSV không mang ký tự dàn chữ. **Tên mẫu đứng một mình vẫn giữ khoảng trắng
  thường sau gạch** (luật `styleName` ở trên không đổi): tên dài vẫn được ngắt ở đó.
- **Chữ trên màn không giải thích khái niệm** — khách lẫn quản trị: nhãn ngắn là
  đủ, không câu diễn giải dưới tiêu đề, không số đếm lặp lại thứ hàng tab đã nói.
  Lát 13 áp luật này cho 70 câu có sẵn, người dùng chọn từng câu trên
  `prototype/v3/copy.html`.

---

## 4. Hình khối & khoảng cách

| Thứ | Giá trị |
|---|---|
| Bo góc chuẩn | `--r` = **4px** (ghi đè `--radius-md` của Tailwind) — nút, ô nhập, chip, panel, ảnh thẻ, menu, sheet |
| Bo góc nhỏ | `--r-sm` = **3px** — badge, ảnh nhỏ, hộp đánh dấu, dấu SOLD OUT |
| Bo góc biển Số | `--r-plate` = **5px** — chỉ biển Số: trên nav (`.nav3 .itag`) và trên ảnh thẻ (`.card3 .sotag`), một khối khai báo; một bậc tròn hơn điều khiển; khai trong `:root`, không ở `@theme`, vì không gì khác mang hình này. Khác `--plate` (màu nền ảnh) |
| Bo tròn hẳn | `99px` — chấm, bong bóng đếm, thanh tỉ lệ, đĩa màu, nút tròn, công tắc |
| Chín bậc khoảng cách | `--s1..--s9` = 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 — nhóm chặt s1–s3, mục s6–s8 (`.sec` cách `--s7` điện thoại, `--s8` desktop; chân trang cách `--s8`) |
| Lề ngang | `--gut` **18px** điện thoại, `--gutd` **40px** từ 900px (`.wrap3`, tối đa `--max` **1320px** tính cả lề) |
| Bề ngang từ 900px | **khung trải hết, nội dung dừng ở 1280** (lát 13): `.s.v3` rộng bằng khung nhìn; chỉ `.s.v3 > main:not(.narrow)` bị chặn **1280px** và canh giữa. Khối trong của thanh `.nav3 .in` và chân trang `.foot3 .in` cũng dừng ở **1280** (không phải `--max`), nên logo, nội dung và chân trang chung **một mép trái** ở mọi bề ngang; nền, nét và bóng của thanh cùng kẻ 2px của chân trang chạy **mép tới mép**. Tới 1280 không pixel nào đổi. `.narrow` giữ cột 600 riêng. Khu quản trị `.s.adm3` **không có trần** |
| Nét kẻ | 2px mực cho đầu mục `.sec .hd` và chân trang; 1px mực dưới đầu sheet, trên bảng size, trên `.sum3`, quanh `.menu3`; 1px `--hair` cho mọi nét ngăn khác; **1px đứt nét mật ong** cho mép may của Số (bìa, thanh bên, leader mục lục trên vải, dấu SOLD OUT) |
| Leader mục lục | chấm `--line` trên giấy (`.card3 .toc .ld`, `.sizes .ld`), đứt nét mật ong trên vải (`.tocrow .ld`); tối thiểu 12–18px, không bao giờ là hai chấm |
| Chiều cao nút | **40px** `.btn`, `.addbtn3`; **34px** `.btn.sm` (36 trong quản trị); ô số lượng `.qty3` 44 |
| Chiều cao ô nhập | `.inp` **40px** trần; **44px** trong `.field3` (form có nhãn) và trên thanh công cụ bảng quản trị; `.inp.area` 78 / `.field3 .inp.area` ≥ 88 |
| Khung trang | `.s.v3` = cột flex `min-height:100dvh`, `main{flex:1 0 auto}` — chân trang `.foot3` chạm đáy; quản trị `.s.adm3` là hàng flex. Trang có thanh mua (`.s.v3:has(.buybar3)`) chừa đáy dưới 900px bằng chiều cao thanh cộng `safe-area-inset-bottom`, để cuối trang không nằm dưới thanh |
| Nhịp hàng form | `.row2` / `.fgrid` hai cột gap **14 dọc / 12 ngang**; `.field3 + .row2`, `.row2 + .row2` (và các cặp `.fgrid` ở trang lẫn trong sheet) cách **14px** — một nhịp cho mọi form |
| Cột hẹp | `.narrow` 600px từ 900px — **cột chính là lề**, mọi thứ bên trong bỏ lề 40 |
| Sheet | `.sheetbody` đáy màn, tối đa 86dvh, bo 4px hai góc trên, lề trong `--gut`; từ 900px là hộp **520px** giữa màn |
| Nav | `.nav3` dính, **56px** điện thoại / **64px** desktop; logo cao **30 / 32px**; từ 900px lưới bốn cột (ba khi không có biển), lề **40 trái / 28 phải** nên cụm giữa lệch phải 6px có chủ ý; nội dung cuộn tới phải chừa `scroll-margin-top:72px` (`.s.v3 a, .s.v3 [tabindex]`, `.sec.anchor`) |

**Ảnh sản phẩm luôn là 4:5.** `.card3 .img` khai báo `aspect-ratio:4/5` *và*
`display:block` — bỏ `display:block` thì trên thẻ `<a>` cả hai khai báo bị bỏ
qua âm thầm. Ảnh bìa là **1:1 tràn lề** trên điện thoại (390×390) và cột 7/12
cao ≥ 640 trên desktop; ảnh trong ô bảng quản trị phải `display:inline-block`
vì preflight đặt `img{display:block}`.

**Hai dấu trên ảnh thẻ, một cỡ** (lát 11). Dấu SOLD OUT `.stamp` ở góc **trái
trên** (`left:10px; top:10px`), biển Số `.sotag` ở góc **trái dưới**
(`left:10px; bottom:10px`) — trên thẻ 171px của điện thoại hai dấu không gặp
nhau. Cả hai cao **28px** (**32px** từ 900), chữ Unbounded 800 `--fs-xs` 11 /
`--fs-sm` 12, cách `.1em`, `line-height:1`. Dấu giữ vải, viền 1,5px, đường may
đứt nét và bo `--r-sm` của nó; đệm **10 / 12px** — đệm của biển (17 / 19) trừ
phần chốt mà dấu không có. Biển là **chính biển của nav**: `.s .nav3 .itag,
.s .card3 .sotag` chung một khối khai báo trong `nav.css` và chung bước 900px
trong `desktop.css`; phần chỉ của thanh (không co, lớp phủ chạm ±9, hover) ở
quy tắc riêng `.nav3 .itag`, chỗ đứng trên ảnh ở `cards.css`. Biển trên ảnh là
`aria-hidden` và `pointer-events:none` — tên dưới ảnh đã nói Số, cú chạm đi qua
tới liên kết ảnh; nó không phải điều khiển nên không có vùng chạm.

**Thẻ hẹp cho tên một dòng riêng** (lát 11). `.card3{container-type:inline-size}`
và `@container (max-width:260px)` đặt `.toc .n{flex-basis:100%}`: dưới 260px
(hai cột điện thoại, 171px ở 390) tên đứng một dòng, leader và giá cùng xuống
dòng dưới — "S05 – KHÓI" không đẩy giá sang một dòng lẻ. Container query vì bề
ngang thẻ do lưới định: mọi lưới chứa thẻ (`.grid3`, `.grid3.four`,
`.grid3.single`) là rãnh `minmax(0,1fr)`.

**Bìa Số.** Điện thoại: ảnh rồi nhãn đen may đứt nét mật ong phía trên (`.face`,
`border-top:1px dashed var(--brand)`), "SỐ" 11px đặt lên baseline số 96px mật
ong, badge trạng thái + giờ đóng, đồng hồ 32px, câu đề 30px, lead `--stage-ink2`
44ch, nút mật ong full-width, liên kết gạch chân, "Còn ít" hai dòng `.tocrow`.
Desktop: lưới `5fr 7fr`, nhãn trái (mép may chuyển sang `border-right`), ảnh
phải `order:2`, `min-height:640`, đồng hồ 40px, số 168px. Teaser `.cover.soon` là
cùng bìa nhưng số nhạt 72/120, hai ô ảnh 4:5 mờ 45% với badge "Chưa mở".

**Bìa Số đã đóng giữ ảnh cao** (lát 14). Ảnh của `.cover.shut` là ảnh mẫu đầu
của Số, và từ lát 14 có thể là ảnh thẻ 4:5 — mép trên món đồ ở 12%, gấu gần 79%.
Căn giữa thì ở 1280 khung 738×640 chỉ thấy 69% chiều cao và mất cổ áo, nên ảnh
mang `object-position:50% 30%` (**`50% 35%` từ 900px**), cùng `grayscale(.6)` và
`opacity:.85` vốn có. Đo: ở 390 cách cổ áo 28px, dưới gấu 31px; ở 768×1024 cổ áo
còn 15px, gấu ra ngoài khung; 12 / 7px ở 1280; 9 / 2px ở 1440 (khung rộng nhất,
747×640). Ảnh mượn dọc (của Số 04) chỉ được thêm khoảng đầu.

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

Sweep lát 13 (91 lượt) chỉ còn đúng hai miễn trừ này, cộng hai nút trạng thái
rỗng canh trái có chủ ý mà máy dò `loneButton` báo.

---

## 6. Con trỏ, hover, và những bề mặt trình duyệt tự vẽ

`app/styles/interaction.css` giữ tầng này (port muộn từ `prototype/shell.css`;
mỗi thành phần v3 tự khai hover/cursor/target nơi nó được vẽ).

Những gì hệ **tự vẽ** thay vì để mặc trình duyệt — **giữ từ v2**:

- Vòng focus: `2px solid var(--mark)` (#c28800, 3,4:1 — mật ong chỉ 1,9:1 nên
  không dùng), offset 2px, bo `--r-sm` — và **tắt hẳn khi con trỏ đang điều
  khiển** (`html[data-pointer]`, script đầu `<body>` trong `app/layout.tsx`
  đặt cờ trước paint đầu; Tab gỡ cờ), vì `:focus-visible` một mình không giữ
  được lời hứa đó trên Chrome. **Trong hàng cuộn ngang, vòng vẽ lõm vào**
  (`outline-offset:-2px`, lát 13): `.tabs3 a`, `.chips3:not(.wrapped) .chip3`
  và — dưới 900px, khi rail là một hàng cuộn — `.acctrail3 nav a`; hộp cuộn
  cắt phần vẽ ra ngoài, nên vòng mặc định mất cạnh trên và dưới. Vẫn chỉ khi
  bàn phím điều khiển. **Vòng focus là `outline` duy nhất trong hệ**
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
nó), `.toast` (`components/shop/Toast.tsx`, `role="status"`; **`width:max-content`**
là bắt buộc — hộp đặt ở `left:50%` co về nửa khung nhìn, nên trước lát 13 mọi
toast trên điện thoại 390 bị bóp còn nửa màn). Modal v2 đã đi;
khu quản trị dùng `AdminSheet` trên `.sheetwrap`.

Lớp chờ `.veil` không portal, nhưng cũng đứng **ngoài `.s`** (dựng trong
`app/layout.tsx` cạnh trang, không trong trang), nên ba luật trên áp cho nó:
mọi selector bắt đầu bằng `.veil`, biến thể là class. Nó không vẽ chữ nên không
khai kiểu chữ.

### Lớp chờ khi chuyển trang — `.veil` (lát 9, sửa ở lát 10 phần C)

Duyệt ở `prototype/v3/loading.html`, kiểu "Logo giữa màn hình" (24/09/2026).
Một lớp duy nhất, `components/shop/WaitVeil.tsx`, dựng **một lần trong
`app/layout.tsx`, sau mọi provider, ngoài ranh giới trang** — `ShopFrame` dựng
lại theo từng trang, còn lớp chờ phải sống qua lúc đổi để chơi phần đóng trên
trang mới. Thời lượng ở `WAIT` (`lib/wait.ts`).

- **Khi nào.** Chỉ khi **pathname đổi** (`shouldVeil`). Lọc, sắp xếp, tab họ,
  biển Số từ `/so/5?family=…` (trang của Số từ lát 11), tìm từ `/search`, tra đơn, hash — đều ở lại
  trang và không có lớp chờ. Không khi nhấp chuột giữa, có phím bổ trợ,
  `target` khác `_self`, `download`, hay khác origin. **Không bao giờ ở
  `/admin`**, cả đi lẫn về; ở đó component không render và không nghe gì. Ba
  cách bắt đầu, không cái nào sửa một `<Link>`: nhấp trái vào `<a href>` (một
  listener capture trên document), Back/Forward (`popstate`), và
  `startWait(href)` gọi ngay trước `router.push/replace`.
- **120ms đầu không hiện gì** (`WAIT.delay`). Trang tới sớm hơn thì lớp chờ về
  nghỉ mà không ai thấy.
- **Các pha:** nghỉ → chờ (120ms, vô hình) → *hiện* → *đóng* → nghỉ.
  *Hiện:* nền trắng 92% (`color-mix(in srgb, var(--bg) 92%, transparent)`) mờ
  vào 160ms; mark M2 lớn từ .92 lên 1 trong 240ms; một cửa sổ 28% chạy quanh
  vòng 30 mũi chỉ mật ong (r 42, nét 2, 6 bật 4 tắt — mũi chỉ đường may của bìa
  khép thành vòng), một vòng mỗi **1.100ms**, tuyến tính, chiều kim đồng hồ từ
  12 giờ; mũi chỉ đứng yên, chỉ cửa sổ quay. *Đóng* (trang đã tới): cung khép
  thành vòng đủ trong **150ms**, tiếp tục từ góc đang quay, rồi nền trắng mờ đi
  trong **180ms**. Ease-out bậc ba. Chốt an toàn: 10 giây sau lần bắt đầu cuối
  thì nhấc, chỉ lỗi mới chạm tới.
- **Hình.** Bắt đầu ngay dưới mép thanh điều hướng và **không bao giờ phủ
  thanh**: `top` 57px điện thoại / 65px từ 900px (56 / 64 cộng nét 1px). SVG
  **88px** (mark 56) điện thoại, **100px** (mark 64) từ 900px, giữa vùng. Màu
  mark là màu logo viết thẳng; mũi chỉ `--brand`.
- **Giảm chuyển động.** `prefers-reduced-motion` đọc lúc bắt đầu chờ: nền trắng
  vẫn mờ vào, nhưng mark không lớn, cung không quay, **vòng đứng đủ**; khi tới
  chỉ mờ ra 180ms.
- **Con trỏ.** `.on` khi còn chút trắng (hiện ra). `.hold` **chỉ trong pha
  hiện**: `pointer-events:auto` + `cursor:progress`, vì một cú bấm lên trang
  cũ chỉ khởi thêm một lần chờ. Trang tới là `.hold` gỡ **trước frame đầu của
  trang mới** (hai tín hiệu tới là layout effect, lát 10 phần C); phần đóng
  chơi trên một trang đã nhận mọi cú bấm và hiện con trỏ của chính nó — phần
  đóng là lời chào, không phải chờ.
- **Tiếp cận.** `.veil` **luôn `aria-hidden="true"`** — vẽ một dấu, không nói
  gì. Trong lúc hiện, `<main>` của trang mang `aria-busy="true"`; tiêu đề trang
  mới do Next đọc. Tiêu điểm không bị dời, không bị bẫy.
- **Vẽ ngoài React.** Server render lớp ở trạng thái nghỉ (trong suốt,
  `visibility:hidden`, cho con trỏ đi qua); mỗi frame ghi thẳng style và thuộc
  tính cung qua `requestAnimationFrame`, đo theo `performance.now()` — đồng hồ
  đã đóng dấu cú bấm.

### Thứ tự chồng lớp — mọi `z-index` trong `app/styles/`

| z | Lớp | Định vị | Tệp |
|---|---|---|---|
| 2 | `.cover .issue` (masthead "SỐ" + số) | relative, cục bộ trong bìa — không phải lớp nổi | `home.css` |
| 30 | `.suggest` gợi ý tìm | absolute, dưới ô tìm | `listing.css` |
| 30 | `.buybar3` thanh mua | fixed, dính đáy | `product.css` |
| 35 | `.veil` lớp chờ | fixed, từ mép dưới nav | `sheet.css` |
| 40 | `.nav3` thanh điều hướng | sticky | `nav.css` |
| 50 | `.sheetwrap` (scrim + sheet) | fixed, portal | `sheet.css` |
| 55 | `.menu3` | fixed, portal | `sheet.css` |
| 80 | `.toast` | fixed, portal | `sheet.css` |

Không có `zIndex`/`z-index` inline nào trong `components/` hay `app/`. Lớp chờ
che thanh mua và gợi ý tìm nhưng không che thanh; sheet, menu và toast luôn ở
trên nó. Một lớp mới chọn một bậc trong thang này và ghi vào bảng.

---

## 7. Hai bề mặt

| | Cửa hàng | Khu quản trị |
|---|---|---|
| Gốc | `.s.v3` | `.s.adm3` (một tên, không phải `.s.adm.v3`, để mọi quy tắc ≥ 0,3,0 không đua với cửa hàng) |
| Nền | trắng | `--plate`, panel trắng viền `--hair` |
| Bề ngang | 390px → dải tablet 600–899 → breakpoint 900px → nội dung 1280px, khung trải hết | **chỉ desktop, `min-width:1180px`**, không trần |
| Điều hướng | `.nav3` + `.foot3` | thanh bên **208px** vải đen, dính 100dvh, wordmark mật ong, mục đang mở nền trắng 8%, số đếm mật ong/mực (đen/mật ong trên mục đang mở), chân `SimBar` may đứt nét mật ong |

Khu quản trị **không có bản điện thoại, và đó là chủ ý** (giữ từ v2). Bảng dữ
liệu là `.dt3` + `components/admin/Table3.tsx`: thanh công cụ 44px (ô tìm, chip,
select), **thanh hàng loạt thay thế thanh công cụ** bằng vải đen, tab trạng thái
có đếm, `th` micro viết hoa, hàng hover `--plate`, hàng chọn `--brand-soft`, ô
chọn `.cb` 20px đảo mực, menu `⋯` `.rowmenu`, chân trang có số trang (trang đang
mở `--sel`). **Lọc, tab, kỳ xem và trang sống trong URL** (QĐ-8, giữ từ v2:
`.seg3` là liên kết `?days=`); cột hiện/ẩn trong `brand.adminCols`. Cột số canh
phải là `td.right` (không phải `.num` — `.s .num` là vai chữ hiển thị).

**Bảng mẫu — tab Cố định** (lát 12, `components/admin/ProductsTable.tsx`, luật
trong `lib/admin-products.ts`). Tab đầu là **"Cố định"** (`FIXED_WORD`) và là tab
`/admin/products` mở khi không có tham số (`?fixed=1` gọi tên nó); các tab Số
theo sau, Số đang bán trước. **Sắp hết tính theo từng ô**: một màu ở một size
còn ≤ `FIXED_LOW_AT = 2` (`lib/inventory.ts`; ô về 0 cũng tính) là mẫu sắp hết,
dù phần còn lại của kệ nhiều bao nhiêu. Mẫu sắp hết đứng đầu tab, mang badge
`hot` "Sắp hết" (kệ trống: `shut` "Hết"; còn lại `ok` "Đang bán"), dưới số còn
một dòng đỏ nói size nào (`lowNote`: "M hết · L còn 2"), cột size hết đỏ, và tab
mang chấm đỏ để thấy từ tab khác. Mẫu cố định **không có thanh tồn** — không có
lần cắt để đo. Menu `⋯` của mọi mẫu cố định mở đầu bằng **"Nhập thêm"**, mở
`InventoryAdjustSheet` ở **chế độ `restock`**: cùng sheet, cùng lưới màu × size
`.invgrid`, mỗi ô ghi "còn N" phía trên (đỏ khi ≤ 2, `isThin`) và ô nhập số
**thêm vào**; tiêu đề "Nhập thêm · <tên>", không dòng giải thích dưới tiêu đề;
nút xác nhận vô hiệu nói việc còn lại ("Nhập số cần thêm"), sẵn sàng thì
"Nhập thêm N chiếc". Luật ở `lib/restock.ts`.

Breakpoint chính của cửa hàng vẫn là **một**: `@media (min-width:900px)` trong
`desktop.css` và các khối desktop cuối mỗi tệp; `max-width:460px` chỉ dùng cho
vùng chạm (và hàng địa chỉ xếp nút hành động xuống dòng riêng); `max-width:899.98px`
cho vài bố cục điện thoại.

**Dải tablet 600–899.98px — "tinh chỉnh nhẹ"** (lát 13, người dùng chọn
26/09/2026): `@media (min-width:600px) and (max-width:899.98px)` chỉ làm ba việc
— `.grid3` **ba cột**, ảnh bìa đang bán `.cover:not(.soon) .photo` `width:100%`
`max-height:60svh` (khai `width` vì hộp có tỉ lệ sẽ mang `max-height` sang bề
ngang), và gallery trang sản phẩm **không cao quá 70% màn mà không bị cắt** (lát
14 thay `.gal figure{max-height:70svh}` của lát 13, vốn cắt 22% ảnh ở 768×1024 —
đầu và chân người mẫu): `.gal` hẹp lại còn `--galw: min(100% + 2·--gut, 70svh ×
4/5)` và đứng giữa (`margin-inline: (100% − --galw) / 2`, tức phần còn lại của lề
tràn, nên không bao giờ thò ra ngoài màn), `.galbar` rộng `min(100%, 70svh × 4/5)`
giữa; khung giữ nguyên 4:5. Vẫn là vuốt, chấm và "1 / 2" của điện thoại. Điện
thoại và desktop không đổi. Không thêm gì vào dải này nếu người dùng chưa duyệt.

---

## 8. Thành phần — bảng tra

| Lớp | Là gì | Ở đâu |
|---|---|---|
| `.btn` + `ink` `quiet` `ghost` `sm` `wide` | nút: mật ong (chính) · viền mực (thứ hai) · chữ gạch chân (lối ra) · viền mật ong chữ link (v2, chỉ còn trên bìa và restate màu trên vải) · 34px · đầy cột | `buttons.css`, hover ở `interaction.css` |
| `.btn:disabled` / `[aria-disabled]` | trạng thái nghỉ của nút vô hiệu, đứng **cuối** các tông để thắng thứ tự nguồn | `buttons.css` |
| `.lnk` | liên kết chữ đứng một mình, gạch chân mờ 45% | `buttons.css` |
| `.badge` + `ok` `warn` `info` `hot` `shut` `flat` | viên trạng thái họ B: 24px, 11/700 hoa `.08em`, không viền, luôn kèm chấm; `ok` = vải đen/mật ong (đang bán, đã thanh toán); `warn`/`""`/`shut` = vải mộc `--hair`; `flat` = nhãn tên, mật ong nhạt, không chấm | `buttons.css`, `components/ui/Badge.tsx` |
| `.chip3` (+ `.on` `.cnt` `.dot`) trong `.chips3(.wrapped)` | chip lọc 36px viền `--line`, chọn đảo `--sel`; hàng cuộn ngang có mask mờ mép | `listing.css` |
| `.tabs3` + `.cnt` | tab họ là liên kết, hàng cuộn ngang. Kẻ mực 1px dưới hàng vẽ **bên trong hộp**, `box-shadow: inset 0 -1px 0 var(--ink)`, không phải `border-bottom`: hộp cuộn cắt ở mép hộp đệm, border nằm ngoài phần nó vẽ, nên vạch `bottom:-1px` cũ mất pixel dưới và hiện thành sợi mật ong 1px chồng lên kẻ mực (lát 11). Vạch 2px mật ong của `.on` ở **`bottom:0`**, phủ pixel kẻ cuối | `listing.css` |
| `.lhead` + `.row1 .big .meta`, `.lhead.bare` | đầu danh sách. Trang của Số: h1 "Số 05", số mẫu, còn/cắt, đồng hồ, `padding-top` `--s4`. `/products`: `.bare` — không tiêu đề, không số đếm (tab "Tất cả N" nói cả hai), tab cách thanh 12px `--s3`, h1 "Tất cả mẫu" `sr-only` | `listing.css`, `components/product/Listing.tsx` |
| `.card3` + `.img` `.imgbox` `.stamp` `.sotag` `.meta` `.toc(.n .ld .p)` `.ct(.low)` `.kind` `.act .addbtn3(.view)` `.unsave` | thẻ sản phẩm = **một mục trong mục lục**: ảnh 4:5, dòng tên…giá có leader, số còn, một nút viền mực; `.sold` mờ ảnh 50% + dấu SOLD OUT 28 / 32px góc trái trên; `.sotag` biển Số góc trái dưới (prop `plate`, chỉ ở lưới trộn hai loại) — hình học ở §4; thẻ là container, dưới 260px tên một dòng riêng. Mẫu cố định: xem dưới bảng | `cards.css`, `nav.css`, `desktop.css`, `components/product/ProductCard.tsx` |
| `.grid3` | lưới 2 cột → 3 cột từ 600px (dải tablet) và từ 900px, `minmax(0,1fr)` | `home.css`, `listing.css` |
| `.cover` (+ `.soon` `.shut` `.first`) với `.photo` `.face` `.issue(.k .num)` `.state` `.clock` `.t` `.lead` `.cta` `.lows` | bìa Số ba trạng thái; đồng hồ chỉ dựng ở trình duyệt (`Countdown`, chữ "00" ẩn giữ chỗ) | `home.css` |
| `.tocrow` | một dòng mục lục trên vải: tên · leader đứt nét mật ong · giá, ≥ 44px | `home.css` |
| `.sec` + `.hd(h2 .meta .more)` `.anchor` | mục có tiêu đề, đếm, liên kết cuối, kẻ 2px mực | `home.css` |
| `.index .row` | chỉ mục họ: hàng 72px, ảnh 48×60 — **hàng, không phải ô** | `home.css` |
| `.sec .rules .r` | bốn quy tắc: danh sách định nghĩa, không icon, không thẻ | `home.css` |
| `.past` | dòng "Số 04 · đã đóng" | `home.css` |
| `.band.remind` | dải nhắc: vải đen, chuông và liên kết mật ong, 44px | `nav.css` + `home.css` |
| `.nav3` + `.in` `.wm svg` `.itag(.on)` `.links a(.on)` `.icons .ib .ic b` | nav dính 56 / 64px trên bóng mềm, ba nhóm theo thứ tự đọc và Tab: của ai (logo), đang bán gì (biển Số, năm họ), bốn việc. **Logo** `NavLogo`: SVG lockup mark M2 + chữ W3 chép từ `prototype/name/logo/hive-lockup-nav.svg` (chữ 62,5% chiều cao mark — tỉ lệ riêng của thanh; tệp logo giữ 52%), màu logo viết thẳng, `aria-hidden`, liên kết tên "HIVE, trang chủ"; cao **30px** (rộng 70,9) điện thoại / **32px** (75,7) từ 900, trong hộp liên kết cao 44 không co. **Biển Số `.itag`**: **chỉ render khi Số đang bán** (`featuredDrop` → `OPEN`), không còn biển xanh/xám; vải `--stage`, chữ mật ong Unbounded 800 11px `.1em` hoa (12px từ 900), cao 28 đệm 17 (32 / 19 từ 900), bo `--r-plate` 5px, đường chỉ mật ong 1px lùi 2px vào trong (vẽ bằng `box-shadow` inset — một đường, không phải bóng), một chốt tròn mật ong mỗi đầu (radial-gradient, tâm cách mép 8,5 / 9,5px); in đúng `issueLabel` ("Số 05"), `aria-label`/`title` là `plateLabel` ("Số 05, đang bán"); dẫn tới trang của Số `/so/N` (`issueHref`, từ lát 11); cùng khối khai báo với biển trên ảnh thẻ `.card3 .sotag`; hover đổi vải sang `--stage-hair`; `.on` (đang xem cả Số, `aria-current="page"`) gạch 2px mật ong cách đáy 6px qua `::before`, vì `::after` là lớp phủ chạm ±9 (28 → 46). **Không đồng hồ trong thanh.** **Năm họ** (Áo thun · Hoodie · Khoác · Sơ mi · Quần — `NAV_FAMILIES`, chữ từ `FAMILY_SHORT_LABELS`; Gile không lên thanh, có ở tab `/products`) chỉ từ 900px: 13px `--ink2`, gap 24, `.on` mực 600 gạch 2px mật ong, phủ ±9. **Bốn nút icon** tìm · đã lưu · tài khoản · giỏ: hộp 40×44 (44×44 từ 900), glyph Iconsax Linear **20px** (hệ là 18), luôn Linear dù có đếm hay đã đăng nhập; **bong bóng đếm** mật ong chữ mực, 16px, 11/700 số bảng, `top 4 right 2`, chỉ khi > 0, chỉ ở đã lưu và giỏ, điền sau khi provider `ready` (khung server không vẽ bong bóng). **Từ 900px** `.in` là lưới `minmax(0,1fr) auto auto minmax(0,1fr)` gap 24, lề 40 trái / 28 phải, tối đa **1280** (nền, nét và bóng của thanh trải hết khung nhìn, §4); không có biển thì `.in:not(:has(> .itag))` còn **ba cột** để cụm họ vẫn giữa — lệch phải 6px **có chủ ý** vì hai lề 40/28. Điện thoại: logo, biển, bốn icon; không có họ | `nav.css`, `desktop.css`, `components/shop/SiteNav.tsx`, `NavLogo.tsx`, `lib/lexicon.ts` |
| `.foot3` + `.in` `.cols` `.cal` `.colophon` | chân trang: kẻ 2px mực chạy mép tới mép, khối trong tối đa 1280 từ 900px, 2 cột → 4 cột, lịch ra Số từ fixture, `NeedWrite` cho pháp nhân/kênh liên hệ | `base.css`, `desktop.css` |
| `.wrap3` | lề trang 18 → 40 + `max-width:1320` | `base.css`, `desktop.css` |
| `.ic` (+ `.sm` `.mk` `.duo`) | icon Iconsax Linear, hộp 18 / 15 / 12 (28 ở `.empty3`), stroke 1.5, **màu thừa kế**; `plus`/`minus`/`check` cắt viewBox quang học (`OPTICAL` trong `components/icon/Icon.tsx`: 4/16, 4/16, 6.5/11); `--il`/`--ir` cắt lề trong suốt khỏi hộp bố cục khi đứng cạnh chữ, **không** trong cột icon của menu | `nav.css`, `components/icon/` |
| `.note3(.hot)` | khối ghi chú trên mật ong nhạt / đỏ nhạt, icon một cột | `base.css` |
| `.needwrite` | chỗ **chưa ai viết** — khung gạch đứt nói rõ cái gì thuộc về chỗ đó | `admin.css` (restate trong `.foot3`) |
| `.empty3` | trạng thái rỗng: canh **trái**, 44ch, icon 28, h2, nút inline | `lists.css` |
| `.row` (+ `.thumb` `.t` `.d` `.amt` `.fill`) | hàng danh sách phẳng của tài khoản/quản trị | `lists.css` |
| `.inp` (+ `.area` `.sel` `.bad`), `.selbtn`, `.box(.on)`, `.radio(.on)` | ô nhập trần 40px, nút select, hộp đánh dấu 17px v2 | `forms.css` |
| `.field3` + `.lbl(.opt)` `.help` `.err` | trường form v3 (`components/ui/Field3.tsx`): nhãn micro viết hoa `--ink2`, ô 44px chữ 14, focus viền mật ong, lỗi `--hot` có icon | `checkout.css` |
| `.pdp3` + `.crumbs` `.gal` `.galbar(.cur .dots i.on)` `.sw` `.sizes` `.mysize` `.switch3` `.stock .meter(.hot/.gone)` `.buybar3(.show)` | trang sản phẩm: gallery là **các khung của màu đang chọn** (xem dưới bảng) — điện thoại vuốt tràn lề khung 4:5 nền `--plate`, dưới là "1 / 2" 11px `--ink2` số bảng và chấm 6px `--hair` (đang xem mực); từ 900px các khung đứng một cột gap 12, bo `--r`, không thanh đếm; đĩa màu 32px vòng `--line`, **bảng size một dòng một size** với leader chấm, ô đánh dấu 20px và dòng chọn đảo `--sel` tick mật ong, công tắc 40×24, thanh tồn kho 4px (`--mark` / `--hot` / mực khi hết), thanh mua dính đáy | `product.css` |
| `.steps3 .st(.done/.on)` | thanh bước: vòng 28px, xong = mực/tick mật ong, đang = mật ong | `checkout.css` |
| `.cartline3` + `.thumb` `.n` `.kind i` `.p` `.ctl` `.stockline(.hot)` `.acts` `.fixes` | dòng giỏ lưới 72px ảnh 4:5 | `checkout.css` |
| `.qty3` + `.qntap` | ô số lượng 44px: hai nút 40×44, ô 40 | `checkout.css`, `lists.css` |
| `.shipbar3(.ok)` `.promo3` `.promoon3` `.promises3` `.later` | thanh miễn phí giao, ô mã, mã đã áp, cam kết, "để dành" (`brand.later`) | `checkout.css` |
| `.picks3 .pick[aria-checked]` | hàng chọn kiểu radio 20px (địa chỉ, giao, thanh toán); chọn đảo mực | `checkout.css` |
| `.consent[aria-checked]` | ô đồng ý | `checkout.css` |
| `.sum3 .r(.total)` | cộng tiền: kẻ 1px mực trên, tổng bằng Unbounded | `checkout.css` |
| `.panel3` (+ `h2/h3 .meta .more`), `.panels3`, `.two3`, `.row2` | panel viền `--hair`, lưới hai cột | `checkout.css` |
| `.pghead` + `.back` `.meta` | đầu trang: h1 + dòng phụ + lối về | `checkout.css` |
| `.orderbox3` | `<details>` "Đơn của bạn · N món", mở sẵn từ 900px bằng `matchMedia`; từ 900px `margin-top:0` để cột phải thanh toán không thấp hơn cột trái 14px (tàn dư `.s details`, §10) | `checkout.css` |
| `.done3` `.deadline` `.bank` `.qrrow` `.qrph` `.ol` `.tl3 .m(.done/.now/.late/.todo)` `.kvs` `.invoice` `.lookup` `.result3` | xác nhận đơn, hạn chuyển khoản 12 giờ (đồng hồ cùng cấu trúc bìa), thông tin ngân hàng, dòng thời gian (mốc 12px: xong = mực, đang = mật ong, trễ = viền đỏ), cặp khoá-giá trị, hoá đơn `@media print`, tra đơn | `checkout.css` |
| `.acct3` + `.acctrail3(.who .ava .out nav a .cnt .dotn)` `.content` `.acctgrid3` `.rows3` `.notif(.read)` `.prefrow .switch3` `.codes .code` `.thumbs3` `.authcard3` `.forgot` `.divider3` | tài khoản: rail trái từ 900px với số đếm, hàng đơn `OrderRow3`, thông báo (`brand.notif.read`), công tắc (`brand.prefs`), mã, thẻ đăng nhập | `account.css` |
| `.prose` `.prep` `.faq3` `.nf` `.solds` `.checks3` | trang chữ: giới thiệu, FAQ (`<details>`), đổi trả, liên hệ, 404, kho lưu trữ Số đã đóng, checklist mật khẩu | `pages.css` |
| `.s.adm3` + `.side(.wm nav a .cnt .simbar)` `.main` `.top(h1 .sub .crumb .acts)` `.seg3` `.kpis3(.five) .kpi3` `.panel3 .bd` `.split3` `.fine3` `.chart3(.hi .zero .peak) .axis .daytable` `.queue3 .q(.sub .late .act)` `.rank3 .r(.two)` `.dt3(.bar(.bulk) .stabs .cb .rowmenu .foot .pages .none)` `.avatar` `.nextstep` `.fgrid` `.totalbar` `.addrblock` `.notes3 .ni` `.invgrid` `.delta` `.log3` `.ctag` `.slips .slip` + `@media print` | khu quản trị v3 | `admin.css` |
| `.colorpick` (chip màu mang `.pos` thứ tự), `.cslots .cslot .shot(.blank .over .prog) .hd .ord(.flip) .file .acts .photopick .cutgrid`; sheet cắt `AdminSheet variant="crop"` 720px + `.cropwrap .cropper .frame(i[data-h]) .cropside(.err)`; `.field3 .inp[readonly]` nền `--plate` chữ `--ink2`; crumb `AdminTop` "Mẫu › X" | form Thêm/Sửa mẫu (lát 7, 24/09, QĐ-27): bảy chip màu theo thứ tự dải (màu đầu là ảnh đại diện), một hàng mỗi màu với ô ảnh 4:5 ở bốn trạng thái (chưa có · tệp đã chọn qua sheet cắt 4:5 khoá tỉ lệ · mượn tạm có nhãn · ảnh thật — xem dưới bảng), nút lưu nói việc còn thiếu, tải ảnh có tiến trình; màn sửa không có chip (màu chốt lúc cắt); toán khung `lib/photo-crop.ts`, mã hoá `lib/photo-encode.ts` (≤ 1.200×1.500 WebP), luật form `lib/product-form.ts` | `admin.css`, `forms.css` |
| `.rowmenu[aria-expanded="true"]`, `td .stockcell` + `.lownote`, `td.hotsize`, `.stabs .lowdot`, `.pfxin .pfx`, `.invgrid .onhand(.hot)` | mẫu cố định trong quản trị (lát 12, khối cuối `admin.css`, chép từ `prototype/v3/line/line-mock.css`; xem §7): nút `⋯` đang mở menu giữ nền `--plate` chữ mực, để hàng của menu vẫn được đánh dấu khi con trỏ ở trong menu · ô tồn là cột dọc gap 2, rộng tối thiểu 120: "còn N" rồi dòng đỏ `--hot` 11/600 · ô "size hết" đỏ 600 khi có size hết · chấm đỏ 7px `--hot` cách chữ tab 6px, chữ nằm ở `aria-label`/`title` · ô tên mẫu thuộc Số mang **khúc cố định** "S06 –" (`stylePrefix`) ở đầu ô: nền `--plate` như ô chỉ đọc, kẻ `--hair` bên phải, chữ 14/600 `.02em`, ô nhập lùi 76px; mẫu cố định không có khúc, ô Số chỉ đọc ghi "Cố định" · trong sheet Nhập thêm "còn N" 12px `--ink2` trên mỗi ô, đỏ 600 khi ≤ 2 | `admin.css`, `ProductsTable.tsx`, `ProductForm.tsx`, `InventoryAdjustSheet.tsx` |
| `.sheetwrap` + `.scrim` `.sheetbody` `.grab` `.shead(.x)` `.sact`; `.menu3` + `.ticked` `.tally` `.mk`; `.toast(.show)` | ba lớp nổi portal ra `body`; toast `width:max-content` (§6) | `sheet.css` |
| `.veil` (+ `.on` `.hold` `svg` `.stitches`) | lớp chờ chuyển trang: trắng 92% dưới mép nav, mark M2 giữa, cung mũi chỉ mật ong quay; `.hold` giữ con trỏ + `cursor:progress` chỉ khi đang chờ — xem §6 | `sheet.css`, `components/shop/WaitVeil.tsx`, `lib/wait.ts` |
| `.sr-only` | utility duy nhất, tự định nghĩa | `base.css` |

**Căn hàng và nhịp, thêm ở lát 13** (mỗi luật chữa một lỗi đã đo, ghi trong brief):
- **Cột thẳng qua các hàng bằng `subgrid`**: `.rank3.best` (Bán chạy — cột tên rộng
  theo tên dài nhất, vì tên có tiền tố "S05 –"), `.codes .code` (mã đang chạy),
  cùng lối `.solds` đã có; đầu cột `.solds .r.hrow > span` 11px `--ink2`.
- **Hành động của panel quản trị** `.s.adm3 .ft`: flex, gap 8, canh phải, xuống
  dòng được, `margin-top:16` — lối ra rồi nút xác nhận, một chiều cao; sheet có
  `.sheetwrap .sheetbody .ft` riêng.
- **Một mép phải cho mọi con số**: cột cuối của bảng dòng hàng trong panel quản trị
  kết thúc trên lề 16px của panel, thẳng với `.sum3` bên dưới; `.cellmeter span`
  tối thiểu 5,5em canh phải.
- `.kvs dd:has(> .btn)` flex, xuống dòng, gap 8; `.lookup > .help` cách 8, 12px
  `--ink2`; `.ctagrow .sub` lùi 44 (ô 36 + khe 8).
- **Hàng địa chỉ** (`.rows3 .row > .right:has(> .acts)`) ở ≤ 460px xuống một dòng
  riêng, canh trái. Nhóm chip nhãn địa chỉ mang **`wrapped`** ở cả sổ địa chỉ lẫn
  thanh toán — `.chips3:not(.wrapped)` bị ẩn từ 900px, nên thiếu `wrapped` là mất
  điều khiển trên desktop.

**Hai trang danh sách, một component** (lát 11, `components/product/Listing.tsx`).
`/products` là **mọi mẫu đang bán** — mẫu của Số đang mở (kể cả mẫu đã hết) và
mọi mẫu cố định — trong một lưới, không thuộc Số nào: `.lhead.bare`, h1 `sr-only`,
biển Số trên ảnh mẫu thuộc Số. `/so/N` là **trang của Số**: đang bán thì là danh
sách của Số (đầu `.lhead`, không biển trên ảnh), đã đóng thì là hồ sơ của Số
(`ClosedIssue`), chưa mở thì chuyển sang teaser. Mọi lối "xem cả Số" dẫn về
`/so/N` qua `issueHref` (`lib/drop.ts`): biển trên nav, nút bìa, "Xem cả 10
mẫu", đường dẫn trang sản phẩm, lịch chân trang. Lối về cửa hàng của các màn
khác đi qua `wayToShop`: Số đang bán → `/so/N` ("Xem số 05"), không Số nào bán →
`/products` ("Xem tất cả mẫu").

**Biển Số trên ảnh chỉ ở lưới trộn hai loại mẫu** (prop `plate` của
`ProductCard`): `/products`, "Cùng loại" dưới mẫu cố định, kết quả tìm kiếm, Đã
lưu. **Không vẽ** ở chỗ cả hàng là một Số — `/so/N`, "Trong số này", "Cùng số
05", trang Số đã đóng — vì ở đó biển không nói gì thêm.

**Thẻ mẫu cố định** (`isFixed`). Không con số tồn: dòng đếm là bốn size, size
hết ở mọi màu bị gạch ngang (`<s>`); dòng giỏ, danh sách để dành và tài khoản
cũng không in "còn N" (dòng đỏ chặn đặt hàng vẫn giữ số). Kệ trống là tạm hết,
không phải hết hẳn: **không SOLD OUT, không làm mờ ảnh** — mọi size gạch và nút
lặng "Xem chi tiết" (`.addbtn3.view`). SOLD OUT chỉ dành cho mẫu của Số.

**Gallery trang sản phẩm là màu đang chọn** (lát 14, `ProductView.tsx`, đúng
gallery của `prototype/v3/product.html`; thay luật cũ "mỗi màu một khung", vốn
chỉ là đường ống của ảnh mượn). Khung đầu là ảnh của màu ấy, khung thứ hai —
nếu màu có — là ảnh mặc trên người (`lookbookUrl`), alt "<tên> — màu <Màu>, ảnh
mặc trên người". Số 05 có hai khung mỗi màu; màu không có ảnh mặc (hình phẳng,
khung mượn, ảnh tải lên) có **một khung, không số đếm, không chấm**. Chọn màu
khác thay khung và đưa vuốt về khung đầu **ngay**, không trượt (`behavior:
"instant"`) — thứ vuốt sẽ lướt qua là màu cũ; `aria-label` của gallery đếm số
khung của màu.

**Ô ảnh trong form mẫu** (`ProductPhotoSlot.tsx`, `lib/product-form.ts`). Ảnh
đi kèm app là **ảnh thật** như ảnh tải lên (`storedPhotoKind` → `saved`): dòng
chú "**Ảnh thật**" (ảnh tải lên vẫn là "Ảnh đã tải lên", `savedPhotoCaption`),
hai nút "Đổi ảnh" và "Mượn tạm", meta của panel "N màu · đủ ảnh". Khung mượn mang
badge `shut` "mượn tạm" và tên mẫu nó là ảnh của; khung chỉ là **màu không phải
màu đầu** của một mẫu thì tên kèm màu — "S04 – TRO, màu Đen" — để hai khung của
một mẫu không trùng tên (`loanOwner`). Hình phẳng của mẫu cố định vẫn đứng cùng
khung mượn.

**Trang chủ, hai trạng thái** (`app/page.tsx`). Số đang bán: bìa · "Trong số
này" (sáu mẫu của Số) · **"Đang bán"** · "Theo loại" · bốn quy tắc · teaser Số kế
tiếp · dòng Số trước. Giữa hai Số (đã đóng hoặc chưa mở): bìa · **"Đang bán"**
ngay dưới bìa · "Theo loại" · mục lục Số đã đóng (chỉ khi bìa là Số đã đóng) ·
bốn quy tắc · teaser (nếu Số sắp mở chưa là bìa) · dòng Số trước. "Đang bán" là
**sáu mẫu cố định còn hàng, mỗi họ một mẫu trước** (`showcaseOnSale`,
`SHOWCASE = 6`), không mẫu nào của Số đang mở và không có biển trên ảnh; liên
kết "Xem tất cả N mẫu" đếm mọi thứ `/products` liệt kê. "Theo loại" đếm mọi mẫu
đang bán cả hai loại.

**Bẫy trùng tên đã gặp trong đợt v3** (mỗi cái tốn một buổi; tên mới được grep
trước khi đặt): `.sec` (mục trang chủ) vs `.btn.sec` của mock → `.btn.ink`;
`.num` (vai chữ) vs ô số bảng → `td.right`; `.ph` (ảnh v2) vs placeholder →
`data-ph`; `.lead` (đoạn dưới tiêu đề, 60ch + lề) rơi lên `<section>` → `.first`;
`.sub` là thanh phụ v2 (flex + kẻ) rơi lên dòng phụ quản trị → reset một lần
`.s.adm3 .sub`; `.lbl` viết hoa rơi lên nhãn biểu đồ → `.peak`; `.rules`
(checklist mật khẩu v2) vs bốn quy tắc → `.sec .rules`, rồi ở lát 13 khối v2
`.s .rules` bị xoá hẳn vì nó vẫn làm xám tiêu đề bốn quy tắc (màn mật khẩu vẽ
`.checks3`; chỉ `FourRules` còn render `.rules`); `.row` (lists.css) vs
`.index .row` restate; `.grid`/`.grow` là utility Tailwind → `.grid3`/`.fill`;
`.kick` v2 rò rỉ đã xoá cùng lớp v2; preflight `img{display:block}` trong ô bảng.

**Kho trên thiết bị** (localStorage, mỗi khoá một phiên bản `v` và parse phòng
thủ): `brand.session` (bỏ ở B1: phiên là cookie Supabase Auth) · `brand.cart` giỏ · `brand.later` để dành
· `brand.promo` mã đang áp · `brand.wishlist` · `brand.orders` (bỏ ở B2: đơn nằm trong Postgres; người vãng lai giữ khoá biên nhận trong cookie httpOnly `guest_orders`) · `brand.addresses`
sổ địa chỉ · `brand.reminder` nhắc Số · `brand.searches` tìm gần đây ·
`brand.prefs` công tắc · `brand.notif.read` thông báo đã đọc · `brand.adminSim`
(bỏ ở B3b 24/09: tồn kho, Số, teaser, mã giảm giá và sửa mẫu đều ghi Postgres qua hàm `admin_*`, nhật ký là bảng `events` trên máy chủ; khoá cũ còn trong trình duyệt là vô hại, không mã nào đọc)
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
  hai chiều — bỏ ở B3b; `admin-1280.png`).
- **Lát 6** (dọn lớp v2: xoá `table.css`, `/system`, modal, nav2, foot2, hero2,
  card v2, chips, steps, tl, sum…; đo lại 7 cặp hoà chỉ định trong
  `globals.css`): **16 tệp / 3.740 dòng CSS**.

**Lát 8–10** (24–25/09/2026): lát 8 thanh điều hướng biển số (`0ba36cb`,
`56673be`); lát 9 lớp chờ (`5543910`); lát 10 — A tệp thương hiệu QĐ-31
(`325dc51`), B biển chỉ khi Số đang bán (`c4f698b`), C lớp chờ nhả con trỏ khi
trang tới (`c844bca`). Đo trên bản chạy `next start` cổng 3200, 25/09/2026:
- **Thanh điều hướng:** ở 1280, 900, 390 và 360 trùng từng pixel với
  `prototype/name/nav/bar-*.png`. Không có biển: lưới 432 / 300 / 432 ở 1280,
  cụm họ lệch +6px so với tâm, không gì tràn ở 390 và 360.
- **Lớp chờ:** giữ RSC 1,5 giây — cả **104** frame chờ nhận cú bấm giữa màn
  dưới con trỏ progress; không frame nào trong **27** frame đóng sau khi trang
  tới nhận cú bấm hay hiện con trỏ progress, và frame đầu trong số đó vẫn ở
  opacity 1.
- **Biểu tượng:** khung ICO 16, 32, 48, `apple-icon` 180 và `hive-192/512` trùng
  từng pixel với chế độ xuất của bảng (`prototype/name/share.html?icon=…|touch=…`).
  Biểu tượng maskable: pixel vẽ xa nhất tới **39,9%** cạnh ở 512px; ở 192px là
  40,15%, nhưng đó chỉ là viền khử răng cưa.
- **Ảnh chia sẻ:** khác `?og=o2&no=05` của bảng ở 8.742 / 756.000 px (PSNR
  34,4 dB), toàn bộ ở mép glyph — app khử răng cưa bằng xám, Chrome trên bảng
  dùng viền LCD; mảng phẳng giống hệt. `/twitter-image` trùng từng byte với
  `/opengraph-image`.

**Đợt mẫu cố định** (25/09/2026): B5 `28ee1bc`, lát 11 `8558b82` + `3c04d6f`,
lát 12 `bd44b0c` + `50c3aeb`. CSS đếm lại: **16 tệp / 4.108 dòng**. Kiểm trên
bản chạy cổng 3200 khi ghi tài liệu: `/products/khoi` trả 308 về
`/products/s05-khoi`; tên in ra là `S05` U+00A0 `–` U+2013 rồi khoảng trắng
thường; `/products` vẽ `.sotag` "Số 05" `aria-hidden`; 17 PNG trong
`public/flats/` đều 1040×1300 và mang chunk `impeccable:prompt`. Hình học của
biển và dấu trên ảnh **chưa đo từng pixel** ở lượt này — số trong §4 đọc từ CSS.

**Lát 13** (26/09/2026, `025fc2d`, duyệt `0e16821`) — soát toàn app rồi chỉ sửa
lỗi, P1–P37 cộng P30b, V13b, P33b. Đo trước khi sửa: mọi route khách, người mua
và quản trị ở 390 và 1280, thêm 360, 768, 1440 cho các màn chính; mọi lớp nổi mở
ra; trạng thái giữa hai Số dựng trên DB cục bộ; máy dò riêng (chữ cắt, tràn mép,
chữ chồng, tương phản, mồ côi, nút lệch hàng) cùng `tools/layout-sweep.js`. Sau
khi sửa: sweep **91 lượt**, 0 tràn ngang, 0 chữ < 11, 0 con trỏ mũi tên, 0 bị
cắt, chỉ còn **hai miễn trừ đã ghi** (nút icon nav 40×44; hai nút trạng thái
rỗng canh trái); ảnh chụp lại cửa hàng + tài khoản ở 390/1280 so từng cặp, chỉ
số đồng hồ chân trang khác trên trang không có mục sửa. 14 màn quản trị duyệt
bằng ảnh `after-*` của agent (lượt chụp lại bị dừng vì máy thiếu RAM). `tsc`
sạch, **1483/1483** test, build sạch. CSS đếm lại: **16 tệp / 4.324 dòng**.
Lệch mock chấp nhận: cột tên "Bán chạy" rộng theo tên dài nhất; `.ctagrow .sub`
lùi 44 (mock 36 quên khe 8); ở 390 cột mã "Mã đang chạy" dùng chung nên mô tả
hẹp hơn.

**Lát 14** (26/09/2026, `b73c6cf`, duyệt `ece9b3f`) — Số 05 mặc ảnh của chính
nó. Đo: nền chung **`#C3BBB2`**, **19** ảnh thẻ lệch nền ≤ 1 mức; ΔE của lõi món
đồ **bằng 0** trước khi nén; 42 tệp, tổng **7,2 MB**. Phiên chính duyệt độc lập
ảnh ghép 21 ảnh thẻ + 21 ảnh mặc, ảnh chụp 390, 600, 768, 1280 và trạng thái đã
đóng, và một lượt Playwright trên cổng 3200: ảnh Số 05 đều từ `/shots/`, 0 ảnh
hỏng, đổi màu thì gallery về "1 / 2", 0 lỗi console. `tsc` sạch, **1512/1512**
test, 198/198 test DB, build sạch, sweep 91 lượt chỉ còn hai miễn trừ đã ghi. CSS
đếm lại: **16 tệp / 4.340 dòng**. **Còn mở:** hai tệp KHÓI (`khoi-black`,
`khoi-cream`) phải tạo lại trên giấy chuẩn, rồi bỏ khỏi `KEEP_PAPER` và chạy
`npx tsx scripts/shots.ts khoi-black khoi-cream`; bìa trang chủ `hero`, Số 03/04
và teaser Số 06 vẫn mượn; mẫu cố định vẫn là hình phẳng.

**Để nguyên, có biết:** tàn dư v2 `.s details{margin-top:14px; font-size:11.5px}`
(`admin.css`) vẫn rơi lên mọi `<details>` khác trong `.s`. Lát 13 chỉ đặt
`margin-top:0` cho `.orderbox3` từ 900px; khối gốc chưa gỡ, vì các `<details>`
khác (FAQ, khu quản trị) chưa được đo lại khi thiếu nó.

Cách đo không đổi: `tools/layout-sweep.js` quét route cửa hàng × 390/1280 và
route quản trị × 1280 — console, tràn ngang, chữ < 11px, hộp inline sai, ảnh
lệch tỉ lệ, phần tử bị cắt, con trỏ mũi tên, vùng chạm bằng `elementFromPoint`;
lớp nổi **mở ra rồi mới đo**; ảnh chụp so mock từng hộp trước khi ghi vào đây.
