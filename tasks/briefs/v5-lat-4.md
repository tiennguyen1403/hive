# Brief: v5 lát 4, Các số theo Arc

Đợt v5 đưa quản trị sang Arc. Lát 0 (`6733d29`), lát 1 (`d3b453c`), lát 2 (`4e7c926`) và lát 3 (`f6cb354`) đã ĐẠT và
commit: Đơn hàng, Tổng quan, Nhật ký, Khách hàng và Mã giảm giá đã dùng Arc. Lát này đưa sang Arc:
- Các số `/admin/drops` và `/admin/drops/[no]`: bảng các số, chi tiết một số nằm dưới bảng;
- ba hộp của màn: tạo số / sửa giờ, đóng sớm, thêm mẫu hé lộ.

Sau lát này chỉ còn Mẫu giữ v3.

**Luật của các lát trước giữ nguyên.** Đọc `tasks/briefs/v5-lat-0.md` đến `v5-lat-3.md` và `registry/PATCHES.md`. Code đã
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
- **Dùng lại:**
  - `ArcButtonLink`, `useArcToast`, `ArcPage.module.css`;
  - `ArcKpi`, kể cả prop `meter`;
  - `TONE` và kiểu link mã của `CodeCell` trong `ArcOrderCells`;
  - `ArcDialog.module.css` (`.fields`, `.field`, `.error`, `.actions`) và cách `ArcCancelOrderDialog` giữ hộp lúc đang lưu;
  - thanh 4px ba trạng thái của "Bán chạy" ở `ArcOverviewScreen.module.css` (`.bar[data-state]`);
  - ảnh 36×45 bo 6px của dòng hàng ở `ArcOrderScreen`;
  - cấu hình bảng của lát 3: `density="compact"`, `holdWidths={false}`, mọi cột `sortable: false`, `showCount={false}`,
    trigger menu dòng chỉ có icon.
- **Server:** giải phóng cổng 3200 bằng `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`, chạy thành
  một lệnh riêng. Mã 1 thì dừng lại và báo.

## 1. Màn và route

| Màn | Route | Nguồn hành vi và chữ |
|---|---|---|
| Các số | `/admin/drops` | `components/admin/AdminDropsScreen.tsx`, `app/admin/drops/page.tsx` |
| Chi tiết số | `/admin/drops/[no]` (`05`, và `5` cũng được) | như trên, và `app/admin/drops/[no]/page.tsx` |
| Hộp tạo số, sửa giờ | mở từ màn | `components/admin/DropFormModal.tsx` |
| Hộp đóng sớm | mở từ màn | `AdminSheet` "Đóng số NN sớm?" trong `AdminDropsScreen.tsx` |
| Hộp thêm mẫu hé lộ | mở từ chi tiết số | `components/admin/TeaserFormSheet.tsx` |

Như v3, hai route là một màn: `/admin/drops` mở số đang bán (không có thì số mới nhất), `/admin/drops/NN` mở số NN.

**`ARC_ADMIN_PATHS`:** thêm `/admin/drops`, thêm cây `/admin/drops/`. Cập nhật test:
- đúng với `/admin/drops`, `/admin/drops/05`, `/admin/drops/5`;
- sai với `/admin/products`, `/admin/products/p-khoi`, `/admin/products/new`.

## 2. Đã chốt
- QĐ-37, QĐ-38, QĐ-39 và mọi mẫu trình bày của lát 0 đến lát 3.
- Giữ nguyên chữ v3, kể cả dòng trạng thái của số, dòng ngữ cảnh của năm thẻ số, dòng chân bảng mẫu và các câu rỗng.
- **Ba hộp dùng Arc `Dialog`, giữa màn hình.** Ở máy tính, `AdminSheet` của v3 là hộp giữa màn hình rộng 520px
  (`app/styles/sheet.css`, từ 900px trở lên). Luật chọn của Arc (`arcdocs/skill-components.md`, bản sao ở scratchpad mà brief
  lát 0 chỉ tới): form ngắn hoặc quyết định cần dừng lại
  thì dùng `dialog`; form dài đặt cạnh trang thì dùng `drawer`, như form mã giảm giá ở lát 3. Ba hộp ở đây đều ngắn.
- Chi tiết số nằm dưới bảng như v3, không tách trang.
- Ô ngày của hộp tạo số giữ dạng chữ `dd/mm/yyyy` như v3. Giờ không nhập: lấy từ các số đã có (`dropHour`). Không dùng
  DatePicker.

## 3. Việc cần làm

### 3.1 Cài và vá
- Không cần item Arc mới: `dialog`, `input`, `select`, `badge`, `dropdown-menu`, `sortable-data-table`, `button` đã có. Nếu thật
  sự cần item khác thì cài theo luật trên.
- **Vá `select`:** thêm trường tuỳ chọn `note` cho option. Chữ phụ nằm bên phải dòng trong danh sách, `--text-secondary`,
  trước dấu chọn, và nằm ngoài `ItemText` để ô chọn chỉ hiện nhãn. Không có `note` thì dòng giữ nguyên như Arc gốc. Lý do:
  `Select` của v3 in họ của từng loại ("Áo khoác") bên phải loại ("Áo khoác dù"). Ghi vào `PATCHES.md` và thêm test.

### 3.2 Bảng các số

| Phần v3 | Arc | Ghi chú |
|---|---|---|
| `h1` "Các số", badge "Dữ liệu mẫu", "Tạo số" | như các màn danh sách đã làm; `Button` **`primary`** `sm` `Plus` "Tạo số" mở hộp tạo số | nút primary duy nhất của trang |
| bảng: Số, Trạng thái, Mở, Đóng, Mẫu, Đã cắt, Đã bán, Doanh thu, menu | Arc `SortableDataTable` với cấu hình như trên | **Số:** link `issueNo` kiểu ô mã đơn (`CodeCell`), href `/admin/drops/NN#detail`, `scroll={false}` như v3. **Trạng thái:** Arc `Badge` `sm`: Đang bán `success`, Sắp mở `info`, Đã đóng `neutral`. **Mở, Đóng:** "20:00 · 12/10", một dòng. **Mẫu, Đã cắt, Đã bán, Doanh thu:** căn phải, chữ và dấu "—" như v3 ("2 hé lộ", "108 · 60%") |
| hàng đang mở bên dưới (`on`, nền mật ong) | tô bằng `rowAttributes` (`data-open`), cùng màu hàng được chọn của bảng Arc (`color-mix(in oklch, var(--accent) 8%, …)`, xem `tr[data-selected]` trong `sortable-data-table.module.css`) | link số của hàng đó mang `aria-current="true"` |
| menu dòng: Mở chi tiết, Tải CSV, Đóng sớm (khi đang bán), Sửa giờ | Arc `DropdownMenu` `iconOnly`, `label` "Thao tác Số NN": Mở chi tiết (`Eye`), Tải CSV (`Download`), Sửa giờ (`Calendar`), rồi Đóng sớm (`Clock`, `destructive`, `separatorBefore`, chỉ khi đang bán) | mục nguy hiểm xuống cuối như "Kết thúc sớm" ở lát 3. "Mở chi tiết" đi tới href như link số, không cuộn |

### 3.3 Chi tiết số (dưới bảng)

| Phần v3 | Arc | Ghi chú |
|---|---|---|
| `section#detail`: `h2` "Số 05", dòng trạng thái, "Tải CSV số này", "Đóng sớm" (đang bán), link "Xem sổ số 04" (đã đóng) | `h2` font display `--text-xl` đậm 500; dòng trạng thái `--text-secondary` cùng hàng với `h2`; bên phải: `Button` `secondary` `sm` `Download` "Tải CSV số này", `Button` `secondary` `sm` `Clock` "Đóng sớm", `ArcButtonLink` `secondary` `sm` `BookOpen` "Xem sổ số 04" với href như v3 (`/so/4`) | giữ `id="detail"`; section có `aria-labelledby` trỏ vào `h2`. Dòng trạng thái đúng ba dạng của v3: "đang bán · 4 ngày 19 giờ", "mở sau …", "đã đóng dd/mm/yyyy" |
| 5 thẻ số: Doanh thu, Đơn trong dữ liệu mẫu, Đã bán (có thanh), Hết hàng, Còn dưới 4 chiếc | `ArcKpi` ×5, một hàng ở 1280; "Đã bán" dùng `meter` | nhãn, số và dòng ngữ cảnh đúng v3. Danh sách mẫu trong thẻ giữ `styleInList` để một tên không bị ngắt giữa chừng |
| bảng mẫu: Mẫu, Loại, Giá, Đã cắt, Đã bán / còn, Size hết, Doanh thu | Arc `SortableDataTable` cùng cấu hình, không có menu dòng | **Mẫu:** đậm 500, một dòng. **Giá, Đã cắt, Doanh thu:** căn phải. **Đã bán / còn:** thanh 4px ba trạng thái như "Bán chạy" ở Tổng quan (accent; `--danger` từ 85% đã bán; cả thanh `--foreground` khi hết), cạnh "18 · còn 17" hoặc "14 · hết". Phần số là hộp cùng bề rộng, căn phải, để các thanh thẳng cột như cột "Lượt" ở lát 3. **Size hết:** "tất cả", "S · M" hoặc "—" |
| dòng chân "10 mẫu · 181 đã cắt · 108 đã bán · doanh thu theo giá niêm yết, chưa trừ mã giảm giá" | chữ `--text-secondary` như dòng chân bảng ở màn Khách hàng | |
| số chưa có mẫu: chỉ câu "Số này chưa có mẫu nào." (không thẻ số, không bảng, không panel hé lộ) | một panel chứa câu đó, `--text-secondary`, như "Chưa đặt đơn nào." ở hồ sơ khách | |
| panel "Số 06 · mẫu hé lộ": ảnh, tên, "Áo khoác dù · giá công bố khi mở"; "Thêm mẫu hé lộ" khi số sau đã có | panel viền 1px, tiêu đề như tiêu đề panel ở chi tiết đơn; `Button` `secondary` `sm` `Plus` "Thêm mẫu hé lộ" ở đầu panel, bên phải; mỗi mẫu: ảnh 36×45 bo 6px (`alt=""`), tên đậm 500, dòng phụ `--text-secondary` | rỗng "Chưa hé lộ mẫu nào cho số 06." Số sau chưa có thì không vẽ nút, như v3 |

### 3.4 Hộp tạo số, sửa giờ
- Arc `Dialog`. Tiêu đề "Tạo số 07" hoặc "Sửa giờ số 05". Không có câu phụ, như v3.
- Hai Arc `Input` cạnh nhau: "Mở lúc 20:00 ngày" và "Đóng lúc 20:00 ngày".
  - Placeholder "dd/mm/yyyy", `inputMode="numeric"`. Chữ gõ vào tự định dạng bằng `dayInput`, như v3.
  - Đổi ngày mở mà ngày đóng trống hoặc không sau nó thì ngày đóng tự dời thành ngày mở cộng độ dài số trước
    (`dropLengthDays`), như v3.
- Dòng "Xem trước: Số 07 mở 20:00 ngày 12/10/2026, đóng 20:00 ngày 26/10/2026 · 14 ngày." `--text-sm` `--text-secondary`,
  chữ và dấu "—" như v3.
- Chân hộp: "Huỷ" `secondary` `ArrowLeft`; "Tạo số" **`primary`** `Plus`, hoặc "Lưu giờ" **`primary`** `Check` (như "Lưu" của
  form mã ở lát 3). Còn thiếu một ô thì nút vô hiệu, ghi "Nhập hai ngày" như v3. Lúc lưu: `loading` "Đang lưu…", và hộp không
  đóng được.
- **Sửa một chỗ v3 nói sai:** đủ hai ngày nhưng ngày đóng không sau ngày mở thì v3 vẫn ghi "Nhập hai ngày". Bản Arc hiện câu v3
  "Ngày đóng phải sau ngày mở." dưới ô "Đóng" (prop `error` của `Input`). Nút vẫn vô hiệu, giữ tên "Tạo số" hoặc "Lưu giờ",
  không icon. Ghi vào mục "Xung đột luật" của báo cáo.
- Server từ chối (trùng lịch số khác, …): toast lỗi với câu server trả về, hộp vẫn mở, như v3.

### 3.5 Hộp đóng sớm
- Arc `Dialog`. Tiêu đề "Đóng số 05 sớm?". Câu phụ đúng chữ v3: "Giờ đóng đổi từ 20:00 05/10/2026 thành bây giờ. 73 chiếc còn
  lại rời kệ; đơn đã đặt không bị ảnh hưởng."
- "Giữ lịch" `secondary` `ArrowLeft`; "Đóng bây giờ" `danger` `Clock`, như "Huỷ đơn" ở lát 0. Lúc lưu: `loading`
  "Đang lưu…", và hộp không đóng được.
- Mở được từ menu dòng và từ nút ở chi tiết số. Đóng hộp thì focus về đúng chỗ đã mở nó.

### 3.6 Hộp thêm mẫu hé lộ
- Arc `Dialog`. Tiêu đề "Thêm mẫu hé lộ cho số 06".
- **Tên mẫu:** Arc `Input`, placeholder "VIẾT HOA, một từ", chữ hiện in hoa như v3.
- **Loại:** Arc `Select` với `note` (§3.1), placeholder "Chọn loại", danh sách lấy như `kindOptions` của v3.
- **Ảnh:**
  - dựng thành component riêng `ArcPhotoPicker`, vì lát 5 dùng lại cho form mẫu;
  - nhãn "Ảnh" hiện như nhãn của Arc `Input`;
  - ảnh 44×55 như v3, lấy đúng bộ ảnh `photoKeys` của v3;
  - ảnh đang chọn có viền 2px `--foreground`;
  - theo mẫu Radio Group của WAI-ARIA: nhóm `role="radiogroup"` có tên "Ảnh", mỗi ảnh `role="radio"` với `aria-checked`,
    `aria-label` như v3. Nhóm chỉ là một điểm dừng Tab. Phím mũi tên đi và chọn ảnh kế, và vòng focus `--focus-ring` hiện ở
    ảnh đang đứng. Đây là việc thêm so với v3, vì v3 bắt Tab qua từng ảnh.
- **Chân hộp:** "Huỷ" `secondary` `ArrowLeft`; "Thêm" **`primary`** `Plus`. Còn thiếu thì nút vô hiệu, không icon, và gọi tên
  thứ còn thiếu như v3: "Nhập tên mẫu", "Chọn loại", "Chọn ảnh". Lúc lưu: `loading` "Đang lưu…".

### 3.7 Phần thuần sang `lib/`
Làm như `lib/promo-form.ts` ở lát 3: chép đúng từng chữ, có test. File v3 giữ bản của nó tới lát dọn.
- `lib/drop-form.ts`: `dropHour`, `dropLengthDays`, `atDropHour`, và hai hàm dời ngày, ghép khoảng của `DropFormModal.tsx`.
- `lib/teaser-form.ts`: kiểu `TeaserDraft`, `kindOptions` (trả thêm `note`), `photoKeys`.
- Hàng của `downloadIssueCsv` thành hàm thuần (ví dụ `issueCsvRows`), có test: dòng tiêu đề đúng v3, mỗi dòng là một mẫu ×
  màu × size. Tên tệp `so-05.csv` như v3.

### 3.8 Test
- Cập nhật `lib/admin-arc.test.ts` như §1.
- Test cho §3.1 và §3.7.
- Test cũ vẫn xanh, `npm run typecheck` sạch.

## 4. Kiểm
Máy tính **1280**; ảnh toàn trang ở **1440** chụp bằng khung nhìn cao bằng trang. Chụp ảnh "trước" của `/admin/products`,
`/admin/products/p-khoi`, `/admin/products/new` và `/faq` trước khi sửa code.

**Bảng và chi tiết:**
- `/admin/drops` mở Số 05 đang bán;
- `/admin/drops/04`: số đã đóng có "Xem sổ số 04", không có "Đóng sớm";
- `/admin/drops/06`: số sắp mở chưa có mẫu, chỉ hiện câu rỗng;
- `/admin/drops/5` mở Số 05; `/admin/drops/99` chỉ còn bảng, như v3;
- `/admin/drops/abc` ra trang 404 giống `/admin/orders/DH-0000`;
- bấm "04" trên bảng: chi tiết đổi sang Số 04, trang không nhảy lên đầu, hàng 04 được tô;
- menu dòng của số đang bán và của số đã đóng;
- "Tải CSV": tên tệp và dòng đầu như v3;
- mục "Các số" ở thanh bên sáng trên cả hai route; từ Tổng quan đi sang Các số vẫn ở khung Arc.

**Hộp:**
- "Tạo số": ngày đề xuất như v3; đổi ngày mở thì ngày đóng tự dời; "Nhập hai ngày" khi thiếu; lỗi ngày đóng trước ngày mở;
  dòng xem trước;
- "Sửa giờ" từ menu dòng;
- "Đóng sớm" từ menu dòng và từ nút ở chi tiết;
- "Thêm mẫu hé lộ": danh sách loại mở ra có chữ phụ; chọn ảnh bằng chuột và bằng phím mũi tên; nút gọi tên thứ còn thiếu.

**Ghi DB:** chụp ảnh "sau" các trang v3 trước khi ghi DB. Rồi làm lần lượt:
1. tạo Số 07;
2. sửa giờ Số 07;
3. thêm một mẫu hé lộ cho Số 06 từ chi tiết Số 05;
4. đóng sớm Số 05.

Mỗi việc ra toast đúng câu v3, và bảng cùng chi tiết đổi tại chỗ.

**Chung:**
- vòng focus bàn phím trong cả ba hộp; hộp bẫy focus, Esc đóng, focus về nút hoặc menu đã mở hộp;
- font Mona Sans, kể cả lớp portal;
- 0 lỗi console, không tràn ngang ở 1280;
- các trang v3 còn lại không lệch pixel so với ảnh "trước";
- phần khách không đổi;
- chạy `tools/layout-sweep.js`. Các lượt `/admin/drops#create` và `/admin/drops/05#teaser` đang tìm lớp v3 (`.top`, `.field3`,
  `button.selbtn`), nên sẽ hỏng. Chạy bản sao ở scratchpad với lượt tìm theo vai trò, và báo lại để phiên chính sửa bản gốc.

Xong thì đặt lại dữ liệu: `npx supabase db query "select public.reset_demo(public.demo_anchor());"`.

## 5. Ảnh cần nộp
`.playwright-cli/shots/v5/lat-4/`:
- `drops-<số>-<w>.png`;
- `drops-menu-<trạng thái>-1280.png`;
- `drop-form-<trạng thái>-1280.png`;
- `drop-close-1280.png`;
- `teaser-form-<trạng thái>-1280.png`;
- `focus-*-1280.png`;
- `before-*` và `after-*` cho các trang v3.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, thêm các mục "Vá Arc", "Xung đột luật" và "Chưa làm". Gửi trọn trong **tin cuối**.
Không commit, không đụng git ngoài `git status` và `git diff`. Để server 3200 chạy cho phiên chính duyệt.
