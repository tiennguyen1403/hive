# Brief: v5 lát 0 (thử), quản trị theo Arc: nền tích hợp, khung, Đơn hàng

Đợt v5 thay giao diện quản trị v3 bằng thư viện **Arc** (uiarc.dev, bản free, MIT). Quyết định và kết quả đo ở cuối
`tasks/plan.md`, mục "Đợt v5: quản trị theo Arc" (QĐ-37, QĐ-38, QĐ-39 và "Luật tích hợp"). Lát này là **lát thử**:
- dựng nền tích hợp Arc;
- dựng khung quản trị Arc;
- chuyển một màn, `/admin/orders`.

Người dùng xem kết quả rồi mới quyết có làm tiếp các màn khác không. Mọi màn quản trị còn lại **giữ nguyên v3**, kể cả
`/admin/orders/[code]` và `/admin/slips`.

**Nguồn chuẩn của lát này.** Đợt v5 không có mock HTML. Spec ghép từ ba nguồn, theo thứ tự ưu tiên:
1. brief này;
2. màn v3 đang chạy, cho hành vi và câu chữ;
3. tài liệu Arc, cho hình dáng từng component.

Như vậy là đủ mục 1 của hợp đồng đầu vào. Ba nguồn không nói tới điều gì thì dừng lại hỏi, đừng tự thiết kế.

**Brief này đè các luật sau trong định nghĩa agent, chỉ cho vùng Arc:**
- "Round v3 stays the spec for the back office": với `/admin/orders`, spec là ba nguồn trên.
- Icon Iconsax: vùng Arc dùng **Lucide** (`lucide-react`, phụ thuộc của Arc), cỡ 16 hoặc 20, `strokeWidth={1.75}`,
  `aria-hidden`.
- Token ở `app/globals.css`: vùng Arc dùng token ngữ nghĩa của `registry/foundation.css` (`--background`, `--surface`,
  `--surface-muted`, `--foreground`, `--text-secondary`, `--text-muted`, `--border`, `--accent`, `--success`, `--warning`,
  `--danger`, `--radius-*`, `--text-*`, `--space-*`). Không hex, không màu thô.
- "No new dependency" và "write only inside app/ components/ lib/ data/": được phép như mục 3.1 liệt kê.
- "No network": được phép mạng cho `npx shadcn@latest add @uiarc/...` và cho đọc tài liệu Arc.

Các luật khác của định nghĩa agent giữ nguyên:
- code tiếng Anh;
- bộ lọc và phân trang trên URL (QĐ-8);
- không nút chết;
- badge "Dữ liệu mẫu";
- công tắc `data-pointer` cho vòng focus;
- không `alert`/`confirm`, không `<select>` gốc;
- không commit.

**Tài liệu Arc cần đọc trước.** Bản sao đã tải sẵn ở
`C:\Users\PC\AppData\Local\Temp\claude\D--Code-e-commerce\737078ac-9d1e-4188-94ef-6201cc6b0755\scratchpad\arcdocs\`. Nếu thư
mục mất, dùng `curl` từ các URL tương ứng:
- `skill-INSTRUCTIONS.md`, `skill-design.md`, `skill-composition.md`, `skill-accessibility.md`, `skill-checklist.md`. Bản gốc ở
  `https://uiarc.dev/r/skills/arc/<tên>.md`.
- Tài liệu từng component: `https://uiarc.dev/components/<id>/markdown`, với các id `button`, `badge`, `avatar`, `tabs`,
  `search-field`, `filter-toolbar`, `sortable-data-table`, `pagination`, `segmented-control`, `dropdown-menu`, `popover`,
  `checkbox`, `dialog`, `select`, `input`, `toast-stack`.
- Theo luật của Arc: chỉ dùng prop có trong tài liệu, đúng "When to use".
- **Trừ ba chỗ người dùng đã đè:** không dùng Geist và Inter (dùng Mona Sans), giữ vòng focus bàn phím, và chữ tiếng Việt.

## 1. Màn và route

| Màn | Route | Nguồn hành vi và chữ |
|---|---|---|
| Khung quản trị Arc (thanh bên, vùng chính) | mọi route trong `ARC_ADMIN_PATHS`, lúc này chỉ `/admin/orders` | `components/admin/AdminNav.tsx`, `SimBar.tsx`, `app/admin/layout.tsx` |
| Đơn hàng | `/admin/orders` | `components/admin/AdminOrdersScreen.tsx`, `Table3.tsx`, `AdminTop.tsx`, `CancelOrderModal.tsx`, `ExportCsvButton.tsx`, `useAdminCols.ts` |

## 2. Người dùng đã chốt (30/09)

- **QĐ-37:** chỉ bản free. Không cài, không dựng lại item Pro. Sidebar tự ghép từ phần free.
- **QĐ-38:**
  - accent `neutral` mặc định của Arc, không đặt `data-accent`;
  - chỉ nền sáng, không `data-theme="dark"`;
  - Mona Sans rộng 100% cho cả `--font-display` và `--font-body`;
  - độ đậm 400 và 500 theo Arc.
- **QĐ-39:** giữ vòng focus bàn phím. Vòng hiện khi đi bằng Tab, không hiện sau cú bấm chuột.

Phiên chính chốt thêm, từ phép đo 30/09:
- **Cách cài an toàn:** mục 3.1.
- **Khoanh vùng `foundation.css`:** mục 3.2.
- **Chuyển khung theo đường dẫn:** mục 3.5.
- **Quản trị vẫn chỉ cho máy tính:** giữ `min-width: 1180px` như `.s.adm3`.
- **Chữ giữ nguyên v3.** Mọi câu chữ của màn v3 giữ đúng từng chữ, vì người dùng đã duyệt, kể cả dấu gạch dài trong câu có
  sẵn. Không thêm câu giải thích, dòng mô tả hay chú thích (luật "không mô tả khái niệm trên UI").

## 3. Việc cần làm

### 3.1 Cài Arc an toàn
1. Viết tay `components.json` ở gốc dự án, **đúng nội dung này**:
   ```json
   {
     "$schema": "https://ui.shadcn.com/schema.json",
     "style": "new-york",
     "rsc": true,
     "tsx": true,
     "tailwind": { "config": "", "css": "", "baseColor": "neutral", "cssVariables": true },
     "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" },
     "registries": { "@uiarc": "https://uiarc.dev/r/{name}.json" }
   }
   ```
2. Cài bằng lệnh sau:
   ```
   npx shadcn@latest add @uiarc/button @uiarc/badge @uiarc/avatar @uiarc/tabs @uiarc/search-field @uiarc/filter-toolbar @uiarc/sortable-data-table @uiarc/pagination @uiarc/segmented-control @uiarc/dropdown-menu @uiarc/popover @uiarc/checkbox @uiarc/dialog @uiarc/select @uiarc/input @uiarc/toast-stack --yes
   ```
3. **Cấm `shadcn init`.** Nếu CLI hỏi tạo `components.json` hay hỏi init, dừng lại và báo. Đã đo: init ghi đè
   `components/ui/Button.tsx` và sửa `globals.css`.
4. Cài xong, `git status` chỉ được có các thay đổi sau:
   - `components.json`, `package.json`, `package-lock.json`;
   - `registry/`;
   - `lib/motion-tokens.ts`.

   Thấy tệp nào khác thì hoàn lại và báo.
5. CLI in ra dòng "Import the tokens once in your root layout". **Không làm theo dòng đó.** Xem mục 3.2.
6. Tạo `registry/PATCHES.md`, ghi:
   - ngày cài, phiên bản CLI, danh sách item;
   - từng chỗ vá ở mục 3.2 và 3.4: tệp, sửa gì, vì sao.

   Lần sau cài lại bản mới thì dựa vào tệp này để vá lại.

### 3.2 Khoanh vùng `registry/foundation.css`
- **Viết lại mọi selector:**
  - `:root` thành `:root:has([data-ui="admin"])`;
  - phần đuôi của selector giữ nguyên, ví dụ `:root[data-theme="dark"][data-accent="blue"]` thành
    `:root[data-theme="dark"][data-accent="blue"]:has([data-ui="admin"])`;
  - làm cả với các luật trong `@supports`.
- **Xoá luật cuối** `:is(*:focus, *:focus-visible, *:focus-within) { outline: none !important; }`.
- **`--focus-ring`:**
  - trong khối sáng, đặt `var(--accent)`;
  - thêm luật `html[data-pointer]:has([data-ui="admin"]) { --focus-ring: transparent; }`, để lúc dùng chuột mọi vòng của Arc
    (outline lẫn quầng `box-shadow`) tắt theo cùng công tắc với phần còn lại của app.
- **Font:** trong khối sáng, đặt `--font-display` và `--font-body` bằng `var(--font-mona)`.
- **Lớp portal nhận font:** thêm
  `:root:has([data-ui="admin"]) body { font-family: var(--font-body); color: var(--foreground); }`. Lý do: Dialog, Select,
  menu và toast render ra `body`, và phần chữ không tự đặt font của chúng sẽ thừa kế từ đây. Đã đo: không có luật này thì thân
  Dialog hiện Be Vietnam Pro.
- **Import** `@/registry/foundation.css` ở `app/admin/layout.tsx`, không import ở root layout.
- **Không đổi tên `--font-display`.** Các màn v3 không bao giờ chứa `[data-ui="admin"]`, nên token Unbounded của chúng không
  bị chiếm. Mục 3.7 có test canh việc này.

### 3.3 Font
- Thêm `monaSans.variable` (`components/feed/font.ts`) vào `className` của `<html>` trong `app/layout.tsx`, cạnh hai biến v3.
- Lý do: `--font-mona` phải có ở `:root` thì lớp portal mới dùng được. Kiểm lại trang Feed không đổi hình, và số font tải
  trước trên `/` không tăng. DESIGN.md ghi `/admin` đã tải trước 3 tệp Mona Sans.

### 3.4 Việt hoá và vá component Arc
**Trước khi sửa:**
- grep mọi chuỗi tiếng Anh người dùng thấy hoặc máy đọc màn hình đọc trong `registry/components/**` đã cài (default của prop,
  chữ viết cứng trong JSX, `aria-label`, câu `role="status"`);
- lưu danh sách chuỗi gốc làm dữ liệu cho test ở mục 3.7.

**Dịch sang tiếng Việt.** Câu viết hoa chữ đầu, ngắn, chính tả theo dự án ("Xoá", "Huỷ"). Gợi ý:

| Gốc | Việt |
|---|---|
| Close dialog | Đóng |
| Dismiss notification | Đóng thông báo |
| Notifications | Thông báo |
| Add filter | Thêm bộ lọc |
| Active filters | Bộ lọc đang dùng |
| Clear all | Xoá hết |
| No filters applied | Chưa lọc |
| Back to fields | Quay lại |
| Pagination | Phân trang |
| Previous page / Next page / Page N | Trang trước / Trang sau / Trang N |
| Data table | Bảng |
| No rows to show | Không có dòng nào |
| Select all rows / Select X | Chọn tất cả / Chọn X |
| Clear selection | Bỏ chọn |
| Scroll tabs left / right | Cuộn tab sang trái / phải |
| Select an option | Chọn |

Câu thông báo trạng thái ("n of m selected", "Selection cleared", "Sort by …") dịch cho đủ nghĩa.
- `Intl` dùng `"vi-VN"`; `Intl.Collator` dùng `"vi"`.

**Vá hành vi, chỉ những chỗ sau.** Mỗi chỗ vá ghi vào `PATCHES.md`.
- **`SortableDataTable`:**
  - tuỳ chọn tắt chọn dòng khi bấm vào dòng. Màn này chỉ chọn bằng ô đánh dấu, vì bấm vào dòng còn dùng để mở link mã đơn và
    bôi đen số điện thoại;
  - tuỳ chọn ẩn dòng đếm có sẵn, vì thanh chọn nhiều ở mục 3.6 đã đếm;
  - cách gắn thuộc tính theo từng dòng, để làm mờ dòng đã huỷ như v3.
- **`DropdownMenu`:** trigger chỉ có icon, kèm `aria-label`, cho menu từng dòng.
- **`SearchField`:** tuỳ chọn ẩn nhãn cho mắt nhưng máy đọc vẫn đọc, vì ô tìm nằm trên thanh công cụ. Arc cho phép trường hợp
  này ở `skill-accessibility.md`.
- **Nút dẫn trang:** Arc Button không có `href`. Viết `ArcButtonLink` trong code của dự án, render `next/link` với đúng kiểu
  nút của Arc. Chỉ vá Button nếu wrapper không làm được. Wrapper nào phải dựa vào tên class nội bộ của Arc thì ghi rõ trong
  `PATCHES.md`.

Ngoài các chỗ trên, **không sửa ruột Arc**. Bố cục nằm trong CSS module của mình, dùng token Arc.

### 3.5 Khung quản trị Arc
- **`lib/admin-arc.ts`:**
  - `ARC_ADMIN_PATHS = ["/admin/orders"]`;
  - `isArcAdminPath(pathname)` so khớp đúng đường dẫn, bỏ dấu `/` cuối;
  - `/admin/orders/DH-2430` vẫn là v3.
  - Có test.
- **`app/admin/layout.tsx`:**
  - giữ `requireAdmin()`, `metadata` và ba lượt đọc (`me`, số đơn chờ, lần đặt lại);
  - render một client component chọn khung theo `usePathname()`: khung Arc khi `isArcAdminPath`, còn lại là khung v3 **nguyên
    vẹn** (`<div className="s adm3"><AdminNav …/><main className="main">`);
  - `AdminToastProvider` vẫn bọc cả hai, vì màn v3 cần nó.
- **Thư mục mới** `components/admin-arc/`. Tên gợi ý:
  - `ArcAdminFrame`, `ArcSidebar`, `ArcOrdersScreen`, `ArcCancelOrderDialog`, `ArcResetDialog`, `ArcButtonLink`;
  - CSS module đi kèm;
  - hook `useArcToast()` có cùng chữ ký với `useAdminToast`, để gọi `say(message, "ok" | "error")` như v3.
- **Gốc vùng Arc:**
  - mang `data-ui="admin"`;
  - `min-width: 1180px`;
  - nền `--background`;
  - chữ `--foreground`, `font-family: var(--font-body)`;
  - bọc `ToastStackProvider` và đặt `ToastStack` ở góc phải dưới.
- **Thanh bên:**
  - rộng 240px, `position: sticky`, cao hết khung nhìn;
  - nền `--surface-muted`, viền phải 1px `--border`, đệm 16px.
  - **Đầu:** `FeedLogo` bản nền sáng (mark và chữ đen), cao khoảng 28px, trong một phần tử có tên đọc được là "HIVE". V3 không
    làm logo thành link, ở đây cũng vậy.
  - **Điều hướng** `aria-label="Khu quản trị"`: đúng 7 link, cùng thứ tự, nhãn và href với `LINKS` của `AdminNav`. Nhãn Số lấy
    từ `LEX.adm`.

    | Link | Icon Lucide |
    |---|---|
    | Tổng quan | `LayoutDashboard` |
    | Các số | `CalendarDays` |
    | Đơn hàng | `ShoppingBag` |
    | Mẫu | `Shirt` |
    | Khách hàng | `Users` |
    | Mã giảm giá | `TicketPercent` |
    | Nhật ký | `ScrollText` |

    - mỗi link cao 36px, bo `--radius-control`, chữ `--text-secondary`, di chuột thì nền `--surface`;
    - link đang mở theo đúng luật `isOpen` của `AdminNav`: nền `--surface`, chữ `--foreground`, đậm 500,
      `aria-current="page"`.
  - **Số đơn chờ** cạnh "Đơn hàng" khi lớn hơn 0:
    - Arc `Badge` `size="sm"` tone `neutral`, `tabular-nums`;
    - `aria-label` là "{n} đơn cần xử lý" như v3.
  - **Chân thanh bên:** giống `SimBar`, đúng chữ của nó:
    - Arc `Badge` "Dữ liệu mẫu";
    - dòng "Đồng hồ thật · dữ liệu mẫu đặt lại lần cuối HH:MM · DD/MM." (hoặc "chưa đặt lại"), mốc giờ đậm 500;
    - nút Arc `ghost` `sm` có icon `RotateCcw`, nhãn "Đặt lại dữ liệu mẫu". Nút mở `ArcResetDialog`:
      - tiêu đề "Đặt lại dữ liệu mẫu?", mô tả là câu của `SimBar`;
      - "Giữ nguyên": `secondary`, icon `ArrowLeft`;
      - "Đặt lại": `danger`, icon `RotateCcw`; lúc chờ là "Đang đặt lại…" bằng prop `loading`;
      - thành công thì `router.refresh()` và báo đúng câu của `SimBar`; lỗi cũng vậy;
    - tên (đậm 500) và email (`--text-secondary`);
    - nút `ghost` `sm` có icon `LogOut`, nhãn "Đăng xuất", `type="submit"` trong `<form action={signOut}>`.
- **Vùng chính:**
  - đệm 32px, rộng hết cột;
  - một container duy nhất, theo `skill-composition.md`.

### 3.6 Màn Đơn hàng `/admin/orders`
**Hành vi giữ đúng `AdminOrdersScreen`:**
- dữ liệu (`listAllOrders`, `effectiveOrder`, `recentOrders`, `needsAction`);
- đọc lọc từ `query`, ghi URL bằng `hrefWith`;
- `paginate`, `perPageOf`;
- luật chọn dòng: bỏ mã bị lọc mất khỏi lựa chọn;
- các hành động: `markPaid`, `cancelOrderAdmin`, CSV;
- mọi câu báo;
- `nextMove`, `canCancel`.

`app/admin/orders/page.tsx` giữ nguyên phần server, chỉ đổi màn được render. **Không xoá `AdminOrdersScreen.tsx`** ở lát này
(nó còn xuất `SearchBox`; lát dọn sẽ xử lý).

**Đổi giao diện:**

| Phần v3 | Arc | Ghi chú |
|---|---|---|
| `AdminTop`: "Đơn hàng", dòng phụ "{n} cần xử lý" | `h1` (`--font-display`, `--text-2xl`, đậm 500), dòng phụ `--text-secondary` | một `h1` |
| badge "Dữ liệu mẫu" | Arc `Badge` `neutral` `sm` | bắt buộc (PRODUCT.md) |
| "Tải CSV" | Arc `Button` `secondary` `sm`, icon `Download` | `downloadCsv` và các cột CSV như v3 |
| "In phiếu giao" (khi có đơn PAID) | `ArcButtonLink` `secondary` `sm`, icon `Printer` | href như v3 |
| `Stabs`: 7 tab, có số đếm, URL `state` | Arc `Tabs`: `TabsList` và `TabsTrigger`. Nhãn từ `STATE_LABEL`, số đếm sau nhãn, `--text-secondary`, `tabular-nums`. Bảng nằm trong `TabsContent` của tab đang mở | Đổi tab thì hiện ngay, rồi `router.replace(hrefWith(…, { state, page: null }))` trong transition |
| ô tìm, URL `q` | Arc `SearchField`, nhãn ẩn "Tìm đơn", placeholder "Tìm mã đơn, tên, số điện thoại" | trễ 350ms, Enter gửi ngay, như `SearchBox` |
| hai `ChipMenu` "Thanh toán" (URL `pay`) và "Số" (URL `drop`) | Arc `FilterToolbar` có `addFilter`: trường "Thanh toán" (Chuyển khoản, COD, Thẻ theo `PAYMENT_LABEL`) và trường `LEX.t` (các số có đơn, nhãn `LEX.t` + `issueNo`). Chip đang áp dụng có nút bỏ; nút "Xoá hết" | id của chip là `pay` và `drop`. Bỏ chip thì tham số về null, `page: null` |
| `ChipMenu` "Cột" (nhớ trên máy qua `useAdminCols`) | Arc `Popover`. Trigger là Arc `Button` `secondary` `sm`, icon `Columns3`, nhãn "Cột". Bên trong là 4 Arc `Checkbox`: Món, Thanh toán, Địa chỉ, Mã giảm giá | giữ `useAdminCols` và khoá của nó |
| thanh chọn nhiều (thay chỗ thanh công cụ) | cùng vị trí và chiều cao, nền `--surface-muted`, bo `--radius-control`. "{n} đơn đã chọn" (đậm 500). Ba nút: Arc `Button` `secondary` `sm` "Đã nhận tiền" icon `Check` (chờ: "Đang lưu…"); `ArcButtonLink` "In phiếu giao" icon `Printer`; `ghost` "Bỏ chọn" icon `X` | luật và câu báo như v3 |
| bảng | Arc `SortableDataTable`, `selectable`, `selectedKeys` có điều khiển, mọi cột `sortable: false` (v3 không sắp xếp, và sắp xếp phía trình duyệt chỉ đúng với một trang). Có các bản vá ở mục 3.4 | bảng rộng thì cuộn ngang trong thẻ, trang không cuộn ngang |
| ô Khách: chữ viết tắt, tên, số điện thoại | Arc `Avatar` `size="sm"` (`name`), tên, số điện thoại `--text-secondary` | `formatPhone` |
| ô Mã đơn | `next/link` tới `/admin/orders/{code}` | kiểu link theo token Arc |
| Thời gian, Giá trị | "20/09 · 18:02"; `plainVnd`, căn phải | `tabular-nums` |
| cột tuỳ chọn Món, Thanh toán, Địa chỉ, Mã giảm giá | giữ nội dung và dòng phụ như `paymentCell`, `addressCell` | |
| Trạng thái | Arc `Badge`, đổi tone: `warn` thành `warning`, `ok` thành `success`, `info` thành `info`, `shut` thành `neutral`, `hot` thành `danger`. Dòng lý do huỷ và dòng ghi chú như v3; ghi chú trễ tô `--danger` | màu luôn đi kèm chữ |
| `ActionMenu` từng dòng | Arc `DropdownMenu` trigger chỉ có icon `MoreHorizontal`, `aria-label` "Thao tác {code}". Mục: Mở chi tiết (`Eye`); Đã nhận tiền (`Check`, chỉ khi `nextMove === "MARK_PAID"`); In phiếu giao (`Printer`); Huỷ đơn (`X`, `destructive`, `separatorBefore`, chỉ khi `canCancel`) | mục dẫn trang dùng `router.push` |
| "Không có đơn nào khớp." | `emptyMessage` của bảng | |
| `TableFoot`: "Hiện {n} / {tổng} đơn", 10/25/50 dòng (URL `per`), số trang (URL `page`) | chữ `--text-secondary`; Arc `SegmentedControl` với `label` "Số dòng mỗi trang"; Arc `Pagination` khi có hơn một trang | |
| `CancelOrderModal` | `ArcCancelOrderDialog`: Arc `Dialog`, tiêu đề "Huỷ đơn {code}?", mô tả là câu v3 (hai trường hợp đã trả hay chưa); Arc `Select` "Lý do" (`CANCEL_REASONS`, placeholder "Chọn lý do", lỗi "Chọn một lý do trước khi huỷ."); Arc `Input` "Ghi chú nội bộ · không bắt buộc", placeholder "Khách không thấy dòng này". Nút "Giữ đơn" (`secondary`, `ArrowLeft`); nút `danger` "Chọn lý do" rồi thành "Huỷ đơn", lúc chờ "Đang huỷ…" | logic như v3. `CancelOrderModal` v3 vẫn phục vụ trang chi tiết đơn, không sửa |
| `useAdminToast` | `useArcToast` qua Arc `ToastStack`, `type` `success` hoặc `error`, đúng câu báo v3 | |

**Luật Arc áp dụng cho phần mình tự viết:**
- đậm 400 và 500, không chữ in hoa;
- cỡ chữ theo `--text-*`, khoảng cách theo lưới 4px;
- bo góc lồng nhau đồng tâm;
- một nút `primary` mỗi bề mặt. Màn này không có nút primary nào, cũng được;
- số dùng `tabular-nums`;
- mọi nút hành động có icon gọi tên hành động (luật dự án); nút vô hiệu không có icon.

### 3.7 Test
- **`lib/admin-arc.test.ts`:** `isArcAdminPath` đúng với `/admin/orders` và `/admin/orders/`; sai với `/admin/orders/DH-2430`,
  `/admin`, `/`.
- **Test cho `registry/foundation.css`:**
  - mọi luật style có `:has([data-ui="admin"])` trong selector;
  - không còn luật `outline: none !important`;
  - khối sáng có `--focus-ring` khác `transparent`;
  - có luật `html[data-pointer]` đặt `--focus-ring: transparent`;
  - `--font-display` và `--font-body` trỏ `--font-mona`.
- **Test chặn chuỗi tiếng Anh gốc** (danh sách lưu ở mục 3.4) trong `registry/components/**`. Cài lại bản mới thì test đỏ.
- Toàn bộ test cũ vẫn xanh; `npm run typecheck`, `npm run build` sạch.

## 4. Kiểm
Đăng nhập quản trị: `/sign-in`, bấm "Vào quản trị thử". Build và phục vụ ở 3200 theo định nghĩa agent. Máy tính **1280**; ảnh
toàn trang chụp thêm ở **1440**.

**Trước khi sửa code**, chụp bản v3 của `/admin`, `/admin/orders` và một `/admin/orders/<mã>` để đối chiếu.

**Các trạng thái của `/admin/orders`:**
1. mặc định;
2. tab "Chờ chuyển khoản";
3. tìm một tên có kết quả; tìm "zzz" không có kết quả;
4. menu "Thêm bộ lọc" mở ở bước chọn trường và ở bước chọn giá trị; sau đó chip "Thanh toán: COD" đang áp dụng;
5. popover "Cột" mở; bật "Địa chỉ" thì cột hiện, tải lại trang vẫn còn;
6. menu từng dòng mở trên một đơn "Chờ chuyển khoản" (có "Đã nhận tiền" và "Huỷ đơn");
7. chọn 2 dòng thì hiện thanh chọn nhiều;
8. hộp Huỷ đơn mở, rồi mở danh sách lý do; chọn lý do xong thì nút đổi thành "Huỷ đơn";
9. hộp Đặt lại dữ liệu mẫu mở;
10. toast sau khi bấm "Đã nhận tiền" trên một dòng; dòng đó đổi trạng thái tại chỗ;
11. 25 dòng mỗi trang; trang 2 khi 10 dòng mỗi trang.

**Bàn phím:**
- đi Tab từ đầu trang qua thanh bên, tab trạng thái, ô tìm, "Thêm bộ lọc", "Cột", ô đánh dấu, menu dòng, phân trang. Vòng
  focus phải thấy rõ (tương phản ít nhất 3:1 với nền). Chụp 3 chỗ;
- sau đó bấm chuột vào một nút: không còn vòng. Đo `outline-style` và `box-shadow` của phần tử đang focus ở cả hai chế độ.

**Font:** đo `font-family` tính ra (và tên mặt chữ thật nếu đo được) của:
- `h1`, ô bảng, link thanh bên;
- thân Dialog, mục Select, mục DropdownMenu, Popover, toast.

Tất cả phải là Mona Sans.

**Không vỡ phần khác:**
- `/admin` và `/admin/orders/<mã>` chụp lại giống hệt ảnh "trước". `font-family` của `h1` v3 vẫn là Unbounded;
- mở `/` từ đầu: `getComputedStyle(document.documentElement).getPropertyValue("--surface")` rỗng, và vòng focus xanh của Feed
  vẫn hiện khi Tab;
- 0 lỗi console, không tràn ngang ở 1280;
- báo lượng JS nén `/admin/orders` tải thêm so với bản v3 (đo bằng `performance`).

Xong thì trả dữ liệu mẫu: `select public.reset_demo(public.demo_anchor());`.

## 5. Ảnh cần nộp
- `.playwright-cli/shots/v5/lat-0/orders-<state>-<w>.png`;
- `before-<route>-1280.png` và `after-<route>-1280.png` cho các trang v3;
- `focus-<chỗ>-1280.png`.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent. Thêm các mục:
- **"Vá Arc":** trích `registry/PATCHES.md`;
- **"Xung đột luật":** luật Arc hay luật dự án nào phải nhường, ở đâu;
- **"Chưa làm":** việc còn lại.

Gửi trọn trong **tin cuối**, đồng thời ghi `REPORT.md` cạnh ảnh. Không commit, không đụng git ngoài `git status` và
`git diff`. Để server 3200 chạy cho phiên chính duyệt.
