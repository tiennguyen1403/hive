# Brief lát 11 · v3 — mẫu cố định trên cửa hàng: tất cả mẫu một lưới, trang riêng mỗi Số, biển Số trên ảnh, tiền tố trong tên

Phiên chính viết ngày 25/09/2026. Agent `ui-implementer` thực thi **sau** lát dữ liệu B5 (`tasks/briefs/backend-b5.md`, đã có
trong code: `drop_no`/`cut_units` null = mẫu cố định, tám mẫu cố định trong seed, slug `s05-khoi`, `styleName`, `issueCode`,
`isFixed`, `productsOnSale`, `fixedLowCells`). Phiên chính duyệt lại độc lập bằng ảnh chụp và so với mock. **Người dùng đã
duyệt** bảng qua bốn vòng; câu gốc ghi trong `tasks/plan.md` (mục "mẫu cố định vòng 1–4"). Các câu chốt:
- "chỉ cần thể hiện nó như là các mẫu khác thôi"; Số có "một page riêng cho số đó";
- biển Số trên ảnh "style của tag sẽ giống với tag trên header", rồi đổi: "tag số sẽ nằm ở góc trái bên dưới và tag sold out
  sẽ nằm góc trái bên trên. giảm size của tag sold out bằng với tag số";
- bỏ tiêu đề "Tất cả mẫu" và "18 mẫu đang bán" ở danh sách; mẫu cố định không hiện số lượng ở danh sách và trang mẫu;
- trang chủ có danh sách mẫu đang bán cả lúc giữa hai Số lẫn lúc Số đang mở;
- trang mẫu bỏ "2 text nằm ở trên các nút chọn màu";
- tên mẫu cố định là tên mô tả; mẫu theo Số có tiền tố "S05 – KHÓI", **in như tên** (cùng kiểu chữ, cùng màu);
- gạch dưới của tab đang chọn ở danh sách "đang đè lên đường line bên dưới nên khá khó nhìn".

**Mock (chuẩn đối chiếu):** bảng `prototype/v3/line.html` (mở bằng `cd prototype && python serve.py 3100`, vào
`/v3/line.html`). Mỗi khung là HTML thật của cửa hàng, phần đề xuất vẽ đè bằng `prototype/v3/line/line-mock.js` và
`line-mock.css`. Mở cỡ thật từng khung:
- `line/products.html?view=all` (`/products`) và `?view=issue` (`/so/5`);
- `line/home.html` (Số đang mở) và `line/home-gap.html` (giữa hai Số);
- `line/product.html?pdp=fixed` (mẫu cố định) và `?pdp=issue` (KHÓI).
`line-mock.css` là chuẩn CSS cho: biển trên ảnh `.sotag`, SOLD OUT cỡ mới, thẻ hẹp cho tên một dòng, vạch tab. `mark=0` trong
query tắt viền tô chỗ đổi. Hai chỗ mock khác bản dựng **có chủ ý**: nhãn "chờ ảnh" trên hình phẳng là ghi chú của bảng, **không
dựng**; sáu mẫu dưới "Đang bán" theo luật §D.1 chứ không theo đúng sáu mẫu của mock.

## A. Danh sách và trang Số

1. **`/products` là mọi mẫu đang bán** (`productsOnSale`): mẫu của Số đang mở, kể cả mẫu đã hết, rồi mọi mẫu cố định, theo
   `position`. Tab, cột lọc và chip đếm cả hai loại; lọc, sắp xếp và `Hiện N / N mẫu` chạy trên tập đó. Không tiêu đề, không số
   đếm trên tab: thay khối tiêu đề bằng `<h1 className="sr-only">Tất cả mẫu</h1>`; khoảng trên tab như mock (`.lhead.bare`).
   `title` trang: "Tất cả mẫu". Giữa hai Số, danh sách chỉ còn mẫu cố định.
2. **`/so/N` cho Số đang mở** là trang danh sách của Số như `/products` hôm nay (tiêu đề "Số 05", dòng "10 mẫu · 73 / 181 còn",
   lọc, đồng hồ…), trên mẫu của Số đó. Bỏ `redirect("/products")` của trạng thái `OPEN`; Số đã đóng giữ trang lưu trữ như cũ;
   Số chưa mở giữ chuyển hướng `/#next`. Dùng chung component, đừng chép hai bản.
3. **Mọi lối "xem cả Số" dẫn về `/so/N`**: biển trên thanh điều hướng (và trạng thái `.on`/`aria-current` khi đang ở `/so/N`
   của Số đó), nút "Xem mười mẫu" trên bìa, "Xem cả 10 mẫu" của "Trong số này" và "Cùng số 05", "Số 05" trong đường dẫn trang mẫu,
   dòng "Số 05 · đang bán" ở lịch ra số chân trang, dòng `.past` khi Số vừa đóng. Grep `href="/products"` để không sót, rồi ghi
   từng chỗ đã đổi hoặc giữ.
4. **Vạch của tab đang chọn** (`.tabs3`, `listing.css`): hàng tab là vùng cuộn nên cắt mất nửa dưới của vạch 2px đặt ở
   `bottom:-1px`, còn 1px mật ong dính trên đường kẻ đen. Vẽ đường kẻ bên trong hộp (`box-shadow: inset 0 -1px 0 var(--ink)` thay
   `border-bottom`) và đặt vạch `bottom:0` để nó phủ đường kẻ. Sửa chú giải cho đúng. Tab quản trị `.stabs` không cuộn nên không
   lỗi: không đụng.

## B. Thẻ sản phẩm (`ProductCard`, `cards.css`)

1. **Biển Số ở góc trái dưới ảnh** trên thẻ mẫu theo Số **ở chỗ có cả hai loại mẫu**: `/products`, "Cùng loại" của trang mẫu cố
   định, kết quả tìm kiếm, danh sách đã lưu. **Không** vẽ ở chỗ cả hàng là của một Số: `/so/N`, "Trong số này", "Cùng số NN", trang
   Số đã đóng. Chữ là `issueLabel(no)`; `aria-hidden="true"` (tên đã mang tiền tố). Biển trên ảnh và biển trên thanh điều hướng
   **dùng chung một bộ khai báo** (vải, đường chỉ lùi 2px, hai chốt, Unbounded 800, cỡ 28/32, chữ `--fs-xs`/`--fs-sm`, `.1em`):
   gộp thành một nhóm selector hoặc một class chung, **không đổi một điểm ảnh nào của biển trên thanh** (chụp thanh ở 1280 và 390
   trước và sau, so từng điểm ảnh). Vị trí `left:10px; bottom:10px`.
2. **SOLD OUT cùng cỡ biển**, vẫn góc trái trên, trên mọi thẻ: cao 28px (32 từ 900), chữ `--fs-xs` (`--fs-sm` từ 900),
   `letter-spacing:.1em`, đệm ngang 10px (12 từ 900); giữ vải, viền 1,5px và đường chỉ đứt của nó (theo `line-mock.css`).
3. **Tên** qua `styleName(p.name, p.dropNo)` ("S05 – KHÓI", cùng kiểu chữ với tên).
4. **Thẻ hẹp** (hộp thẻ ≤ 260px, tức điện thoại): tên chiếm cả dòng, dòng chấm và giá xuống dòng dưới cùng nhau. Mock dùng
   `container-type:inline-size` + `@container`; nếu giữ cách này, kiểm mọi chỗ `ProductCard` hiện (lưới, đã lưu, tìm kiếm, gợi ý)
   để chắc bề rộng thẻ không phụ thuộc nội dung — không thì chọn cách khác cho cùng kết quả, ghi lý do.
5. **Thẻ mẫu cố định**: không số lượng. Dòng dưới tên là bốn size, size hết (mọi màu) gạch ngang: `S <s>M</s> L XL`; không "còn N",
   không chữ "hết". Biến thể `kindCount` (thêm "· loại") không áp cho mẫu cố định: tên đã nói loại. **Mẫu cố định hết cả kệ**
   (tổng 0, tạm hết): mọi size gạch, nút "Xem chi tiết" như thẻ đã hết, **không** SOLD OUT, **không** làm mờ ảnh (sẽ có lại).
6. **Sheet chọn size** mở từ thẻ (`SizeSheet`) với mẫu cố định: không số ở màu và size; size hết ghi "đã hết" và không chọn được.
   Mẫu theo Số giữ nguyên.

## C. Trang mẫu (`ProductView`, `app/products/[slug]/page.tsx`)

1. **Mọi trang mẫu bỏ dòng nhãn trên các nút màu** ("Màu · Đen · còn 10"): nút màu đã ghi tên (và số còn, với mẫu theo Số).
   Nhóm nút giữ `aria-label="Màu"`. Dòng "Size · chưa chọn · Bảng số đo" giữ nguyên.
2. **Mẫu cố định**: không dòng `.kick` (trạng thái · Số · đồng hồ), không khối `.stock`; nút màu chỉ tên màu (`aria-label`
   "Màu Trắng"); bảng size không số, size hết ghi "đã hết" và bị khoá; đường dẫn "Áo thun / ÁO THUN TRƠN" (không Số).
3. **Hàng dưới của mẫu cố định là "Cùng loại"**: meta "<họ viết thường>, cùng tầm giá" (ví dụ "áo thun, cùng tầm giá"), lối
   "Xem tất cả <họ viết thường>" tới `/products?family=<họ>`; tối đa bốn mẫu **đang bán** cùng họ, cả hai loại, trừ chính nó,
   gần giá nhất trước. Thẻ mẫu theo Số ở đây có biển (§B.1).
4. **Mẫu theo Số**: tên có tiền tố ở `h1`, đường dẫn, thanh mua dính đáy, tiêu đề trang, `alt` và `aria-label` của ảnh và bảng
   size. "Cùng số 05" giữ như cũ (không biển), tên trong thẻ có tiền tố.

## D. Trang chủ (`app/page.tsx`)

1. **"Đang bán"**: `<section className="sec">`, `h2` "Đang bán", lối "Xem tất cả {n} mẫu" tới `/products` (n = số mẫu đang
   bán), không meta, lưới `.grid3` sáu thẻ. Sáu thẻ là mẫu đang bán **không thuộc Số đang mở** (tức mẫu cố định), bỏ mẫu hết cả
   kệ; chọn mỗi họ một mẫu theo thứ tự `FAMILIES` (mẫu đầu theo `position`), rồi lấp theo `position` cho đủ sáu.
2. **Lúc Số đang mở**: bìa → "Trong số này" → **"Đang bán"** → "Theo loại" → "Bốn quy tắc" → bìa Số sau → dòng `.past`. "Theo
   loại" đếm mọi mẫu đang bán, meta "đang bán", **không** lối "Xem tất cả" (đã ở "Đang bán"); ảnh mỗi hàng lấy mẫu đầu của họ
   trong tập đang bán.
3. **Giữa hai Số** (không Số nào mở): bìa Số sắp mở (như hôm nay) → "Đang bán" → "Theo loại" (chỉ mẫu cố định, meta "đang
   bán") → "Bốn quy tắc" → dòng `.past`.
4. Tên có tiền tố ở danh sách "Còn ít" trên bìa và ở chú thích hai mẫu hé lộ ("S06 – SỎI").

## E. Tên có tiền tố ở mọi chỗ của cửa hàng

Mọi chỗ in tên một mẫu cho khách đi qua `styleName`: thẻ, trang mẫu, sheet size, toast "Đã thêm … vào giỏ", giỏ, để dành, thanh
toán (`OrderBox`), xác nhận đơn, đơn của tôi, chi tiết đơn, tra đơn, hoá đơn in, tìm kiếm (gợi ý và kết quả), đã lưu, tiêu đề
trang, `alt`, `aria-label`. Grep `\.name\b` trong `components/` và `app/` (trừ `components/admin/`, lát 12) và ghi từng chỗ.

## F. Ảnh tạm của tám mẫu cố định: hình phẳng

Tám mẫu cố định chưa có ảnh (người dùng đang tạo bằng ChatGPT; lát ảnh sẽ thay sau). B5 đã ghi khoá `flat-<dáng>-<màu>` (17 khoá,
bảng trong `backend-b5.md` §3.4). Lát này làm ra ảnh cho các khoá đó, đúng hình trong mock:
- `lib/flats.ts`: tám dáng (`tee`, `longsleeve`, `hoodie`, `jacket`, `vest`, `shirt`, `trousers`, `shorts`) chép **nguyên**
  đường nét từ hằng `FLATS` và cách tô từ hàm `flat()` trong `prototype/v3/line/line-mock.js` (khung 200 × 250, màu vải từ
  `data/colors.ts`, viền/đường may theo độ sáng như mock).
- `scripts/flats.ts`: vẽ mỗi khoá thành `public/flats/<dáng>-<màu>.png`, 1040 × 1300, nền `--plate` `#f4efe6`, hình phẳng giữa
  khung như mock, không chữ; chạy lại được, kết quả ổn định. Mỗi PNG mang nguồn gốc:
  `.claude/skills/impeccable/scripts/impeccable embed-prompt <tệp> --prompt "<nguồn: lib/flats.ts + scripts/flats.ts, hình phẳng của mock prototype/v3/line>"`.
- `lib/photos.ts`: khoá `flat-*` → `/flats/<dáng>-<màu>.png` (+ test); khoá lạ vẫn rơi về `hero`.
Được ghi thêm `scripts/flats.ts` và `public/flats/` ngoài các thư mục thường lệ.

## G. Chữ

- `ABOUT_LEAD` (`lib/lexicon.ts`): "…mỗi mẫu **trong số** cắt đúng một lần, hết là hết." — chỉ thêm hai chữ "trong số".
- FAQ "Hết size thì có về lại không?": giữ câu trả lời, thêm câu cuối "Mẫu không mang biển Số thì sẽ có lại."
- Không thêm câu nào khác giải thích mẫu cố định, ở bất cứ đâu.

## Không đụng

Khu quản trị (lát 12), `DESIGN.md` (documenter viết sau lát 12), mock, Supabase hosted, dữ liệu và migration (B5 đã xong; thiếu
gì ở tầng dữ liệu thì dừng và báo), ảnh thật (lát ảnh).

## Kiểm (agent tự chứng minh)

1. `npm run typecheck`, `npm test` (test cho `lib/flats.ts`, ánh xạ ảnh, luật chọn sáu mẫu, luật "Cùng loại"), `npm run build`.
2. Dừng 3200, build, chạy `npm run preview:serve` nền và **để nó chạy**.
3. Ảnh (`playwright cli`, cổng 3200) vào `.playwright-cli/shots/v3/lat11/`, mỗi cảnh ở 390×844 và 1280×800, **so với khung mock
   tương ứng** (mở khung mock cỡ thật với `mark=0`):
   - `/products` đầu trang (tab, hai thẻ đầu) và chỗ MUỐI (SOLD OUT trên, biển dưới);
   - `/so/5` đầu trang;
   - trang chủ ở "Trong số này" → "Đang bán" → "Theo loại";
   - trang chủ giữa hai Số: **dựng trên DB cục bộ** (ví dụ lùi `closes_at` của Số 05 bằng SQL trên stack cục bộ), chụp, rồi trả
     lại bằng `reset_demo` hoặc `npx supabase db reset`; không bao giờ trên hosted;
   - `/products/ao-thun-tron` (ticket và "Cùng loại"), `/products/s05-khoi` (ticket);
   - sheet size của một mẫu cố định mở từ thẻ;
   - giỏ và thanh toán có một mẫu theo Số và một mẫu cố định;
   - vạch tab phóng 4× (`deviceScaleFactor: 4`, cắt quanh tab đang chọn) trước và sau.
4. Biển trên thanh điều hướng: so từng điểm ảnh thanh ở 1280 và 390 trước/sau; phải trùng.
5. Đo: biển và SOLD OUT cùng cao (28/32) và cùng cỡ chữ; không chồng nhau trên thẻ 171px; không tràn ngang ở 360/390/1280; tên
   dài nhất ("ÁO THUN TAY DÀI", "S05 – NGUỘI") không tràn thẻ 171px.
6. `tools/layout-sweep.js` một lượt (route mới `/so/5` nếu sweep chưa có thì nói trong báo cáo); 0 lỗi console.

## Báo cáo

Danh sách tệp; kết quả typecheck/test/build; đường dẫn ảnh kèm cảnh, cỡ và khung mock đối chiếu; mọi chỗ lệch mock và lý do;
danh sách lối "xem cả Số" đã đổi; danh sách chỗ in tên đã qua `styleName`; cách dựng và trả lại cảnh giữa hai Số; kết quả so điểm
ảnh biển trên thanh; nguồn gốc 17 ảnh phẳng; trạng thái 3200. **Không commit.**
