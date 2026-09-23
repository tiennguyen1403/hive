# Việc cần làm — frontend khoi-store

Kế hoạch đầy đủ: [plan.md](plan.md). Tick khi **đã kiểm chứng**, không phải khi đã viết xong.

Lệnh dùng chung:
- build — `npm run build`
- kiểu — `npm run typecheck`
- test — `npm test` (Vitest)
- chạy — `npm run dev` (cổng 3100)
- đối chiếu — prototype ở `http://127.0.0.1:4321`

---

## Phase 0 — Nền

### T1 — Khung app
Dựng `app/layout.tsx`, `app/globals.css`, nạp font, khai báo `images.remotePatterns`
cho `images.unsplash.com`, chạy `next typegen` để có `PageProps`.

- [x] Chấp nhận: `/` trả HTML có `<html lang="vi">`; font tải đúng; không cảnh báo hydrate
- [x] Chấp nhận: `next.config.mjs` dùng `remotePatterns`, **không** dùng `images.domains`
- [x] Kiểm: build sạch · `.next/types` có `PageProps`
- [ ] Phụ thuộc: không · Cỡ: S (2–3 tệp)

### T2 — Tầng token
Chuyển biến màu/khoảng cách/bo góc của prototype sang `@theme` Tailwind 4.

- [x] Chấp nhận: mọi token trong `mocklib.CSS` `:root` có mặt, **không đổi giá trị**
- [x] Chấp nhận: `--fill` `--fill-bd` `--line` giữ đúng con số đã tính tương phản
- [x] Kiểm: in `getComputedStyle(document.documentElement)` so với prototype, khớp từng cái
- [ ] Phụ thuộc: T1 · Cỡ: S

### T3 — Port CSS hệ thiết kế
Chia 1.128 dòng `prototype/app.css` thành 8 tệp trong `app/styles/` (`base` `nav`
`buttons` `cards` `forms` `lists` `admin` `table`), cắt bằng script.

- [x] Chấp nhận: không rule nào bị đổi giá trị trong lúc chuyển
- [x] Chấp nhận: quy tắc cắt ink `--il`/`--ir` còn nguyên, menu vẫn **bị loại trừ**
- [x] Kiểm: `diff` số lượng selector giữa nguồn và đích
- [ ] Phụ thuộc: T2 · Cỡ: M (5–6 tệp)

**◆ Chốt kiểm 0 — XONG 2026-09-20.** Build sạch. Đo trong Chrome:
0/20 token thiếu · `--fill` = `#eba400` · `--r` = `6px` · hai font tự host đã tải
thật, dấu tiếng Việt nguyên vẹn ở cả hai · `.s` 13px/20.15px trên nền trắng, mực
`#211d12` · `data-chuot` có mặt · 606 rule tới được trang · 524/524 rule của
`prototype/app.css` có mặt, không rule nào rơi.

---

## Phase 1 — Dữ liệu

### T4 — Type
`data/types.ts`: `Product` `Color` `Size` `Drop` `Stock` `Order` `OrderLine`
`Customer` `Address` `Promotion` `OrderStatus`. Id có brand; tiền mang `Vnd` trong tên.

- [x] Chấp nhận: mọi type là hợp của literal, không `string` trần cho trạng thái
- [x] Chấp nhận: `Stock` khoá theo **màu rồi tới size**, không phải chỉ size
- [x] Kiểm: `tsc --noEmit` sạch
- [ ] Phụ thuộc: không · Cỡ: S

### T5 — Catalog
`data/catalog.ts`: 21 mẫu từ `mocklib.CATALOG`, **id duy nhất** (BÃO/MEN/VÔI tách khỏi
BỤI/NẮNG/SƯƠNG), tồn kho tách **size × màu**, khoá ảnh tách khỏi id.

- [x] Chấp nhận: 21 id khác nhau đôi một (khẳng định bằng test)
- [x] Chấp nhận: tổng tồn mỗi mẫu bằng đúng tổng cũ trong prototype
- [x] Chấp nhận: số đã bán suy ra (`cutUnits − onHand`), không gõ tay
- [x] Kiểm: 25 test ghim từng mẫu vào đúng con số prototype
- [ ] Phụ thuộc: T4 · Cỡ: M

### T6 — Đơn, khách, khuyến mãi
`data/orders.ts` `customers.ts` `promotions.ts` — dựng mới dưới dạng dữ liệu (trước chỉ
là markup rời). 24 đơn, 8 khách, 6 mã giảm. Đơn là **mẫu gần đây**, không phải sổ đầy đủ.

- [x] Chấp nhận: mỗi đơn tham chiếu id sản phẩm **có thật** trong catalog
- [x] Chấp nhận: tổng tiền đơn = tổng dòng + ship − giảm, tính chứ không gõ
- [x] Chấp nhận: không bịa số liệu vượt ngoài mô phỏng; mọi màn quản trị vẫn gắn nhãn mô phỏng
- [x] Kiểm: 29 test — tham chiếu, màu hợp lệ, tiền cộng đúng, mọi trạng thái có mặt
- [ ] Phụ thuộc: T5 · Cỡ: M

### T7 — Địa giới hành chính
`data/regions.ts` — 6 tỉnh / 19 quận / 50 phường, đủ cho form địa chỉ chạy thật.

- [x] Chấp nhận: chọn tỉnh lọc được quận, chọn quận lọc được phường
- [x] Kiểm: 10 test — mã không trùng, không cấp nào rỗng, cascade khép kín
- [ ] Phụ thuộc: T4 · Cỡ: S

### T8 — Hàm suy diễn
`lib/money.ts` `lib/inventory.ts` `lib/drop.ts` `lib/orders.ts` — port `tien()`,
`dong_ton()`, `dot()`, `so_mau()`, cộng thêm số học đơn hàng và khuyến mãi.

- [x] Chấp nhận: `vnd(1290000) === "1.290.000₫"`, nhóm nghìn **thủ công** chứ không
  qua `Intl` — runtime thiếu ICU sẽ im lặng trả `1,290,000`
- [x] Chấp nhận: số liệu đợt **suy ra từ catalog**, không hằng số gõ tay
- [x] Kiểm: 17 test cho `vnd`, `countWord`, `dropState`, `timeLeft`, `closesInLabel`
- [ ] Phụ thuộc: T5 · Cỡ: S

**◆ Chốt kiểm 1 — XONG 2026-09-20.** `npm run typecheck` sạch · `npm run build` sạch ·
**81/81 test xanh**. Đợt 5 suy ra từ catalog: 10 mẫu · 181 cắt · 108 bán · 73 còn ·
**77.500.000₫** — khớp `doanh_thu(5)` của prototype. Đợt 4 và 3 cũng khớp
(171.600.000₫ / 133.020.000₫). 21 bộ ảnh cần chụp, đúng như `SO_BO_ANH`.

---

## T3b — Đổi tên CSS sang tiếng Anh  *(XONG 2026-09-20)*

Người dùng chốt: **mọi code viết bằng tiếng Anh, trừ chữ hiển thị trên UI.**
Phase 0 và 1 đã theo. Còn lại là CSS đã port: ~35 tên class tiếng Việt trong
tổng 246 (`vuot` `chonsize` `nut` `nhan` `dau` `thieu` `cham` `het` `mau`
`khung` `vach` `goc` `ghichu`…) và 261 dòng chú giải.

Làm ngay trước Phase 2 vì đó là lúc rẻ nhất: **chưa component nào tham chiếu
tới chúng.** Làm sau thì phải sửa cả CSS lẫn mọi `className`.

- [x] Chấp nhận: 0 tên class tiếng Việt còn lại trong `app/styles/`
- [x] Chấp nhận: tên mới không đụng tên đã có (kiểm bằng script, không bằng mắt)
- [x] Chấp nhận: 261 dòng chú giải dịch sang tiếng Anh, **giữ nguyên lý lẽ và con số**
- [x] Kiểm: vẫn đúng 524 rule; chạy lại phép đo thứ tự nguồn của T3
- [x] Phụ thuộc: T3 · Cỡ: M
- [ ] **Đánh đổi đã biết:** prototype vẫn giữ tên tiếng Việt, nên từ T3b trở đi
      việc đối chiếu với nó là **so ảnh**, không so DOM được nữa.

---

## Phase 2 — Primitive (viết lại `app.js`)

### T9 — Icon
`<Icon name kind>` + bảng ink; `<Tick>` viewBox cắt sát `7.75 9.17 8.5 5.66`.

- [x] Chấp nhận: `--il`/`--ir` phát ra đúng như `mocklib.icon()`
- [x] Chấp nhận: tên icon gõ kiểu, sai tên là lỗi biên dịch
- [x] Kiểm: đo `getBBox()` trong trình duyệt — khoảng hở nhìn thấy == `gap` khai báo
- [ ] Phụ thuộc: T3 · Cỡ: S

### T10 — Điều khiển cơ bản
`<Button>` `<Chip>` `<Badge>` `<Field>` `<Select>`.

- [x] Chấp nhận: `<Select>` là dropdown của hệ, **không** `<select>` gốc, ở mọi màn desktop
- [x] Chấp nhận: mũi tên xoay khi mở; viền đổi sang `--fill-bd`; Esc đóng
- [x] Chấp nhận: vùng chạm ≥ 44px ở mobile
- [x] Kiểm: bàn phím — Tab tới, Enter mở, mũi tên chọn, Esc đóng
- [ ] Phụ thuộc: T9 · Cỡ: M

### T11 — Sheet
`<Sheet>` (nền mờ, khoá cuộn, bẫy focus, **ngăn xếp Esc**) + `<SizeSheet>`.

- [x] Chấp nhận: hàng size dùng biến mobile — chip `flex:1`, 83×60, lề 18px hai bên
- [x] Chấp nhận: chọn size xong nút gốc hiện "Đã thêm size M"
- [x] Chấp nhận: đổi màu trong sheet cập nhật tồn theo **size × màu** (nhờ T5)
- [x] Kiểm: mở chồng sheet + menu, Esc đóng đúng thứ tự từng lớp
- [ ] Phụ thuộc: T10 · Cỡ: M

### T12 — Thẻ sản phẩm
`<ProductCard>` mẫu E+ đã chốt: băng ảnh vuốt theo màu, chấm chỉ vị trí, "còn N" khi ≤3,
dòng "hết XL", nút thêm vào giỏ.

- [x] Chấp nhận: vuốt đổi ảnh, chấm theo kịp khi cuộn (**không** dựa vào `requestAnimationFrame`)
- [x] Chấp nhận: thẻ không thêm thông tin nào ngoài những gì đã chốt
- [x] Kiểm: so ảnh với `the-san-pham.html` ở 390px và 1280px
- [ ] Phụ thuộc: T11 · Cỡ: M

### T13 — Bảng dữ liệu
`<DataTable>` trên TanStack Table: nút lọc, sắp xếp, chọn dòng, menu Cột, thao tác hàng
loạt, chân bảng, phân trang mũi tên.

- [x] Chấp nhận: dropdown cỡ trang là **của hệ**, không phải `<select>` gốc
- [x] Chấp nhận: dấu tích 20×6.7px trong menu, 11×7.3px trong ô chọn
- [x] Chấp nhận: trạng thái rỗng và trạng thái đang tải đều có
- [x] Kiểm: đếm `document.querySelectorAll('select').length === 0` trên mọi màn quản trị
- [ ] Phụ thuộc: T10 · Cỡ: L → tách nếu vượt 5 tệp
- [x] **Đã cài**: `@tanstack/react-table` **v9.2.4**

### Sửa sau khi người dùng soi — 2026-09-20

Bốn lỗi người dùng chỉ ra, đã sửa và đo lại trên `npm run preview`:

| # | Triệu chứng | Nguyên nhân gốc | Sửa |
|---|---|---|---|
| 1 | Icon `check` trông nhỏ hơn hẳn | Nét của nó chỉ **8,5/24 đơn vị** trên trục dài, so với 20 của icon thường — trong hộp 18px ra 6,38 × 4,24px, lấp 8,4% | `check` vào `MARK_NAMES`, loại khỏi `GLYPH_NAMES`; dùng `<Tick>` (viewBox cắt sát) hoặc `confirm` |
| 2 | Chữ dính sát mép nút | `.s .btn` **không có** padding ngang — prototype luôn dùng nút tràn cột nên không ai thiếu nó; đặt vào hàng ngang thì lộ ("Huỷ" rộng 27px) | thêm `padding:0 16px` |
| 3 | Dropdown cuộn là tự đóng | `useDismissOnScroll` bắt `scroll` ở window pha capture → bắt luôn cú cuộn **bên trong chính menu** | bỏ qua sự kiện có target nằm trong menu |
| 4 | Nút "Bộ lọc" xuống dòng giữa icon và chữ | `.chip` là hộp inline; `.chip.icon` mới là flex — component không thêm lớp `icon` | thêm `icon` khi có icon; bỏ luôn `count` tôi tự bịa (không có trong thiết kế đã duyệt) |

Đo sau khi sửa: nút padding 16px hai bên · chip "Bộ lọc" `display:flex`, cao 32px
(trước 46,8) · menu cuộn 600px bên trong mà không đóng · `check` không còn trong lưới glyph.

**Hai rule THÊM vào CSS đã port** (ngoài 524 rule gốc), cả hai vì prototype
chưa từng gặp tình huống đó:
- `.dt .menu, .s .selm{ overflow-y:auto; overscroll-behavior:contain }` — menu 168 mục
- `.s .btn{ padding:0 16px }` — nút đứng trong hàng ngang

**◆ Chốt kiểm 2 — XONG 2026-09-20.** `npm run typecheck` sạch · `npm run build`
sạch · **206 test xanh**. Đo trên `npm run preview`:

**T11 tấm trượt** — nền mờ phủ đủ 1920×911 ở `rgba(12,10,6,.5)`, tấm 390px dính
đáy, khoá cuộn trang (`overflow:hidden`), Esc đóng và **tiêu điểm về đúng nút đã
mở**. Đổi màu thì số tồn đổi thật: BỤI màu Đen còn L, màu Xám còn XL — hai câu
"đã hết" khác nhau. Đây là điểm trả công của việc tách size × màu ở T5.

**T12 thẻ** — bốn trạng thái đúng: KHÓI (2 màu, im lặng) · BỤI ("còn 2" + "hết S M")
· NGUỘI (một màu → ảnh tĩnh, không băng) · MUỐI (hết → không nút, có "HẾT HÀNG").

**T13 bảng** — 24 đơn, 9 cột. Lọc "Đã giao" → *Hiện 1–10 trên 14 đơn (lọc từ 24)*,
chip nhận `on` + nhãn đếm. Sắp theo Tổng giảm dần đúng. Chọn dòng → thanh công cụ
**đổi vai tại chỗ** thành `.bar.bulk`. **0 `<select>` gốc.**

Đã đo cho T9/T10 (trên bản `npm run preview`, xem "Dev server" dưới):
· cắt ink — `gap:7px` khai báo, **7,00–7,02px** thấy được từ `chev` (hẹp nhất) tới
  `truck` (rộng nhất); trước khi cắt, cùng con số ấy phình từ 6,9 tới 12px
· dropdown — 34 tỉnh, mở/đóng/Esc/bàn phím chạy, `position:fixed`, mũi tên xoay,
  viền đổi sang `#C28800`, **0 `<select>` gốc**
· cascade — chọn TP.HCM mở khoá **168** phường/xã
· thứ tự tiếng Việt — An Giang · Bắc Ninh · Cà Mau · Cao Bằng · Đắk Lắk

**Hai lỗi bắt được lúc đo, đã sửa:**
1. Nút thiếu class `inp sel` nên rơi về `inline-block`, mũi tên tụt xuống dòng.
   `.inp` mới là chỗ cấp `display:flex` và chiều cao 44px.
2. `.selm` **chưa bao giờ** phải chứa danh sách dài: prototype chỉ có menu 4–10 mục.
   168 phường/xã render ra tấm cao **5.488px** thò ra cả hai đầu màn hình. Đã thêm
   `max-height` tính theo chỗ trống cạnh nút + `overflow-y:auto`.

---

## Phase 3 — Luồng mua

### T14 — Trang chủ · XONG
`/` — ba trạng thái đợt (sắp mở / đang mở / đã đóng) + bố cục desktop.

- [x] Chấp nhận: đếm ngược chạy thật, tự chuyển trạng thái khi hết giờ
- [x] Chấp nhận: trạng thái lấy từ dữ liệu đợt, không phải cờ gõ tay
- [x] Kiểm: so ảnh `trang-chu` `dot-sap-mo` `dot-da-dong` `trang-chu-pc`
- [x] Phụ thuộc: T12 · Cỡ: M

`featuredDrop(no, now)` tách hai việc: `?drop=` chọn **đợt nào**, đồng hồ quyết
định **trạng thái nào**. Nhờ vậy "Đợt 04 đã đóng · xem lại" có chỗ để dẫn tới, mà
không URL nào bịa được một đợt đã đóng thành đang mở. Đếm ngược tính lại từ mốc
hết hạn mỗi giây (không trừ dần), nên tab ngủ một tiếng rồi quay lại vẫn đúng; hết
giờ thì gọi `router.refresh()` để **cả trang** lật trạng thái, không chỉ dải băng.

### T15 — Danh mục & tìm kiếm · XONG
`/products` (+ sheet lọc) · `/search` (+ không ra kết quả).

- [x] Chấp nhận: bộ lọc nằm ở `searchParams`, link chia sẻ được, **`await searchParams`**
- [x] Chấp nhận: trạng thái rỗng dẫn được người dùng đi tiếp
- [x] Kiểm: so ảnh 4 màn; back/forward giữ đúng bộ lọc
- [x] Phụ thuộc: T14 · Cỡ: M

Sheet lọc sửa **bản nháp**, chỉ ghi vào URL khi bấm Áp dụng — bấm từng chip mà
đẩy URL thì một quyết định để lại chục mục trong lịch sử, và Back đi ra khỏi cửa
hàng từng chip một. Nút Áp dụng đếm trước: *Xem 4 mẫu*.

### T16 — Trang sản phẩm · XONG
`/products/[slug]` — bình thường, hết hàng, desktop.

- [x] Chấp nhận: dùng `PageProps<'/products/[slug]'>` và `await props.params`
- [x] Chấp nhận: slug lạ → `notFound()`
- [x] Chấp nhận: hết size hiện **trước** khi chạm nút, không phải lỗi sau khi chạm
- [x] Kiểm: so ảnh 3 màn; `/products/khong-co-mau-nay` ra 404
- [x] Phụ thuộc: T15 · Cỡ: M

### T17 — Giỏ hàng · XONG
`/cart` ba trạng thái + `CartContext` lưu `localStorage`.

- [x] Chấp nhận: giỏ sống qua tải lại trang
- [x] Chấp nhận: món vừa hết hàng hiện cảnh báo tại dòng, chặn thanh toán
- [x] Chấp nhận: đổi số lượng bị chặn bởi tồn kho thật
- [x] Kiểm: so ảnh 3 màn; thêm → tải lại → vẫn còn
- [x] Phụ thuộc: T16 · Cỡ: M

### T18 — Thanh toán · XONG
`/checkout` (Giỏ → Địa chỉ → Thanh toán → Xong) → `/order-confirmed`.

- [x] Chấp nhận: thanh bước phản ánh đúng bước hiện tại
- [x] Chấp nhận: phí ship và tổng tiền hiện **sớm**, không giấu tới bước cuối
- [x] Chấp nhận: form dùng địa giới T7; lỗi nhập hiện tại trường
- [x] Kiểm: đi hết luồng ở 390px, không rời trang
- [x] Phụ thuộc: T17 · Cỡ: M

Bước hiện tại **suy ra** từ mức hoàn thành của form (`checkoutStep`), không gõ tay:
địa chỉ đủ → nhảy sang "Thanh toán". Lỗi chỉ hiện sau khi người mua rời ô đó hoặc
bấm Đặt hàng — quát "cần tên người nhận" vào một form còn trắng là tiếng ồn.

**◆ Chốt kiểm 3 — XONG 2026-09-20.** `npm run typecheck` sạch · `npm run build`
sạch, 32 trang tĩnh (21 trang sản phẩm dựng sẵn) · **359 test** xanh.

Đi trọn luồng trong **viewport 390px thật** (iframe 390×844, vì cửa sổ đang
maximise nên `resize_window` không ăn — và thu nhỏ `.s` thì media query *không*
đổi, phải có viewport thật mới đo được):

    /  →  /products  →  /products/khoi  →  giỏ  →  /checkout  →  /order-confirmed

Mỗi chặng **tràn ngang = 0**. Số cuối: 390.000₫ hàng (dưới mốc 1.000.000₫) →
ship 30.000₫ → tổng 420.000₫. Địa chỉ in ra "45 Lý Thường Kiệt, Xã An Khánh,
Hà Nội" — **hai cấp**, đúng tiền tố "Xã".

Đo thêm:
· ba trạng thái đợt — `?drop=6` (chưa mở, teaser SỎI + NGÓI, **0 nút thêm**) ·
  `?drop=4` (đã đóng, băng `--gold-100`, 4 tấm "ĐÃ ĐÓNG", **0 nút thêm**) ·
  mặc định (đang mở)
· lọc — `?size=S&fit=OVERSIZE&sort=price-desc` ra đúng 4/10, giá giảm dần
  1.350.000 → 390.000; đối chiếu lại với dữ liệu: 6 mẫu oversize, chỉ 4 còn size S
· PDP — BỤI màu Đen chỉ còn L, màu Xám chỉ còn XL; ba size kia **disabled từ đầu**
· giỏ — BỤI còn 1 nên nút `+` tắt sẵn; NGUỘI còn 2 nên `+` tắt ở nấc thứ hai;
  gõ 99 → chốt về 2 kèm câu "Đợt này chỉ còn 2 chiếc size M"
· giỏ vướng — đúng ba con số của bản mock: tạm tính 450.000 · ship 30.000 ·
  tổng 480.000, nút thanh toán `.btn off`, và "Đổi sang size L" hiện ra vì
  BỤI đen **thật sự** còn L
· mã giảm — `dot05` (viết thường) ăn, chặn ở trần 150.000₫, sai mã báo tại chỗ
· địa giới — 34 tỉnh đúng thứ tự tiếng Việt · TP.HCM **168** phường/xã ·
  Hà Nội **126** · menu cao 343px trong viewport 390px, không thò ra
· giao nhanh — tắt ở Hà Nội, bật ở TP.HCM; COD thêm dòng "Phí thu hộ 15.000₫"
· desktop 1920 — vỏ 1280 căn giữa, lưới 3 cột, PDP hai cột 612/554 khoảng cách 34

**Bốn lỗi bắt được lúc đo, đã sửa:**
1. `dropBandLabel` xuất từ module `"use client"` → server component gọi vào là
   **văng 500**. Build không bắt được; chỉ chạy thật mới lộ. Đã dời xuống
   `lib/drop.ts` và đóng đinh bằng test.
2. Dấu tích trên màn xác nhận render **18px** thay vì 54px. `Icon` luôn tự ghi
   class `ic`, mà `.ic` ghim mọi glyph ở 18px; bản mock đạt 54px bằng cách
   truyền class **rỗng**. Thêm biến thể `.ic.xl` — cỡ phải là một cái tên, không
   phải sự vắng mặt của một cái tên.
3. `.swa` chỉ được định nghĩa dưới `.sizesheet`, nên ô chọn màu trên trang sản
   phẩm đo ra **0×0**. Nới lên `.s .swa`; `.szrow` giữ nguyên phạm vi vì đó mới
   là khác biệt thật giữa tấm trượt và bản desktop.
4. Ô chọn màu / link trên thanh nav cao **18px**, dưới sàn 44px của PRODUCT.md —
   lỗi này thừa kế nguyên từ prototype. Thêm lớp phủ vô hình như `.btn` vẫn dùng:
   18 + 13 + 13 = 44, đo lại ra 44.

**Hai lần tôi đo sai, không phải code sai:**
· bắn `new Event('blur')` vào ô số lượng rồi kết luận nó nuốt mất số 99. React
  nghe `focusout` chứ không nghe `blur`; focus thật vào rồi ra thì nó chốt đúng.
· thu `.s` xuống 390px rồi đếm thẻ, tưởng `.sixup` hỏng. Media query đọc
  **viewport**, không đọc phần tử.

---

### ◆ Rà hình thức — 2026-09-20, sau khi người dùng chỉ ra thẻ sản phẩm lệch nhau

Chốt kiểm 3 ở trên đo **hành vi** rất kỹ và **không nhìn** lấy một lần xem lưới
có ra lưới không. Người dùng nhìn phát ra ngay. Dưới đây là đợt rà bù, và nó
lôi ra sáu lỗi — một lỗi thấy được bằng mắt, và năm lỗi cùng một gốc mà tôi
chưa từng nghĩ tới.

**1. Ảnh thẻ cao thấp khác nhau — lỗi người dùng chỉ ra.**
`.s .ph{ width:100%; aspect-ratio:4/5 }`. Bản mock luôn đặt `.ph` lên một
`<div>`; bản này biến chính tấm ảnh thành liên kết tới trang sản phẩm, và `<a>`
là **inline** — nơi cả `aspect-ratio` lẫn `width` phần trăm đều bị bỏ qua không
một lời cảnh báo. Tấm ảnh lấy luôn chiều cao của tấm hình mượn: đo được **483px
cạnh 570px và 689px trong cùng một hàng**. Sửa: `display:block`.

Lỗi này chỉ rơi vào hai thẻ — mẫu một màu (NGUỘI) và mẫu hết hàng (MUỐI), hai
trường hợp duy nhất dùng `StaticPlate`. Chín thẻ kia đi qua `.pane`, vốn là
flex item nên đã là block.

Viết luôn một **máy dò** thay vì sửa đúng một chỗ: quét mọi phần tử đang
`display:inline` mà CSS lại khai báo thứ chỉ hộp block mới giữ được. Chạy trên
14 route × 2 bề ngang. Chỉ có `A.ph` — nhưng giờ thì biết chắc là chỉ có nó.

**2–6. `prototype/shell.css` có một tầng CSS của ứng dụng mà Phase 0 bỏ sót.**
Dưới dòng `TỪ ĐÂY TRỞ XUỐNG LÀ BÊN TRONG .s` là ~80 dòng quy tắc gắn với `.s`,
nằm nhầm trong tệp vỏ xem. Phase 0 port `app.css` và **bỏ qua cả `shell.css`**,
nên mọi màn khách hàng thiếu nguyên tầng tương tác:

| Thiếu | Hậu quả đo được |
|---|---|
| `div > button.btn:only-child{ width:100% }` | `<a class="btn">` giãn hết hàng, `<button class="btn">` co lại còn **153px**. "Chọn size trước", "Đặt hàng", "Nhắc tôi khi mở" đều lệch. |
| `.btn:hover / :active`, `.sz:hover`, `.chip:hover` | không nút nào có phản hồi khi di chuột |
| `cursor:pointer` cho chip và link dạng nút | `<button>` mặc định là mũi tên, không phải bàn tay |
| `@media (max-width:460px)` — hộp 44px cho `.lnk` / `.rt` | "Bảng size", "Xoá", "Huỷ" cao **15px**, dưới sàn PRODUCT.md |
| `input.inp::placeholder`, `textarea.inp`, `.inp:focus` | placeholder và ô nhiều dòng không theo hệ |

Đã port thành `app/styles/interaction.css`, dịch các móc `[data-go]` /
`[data-act]` của bản mock thành phần tử thật, và ghi rõ hai quy tắc **cố ý
không port** (`.cartdot .bag0/.bag1` và `select.inp` — bản này không có
`<select>` gốc nào).

**Ba lỗi nữa bắt được trong cùng đợt rà:**
· hàng chip ở `/products` dài **452px trong khung 375px**, mà `.chips` là
  `overflow:hidden` — chip sắp xếp bị cắt và **không cách nào chạm tới**. Bản
  mock có 4 chip ngắn nên đủ chỗ; ở đây chip sắp xếp mang nhãn động, dài tới
  "Giá thấp đến cao". Đổi thành vùng cuộn ngang như `.slide` vẫn dùng.
· nút "Áp dụng" bị ghim cứng 96px từ bản mock, nay `.btn` đã có padding 16px
  hai bên nên chữ **xuống hai dòng**. Bỏ chiều rộng cố định.
· hàng "Giao nhanh" khi bị vô hiệu hoá trông **y hệt** hàng bấm được. Thêm kiểu
  mờ theo đúng `.btn.off`; lý do vẫn nằm bằng chữ trong dòng `.d`, nên trạng
  thái không bao giờ chỉ dựa vào hình thức.

**Rà lại sau khi sửa** — 14 route × 390px và 1280px, mỗi route kiểm năm thứ:
hộp inline, tỉ lệ ảnh trong cùng lưới, nút đơn độc có giãn hết không, con trỏ
của mọi điều khiển, và phần tử bị cắt trong khung `overflow:hidden`. **Sạch cả
28 lượt.** Ảnh thẻ: tất cả 4:5, cao bằng nhau, nút thẳng hàng trong mỗi hàng.

---

## Phase 4 — Tài khoản

### T19 — Vào cửa · XONG
`/sign-in` `/sign-up` `/forgot-password` (+ đã gửi liên kết).

- [x] Chấp nhận: xác thực giả lập bằng context; **không** gọi mạng
- [x] Chấp nhận: lỗi nói rõ sai ở đâu, không phải "có lỗi xảy ra"
- [x] Kiểm: so ảnh 4 màn
- [x] Phụ thuộc: T10 · Cỡ: M

Ba màn này **nói thẳng trên mặt** rằng chúng chưa nối máy chủ. Một form đăng
nhập trông như thật mà không kiểm gì là lời mời gõ vào đó mật khẩu dùng ở chỗ
khác; `Session` do đó không có chỗ nào để chứa mật khẩu, và test đóng đinh điều
đó. Màn quên mật khẩu **không** nói "không có tài khoản này" — trên form đặt lại
mật khẩu, câu ấy là cách dò xem email nào đã đăng ký.

### T20 — Hồ sơ · XONG
`/account` · `/account/profile` · `/account/password`.

- [x] Chấp nhận: chưa đăng nhập vào `/account` → chuyển hướng `/sign-in`
- [x] Kiểm: so ảnh 3 màn
- [x] Phụ thuộc: T19 · Cỡ: M

`AccountGuard` đợi `ready` rồi mới chuyển hướng — bật ngay ở nhịp vẽ đầu sẽ đá
người đang đăng nhập ra khỏi tài khoản của chính họ mỗi lần tải lại. Và nó
không vẽ trang bên dưới lệnh chuyển hướng: `router.replace` không tức thời, một
lịch sử đơn kịp loé lên thì vẫn là đã bị nhìn thấy. Đường về được mang theo
trong `?next=`, và chỉ nhận đường dẫn nội bộ.

Số đếm dưới mỗi cửa (`5 đơn`, `1 đang giao`, `2 địa chỉ`) **đọc từ dữ liệu**.
Bản mock gõ tay — một con số gõ tay là con số sai ngay lần đầu ai đó dùng màn
hình mà nó mô tả.

### T21 — Đơn của khách · XONG
`/account/orders` · `/[code]` · đã huỷ · `/[code]/tracking`.

- [x] Chấp nhận: đọc từ `data/orders.ts`, mã lạ → 404
- [x] Chấp nhận: mốc vận chuyển không chỉ dùng màu để phân trạng thái
- [x] Kiểm: so ảnh 4 màn
- [x] Phụ thuộc: T20 · Cỡ: M

`visibleOrder` **từ chối đơn của người khác**, không chỉ đơn không tồn tại. Mã
đơn chạy `DH-2419`, `DH-2422` — đếm là ra cái kế tiếp — và sau mã ấy là tên, số
điện thoại, địa chỉ nhà. Trả 404 chứ không phải "bạn không có quyền": câu sau
xác nhận đơn có tồn tại.

Dòng thời gian **suy ra** từ `OrderStatus`, không gõ sẵn. Test đóng đinh bất
biến: đúng **một** bước đang chạy, không bước nào sau nó đã xong. Đơn đã huỷ
dừng ngay ở mốc huỷ — vẽ "Đang giao" mờ bên dưới một lệnh huỷ là gợi ý hàng vẫn
đang tới.

### T22 — Địa chỉ & yêu thích · XONG
`/account/addresses` + `/new` · `/account/wishlist` + rỗng.

- [x] Chấp nhận: yêu thích lưu `localStorage`
- [x] Kiểm: so ảnh 4 màn
- [x] Phụ thuộc: T21 · Cỡ: M

**Sổ địa chỉ lưu thật**, và địa chỉ mặc định **điền sẵn vào trang thanh toán** —
đúng lời hứa in trên chính màn ấy. Đó là lý do nó được làm cho chạy thay vì
thành cái thứ tư nói "chưa nối máy chủ": dữ liệu này là của người mua, trình
duyệt là một nơi có thật để giữ nó, và màn hình ghi rõ nó nằm ở đâu.

*Lệch có chủ ý:* bản kế hoạch ghi "đồng bộ với trái tim trên thẻ", nhưng thẻ sản
phẩm đã duyệt **không có** trái tim — chính màn yêu thích cũng viết "ở trang sản
phẩm". Nút lưu vì thế nằm ở trang sản phẩm, đúng như thiết kế đã duyệt.

**◆ Chốt kiểm 4 — ĐẠT 2026-09-20.** `npm run typecheck` sạch · `npm run build`
sạch · **453 test** xanh · 22 route.

**Vùng chạm** — đo **hit area** (không phải hộp) của **277 điều khiển trên 19
route** ở viewport 390px thật. Sau khi sửa: **không còn cái nào dưới 44px.**
Bảy chỗ vi phạm, phần lớn thừa kế từ bản port:

| Chỗ | Đo được | Nguyên nhân |
|---|---|---|
| mũi tên quay lại ở mọi màn tài khoản | 19px | chú giải trong `nav.css` khẳng định "hộp vuông của icon đứng một mình CHÍNH LÀ vùng 44px" — không phải: `.ic` là 18px và không gì đệm quanh liên kết |
| `.qb` tăng/giảm số lượng | 35px | `.qty` có `overflow:hidden`, **cắt mất** lớp phủ ±5px mà `lists.css` đã đặt |
| `.chip` | 32→42px | chưa từng có lớp phủ; hàng chip xuống dòng còn chồng lấn nhau |
| `.addbtn` trong ô yêu thích | 34px | lớp phủ 44px của link "Bỏ khỏi yêu thích" **đè lên** nó qua khe 6px |
| tên sản phẩm trong dòng giỏ | 21px | lối duy nhất từ giỏ sang trang sản phẩm; ảnh bên cạnh không phải liên kết |
| hàng tích `.check` | 28→34px | `.check` chỉ có padding trên |

**Bàn phím** — 9 route, mọi điều khiển nhận được tiêu điểm, không chỗ nào bẫy
tiêu điểm, vòng focus 3px hiện ở tất cả. Các `tabIndex={-1}` duy nhất là những
tấm ảnh trong băng vuốt: băng tự nó nhận tiêu điểm và đi bằng phím mũi tên, mỗi
tấm chỉ lặp lại đích đến của tên thẻ ngay dưới.

**Rà hình thức** — 24 route × 2 bề ngang (390 và 1280), năm hạng mục như Phase 3.
**Sạch cả 48 lượt.**

**Ba lỗi khác bắt được lúc đo:**
1. **Mất dữ liệu trong cả ba kho — kể cả giỏ hàng của Phase 3.** Hiệu ứng ghi
   được canh bằng một `ref` bật đồng bộ trong hiệu ứng đọc, nên nó chạy **cùng
   nhịp commit** ấy, thấy "đã nạp" trong khi state vẫn là mảng rỗng, và **ghi
   rỗng đè lên** thứ đang có trong `localStorage`. Bình thường nó tự lành ở lần
   render sau — nhưng điều hướng trong khoảng đó thì bản ghi rỗng là bản sống
   sót. Bắt được vì lưu một mẫu, sang trang khác, rồi mở danh sách: trống trơn.
   Sửa bằng cách canh trên `ready` (một **state**, vào cùng lô với dữ liệu).
2. **Hai địa chỉ cùng nhận "Mặc định".** `saveAddress` xoá cờ trong danh sách
   *thiết bị*, nhưng địa chỉ từ tài khoản mang cờ từ fixture và không nằm trong
   danh sách ấy. Hệ quả nhìn thấy được: lưu một mặc định mới **trông như không
   làm gì cả** — checkout vẫn điền địa chỉ cũ.
3. **Thẻ trong tab đơn hàng không được tạo kiểu.** `.s .tabs span` — bản mock
   vẽ tab bằng `<span>` vì không có gì bấm được; ở đây chúng là
   `<button role="tab">` nên **không quy tắc nào chạm tới**: không padding,
   không gạch chân dưới mục đang chọn. Cùng họ với lỗi `.swa` ở Phase 3.


### ◆ Tinh chỉnh sau Phase 4 — 2026-09-20

**Dòng thời gian đơn hàng — mọi mốc bằng nhau.** Mốc có dòng chi tiết cao 53px,
mốc không có cao 35px, nhịp chấm 53 · 36 · 35 · 53 — đọc ra như biểu đồ thời
lượng trong khi các mốc là một chuỗi. Chừa sẵn một dòng chi tiết trên mọi mốc
(`--tl-title-line` + `--tl-detail-line` + `--tl-foot`, `min-height` chứ không
`height`). Sau: **53,422px đều tăm tắp** trên cả ba màn có dòng thời gian, ở 390
và 1280; đoạn nối đều 33px.

**Nút bỏ yêu thích lên tấm ảnh** — xem QĐ-19 trong `plan.md`. Thay vì dòng chữ
gạch chân dưới thẻ, một nút tròn 32px ở góc trên phải ảnh, đeo `heart-slash`
(Bulk). Người dùng chọn phương án này sau khi so bốn phương án dựng bằng chính
CSS đã build của app.

- [x] `.cardcell` / `.cardcellfoot` **đã xoá** — lưới yêu thích giờ là lưới thẻ
      thường. Hai bài học về vùng chạm được giữ lại thành chú giải tại chỗ cũ.
- [x] Icon `heart-slash` thêm vào bộ: rút từ đúng `iconsax-react@0.0.8` mà 51
      glyph kia đã sinh ra, bằng bộ rút tự kiểm bằng cách **tái tạo đúng từng
      byte cả 51 glyph cũ** trước. Nhịp mực đo trong trình duyệt sau khi phương
      pháp đo **tái tạo chính xác cả 64 nhịp đã ghi**. Linear đo ra [2, 20] —
      đúng bằng `INK_FALLBACK` nên không ghi; Bulk [1.25, 21.49] nên có ghi.
- [x] Đo ở 390px: vùng chạm nút bỏ **44×45**, nút thêm giỏ **171×44** (không bị
      ảnh hưởng), tràn ngang **0**, hai hàng thẻ ngắn đi **76px**.
- [x] Dò `elementFromPoint` dọc mép trên ảnh nhiều màu: trái = dải vuốt, giữa =
      dải vuốt, góc phải = nút. Cái giá đúng bằng 44px đã lường trước.
- [x] Bấm thật: 4 thẻ → 3, `localStorage` còn 3 mã. Băng vuốt vẫn cuộn.
- [x] Vòng focus bàn phím vẫn **tròn** (`border-radius` 99px thắng quy tắc
      `:focus-visible`), 2px màu `--mark`, offset 2px.
- [x] 5 route khác dùng `ProductCard` kiểm lại: **0** `.unsave`, **0**
      `.cardcell` — nút chỉ sống ở trang yêu thích.
- [x] `npm run typecheck` sạch · `next build` sạch (42 trang tĩnh) · **455 test**
      xanh · máy dò layout trả `[]`

**Icon trong dòng ghi chú bị rơi xuống hàng riêng.** `<Icon>` đứng trong một
khối chữ thường — không phải trong cha flex — nên `svg{ display:block }` của
Tailwind preflight cho nó hẳn một hàng, chữ tụt xuống **16px** bên dưới. Quét
**21 route ở 390px**: đúng **ba** chỗ, cùng một cấu trúc (sổ địa chỉ · thêm địa
chỉ · nhật ký hành trình).

- [x] Sửa bằng **một biến thể** `.note.icon` trong `base.css`, không vá ba chỗ:
      `display:flex; align-items:flex-start; gap:6px`. Đặt tên theo `.chip.icon`
      đã có sẵn trong hệ.
- [x] Icon được **một cột riêng** chứ không chen vào câu: cả ba ghi chú đều dài
      2–3 dòng ở 390px; để inline thì dòng 1 thụt vào còn dòng 2–3 sát lề, đọc
      ra như lỗi. Có cột thì icon đánh dấu cả khối và chữ giữ một mép thẳng.
- [x] Thêm `.s .note.icon > .ic` vào danh sách cắt mực trong `nav.css`, nên
      **khe 6px khai báo đúng là khe 6px nhìn thấy** (đo: hộp cách 4,8px, mực
      `info` hụt 1,25px mỗi bên → 6,05px).
- [x] `margin-top:1px` canh icon theo **dòng đầu**, không theo cả khối. Đo lại:
      lệch tâm còn **0,5px**.
- [x] Quét lại 21 route: **0** icon còn rơi hàng · tràn ngang 0 trên mọi route
      của khách.
- [x] `npm run typecheck` sạch · `next build` sạch · **455 test** xanh · máy dò
      layout trả `[]`

**Ghi nhận, chưa sửa:** `/system` tràn ngang 424px ở 390px vì nó trưng bảng dữ
liệu quản trị (`.dt`, rộng 756px) làm mẫu vật. Có sẵn từ trước, và `/system` là
trang tra cứu nội bộ chứ không phải route của khách — để nguyên.

---

### ◆ Lỗi bắt được trong lượt thử `playwright cli` — 2026-09-20

Lượt đầu chạy `playwright cli` (xem QĐ-20) đi thử luồng mua và lôi ra một lỗi
mà cả 455 test lẫn đợt rà hình thức đều không thấy.

**Thêm vào giỏ từ sheet của THẺ sản phẩm không có tác dụng.** Sheet đóng lại
như thể đã nhận — đó là kiểu hỏng tệ nhất, người mua tưởng xong rồi.

Đã nhị phân để khoanh vùng, không đoán:

| Đường đi | Kết quả đo |
|---|---|
| `/products/khoi` → chọn size M → "Thêm vào giỏ · 390.000₫" | **chạy đúng** — `brand.cart.lines` có `{p-khoi, M, black, 1}`, nhãn giỏ đổi thành "Giỏ hàng, 1 món" |
| `/` → thẻ KHÓI → "Thêm vào giỏ" → sheet → size M → "Thêm size M vào giỏ" | **không ghi gì** — `lines: []`, nhãn vẫn "Giỏ hàng, đang trống" |
| lặp lại với size L khi giỏ đã có 1 dòng | `lines` vẫn đúng 1 dòng cũ — xác nhận, không phải trùng dòng bị gộp |

Nên `CartContext` lành; hỏng nằm ở đường nối của `ProductCard` → `SizeSheet`.
Chưa đọc code để tìm nguyên nhân — mới dừng ở mức đã tái hiện chắc chắn.

- [ ] Sửa: nối đúng hành động thêm vào giỏ trong `SizeSheet` khi mở từ `ProductCard`
- [ ] Chấp nhận: thêm từ thẻ và thêm từ trang chi tiết cho **cùng một** kết quả
- [ ] Chấp nhận: có test đóng đinh đường đi từ thẻ, không chỉ đường đi từ trang chi tiết
- [ ] Kiểm: cả `/`, `/products`, `/search` — ba route cùng dùng `ProductCard`
- [ ] Cỡ: S

**Quan sát kèm theo (chưa phải lỗi):** cùng một nút chọn size mang accessible
name khác nhau ở hai chỗ — `"M còn 4"` trong sheet, `"Size M, còn 4"` ở trang
chi tiết. Không sai, nhưng nếu thống nhất thì người dùng trình đọc màn hình
nghe ra cùng một thứ, và máy kiểm bớt phải dò.

**Lỗi console duy nhất trên toàn trang chủ:** `GET /favicon.ico` trả 404.

### ◆ Lượt quét hình thức đầu tiên bằng máy dò mới — 2026-09-20

`tools/layout-sweep.js` (QĐ-20), 19 route × 390px và 1280px = **38 lượt**.

**Sạch:** hộp inline 0 · tỉ lệ ảnh trong cùng lưới 0 · nút đơn độc 0 · con trỏ
mũi tên 0 · phần tử bị cắt không tới được 0 · tràn ngang 0 · lỗi console 0 ·
chuyển hướng ngoài ý muốn 0. Lỗi `<a class="ph">` của đợt rà trước **vẫn đứng**.

**Còn lại 43 phát hiện, đều là vùng chạm ở 390px**, gom thành ba chỗ:

| # | Chỗ | Đo được | Thiếu |
|---|---|---|---|
| 1 | Ba icon trên thanh điều hướng — Tìm kiếm · Tài khoản · Giỏ hàng | `::after` = **30 × 44px** | **14px bề ngang**, trên **mọi** route |
| 2 | Tên sản phẩm trong lưới (`/products`, `/search`) — KHÓI, BỤI, NGUỘI… | hộp 17px cao, **không có `::after`** | **27px chiều cao**, 10 liên kết mỗi trang |
| 3 | `BRAND` · Áo · Khoác · Quần | `::after` cao **43,81px** | 0,19px — dưới điểm ảnh, ghi nhận chứ không sửa |

Chỗ 1 có sẵn khuôn mẫu để sửa: nút **"Quay lại"** cùng thanh đã là `44 × 44`.

- [ ] Sửa 1: `::after` của icon nav giãn đủ 44px bề ngang, theo đúng cách "Quay lại" đang làm
- [ ] Sửa 2: tên sản phẩm trong thẻ nhận vùng chạm 44px, hoặc bỏ hẳn liên kết trên tên nếu cả thẻ đã bấm được (đừng để một mục tiêu 17px cạnh một mục tiêu khổng lồ cùng đích)
- [ ] Kiểm: chạy lại `tools/layout-sweep.js`, `smallTarget` phải về 0
- [ ] Cỡ: S

**Đừng tin máy dò khi chưa soi.** Lượt đầu nó báo **136**; 93 trong số đó là do
chính máy dò sai, đã sửa và ghi lý do trong QĐ-20. Trước khi báo một con số cho
người dùng thì phải mở vài trường hợp ra đo tay.

---

## Phase 5 — Quản trị · XONG 2026-09-20

Mười route dưới `/admin` (tiếng Anh theo QĐ-6, không phải `/qt`):
`/admin` · `drops` · `products` + `new` + `[id]` · `orders` + `[code]` ·
`customers` + `[id]` · `promotions`.

### Khung
`app/admin/layout.tsx` + `AdminNav` (client, chỉ vì cần biết route đang mở) +
`AdminTop`. **Nhãn “dữ liệu mô phỏng” nằm trong `AdminTop`, không phải một
prop** — một lá cờ tắt được là một lá cờ sẽ có ngày bị tắt. Đo lại: đúng **1
nhãn trên cả 10 route**.

### Mọi con số đều SUY RA, không gõ tay
Bản mock vẽ trang tổng quan bằng số bịa: 88,3tr doanh thu, 2.850 lượt xem,
tỷ lệ chốt 3,4%, “+12% so với kỳ trước”. PRODUCT.md cấm điều đó, nên:

- [x] `lib/admin-metrics.ts` + 21 test — `revenueByDay`, `salesWindow`,
      `needsAction`, `stockAlerts`. Chỉ tính tiền **đã nhận** (PAID ·
      SHIPPING · DELIVERED); đơn chờ chuyển khoản và đơn huỷ không được cộng.
- [x] **Ô “tỷ lệ chốt” bị bỏ.** Không chỗ nào trong mã ghi lượt xem, nên nó
      chỉ có thể là số bịa. Thay bằng **“Cần xử lý”** — số đơn đang chờ shop
      làm gì đó, vừa có thật vừa đúng thứ người mở màn này cần.
- [x] **“So với kỳ trước” bị bỏ.** 14 ngày trước đó rơi vào giữa hai đợt và
      bằng 0, nên mọi phần trăm đều là chia cho 0. Biểu đồ đã nói điều đó rõ
      hơn: **bốn ngày đầu là cột rỗng thật**, rồi đợt mở.
- [x] Số thật đo được: doanh thu 14 ngày **14.256.000₫** trên 15 đơn, 5 đơn
      cần xử lý, còn 73/181 chiếc của đợt 05.

### Nút phải làm được việc nó nói
- [x] `bulkActions` của `DataTable` đổi kiểu: **`onRun` là bắt buộc**. Trước
      đó các nút hàng loạt không có handler nào cả — không thể khai báo một
      nút chết nữa. (Chốt kiểm T26.)
- [x] “Xuất báo cáo” của mock → **`ExportCsvButton` tải CSV thật**, và đổi
      nhãn thành đúng thứ nhận được. `lib/csv.ts` + 8 test: trích dẫn theo
      RFC 4180, xuống dòng CRLF, **BOM cho Excel** (thiếu nó là mọi tên tiếng
      Việt thành mojibake), số ghi thô để bảng tính cộng được.
- [x] “Đánh dấu đã thanh toán” trong mock bị bỏ — không có máy chủ để đánh
      dấu. “In phiếu giao” giữ lại thành **`window.print()`** thật.
- [x] Form sản phẩm: nhấn Lưu **nói thẳng là chưa nối máy chủ**, thay vì im
      lặng. Mọi thứ khác trên form là thật — gõ vào lưới thì tổng đổi theo.

### Lệch có chủ ý so với bản mock
1. **Lưới tồn kho là size × MÀU**, mock chỉ có size. Kho lưu theo cả hai từ
   Phase 1, nên lưới theo size không sửa nổi thứ shop thực sự giữ.
2. **Gạch chân đôi dưới đầu panel.** Hàng danh sách ngay dưới `.hd` tự vẽ
   viền trên đè lên viền dưới của `.hd` — 2px ở chỗ mọi nét khác là 1px. Đo
   trên chính bản mock: cũng bị. Sửa, không chép lại.
3. **Huy hiệu “Đã đặt nhắc đợt 06”** ở trang khách hàng bị bỏ — không chỗ nào
   ghi việc đặt nhắc. “Khách quay lại” giữ, vì số đơn > 1 là có thật.

### Ba lỗi bắt được bằng cách NHÌN, không phải bằng máy dò
1. **“BỤIÁo hoodie”** — tên và loại dính liền trên mọi dòng của bảng sản phẩm
   và khách hàng. `.d` chỉ được `display:block` dưới `.row` và `.tl`; trong ô
   của `.dt` nó vẫn inline. Cùng họ với lỗi `svg{display:block}` ở sổ địa chỉ.
2. **“đã cắt 2 · còn 2”** cho BỤI, đúng phải là 18. Tôi đã dựng một bản đồ
   “đã bán theo size” toàn số 0 rồi cộng vào — một con số bịa do chính tôi
   tạo ra. Bỏ hẳn, dùng `product.cutUnits` có thật.
3. **Ô nhập tồn kho không thẳng cột.** `input.inp` là `display:block`, mà hộp
   block không nghe `text-align` của ô. Sửa bằng `margin-left:auto`.

**◆ Chốt kiểm 5 — ĐẠT 2026-09-20.** `npm run typecheck` sạch · `next build`
sạch · **522 test** xanh · máy dò layout trả `[]`.
Quét 10 route ở 1280px: **1 nhãn mô phỏng mỗi trang** · 0 icon rơi hàng ·
0 điều khiển sai con trỏ · 0 phần tử tràn ngang · 0 huy hiệu hai chấm.

---

## Phase 6 — Còn lại & soát · XONG 2026-09-20

### T27 — 404 + bốn trang nội dung · XONG
`/about` · `/faq` · `/returns` · `/contact` (URL tiếng Anh theo QĐ-6), cộng
`SiteFooter` mới để bốn trang ấy **đến được** — bản mock không có chân trang
cho khách, các màn nội dung của nó là khung rời không gì trỏ tới.

- [x] **Không bịa gì.** Component `NeedWrite` nói rõ cái gì thuộc về chỗ trống
      và để trống thật. Dùng ở ba chỗ: câu chuyện thương hiệu (`/about`), thời
      hạn đổi trả (`/returns`), kênh liên hệ (`/contact`).
- [x] **Bản mock ghi "đổi trả 7 ngày" — con số ấy không ở đâu ra cả.** Không
      chép lại. Trang `/returns` chia hai nửa: “Đã chốt” là những gì hệ thống
      thật sự làm (giữ hàng 12 giờ, hoàn về đúng nguồn, không đổi được size đã
      hết), “Chưa chốt” là `NeedWrite`.
- [x] Mọi con số trong FAQ **đọc từ hằng số checkout** (`lib/shipping.ts`), nên
      một FAQ nói khác trang thanh toán là điều không xảy ra được.
- [x] `PRODUCT.md` mục “Ngoài phạm vi” đã sửa cho khớp, kèm lý do và ràng buộc.

### T28 — Soát một lượt · XONG
Quét **34 route** ở **390px và 1280px** bằng máy, không bằng mắt.

| Hạng mục | 390px | 1280px |
|---|---|---|
| Phần tử chữ kiểm tương phản | 1.341 | 1.350 |
| Dưới ngưỡng AA | **0** | **0** |
| Điều khiển đo vùng chạm | 342 | — |
| Dưới 44px chiều cao | **0** | — |
| Route cửa hàng tràn ngang | **0** | **0** |
| `<select>` gốc | **0** | **0** |
| Icon rơi xuống hàng riêng | **0** | **0** |

**Năm lỗi thật, sửa trong một đợt:**
1. **Dấu `/` ngăn cách trong dải đợt: 1,68:1.** Nó là đồ hoạ có nghĩa (đang làm
   việc của một dấu phẩy), nên phải đạt 3:1. Đổi sang `--link` → **3,91:1**, và
   gắn `aria-hidden` để trình đọc không đọc “gạch chéo”.
2. **Nút câu hỏi trong FAQ: 20px vùng chạm trong một hàng 46px** — lỗi tôi vừa
   tạo ra ở T27. Padding chuyển từ hàng sang chính cái `<button>`.
3. **Chip lọc: 38px thay vì 46.** `.chips` là vùng cuộn, mà vùng cuộn **cắt**
   phần lớp phủ tràn ra ngoài. Đúng lỗi `.qty{overflow:hidden}` của Phase 4, ở
   một chỗ thứ hai. Chừa `padding-bottom:7px` bên trong vùng bị cắt.
4. **Ô tìm kiếm: 38px** — mang `height:38` nội tuyến chép từ mock, đè lên 44px
   của hệ, trên đúng cái điều khiển mà cả màn hình ấy tồn tại vì nó.
5. **Khu quản trị vỡ ở 390px.** Nay `min-width:1180px`: nó co thành desktop thu
   nhỏ (cuộn ngang) thay vì squash. Chủ ý — bản mock chưa từng vẽ màn quản trị
   ở bề ngang điện thoại, và bảng tám cột không có bố cục điện thoại trung thực.

**Hai miễn trừ có chủ ý** (WCAG 2.5.5), không phải bỏ qua:
- Liên kết nav rộng 28–31px, **cao đủ 44**. Ba liên kết cách nhau 15px; nới
  ngang tới 44 là chúng giẫm lên nhau — vùng chạm giẫm chân nhau tệ hơn hẹp.
- Tên mẫu trên thẻ cao 17–18px: tấm ảnh ngay trên nó là liên kết **171×214** tới
  đúng địa chỉ ấy — “equivalent control”.

**Một phát hiện không sửa:** `/system` tràn ngang ở 390px vì nó trưng bảng dữ
liệu quản trị làm mẫu vật. Trang tra cứu nội bộ, không phải route của khách.

### T29 — DESIGN.md · XONG
`DESIGN.md` viết **từ code đã dựng**: mọi token trong tài liệu tồn tại thật
trong `app/globals.css`, mọi con số lấy từ `app/styles/*.css`. Mười mục, kèm ba
quy tắc không thương lượng (không bịa số · không bịa chữ · không nút chết) và
bảng số liệu đo được ở mục 10.

**◆ Chốt kiểm 6 — ĐẠT 2026-09-20.** `npm run typecheck` sạch · `next build`
sạch · **522 test** xanh · **33 route** render · máy dò layout trả `[]` · đạt
sàn a11y của PRODUCT.md trên toàn bộ route cửa hàng.

---

## ◆ Sửa sau khi người dùng chỉ ra — 2026-09-20

### Dropdown trong mọi bảng **chưa từng được tạo kiểu**

Người dùng hỏi "bạn đã check điểm này chưa?" — **chưa**. Cả đợt soát T28 là
soát **tĩnh**: nạp route rồi đo DOM đã render. Không mở một menu nào, không bấm
một facet nào. Đó là lỗ hổng của cách kiểm, không phải một chỗ sót ngẫu nhiên.

**Nguyên nhân:** mọi quy tắc của menu viết là `.dt .menu`, trong khi
`TableMenu` **portal chính nó sang `document.body`** — cố ý, để một panel
`position:fixed` không bị mắc trong một ancestor có `transform`. Ra khỏi `.dt`
rồi thì **không quy tắc nào khớp nữa**.

**Đo được, không đoán:** panel tính ra `position: static`, nên `top`/`left`
nội tuyến vô nghĩa; nó nằm vào dòng chảy bình thường thành một khối
**1345 × 268** ở tận đáy tài liệu, ngoài khung nhìn, đẩy cả trang lệch đi. Và
vì ở ngoài `.s`, nó **không thừa kế** font, cỡ chữ, line-height hay màu mực của
hệ — lên bằng serif mặc định của trình duyệt.

Cùng họ với `.swa` bị khoá trong `.sizesheet` (Phase 3) và `.s .tabs span`
(Phase 4): **component dời đi, selector ở lại.** Lần thứ ba.

- [x] Bỏ ancestor khỏi cả **13** quy tắc `.dt .menu` → `.menu`. Tên lớp này
      thuộc về đúng một component, và phần tử thật sự là một lớp cấp `body`.
- [x] Thêm `font-family` · `font-size` · `line-height` · `color` vào `.menu` —
      nửa còn lại của cái giá phải trả khi portal ra ngoài `.s`.
- [x] `.dt .foot .menu{min-width:132px}` cũng chết vì cùng lý do. Nút đã có sẵn
      prop `small`, nay truyền thành class `narrow` qua portal.
- [x] **Chốt lại bằng test** `components/table/menu-scope.test.ts`: không quy
      tắc nào được với tới `.menu` qua ancestor, và `.menu` phải tự khai báo
      font. Đã thử đổi một selector về như cũ — test đỏ đúng chỗ.
- [x] Mở **17 dropdown trên 6 màn có bảng**: tất cả `position:fixed`, neo đúng
      `đáy nút + 4px`, nằm trong khung nhìn, nền trắng. Lọc chạy thật:
      "Hiện 1–10 trên 12 đơn (lọc từ 24)", mọi dòng hiện ra đều đúng trạng thái.

### `/system` tràn ngang

- [x] Hai nguyên nhân: trang là `.s` thường nhưng chứa một `.s.adm` lồng bên
      trong (mẫu vật của bảng dữ liệu), và `.s.adm` vừa được đặt sàn 1180px ở
      T28 — nên mẫu vật ép sàn ấy lên một trang phải render ở 390.
- [x] `.s.specpage{ min-width:1180px }` — nó là **trang tra cứu desktop**,
      ngoài sitemap, việc của nó là trưng component ở đúng cỡ ship. Lấy sàn và
      cuộn ngang, giống `.s.adm`, thay vì vừa tràn vừa bị bóp.
- [x] `.s.specpage .s.adm{ min-width:0; display:block }` — mẫu vật không phải
      khu quản trị: không ép sàn lần hai, và `block` vì nó không có thanh bên
      để đứng cạnh (là flex thì chú thích và bảng nằm ngang hàng nhau).
- [x] Ở 1280px: tràn ngang **0**.

**Soát lại sau khi sửa:** 590 phần tử chữ trên 24 route cửa hàng ở 390px và
1.027 trên 11 route quản trị + `/system` ở 1280px — **0 chỗ dưới ngưỡng AA, 0
tràn ngang**. `typecheck` sạch · `next build` sạch · **526 test** xanh · máy dò
layout trả `[]`.

**Bài học ghi vào cách làm:** đợt soát từ nay phải **mở mọi lớp nổi** — menu,
sheet, popover — chứ không chỉ chụp trang lúc đóng. Một ảnh chụp tĩnh của trang
này trông hoàn hảo.

### Lớp nổi bên cửa hàng — soát bằng cách MỞ từng cái

Kiểm kê đầy đủ trước, không đoán: 3 sheet (`Sheet`), 1 menu bảng
(`TableMenu`), 1 popover chọn (`Select`). Không còn cái nào khác —
`grep` cả `createPortal` lẫn `position:fixed`.

| Lớp | Kết quả |
|---|---|
| SizeSheet (thẻ sản phẩm) | sạch |
| FilterSheet (bộ lọc) | sạch |
| SizeGuideSheet (bảng size) | sạch |
| Select · tỉnh 34 mục | **2 lỗi**, đã sửa |
| Select · phường 168 mục | sạch sau khi sửa |
| Select ở `/checkout` | sạch |

**`Sheet` được dựng đúng ngay từ đầu** — panel mang chính lớp `.s`, nên mọi
thứ bên trong thừa kế font, cỡ chữ và mực của hệ; `.sheetwrap` / `.scrim` thì
không gắn với `.s`, đúng cho một lớp cấp `body`. Đó chính là thứ `TableMenu`
thiếu. Đo được: scrim phủ kín khung nhìn, `role="dialog"` + `aria-modal`, tiêu
điểm vào panel khi mở và **trả về đúng nút đã mở** khi đóng, `body` bị khoá
cuộn rồi mở lại.

**Hai lỗi thật ở `Select`:**
1. **Mục trong menu cao 33px** (7px đệm quanh dòng 18.6px) — dưới sàn 44px, trên
   một danh sách 34 tỉnh và 168 phường. Đợt soát T28 không thấy vì **mục menu
   chỉ tồn tại khi menu mở**. Sửa: `min-height:44px` ở `@media (max-width:460px)`
   — đúng cách chia mà `interaction.css` đã dùng cho liên kết chữ; desktop giữ
   mật độ dày, panel vẫn chặn ở 360px và cuộn.
2. **Nút chọn đang `disabled` vẫn đeo con trỏ bàn tay.** "Chọn tỉnh trước" là
   nút thật sự chưa bấm được, và con trỏ là phần duy nhất nói ngược lại.
   `.btn:disabled` đã có quy tắc này; `.selbtn` không phải `.btn`.

**Ba kết quả "đỏ" hoá ra là lỗi của phép đo, không phải của code** — ghi lại để
không sửa nhầm thứ không hỏng:
- *Tiêu điểm không quay về nút* — vì tôi mở sheet bằng lệnh, nên nút chưa từng
  được focus; `openerRef` bắt được `<body>`. Focus nút trước rồi mở: trả về đúng.
- *Menu `/system` "ngoài khung nhìn"* — nút neo nằm ở y=3341, dưới màn hình.
  Cuộn nó vào rồi mở: panel ra đúng `đáy nút + 4px`.
- *Cuộn không đóng được popover* — trang địa chỉ cao đúng 900px trong khung
  900px, `canScroll:false`, không có sự kiện cuộn nào để đóng. Thử lại ở
  `/checkout` (trang cuộn được thật): đóng đúng.

`526 test` xanh · máy dò layout `[]`.

### Textarea "Chất liệu & form" chỉ cao một dòng — 2026-09-20

Người dùng báo. `rows={3}` có sẵn trong markup nhưng **bị bỏ qua**: `.inp` đặt
`height` cố định (44px ở cửa hàng, 34px ở quản trị), mà một `height` cố định
ghi đè hẳn thuộc tính `rows` của `<textarea>`.

Thêm `.area` — biến thể textarea của cửa hàng — **không cứu được**: cả
`.s .inp.area` lẫn `.s.adm .inp` đều nặng (0,3,0), và `admin.css` nạp sau
`forms.css`, nên 34px thắng nhờ thứ tự nguồn. Đúng cái bẫy mà `globals.css`
đã cảnh báo ở đầu tệp.

- [x] Gọi tên **phần tử** mới dứt điểm được: `.s.adm textarea.inp` có thêm một
      type selector nên thắng quy tắc chỉ-có-class trên cùng phần tử.
      `height:auto` trả quyền lại cho `rows`.
- [x] `rows={4}` trong markup, `min-height` trong CSS chặn dưới — kéo tay thu
      nhỏ cũng không xuống dưới bốn dòng dùng được. Con số bám thang chữ của
      khu quản trị (`12px × 1.55 × 4 + 24px`), không phải một pixel chọn bừa.
- [x] Đo lại: **98px, vừa đúng 4 dòng**, `resize:vertical` còn nguyên. Ô nhập
      một dòng vẫn 34px, không suy suyển. Cả `/admin/products/new` lẫn
      `/admin/products/[id]`.
- [x] Textarea ở `/checkout` **không đổi** — nó dùng `.area` (78px) của bản
      mock đã duyệt, và nó chưa bao giờ hỏng.

`526 test` xanh · máy dò layout `[]`.

### Huy hiệu "Khách quay lại" dính sát bảng — 2026-09-20

Người dùng báo. Đo ra **0px** giữa hàng huy hiệu và panel ngay dưới.

**Không phải lỗi của trang đó.** Tôi đặt `.panel:first-child{ margin-top:0 }`
trên `.grid2.detail` và `.grid2.form` để hai cột bắt đầu ngang nhau — và cùng
lúc xoá mất khoảng cách duy nhất giữa lưới với thứ nằm trên nó. Quét lại:
**cả bốn màn** dùng hai biến thể ấy đều 0px. Hàng huy hiệu chỉ là chỗ nhìn rõ
nhất, vì một viên màu chạm vào mép panel thì ai cũng thấy; ba dòng `.note` ở
các màn kia sai y hệt nhưng lặng lẽ hơn.

- [x] Khoảng cách chuyển lên **chính cái lưới** (`margin-top:16px`), không nằm
      ở panel đầu tiên nữa — một hộp không thể bị xoá margin từ bên trong.
      16px đúng bằng bước mà `.panel` dùng ở mọi nơi khác, nên nhịp không đổi.
- [x] Đo lại cả 5 màn có `.grid2`: **16px**, hai cột vẫn ngang nhau, tràn
      ngang 0.

`526 test` xanh · máy dò layout `[]`.


---

## ◆ Soát trạng thái cuối — 2026-09-20

Người dùng hỏi *"còn phase nào thì tiếp tục"*. Trả lời: **không còn**. Đây là
phép đếm đã kiểm chứ không phải trí nhớ.

**48 màn của prototype, đối chiếu từng cái với route đã dựng** (`index.html` là
khung xem, không phải màn). Không màn nào rơi. Chỗ dễ sót nhất là
`gio-hang-loi` — không phải một biến thể trang trí mà là một trạng thái thật:
hàng `.snag`, hai lối gỡ, tổng tiền **không** tính món đang vướng, nút thanh
toán khoá. Đã dựng: `CartLineRow.tsx` + `CartScreen.tsx`, và `/checkout` cũng
chặn lại nếu giỏ còn món vướng.

| Nhóm | Màn prototype | Nơi đã dựng |
|---|---|---|
| Luồng mua | 15 | `/` (3 trạng thái đợt + desktop) · `/products` · `/search` (+rỗng) · `/products/[slug]` (+hết hàng, +desktop) · `/cart` (+rỗng, +vướng) · `/checkout` · `/order-confirmed` |
| Tài khoản | 15 | `/sign-in` `/sign-up` `/forgot-password` (+đã gửi) · `/account` + 8 màn con |
| Quản trị | 10 | `/admin` + 9 màn con |
| Đặc tả primitive | 3 | `/system` (`qt-bang` · `qt-nut-loc` · `the-san-pham`) |
| Nội dung + 404 | 5 | `/about` `/faq` `/returns` `/contact` · `not-found.tsx` |

**Trạng thái đo lại hôm nay:** `tsc --noEmit` sạch · `next build` sạch · **526
test** xanh (22 file) · **35 route trang** + `/api/wards` + `not-found` render.

- [x] `tasks/plan.md` đồng bộ lại với thực tế: Phase 0/1/2/5/6 còn để ô trống
      dù đã xong từ lâu; dòng trạng thái đầu tài liệu vẫn ghi "chờ duyệt"; tên
      cũ tiếng Việt (`app/he/`, `/qt/**`, `SanPham`, `<BangDuLieu>`) vẫn nằm
      trong danh sách việc dù QĐ-6 đã đổi hết. Một kế hoạch đọc ra sai sự thật
      thì lần soát sau sẽ tin vào nó.
- [x] Thêm mục **"Sau Phase 6 — bốn cổng đang đóng"** vào `plan.md`: ảnh thật ·
      ba chỗ `NeedWrite` · backend · `/hyd`. Cả bốn đều **cần lời người dùng**,
      nên ghi ra chứ không tự làm.

**`/hyd` vẫn nằm trong bản build** (`○ /hyd`, không gì trỏ tới). Là trang thăm
dò dựng hồi soi lỗi `next dev` không hydrate. Repo không phải git → không tự
xoá; và nó đang là vật chứng duy nhất cho lỗi ấy.
