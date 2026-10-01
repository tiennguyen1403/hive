# Brief: v6 lát E2, luồng mua bằng tiếng Anh: giỏ, thanh toán, đặt hàng xong, tra đơn

*01/10/2026. Agent `ui-implementer`. Không commit.*

Đợt v6 làm app song ngữ (QĐ-40). E0 (`e363ab3`) dựng nền, B15 (`a00c5ea`) đưa chữ tiếng Anh của mẫu vào DB, E1 (`da8114e`) dịch
trang chủ, Cửa hàng, trang mẫu và Tìm.
Lát này dịch **luồng mua**: giỏ, thanh toán, đặt hàng xong, tra đơn, cùng lớp nổi và câu báo của server. Bản tiếng Việt không được
đổi một pixel nào.

**Luật chung:**
- Đọc trước, trong `tasks/plan.md`, mục "Đợt v6": QĐ-40; "Thuật ngữ tiếng Anh" (bắt buộc); **"Mẫu cho các lát sau"** của E0 và
  **"Mẫu thêm cho các lát sau"** của E1: làm đúng các mẫu đó.
- Đọc `node_modules/next/dist/docs/` cho `generateMetadata`, và cho `cookies()` trong Server Action, trước khi viết.
- Được ghi trong `app/`, `components/`, `lib/`, `data/` và test bên cạnh. Không đụng `proxy.ts`, `registry/`, `tools/` (dùng bản
  sao sweep ở scratchpad), `supabase/`, `prototype/`, `tasks/`, `DESIGN.md`, `PRODUCT.md`, `.impeccable/`, `.claude/`.
- Không thêm thư viện. Không commit. Được ghi DB cục bộ để dựng trạng thái (đặt đơn thử, tra đơn); xong thì
  `npx supabase db query "select public.reset_demo(public.demo_anchor());"`.
- **Server:** giải phóng cổng 3200 bằng `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`, chạy thành
  một lệnh riêng. Mã 1 thì dừng lại và báo.
- Harness không cho subagent ghi tệp báo cáo: báo cáo chỉ nằm trong tin cuối.

## 1. Ảnh "trước", chụp trước mọi thay đổi
Mọi route và trạng thái ở §2, ở 390 và 1280, ở **cả hai ngôn ngữ** (cookie `hive-lang`). Khung nhìn cao bằng trang, không dùng
`fullPage`. Đo JS nén của `/cart`, `/checkout`.

## 2. Phạm vi
- **Route và trạng thái:**
  - `/cart`: rỗng; có hàng; có dòng vượt tồn hay hết hàng;
  - `/checkout`: khách chưa đăng nhập và tài khoản thử; từng cách giao; từng cách trả; mã giảm giá đúng, sai, hết lượt; lỗi kiểm
    form;
  - `/order-confirmed/[code]`: đơn chuyển khoản (hạn, hướng dẫn chuyển khoản), đơn COD, đơn thẻ;
  - `/track`: form trống; sai mã, sai số điện thoại; bị giới hạn tần suất; tìm thấy đơn.
- **Lớp nổi:** chọn tỉnh và phường (`FeedPicker`), chọn địa chỉ đã lưu, mọi sheet và toast của các màn này.
- **Mã:**
  - `components/feed/cart/`, `components/feed/checkout/`, `components/feed/order/`, `components/feed/account/TrackView.tsx`;
  - `lib/`: `feed-cart.ts`, `feed-checkout.ts`, `feed-order.ts`, `checkout-form.ts`, `order-lookup.ts`, `shipping.ts`,
    `promotions.ts`, `phone.ts`, `order-rules.ts`, `customer-orders.ts` (phần các màn này in), và câu báo của các Server Action
    các màn này gọi (`lib/actions/orders.ts`, action tra đơn);
  - `rateLimitMessage` (`lib/rate-limit.ts`): câu báo theo ngôn ngữ của trang.
- **`<title>` và mô tả** của các route này theo ngôn ngữ. Ảnh chia sẻ giữ tiếng Việt.

## 3. Luật dịch
- **Thuật ngữ** theo bảng, không tự chọn từ khác:
  - Bag, Checkout, Track an order;
  - trạng thái đơn: Awaiting transfer, Order received, Paid, Shipping, Delivered, Cancelled;
  - thanh toán: Bank transfer, Card, Cash on delivery (COD). Ở trang thanh toán dùng "Cash on delivery (COD)";
  - Delivery, Drop 05, Basics.
- **Câu báo của Server Action theo ngôn ngữ.**
  - Action đọc ngôn ngữ của request (`getLocale()`).
  - Test gọi action ngoài request thì phải chạy được, ví dụ rơi về `vi`.
  - Không được nuốt tín hiệu dựng động của Next ở trang. Chỉ dùng cách rơi về ở action, và ghi rõ cách đã chọn kèm lý do.
- **Chữ lưu trong DB mà màn in ra:**
  - `orders.carrier` lưu nhãn của `DELIVERY_OPTIONS`;
  - `orders.cancel_reason` là một tập cố định: 4 lý do của quản trị, "quá hạn chuyển khoản", "khách huỷ". Dữ liệu mẫu có hai
    cách viết hoa.

  Hai trường này đổi sang tiếng Anh **trong code** khi in, bằng bảng khớp không phân biệt hoa thường. Giá trị lạ thì in nguyên
  như đã lưu. Không đổi DB. `orders.note` in nguyên.
- **Tên riêng và địa chỉ tiếng Việt trong trang tiếng Anh:** tên người, dòng địa chỉ, tên tỉnh và phường, tên chủ tài khoản
  ngân hàng giữ tiếng Việt (QĐ-40). Phần tử chứa chúng mang `lang="vi"`.
- **Chữ của mẫu** (tên, loại, màu) chỉ lấy qua `productText`/`colorLabel`, kể cả dòng hàng trong giỏ và trong đơn.
- **Tiền và ngày** qua các helper đã có `locale` (`vnd`, `dayMonth`, `dateTimeLabel`…).
- Viết kiểu Anh, ngắn như bản Việt, cùng giọng. Không thêm câu giải thích khái niệm.

## 4. Kiểm
- `npm run typecheck`, `npm test`, `npm run build` sạch. Test cũ xanh mà không sửa; test `en` mới cho các hàm `lib/` và action đã
  đổi.
- **Bản VI không đổi một pixel** ở mọi route, trạng thái và lớp nổi của §2. Chỗ nào lệch thì giải thích kèm ảnh.
- **Không còn chữ Việt ở bản EN:** chạy lại script soát của E1 (`.playwright-cli/shots/v6/e1/scripts/vicheck.js`, chép sang thư
  mục của lát này) trên mọi route, trạng thái và lớp nổi của §2. Kết quả phải là 0, trừ chỗ ghi rõ lý do.
- **Chữ tràn:** ở bản EN, ở 390, 600, 900 và 1280, soát xuống dòng và tràn. Báo chỗ bản EN xuống dòng mà bản VI không.
- **Hành vi bản EN:**
  - đặt một đơn chuyển khoản và một đơn COD từ đầu tới trang đặt hàng xong;
  - nhập mã giảm giá sai và hết lượt: câu báo tiếng Anh;
  - tra đơn sai rồi đúng;
  - đổi ngôn ngữ giữa lúc đang điền form thanh toán: chữ đã gõ còn nguyên.
- **Sweep:** bản sao `tools/layout-sweep.js` ở cả `vi` lẫn `en`. Báo phát hiện mới.
- JS nén của hai route ở §1, trước và sau. `impeccable detect` cho `app components`: trước và sau.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 5. Ảnh
`.playwright-cli/shots/v6/e2/`: `before-{vi,en}-*`, `after-{vi,en}-*`, và ảnh cho từng hành vi ở §4.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, gửi trọn trong **tin cuối**. Thêm các mục:
- **mọi chữ tiếng Anh tự viết**, đặt cạnh bản Việt;
- kết quả script chữ Việt, theo route;
- test trước và sau;
- tệp đã sửa;
- mẫu mới nếu có, để thêm vào biên bản;
- "Xung đột luật" và "Chưa làm".

Để server 3200 chạy cho phiên chính duyệt.
