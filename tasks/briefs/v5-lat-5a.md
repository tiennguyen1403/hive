# Brief: v5 lát 5a, bảng Mẫu và tồn kho theo Arc

Đợt v5 đưa quản trị sang Arc. Lát 0 đến lát 4 đã ĐẠT và commit (`6733d29`, `d3b453c`, `4e7c926`, `f6cb354`, `8a9f595`). Hai
lát server B14 (`ce56bb7`) và B14b (`8c300a1`) cũng đã commit: các số không còn trùng lịch hay đảo thứ tự. Mẫu là khu cuối,
chia làm hai lát:
- **5a (lát này):** bảng Mẫu `/admin/products`, kèm hai tấm "Điều chỉnh tồn kho" và "Nhập thêm";
- **5b (lát sau):** form thêm và sửa mẫu `/admin/products/new`, `/admin/products/[id]`, gồm ảnh và khung cắt ảnh.

Sau lát này, chỉ form mẫu còn giữ v3.

**Luật của các lát trước giữ nguyên.** Đọc `tasks/briefs/v5-lat-0.md` đến `v5-lat-4.md` và `registry/PATCHES.md`. Code đã
commit trong `components/admin-arc/` là mẫu người dùng đã duyệt.
- Spec ghép từ ba nguồn: brief này, rồi màn v3 đang chạy (hành vi và chữ, giữ đúng từng chữ), rồi tài liệu Arc (hình dáng).
  Brief nào tóm chữ khác v3 thì v3 thắng.
- **Cài item Arc mới:** chạy `printf 'n\nn\nn\nn\n' | npx shadcn@latest add @uiarc/<id> … --yes`. **Phải trả lời không** khi CLI
  hỏi ghi đè `registry/foundation.css`. Cấm `shadcn init`. Sau khi cài, `git status` chỉ được thêm `registry/` và
  `package*.json`.
- **Chuỗi tiếng Anh:** dịch sang tiếng Việt, ghi chuỗi gốc vào `arc-english-strings.ts`, ghi mọi chỗ vá vào `PATCHES.md`, và
  thêm test canh chỗ vá.
- **Icon, token và chữ** như các lát trước:
  - Lucide 16, `strokeWidth={1.75}`;
  - chỉ token Arc, đậm 400 và 500, không chữ in hoa, số dùng `tabular-nums`;
  - panel viền 1px, bo `--radius-surface`;
  - badge đổi tone theo `TONE`;
  - mỗi bề mặt một nút `primary`;
  - nút hành động có icon, nút vô hiệu không có.
- **Hộp và tấm trượt:** mọi `DialogContent` và `DrawerContent` phải có `onInteractOutside={keepOpenForToasts}`
  (`arc-toasts.ts`). `arc-overlays.test.ts` đỏ nếu thiếu. Đóng thì focus về đúng nút hoặc menu đã mở nó, như `ArcDropsScreen`.
- **Dùng lại:**
  - `ArcButtonLink`, `useArcToast`, `ArcSearchBox`, `ArcPage.module.css`;
  - `TONE` của `ArcOrderCells`;
  - cách dựng thanh công cụ của `ArcLogScreen`: ô tìm, `FilterMenu` có số đếm, chip chỉ hiện khi đang lọc, `SegmentedControl`;
  - Tabs có số đếm của `ArcOrdersScreen`;
  - cấu hình bảng của lát 3 và 4: `density="compact"`, `holdWidths={false}`, mọi cột `sortable: false`, `showCount={false}`,
    trigger menu dòng chỉ có icon;
  - `Drawer` 680px của `ArcPromoDrawer`;
  - thanh 4px ba trạng thái của Tổng quan và Các số;
  - ảnh 36×45 bo 6px của `ArcOrderScreen`.
- **Server:** giải phóng cổng 3200 bằng `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`, chạy thành
  một lệnh riêng. Mã 1 thì dừng lại và báo.

## 1. Màn và route

| Màn | Route | Nguồn hành vi và chữ |
|---|---|---|
| Mẫu | `/admin/products` (`fixed`, `drop`, `kind`, `low`, `gone`, `q`) | `components/admin/ProductsTable.tsx`, `app/admin/products/page.tsx`, luật ở `lib/admin-products.ts` |
| Điều chỉnh tồn kho, Nhập thêm | mở từ menu dòng | `components/admin/InventoryAdjustSheet.tsx`, luật ở `lib/inventory-adjust.ts` và `lib/restock.ts` |

**`ARC_ADMIN_PATHS`:** thêm `/admin/products` là **đường dẫn**, không phải cây, như `/admin` ở lát 2. Form mẫu vẫn ở khung v3
tới lát 5b. Cập nhật test:
- đúng với `/admin/products`;
- sai với `/admin/products/new`, `/admin/products/p-khoi`.

## 2. Đã chốt
- QĐ-37, QĐ-38, QĐ-39 và mọi mẫu trình bày của lát 0 đến lát 4.
- Giữ nguyên chữ v3. Gồm dòng phụ "29 mẫu · 18 đang bán", dòng chân của tab một số, dòng đỏ báo size sắp hết của mẫu cố định
  ("M hết · L còn 2 · XL còn 2"), và các câu rỗng.
- **Tab:** Arc `Tabs` có số đếm như màn Đơn hàng. Tab "Cố định" đứng đầu và là tab mặc định. Có mẫu cố định sắp hết thì sau
  nhãn là chấm đỏ 6px `--danger`, `role="img"`, tên "N mẫu sắp hết", như v3.
- **Lọc:**
  - "Loại" dùng `FilterMenu` và chip như Nhật ký.
  - Hai nút bật tắt "Sắp hết N" và "Hết N" của v3 thành một `SegmentedControl` "Tất cả · Sắp hết N · Hết N". Arc dùng
    segmented control cho một lựa chọn giữa vài góc nhìn. Không mất gì so với v3:
    - ở tab một số, không mẫu nào vừa sắp hết vừa hết;
    - ở tab Cố định, kệ trống cũng tính là sắp hết, nên bật cả hai cũng chỉ ra đúng danh sách "Hết".
  - Địa chỉ giữ khoá `low=1` và `gone=1`, mỗi lúc chỉ một.
- **Hai tấm tồn kho dùng Arc `Drawer` bên phải, 680px như form mã giảm giá.** Cả hai là form dài: lưới màu × size, lý do, tham
  chiếu, ghi chú. Luật Arc cho form dài đặt cạnh trang là dùng `drawer`.
- **Ô số trong lưới:** bản free của Arc không có ô số có nút tăng giảm. Dựng trong dự án bằng token Arc, như
  `ArcPhotoPicker`. Tên đọc của từng nút và ô giữ như v3.

## 3. Việc cần làm

### 3.1 Bảng Mẫu

| Phần v3 | Arc | Ghi chú |
|---|---|---|
| `h1` "Mẫu", dòng phụ, "Dữ liệu mẫu", "Tải CSV", "Thêm mẫu" | đầu trang như các màn danh sách: dòng phụ `--text-secondary`; `Button` `secondary` `sm` `Download` "Tải CSV" (tệp `mau.csv`); `ArcButtonLink` **`primary`** `sm` `Plus` "Thêm mẫu" tới `/admin/products/new` | nút primary duy nhất của trang. Form còn ở khung v3 tới lát 5b |
| tab: Cố định, rồi các số (số đang bán trước, rồi số mới nhất xuống), số chỉ có mẫu hé lộ ghi "Số 06 · hé lộ" | Arc `Tabs` có số đếm | thứ tự, nhãn, số đếm và địa chỉ (`?fixed=1`, `?drop=N`) như v3 |
| thanh công cụ: "Tìm tên mẫu", "Loại", "Sắp hết N", "Hết N" | `ArcSearchBox` (nhãn "Tìm mẫu"), `FilterMenu` "Loại", `SegmentedControl` như §2 | tìm như v3: "s05", "khoi" và "S05 – KHÓI" đều ra KHÓI |
| bảng: Mẫu, Loại · form, Giá, Màu, Tồn kho, Size hết, Trạng thái, menu | Arc `SortableDataTable` với cấu hình như trên | **Mẫu:** ảnh 36×45 (`alt=""`) và tên đậm 500, một dòng. **Giá:** căn phải. **Màu:** như `colourList` của v3, một tên màu không bị ngắt. **Tồn kho**, mẫu của một số: thanh 4px phần còn trên kệ (accent; `--danger` khi còn ≤ `LOW_STOCK_AT`; hết thì cả thanh `--foreground`) cạnh "còn 17 / 35" hoặc "hết · 0 / 14", số căn như cột "Lượt" ở lát 3. **Tồn kho**, mẫu cố định: "còn 31", dưới là dòng `lowNote` màu `--danger`, cỡ `--text-xs`. **Size hết:** "tất cả", "S · M" hoặc "—"; mẫu cố định có size hết thì chữ `--danger`. **Trạng thái:** Arc `Badge` `sm`, chữ và tone như v3 qua `TONE` (Hết `neutral`, Sắp mở `info`, Đã đóng `neutral`, Sắp hết `danger`, Đang bán `success`) |
| menu dòng, mẫu của một số: Sửa mẫu, Điều chỉnh tồn kho, Xem ở cửa hàng | Arc `DropdownMenu` `iconOnly`, `label` "Thao tác S05 – KHÓI": Sửa mẫu (`Pencil`, tới `/admin/products/<id>`), Điều chỉnh tồn kho (`ArrowLeftRight`), Xem ở cửa hàng (`ExternalLink`, mở tab mới như v3) | |
| menu dòng, mẫu cố định: Nhập thêm, rồi ba mục trên | như trên, "Nhập thêm" (`PackagePlus`) đứng đầu như v3 | |
| tab một số chỉ có mẫu hé lộ | bảng năm cột như v3: Mẫu, Loại, Giá "công bố khi mở", Tồn kho "chưa cắt", Trạng thái `Badge` `info` "Hé lộ"; không menu | rỗng "Số này chưa có mẫu nào." |
| dòng chân của tab một số: "10 mẫu · 181 đã cắt · 73 còn · tồn kho là số còn trên kệ, đã bán là đã cắt trừ tồn kho" | chữ `--text-secondary` như dòng chân ở Khách hàng và Các số | |
| rỗng "Chưa có mẫu nào.", lọc không ra "Không có mẫu nào khớp." | như các màn trước | |

### 3.2 Tấm "Điều chỉnh tồn kho"
- Arc `Drawer` 680px. Tiêu đề "Điều chỉnh tồn kho · S05 – KHÓI".
- Câu phụ "Tăng quá 35 chiếc đã cắt thì bị chặn." chỉ khi mẫu có số đã cắt. Mẫu cố định không có câu phụ.
- **Lưới Màu × S, M, L, XL × Cộng:**
  - cột màu là chấm màu 12px tròn và tên màu;
  - mỗi ô là nút bớt (`Minus`), ô số, nút thêm (`Plus`), cao bằng control `sm` của Arc;
  - ô đã đổi thì viền `--foreground`, và dưới ô là dòng `deltaLabel` ("+1 · hàng trả về DH-2419"), `--text-xs`
    `--text-secondary`;
  - cột Cộng là tổng đậm 500, kèm "(+N)" khi đổi.
- **Vượt số đã cắt:** toast lỗi "Không vượt số đã cắt: 35", và ô bị kéo về mức trần, như v3.
- **Trường:** Arc `Select` "Lý do" (`ADJUST_REASONS`, placeholder "Chọn lý do"); Arc `Input` "Tham chiếu · đơn, biên bản"
  (placeholder "VD: DH-2419"); Arc `Input` "Ghi chú · không bắt buộc" (placeholder "VD: khách trả size L, còn nguyên tag").
  Nhãn là một chuỗi, như "Ghi chú nội bộ · không bắt buộc" ở hộp huỷ đơn.
- **Dòng tổng:** ví dụ "Trên kệ sau khi lưu: 16 / 35 đã cắt (-1) · 1 ô đổi." `--text-sm` `--text-secondary`, số tổng đậm 500.
- **Chân:**
  - "Huỷ" `secondary` `ArrowLeft`;
  - "Lưu điều chỉnh" **`primary`** `Check`;
  - còn thiếu thì nút vô hiệu, không icon, và mang câu của `saveBlocker`;
  - lúc lưu thì `loading` "Đang lưu…", và tấm không đóng được.
- Server từ chối (kệ đã đổi ở nơi khác): toast lỗi, tấm vẫn mở, như v3.

### 3.3 Tấm "Nhập thêm" (chỉ mẫu cố định)
- Arc `Drawer` 680px. Tiêu đề "Nhập thêm · ÁO THUN TRƠN". Không có câu phụ.
- **Lưới như §3.2:**
  - trên mỗi ô là "còn N", màu `--danger` khi `isThin`;
  - ô số đọc là "Nhập thêm Đen S, đang còn 3";
  - nút thêm bị vô hiệu ở `MAX_RESTOCK_PER_CELL`;
  - cột Cộng là "35 (+4)".
- **Trường:** "Ghi chú · không bắt buộc", placeholder "VD: về lại size M".
- **Chân:**
  - "Huỷ";
  - "Nhập thêm 14 chiếc" **`primary`** `PackagePlus`;
  - chưa nhập gì thì nút vô hiệu và ghi "Nhập số cần thêm";
  - lúc lưu thì `loading` "Đang lưu…".
- **Server báo kệ đã đổi** (`RESTOCK_STALE_MESSAGE`): toast lỗi, rồi `router.refresh()`. Tấm vẫn mở với số trên kệ mới, và số
  đã gõ vẫn còn, như v3.

### 3.4 Phần thuần sang `lib/`
Các hàng của `mau.csv` thành một hàm thuần có test, như `lib/issue-csv.ts` ở lát 4. Tên cột, thứ tự và các ô để trống của mẫu
cố định giữ như v3. `lib/inventory-adjust.ts` và `lib/restock.ts` đã là phần thuần, không đổi.

### 3.5 Sửa thêm: hộp "Đặt lại dữ liệu mẫu"
`ArcResetDialog` (lát 0) đóng bằng Esc hay "Huỷ" thì focus rơi về `<body>`, vì Radix chỉ trả focus về `DialogTrigger`. Sửa
để focus về nút "Đặt lại dữ liệu mẫu" ở thanh bên, như cách lát 4 làm với ba hộp của Các số.

### 3.6 Sửa thêm: "số hiện tại"
Người dùng duyệt ngày 01/10. `catalog.currentDropNo` là **số lớn nhất có mẫu**, không phải số đang bán.
- **Lỗi:** Số 05 đang bán, thêm một mẫu cho Số 06 (sắp mở, lựa chọn mặc định của form Thêm mẫu) thì:
  - Tổng quan đổi thành "Còn trong Số 06", "Bán chạy trong Số 06" với 0 chiếc đã bán;
  - nhãn "mới" ở panel khách của chi tiết đơn lệch theo.
- **Không đồng nhất:** danh sách khách và hồ sơ khách (lát 3) lại dùng số đang mở, hoặc `null`.

Sửa:
- Một hàm thuần có test, ví dụ `currentIssueNo(catalog, now)`. Luật người dùng đã duyệt:
  - số đang bán;
  - giữa hai số thì số vừa đóng gần nhất;
  - chưa số nào mở thì giữ cách cũ.
- Dùng hàm đó cho Tổng quan, panel khách ở chi tiết đơn, danh sách khách (kể cả nhãn tab "Mới trong số NN") và hồ sơ khách.
- Không đổi `catalog.currentDropNo`; mã v3 còn đọc nó tới lát 6.
- Test phải tái hiện được lỗi: thêm một mẫu cho số sắp mở thì "số hiện tại" vẫn là số đang bán.

### 3.7 Test
- Cập nhật `lib/admin-arc.test.ts` như §1.
- Test cho §3.4, §3.6, và test cho ô số nếu có phần thuần.
- `arc-overlays.test.ts` vẫn xanh: hai tấm mới có `keepOpenForToasts`.
- Test cũ vẫn xanh, `npm run typecheck` sạch.

## 4. Kiểm
Máy tính **1280**; ảnh toàn trang ở **1440** chụp bằng khung nhìn cao bằng trang. Chụp ảnh "trước" của `/admin/products/new`,
`/admin/products/p-khoi` và `/faq` trước khi sửa code.

**Bảng:**
- từng tab: Cố định (có chấm đỏ), Số 05, Số 06 · hé lộ, Số 04, Số 03;
- tìm "khoi" ra S05 – KHÓI; tìm "zzz" ra câu rỗng;
- lọc theo một loại; "Sắp hết"; "Hết";
- menu dòng của một mẫu thuộc số và của một mẫu cố định;
- "Xem ở cửa hàng" mở tab mới đúng `/products/<slug>`;
- "Thêm mẫu" sang form v3. Đổi khung ở bước này là đúng, cho tới lát 5b.

**Tấm:**
- "Điều chỉnh tồn kho": đổi một ô thì có dòng delta; nút gọi tên thứ còn thiếu; tăng quá số đã cắt thì toast và ô bị kéo về;
  dòng tổng; mẫu cố định không có câu phụ;
- "Nhập thêm": ô "còn N" màu đỏ khi mỏng; nút đếm số chiếc; trần 999.

**Ghi DB:** chụp ảnh "after" các trang v3 trước khi ghi DB. Rồi làm:
1. một lần điều chỉnh, ví dụ S05 – KHÓI, Đen M, bớt 1, lý do "Hư hỏng";
2. một lần nhập thêm, ví dụ ÁO THUN TRƠN, thêm 2;
3. thêm một mẫu cho Số 06 bằng form "Thêm mẫu" (còn v3). Sau đó Tổng quan vẫn ghi "Còn trong Số 05" và "Bán chạy trong Số
   05", và nhãn khách ở chi tiết đơn khớp với hồ sơ khách (§3.6).

Mỗi việc ra toast đúng câu v3, và bảng đổi tại chỗ.

**Chung:**
- vòng focus bàn phím, kể cả trong tấm; tấm bẫy focus, Esc đóng, focus về nút "Thao tác …" đã mở nó;
- hộp đặt lại dữ liệu mẫu trả focus như §3.5;
- font Mona Sans, kể cả lớp portal;
- 0 lỗi console, không tràn ngang ở 1280;
- các trang v3 còn lại không lệch pixel so với ảnh "trước";
- phần khách không đổi;
- chạy `tools/layout-sweep.js`. Hai lượt `/admin/products#restock` và `/admin/products?drop=5#adjust` có chỗ tìm lớp v3
  (`.field3`, `button.selbtn`). Chạy bản sao ở scratchpad với lượt tìm theo vai trò, và báo lại để phiên chính sửa bản gốc.

Xong thì đặt lại dữ liệu: `npx supabase db query "select public.reset_demo(public.demo_anchor());"`.

## 5. Ảnh cần nộp
`.playwright-cli/shots/v5/lat-5a/`:
- `products-<tab>-<w>.png`;
- `products-<lọc>-1280.png`;
- `products-menu-<loại mẫu>-1280.png`;
- `adjust-<trạng thái>-1280.png`;
- `restock-<trạng thái>-1280.png`;
- `focus-*-1280.png`;
- `before-*` và `after-*` cho các trang v3.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, thêm các mục "Vá Arc", "Xung đột luật" và "Chưa làm". Gửi trọn trong **tin cuối**.
Không commit, không đụng git ngoài `git status` và `git diff`. Để server 3200 chạy cho phiên chính duyệt.
