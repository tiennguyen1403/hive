# Brief: DESIGN.md cho đợt v5, quản trị chạy Arc

*01/10/2026. Agent `impeccable-documenter`. Không commit.*

- Chỉ ghi `DESIGN.md` và `.impeccable/design.json`.
- Không đụng mã, `registry/`, `prototype/`, `PRODUCT.md`, `README.md`, `tasks/`, `.claude/`, `.impeccable/config*.json`.
  Không thêm ignore cho máy dò: phiên chính quyết phần đó, sau khi hỏi người dùng.
- Không git commit, stash, reset hay checkout.

## 1. Vì sao viết lại

`DESIGN.md` hiện là bản đợt v4 (`3f61c69`):
- phần khách chạy **Feed** (frontmatter, §1–§9);
- khu quản trị là **v3 "NHÃN"**, tả gọn ở §7.

Đợt v5 (30/09–01/10, QĐ-37 đến QĐ-39) đưa **toàn bộ khu quản trị sang bộ Arc** (uiarc.dev, bản free, MIT). Các lát:

| Lát | Commit |
|---|---|
| 0 | `6733d29` |
| 1 | `d3b453c` |
| 2 | `4e7c926` |
| 3 | `f6cb354` |
| 4 | `8a9f595` |
| 5a | `8e3e252` |
| 5b | `17060a1` |
| 6 | `dc6db0a` |

Lát 6 đã xoá mọi mã, CSS, icon và font v3 (Be Vietnam Pro, Unbounded). `--font-sans` và `--font-display` ở `@theme` nay là
Mona Sans. Phần khách không đổi.

Tài liệu phải tả **cái đang chạy**, đọc ra từ code. Chỗ tài liệu và code lệch nhau thì code đúng.

## 2. Nguồn đọc

- **Hợp đồng định dạng:** `.claude/skills/impeccable/reference/document.md`, và `tasks/briefs/v4-design-md.md` (brief lần viết
  trước, cùng khung).
- **Quyết định và phép đo của đợt v5:** `tasks/plan.md`, mục "Đợt v5: quản trị theo Arc" (từ dòng ~2931 tới cuối), gồm
  QĐ-37 đến QĐ-39, "Luật tích hợp", và kết quả từng lát kèm số đo. Các brief `tasks/briefs/v5-lat-*.md`, `backend-b14.md`,
  `backend-b14b.md`.
- **Hệ Arc trong repo:**
  - `registry/foundation.css`: token, khoanh vùng `:root:has([data-ui="admin"])`, các chỗ vá;
  - `registry/PATCHES.md`: mọi chỗ vá, cách cài lại, và mã dự án dựa vào class nội bộ của Arc;
  - `registry/components/*`: các item Arc đã cài;
  - bản sao tài liệu Arc ở `C:\Users\PC\AppData\Local\Temp\claude\D--Code-e-commerce\737078ac-9d1e-4188-94ef-6201cc6b0755\scratchpad\arcdocs\`
    (`skill-design.md`, `skill-components.md`, `skill-accessibility.md`…).
- **Vùng Arc của dự án:** `components/admin-arc/**` (khung, màn, phần tự dựng, CSS Modules, test), `app/admin/**`,
  `lib/current-issue.ts`, `lib/admin-url.ts`, các `lib/*-form.ts`, `lib/*-csv.ts`.
- **Phần khách:** giữ mọi điều còn đúng của bản hiện tại. Chỉ sửa chỗ đã sai vì lát 6, ví dụ font v3, lớp portal v3, bảng
  `z-index`, tệp CSS v3.

## 3. Hình dạng tài liệu

- **Giữ khung 10 mục và số mục** như bản v4, vì nhiều chỗ trích theo số (§3, §6, §8, §9, §10).
- **Frontmatter vẫn là hệ Feed**, tức hệ của cửa hàng. Không trộn token Arc vào frontmatter.
- Hệ Arc tả ở §7, bằng văn xuôi và bảng gọn: token đọc từ `registry/foundation.css` sau vá, chữ, bo góc, khoảng, thành phần.
  Nếu `document.md` cho cách ghi hệ thứ hai trong sidecar `.impeccable/design.json` mà máy dò đọc được theo vùng, làm theo và
  nói rõ trong báo cáo. Nếu không có cách đó, giữ sidecar cho Feed, và báo số phát hiện máy dò chấm vùng Arc theo bảng Feed.
- Đầu tài liệu:
  - một đoạn ngắn: đợt v5, ngày, commit `dc6db0a`;
  - phần khách chạy Feed, quản trị chạy Arc;
  - các bản trước: tài liệu v3 đầy đủ là `git show c018134:DESIGN.md`; bản v4 (Feed cộng quản trị v3 gọn) là
    `git show dc6db0a:DESIGN.md`; mã quản trị v3 là `git show 17060a1:<đường dẫn>`.
- Văn xuôi tiếng Việt, câu ngắn, danh sách khi liệt kê. Tên class, tệp, hàm, token viết nguyên văn tiếng Anh.
- Mỗi luật kèm chỗ nó sống. Mỗi con số lấy từ code hoặc từ phép đo có ghi ngày.

## 4. Nội dung bắt buộc cho vùng Arc

**§1 Nguồn của sự thật:** thêm hàng cho vùng Arc vào bảng nơi sống: token, CSS, vùng, chỗ vá, icon, toast. Thêm luật vùng:
- `foundation.css` khoanh dưới `:root:has([data-ui="admin"])`, nên lớp portal nhận token mà phần khách không;
- `ArcAdminFrame` mang `data-ui="admin"`;
- vá Arc chỉ khi prop có sẵn không làm được, ghi ở `PATCHES.md`, có test (`arc-registry.test.ts`, `arc-english-strings.ts`);
- **cài item mới bằng tay**, vì CLI nay ghi vào `components/arc/` kèm `foundation.css` chưa vá (lát 5b).

**§2 Màu:**
- accent `neutral` của Arc, chỉ nền sáng (QĐ-38);
- `--text-muted` vá 59% → 55% để đạt 4,85:1 trên trắng (lát 1);
- tone của badge: `TONE` trong `ArcOrderCells`, đổi tone nhãn trạng thái sang tone Arc;
- `--danger` cho thanh "sắp hết" và lỗi.

**§3 Chữ:**
- Mona Sans 100% cho cả hai vai của Arc (QĐ-38);
- thang `--text-xs` … `--text-4xl` của Arc, và cỡ thật các màn dùng;
- `tabular-nums` cho số;
- viết hoa trong giá trị lúc gõ (`useCapitals`), không dùng `text-transform`;
- font v3 đã bỏ.

**§4 Hình khối & khoảng cách:**
- bo `--radius-control`, `--radius-surface`, `--radius-pill`;
- ảnh nhỏ 36×45 bo 6px;
- `--drawer-size` 680px;
- Dialog 440px, hộp cắt 720px;
- khung quản trị `min-width: 1180px`, thanh bên 240px;
- `ArcKpi` `aligned` (subgrid), và hàng thẻ của Các số đổi 5 → 3 + 2 theo container query 1099px.

**§5 Vùng chạm:** khu quản trị chỉ cho máy tính, con trỏ chính xác. Cỡ control `sm` của Arc.

**§6 Con trỏ, focus, nhấn, chuyển động, lớp nổi, thứ tự chồng lớp:**
- vòng focus `--focus-ring` (QĐ-39), tắt bằng `html[data-pointer]`;
- `POINTER_PROBE` chỉ nhận `pointerdown` có `isTrusted`, vì Motion phát `pointerdown` giả khi nhấn Enter trên nút Arc;
- chuyển động Motion của Arc (`lib/motion-tokens.ts`);
- **lớp nổi:** Dialog cho quyết định và form ngắn, Drawer cho form dài, menu, Select, toast `ToastStack` ở góc dưới phải;
- `keepOpenForToasts`: bấm trên toast không đóng hộp, có test canh;
- trả focus về chỗ đã mở hộp: `onCloseAutoFocus`; đổi số ở Các số thì giữ ý định focus khi segment dựng lại;
- bảng `z-index` mới cho Feed và Arc, đọc từ CSS.

**§7 Hai bề mặt:**
- **Cửa hàng (Feed):** như bản hiện tại.
- **Quản trị (Arc):** viết lại toàn bộ:
  - khung, thanh bên, đầu trang (`ArcPage.module.css`);
  - bảng (`SortableDataTable` `density="compact"`, `holdWidths={false}`, menu dòng chỉ icon);
  - thanh công cụ (tìm 350ms, `FilterMenu` và chip, `SegmentedControl`);
  - tab có số đếm;
  - lọc và trang trong URL (QĐ-8);
  - cột ở `brand.adminCols`;
  - "số hiện tại" (`currentIssueNo`);
  - "Dữ liệu mẫu" và "Đặt lại dữ liệu mẫu";
  - phiếu giao in.

**§8 Thành phần, bảng tra:** hai nhóm:
- item Arc đã cài, kèm chỗ vá;
- phần dự án tự dựng trên token Arc: `ArcKpi`, `ArcMeter`, `ArcCountField`, `ArcPhotoPicker`, `ArcSearchBox`, `ArcButtonLink`,
  `ArcPhotoRow`, `ArcCropDialog`, các hộp và drawer.

**§9 Ba quy tắc không thương lượng:** giữ số thứ tự. Thêm ví dụ của vùng Arc: thanh công cụ không vẽ ở tab chỉ có mẫu hé lộ
(quy tắc 3); nút gọi tên thứ còn thiếu.

**§10 Đã đo:** các phép đo có ngày của đợt v5:
- lát 0: JS `/admin/orders` +118 KB nén;
- lát 1: tương phản;
- lát 4: 137px chữ mỗi thẻ ở 1280;
- lát 6: CSS `/` 32,2 → 23,9 KB nén, 17 tệp font bớt, 169 cặp ảnh 0 lệch do mã, 1.763 test;
- số phát hiện của máy dò trước và sau lần viết lại này.

**Dòng "không canonize"** (khiếm khuyết thật đang mang theo):
- chữ viết tắt `Avatar` `sm` 10px (ruột Arc);
- `ArcOrderCells` kéo danh sách 3.321 phường vào 4 trang quản trị (người dùng chọn để sau, 01/10);
- advisory `design-system-radius` ở ruột Arc và ở góc đồng tâm của `ArcCountField`;
- tự dò thêm nếu thấy.

## 5. Kiểm trước khi nộp
- Chạy lại `.claude/skills/impeccable/scripts/impeccable.cmd detect --json app components registry`. Đếm phát hiện theo vùng:
  `components/feed` và `app/styles/feed`, `components/admin-arc`, `registry/`. So với trước lần viết lại.
- Mọi đường dẫn tệp và tên token trong tài liệu phải tồn tại. Kiểm bằng script, ghi kết quả.
- Báo cáo theo hợp đồng output của agent, gửi trọn trong tin cuối.
