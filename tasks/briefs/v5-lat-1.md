# Brief: v5 lát 1, Chi tiết đơn và Phiếu giao theo Arc

Đợt v5 đưa quản trị sang Arc. Lát 0 (nền tích hợp, khung, `/admin/orders`) đã ĐẠT và commit `6733d29`. Ngày 30/09 người dùng
duyệt hướng: "Hướng này ổn. tiếp tục triển khai". Lát này đưa trọn khu Đơn hàng sang Arc:
- chi tiết đơn `/admin/orders/[code]`;
- phiếu giao `/admin/slips`.

Các màn quản trị khác vẫn giữ v3.

**Luật của lát 0 giữ nguyên.** Đọc lại `tasks/briefs/v5-lat-0.md` (phần mở đầu, §2, §3.1, §3.4) và `registry/PATCHES.md`:
- Spec ghép từ ba nguồn: brief này, rồi màn v3 đang chạy (hành vi và chữ, giữ đúng từng chữ), rồi tài liệu Arc (hình dáng).
  Ba nguồn không nói tới điều gì thì dừng lại hỏi.
- **Cài item Arc mới:** dùng `components.json` đang có, chạy `npx shadcn@latest add @uiarc/<id> … --yes`. Cấm `shadcn init`.
  Sau khi cài, `git status` chỉ được có thêm `registry/` và `package*.json`.
- **Chuỗi tiếng Anh:** dịch sang tiếng Việt. Ghi chuỗi gốc vào `components/admin-arc/arc-english-strings.ts`. Ghi mọi chỗ vá
  vào `registry/PATCHES.md`. Chỉ vá ruột Arc khi prop có sẵn không làm được, và nêu trong báo cáo mục "Vá Arc".
- **Icon:** Lucide cỡ 16, `strokeWidth={1.75}`, `aria-hidden`. Nút hành động có icon gọi tên việc làm; nút vô hiệu không có
  icon.
- **Token và chữ:**
  - chỉ dùng token ngữ nghĩa của Arc, không hex;
  - độ đậm 400 và 500, không chữ in hoa;
  - số dùng `tabular-nums`.
- **Dùng lại của lát 0:** `ArcButtonLink`, `useArcToast`, `ArcCancelOrderDialog`, bảng đổi tone của badge trạng thái
  (`ArcOrderCells`), và khung `ArcAdminFrame`.

## 1. Màn và route

| Màn | Route | Nguồn hành vi và chữ |
|---|---|---|
| Chi tiết đơn | `/admin/orders/[code]`, kể cả `?handover=1` | `components/admin/AdminOrderScreen.tsx`, `HandoverForm.tsx`, `AddressEditForm.tsx`; hộp huỷ đã có `ArcCancelOrderDialog` |
| Phiếu giao | `/admin/slips?codes=…` | `components/admin/SlipScreen.tsx`, `app/admin/slips/page.tsx`, luật in trong `app/styles/admin.css` (`.slip`, `@media print`) |

**`ARC_ADMIN_PATHS`:** thêm `/admin/slips`, và thêm cây `/admin/orders/` để mọi `/admin/orders/<mã>` dùng khung Arc. Làm theo
cách `FEED_TREES` trong `lib/wait.ts`: cây chỉ khớp khi sau dấu `/` còn ký tự. Cập nhật test.

## 2. Đã chốt
- QĐ-37, QĐ-38, QĐ-39 như lát 0.
- **Cách trình bày của lát 0 là mẫu** cho màn mới, vì người dùng đã duyệt:
  - panel viền 1px `--border`, bo `--radius-surface`, không bóng đổ;
  - badge trạng thái đổi tone như lát 0;
  - mọi nút có icon.
- **Nút primary:** mỗi bề mặt chỉ một nút Arc `primary`. Trên chi tiết đơn, đó là nút của khối "Bước tiếp theo". Form sửa địa
  chỉ là bề mặt riêng, nên nút "Lưu" của nó cũng được là primary.
- Giữ hành vi và câu chữ v3, kể cả các câu điều kiện của khối "Bước tiếp theo" và dòng mốc hành trình.

## 3. Việc cần làm

### 3.1 Cài thêm
`@uiarc/breadcrumb`, `@uiarc/stepper`, `@uiarc/combobox`, `@uiarc/empty-state`. Việt hoá như lát 0.

### 3.2 Chi tiết đơn `/admin/orders/[code]`
Bố cục hai cột như v3:
- cột trái rộng: Món trong đơn, rồi Ghi chú nội bộ;
- cột phải khoảng 360px: Giao tới, Hành trình, Khách;
- 24px giữa các vùng, 16px giữa các panel.

| Phần v3 | Arc | Ghi chú |
|---|---|---|
| đường dẫn "Đơn hàng › DH-xxxx" | Arc `Breadcrumb`, `items` là "Đơn hàng" (`/admin/orders`) rồi mã đơn; `ariaLabel` "Đường dẫn" | |
| `h1` là mã đơn, kèm badge trạng thái | `h1` (`--font-display`, `--text-2xl`, đậm 500) và Arc `Badge` `sm` theo bảng tone | một `h1` |
| dòng phụ (giờ đặt · khách · số · thanh toán · Số) | `--text-secondary`, `--text-sm` | chữ như v3 |
| badge "Dữ liệu mẫu" | Arc `Badge` `neutral` `sm` | bắt buộc |
| "Gửi lại xác nhận · đang chuẩn bị" (vô hiệu) | Arc `Button` `secondary` `sm`, `disabled`, không icon | |
| "In phiếu giao" | `ArcButtonLink` `secondary` `sm`, icon `Printer` | |
| `ActionMenu` "Thao tác khác" (chỉ khi `canCancel`) | Arc `DropdownMenu` `iconOnly`, icon `MoreHorizontal`, `label` "Thao tác khác". Mục "Huỷ đơn" (icon `X`, `destructive`) mở `ArcCancelOrderDialog` | |
| `NextStep`: dải đen, 4 biến thể | Khối "Bước tiếp theo": nền `--surface-muted`, bo `--radius-panel`, đệm 16px 20px. Tiêu đề đậm 500, dòng chi tiết `--text-secondary`, nút ở bên phải | nút là Arc `Button` **`primary`** `sm`: "Đã nhận tiền" (`Check`), "Bàn giao" (`Package`), "Đã giao" (`Check`). Lúc chờ dùng `loading`, nhãn "Đang lưu…" như v3 |
| `HandoverForm`, hiện đúng chỗ khối "Bước tiếp theo" khi bấm "Bàn giao" hoặc có `?handover=1` | cùng khối nền `--surface-muted`. Arc `Select` "Hình thức giao"; Arc `Input` "Mã vận đơn" (placeholder như v3); Arc `Input` "Ghi chú nội bộ khi bàn giao · không bắt buộc" (placeholder "VD: gửi 2 kiện") | Nút "Quay lại" (`secondary`, `ArrowLeft`) và nút `primary` với nhãn, icon, trạng thái chờ theo v3 |
| panel "Món trong đơn" với số chiếc | `section` có `h2` (`--text-lg`, đậm 500) và dòng phụ `--text-secondary`. Bảng là `<table>` tự viết bằng token Arc: ảnh 36×45 bo 6px; tên mẫu (500) · loại (`--text-secondary`); Màu · Size; SL; Đơn giá; Thành tiền (căn phải) | **không** lồng `SortableDataTable` vào panel, vì Arc cấm thẻ lồng thẻ |
| các dòng tổng: Tạm tính, Giảm giá · mã, Phí giao, Tổng đã thanh toán | các dòng `--text-secondary`; dòng tổng đậm 500, `--text-lg` | chữ v3 |
| panel "Ghi chú nội bộ" với dòng "khách không thấy" | danh sách ghi chú: dòng "tác giả · giờ" `--text-xs` `--text-secondary`, dưới là nội dung. Arc `Input` (nhãn ẩn "Ghi chú", placeholder "Thêm ghi chú…") và Arc `Button` `secondary` `sm` "Thêm" icon `Send` | ẩn nhãn theo cách `SearchField` `hideLabel`. Nếu `Input` không có sẵn cách đó thì vá như `hideLabel` và ghi `PATCHES.md` |
| panel "Giao tới", nút "Sửa" | "Sửa" là Arc `Button` `ghost` `sm` icon `Pencil`. Bấm vào thì panel thành form sửa tại chỗ, như v3: Arc `Input` Người nhận, Số điện thoại, Số nhà và đường; Arc `Combobox` Tỉnh / thành, Phường / xã; Arc `Input` "Lý do sửa" (placeholder "VD: khách nhắn đổi số nhà") | "Huỷ" `secondary` `ArrowLeft`; "Lưu" `primary` `Check`. Luật "trước bàn giao mới sửa được" như v3 |
| panel "Hành trình" | Arc `Stepper`, `orientation="vertical"`. `steps` lấy từ `timelineOf`: `title` thành `label`, `detail` thành `description`; mốc trễ thì đưa `detail` vào `error`. `current` là chỉ số mốc "now" hoặc "late" đầu tiên; hết mốc thì bằng `steps.length`. `label` "Hành trình"; `completeLabel` bằng tiếng Việt | đơn đã huỷ: làm theo đúng mốc `timelineOf` trả về |
| panel "Khách", link "Hồ sơ" | Arc `Avatar` `md`, tên đậm 500, nhãn khách thành Arc `Badge` `sm` (đổi tone như bảng), dòng thống kê `--text-secondary`. "Hồ sơ" là link chữ | trang khách vẫn là v3 |
| toast | `useArcToast`, đúng câu v3 | |

### 3.3 Phiếu giao `/admin/slips`
- **Đầu trang:**
  - Arc `Breadcrumb`: "Đơn hàng", rồi "Phiếu giao";
  - `h1` "Phiếu giao" hoặc "Phiếu giao · N đơn", dòng phụ như v3;
  - badge "Dữ liệu mẫu";
  - Arc `Button` `primary` `sm` icon `Printer`, nhãn "In phiếu" hoặc "In N phiếu", gọi `window.print()`.
- **Rỗng:** Arc `EmptyState`, tiêu đề và mô tả đúng chữ v3, hành động là `ArcButtonLink` "Xem danh sách đơn" icon `ShoppingBag`.
- **Từng phiếu:**
  - lưới 2 cột, cách 16px;
  - phiếu viền 1px `--foreground` (in ra giấy cần viền rõ), bo `--radius-panel`, đệm 16px;
  - đầu phiếu: `FeedLogo` bản nền sáng và mã đơn (`--font-display`, đậm 500);
  - bên dưới, theo đúng thứ tự v3: khối người nhận, ô QR chờ 100×100 kèm chữ v3, bảng món, dòng tổng, khối thu hộ (nền
    `--surface-muted`), dòng chân `--text-xs`.
- **`@media print`:**
  - ẩn thanh bên, đầu trang và toast;
  - vùng chính đệm 0, khung `min-width: 0`, nền trắng;
  - lưới 2 cột cách 8mm.
  - Kiểm bằng `page.emulateMedia({ media: "print" })` rồi chụp ảnh.

### 3.4 Test
- `lib/admin-arc.test.ts`:
  - đúng với `/admin/orders/DH-2430`, `/admin/orders/`, `/admin/slips`;
  - sai với `/admin/customers`, `/admin`.
- Thêm chuỗi gốc của các item mới vào `arc-english-strings.ts`.
- Test cũ vẫn xanh, `npm run typecheck` sạch.

## 4. Kiểm
Máy tính **1280**; ảnh toàn trang chụp ở **1440** bằng khung nhìn cao bằng trang, không dùng `fullPage`. Đăng nhập bằng
`/sign-in`, nút "Vào quản trị thử".

**Server:** trước khi build, kiểm cổng 3200. Server của lát 0 có thể vẫn chạy. Còn bận thì dừng lại và báo, không
`taskkill`. Người dùng sẽ tự dừng.

**Chi tiết đơn, mỗi trạng thái một ảnh:**
1. đơn "Chờ chuyển khoản";
2. đơn "Đã thanh toán": khối "Bàn giao", bấm vào ra form; mở bằng `?handover=1` thì form mở sẵn;
3. đơn "Đang giao";
4. đơn "Đã giao";
5. đơn "Đã huỷ";
6. menu "Thao tác khác" mở, và hộp Huỷ đơn;
7. form sửa địa chỉ, Combobox tỉnh mở, Combobox phường mở.

**Ghi DB thật:**
- thêm ghi chú: ghi chú hiện ra, có toast;
- "Đã nhận tiền" trên một đơn chờ tiền: khối đổi sang "Bàn giao";
- "Bàn giao" có mã vận đơn: đơn thành "Đang giao";
- "Đã giao".

**Phiếu giao:**
- một đơn;
- nhiều đơn (`?codes=a,b,c`);
- rỗng (`?codes=`);
- chế độ in.

**Đi qua lại:**
- từ bảng Đơn hàng bấm mã: khung vẫn là Arc;
- từ chi tiết bấm "Hồ sơ": sang trang khách v3, khung v3 nguyên vẹn.

**Chung:**
- vòng focus bàn phím hiện, bấm chuột thì không;
- font Mona Sans ở mọi chỗ, kể cả lớp portal (danh sách Combobox, Select, menu, Dialog);
- 0 lỗi console, không tràn ngang ở 1280;
- `/admin` và `/admin/customers/<id>` không đổi so với ảnh chụp trước khi sửa;
- phần khách không đổi.

Xong thì đặt lại dữ liệu: `npx supabase db query "select public.reset_demo(public.demo_anchor());"`.

## 5. Ảnh cần nộp
`.playwright-cli/shots/v5/lat-1/`:
- `order-<trạng thái>-1280.png`;
- `slips-<trạng thái>-1280.png`;
- `slips-print-1280.png`;
- `focus-*-1280.png`;
- `before-*` và `after-*` cho các trang v3.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, thêm các mục "Vá Arc", "Xung đột luật" và "Chưa làm". Gửi trọn trong **tin cuối**.
Không commit, không đụng git ngoài `git status` và `git diff`. Để server 3200 chạy cho phiên chính duyệt.
