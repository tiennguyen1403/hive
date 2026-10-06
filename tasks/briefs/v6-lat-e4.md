# Brief: v6 lát E4, quản trị bằng tiếng Anh (1): Tổng quan, Nhật ký, Đơn hàng, Khách hàng

*02/10/2026. Agent `ui-implementer`. Không commit.*

Đợt v6 làm app song ngữ (QĐ-40). Phần cửa hàng đã dịch xong ở E1 tới E3b (commit cuối `c578545`). Ở E0 (`e363ab3`), khung quản trị
(thanh bên, hộp đặt lại) và mọi
chữ đã vá trong bộ Arc đã theo ngôn ngữ. Lát này dịch **thân** các màn quản trị về đơn và người:
- Tổng quan (cả biểu đồ);
- Nhật ký;
- sổ đơn, một đơn, phiếu giao in;
- Khách hàng, trang một khách.

Mẫu, Các số và Mã giảm giá là lát E5. Bản tiếng Việt không được đổi một pixel nào.

**Luật chung:**
- Đọc trước, trong `tasks/plan.md`:
  - mục "Đợt v6": QĐ-40; "Thuật ngữ tiếng Anh" (bắt buộc); mọi mục "Mẫu…" của E0 tới E3;
  - mục "Đợt v5: quản trị theo Arc": luật tích hợp Arc.
- Đọc thêm `registry/PATCHES.md`.
- **Phạm vi ghi:**
  - được ghi trong `app/`, `components/`, `lib/`, `data/` và test bên cạnh;
  - được ghi `registry/components/**` và `registry/PATCHES.md` nếu một chữ của Arc chưa theo ngôn ngữ;
  - không đụng `proxy.ts`, `tools/` (dùng bản sao sweep ở scratchpad), `supabase/`, `prototype/`, `tasks/`, `DESIGN.md`,
    `PRODUCT.md`, `.impeccable/`, `.claude/`.
- Không thêm thư viện. Không commit.
- **DB:** được ghi DB cục bộ để dựng trạng thái (đánh dấu đã trả, giao cho đơn vị vận chuyển, huỷ, sửa địa chỉ, ghi chú). Xong thì
  `npx supabase db query "select public.reset_demo(public.demo_anchor());"`. Không bấm "Đặt lại dữ liệu mẫu" trên giao diện.
- **Server:** giải phóng cổng 3200 bằng `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`, chạy thành
  một lệnh riêng. Mã 1 thì dừng lại và báo.
- Harness không cho subagent ghi tệp báo cáo: báo cáo chỉ nằm trong tin cuối.

## 1. Ảnh "trước", chụp trước mọi thay đổi
- Mọi route và trạng thái ở §2, ở 1280, ở **cả hai ngôn ngữ** (cookie `hive-lang`). Quản trị chỉ cho máy tính.
- Khung nhìn cao bằng trang. Vào quản trị bằng nút "Vào quản trị thử", như sweep.
- Đo JS nén của `/admin`, `/admin/orders`.

## 2. Phạm vi
- **Route và trạng thái:**
  - `/admin`: Tổng quan, kể cả biểu đồ doanh thu và các thẻ số;
  - `/admin/log`: Nhật ký, kể cả bộ lọc;
  - `/admin/orders`:
    - mọi tab trạng thái, tìm, bộ lọc, chọn cột, chọn nhiều;
    - tải CSV, in phiếu giao;
  - `/admin/orders/[code]`: một đơn mỗi trạng thái có trong dữ liệu mẫu, và các hộp: đánh dấu đã trả, giao cho đơn vị vận
    chuyển, đã giao, huỷ đơn, sửa địa chỉ, ghi chú;
  - phiếu giao in (`ArcSlipScreen`);
  - `/admin/customers`, `/admin/customers/[id]`.
- **Lớp nổi:** mọi menu dòng, menu lọc, hộp, drawer, toast của các màn này.
- **Mã:**
  - các `components/admin-arc/` của các màn trên: `ArcOverviewScreen`, `ArcRevenueChart`, `ArcLogScreen`, `ArcOrdersScreen`,
    `ArcOrderScreen`, `ArcOrderCells`, `ArcSlipScreen`, `ArcCancelOrderDialog`, `ArcHandoverForm`, `ArcAddressForm`,
    `ArcCustomersScreen`, `ArcCustomerScreen`, phần còn lại của `ArcSidebar`, và mọi tệp chúng dùng;
  - `lib/`: `activity-log.ts`, `admin-timeline.ts`, phần còn lại của `admin-orders.ts` và `admin-rows.ts`, `admin-metrics.ts`,
    `admin-options.ts`, `order-notes.ts`, `customer-tags.ts`, `drop.ts` (`closesInLabel`, `opensInLabel`), và các helper còn tiếng
    Việt mà các màn này dùng (`compactVnd`, `sinceLabel`, `rangeLabel`, CSV đơn hàng…);
  - câu báo của các action quản trị các màn này gọi (`lib/actions/admin.ts`): `getActionLocale()` và `takeRate(…, locale)`.
- **`<title>`** của các route này theo ngôn ngữ.

## 3. Luật dịch
- **Thuật ngữ** theo bảng, không tự chọn từ khác:
  - thanh bên: Overview, Orders, Drops, Styles, Customers, Discount codes, Activity;
  - trạng thái đơn của quản trị: Awaiting transfer, Order received ("Đã nhận đơn"), Paid, Shipping, Delivered, Cancelled;
  - thanh toán: Bank transfer, Card, COD;
  - trạng thái drop: Live, Coming soon, Closed;
  - Demo data, Reset demo data;
  - Stock, Low stock, "N left";
  - Delivery slip.
- **Giá trị lưu DB là chữ Việt, in ra là chữ Anh**, như nhãn địa chỉ ở E3a:
  - lý do huỷ ở hộp huỷ (`admin-options`): nhãn hiện tiếng Anh, giá trị gửi đi giữ chữ Việt. Khi in thì dùng lại bảng
    `cancelReasonLabel` của E2;
  - đơn vị vận chuyển (`orders.carrier`): in qua bảng tiếng Anh khoá bằng chữ Việt đã chuẩn hoá. Lấy chữ Anh theo nhãn giao hàng
    của E2. Giá trị lạ in nguyên;
  - chữ gõ tự do (ghi chú, mã vận đơn, tên khách, địa chỉ) in nguyên. Phần tử chứa tên, địa chỉ, ghi chú tiếng Việt mang
    `lang="vi"` ở bản EN.
- **Nhật ký** (`activity-log.ts`) dựng câu trong code từ `kind` và payload:
  - dịch câu;
  - giá trị lấy từ payload (tên mẫu lúc đó, lý do, ghi chú) in như đã lưu, có `lang="vi"` khi là chữ Việt;
  - lý do nằm trong tập cố định thì dịch như trên.
- **Tiền gọn:** `compactVnd` ở bản EN viết "M" thay "tr" và dấu chấm thập phân, ví dụ "1.2M₫". "k" giữ nguyên.
- **CSV và phiếu giao:**
  - tải CSV ở bản EN có tiêu đề cột và nhãn trạng thái tiếng Anh;
  - phiếu giao in ở bản EN là tiếng Anh;
  - tên, địa chỉ, số điện thoại giữ nguyên.
- **Chữ của mẫu** chỉ lấy qua `productText`. Viết kiểu Anh, ngắn như bản Việt. Không thêm câu giải thích khái niệm.

## 4. Kiểm
- `npm run typecheck`, `npm test`, `npm run build` sạch. Test cũ xanh mà không sửa. Test `en` mới cho các hàm `lib/` và action đã
  đổi, gồm bảng đơn vị vận chuyển.
- **Bản VI không đổi một pixel** ở mọi route, trạng thái và lớp nổi của §2.
- **Không còn chữ Việt ở bản EN:** chạy script soát của E3a trên mọi route, trạng thái và lớp nổi của §2. Kết quả phải là 0, trừ chỗ
  ghi rõ lý do. Mở cả CSV đã tải và phiếu giao để soát.
- **Chữ tràn:** ở bản EN, ở 1280 và 1440. Soát:
  - tiêu đề cột, ô bảng, badge, nút, thẻ số của Tổng quan;
  - luật một dòng của bảng (v5).

  Báo chỗ bản EN xuống dòng hay bị cắt mà bản VI không.
- **Hành vi bản EN:**
  - đánh dấu đã trả một đơn chuyển khoản;
  - giao một đơn cho đơn vị vận chuyển có mã vận đơn;
  - huỷ một đơn với một lý do (DB nhận giá trị chữ Việt);
  - thêm ghi chú;
  - lọc sổ đơn và chọn cột;
  - tải CSV;
  - mở phiếu giao;
  - đổi ngôn ngữ khi đang mở hộp huỷ đơn: hộp vẫn mở, chữ đổi;
  - focus và bàn phím đúng luật v5.
- **Sweep:** bản sao `tools/layout-sweep.js` ở cả `vi` lẫn `en`.
- JS nén của hai route ở §1, trước và sau. `impeccable detect` cho `app components registry`: trước và sau.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 5. Ảnh
`.playwright-cli/shots/v6/e4/`: `before-{vi,en}-*`, `after-{vi,en}-*`, và ảnh cho từng hành vi ở §4.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, gửi trọn trong **tin cuối**. Thêm các mục:
- **mọi chữ tiếng Anh tự viết**, đặt cạnh bản Việt;
- kết quả script chữ Việt, theo route;
- test trước và sau;
- tệp đã sửa;
- chỗ vá Arc mới nếu có;
- mẫu mới nếu có;
- "Xung đột luật" và "Chưa làm".

Để server 3200 chạy cho phiên chính duyệt.
