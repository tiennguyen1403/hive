# Brief: v5 lát 3, Khách hàng và Mã giảm giá theo Arc

Đợt v5 đưa quản trị sang Arc. Lát 0 (`6733d29`), lát 1 (`d3b453c`) và lát 2 (`4e7c926`) đã ĐẠT và commit: khu Đơn hàng, Tổng
quan và Nhật ký đã dùng Arc. Lát này đưa sang Arc:
- Khách hàng `/admin/customers` và hồ sơ khách `/admin/customers/[id]`;
- Mã giảm giá `/admin/promotions`, kể cả form tạo, sửa và nhân bản mã.

Sau lát này chỉ còn Các số và Mẫu giữ v3.

**Luật của các lát trước giữ nguyên.** Đọc `tasks/briefs/v5-lat-0.md`, `v5-lat-1.md`, `v5-lat-2.md` và `registry/PATCHES.md`.
Code đã commit trong `components/admin-arc/` là mẫu người dùng đã duyệt.
- Spec ghép từ ba nguồn: brief này, rồi màn v3 đang chạy (hành vi và chữ, giữ đúng từng chữ), rồi tài liệu Arc (hình dáng).
  Brief nào tóm chữ khác v3 thì v3 thắng.
- **Cài item Arc mới:** chạy `printf 'n\nn\nn\nn\n' | npx shadcn@latest add @uiarc/<id> … --yes`. **Phải trả lời không** khi CLI
  hỏi ghi đè `registry/foundation.css`. Cấm `shadcn init`. Sau khi cài, `git status` chỉ được thêm `registry/` và
  `package*.json`.
- **Chuỗi tiếng Anh:** dịch sang tiếng Việt, ghi chuỗi gốc vào `arc-english-strings.ts`, ghi mọi chỗ vá vào `PATCHES.md`, và
  thêm test canh chỗ vá như lát 2.
- **Icon, token và chữ** như các lát trước:
  - Lucide 16, `strokeWidth={1.75}`;
  - chỉ token Arc, đậm 400 và 500, không chữ in hoa, số dùng `tabular-nums`;
  - panel viền 1px, bo `--radius-surface`;
  - badge đổi tone theo `TONE`;
  - mỗi bề mặt một nút `primary`;
  - nút hành động có icon, nút vô hiệu không có.
- **Dùng lại:** `ArcButtonLink`, `useArcToast`, `ArcSearchBox`, `ArcKpi`, `ArcPage.module.css`, các ô và `TONE` của
  `ArcOrderCells`, cách dựng panel và bảng tự viết của `ArcOrderScreen`, và cấu hình bảng của `ArcOrdersScreen`:
  - `density="compact"`, `holdWidths={false}`;
  - mọi cột `sortable: false`, `showCount={false}`;
  - trigger menu dòng chỉ có icon.
- **Server:** giải phóng cổng 3200 bằng `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`, chạy thành
  một lệnh riêng. Mã 1 thì dừng lại và báo.

## 1. Màn và route

| Màn | Route | Nguồn hành vi và chữ |
|---|---|---|
| Khách hàng | `/admin/customers` (`tab`, `q`, `page`, `per`) | `components/admin/CustomersTable.tsx`, `app/admin/customers/page.tsx` |
| Hồ sơ khách | `/admin/customers/[id]` | `components/admin/CustomerScreen.tsx`, `app/admin/customers/[id]/page.tsx` |
| Mã giảm giá | `/admin/promotions` (tab trạng thái) | `components/admin/AdminPromotionsScreen.tsx`, `PromoFormSheet.tsx`, `app/admin/promotions/page.tsx` |

**`ARC_ADMIN_PATHS`:** thêm `/admin/customers` và `/admin/promotions`, thêm cây `/admin/customers/`. Cập nhật test:
- đúng với `/admin/customers`, `/admin/customers/c-minhanh`, `/admin/promotions`;
- sai với `/admin/products`, `/admin/drops`, `/admin/drops/05`.

## 2. Đã chốt
- QĐ-37, QĐ-38, QĐ-39 và mọi mẫu trình bày của lát 0 đến lát 2.
- Giữ nguyên chữ v3. Kể cả dòng chân bảng khách "tổng chi tính từ đơn đã thanh toán, chưa trừ hoàn tiền", câu phụ của form
  mã giảm giá, và các câu trạng thái rỗng.
- Tab trạng thái có số đếm dùng Arc `Tabs` như màn Đơn hàng.
- Form mã giảm giá của v3 là tấm trượt bên phải (`AdminSheet` rộng), nên bản Arc dùng `Drawer`: "a temporary side surface for
  focused work". Hộp huỷ đơn là quyết định nhanh nên dùng `Dialog`; hai trường hợp khác nhau.

## 3. Việc cần làm

### 3.1 Cài thêm
`@uiarc/drawer`, và mọi item khác nếu thật sự cần. Việt hoá như các lát trước; tên nút đóng "Đóng".

### 3.2 Khách hàng `/admin/customers`

| Phần v3 | Arc | Ghi chú |
|---|---|---|
| `h1` "Khách hàng", badge "Dữ liệu mẫu", "Tải CSV" | như các màn danh sách đã làm | cột CSV như v3 |
| 5 tab có số đếm: Tất cả, Thân thiết, Quay lại, "Mới trong số NN", Có đơn chờ | Arc `Tabs` như màn Đơn hàng | nhãn và số đếm theo v3 |
| ô tìm "Tìm tên, số điện thoại, email" | `ArcSearchBox` | trễ 350ms, Enter gửi ngay |
| bảng: Khách, Liên hệ, Đơn, Tổng chi, Đã mua, Nhãn, Đơn gần nhất, menu | Arc `SortableDataTable` với cấu hình như trên | Khách: Arc `Avatar` `sm` (`aria-hidden`, chữ viết tắt theo `monogramName`) và tên đậm 500, một dòng. Liên hệ: số điện thoại, dưới là email `--text-secondary`. Đơn, Tổng chi căn phải. Nhãn: Arc `Badge` `sm` theo tone của nhãn khách, như lát 1; không có thì "—". Đơn gần nhất: "dd/mm · " rồi link mã, dưới là trạng thái `--text-secondary` |
| menu dòng: Hồ sơ, Đơn của khách, Chép email | Arc `DropdownMenu` `iconOnly`, `label` "Thao tác {tên}". Hồ sơ (`User`), Đơn của khách (`ShoppingBag`), Chép email (`Copy`) | Chép email giữ nguyên hành vi v3: clipboard, rồi toast đúng hai câu v3 cho trường hợp chép được và không chép được |
| chân bảng "Hiện n / m khách · tổng chi…", số dòng, trang | chữ `--text-secondary`, `SegmentedControl` "Số dòng mỗi trang", `Pagination`, như màn Đơn hàng | |
| rỗng "Không có khách nào khớp." | `emptyMessage` của bảng | |

### 3.3 Hồ sơ khách `/admin/customers/[id]`

| Phần v3 | Arc | Ghi chú |
|---|---|---|
| đường dẫn "Khách hàng › tên" | Arc `Breadcrumb` | |
| `h1` tên và badge nhãn; dòng phụ "N đơn · tiền · đã mua Số … · tham gia dd/mm/yyyy" | như chi tiết đơn ở lát 1 | |
| "Dữ liệu mẫu", "Đơn của khách" | badge; `ArcButtonLink` `secondary` `sm` `ShoppingBag`, href như v3 | |
| 4 thẻ số: Đơn đã đặt, Tổng chi, Đã mua, Đơn gần nhất | `ArcKpi` như Tổng quan | chữ và dòng ngữ cảnh như v3 |
| panel "Đơn đã đặt" có số đơn, bảng 5 cột | panel và bảng tự viết như "Đơn mới nhất" ở Tổng quan | rỗng "Chưa đặt đơn nào." |
| panel "Liên hệ" | Arc `Avatar` `md`, tên đậm 500, "số · email" `--text-secondary` | |
| panel "Địa chỉ mặc định" với loại địa chỉ ("Nhà") | địa chỉ như "Giao tới" ở lát 1; câu "Sổ địa chỉ của khách có N địa chỉ." `--text-secondary` | |
| panel "Nhãn" | Arc `Badge` `sm` và câu v3 | |

Bố cục hai cột như v3: trái là Đơn đã đặt; phải khoảng 380px là Liên hệ, Địa chỉ, Nhãn.

### 3.4 Mã giảm giá `/admin/promotions`

| Phần v3 | Arc | Ghi chú |
|---|---|---|
| `h1` "Mã giảm giá", "Dữ liệu mẫu", "Tải CSV", "Tạo mã" | badge; `Button` `secondary` `sm` `Download`; `Button` **`primary`** `sm` `Plus` "Tạo mã" mở form | nút primary duy nhất của màn |
| 6 tab có số đếm: Tất cả, Đang chạy, Sắp chạy, Tạm dừng, Hết hạn, Hết lượt | Arc `Tabs` | URL như v3 |
| bảng: Mã, Giảm, Điều kiện, Hiệu lực, Lượt, Trạng thái, menu | Arc `SortableDataTable` với cấu hình như trên. Dòng không chạy và không sắp chạy thì làm mờ như dòng huỷ ở màn Đơn hàng (`rowAttributes`) | Mã đậm 500. Lượt: thanh 4px (`--accent`, đầy thì `--foreground`) kèm "đã dùng / giới hạn"; không giới hạn thì "N · không giới hạn" như v3. Trạng thái là Arc `Badge` `sm`: Đang chạy `success`, Sắp chạy `info`, Tạm dừng `neutral`, Hết hạn `neutral`, Hết lượt `danger` |
| menu dòng: Sửa, Nâng giới hạn thêm N (khi có giới hạn), Nhân bản, Tạm dừng hoặc Tiếp tục, Kết thúc sớm (khi đang chạy) | Arc `DropdownMenu` `iconOnly`. Sửa (`Pencil`), Nâng giới hạn (`Plus`), Nhân bản (`Copy`), Tạm dừng (`Pause`) hoặc Tiếp tục (`Play`), Kết thúc sớm (`X`, `destructive`, `separatorBefore`) | hành động và câu toast như v3 |
| rỗng "Không có mã nào trong nhóm này." | `emptyMessage` của bảng | |
| form `PromoFormSheet` (tạo, sửa, nhân bản) | Arc `Drawer` bên phải, rộng như `AdminSheet` bản `wide` (680px) nếu Drawer cho đặt; tiêu đề "Tạo mã" hoặc "Sửa mã X"; câu phụ đúng chữ v3 | Trường: Arc `Input` Mã (placeholder "DOT06"); Arc `Select` Loại (`KIND_OPTIONS`); Arc `Input` Giảm (%), Giảm tối đa (₫), Giảm (₫), Đơn từ (₫), Giới hạn lượt (nhãn phụ "· trống = không giới hạn", placeholder "không giới hạn"), Bắt đầu, Kết thúc (ô chữ theo dạng "20:00 11/09/2026", báo lỗi như v3). Trường nào hiện theo loại mã thì làm như v3. Lưới hai cột như v3 |
| chân form: Huỷ, "Nhân bản thành X" (khi có), Lưu | "Huỷ" `secondary` `ArrowLeft`; "Nhân bản thành X" `secondary` `Copy`; "Lưu" **`primary`** `Check`, lúc chờ `loading` "Đang lưu…" | ô nhập ngày giữ dạng chữ như v3, không đổi sang DatePicker |

### 3.5 Test
- Cập nhật `lib/admin-arc.test.ts` như §1.
- Chuỗi gốc của các item mới vào `arc-english-strings.ts`.
- Test cũ vẫn xanh, `npm run typecheck` sạch.

## 4. Kiểm
Máy tính **1280**; ảnh toàn trang ở **1440** chụp bằng khung nhìn cao bằng trang. Chụp ảnh "trước" của `/admin/products`,
`/admin/products/p-khoi`, `/admin/drops`, `/admin/drops/05` trước khi sửa code.

**Khách hàng:**
- từng tab;
- tìm một số điện thoại; tìm "zzz" ra trạng thái rỗng;
- menu dòng mở; "Chép email" ra toast;
- "Đơn của khách" mở `/admin/orders?customer=…` với đúng đơn của khách đó;
- 10 dòng mỗi trang.

**Hồ sơ khách:** chụp hai khách, một có nhãn "quay lại" và một có nhãn "3 số liên tiếp"; đi từ chi tiết đơn qua "Hồ sơ" tới đây.

**Mã giảm giá:**
- từng tab;
- menu dòng của một mã đang chạy và của một mã hết hạn;
- form "Tạo mã" với từng loại mã;
- lỗi ngày kết thúc trước ngày bắt đầu;
- ghi DB: lưu một mã mới, sửa một mã, nhân bản, tạm dừng rồi tiếp tục, nâng giới hạn, kết thúc sớm. Mỗi việc ra toast đúng câu
  v3 và bảng đổi tại chỗ.

**Chung:**
- vòng focus bàn phím, kể cả trong Drawer; Drawer bẫy focus, Esc đóng, focus về nút mở;
- font Mona Sans, kể cả lớp portal;
- 0 lỗi console, không tràn ngang ở 1280;
- các trang v3 còn lại không lệch pixel so với ảnh "trước";
- phần khách không đổi;
- chạy `tools/layout-sweep.js` (bản sao ở scratchpad nếu cần thêm lượt). Lượt nào đang tìm lớp v3 của ba màn này thì báo lại để
  phiên chính sửa.

Xong thì đặt lại dữ liệu: `npx supabase db query "select public.reset_demo(public.demo_anchor());"`.

## 5. Ảnh cần nộp
`.playwright-cli/shots/v5/lat-3/`:
- `customers-<trạng thái>-<w>.png`;
- `customer-<khách>-<w>.png`;
- `promotions-<trạng thái>-<w>.png`;
- `promo-form-<trạng thái>-1280.png`;
- `focus-*-1280.png`;
- `before-*` và `after-*` cho các trang v3.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, thêm các mục "Vá Arc", "Xung đột luật" và "Chưa làm". Gửi trọn trong **tin cuối**.
Không commit, không đụng git ngoài `git status` và `git diff`. Để server 3200 chạy cho phiên chính duyệt.
