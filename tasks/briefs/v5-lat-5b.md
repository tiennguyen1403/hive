# Brief: v5 lát 5b, form mẫu theo Arc

Đợt v5 đưa quản trị sang Arc. Lát 0 đến lát 5a đã ĐẠT và commit: lát 0 `6733d29`, lát 1 `d3b453c`, lát 2 `4e7c926`, lát 3
`f6cb354`, lát 4 `8a9f595`, lát 5a `8e3e252`. Thêm hai lát server B14 `ce56bb7` và B14b `8c300a1`. Lát này đưa sang Arc màn
cuối còn ở v3:
- form thêm mẫu `/admin/products/new` và form sửa mẫu `/admin/products/[id]`;
- phần "Màu và ảnh" của form: chọn màu, ảnh từng màu, ảnh mượn tạm, kéo thả tệp, tải ảnh lên;
- hộp "Chọn vùng cắt".

Sau lát này, mọi route quản trị dùng khung Arc. Lát 6 dọn mã v3.

**Luật của các lát trước giữ nguyên.** Đọc `tasks/briefs/v5-lat-0.md` đến `v5-lat-5a.md` và `registry/PATCHES.md`. Code đã
commit trong `components/admin-arc/` là mẫu người dùng đã duyệt.
- Spec ghép từ ba nguồn: brief này, rồi màn v3 đang chạy (hành vi và chữ, giữ đúng từng chữ), rồi tài liệu Arc (hình dáng).
  Brief nào tóm chữ khác v3 thì v3 thắng.
- **Cài item Arc mới:** chạy `printf 'n\nn\nn\nn\n' | npx shadcn@latest add @uiarc/<id> … --yes`. **Phải trả lời không** khi CLI
  hỏi ghi đè `registry/foundation.css`. Cấm `shadcn init`. Sau khi cài, `git status` chỉ được thêm `registry/` và
  `package*.json`.
- **Chuỗi tiếng Anh:** dịch sang tiếng Việt, ghi chuỗi gốc vào `arc-english-strings.ts`, ghi mọi chỗ vá vào `PATCHES.md`, và
  thêm test canh chỗ vá.
- **Icon, token và chữ** như các lát trước. Mọi `DialogContent` và `DrawerContent` có `onInteractOutside={keepOpenForToasts}`.
- **Server:** giải phóng cổng 3200 bằng `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`, chạy thành
  một lệnh riêng. Mã 1 thì dừng lại và báo.

## 1. Màn và route

| Màn | Route | Nguồn hành vi và chữ |
|---|---|---|
| Thêm mẫu | `/admin/products/new` | `app/admin/products/new/page.tsx`, `components/admin/ProductForm.tsx` |
| Sửa mẫu | `/admin/products/[id]` | `app/admin/products/[id]/page.tsx`, `ProductForm.tsx` |
| Một hàng ảnh | trong form | `components/admin/ProductPhotoSlot.tsx`, luật ở `lib/product-form.ts` |
| Chọn vùng cắt | mở từ form | `components/admin/CropSheet.tsx`, luật ở `lib/photo-crop.ts`, mã hoá ở `lib/photo-encode.ts` |

**`ARC_ADMIN_TREES`:** thêm cây `/admin/products/`. Sau lát này mọi route quản trị dùng khung Arc. Cập nhật test: mọi trang
trong `app/admin/` đều đúng. Thêm một test quét `app/admin/**/page.tsx`, để route mới nào quên khai báo thì đỏ.

**Logic giữ nguyên:** chép logic của `ProductForm` (tải ảnh lần lượt, giữ key ảnh khi server từ chối, tải lại khi kho ảnh đã
bị đặt lại, trả object URL, `inert` lúc lưu, giữ focus) sang bản Arc. Không sửa file v3; lát 6 xoá chúng.

## 2. Đã chốt
- QĐ-37, QĐ-38, QĐ-39 và mọi mẫu trình bày của lát 0 đến lát 5a.
- Giữ nguyên chữ v3, kể cả câu trợ giúp dưới các ô, chú thích từng ảnh và dòng tổng ở thanh lưu.
- Bố cục như v3: cột trái là "Thông tin cơ bản" rồi lưới số lượng, cột phải khoảng 380px là "Màu và ảnh". Thanh lưu nằm cuối
  trang, không dính.
- "Chọn vùng cắt" là Arc `Dialog` giữa màn hình, rộng 720px như v3. Đây là một việc tập trung trên một ảnh, không phải form
  dài.
- Lưới số lượng giữ ô số không có nút tăng giảm, như v3 (khác tấm tồn kho của lát 5a).

## 3. Việc cần làm

### 3.1 Cài và vá
- `@uiarc/textarea` cho "Chất liệu & form". Việt hoá như các lát trước.
- **Vá `input`:** prop `prefix` (chuỗi). Prop này vẽ một đoạn cố định ở đầu ô, nền `--surface-muted`, ngăn với phần gõ bằng
  viền 1px. Đoạn đó có id, và ô nhập có `aria-describedby` trỏ tới nó, như v3. Không có `prefix` thì Input y như Arc gốc. Dùng
  cho "S06 –" ở đầu ô tên mẫu của một số.

### 3.2 Đầu trang
- `Breadcrumb` "Mẫu › Thêm mẫu" hoặc "Mẫu › S05 – KHÓI".
- `h1`. Ở form sửa mẫu của một số có dòng phụ "Số 05 đã cắt 35 chiếc."; mẫu cố định không có dòng này.
- Badge "Dữ liệu mẫu". Form sửa có `ArcButtonLink` `secondary` `sm` `Eye` "Xem trên cửa hàng" tới `/products/<slug>`, cùng tab
  như v3.
- Form thêm không có câu nào dưới tiêu đề, như v3.

### 3.3 "Thông tin cơ bản"
- **Tên mẫu:** Arc `Input` với `prefix` "S06 –" khi đã chọn một số. Placeholder "VD: KHÓI", hoặc "VD: ÁO THUN TRƠN" cho mẫu
  cố định. Chữ viết hoa ngay trong giá trị như ô tên mẫu hé lộ ở lát 4: không viết hoa lúc đang soạn dấu, và giữ con trỏ.
  Dùng chung phần đó với `ArcTeaserDialog`.
- **Loại:** `Select` với chữ phụ "N mẫu" (`kindOptions` của `lib/admin-options.ts`).
- **Form:** `Select`.
- **Số:** `Select` "Số 06 · sắp mở" … "Cố định". Mẫu cố định đang sửa thì là `Input` chỉ đọc "Cố định".
- **Giá bán (₫):** ô số tiền như v3 (`moneyInput`, `parseVnd`), placeholder "VD: 390.000". Mẫu mới để trống.
- **Mã trên địa chỉ:** nhãn "· không bắt buộc" ở form thêm. `description` là câu trợ giúp của v3, kể cả địa chỉ tự sinh.
- **Chất liệu & form:** Arc `Textarea`, 4 dòng.
- Bốn trường giữa xếp hai cột như v3.

### 3.4 Lưới số lượng
- Tiêu đề panel: "Số lượng sẽ cắt" ở mẫu mới của một số, "Tồn kho" ở các trường hợp khác.
- Chữ phụ của tiêu đề như v3: "tổng 36 chiếc", "đã cắt 35 · còn 17", "còn 31".
- Lưới Màu × S, M, L, XL × Cộng, giống tấm tồn kho ở lát 5a nhưng mỗi ô chỉ là ô số 44px, không có nút.
- Chưa chọn màu: câu "Chọn màu trước thì lưới size mới có hàng để điền."

### 3.5 "Màu và ảnh"
- Tiêu đề panel kèm chữ phụ `panelMeta`.
- **Form thêm:**
  - nhãn "Màu sẽ cắt" (mẫu cố định là "Màu");
  - 7 nút bật tắt màu (`aria-pressed`), mỗi nút có chấm màu và tên màu; nút đã chọn mang số thứ tự;
  - dưới là câu trợ giúp v3.
  - Dựng trong dự án bằng token Arc, vì `chip-group` của Arc không có chấm màu và số thứ tự.
- **Form sửa:** dòng "Đen · Trắng.".
- **Mỗi màu một hàng:**
  - ô ảnh 96×120, nhận kéo thả tệp. Ô trống viền đứt và có icon `ImageIcon`. Khi kéo tệp ngang qua thì viền `--foreground`;
  - đầu hàng: chấm màu, tên đậm 500, nút "Đưa Đen lên trước" (`ArrowUp`) và "Đưa Đen xuống sau" (`ArrowDown`); ở form thêm có
    thêm "Bỏ màu Đen" (`X`). Cả ba là nút chỉ có icon, cỡ `sm`, có tên đọc như v3;
  - dòng chú thích như v3: "Ảnh đại diện · " ở màu đầu, tên tệp và cỡ, "mượn tạm" (Badge `neutral`) kèm "ảnh của mẫu …",
    "Ảnh đã tải lên" hoặc "Ảnh thật";
  - các nút như v3. "Khung cắt" là `Button` `secondary` `sm` không icon, như v3. "Chọn tệp", "Tải ảnh thật", "Đổi ảnh" là nút
    chọn tệp: một `<label>` bọc ô file ẩn, mang kiểu `Button` của Arc theo cách `ArcButtonLink` mượn class, icon `ImageUp`,
    vòng focus qua `:focus-within`. "Mượn tạm" và "Đổi ảnh mượn" là nút dạng link có `aria-expanded`;
  - lưới ảnh mượn mở dưới hàng: dùng lại `ArcPhotoPicker`, tên "Ảnh mượn tạm cho Đen", mỗi ảnh đọc là "Ảnh của S05 – KHÓI";
  - ảnh đang tải lên có vạch 2px chạy dưới ô ảnh, thành vạch đầy khi xong. Dùng `--accent`. Có giảm chuyển động.
- Dời màu giữ focus ở đúng nút mũi tên, như v3.

### 3.6 Hộp "Chọn vùng cắt"
- Arc `Dialog` 720px. Tiêu đề "Chọn vùng cắt · Đen". Câu phụ "Kéo khung để dời, kéo góc để đổi cỡ."
- **Sân ảnh:** ảnh, khung 4:5 viền 2px `--accent`, bốn góc 14px. Ngoài khung tối đi bằng một bóng, như v3. Khung có
  `role="group"`, `tabIndex=0`, `aria-roledescription` và tên như v3. Phím mũi tên dời khung, `+` và `−` đổi cỡ.
- **Cột bên:** ảnh xem trước 96×120, "Vùng chọn … / lưu …". Vùng quá hẹp thì cảnh báo `--danger` có icon `TriangleAlert`:
  "Hẹp hơn 800px, ảnh trên trang sẽ mờ". Có nút dạng link "Toàn ảnh".
- **Chân:** "Huỷ" `secondary` `ArrowLeft`; "Dùng vùng này" **`primary`** `Check`.
- Đóng xong thì focus về "Khung cắt" của hàng đó, như v3.

### 3.7 Thanh lưu
- Một panel cuối trang: chữ tổng hợp như v3 ("Giá đang nhập: …", "Đang tải ảnh lên… 1 / 2"), số đậm 500.
- `ArcButtonLink` `secondary` `sm` `ArrowLeft` "Huỷ" tới `/admin/products`.
- Nút lưu **`primary`** `Check` "Tạo mẫu · 36 chiếc" hoặc "Lưu thay đổi". Còn thiếu thì nút vô hiệu, không icon, mang câu của
  `newStyleBlocker`. Lúc lưu: "Đang lưu…", và form `inert`.

### 3.8 Dùng lại từ lát 4 và 5a
- `ArcPhotoPicker` cho lưới ảnh mượn.
- Phần viết hoa lúc gõ của `ArcTeaserDialog` (§3.3).
- Kiểu ô số của `ArcCountField` cho ô của lưới số lượng, bỏ hai nút.
- Cách trả focus của `ArcDropsScreen` và `ArcStockDrawer`.

### 3.9 Sửa thêm
- **`ArcCancelOrderDialog` (lát 0)** đóng bằng Esc hay "Giữ đơn" thì thả focus về `<body>`, cả ở `/admin/orders` lẫn
  `/admin/orders/DH-2431`. Sửa để focus về nút hoặc menu đã mở hộp, như lát 4 và 5a.
- **Chữ giải thích nhãn "mới" ở hồ sơ khách** (`ArcCustomerScreen.tsx`). Người dùng duyệt ngày 01/10: ghi tên số thay cho "số
  đang bán", vì giữa hai số nhãn "mới" tính theo số vừa đóng.
  - "đơn đầu là DH-2430, trong số đang bán" thành "đơn đầu là DH-2430, trong Số 05";
  - "Chưa đủ để gắn nhãn nào: cần ≥ 2 đơn đã thanh toán, hoặc đơn đầu trong số đang bán." thành "… hoặc đơn đầu trong Số 05.";
  - số lấy từ `currentIssueNo` (`lib/current-issue.ts`), đúng số mà nhãn dùng;
  - có test.
- **Toast của form:** form v3 hiện toast v3 trong lúc khung đổi sang Arc. Lát này đưa form sang Arc nên toast đi qua
  `useArcToast`. Kiểm lại sau khi tạo mẫu: toast hiện ở bảng Mẫu.

### 3.10 Test
- `lib/admin-arc.test.ts` như §1, kèm test quét route.
- Test cho chỗ vá `input`.
- `arc-overlays.test.ts` vẫn xanh.

## 4. Kiểm
Máy tính **1280**; ảnh toàn trang ở **1440** chụp bằng khung nhìn cao bằng trang. Không còn trang v3 nào. So phần khách với
ảnh "trước".

**Form thêm:**
- trống;
- chọn 3 màu theo thứ tự, thấy số thứ tự; bỏ một màu đã điền số thì có toast v3;
- chọn "Cố định": mất đoạn "S06 –", nhãn đổi;
- nút lưu gọi tên thứ còn thiếu theo thứ tự của `newStyleBlocker`;
- chọn tệp, kéo thả tệp, khung cắt bằng chuột và bằng phím, "Toàn ảnh", cảnh báo vùng hẹp;
- mượn tạm bằng chuột và bằng phím mũi tên;
- dời màu bằng bàn phím, focus giữ đúng chỗ.

**Form sửa:** một mẫu của số (`/admin/products/p-khoi`) và một mẫu cố định.

**Ghi DB:** tạo một mẫu mới có một ảnh tải lên và một ảnh mượn; sửa giá và thứ tự màu của một mẫu. Mỗi việc ra toast đúng
câu v3. Mẫu mới hiện ở tab của nó trong bảng Mẫu.

**Sửa thêm (§3.9):**
- hộp huỷ đơn trả focus ở cả hai chỗ;
- hồ sơ khách ghi "trong Số 05". Trường hợp giữa hai số kiểm bằng test, không đổi đồng hồ mẫu.

**Chung:**
- vòng focus; hộp cắt bẫy focus, Esc huỷ;
- Mona Sans, kể cả lớp portal;
- 0 lỗi console; không tràn ngang ở 1280;
- phần khách không đổi;
- chạy `tools/layout-sweep.js`. Các lượt của form mẫu (`/admin/products/new#…`, `/admin/products/p-khoi#…`) đang tìm lớp v3.
  Chạy bản sao ở scratchpad với lượt tìm theo vai trò, và báo lại để phiên chính sửa bản gốc.

Xong thì đặt lại dữ liệu: `npx supabase db query "select public.reset_demo(public.demo_anchor());"`.

## 5. Ảnh cần nộp
`.playwright-cli/shots/v5/lat-5b/`: `product-new-<trạng thái>-<w>.png`, `product-edit-<mẫu>-<w>.png`,
`crop-<trạng thái>-1280.png`, `loan-<trạng thái>-1280.png`, `focus-*-1280.png`, `after-*` cho phần khách.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, thêm các mục "Vá Arc", "Xung đột luật" và "Chưa làm". Gửi trọn trong **tin cuối**.
Không commit, không đụng git ngoài `git status` và `git diff`. Để server 3200 chạy cho phiên chính duyệt.
