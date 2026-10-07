# Lượt rà v6, lát R2: quản trị

*Phiên chính viết 07/10/2026. Agent: `ui-implementer`. Nguồn: bước soát lượt rà v6 (ảnh ở `.playwright-cli/audit-v6/`). Người dùng
chốt 07/10: bốn câu hỏi thiết kế, và nhận cả 52 câu chữ đề xuất.*

## 0. Đọc trước

- `.agents/skills/design-taste-frontend/SKILL.md`, `.claude/skills/playwright-cli/SKILL.md`.
- `DESIGN.md`: phần Arc; mục Ngôn ngữ; §4 (quản trị chỉ chạy máy tính, `min-width: 1180px`).
- `tasks/plan.md`: mục "Lượt rà toàn app, đợt v6", QĐ-37..40, QĐ-44.
- `registry/PATCHES.md`.
- Lượt này được đổi pixel bản VI, nhưng chỉ ở những chỗ brief này nêu.

## 1. Việc

### 1.1 Một kiểu giờ cho cả quản trị (F6; câu chữ G1–G4 đã duyệt)

Kiểu chung: "giờ · ngày", VI "08:05 · 08/10", EN "08:05 · 8 Oct".
- **G1** Tổng quan, hàng "Cần xử lý" của đơn đang chờ (`lib/admin-rows.ts`, `dateTimeLabel`):
  - VI "hạn 08:05 ngày 08/10" thành "hạn 08:05 · 08/10";
  - EN "due 08:05, 8 Oct" thành "due 08:05 · 8 Oct".
- **G2** cùng hàng đó, đơn đã trả:
  - VI "Đã thanh toán 07:52 05/10" thành "Đã thanh toán 07:52 · 05/10";
  - EN "Paid 07:52 5 Oct" thành "Paid 07:52 · 5 Oct".
- **G3** sổ đơn, dòng dưới nhãn trạng thái (`orderNote`):
  - VI "hạn 08:05 08/10" thành "hạn 08:05 · 08/10";
  - EN "due 08:05 8 Oct" thành "due 08:05 · 8 Oct".
- **G4** sổ đơn, cột Thanh toán (`ArcOrderCells.tsx` `PaymentCell`) của đơn đang chờ: bỏ dòng "hạn …", vì hạn đã in dưới nhãn trạng
  thái trên cùng hàng. Ô chỉ còn "Chuyển khoản" / "Bank transfer" hoặc "Thẻ" / "Card". Dòng "nhận 07:52 · 05/10" / "paid 07:52 · 5
  Oct" của đơn đã trả thì giữ.
- Rà toàn quản trị (Tổng quan, Đơn hàng, trang một đơn, Khách hàng, Nhật ký, phiếu giao) xem còn kiểu giờ nào khác. Tìm thấy thì sửa
  cho cùng kiểu, và liệt kê trong báo cáo.

### 1.2 Tên tài khoản quản trị mẫu ở chân thanh bên (N1; người dùng chốt)

`ArcSidebar.tsx` (khoảng dòng 152) đang in tên đã lưu "Quản lý cửa hàng" với `lang="vi"`. Với **tài khoản quản trị mẫu**, nhận ra
bằng handle của quản trị mẫu (xem `DEMO_ADMIN` hoặc chỗ tương đương), in nhãn vai theo ngôn ngữ:
- VI "Quản lý cửa hàng";
- EN "Store manager", không mang `lang="vi"`.

Tài khoản quản trị khác vẫn in tên đã lưu như cũ. Email giữ nguyên.

### 1.3 Ô "Mẫu" trong bảng món của trang một đơn (F12; người dùng chốt)

- **Hiện trạng:** ô in "S05 – KHÓI · Áo thun oversize", nên ở 1280 dòng thì 1 dòng, dòng thì 2 dòng, không đều.
- **Sửa:** tên mẫu ở dòng trên; loại thành dòng phụ, chữ nhỏ màu nhạt, ở **mọi** dòng. Dùng kiểu ô hai dòng sẵn có của Arc (stack /
  line, như `PaymentCell`). Tiêu đề cột không đổi.
- **Đạt khi:** ở 1280 và 1440, cả VI lẫn EN, tên một dòng và loại một dòng. Đo trên DH-2418, DH-2425, DH-2430 và DH-2311.

### 1.4 Ô "Loại · form" của bảng Mẫu (F13, F25; G5)

- **Sửa:** bỏ form khi tên loại đã chứa nó, so không dấu và không phân biệt hoa thường. VI "Áo thun oversize · oversize" thành "Áo thun
  oversize"; EN "Oversized tee · oversized" thành "Oversized tee".
- Ô màu ra 2 dòng thì chấp nhận, không sửa.

### 1.5 `lang` trong menu Select (F14)

- **Sai gì:** `registry/components/select/select.tsx` (khoảng dòng 83) gắn `lang={option.lang}` lên `SelectPrimitive.Item`, nên chữ
  phụ tiếng Anh cuối dòng ("Gilets", "Hoodies", "Jackets") cũng mang `lang="vi"`.
- **Sửa:** chuyển `lang` xuống `SelectPrimitive.ItemText`. Kiểm xem `ItemText` có nhận và chuyển prop đó xuống DOM không.
- Cập nhật `registry/PATCHES.md` và `arc-registry.test.ts`.

### 1.6 Tiêu đề tab (F21; C3, N2)

- **C3:** `app/admin/page.tsx` dùng `title: { absolute: … }`: "Tổng quan · Quản trị · HIVE" / "Overview · Admin · HIVE". Template ở
  `app/admin/layout.tsx` không áp cho trang cùng segment; xem
  `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`.
- **N2:** trang một đơn (`app/admin/orders/[code]/page.tsx`): tiêu đề là mã đơn, qua template thành "DH-2429 · Quản trị · HIVE" /
  "DH-2429 · Admin · HIVE". Mã không tồn tại thì tiêu đề không được lộ gì.

### 1.7 `/admin/drops/99` (F22)

- **Hiện trạng:** trả 200, vẽ bảng Các số mà không nói gì.
- **Sửa:** gọi `notFound()` trong `app/admin/drops/[no]/page.tsx` khi catalogue không có số đó, như trang đơn quản trị đã làm với mã đơn
  không tồn tại.

### 1.8 Câu chữ (người dùng đã duyệt 07/10; dùng đúng nguyên văn)

**Chỉ đổi bản EN:**
- **C4** `ArcProductForm.tsx`, câu dưới chip màu: "The pick order is the card's colour band; the first is the cover photo." thành "Pick
  order sets the colour band; the first is the cover.".
- **C5** `ArcAddressForm.tsx`, gợi ý trong ô: "E.g. the customer asked to change the house number" thành "e.g. the customer asked to
  change the house number".
- **C6** `ArcHandoverForm.tsx`, gợi ý trong ô: "E.g. sent as 2 parcels" thành "e.g. sent as 2 parcels".

**C11** `ArcCustomerScreen.tsx` (khoảng dòng 296, ô Nhãn trong hồ sơ khách): "— {lý do}" thành "· {lý do}", cả VI lẫn EN.

**D7–D34:** bỏ gạch ngang dài; bản EN giữ nguyên. Đổi đúng các câu sau.

| # | Chỗ | VI cũ | VI mới |
|---|---|---|---|
| D7 | `lib/catalog-admin.ts:133` | Tồn kho đã đổi ở nơi khác — tải lại rồi sửa tiếp | Tồn kho đã đổi ở nơi khác. Tải lại rồi sửa tiếp |
| D8 | `lib/catalog-admin.ts:146` | Tồn kho vừa đổi ở nơi khác — kiểm lại số rồi gửi | Tồn kho vừa đổi ở nơi khác. Kiểm lại số rồi gửi |
| D9 | `lib/catalog-admin.ts:177`, `lib/admin-orders.ts:241` | Phiên quản trị đã hết — đăng nhập lại bằng tài khoản quản trị. | Phiên quản trị đã hết. Đăng nhập lại bằng tài khoản quản trị. |
| D10 | `lib/catalog-admin.ts:238` | Chưa có ${subject} — chọn số khác. | Chưa có ${subject}. Chọn số khác. |
| D11 | `lib/catalog-admin.ts:240` | Chưa có ${LEX.tl} này — chọn ${LEX.tl} khác. | Chưa có ${LEX.tl} này. Chọn ${LEX.tl} khác. |
| D12 | `lib/catalog-admin.ts:261` | ${subject \|\| "Số này"} đã có — tải lại trang để lấy số kế tiếp. | ${subject \|\| "Số này"} đã có. Tải lại trang để lấy số kế tiếp. |
| D13 | `lib/catalog-admin.ts:266` | … không còn mở — tải lại trang để xem. | … không còn mở. Tải lại trang để xem. |
| D14 | `lib/catalog-admin.ts:275` | ${subject} đã đổi trạng thái ở nơi khác — tải lại trang để xem. | ${subject} đã đổi trạng thái ở nơi khác. Tải lại trang để xem. |
| D15 | `lib/catalog-admin.ts:280` | Giới hạn của ${subject} đã đổi ở nơi khác — tải lại trang để xem. | Giới hạn của ${subject} đã đổi ở nơi khác. Tải lại trang để xem. |
| D16 | `lib/catalog-admin.ts:285` | ${subject} không còn đang chạy — tải lại trang để xem. | ${subject} không còn đang chạy. Tải lại trang để xem. |
| D17 | `lib/catalog-admin.ts:297`, `lib/admin-orders.ts:277` | Thao tác này không còn làm được — tải lại trang để xem. | Thao tác này không còn làm được. Tải lại trang để xem. |
| D18 | `lib/catalog-admin.ts:305` | Tồn kho gửi lên chưa hợp lệ — mỗi ô từ 0 trở lên, tổng không vượt số đã cắt, và cần một lý do. | Tồn kho gửi lên chưa hợp lệ: mỗi ô từ 0 trở lên, tổng không vượt số đã cắt, và cần một lý do. |
| D19 | `lib/catalog-admin.ts:340` | Thứ tự màu đã đổi ở nơi khác — tải lại trang để xem. | Thứ tự màu đã đổi ở nơi khác. Tải lại trang để xem. |
| D20 | `lib/catalog-admin.ts:368` | Điều kiện mã chưa hợp lệ — kiểm lại các ô. | Điều kiện mã chưa hợp lệ. Kiểm lại các ô. |
| D21 | `lib/catalog-admin.ts:374` | Thông tin mẫu chưa hợp lệ — kiểm lại các ô. | Thông tin mẫu chưa hợp lệ. Kiểm lại các ô. |
| D22 | `lib/catalog-admin.ts:896`, `ArcPromoDrawer.tsx:196` | Nhập mã — đây là thứ khách gõ ở ô giảm giá. | Nhập mã. Đây là thứ khách gõ ở ô giảm giá. |
| D23 | `lib/catalog-admin.ts:1178` | Thứ tự màu phải gồm đúng các màu của mẫu — màu chốt lúc cắt. | Thứ tự màu phải gồm đúng các màu của mẫu, chốt lúc cắt. |
| D24 | `lib/admin-orders.ts:252` | ${code} không còn chờ tiền — tải lại trang để xem trạng thái mới. | ${code} không còn chờ tiền. Tải lại trang để xem trạng thái mới. |
| D25 | `lib/admin-orders.ts:257` | ${code} chưa bàn giao được ở trạng thái này — tải lại trang để xem. | ${code} chưa bàn giao được ở trạng thái này. Tải lại trang để xem. |
| D26 | `lib/admin-orders.ts:262` | ${code} không còn ở bước đang giao — tải lại trang để xem. | ${code} không còn ở bước đang giao. Tải lại trang để xem. |
| D27 | `lib/admin-orders.ts:292` | Ghi chú trống hoặc quá dài — tối đa 500 ký tự. | Ghi chú trống hoặc quá dài: tối đa 500 ký tự. |
| D28 | `lib/admin-orders.ts:297` | Địa chỉ chưa đủ hoặc số điện thoại chưa đúng — kiểm lại các ô. | Địa chỉ chưa đủ hoặc số điện thoại chưa đúng. Kiểm lại các ô. |
| D29 | `lib/actions/catalog-admin.ts:527` | Mã không đổi được — dùng "Nhân bản" để tạo mã mới. | Mã không đổi được. Dùng "Nhân bản" để tạo mã mới. |
| D30 | `lib/actions/catalog-admin.ts:939` | Ảnh này đang dùng cho một mẫu — giữ lại, không xoá. | Ảnh này đang dùng cho một mẫu, nên được giữ lại. |
| D31 | `ArcPromoDrawer.tsx:277` | Mã không đổi được sau khi tạo — dùng Nhân bản để có mã mới. | Mã không đổi được sau khi tạo. Dùng Nhân bản để có mã mới. |
| D32 | `ArcResetDialog.tsx:79` | Đơn hàng quay về các đơn mẫu — đơn đặt thêm, kể cả của tài khoản đăng ký thật, sẽ mất. … | Đơn hàng quay về các đơn mẫu: đơn đặt thêm, kể cả của tài khoản đăng ký thật, sẽ mất. … |
| D33 | `ArcOrdersScreen.tsx:599` | Chỉ đơn đang chờ tiền mới đánh dấu được — chưa chọn đơn nào như vậy | Chỉ đơn đang chờ tiền mới đánh dấu được. Chưa chọn đơn nào như vậy |
| D34 | `ArcCustomersScreen.tsx:177` | Trình duyệt không cho chép tự động — email là ${email} | Trình duyệt không cho chép tự động. Email là ${email} |

Số dòng lấy theo lúc soát; sau B19 và lát R1 có thể đã lệch, nên tìm theo câu. Sau khi sửa, grep `" — "` trong chuỗi giao diện tiếng Việt
ở `lib/`, `components/`, `app/` (bỏ test và chú giải). Còn sót câu nào thì liệt kê, không tự sửa.

### 1.9 Công cụ rà: bỏ báo nhầm (`tools/layout-sweep.js`)

> **07/10: mục này chuyển sang lát công cụ, chạy sau R1 và trước R2** (người dùng chốt: kiểm theo tầng; làm công cụ sau R1). Lát
> công cụ cũng chạy sweep trọn một lần để lấy mốc mới. Khi giao R2, phiên chính bỏ mục này khỏi brief và viết lại mục 2 cho phù hợp
> với công cụ mới.
>
> Phải thêm vào phạm vi kiểm của R2: `/admin/drops`, `/admin/promotions`, `/admin/log`. Lý do: `lib/admin-rows.ts` (G1–G3) cũng được
> `ArcDropsScreen`, `ArcPromotionsScreen`, `ArcPromoDrawer`, `lib/activity-log.ts` và `lib/admin-timeline.ts` import.
>
> D7–D34 đã được lần hết: chỉ dùng trong quản trị, 0 chỗ ở cửa hàng. Trước khi quyết có chạy `test:db` không, grep câu cũ trong
> `*.dbtest.ts`.

- `inlineBox` (72 phát hiện): đều là `.acc-item` nằm trong `.acc-nav`, mà `.acc-nav` có `display:none` dưới 900. Bỏ qua phần tử có tổ
  tiên bị ẩn.
- `smallTarget` `span.sz` (12 chỗ): selector `.sz` cũ của v3 bắt trúng chữ bên trong `label.size` 84×48. Đổi `.sz` thành `.size`.
- Giữ nguyên thay đổi chưa commit của phiên chính trong tệp này (7 bước chờ menu hiện rồi mới bấm).
- Ghi mốc mới, VI và EN, kèm lý do từng nhóm phát hiện còn lại.

## 2. Kiểm

- **Lệnh:** `npm run typecheck`, `npm test`, `npm run build` sạch. Chạy `npm run test:db` nếu có đụng tới DB.
- **Ảnh trước và sau** ở 1280 và 1440, vi và en:
  - Tổng quan;
  - sổ đơn: tab Tất cả, tab Chờ thanh toán;
  - trang một đơn: DH-2418, DH-2430, một đơn thẻ;
  - bảng Mẫu: Basics, Drop 05;
  - chân thanh bên;
  - `/admin/drops/99`;
  - menu loại của hộp mẫu hé lộ: kiểm `lang` trong DOM.
- **Tiêu đề tab:** kiểm bằng `document.title` trên Tổng quan và trên trang một đơn.
- **Sweep vi và en:** chạy riêng hai lượt, đóng trình duyệt giữa hai lượt. Báo mốc mới sau mục 1.9.
- **`npx impeccable detect --json app components`:** mốc 2.
- Ảnh ở `.playwright-cli/shots/ui/v6-polish-admin/`. Xem tận mắt; mở lớp nổi rồi mới chụp.

## 3. Luật

- Chỉ Edit/Write. Không commit. Không sửa mock.
- Lệnh nào bị hệ thống quyền chặn: đừng tìm đường vòng, ghi vào báo cáo.
- Ghi DB thì chạy `reset_demo(demo_anchor())` sau đó. Không bấm "Đặt lại dữ liệu mẫu" trên UI. Không đọc `supabase/.env`.
- Để 3200 chạy bản build cuối và để stack Supabase chạy khi xong.

## 4. Báo cáo

- **Đã đổi:** tệp, kèm số đo trước và sau cho từng mục.
- **Test đã sửa,** và lý do.
- **Mốc sweep mới.**
- **Chỗ lệch so với brief.**
