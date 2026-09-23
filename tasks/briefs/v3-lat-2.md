# Brief lát 2 · v3 — danh mục, trang sản phẩm, tìm kiếm

Phiên chính viết 22/09/2026 sau khi lát 1 ĐẠT. Agent `ui-implementer` thực thi; phiên chính duyệt
lại độc lập. Mock: `prototype/v3/products.html`, `product.html`, `search.html`, `brand.html` (mục
"Thẻ mẫu, dòng mục lục, bảng size"), `v3.css` (listing, product page, size chart, sheets, buybar),
`v3-pages.css` (`.menu3`, `.searchbar`, `.suggest`, `.searchmeta`, `.empty3`), `v3.js` (`pickSize`,
`[data-menu]`, tabs, `data-open`). Ảnh nộp vào `.playwright-cli/shots/v3/lat2/`.

## 1. Màn / phạm vi

| Route | Việc | Mock |
|---|---|---|
| `/products` (+ `?family= form= size= color= price= sort=`) | Đầu trang `.lhead` (h1 "Số 05", meta, tab họ, chip nhanh), khung `.listing3` (rail 232px desktop, lưới), thanh `.listbar` + menu sắp xếp thật, `.listend`; sheet lọc trên điện thoại; sheet size từ thẻ theo v3 | `products.html` |
| `/products/[slug]` | Đường dẫn, gallery, ticket (kick, tên, loại, giá, tồn + meter, màu, bảng size, size ghi nhớ, CTA, ghi chú, bảng thông tin), "Cùng số 05" bốn thẻ, thanh mua dính điện thoại, sheet bảng số đo | `product.html` |
| `/search` (+ `?q=`) | Thanh tìm (icon, ô 44, xoá, huỷ), meta kết quả, lưới thẻ kết quả (dòng đếm có loại), "Có thể tìm", "Tìm gần đây", **gợi ý khi gõ** (≥ 2 ký tự), trạng thái trống | `search.html` |
| Dùng chung | `SizeSheet` (từ thẻ, mọi trang) dựng lại theo `.sizes` của v3; `SizeGuideSheet` theo `.fit`; `SortControl` menu theo `.menu3`; `Empty` theo `.empty3` | `home.html` `#sizesheet`, `product.html` `#fitsheet` |

Giữ nguyên logic v2: bộ lọc và phân trang sống trong URL (QĐ-8), `pool/applied/path` của
`FilterRail`/`FilterSheet`/`ListingControls`/`SortControl`, `lib/catalog-query.ts`, giỏ là hàm thuần
`lib/cart.ts`, `lib/prefs.ts` (size ghi nhớ), `lib/recent-searches.ts`, `lib/wishlist.ts`. Không tính
năng mới ngoài gợi ý khi gõ (đã duyệt), không backend, không phụ thuộc mới.

## 2. Quyết định đã chốt

**Danh mục `/products`**
- `.lhead`: h1 `.big` "Số 05" Unbounded 24/28, số Số màu mật ong; meta 12px chữ phụ "10 mẫu · 73 /
  181 còn · đóng sau 5 ngày 1 giờ" (đếm ngược từ `lib/drop.ts`, cập nhật mỗi phút); tab họ
  `.tabs3`: cuộn ngang, mỗi tab 44px cao chữ 13px + đếm 11px, tab đang mở đậm với gạch mật ong 2px
  và `aria-current`, viền dưới 1px mực cả hàng; chip nhanh `.chips3` chỉ trên điện thoại: "Lọc"
  (icon phễu, mở sheet lọc) rồi các chip lọc có đếm (form, còn size, màu có chấm, khoảng giá),
  bấm = bật/tắt bộ lọc trong URL (chip đang bật `.on` đen chữ vàng), hàng chip cuộn ngang với mặt
  nạ mờ mép phải.
- Desktop ≥900: `.listing3` lưới `232px 1fr` gap 48; rail dính `top:84`, nhóm Loại / Form / Còn
  size / Màu / Khoảng giá, chip 36px gap `10px 6px` (hai vùng chạm 44 không được chồng), khoảng
  giá có hai ô `Từ`/`Đến` cao 44 + nút "Áp dụng" `.btn.sec.sm` + dòng "Số này từ 390.000₫ đến
  1.450.000₫" (từ dữ liệu); chip đang bật đen chữ vàng. Trên điện thoại rail ẩn, chip nhanh thay.
- `.listbar`: "Hiện 10 / 10 mẫu" 12px chữ phụ + nút "Sắp xếp **Mới nhất**" 36px viền `--line`
  icon sort, mở **menu thật** (`SortControl`) dựng theo `.menu3` (fixed, viền 1px mực, bo 4, không
  bóng, mục 40px chữ 13px icon 15px, mục đang chọn 600, đóng khi cuộn/Esc/bấm ngoài, lật ở mép):
  Mới nhất · Sắp hết trước · Giá thấp đến cao · Giá cao đến thấp (giữ khoá URL v2).
- Lưới `.grid3` 2 cột điện thoại (gap 24/12), 3 cột desktop (48/24), `ProductCard` lát 0.
- `.listend`: "Đã hiện cả 10 mẫu · 73 / 181 còn" + "Xem lại: Số 04 · Số 03" (liên kết `.lnk` tới
  `/?drop=4`, `/?drop=3` — trang sổ Số làm ở lát 4); khi có bộ lọc: "Hiện 7 / 10 mẫu" và liên kết
  "Bỏ lọc". Trạng thái không có mẫu nào khớp: `.empty3` (icon 28 `search`, h2 "Không có mẫu nào
  khớp", p nêu bộ lọc đang bật, nút "Bỏ lọc").
- Sheet lọc điện thoại (`FilterSheet`): panel dưới, `.grab`, tiêu đề "Lọc" + nút đóng 44, các nhóm
  như rail, chân sheet nút "Xem 7 mẫu" mật ong full-width + "Bỏ lọc" lặng; đóng bằng Esc, scrim,
  nút; `aria-modal`, khoá cuộn nền như v2.

**Trang sản phẩm `/products/[slug]`**
- `.crumbs` 12px: "Số 05 / Áo thun / **KHÓI**", dấu `/` màu `--line`, liên kết 36px cao (lớp phủ
  44), không gãy "Số 05" (U+00A0).
- `.pdp3`: điện thoại: gallery cuộn ngang snap (`.gal` tràn lề, mỗi `figure` 100% 4:5, `.galbar`
  "1 / 2" + chấm 6px) rồi ticket; desktop lưới `7fr 5fr` gap 48, gallery xếp dọc (ảnh bo 4, gap
  12), ticket **dính `top:84` chỉ khi khung nhìn cao ≥ 860px** (`@media (min-height:860px)`), nếu
  thấp hơn thì cuộn theo trang, không cuộn trong hộp riêng.
- Ticket: `.kick` (badge B "Đang bán" + "Số 05 · đóng sau 5 ngày 1 giờ"; Số đã đóng: badge `.shut`
  "Đã đóng" + "Số 04 · đã đóng 19/06"); h1 tên Unbounded 30/44 `line-height:1`; `.kind` "Áo thun
  oversize · Cotton 250gsm" (kind + chất liệu từ dữ liệu); `.price` Unbounded 24 tabular;
  `.stock` viền trên 1px mực: "**Còn 17** / 35 chiếc đã cắt · không may thêm" + `.meter` 4px (đầy
  màu `--brand-text`, `.hot` đỏ khi còn < 4), `role="img"` aria "Còn 49%"; mẫu hết: "0 / 35 · đã
  bán hết", meter đầy đen.
- Màu `.fld`: nhãn "Màu" + "Đen · còn 10"; `.sw` nút 48×44+ gồm chấm 32px (viền hairline, vòng
  chọn 1,5px mực) + "Đen 10"; màu hết `.gone` gạch ngang. Đổi màu đổi ảnh gallery và số còn từng
  size (logic v2).
- Size `.fld`: nhãn "Size" + dòng chọn "chưa chọn" → "M · còn 4" + liên kết "Bảng số đo" (mở
  sheet); **bảng `.sizes`** viền trên mực: mỗi hàng nút full-width 44 lưới `40px 1fr auto 22px`:
  size Unbounded 14, dấu dẫn chấm, "còn 3" (12px chữ phụ; "còn 2" đỏ 500 khi < 3), ô đánh dấu 20px
  viền `--line`; hàng đang chọn nền đen chữ trắng, ô đánh dấu có tick mật ong; hàng hết `.gone`:
  size gạch ngang, "hết", không ô, không bấm. Size ghi nhớ (`lib/prefs.ts`) chọn sẵn nếu còn.
- `.mysize`: "Size ghi nhớ / Chọn sẵn size này ở các mẫu sau. Lưu trên thiết bị này." + công tắc
  `.switch3` 40×24 (vùng chạm 46) `role="switch"`, bật → toast "Sẽ chọn sẵn size này ở các mẫu
  sau · lưu trên thiết bị", tắt → "Đã bỏ ghi nhớ size"; chỉ hiện khi đã chọn size.
- `.cta`: nút chính mật ong full-width: "Chọn size" (vô hiệu, nền tấm chữ phụ) → "Thêm size M vào
  giỏ" (logic giỏ v2, toast "Đã thêm KHÓI size M vào giỏ"); nút phụ viền mực "Lưu" (icon tim,
  wishlist v2; đã lưu → "Đã lưu" tim Bulk). `.fine` 12px: "Giỏ không giữ hàng. Đơn đặt trước nhận
  trước. Chuyển khoản giữ hàng 12 giờ."
- `dl.info3` viền trên mực, hàng `96px 1fr`: Chất liệu · Form ("Oversize / rộng hơn một size so
  với form thường") · Giao hàng ("2–4 ngày · 30.000₫ / miễn phí từ 1.000.000₫ · nội thành TP.HCM
  24 giờ · 45.000₫" từ `lib/shipping.ts`) · Thanh toán ("Chuyển khoản · COD +15.000₫ · Thẻ") ·
  Đổi trả ("7 ngày nếu chưa qua sử dụng / điều kiện chi tiết chờ chốt").
- "Cùng số 05" `.sec`: meta "cùng loại, cùng tầm giá", liên kết "Xem cả 10 mẫu"; lưới
  `.grid3.four` (2 cột điện thoại, 4 desktop) 4 mẫu: cùng họ trước rồi cùng tầm giá (±50%), bỏ
  chính nó; dòng đếm thẻ ở đây in "còn 12 · áo thun" (kind viết thường thay dải size) — thêm prop
  cho `ProductCard` (không đổi thẻ ở danh mục).
- `.buybar3` điện thoại: cố định đáy, viền trên mực, nền trắng, "KHÓI / 390.000₫ · chưa chọn size"
  + nút mật ong 150px "Chọn size"/"Thêm size M"; hiện (trượt lên) khi nút CTA thật cuộn khuất
  (IntersectionObserver như v2 `BuyBar`), ẩn từ 900px; đồng bộ nhãn với ticket.
- Sheet bảng số đo (`SizeGuideSheet` → `.fit`): tiêu đề "Bảng số đo · form oversize", "Đo phẳng,
  đơn vị cm, sai số ±1 cm.", bảng Size / Ngang ngực / Dài áo / Ngang vai / Hợp chiều cao, hàng
  size đang chọn tô `--brand-soft`, ghi chú `.note3` "**Số đo mô phỏng.** Thay bằng số đo thật
  của xưởng khi có, bố cục không đổi. Dòng được tô là size đang chọn.", nút "Đóng". Số đo lấy từ
  nguồn v2 đang có (nếu chưa có trong `data/`, thêm bảng theo form với nhãn mô phỏng — người dùng
  đã chốt dùng số mô phỏng).

**Sheet size từ thẻ (`SizeSheet`, mọi trang)**: `.shead` (ảnh 56×70, tên Unbounded 15, "Áo thun
oversize · Đen", giá, nút đóng 44) viền dưới mực; nhãn "Size · còn 17 · Bảng số đo"; bảng
`.sizes` như PDP (kể cả hàng hết); CTA "Chọn size" → "Thêm size M vào giỏ"; thêm xong đóng sheet
+ toast. Phone: panel dưới bo 4 trên, `.grab`; desktop: hộp 520px giữa màn.

**Tìm kiếm `/search`**
- `.searchbar`: icon tìm 15 trái, ô `type=search` 44 (padding 40 hai bên), nút xoá 44×44 (icon x),
  liên kết "Huỷ" → trang trước (`history.back()` nếu có, không thì `/`); ô lấy focus khi vào
  trang không có `q`.
- `.searchmeta`: số kết quả Unbounded 18 + "mẫu khớp **“áo”** trong số 05" (dấu ngoặc kép cong).
- Kết quả: `.grid3` `ProductCard` với dòng đếm "còn 17 · áo thun oversize" (kind thay dải size,
  cùng prop ở PDP), mẫu hết SOLD OUT; không kết quả: `.empty3` h2 "Không có gì khớp “xyz”", p "Thử
  tên mẫu, loại hoặc màu.", rồi vẫn hiện "Có thể tìm".
- "Có thể tìm" `.sec`: chip liên kết họ / form / màu với đếm → `/products?…`.
- "Tìm gần đây" `.sec`: chip từ `lib/recent-searches.ts`, nút "Xoá" ở đầu mục (`.more`), ẩn mục
  khi trống; meta "lưu trên thiết bị này".
- **Gợi ý khi gõ** (`.suggest`, `role="listbox"`, mở dưới ô khi ≥ 2 ký tự, đóng khi Esc/blur/chọn):
  nhóm "Mẫu" (ảnh 36×45, tên với `<mark>` phần khớp màu `--brand-text` 600, "Áo thun oversize ·
  còn 17", giá) tối đa 4; nhóm "Loại" (họ/form/màu khớp: "Khoác / 2 mẫu trong số 05 / từ
  1.350.000₫") tối đa 3; hàng cuối "Tìm “kh” trong 10 mẫu" + chevron → submit. Khớp theo tên, kind,
  họ, màu, không dấu (`fold` của `lib/catalog-query.ts`). Không gì khớp: chỉ hàng "Tìm cả số" +
  3 họ có nhiều mẫu nhất. Điều hướng phím ↑↓ + Enter, `aria-activedescendant`, mục 44px, hover
  nền tấm. Không gọi mạng.

**Chung**: vải đen chỉ ở nav (tem Số) và badge; mọi bề mặt còn lại trắng; từ "Số" từ lexicon;
giọng không xưng hô; số từ dữ liệu; vùng chạm 44 đo `elementFromPoint`; sàn 11px; lớp nổi mở rồi
mới đo; menu và sheet là lớp fixed không kế thừa `.s` (đặt chữ riêng như mock `.sheetwrap`,
`.menu3`).

## 3. Lỗi kèm

Không có lỗi L. Việc sửa nền: (a) card ở kết quả tìm và "Cùng số" in kind thay dải size; (b)
`Empty` dùng `.empty3`; (c) mọi chuỗi còn "đợt" trong ba màn này (không được còn).

## 4. Nghiệm thu (preview 3200, 390 và 1280)

1. `/products`: đầu trang, tab họ (bấm tab đổi URL và lưới), chip nhanh 390 (bật một chip → URL
   đổi, chip đen/vàng), rail 1280 (bật chip, nhập khoảng giá + Áp dụng), menu sắp xếp mở và đổi
   thứ tự, sheet lọc 390 mở/áp/bỏ, sheet size từ thẻ mở/chọn/thêm giỏ, `.listend`, trạng thái
   trống khi lọc quá chặt.
2. `/products/khoi`: gallery snap 390 + galbar; ticket đủ mục, đổi màu đổi ảnh và số còn, chọn
   size (hàng đảo màu), công tắc size ghi nhớ hoạt động, CTA đổi nhãn và thêm giỏ thật, Lưu/Đã
   lưu, sheet bảng số đo mở với hàng size đang chọn tô, buybar hiện khi cuộn qua CTA ở 390 và ẩn
   ở 1280, ticket dính ở 1280×900 và không dính ở 1280×800, "Cùng số 05" 4 thẻ.
3. `/products/muoi` (hết): meter đầy, các hàng size hết, CTA "Đã bán hết" vô hiệu, thẻ khác bình
   thường.
4. `/search?q=áo`: meta, lưới, "Có thể tìm", "Tìm gần đây" (sau khi tìm hai lần), gợi ý khi gõ
   "kh" (ảnh chụp lúc mở), điều hướng phím; `/search?q=xyz` trống.
5. typecheck, test (thêm test cho gợi ý và mô tả kind), build, sweep 0 tràn 0 lỗi, sàn 11px, mọi
   điều khiển ≥ 44 kể cả trong sheet/menu đang mở; không chuỗi "đợt"; không yêu cầu mạng.

## 5. Ảnh nộp (`.playwright-cli/shots/v3/lat2/`)

`products-390.png`, `products-1280.png`, `products-chip-on-390.png`, `products-rail-1280.png`
(rail có chip bật), `products-sort-menu-1280.png`, `products-filtersheet-390.png`,
`products-sizesheet-390.png`, `products-sizesheet-1280.png`, `products-empty-390.png`,
`product-390-1.png`, `product-390-2.png` (ticket), `product-390-buybar.png` (đã cuộn qua CTA),
`product-1280-900.png` (ticket dính), `product-size-picked-1280.png`, `product-fitsheet-390.png`,
`product-muoi-390.png`, `search-390.png`, `search-1280.png`, `search-suggest-390.png`,
`search-suggest-1280.png`, `search-empty-390.png`.

Đọc trước: `AGENTS.md`, docs Next trong `node_modules/next/dist/docs/`, `DESIGN.md` (v2, thua
brief chỗ khác nhau), `PRODUCT.md`, `craft-floor.md`, `impeccable context --target app/products/page.tsx`.
Không sửa `prototype/`, `tasks/`, `DESIGN.md`. Báo cáo sáu mục; để server 3200 chạy.
