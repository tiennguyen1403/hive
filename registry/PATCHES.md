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
vá hành vi). `input` được vá ở lát 1 (mục 3).

## Lần cài 30/09/2026 (đợt v5, lát 1)

- **CLI:** `shadcn` 4.21.0, gọi bằng `npx shadcn@latest`, với `components.json` đang có. Không `init`.
- **Lệnh:**
  ```
  printf 'n\nn\nn\nn\n' | npx shadcn@latest add @uiarc/breadcrumb @uiarc/stepper @uiarc/combobox @uiarc/empty-state --yes
  ```
- **Vì sao có `printf 'n…'`:** mỗi item kéo theo `arc-foundation` (`registry/foundation.css`, `registry/motion-tokens.ts`,
  `lib/motion-tokens.ts`). `foundation.css` đã vá (mục 1) nên khác bản gốc, và CLI hỏi "The file foundation.css already
  exists. Would you like to overwrite?" **kể cả khi có `--yes`**. Không có gì trả lời thì CLI thoát mà không ghi tệp nào; trả
  lời `n` thì nó bỏ qua `foundation.css` và chép phần còn lại. Hai tệp `motion-tokens.ts` trùng bản gốc nên CLI tự bỏ qua.
  **Không bao giờ trả lời `y`** và không dùng `--overwrite` cho `arc-foundation`: bản vá khoanh vùng sẽ mất.
- **4 item:** breadcrumb, stepper, combobox, empty-state. **CLI tạo 8 tệp** (`.tsx` + `.module.css` của mỗi item trong
  `registry/components/<id>/`), bỏ qua 3 tệp của `arc-foundation`.
- **Phụ thuộc:** không thêm (`motion`, `lucide-react` đã có từ lát 0). `package.json` và `package-lock.json` không đổi.
- **Sau khi cài, `git status`** chỉ thêm `registry/components/{breadcrumb,combobox,empty-state,stepper}/`.

Không sửa: `empty-state` (không có chuỗi tiếng Anh; icon mặc định `Folder` không phải chữ).

## Lần cài 30/09/2026 (đợt v5, lát 2)

- **CLI:** `shadcn` 4.21.0, gọi bằng `npx shadcn@latest`, với `components.json` đang có. Không `init`.
- **Lệnh:**
  ```
  printf 'n\nn\nn\nn\n' | npx shadcn@latest add @uiarc/bar-chart --yes
  ```
  CLI hỏi ghi đè `foundation.css`, trả lời `n` như lát 1.
- **1 item:** bar-chart. **CLI tạo 2 tệp** (`bar-chart.tsx`, `bar-chart.module.css` trong `registry/components/bar-chart/`),
  bỏ qua 3 tệp của `arc-foundation` (`foundation.css` vì trả lời `n`; hai `motion-tokens.ts` trùng bản gốc).
- **Phụ thuộc:** không thêm (`motion` đã có từ lát 0). `package.json` và `package-lock.json` không đổi.
- **Sau khi cài, `git status`** chỉ thêm `registry/components/bar-chart/`.
- Bản gốc tải ở `https://uiarc.dev/r/bar-chart.json`. `diff` với bản đã vá chỉ ra 6 dòng Việt hoá (mục 2), prop `formatTick`
  (mục 3) và các dòng chú giải `HIVE patch`. `bar-chart.module.css` không đổi.
- Cùng lát, phiên chính duyệt thêm một chỗ vá CSS cho `search-field` (mục 3), cài từ lát 0.

## Lần cài 01/10/2026 (đợt v5, lát 3)

- **CLI:** `shadcn` 4.21.0, gọi bằng `npx shadcn@latest`, với `components.json` đang có. Không `init`.
- **Lệnh:**
  ```
  printf 'n\nn\nn\nn\n' | npx shadcn@latest add @uiarc/drawer --yes
  ```
  CLI hỏi ghi đè `foundation.css`, trả lời `n` như lát 1.
- **1 item:** drawer. **CLI tạo 2 tệp** (`drawer.tsx`, `drawer.module.css` trong `registry/components/drawer/`), bỏ qua 3
  tệp của `arc-foundation` (`foundation.css` vì trả lời `n`; hai `motion-tokens.ts` trùng bản gốc).
- **Phụ thuộc:** không thêm (`@radix-ui/react-dialog`, `motion`, `lucide-react` đã có từ lát 0). `package.json` và
  `package-lock.json` không đổi.
- **Sau khi cài, `git status`** chỉ thêm `registry/components/drawer/`.
- Vá: Việt hoá tên nút đóng (mục 2) và vòng focus bàn phím của nút đó (mục 3). Màn dự án dựa vào một biến nội bộ của
  Drawer để đặt bề rộng (mục 4). Cùng lát, phiên chính yêu cầu vá vòng focus của `select` (mục 3), cài từ lát 0.

## Lần sửa 01/10/2026 (đợt v5, lát 4)

- **Không cài item mới.** Màn Các số dùng các item đã có: `dialog`, `input`, `select`, `badge`, `dropdown-menu`,
  `sortable-data-table`, `button`. `package.json`, `package-lock.json` và `registry/foundation.css` không đổi.
- **Vá `select`** (mục 3): option nhận trường tuỳ chọn `note`, chữ phụ ở cuối dòng trong danh sách, như `Select` của v3 in họ
  ("Áo khoác") bên phải loại ("Áo khoác dù") ở hộp "Thêm mẫu hé lộ" (brief lát 4, §3.1). Không có chuỗi tiếng Anh mới.

## Lần sửa 01/10/2026 (đợt v5, lát 5a)

- **Không cài item mới, không vá ruột Arc.** Bảng Mẫu và hai tấm tồn kho dùng các item đã có: `tabs`, `search-field`,
  `filter-toolbar`, `segmented-control`, `sortable-data-table`, `dropdown-menu`, `badge`, `button`, `drawer`, `select`,
  `input`. `package.json`, `package-lock.json`, `registry/foundation.css` và `registry/components/` không đổi.
- Ô số có nút bớt và thêm (`components/admin-arc/ArcCountField.tsx`) dựng trong dự án bằng token Arc, vì bản free không có.
- Hai tấm tồn kho dùng lại class bề rộng 680px của form mã giảm giá (mục 4).

## Lần cài 01/10/2026 (đợt v5, lát 5b)

- **CLI đã đổi chỗ cài.** Lệnh của brief, `printf 'n
n
n
n
' | npx shadcn@latest add @uiarc/textarea --yes` (CLI vẫn
  4.21.0), lần này **không** hỏi ghi đè `registry/foundation.css` mà ghi 5 tệp mới vào `components/arc/`:
  `components/arc/foundation.css` (bản gốc, chưa vá), `components/arc/motion-tokens.ts`, `components/arc/lib/motion-tokens.ts`,
  `components/arc/textarea/textarea.tsx`, `components/arc/textarea/textarea.module.css`, và in "Arc installs into an arc/
  folder under your components alias … Arc files import each other with relative paths". Đo ở
  `https://uiarc.dev/r/textarea.json`: mỗi tệp nay khai `target` `@components/arc/…`, nội dung vẫn là bản Arc đang dùng
  (`motion-tokens.ts` trùng từng dòng, `foundation.css` chỉ khác ở các chỗ vá mục 1). `git status` có `components/arc/`, ngoài
  danh sách cho phép, nên **đã hoàn lại** (xoá thư mục vừa tạo) theo luật của brief lát 0, §3.1.
- **Cài tay** theo mục "Manual" trong tài liệu Arc (`textarea.md`: chép nguồn vào `registry/components/textarea/`, giữ đường
  dẫn `@/`): `registry/components/textarea/textarea.tsx` và `textarea.module.css` là đúng `files[].content` của
  `https://uiarc.dev/r/textarea.json`, đổi **một dòng** `import { motionTokens } from "../lib/motion-tokens"` thành
  `"@/lib/motion-tokens"`, như mọi item khác trong `registry/components/`. Không phụ thuộc mới (`motion` có từ lát 0).
  `package.json`, `package-lock.json`, `registry/foundation.css` không đổi; `git status` chỉ thêm `registry/components/textarea/`.
- **1 item:** textarea. Không có chuỗi tiếng Anh (nhãn, mô tả, lỗi đều do prop), nên không Việt hoá gì.
- **Vá `input`** (mục 3): prop `prefix`, đoạn cố định ở đầu ô ("S06 –" của ô tên mẫu).
- Form mẫu dựa thêm vào kiểu nút của Arc (file picker) và bề rộng Dialog (mục 4).

## Lần sửa 01/10/2026 (đợt v6, lát E0): song ngữ

- **Không cài item mới.** `package.json`, `package-lock.json`, `registry/foundation.css` không đổi.
- **Mọi chỗ Việt hoá ở mục 2 nay theo ngôn ngữ của trang** (QĐ-40). Mỗi chuỗi thành một cặp `{ vi, en }` viết ngay tại chỗ:
  bản `vi` là cột Việt, bản `en` là **đúng chữ gốc của Arc** (cột Gốc). Cặp được chọn bằng `pick` / `picker` (`lib/i18n.ts`)
  theo `useLocale()` (`components/i18n/LocaleContext.tsx`). Context đó do layout gốc cấp, và `ArcAdminFrame` cấp lại quanh
  vùng Arc, kể cả các lớp portal ra `<body>`. Ngoài mọi provider, `useLocale()` trả `"vi"`.
- **Default prop có chữ** (`label = "…"`, `placeholder = "…"`, `caption`, `emptyMessage`, `itemName`, `averageLabel`…) không
  còn là default trong danh sách tham số, vì default không gọi được hook. Tham số đổi tên thành `…Prop`, và thân component
  đặt `const label = labelProp ?? t({ vi, en })`. Màn nào truyền prop thì vẫn thắng như trước.
- **Hàm ngoài component** nhận thêm tham số ngôn ngữ: `describeChange(before, after, locale)` của `filter-toolbar`.
- **Số và thứ tự theo ngôn ngữ:** `bar-chart` có một `Intl.NumberFormat` cho mỗi ngôn ngữ (`vi-VN`, và `en-US` như Arc gốc),
  tạo một lần ở cấp module để hàm định dạng mặc định giữ nguyên danh tính giữa các lần vẽ; `sortable-data-table` có một
  `Intl.Collator` cho mỗi ngôn ngữ (`vi`, `en`) và sắp lại khi đổi ngôn ngữ.
- Mỗi chỗ có chú giải `HIVE patch` mới hoặc sửa lại; mỗi tệp nhập `useLocale` với chú giải "the page's language, from the Arc
  zone's frame".
- **Vá thêm `segmented-control`** (mục 3): `Segment.lang`, cho nút đổi ngôn ngữ ở chân thanh bên.
- **Lịch:** bản free đã cài không có item lịch nào (không có `calendar`, `date-picker`; tìm `weekday`, `getDay` trong
  `registry/components/` không ra gì), nên luật "lịch bắt đầu thứ Hai ở cả hai thứ tiếng" chưa có chỗ áp.
- **Test:** `components/admin-arc/arc-english-strings.ts` đổi 22 mục (đánh dấu "E0" trong tệp): mục chỉ là chuỗi trần nay khớp
  với bản `en` của cặp, nên được viết lại bắt đầu từ cú pháp gốc quanh chữ đó (thuộc tính, lời gọi, tham số mặc định), là thứ
  cặp `{ vi, en }` không bao giờ tái tạo. Kiểm bằng cách dựng lại mã gốc từ HEAD (đảo chữ Việt về chữ Anh): cả 22 mục là chuỗi
  con của mã gốc. Thêm `ARC_ENGLISH_SIDE` (62 mục): bản `en` của từng cặp phải có trong tệp. `arc-registry.test.ts` thêm ba
  test: mọi tệp đã vá đọc `useLocale()`, mỗi bản `en` là chữ gốc, và `Segment.lang`. Test `formatTick` đổi một dòng
  (`formatTick = formatValue` thành `formatTick = formatTickProp ?? formatValue`), vì default nay đặt trong thân.

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
| Thêm `:root:has([data-ui="admin"]) body { font-family: var(--font-body); color: var(--foreground); }` | Lớp portal ra `<body>` thừa kế chữ từ đây. Đã đo (lát 0): không có luật này thì thân Dialog hiện Be Vietnam Pro, vì preflight của Tailwind đặt `--font-sans` v3 lên `<html>`. Từ lát 6, `--font-sans` là Mona Sans; luật vẫn giữ chữ và màu chữ của vùng cho lớp portal |
| Khối sáng: `--text-muted: oklch(55% 0 0)` (gốc `var(--neutral-7)`, 59%). **Lát 1, phiên chính duyệt 30/09** | Luật 4,5:1 cho chữ là của chính Arc (`skill-accessibility.md`), mà 59% chỉ đạt khoảng 4,1:1 trên nền trắng và 3,9:1 trên `--surface-muted`. Chữ mờ này có ở nhãn và mô tả mốc chưa tới của Stepper, mô tả dưới Input, placeholder, tiêu đề cột của bảng. 55%: tính từ token 4,85:1 trên `--surface` và 4,55:1 trên `--surface-muted`; đo trên trang (màu vẽ ra sRGB 8 bit, 30/09) 4,88:1 và 4,60:1. Khối tối giữ nguyên (QĐ-38 không bật chế độ tối) |
| Chú giải đầu tệp | Ghi lý do và trỏ về tệp này |

Test: `components/admin-arc/arc-registry.test.ts` (mọi luật có `:has([data-ui="admin"])`, không còn `outline: none
!important`, khối sáng có `--focus-ring` khác `transparent`, có luật `html[data-pointer]`, hai vai chữ trỏ `--font-mona`, có
luật `body`, và từ lát 1 `--text-muted` đạt 4,5:1 trên `--surface` lẫn `--surface-muted`).

## 2. Việt hoá, rồi song ngữ

Mọi chuỗi tiếng Anh người dùng thấy hoặc máy đọc màn hình đọc. Danh sách chuỗi gốc (đúng đoạn mã, cả dấu nháy) ở
`components/admin-arc/arc-english-strings.ts`; `arc-registry.test.ts` đỏ khi một chuỗi quay lại.

**Từ đợt v6, lát E0:** mỗi dòng dưới đây là một cặp `{ vi: <cột Việt>, en: <cột Gốc> }` trong mã, chọn theo ngôn ngữ của
trang (`useLocale()`, mục "Lần sửa 01/10/2026 (đợt v6, lát E0)"). Trang tiếng Việt in cột Việt như trước; trang tiếng Anh in
đúng chữ gốc của Arc. Hai dòng định dạng số và sắp xếp cũng theo ngôn ngữ: `vi-VN` / `en-US`, `vi` / `en`.

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
| `breadcrumb/breadcrumb.tsx` (lát 1) | `ariaLabel` mặc định "Breadcrumb" | "Đường dẫn" |
| `stepper/stepper.tsx` (lát 1) | trạng thái đọc sau mỗi bước: Completed, Not started, Error | "Đã xong", "Chưa bắt đầu", "Lỗi" |
| | `label` mặc định "Progress" | "Tiến trình" |
| | `completeLabel` mặc định "All steps complete" | "Đã xong mọi bước" |
| | câu `aria-live`: `Step {n} of {m}: {nhãn}` | `Bước {n} trên {m}: {nhãn}` |
| `combobox/combobox.tsx` (lát 1) | `placeholder` mặc định "Search or select…" | "Tìm hoặc chọn…" |
| | `emptyMessage` mặc định "No matches found" | "Không có mục nào khớp" |
| | nút xoá lựa chọn "Clear selection" | "Bỏ chọn" |
| | tên danh sách `{nhãn} options` | `Danh sách {nhãn}` |
| `bar-chart/bar-chart.tsx` (lát 2) | `averageLabel` mặc định "Daily average" | "Trung bình mỗi ngày" |
| | `valueLabel` mặc định "Total" | "Tổng" |
| | `categoryLabel` mặc định "Day" | "Ngày" |
| | nhãn đường trung bình `Avg {giá trị}` (viết cứng) | `TB {giá trị}` |
| | câu tóm tắt của `role="img"`: ` Highest {ngày}, …`, ` Lowest {ngày}, …` (viết cứng) | ` Cao nhất {ngày}, …`, ` Thấp nhất {ngày}, …` |
| | `aria-valuetext` khi không có dữ liệu "No data" (viết cứng) | "Chưa có dữ liệu" |
| | tên thanh kéo `{nhãn}, explore by {loại}` (viết cứng) | `{nhãn}, xem theo {loại}` |
| | định dạng số mặc định `Intl.NumberFormat("en-US")` | `Intl.NumberFormat("vi-VN")` |
| `drawer/drawer.tsx` (lát 3) | tên nút đóng `aria-label="Close drawer"` (viết cứng) | "Đóng", như nút đóng của Dialog |

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
| `bar-chart/bar-chart.tsx` (lát 2, phiên chính yêu cầu 30/09) | Prop `formatTick` (mặc định bằng `formatValue`): định dạng trục giá trị, tức nhãn các vạch và nhãn "TB …" cạnh chúng. Dòng đầu (lúc nghỉ và lúc rê chuột), câu tóm tắt, `aria-valuetext`, bảng cho máy đọc màn hình và câu `aria-live` vẫn dùng `formatValue` | Tổng quan cần số đủ ở dòng đầu ("1.018.286₫", `vnd`) nhưng số gọn ở trục hẹp 52px ("1tr₫", `compactVnd`). Arc chỉ có một `formatValue` cho cả hai chỗ; với `compactVnd`, dòng đầu 36px chỉ còn "1tr₫", làm tròn tới mức không còn nghĩa |
| `search-field/search-field.module.css` (lát 2) | Thêm `.shell button { cursor: pointer; }` sau luật gốc của nút xoá | Nút xoá nội dung tìm giữ mũi tên của trình duyệt, trong khi mọi nút Arc khác có bàn tay; máy dò `tools/layout-sweep.js` coi mũi tên trên một nút là lỗi (`arrowCursor`, đo 30/09 ở `/admin/log?q=zzz`). Nút này cũng có trên `/admin/orders` khi đang tìm |
| `input/input.tsx` (lát 1) | Prop `hideLabel` (mặc định `false`): nhãn mang class `.srOnly` có sẵn trong `input.module.css` thay cho `.label`, nên ẩn cho mắt mà máy đọc vẫn đọc. Không đổi CSS | Ô "Thêm ghi chú…" của panel "Ghi chú nội bộ" trên trang chi tiết đơn: tiêu đề panel đã gọi tên ô, như ô tìm trên thanh công cụ (`skill-accessibility.md`). Cùng cách `SearchField` `hideLabel` |
| `select/select.module.css` (lát 3, phiên chính yêu cầu 01/10) | `.trigger:focus-visible`: `outline: 3px solid var(--accent-subtle); outline-offset: 0` thành `outline: 2px solid var(--focus-ring); outline-offset: 2px`. Giữ `border-color: var(--accent)` | QĐ-39. Quầng gốc là `--accent-subtle` (accent 10%), gần như không thấy trên nền trắng: đi bằng Tab vào "Loại" hay "Hình thức giao" chỉ còn viền 1px đổi màu, trong khi mọi điều khiển Arc khác có vòng 2–3px `--focus-ring`. Bấm chuột thì `--focus-ring` trong suốt như mọi vòng khác; viền accent vẫn đổi như Arc gốc |
| `select/select.tsx` + `.module.css` (lát 4, brief yêu cầu) | Kiểu `options` thêm `note?: string`. Mỗi dòng in `note` trong một `<span className={styles.note}>` sau `ItemText` và trước `ItemIndicator`, chỉ khi có `note`: không có thì dòng y như Arc gốc. CSS `.note`: `margin-left: auto` (dồn về cuối dòng; phần đệm phải 34px của `.item` vẫn giữ chỗ cho dấu chọn), `padding-left: var(--space-3)`, `color: var(--text-secondary)`, `font-size: var(--text-xs)` (cỡ Arc dùng cho chữ phụ cuối dòng, `.itemMeta` của `filter-toolbar`), `white-space: nowrap` | Hộp "Thêm mẫu hé lộ" (lát 4): v3 in họ của từng loại bên phải dòng ("Áo khoác dù" · "Áo khoác"). Nằm ngoài `ItemText` nên ô chọn và giá trị Radix đọc cho máy đọc màn hình chỉ có nhãn; tên của dòng (`aria-labelledby` trỏ vào `ItemText`) cũng chỉ là nhãn. Không mất gì: họ luôn là một phần của tên loại (`FAMILY_LABELS`, `data/types.ts`) |
| `drawer/drawer.module.css` (lát 3) | Thêm `.close:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 3px; }`, đúng luật của nút đóng trong `dialog.module.css` | QĐ-39: giữ vòng focus bàn phím. Nút đóng của Drawer bản gốc không có luật `:focus-visible` nào (Arc dựa vào luật `outline: none !important` toàn cục mà dự án đã xoá, mục 1), nên đi bằng Tab thì Chrome vẽ vòng mặc định của nó, khác vòng 2–3px `--focus-ring` của mọi điều khiển Arc khác. Radix đưa focus vào nút này đầu tiên khi Drawer mở, nên vòng đó là thứ đầu tiên người dùng bàn phím thấy. Bấm chuột thì `--focus-ring` trong suốt như mọi vòng khác |
| `segmented-control/segmented-control.tsx` (đợt v6, lát E0, brief yêu cầu) | Kiểu `Segment` thêm `lang?: string`; nút của mỗi mục mang `lang={option.lang}`. Không có `lang` thì nút y như Arc gốc (React bỏ thuộc tính `undefined`). Không đổi CSS | Nút đổi ngôn ngữ ở chân thanh bên quản trị: hai mục "Tiếng Việt" và "English", mỗi mục viết bằng chính ngôn ngữ của nó nên cần `lang` riêng để máy đọc màn hình đọc đúng giọng (brief lát E0, §2.5). `Segment.label` là chuỗi, nên không gói được `<span lang>` mà không vá |
| `input/input.tsx` + `.module.css` (lát 5b, brief yêu cầu) | Prop `prefix` (chuỗi). Có `prefix` thì ô nằm trong một khung `.affix` cùng một đoạn `.prefix` đứng đầu: nền `--surface-muted`, ngăn với phần gõ bằng viền phải 1px `--border`, chữ `--text-sm` đậm 500. Đoạn có id `{id}-prefix`, và ô nhập có `aria-describedby` trỏ tới nó (trước câu mô tả và câu lỗi), như v3. Khung nhận viền, bo góc, hover, vòng focus, viền lỗi và trạng thái vô hiệu của ô; ô bên trong bỏ viền và vòng của nó. Bấm vào đoạn thì con trỏ vào ô (v3 làm được nhờ `pointer-events: none`). Không có `prefix` thì Input y như Arc gốc | Form mẫu (lát 5b): ô tên mẫu của một số mang mã số ở đầu ("S06 –", `stylePrefix`), gõ quanh nó chứ không gõ nó. Arc `Input` không có phần đầu ô |

Các prop mới (`selectOnRowClick`, `showCount`, `rowAttributes`, `holdWidths`, `density`, `iconOnly`, `hideLabel` của
`SearchField` và của `Input`, `formatTick` của `BarChart`) đều có mặc định giữ hành vi gốc. Cài lại bản mới mà quên vá thì
`npm run typecheck` đỏ ở `components/admin-arc/ArcOrdersScreen.tsx`, `components/admin-arc/ArcOrderScreen.tsx` và
`components/admin-arc/ArcRevenueChart.tsx`, nơi dùng chúng. Chỗ vá CSS của `search-field`, prop `formatTick`, vòng focus
của nút đóng `drawer` và của `select` (lát 3) còn có test riêng trong `components/admin-arc/arc-registry.test.ts`.

Trường `note` của option `Select` (lát 4) thì `npm run typecheck` **không** bắt được khi mất: `ArcTeaserDialog.tsx` đưa vào
một mảng lấy từ `kindOptions()` (`lib/teaser-form.ts`), không phải object literal, nên TypeScript không báo thuộc tính thừa;
bản Arc gốc chỉ lặng lẽ bỏ chữ phụ. Test "lets a select option carry a note…" trong `arc-registry.test.ts` canh chỗ vá này:
kiểu có `note`, `note` nằm sau `ItemText` và trước `ItemIndicator`, và luật `.note` có `margin-left: auto` cùng
`--text-secondary`.

Prop `prefix` của `input` (lát 5b) cũng **không** bị `npm run typecheck` bắt khi mất: `prefix` còn là thuộc tính HTML (RDFa) trong
kiểu của React, nên bản Arc gốc vẫn nhận nó và lặng lẽ đưa xuống `<input prefix="S06 –">`, không vẽ gì. Bốn test "the input's
prefix" trong `arc-registry.test.ts` canh chỗ vá: kiểu và việc tách `prefix` khỏi `...props`, id và `aria-describedby`, nhánh
không có `prefix`, và các luật `.prefix`, `.affix`.

## 4. Mã dự án dựa vào tên class nội bộ của Arc

| Tệp | Dựa vào | Vì sao |
|---|---|---|
| `components/admin-arc/ArcButtonLink.tsx` | class `button`, biến thể (`primary`, `secondary`, `ghost`, `danger`) và cỡ (`sm`, `md`, `lg`) của `registry/components/button/button.module.css` | Arc `Button` bản free không có `href`; wrapper render `next/link` với đúng kiểu nút. Không vá Button. Bản mới đổi tên class thì link mất kiểu nút (build vẫn qua) |
| `components/admin-arc/ArcPromoDrawer.module.css` (lát 3) | biến `--drawer-size` mà `.content` của `registry/components/drawer/drawer.module.css` đọc để đặt bề rộng panel, và thuộc tính `data-side` trên panel | Form mã giảm giá rộng 680px như `AdminSheet` bản `wide` của v3 (brief lát 3, §3.4), trong khi Drawer cố định `min(30rem, …)` và không có prop bề rộng. Class đi vào panel qua `className` (prop Radix có trong tài liệu); luật `.drawer[data-side]` đặt lại biến, thuộc tính giúp nó thắng luật gốc bất kể thứ tự nạp CSS. Không vá Drawer. Bản mới đổi tên biến thì form về 480px (build vẫn qua). Từ lát 5a hai tấm tồn kho (`ArcStockDrawer.tsx`) dùng lại đúng class này, nên cũng về 480px và lưới màu × size của chúng chật lại |
| `components/admin-arc/ArcPhotoRow.tsx` (lát 5b) | class `button`, `secondary`, `sm` của `registry/components/button/button.module.css`, như `ArcButtonLink` | Ba nút chọn tệp "Chọn tệp", "Tải ảnh thật", "Đổi ảnh" là `<label>` bọc ô file ẩn (brief lát 5b, §3.5), nên không dùng được Arc `Button`; nhãn mượn kiểu nút. Bản mới đổi tên class thì ba nhãn mất kiểu nút (build vẫn qua) |
| `components/admin-arc/ArcCropDialog.module.css` (lát 5b) | Arc đặt bề rộng Dialog (`width: min(…, 440px)` ở `.content`) lên đúng phần tử nhận `className` của `DialogContent`, và thuộc tính `data-state` Radix gắn lên đó | Hộp "Chọn vùng cắt" rộng 720px như v3 (brief lát 5b, §2). Luật `.dialog[data-state]` thắng luật gốc bất kể thứ tự nạp CSS. Không vá Dialog. Bản mới đặt bề rộng ở phần tử khác thì hộp về 440px (build vẫn qua) |

## Cài lại bản mới

1. `npx shadcn@latest add @uiarc/<id> … --overwrite` (không bao giờ `init`). Kiểm `git status` như trên. `--overwrite` ghi đè
   cả `registry/foundation.css` (kéo theo qua `arc-foundation`): vá lại mục 1 ngay. Cài item **mới** thì không dùng
   `--overwrite`, trả lời `n` cho câu hỏi ghi đè `foundation.css` (lần cài lát 1).
   **Từ 01/10/2026 (lát 5b) registry của Arc đặt mọi tệp vào `components/arc/`** với đường dẫn tương đối, nên lệnh trên không
   còn ghi vào `registry/`. Đừng chạy nó như cũ: tải `https://uiarc.dev/r/<id>.json`, chép `files[].content` vào
   `registry/components/<id>/` và đổi import `../lib/motion-tokens` thành `@/lib/motion-tokens` (lần cài lát 5b), hoặc để
   phiên chính quyết một cách cài mới.
2. Vá lại theo mục 1 đến 3; mọi chỗ vá cũ có chú giải `HIVE patch` để tìm bằng `git diff`. Từ đợt v6, vá chữ nghĩa là
   bọc chữ gốc của Arc thành bản `en` của một cặp `{ vi, en }` đọc `useLocale()` (mục "Lần sửa 01/10/2026 (đợt v6, lát E0)"),
   không phải thay chữ gốc.
3. `npx vitest run components/admin-arc lib/admin-arc.test.ts` và `npm run typecheck` phải xanh. Chuỗi tiếng Anh mới xuất hiện
   thì thêm vào `arc-english-strings.ts` và dịch.
