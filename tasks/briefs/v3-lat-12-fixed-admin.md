# Brief lát 12 · v3 — mẫu cố định trong quản trị: tab Cố định, cờ sắp hết, "Nhập thêm" trong menu, form không giải thích

Phiên chính viết ngày 25/09/2026. Agent `ui-implementer` thực thi **sau** B5 (`tasks/briefs/backend-b5.md`: mẫu cố định trong
DB, lý do `Nhập thêm`, action `restockProduct`, `createProduct` nhận mẫu cố định, `styleName`, `slugFor`, `fixedLowCells`,
`isRunningLow`) và lát 11 (cửa hàng). **Người dùng đã duyệt** bảng `prototype/v3/line.html`; câu gốc ghi trong `tasks/plan.md`
(mục "mẫu cố định vòng 1–4"). Các câu chốt cho quản trị:
- "đổi tên tab … sang cố định và move nó ở vị trí tab đầu";
- bỏ dòng cuối bảng "… Admin thì đương nhiên là biết điều này rồi"; "nếu sản phẩm nào sắp hết thì UI cần phải thể hiện để admin
  chú ý và nhập thêm sản phẩm";
- "move button nhập thêm vào trong dropdown action";
- lựa chọn "Cố định", "bỏ cái text 'bán liên tục'"; "vui lòng không mô tả cho admin biết mẫu cố định là gì";
- bỏ "Số lượng điền ở đây là số sẽ cắt. Một số cắt một lần và không may thêm, nên con số này là toàn bộ số hàng sẽ tồn tại.";
  người dùng đồng ý bỏ luôn hai câu cùng kiểu (dưới ô Số, vế "Chốt lúc cắt" ở ô Màu).

**Mock (chuẩn đối chiếu):** khung "Quản trị" của `prototype/v3/line.html` (mở bằng `cd prototype && python serve.py 3100`):
`line/admin-products.html?mark=0` (danh sách, menu ⋯ mở sẵn trên mẫu sắp hết đầu tiên), `line/admin-new.html?sell=menu&mark=0`
(ô Số đang mở menu, tiền tố trong ô tên) và `?sell=fixed&mark=0` (đã chọn Cố định). CSS chuẩn: `prototype/v3/line/line-mock.css`
(`.stockcell`, `.lownote`, `td.hotsize`, `.stabs .lowdot`, `.rowmenu[aria-expanded="true"]`, `.pfxin`).

## A. Danh sách mẫu (`/admin/products`, `ProductsTable`)

1. **Tab "Cố định" đứng đầu**, số đếm là số mẫu cố định; là tab mở khi vào trang không kèm tham số (tab đầu); tham số
   `?fixed=1`. Khi có mẫu cố định đang sắp hết: chấm đỏ 7px sau số đếm (`.lowdot`), `title` và `aria-label` "N mẫu sắp hết" — thấy
   được cả khi đang ở tab khác. Các tab Số giữ nguyên thứ tự sau nó.
2. **Bảng của tab Cố định**, cùng cột với tab Số: Mẫu · Loại · form · Giá · Màu · Tồn kho · Size hết · Trạng thái · ⋯.
   - **Tồn kho**: "còn N" (tổng), dưới là dòng đỏ nhỏ (`.lownote`) khi sắp hết, kể theo thứ tự size: size hết mọi màu thì
     "M hết", size còn ≤ 2 ở một màu thì "L còn 2" (số nhỏ nhất của size đó), nối bằng " · ". Không thanh tồn (mẫu cố định không có
     số cắt để so).
   - **Size hết**: như tab Số; đỏ đậm (`td.hotsize`) khi có.
   - **Trạng thái**: sắp hết → badge `hot` "Sắp hết"; hết cả kệ → badge `shut` "Hết"; còn lại → `ok` "Đang bán".
   - **Thứ tự**: mẫu sắp hết (và hết) lên đầu, trong mỗi nhóm theo `position`.
   - Chip lọc "Sắp hết N" và "Hết N" của hàng công cụ đếm và lọc theo luật mẫu cố định (`isRunningLow`, tổng 0).
   - Không dòng chú thích cuối bảng.
3. **Dòng phụ dưới "Mẫu"** đếm mọi mẫu: "{tổng} mẫu · {đang bán} đang bán · tồn kho theo size và màu".
4. **Menu ⋯ của mẫu cố định**: **"Nhập thêm"** (icon `box`) đứng đầu, rồi "Sửa mẫu", "Điều chỉnh tồn kho", "Xem ở cửa hàng". Mẫu
   cố định nào cũng có mục này, không riêng mẫu sắp hết. Mẫu theo Số: menu giữ nguyên, không có "Nhập thêm". Nút ⋯ khi menu mở có
   nền `--plate` như lúc hover (`.rowmenu[aria-expanded="true"]`).
5. **Tên** mọi dòng qua `styleName` (tab Số hiện "S05 – KHÓI"); `aria-label` của menu cũng vậy.

## B. Sheet "Nhập thêm"

Chưa có trong mock: **dựng bằng chính `InventoryAdjustSheet`** ở một chế độ mới, không vẽ sheet mới. Khác chế độ điều chỉnh:
- tiêu đề "Nhập thêm · {tên}";
- mỗi ô màu × size: tồn hiện tại và một ô nhập **số cần thêm** (nguyên, 0–999, mặc định 0) thay vì giá trị mới; ô đang sắp hết
  (≤ 2) có số tồn màu `--hot`;
- không chọn lý do (lý do cố định `Nhập thêm`); ghi chú tuỳ chọn như chế độ cũ;
- nút gửi nói việc: "Nhập thêm {n} chiếc"; khi n = 0 nút khoá với chữ "Nhập số cần thêm";
- gọi `restockProduct` với các ô > 0 (kèm `before` đọc lúc mở); lỗi `STALE` → báo như chế độ cũ và nạp lại số; thành công →
  toast của action ("Đã nhập thêm {tên} · +N chiếc · đã lưu", cùng khuôn với toast điều chỉnh tồn kho — B5 đã viết, giữ), bảng
  cập nhật, cờ sắp hết tự tắt khi không còn ô ≤ 2.

## C. Form thêm mẫu (`/admin/products/new`, `ProductForm`)

1. **Ô Số**: menu gồm các Số nhận mẫu mới như hôm nay, rồi **"Cố định"** cuối, không kèm chữ nào.
2. **Khi chọn một Số**: ô "Tên mẫu" có đoạn cố định "S06 –" ở đầu ô (nền `--plate`, chữ 600 font chữ thường, vạch `--hair` ngăn
   với phần gõ; không gõ, không chọn được), theo Số đang chọn; `aria-describedby` trỏ tới nó. Placeholder "VD: KHÓI".
3. **Khi chọn "Cố định"**: không đoạn tiền tố; placeholder "VD: ÁO THUN TRƠN"; tiêu đề khung "Số lượng sẽ cắt" thành "Tồn kho";
   nhãn "Màu sẽ cắt" thành "Màu"; tổng "tổng N chiếc" giữ.
4. **Bỏ ở cả hai lúc**: câu dưới tiêu đề trang ("Số lượng điền ở đây là số sẽ cắt…"); câu dưới ô Số ("Tạo cho Số chưa mở thì lên
   kệ đúng giờ mở; Số đang mở thì lên kệ ngay."); vế "Chốt lúc cắt: sau đó không thêm màu." ở ô Màu — giữ "Thứ tự chọn là thứ tự dải
   màu trên thẻ; màu đầu là ảnh đại diện."
5. Mã trên địa chỉ tự sinh bằng `slugFor(name, dropNo)`; gửi `createProduct` với `dropNo: null` khi Cố định.

## D. Form sửa mẫu (`/admin/products/[id]`)

Mẫu cố định: ô Số hiện "Cố định" dạng chỉ đọc (`.field3 .inp[readonly]` sẵn có), không menu; nhãn "Tồn kho"/"Màu" như §C.3.
Mẫu theo Số: menu Số không có "Cố định"; ô tên có đoạn tiền tố chỉ đọc như §C.2. Hai câu/vế ở §C.4 nếu có trên màn sửa cũng bỏ.

## E. Tên có tiền tố trong mọi màn quản trị

Mọi chỗ in tên một mẫu trong `components/admin/` và `app/admin/` qua `styleName`: bảng mẫu, đơn hàng (danh sách, chi tiết, phiếu
giao, hoá đơn), khách hàng, tổng quan (mẫu sắp hết, bán chạy), nhật ký, sheet điều chỉnh, crumb "Mẫu › …", toast, `aria-label`.
Grep `\.name\b` và ghi từng chỗ. Dòng nhật ký của một lần nhập thêm đọc tự nhiên (lý do "Nhập thêm", số chiếc cộng thêm).

## F. Bổ sung sau B5 (phiên chính, 25/09, sau commit `28ee1bc`)

**B5 đã làm, đừng làm lại:**
- `restockProduct(id, cells)` trong `lib/actions/catalog-admin.ts`:
  - `cells` là `[{ color, size, before, add }]`, mỗi `add` nguyên 1–999 (`MAX_RESTOCK_PER_CELL`); `readRestockCells` đọc;
  - lỗi dữ liệu trả `RESTOCK_BAD_MESSAGE`;
  - chưa có client nào gọi. Theo tài liệu Next, action chưa dùng bị loại khỏi build, nên gắn vào sheet ở §B là lúc nó thành
    endpoint.
- `lib/inventory-adjust.ts`: `RESTOCK_REASON`. `STOCK_REASONS` có "Nhập thêm" nhưng menu lý do của sheet vẫn 4 mục; giữ nguyên, vì
  "Nhập thêm" chỉ đi qua chế độ §B.
- `InventoryAdjustSheet` đã bỏ trần và các câu về số cắt cho mẫu cố định. Hiện chưa mở được với mẫu cố định vì chưa có tab.
- `ProductForm`, khi sửa mẫu cố định:
  - ô Số đang **ẩn**, nên "Giá bán" đứng một mình một hàng; §D (ô "Cố định" chỉ đọc) lấp chỗ đó;
  - nút lưu gửi `dropNo: null`;
  - thẻ "Màu và ảnh" vẫn còn vế "Không thêm màu sau khi cắt;". Đây là cùng loại với vế ở §C.4: bỏ ở cả hai loại mẫu, giữ
    "thứ tự dải màu và ảnh thì đổi được".
- `ProductsTable`: CSV để trống Số, cắt, bán của mẫu cố định; dòng phụ hiện chỉ đếm mẫu theo Số, §A.3 thay.
- Màn đơn, danh sách đơn, trang khách, phiếu giao không còn in "Số 00".
- Dòng nhật ký `PRODUCT_ADDED` của mẫu cố định ghi "N màu".

**Quyết định cho các câu agent B5 hỏi:**
1. **Mẫu hé lộ tạo mới** (`teaserSlug`): mã theo cùng khuôn với mẫu theo Số, `s06-soi`, giống fixture `data/catalog.ts`; hiện
   hàm ra `soi-6`. Dùng lại `slugFor`/`issueCode`, không viết khuôn thứ hai. Có test.
2. **Sửa mẫu mà để trống ô mã** (`productPatch`): sinh bằng `slugFor(name, dropNo)`, không dùng `asciiSlug(name)`. Mẫu cố định
   không có tiền tố. Có test.
3. **Dòng nhật ký thêm mẫu cố định:** giữ "N màu", không thêm số tồn mở đầu, không migration mới.
4. **Loại của mẫu cố định** ("Áo gile phao", "Quần kaki"…) trong menu "Loại" của form thêm mẫu và sheet hé lộ: giữ. Loại là từ
   vựng chung; một Số cũng có thể có quần kaki.
5. **Ảnh phẳng `flat-*`:** không vào danh sách ảnh mượn (`loanPhotos`). Lát 11 giữ chúng ngoài `PHOTO_IDS`, và lát ảnh sẽ thay
   bằng ảnh thật.

## Không đụng

Cửa hàng (lát 11 đã xong), `DESIGN.md` (documenter viết sau lát này), mock, Supabase hosted, migration (B5; thiếu gì ở tầng dữ
liệu thì dừng và báo), luật tổng `LOW_STOCK_AT` và bảng tổng quan ngoài việc đổi tên.

## Kiểm (agent tự chứng minh)

1. `npm run typecheck`, `npm test` (test cho luật dòng đỏ, thứ tự hàng, đếm chip, chế độ nhập thêm của form sheet nếu logic nằm
   ở `lib/`), `npm run build`.
2. Dừng 3200, build, chạy `npm run preview:serve` nền và **để nó chạy**. Đăng nhập bằng "Vào quản trị thử".
3. Ảnh 1280×800 vào `.playwright-cli/shots/v3/lat12/`, **so với khung mock** tương ứng (`mark=0`):
   - `/admin/products` mặc định (tab Cố định, ba mẫu sắp hết ở đầu); cùng trang với menu ⋯ của HOODIE TRƠN **đang mở**;
   - sheet "Nhập thêm" của HOODIE TRƠN: lúc mở, lúc đã điền, sau khi gửi (toast, hàng cập nhật);
   - tab Số 05 (tên có tiền tố, menu không có "Nhập thêm");
   - `/admin/products/new` với menu Số **đang mở**, rồi đã chọn Số 06 (tiền tố "S06 –"), rồi đã chọn Cố định;
   - tạo một mẫu cố định từ đầu tới cuối → có trong tab Cố định và trên `/products` của cửa hàng;
   - `/admin/products/p-ao-thun-tron` (sửa mẫu cố định) và `/admin/products/p-khoi`;
   - danh sách đơn và một chi tiết đơn có tên có tiền tố.
   Xong thì đặt lại dữ liệu mẫu (nút "Đặt lại dữ liệu mẫu" hoặc `reset_demo` trên stack cục bộ).
4. Mở mọi lớp nổi trước khi đo (menu ⋯, menu Số, sheet). `tools/layout-sweep.js` một lượt cho các route quản trị; 0 lỗi console.

## Báo cáo

Danh sách tệp; kết quả typecheck/test/build; đường dẫn ảnh kèm cảnh và khung mock đối chiếu; mọi chỗ lệch mock và lý do; cách
làm chế độ nhập thêm trong `InventoryAdjustSheet`; danh sách chỗ in tên đã qua `styleName`; trạng thái 3200. **Không commit.**
