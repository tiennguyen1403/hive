# Brief: v4 lát 2, giỏ, thanh toán, đặt hàng xong

Đợt v4 đưa Feed vào app. Kế hoạch và quyết định ở cuối `tasks/plan.md`, mục "Đợt v4 Feed". Đã có trước lát này:
- lát 0, 1a, 1b: khung Feed, trang chủ, Cửa hàng, trang sản phẩm, tìm kiếm, các Số;
- B6: `Product.details`;
- B7: đơn thẻ trả bằng chuyển khoản, `AWAITING_TRANSFER` giữ 12 giờ.

Xong lát này là **đủ luồng mua**. Người dùng sẽ được hỏi để push lên demo.

**Luật số một (QĐ-36):** giống mock Feed hoàn toàn. Luật cũ chặn thì làm theo mock và ghi "Xung đột luật". Bốn luật vô hình
người dùng giữ:
- vùng chạm 46;
- bộ lọc trên URL;
- `::selection` và `caret-color`;
- khoảng ngày không ngắt dòng (`DASH`).

## 1. Màn và route

| Mock `prototype/explore/feed/` | Route app |
|---|---|
| `cart.html` + `cart.js` | `/cart` |
| `checkout.html` + `checkout.js` | `/checkout` |
| `order-confirmed.html` + `confirmed.js` | `/order-confirmed`, `/order-confirmed/[code]` |

Xem mock ở các trạng thái:
- `cart.html?cart=full|small|soldout|empty`;
- `checkout.html?cart=full&fill=1`, `&errors=1`;
- `order-confirmed.html?pay=transfer|cod|card`.

Dữ liệu là của app: giỏ trong `lib/cart.ts`, luật giao hàng và thanh toán trong `lib/shipping.ts` và `lib/orders.ts`, mã giảm
giá, địa chỉ hai cấp, `placeOrderAction`, biên nhận của khách qua cookie.

## 2. Việc cần làm

1. **Giỏ:**
   - dòng hàng có ảnh, bộ đếm số lượng, Xoá kèm thông báo nhỏ có Hoàn tác;
   - dòng hết size ghi đúng mock "Hết size M. Đổi size để thanh toán.", kèm sheet đổi size (lát 1a để hành vi cũ, đổi
     size không chọn sẵn size nhớ);
   - Tóm tắt (Tạm tính, Giao hàng, Tổng); dải còn thiếu bao nhiêu để miễn phí giao;
   - nút Thanh toán vô hiệu khi còn dòng hết hàng (xung đột #6);
   - giỏ trống có "Xem Cửa hàng";
   - rail gợi ý nếu mock có.
2. **Thanh toán:**
   - các phần Liên hệ, Địa chỉ (hai bộ chọn có ô tìm, như mock), Giao hàng, Thanh toán, Mã giảm giá, Tóm tắt;
   - thanh "Đặt hàng" dính ở đáy; báo lỗi theo từng ô;
   - đã đăng nhập thì điền sẵn như `?fill=1` của mock, lấy từ tài khoản và địa chỉ mặc định của app;
   - thẻ lựa chọn bo 16px;
   - lựa chọn **Thẻ** ghi "Tạm thời trả bằng chuyển khoản." (mock `checkout.js`, `PAY_NOTE`).
   - Giao nhanh chỉ cho nội thành TP.HCM, như luật app.
3. **Đặt hàng xong:**
   - tiêu đề thành công với dấu tích **cùng hàng** chữ (`.ok-*` của mock; bản đã sửa bố cục ngày 27/09, xem
     `feed/BRIEF.md` mục "Layout fixes");
   - "Mã đơn", một dòng việc tiếp theo;
   - **Chuyển khoản** (cả đơn thẻ): khối Chuyển khoản (số tiền, nội dung, "Số tài khoản và tên ngân hàng đang chuẩn bị",
     ô QR "Hiện khi có tài khoản ngân hàng thật"), khối Giữ hàng đếm ngược, Trạng thái "Chờ chuyển khoản";
   - **COD**: một dòng "Cửa hàng gọi xác nhận trước khi giao." và Trạng thái; **không** có khối thanh toán riêng (người dùng
     chốt);
   - Giao hàng, Tóm tắt, "Tiếp tục mua" và "Xem đơn" (khách chưa đăng nhập thì trỏ tra cứu đơn như app đang làm);
   - chân trang rút gọn.
4. **Thêm quá tồn kho** (việc tồn từ lát 1a): giỏ kẹp số lượng theo tồn, nhưng sheet "Đã thêm vào giỏ" vẫn hiện dù không
   thêm được gì. Sửa cho khớp sự thật:
   - khi giỏ đã giữ hết số còn lại của size đó, size ấy **không thêm được nữa** trong sheet chọn size và ở trang sản phẩm;
   - dùng đúng cách mock hiển thị size không mua được (gạch chéo) và ghi chú size ("Đã có trong giỏ" nếu cần một dòng; ghi ở
     báo cáo nếu phải thêm chữ mới);
   - không bao giờ hiện "Đã thêm" khi không thêm gì.
5. Thêm các route này vào `FEED_PATHS`.

## 3. Kiểm

- `npm run typecheck`, `npm test`, `npm run build` sạch; xem thử trên 3200.
- **390 và 1280:**
  - giỏ: đầy, dưới mức miễn phí giao, có dòng hết size, trống;
  - thanh toán: đã điền, và bấm Đặt hàng khi còn trống để thấy lỗi;
  - đặt thật một đơn **chuyển khoản**, một đơn **COD**, một đơn **thẻ**, mỗi đơn chụp màn đặt hàng xong. Dùng khách mẫu và
    cả khách chưa đăng nhập.
- **Mở lớp nổi:** sheet đổi size trong giỏ, bộ chọn tỉnh/thành và phường/xã, sheet mã giảm giá nếu có, Hoàn tác sau Xoá.
- 0 lỗi console, không tràn ngang, vùng chạm đo bằng `elementFromPoint`.
- **So với mock** cùng cỡ, cùng trạng thái. Ghi mọi chỗ lệch.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 4. Ảnh cần nộp

`.playwright-cli/shots/v4/lat-2/`: `<route>-<state>-<w>.png`, `mock-<page>-<state>-<w>.png`, và ảnh các lớp nổi.

## 5. Báo cáo

Theo hợp đồng trong định nghĩa agent, có mục **"Xung đột luật"**, gửi trọn trong tin cuối. Không commit.
