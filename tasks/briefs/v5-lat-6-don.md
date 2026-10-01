# Brief: v5 lát 6, dọn mã quản trị v3

Đợt v5 đã đưa mọi màn quản trị sang Arc. Các commit: lát 0 `6733d29` đến lát 5b `17060a1`, cùng B14 `ce56bb7` và B14b
`8c300a1`. Từ lát 5b, mọi route trong `app/admin/` dùng khung Arc. Mã quản trị v3 còn nằm trong repo, phần lớn không route nào
dùng. Lát này dọn nó đi, gộp các bản chép trong vùng Arc, và **không đổi một pixel nào** ở phần khách lẫn vùng Arc.

DESIGN.md không thuộc lát này. Sau khi lát này commit, documenter sẽ viết lại DESIGN.md.

**Luật chung:**
- Đọc `tasks/briefs/v5-lat-0.md` đến `v5-lat-5b.md`, `registry/PATCHES.md`, và cuối `tasks/plan.md` (mục "Việc của lát 6").
- Đợt v4 đã dọn mã v3 của phần khách một lần, ở lát 5 (`tasks/briefs/v4-lat-5-don.md`). Đọc brief đó để làm theo cùng cách.
- **Server:** giải phóng cổng 3200 bằng `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`, chạy thành
  một lệnh riêng. Mã 1 thì dừng lại và báo.
- Xoá tệp được phép trong `app/`, `components/`, `lib/` và test bên cạnh. Mọi tệp đã xoá vẫn còn trong lịch sử git. Không đụng
  `prototype/`, `DESIGN.md`, `tasks/`, `tools/`, `supabase/`, `registry/components/`.
- Không chắc một thứ còn ai dùng thì giữ lại và ghi vào báo cáo. Xoá nhầm tệ hơn để sót.

## 1. Ảnh "trước", chụp trước mọi thay đổi
- Mọi route của phần khách ở 390 và 1280, và mọi route quản trị ở 1280. Lấy danh sách route từ `tools/layout-sweep.js`.
- Các lớp nổi chính của mỗi vùng: menu, hộp, tấm trượt, toast. Lấy từ các lượt của sweep.
- Dùng khung nhìn cao bằng trang, không dùng `fullPage`. Đồng hồ và giờ "đặt lại lần cuối" đổi thì ghi chú, không tính là lệch.
- Đo thêm, để so sau khi dọn:
  - JS và CSS nén của `/`, `/products`, `/admin`, `/admin/orders`;
  - các tệp font được preload ở `/`.

## 2. Việc

### 2.1 Chuyển trước khi xoá
Vùng Arc còn mượn vài mảnh của v3. Chuyển chúng sang chỗ của Arc hay `lib/`, giữ nguyên hành vi:
- `useAdminCols` và `ADMIN_COLS_KEY` (`components/admin/useAdminCols.ts`), mà `ArcOrdersScreen` và
  `lib/device-storage.test.ts` đang dùng. **Giữ nguyên khoá `localStorage`**, để các cột người dùng đã chọn không mất.
- Kiểu `BadgeTone` của `components/ui/Badge`. Hiện `lib/order-labels.ts`, `ArcOrderCells` (`TONE`) và `ArcProductsScreen`
  dùng nó. Đặt kiểu tone của nhãn trạng thái ở `lib/`, và `TONE` vẫn đổi nó sang tone Arc.
- Kiểu `SelectOption` mà `lib/admin-options.ts` lấy từ `components/ui/Select`.
- `components/checkout/wards.ts` đang được `ArcAddressForm` dùng: giữ. `WardSelect.tsx` chỉ v3 dùng.

### 2.2 Xoá
Tự lập danh sách cuối bằng cách dò import, và nộp danh sách đó trong báo cáo. Dự kiến gồm:
- toàn bộ `components/admin/`;
- **nhánh v3 của `AdminShell`.** Mọi route quản trị đều là Arc, nên bỏ luôn công tắc `ARC_ADMIN_PATHS` / `isArcAdminPath`, và
  `lib/admin-arc.ts` cùng test nếu không còn ai dùng. Layout quản trị dựng `ArcAdminFrame` thẳng. Trước khi xoá, dò `lib/wait.ts`
  và các chỗ khác có đọc đường dẫn quản trị không;
- `AdminToastProvider` trong `app/admin/layout.tsx`, nếu không còn ai dùng `useAdminToast`;
- các tệp trong `components/ui/` chỉ v3 dùng;
- `components/checkout/WardSelect.tsx`;
- `components/shop/Empty.tsx`, `components/shop/Toast.tsx` (chỉ v3 quản trị dùng);
- `components/icon/` cùng test của nó, nếu không còn ai dùng;
- **CSS:** `app/styles/admin.css`, và mọi tệp hay khối trong `app/styles/` chỉ phục vụ scope `.s` của v3. Không còn component
  nào dựng `.s` hay `.s.adm3`.
  - Giữ đúng thứ tự `@import` của `globals.css` cho phần còn lại.
  - Phần nào chung, ví dụ `.sr-only` mà `styles/feed/scope.test.ts` nói tới, thì giữ.
  - Mỗi lần bỏ CSS phải được ảnh so pixel chứng minh;
- **font v3** (Be Vietnam Pro, Unbounded trong `app/layout.tsx`). `--font-sans` và `--font-display` ở `@theme` của
  `globals.css` đang trỏ tới hai font này, nên chữ nào nằm ngoài vùng Feed và vùng Arc đang rơi về font v3. Đổi hai biến đó
  sang `var(--font-mona)`, rồi bỏ hai font. Chỗ nào lệch pixel vì việc này là chỗ đang lỡ hiện font v3: chụp lại và báo, không
  tự sửa thêm;
- **máy dò:** agent không được sửa `.impeccable/`. Liệt kê trong báo cáo các mục của `.impeccable/config.json` chỉ phục vụ tệp v3
  đã xoá, để phiên chính bỏ. Không đề xuất mục mới;
- **test:** test chỉ thử mã v3 đã xoá thì xoá theo. Test của `lib/` mà Arc hay phần khách còn dùng thì giữ.

Không xoá `catalog.currentDropNo`: `currentIssueNo` và test còn dùng nó.

### 2.3 Gộp các bản chép trong vùng Arc
Kết quả phải **giống từng pixel**.
- **Thanh 4px**, đang có ở `ArcKpi`, Tổng quan, Mã giảm giá, Các số và bảng Mẫu: một component dùng chung với các trạng thái
  đang có.
- **`ISSUE_STATE`** ở Tổng quan và Các số: một chỗ.
- **`patched()`**, hàm sửa một phần địa chỉ chép ở nhiều màn: một chỗ trong `lib/`, có test.
- **`ArcPromoDrawer`** dùng `useCapitals` thay bản viết hoa riêng.
- **Chú giải còn ghi "v3 giữ bản riêng tới lát dọn"** (`lib/promo-form.ts`, `lib/drop-form.ts`, `lib/teaser-form.ts`, …):
  sửa lại cho đúng sau khi v3 đã đi.

## 3. Kiểm
- `npm run typecheck`, `npm test`, `npm run build` sạch. Số test giảm đúng bằng số test của mã đã xoá, ghi rõ trong báo cáo.
- Không còn import nào trỏ tới tệp đã xoá. Không còn `.s.adm3`, `--font-be-vietnam`, `--font-unbounded` trong mã.
- **Ảnh "sau"** đủ bộ như §1. So pixel với ảnh "trước": phần khách 0 px, vùng Arc 0 px. Chỗ nào lệch thì giải thích từng chỗ.
- **Số đo "sau"** như §1: báo JS, CSS và font đã giảm bao nhiêu.
- Hành vi: đi lại một vòng quản trị bằng bàn phím và chuột: mỗi màn một thao tác chính, menu, hộp, toast, vòng focus. Chọn
  cột ở Đơn hàng phải còn đúng các cột đã chọn trước khi dọn.
- `impeccable detect` cho cả repo: báo số phát hiện trước và sau.
- Chạy bản sao `tools/layout-sweep.js` ở scratchpad. Báo lại các lượt còn tìm lớp v3 đã xoá, để phiên chính sửa bản gốc.
- Không ghi DB, trừ khi một kiểm hành vi cần. Nếu có ghi thì đặt lại:
  `npx supabase db query "select public.reset_demo(public.demo_anchor());"`.

## 4. Ảnh cần nộp
`.playwright-cli/shots/v5/lat-6/`: `before-*`, `after-*`, và ảnh riêng cho từng chỗ lệch nếu có.

## 5. Báo cáo
Theo hợp đồng trong định nghĩa agent. Thêm các mục:
- danh sách tệp đã xoá và đã chuyển;
- những gì cố ý giữ lại, kèm lý do;
- số đo trước và sau;
- "Chưa làm".

Gửi trọn trong **tin cuối**. Không commit, không đụng git ngoài `git status` và `git diff`. Để server 3200 chạy cho phiên chính
duyệt.
