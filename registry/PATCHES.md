# Vá Arc trong HIVE

Thư mục `registry/` là mã Arc (uiarc.dev, bản free, MIT) do shadcn CLI chép vào. Tệp này ghi mọi chỗ dự án đã sửa ruột Arc,
để lần sau cài lại bản mới thì biết phải vá lại những gì. Luật: chỉ vá khi prop có sẵn không làm được, vá nhỏ nhất, mỗi chỗ vá
có chú giải `HIVE patch` ngay trong mã (tasks/plan.md, "Đợt v5", "Luật tích hợp").

## Lần cài 30/09/2026 (đợt v5, lát 0)

- **CLI:** `shadcn` 4.21.0, gọi bằng `npx shadcn@latest`.
- **`components.json`:** viết tay trước khi cài, chỉ khai registry `@uiarc` → `https://uiarc.dev/r/{name}.json`. **Không chạy
  `shadcn init`**: init ghi đè `components/ui/Button.tsx` (Windows không phân biệt hoa thường) và sửa `app/globals.css`.
- **Lệnh:**
  ```
  npx shadcn@latest add @uiarc/button @uiarc/badge @uiarc/avatar @uiarc/tabs @uiarc/search-field @uiarc/filter-toolbar @uiarc/sortable-data-table @uiarc/pagination @uiarc/segmented-control @uiarc/dropdown-menu @uiarc/popover @uiarc/checkbox @uiarc/dialog @uiarc/select @uiarc/input @uiarc/toast-stack --yes
  ```
- **16 item:** button, badge, avatar, tabs, search-field, filter-toolbar, sortable-data-table, pagination, segmented-control,
  dropdown-menu, popover, checkbox, dialog, select, input, toast-stack.
- **CLI tạo 35 tệp:** `registry/foundation.css`, `registry/motion-tokens.ts`, `lib/motion-tokens.ts`, và `.tsx` + `.module.css`
  của 16 item trong `registry/components/<id>/`.
- **Phụ thuộc CLI thêm vào `package.json`:** `@radix-ui/react-checkbox` 1.3.11, `@radix-ui/react-dialog` 1.1.23,
  `@radix-ui/react-dropdown-menu` 2.1.24, `@radix-ui/react-popover` 1.1.23, `@radix-ui/react-select` 2.3.7,
  `@radix-ui/react-tabs` 1.1.21, `lucide-react` 1.49.0, `motion` 13.4.6.
- **Sau khi cài, `git status`** chỉ có `components.json`, `package.json`, `package-lock.json`, `registry/`, `lib/motion-tokens.ts`.
- CLI in dòng "Import the tokens once in your root layout". **Không làm theo:** `foundation.css` được import ở
  `app/admin/layout.tsx` (mục 1).

Không sửa: `badge`, `button`, `input`, `popover`, `segmented-control`, `motion-tokens.ts` (không có chuỗi tiếng Anh, không cần
vá hành vi).

## 1. `registry/foundation.css`: khoanh vùng

Arc đặt mọi luật ở `:root`, nên tệp là toàn cục: tiêu đề v3 mất Unbounded vì trùng tên `--font-display`, luật cuối xoá vòng
focus bàn phím của cả app (kể cả vòng xanh của Feed), và CSS còn nằm lại khi chuyển trang phía client sang cửa hàng.

| Sửa | Vì sao |
|---|---|
| Mọi selector viết lại: `:root` → `:root:has([data-ui="admin"])`, giữ nguyên phần đuôi (`:root[data-theme="dark"][data-accent="blue"]` → `:root[data-theme="dark"][data-accent="blue"]:has([data-ui="admin"])`), kể cả hai luật trong `@supports`. 38 selector | Token vẫn ở `:root` nên Dialog, Select, menu, toast (portal ra `<body>`) vẫn nhận; trang nào không có vùng Arc (v3, cửa hàng) thì không khớp luật nào |
| Xoá luật cuối `:is(*:focus, *:focus-visible, *:focus-within) { outline: none !important; }` | QĐ-39: giữ vòng focus bàn phím |
| Khối sáng: `--focus-ring: var(--accent)` (gốc `transparent`) | Vòng focus của Arc (outline và quầng `box-shadow`) hiện khi đi bằng bàn phím. Accent `neutral` trên nền trắng vượt xa 3:1. Khối tối giữ `transparent`: dự án không bật chế độ tối (QĐ-38) |
| Thêm `html[data-pointer]:has([data-ui="admin"]) { --focus-ring: transparent; }` | Dùng chuột thì mọi vòng và quầng của Arc tắt, theo công tắc `data-pointer` chung của app (`app/layout.tsx`, `app/globals.css`) |
| Khối sáng: `--font-display` và `--font-body` = `var(--font-mona)` (gốc Geist, Inter) | QĐ-38: Mona Sans rộng 100% cho cả hai vai. `--font-mona` do `app/layout.tsx` đặt trên `<html>` |
| Thêm `:root:has([data-ui="admin"]) body { font-family: var(--font-body); color: var(--foreground); }` | Lớp portal ra `<body>` thừa kế chữ từ đây. Đã đo: không có luật này thì thân Dialog hiện Be Vietnam Pro (preflight của Tailwind đặt `--font-sans` v3 lên `<html>`) |
| Chú giải đầu tệp | Ghi lý do và trỏ về tệp này |

Test: `components/admin-arc/arc-registry.test.ts` (mọi luật có `:has([data-ui="admin"])`, không còn `outline: none
!important`, khối sáng có `--focus-ring` khác `transparent`, có luật `html[data-pointer]`, hai vai chữ trỏ `--font-mona`, có
luật `body`).

## 2. Việt hoá

Mọi chuỗi tiếng Anh người dùng thấy hoặc máy đọc màn hình đọc. Danh sách chuỗi gốc (đúng đoạn mã, cả dấu nháy) ở
`components/admin-arc/arc-english-strings.ts`; `arc-registry.test.ts` đỏ khi một chuỗi quay lại.

| Tệp | Gốc | Việt |
|---|---|---|
| `avatar/avatar.tsx` | trạng thái đọc nguyên giá trị prop (`, online`) | bảng `statusLabel`: "trực tuyến", "ngoại tuyến" |
| `checkbox/checkbox.tsx` | tên dự phòng "Checkbox" | "Ô đánh dấu" |
| `dialog/dialog.tsx` | "Close dialog" | "Đóng" |
| `filter-toolbar/filter-toolbar.tsx` | "Add filter" | "Thêm bộ lọc" |
| | "Active filters" | "Bộ lọc đang dùng" |
| | "Clear all" | "Xoá hết" |
| | "No filters applied" | "Chưa lọc" |
| | "Back to fields" | "Quay lại" |
| | `Remove {nhãn}: {giá trị}` | `Bỏ {nhãn}: {giá trị}` |
| | câu `role="status"`: "Added …", "… changed to … / any", "Removed …", "All filters cleared" | "Đã thêm …", "… đổi thành … / bất kỳ", "Đã bỏ …", "Đã xoá hết bộ lọc" |
| `pagination/pagination.tsx` | "Pagination", "Previous page", "Next page", `Page {n}` | "Phân trang", "Trang trước", "Trang sau", `Trang {n}` |
| `search-field/search-field.tsx` | "Clear search" | "Xoá nội dung tìm" |
| `select/select.tsx` | placeholder "Select an option" | "Chọn" |
| `sortable-data-table/sortable-data-table.tsx` | caption "Data table" | "Bảng" |
| | "No rows to show" | "Không có dòng nào" |
| | "Select all rows", `Select {mã}` | "Chọn tất cả", `Chọn {mã}` |
| | "Clear selection" | "Bỏ chọn" |
| | dòng đếm: `row`/`rows`, `selected` | "dòng", "đã chọn" |
| | `Sort by {cột}, currently ascending/descending` | `Sắp theo {cột}, đang tăng dần/giảm dần` |
| | câu `role="status"`: `Sorted by …`, `{n} of {m} selected`, "Selection cleared" | `Đã sắp theo …, tăng dần/giảm dần`, `Đã chọn {n} trên {m}`, "Đã bỏ chọn" |
| | `Intl.Collator("en")` | `Intl.Collator("vi")` |
| `tabs/tabs.tsx` | "Scroll tabs left/right" | "Cuộn tab sang trái/phải" |
| `toast-stack/toast-stack.tsx` | nhãn loại đọc trước câu: Success, Info, Warning, Error, In progress | "Xong", "Thông tin", "Cảnh báo", "Lỗi", "Đang xử lý" |
| | "Dismiss notification" | "Đóng thông báo" |
| | "Notifications" | "Thông báo" |

Giá trị `aria-sort` ("ascending", "descending") là từ khoá ARIA, không phải chữ: giữ nguyên. Không component nào dùng
`toLocaleString` hay `Intl.NumberFormat`. Câu lỗi cho lập trình viên (`Render toast stack consumers inside …`) giữ nguyên.

## 3. Vá hành vi

| Tệp | Sửa | Vì sao |
|---|---|---|
| `sortable-data-table/sortable-data-table.tsx` + `.module.css` | Prop `selectOnRowClick` (mặc định `true`). `false`: bấm vào dòng không chọn dòng, Shift không chặn bôi đen, và bảng không mang `data-row-select` nên dòng không đổi con trỏ thành bàn tay (luật CSS `cursor: pointer` chuyển từ `[data-selectable]` sang `[data-row-select]`) | Màn Đơn hàng chỉ chọn bằng ô đánh dấu: bấm vào dòng còn để mở link mã đơn và bôi đen số điện thoại |
| cùng tệp | Prop `showCount` (mặc định `true`). `false`: không vẽ dòng đếm có sẵn và nút "Bỏ chọn" của nó; câu `role="status"` vẫn còn | Thanh chọn nhiều của màn đã đếm |
| cùng tệp | Prop `rowAttributes(row)` trả thuộc tính `data-*` gắn lên `<tr>`, kiểu `RowAttributes` xuất cùng tệp | Làm mờ dòng đã huỷ như v3 (`tr[data-cancelled] td`, CSS module của màn) |
| `dropdown-menu/dropdown-menu.tsx` + `.module.css` | Prop `iconOnly`: trigger chỉ vẽ `icon`, `label` thành `aria-label`; class `.iconOnly` làm trigger vuông cỡ `--control-height-sm` | Menu từng dòng của bảng ("Thao tác DH-…") |
| `search-field/search-field.tsx` + `.module.css` | Prop `hideLabel`: nhãn ẩn cho mắt (class `.srOnly`), máy đọc vẫn đọc | Ô tìm nằm trên thanh công cụ; `skill-accessibility.md` cho phép khi ngữ cảnh đã gọi tên ô |
| `sortable-data-table/sortable-data-table.tsx` | Prop `holdWidths` (mặc định `true`). `false`: bỏ bước đo rồi giữ bề rộng cột, nên bảng ở bố cục tự động thay cho `table-layout: fixed` ở đúng 100% thẻ. **Vá thêm ngoài danh sách của brief; phiên chính đã duyệt 30/09** | Đo 30/09 ở 1280: Arc giữ bảng đúng bằng thẻ và co mọi cột theo tỉ lệ. Cộng với `overflow-wrap: anywhere` của ô, mã đơn, số tiền và tên bị cắt giữa chữ ("DH-/2430", "400.00/0"); bật "Địa chỉ" thì gần như ô nào cũng vỡ. Ở bố cục tự động, cột theo nội dung, và bảng rộng hơn thẻ thì cuộn ngang trong thẻ, đúng ghi chú "bảng rộng thì cuộn ngang trong thẻ" của brief. Màn không sắp xếp nên việc giữ bề rộng cột (để dòng trượt khi sắp xếp) không còn tác dụng |
| `sortable-data-table/sortable-data-table.tsx` + `.module.css` | Prop `density` (`"default"` mặc định, `"compact"`). `"compact"` gắn `data-density` lên bảng; CSS hạ đệm ngang của ô (kể cả nút sắp xếp và ô chọn) từ 16 xuống 12px (`--space-3`); cột đầu cạnh ô chọn giữ 8px. Chỉ từ 621px, nên bố cục gập của điện thoại giữ nguyên. **Phiên chính duyệt 30/09, để bảng đơn vừa khung 1280 mà vẫn giữ luật một dòng của v3** | Đo 30/09: cột mặc định của v3, với luật một dòng, cần khoảng 997px ở đệm 16px, trong khi thẻ ở 1280 chỉ có 959px. 12px là đệm ô của v3 |

Các prop mới (`selectOnRowClick`, `showCount`, `rowAttributes`, `holdWidths`, `density`, `iconOnly`, `hideLabel`) đều có mặc định giữ hành vi gốc. Cài lại bản mới mà quên vá thì `npm run typecheck` đỏ ở
`components/admin-arc/ArcOrdersScreen.tsx`, nơi dùng chúng.

## 4. Mã dự án dựa vào tên class nội bộ của Arc

| Tệp | Dựa vào | Vì sao |
|---|---|---|
| `components/admin-arc/ArcButtonLink.tsx` | class `button`, biến thể (`primary`, `secondary`, `ghost`, `danger`) và cỡ (`sm`, `md`, `lg`) của `registry/components/button/button.module.css` | Arc `Button` bản free không có `href`; wrapper render `next/link` với đúng kiểu nút. Không vá Button. Bản mới đổi tên class thì link mất kiểu nút (build vẫn qua) |

## Cài lại bản mới

1. `npx shadcn@latest add @uiarc/<id> … --overwrite` (không bao giờ `init`). Kiểm `git status` như trên.
2. Vá lại theo mục 1 đến 3; mọi chỗ vá cũ có chú giải `HIVE patch` để tìm bằng `git diff`.
3. `npx vitest run components/admin-arc lib/admin-arc.test.ts` và `npm run typecheck` phải xanh. Chuỗi tiếng Anh mới xuất hiện
   thì thêm vào `arc-english-strings.ts` và dịch.
