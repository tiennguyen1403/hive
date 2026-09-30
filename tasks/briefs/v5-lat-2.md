# Brief: v5 lát 2, Tổng quan và Nhật ký theo Arc

Đợt v5 đưa quản trị sang Arc. Lát 0 (`6733d29`) và lát 1 (`d3b453c`) đã ĐẠT và commit; toàn bộ khu Đơn hàng đã dùng Arc. Lát
này đưa hai màn sang Arc:
- Tổng quan `/admin`;
- Nhật ký thao tác `/admin/log`.

Các màn còn lại (Các số, Mẫu, Khách hàng, Mã giảm giá) vẫn giữ v3.

**Luật của lát 0 và lát 1 giữ nguyên.** Đọc `tasks/briefs/v5-lat-0.md`, `tasks/briefs/v5-lat-1.md` và `registry/PATCHES.md`.
Code đã commit ở `components/admin-arc/` là mẫu người dùng đã duyệt.
- Spec ghép từ ba nguồn: brief này, rồi màn v3 đang chạy (hành vi và chữ, giữ đúng từng chữ), rồi tài liệu Arc (hình dáng).
  Brief nào tóm chữ khác v3 thì v3 thắng.
- **Cài item Arc mới:** chạy `printf 'n\nn\nn\nn\n' | npx shadcn@latest add @uiarc/<id> … --yes`. CLI luôn hỏi có ghi đè
  `registry/foundation.css` không. **Phải trả lời không**, nếu không sẽ mất hết các chỗ vá. Cấm `shadcn init`. Sau khi cài,
  `git status` chỉ được thêm `registry/` và `package*.json`.
- **Chuỗi tiếng Anh:** dịch sang tiếng Việt, ghi chuỗi gốc vào `arc-english-strings.ts`, ghi mọi chỗ vá vào `PATCHES.md`.
- **Icon:** Lucide cỡ 16, `strokeWidth={1.75}`. Nút hành động có icon gọi tên việc làm; nút vô hiệu không có icon.
- **Token và chữ:** chỉ token Arc, đậm 400 và 500, không chữ in hoa, số dùng `tabular-nums`. Panel viền 1px, bo
  `--radius-surface`. Badge đổi tone theo `TONE`. Mỗi bề mặt một nút `primary`.
- **Dùng lại:** `ArcButtonLink`, `useArcToast`, `ArcPage.module.css` (đường dẫn và dải tiêu đề), các ô và `TONE` trong
  `ArcOrderCells`, cách dựng panel và bảng tự viết của `ArcOrderScreen`.
- **Server:** cần giải phóng cổng 3200 thì chạy `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`
  thành một lệnh riêng. Mã 1 nghĩa là có tiến trình khác giữ cổng: dừng lại và báo.

## 1. Màn và route

| Màn | Route | Nguồn hành vi và chữ |
|---|---|---|
| Tổng quan | `/admin`, kể cả `?days=7` và `?days=30` | `components/admin/DashboardScreen.tsx`, `RevenueChart.tsx`, `app/admin/page.tsx` |
| Nhật ký thao tác | `/admin/log`, kể cả `?kind=`, `?today=1`, `?week=1`, `?q=` | `components/admin/ActivityLogScreen.tsx`, `lib/activity-log.ts`, `app/admin/log/page.tsx` |

**`ARC_ADMIN_PATHS`:** thêm `/admin` (khớp đúng, không kéo cả cây) và `/admin/log`. Cập nhật test:
- đúng với `/admin`, `/admin/` và `/admin/log`;
- sai với `/admin/products`, `/admin/drops/05`, `/admin/customers`.

## 2. Đã chốt
- QĐ-37, QĐ-38, QĐ-39 và các mẫu trình bày của lát 0 và lát 1.
- Giữ nguyên chữ v3, kể cả câu trạng thái rỗng và các dòng phụ.
- Bộ lọc của danh sách dùng cùng kiểu với màn Đơn hàng: ô tìm, "Thêm bộ lọc" (`FilterMenu`), chip khi đang lọc. Người dùng đã
  duyệt kiểu này.

## 3. Việc cần làm

### 3.1 Cài thêm
`@uiarc/bar-chart`. Dịch mọi chuỗi cứng của nó sang tiếng Việt:
- "Avg" thành "TB";
- "Highest" thành "Cao nhất", "Lowest" thành "Thấp nhất";
- "No data" thành "Chưa có dữ liệu";
- ", explore by day" thành ", xem theo ngày";
- định dạng số mặc định dùng `vi-VN`.

Chỗ nào không đổi được qua prop thì vá và ghi `PATCHES.md`.

### 3.2 Tổng quan `/admin`

| Phần v3 | Arc | Ghi chú |
|---|---|---|
| `h1` "Tổng quan" và dòng phụ: Số, ngày mở → đóng, badge trạng thái, "đóng sau…" | `h1` và dòng phụ như `ArcPage.module.css`. Badge: "Đang bán" `success`, "Sắp mở" `info`, "Đã đóng" `neutral` | chữ v3 |
| badge "Dữ liệu mẫu" | Arc `Badge` `neutral` `sm` | |
| nhóm link 7 / 14 / 30 ngày (URL `days`) | Arc `SegmentedControl`, `label` "Kỳ xem", các lựa chọn "7 ngày", "14 ngày", "30 ngày". Chọn thì hiện ngay rồi `router.push` tới `/admin` (với 14) hoặc `/admin?days=N` | giữ QĐ-8; Back quay lại kỳ trước |
| "Tải CSV {n} ngày" | Arc `Button` `secondary` `sm`, icon `Download` | các cột CSV như v3 |
| 4 thẻ số (Doanh thu, Đơn, Cần xử lý, Còn trong Số) | Thẻ tự dựng `ArcKpi`: viền 1px `--border`, bo `--radius-panel`, đệm 20px. Nhãn `--text-sm` `--text-secondary`; số lớn `--font-display` `--text-2xl` đậm 500 `tabular-nums`; dòng ngữ cảnh `--text-sm` `--text-secondary`. Lưới 4 cột bằng nhau, cùng chiều cao | Thẻ "Cần xử lý" giữ link "xử lý ngay" tới `#queue`. Thẻ "Còn trong Số" giữ thanh 4px (nền `--surface-muted`, phần đã bán `--accent`) |
| panel "Doanh thu {n} ngày gần nhất": dòng tổng, khoảng ngày, ngày cao nhất; biểu đồ cột; "Xem dạng bảng" | Panel có `h2`. Ngay dưới là dòng tổng như v3: số tiền `vnd` đậm 500 `--text-xl`, rồi "dd/mm → dd/mm · ngày cao nhất … · …" `--text-secondary`. Sau đó là Arc `BarChart` | `data` lấy từ `window.points`: `key` là ngày, `label` là "dd/mm". `label` "Doanh thu"; `period` là khoảng ngày; `formatValue` dùng `compactVnd`; `averageLabel` "Trung bình mỗi ngày"; `valueLabel` "Doanh thu"; `categoryLabel` "Ngày". Ở 30 ngày, nhãn trục không được chồng lên nhau (v3 chỉ in 5 mốc, `axisIndexes`). Giữ `<details>` "Xem dạng bảng" của v3, bảng tự viết bằng token Arc |
| panel "Cần xử lý" với số đơn, id `queue` | Mỗi dòng: dòng 1 đậm 500 (link mã đơn · khách · tiền); dòng 2 `--text-secondary` (tình trạng · hạn, hạn trễ tô `--danger` · món); nút bên phải | Nút dòng đầu là `primary`, các dòng sau `secondary`. "Đã nhận tiền" dùng `Check`; lúc chờ `loading` "Đang lưu…"; xong thì "Đã lưu", vô hiệu, không icon. "Đóng gói và bàn giao" là `ArcButtonLink` icon `Package`, href như v3 (`?handover=1#handover`). Rỗng: câu v3 |
| panel "Đơn mới nhất", link "Xem tất cả" | `h2`, link chữ "Xem tất cả" bên phải. Bảng tự viết 5 cột như v3, trạng thái là Arc `Badge` `sm` theo `TONE` | không lồng `SortableDataTable` vào panel |
| panel "Bán chạy trong Số NN", dòng phụ "đã bán / đã cắt" | 5 dòng: hạng (`--text-secondary`, tabular), ảnh 36×45 bo 6px, tên đậm 500, thanh 4px, "đã bán / đã cắt · %" hoặc "hết". Cuối panel là link "Xem cả N mẫu của Số" như v3 | Màu thanh giữ nghĩa v3: thường `--accent`; từ 85% `--danger`; hết thì đầy thanh màu `--foreground` |
| panel "Sắp hết" với số mẫu | Mỗi dòng: ảnh, tên đậm 500 và ghi chú `--text-secondary`, Arc `Badge` `sm` ("Hết" `danger`, "Còn N" `warning`) | rỗng: câu v3 |
| panel "Khách trong {n} ngày", dòng phụ | Thanh 8px (phần khách mới `--accent` trên nền `--surface-muted`). Dưới thanh là hai nhãn v3, số đậm 500 | rỗng: câu v3 |
| toast | `useArcToast`, đúng câu v3 | |

Bố cục: dải 4 thẻ, rồi panel doanh thu hết bề rộng, rồi hai cột như v3.
- cột trái rộng: Cần xử lý, Đơn mới nhất;
- cột phải khoảng 380px: Bán chạy, Sắp hết, Khách;
- 24px giữa các vùng, 16px giữa các panel.

Vì sao không dùng Arc `MetricCard`: giá trị ở đây là chuỗi đã định dạng ("14,2trđ"), còn dòng ngữ cảnh có link và có thanh.
Tài liệu Arc bảo trường hợp này dùng `stat-card`, nhưng `stat-card` không có trong bản free (tra `uiarc.dev` ra 404). Ghi điều
này vào báo cáo.

### 3.3 Nhật ký thao tác `/admin/log`

| Phần v3 | Arc | Ghi chú |
|---|---|---|
| `h1` "Nhật ký thao tác", "Tải CSV" | `h1`; badge "Dữ liệu mẫu"; Arc `Button` `secondary` `sm` `Download` "Tải CSV" | các cột CSV như v3 |
| ô tìm (URL `q`, placeholder "Tìm mã đơn, mã giảm giá, mẫu", nhãn "Tìm trong nhật ký") | Arc `SearchField` với `hideLabel`, đặt đầu hàng công cụ như màn Đơn hàng | trễ 350ms, Enter gửi ngay |
| `ChipMenu` "Loại thao tác" có số đếm (URL `kind`) | `FilterMenu` "Thêm bộ lọc". Một trường "Loại thao tác", các giá trị là `LOG_FILTERS` trừ "Tất cả", số đếm đưa vào `hint`. Khi đang lọc thì hiện chip và "Xoá hết" (`FilterToolbar` không kèm `addFilter`) | cùng kiểu màn Đơn hàng |
| hai chip "Hôm nay", "7 ngày" có số đếm, chọn một trong hai (URL `today`, `week`) | Arc `SegmentedControl`, `label` "Khoảng thời gian". Ba lựa chọn: "Tất cả", "Hôm nay", "7 ngày". Hai lựa chọn sau có số đếm ở `accessory` (`tabular-nums`, `--text-secondary`). Đặt ở cuối hàng bên phải | "Tất cả" là trạng thái không bật chip nào của v3 |
| bảng 5 cột: Lúc, Thao tác, Đối tượng, Trước → sau, Ai | Arc `SortableDataTable` với `density="compact"`, `holdWidths={false}`, mọi cột `sortable: false`, không `selectable`, `showCount={false}`, `caption` "Nhật ký thao tác" | Ô giữ nội dung v3: "Lúc" và "Ai" một dòng; "Thao tác" có dòng đậm 500 và chi tiết `--text-secondary`; "Đối tượng" là link khi có `href`; "Trước → sau" có giá trị sau đậm 500 |
| rỗng | Arc `EmptyState`, icon `FileText`, tiêu đề và mô tả đúng chữ v3 | |

Không phân trang, như v3. Đo thời gian vẽ khi hiện đủ dòng (bấm "Tất cả" và bỏ lọc). Nếu một lần đổi lọc mất quá 200ms thì báo,
đừng tự thêm phân trang.

### 3.4 Test
- Cập nhật `lib/admin-arc.test.ts` như §1.
- Thêm chuỗi gốc của `bar-chart` vào `arc-english-strings.ts`.
- Test cũ vẫn xanh, `npm run typecheck` sạch.

## 4. Kiểm
Máy tính **1280**; ảnh toàn trang ở **1440** chụp bằng khung nhìn cao bằng trang, không dùng `fullPage`. Đăng nhập bằng
"Vào quản trị thử". **Chụp ảnh "trước" của các trang v3** (`/admin/customers`, `/admin/products`, `/admin/drops`,
`/admin/promotions`) trước khi sửa code.

**Tổng quan:**
- kỳ 7, 14 và 30 ngày: URL đổi, Back quay lại kỳ trước, biểu đồ đổi theo;
- rê chuột qua một cột: dòng đầu biểu đồ đổi theo cột đó;
- mở "Xem dạng bảng";
- Tải CSV;
- ở hàng đợi: "Đã nhận tiền" có ghi DB, ra toast, và dòng đó rời hàng đợi sau khi trang vẽ lại; "Đóng gói và bàn giao" mở chi
  tiết đơn với form bàn giao mở sẵn;
- link "xử lý ngay", link "Xem tất cả", link "Xem cả N mẫu".

**Nhật ký:**
- mặc định;
- menu "Thêm bộ lọc" ở bước chọn trường và bước chọn giá trị; lọc "Đơn hàng" ra chip;
- "Hôm nay", "7 ngày";
- tìm một mã đơn; tìm "zzz" ra trạng thái rỗng;
- Tải CSV.

**Chung:**
- vòng focus bàn phím, kể cả trên `SegmentedControl` và biểu đồ;
- font Mona Sans ở mọi chỗ, kể cả lớp portal;
- 0 lỗi console, không tràn ngang ở 1280;
- các trang v3 còn lại không lệch pixel so với ảnh "trước";
- phần khách không đổi;
- chạy `tools/layout-sweep.js`. Thêm vào đó các lượt cho `/admin?days=30` và `/admin/log?kind=order` nếu còn thiếu.

Xong thì đặt lại dữ liệu: `npx supabase db query "select public.reset_demo(public.demo_anchor());"`.

## 5. Ảnh cần nộp
`.playwright-cli/shots/v5/lat-2/`:
- `overview-<trạng thái>-<w>.png`;
- `log-<trạng thái>-<w>.png`;
- `focus-*-1280.png`;
- `before-*` và `after-*` cho các trang v3.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, thêm các mục "Vá Arc", "Xung đột luật" và "Chưa làm". Gửi trọn trong **tin cuối**.
Không commit, không đụng git ngoài `git status` và `git diff`. Để server 3200 chạy cho phiên chính duyệt.
