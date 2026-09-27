# Hướng giao diện Feed cho HIVE

Yêu cầu ngày 26/09/2026: dựng lại toàn app theo concept của cửa hàng, để xem các phong cách khác nhau. Đây không phải v4.
Người dùng muốn được sáng tạo tự do, không ràng buộc với token, màu, câu chữ hay bố cục hiện tại, và phải có mock để duyệt
trước. App đang chạy không bị đụng tới.

**Tình trạng 27/09/2026:**
- Vòng 1 (26/09): năm hướng. Người dùng chọn Feed và Mẫu vật để dựng tiếp.
- Vòng 2 (27/09): Feed và Mẫu vật dựng trọn luồng mua, thêm một bản kết hợp. Người dùng chọn **Feed**.
- Các hướng bị loại đã xoá theo yêu cầu, cùng ảnh chụp của chúng.
- Vòng 3 (27/09): dựng các luồng khách hàng còn lại của Feed, chưa làm quản trị:
  - tài khoản và đăng nhập;
  - đơn hàng, chi tiết đơn và đổi trả;
  - địa chỉ, hồ sơ, yêu thích, thông báo;
  - tra cứu đơn và các Số đã đóng;
  - trợ giúp, bảng size, liên hệ và trang lỗi.

  Người dùng từ chối mọi concept mới được đưa ra, gồm cả giọng hài hước, nên concept, tên mẫu và cách bán theo đợt giữ
  nguyên. Phần sáng tạo nằm ở thiết kế từng màn.

## Mở

```
cd prototype
python serve.py 3100
```

Sau đó mở <http://127.0.0.1:3100/explore/> để xem bảng của Feed. Mỗi trang cũng mở riêng được, ví dụ
<http://127.0.0.1:3100/explore/feed/home.html?state=upcoming>.

## Đã chốt với người dùng

- Không khí: cả bốn hướng người dùng chọn, gồm tối giản kiểu gallery, thô và ồn ào kiểu hype, app drop dạng feed, và kỹ thuật
  / utility.
- Logo: giữ tên HIVE. Mỗi hướng được vẽ lại chữ và mark theo phong cách riêng, và việc này chỉ nằm trong mock.
- Vòng 1: năm hướng, mỗi hướng ba màn trên điện thoại (trang chủ, danh sách, trang sản phẩm) và trang chủ trên máy tính.
  Người dùng chọn một hướng rồi mới sang vòng 2.
- Vòng 2 (27/09), người dùng chốt qua câu hỏi:
  - **Feed và Mẫu vật** dựng chi tiết hơn: trọn luồng mua trên điện thoại và máy tính. Gồm trang chủ ở ba thời điểm (đang mở,
    sắp mở, giữa hai Số), tìm kiếm, giỏ, thanh toán và đặt hàng xong.
  - Tài khoản và quản trị để sau khi chốt hướng cuối.
  - **Feed × Mẫu vật**: khung app của Feed, da của Mẫu vật. Đây là bản sơ bộ ba màn như vòng 1.
- Sau vòng 2 (27/09): đi tiếp với Feed và dựng các luồng còn lại, chưa làm quản trị. Người dùng muốn sáng tạo hơn, không ràng
  buộc, kể cả concept và tên sản phẩm. Các hướng bị loại đã xoá.
- Vòng 4 (27/09): người dùng trả lời hết câu hỏi của vòng 3.
  - Tên gọi: tab Bảng tin / Cửa hàng / Sắp mở, trang Hỏi đáp, câu bìa "Cắt 1 lần. Không tái bản.".
  - Trang sản phẩm: kiểu story trên máy tính, chọn sẵn Size của tôi.
  - Đơn hàng: danh sách phẳng có hai bộ lọc.
  - Đổi trả: cửa hàng trả phí gửi về, hoàn tiền về tài khoản ngân hàng của khách, trả lời trong 1 đến 3 ngày.
  - Thẻ tạm trả bằng chuyển khoản.
  - Bảng size có thêm quần.
  - Liên hệ: tin nhắn về trang quản trị, cửa hàng trả lời trong 24 giờ.
  - Giữa hai Số: Số vừa đóng đứng đầu Bảng tin 7 ngày, sau đó tới dòng Cố định.
  Chi tiết ở "Round 4" trong `feed/BRIEF.md`.

## Hướng

`feed/`: như app SNKRS, ảnh tràn màn, tab Bảng tin / Cửa hàng / Sắp mở. Đã loại và đã xoá: Gallery, Hype, Utility, Mẫu vật, và bản kết hợp
Feed × Mẫu vật.

## Trạng thái của trang

Thêm tham số vào đường dẫn để xem từng trạng thái:
- `?state=open|upcoming|closed|quiet`: đang mở, sắp mở, giữa hai Số (3 ngày sau khi đóng), giữa hai Số (10 ngày sau khi
  đóng, dòng Cố định đứng đầu);
- `?cart=full|small|soldout|empty`: giỏ mẫu;
- trang thanh toán: `&fill=1` là đã điền, `&errors=1` là báo lỗi;
- trang đặt hàng xong: `?pay=transfer|cod|card`;
- vòng 3:
  - `?auth=out` là chưa đăng nhập;
  - `?orders=none`, `?favs=none`, `?inbox=empty` là danh sách trống;
  - `order.html?id=DH-1507|DH-1502|DH-1499|DH-1496|DH-1310|DH-1210`: mỗi đơn một trạng thái. Trạng thái đổi theo
    `?state=` vì đơn đi theo mốc thời gian;
  - `return.html?id=DH-1496&step=pick|reason|resolve|review|sent`;
- vòng 4:
  - `orders.html?phase=active|delivered|cancelled&group=so-05|so-04|so-03|co-dinh`;
  - `return.html?id=DH-1499&state=closed`: trả cả đơn, thử lý do lỗi (hoàn cả phí COD) và không vừa size;
  - `product.html?frames=8`: tám ảnh trong khung story;
  - `contact.html?sent=1`: đã gửi tin nhắn;
  - `track.html?code=DH-1402&phone=0938571204`: đơn chỉ có hàng Cố định.

Mọi liên kết trong trang giữ nguyên `?state=`. Luồng thanh toán giữ đúng sự thật của app:
- chưa có tài khoản ngân hàng, nên không có số tài khoản hay QR giả;
- giữ hàng 12 giờ, COD thêm 15.000₫;
- cổng thẻ chưa nối, nên đơn chọn thẻ trả bằng chuyển khoản;
- địa chỉ hai cấp theo cải cách 1/7/2025.

## Giữ nguyên ở mọi hướng

- Concept cửa hàng: bán theo Số, mở lúc 20:00 và đóng sau hai tuần hoặc khi hết. Mỗi mẫu cắt một lần, hết size là hết.
  Có dòng Cố định bán mọi lúc.
- Dữ liệu thật của bản demo (`shared/data.js`, chép từ `data/`): tên, giá, tồn kho theo size, 42 ảnh AI của Số 05.
- Tiếng Việt, VND, điện thoại trước.
- Chữ đủ tương phản AA, vùng bấm tối thiểu 44px, tồn kho không báo chỉ bằng màu.
- Không bịa câu chuyện thương hiệu hay số liệu. Không có câu giải thích khái niệm trên giao diện, không gạch dài.

## Tự do ở từng hướng

Màu, kiểu chữ, bố cục, điều hướng, hình dạng thành phần, chuyển động, cách trình bày ảnh, câu chữ và tên gọi. Tên gọi mới
là tên tạm, bảng so sánh liệt kê riêng để người dùng nhận hoặc bỏ.

## Tệp

- `BUILD.md`: luật dựng chung cho người dựng (tiếng Anh).
- `feed/BRIEF.md`: đặc tả thẩm mỹ của Feed.
- `feed/direction.json`: dữ liệu mà bảng in ra.
- `shared/`: dữ liệu và ảnh dùng chung. `shared/shots/` là bản chép từ `public/shots/`, `shared/flats/` là bản chép từ
  `public/flats/`. `shared/regions.js` là 34 tỉnh/thành và 3.321 phường/xã.
- `tools/shoot.cjs`: chụp và soát một hướng.
- `tools/board.cjs`: chụp lại và sinh bảng `index.html` của Feed, theo từng hàng (luồng mua, tài khoản và đơn hàng,
  quanh tài khoản). Chạy `--group mua` nếu chỉ muốn chụp lại một hàng.
- `tools/capture.cjs`: cách chụp toàn trang chung cho hai bảng. Công cụ này ép ảnh tải hết, dời thanh cố định xuống cuối trang, kéo nền cố
  định phủ hết trang và hạ độ nét khi trang quá dài.
- `tools/sheet.cjs`: cắt một trang dài thành các dải đặt cạnh nhau để xem. `tools/review.cjs`: mở menu, bảng size, thêm vào
  giỏ, lọc, sắp xếp và chụp lại. `tools/strip.cjs`: ghép nhiều ảnh thành một tấm.
- `tools/browser.cjs`: khoá để mỗi lúc chỉ một trình duyệt chạy, vì máy thiếu RAM. `tools/fetch-font.cjs`: chép font về dùng
  cục bộ.
- `_shots/`: ảnh chụp và báo cáo. Có thể xoá rồi chụp lại.

Luật máy dò thiết kế (design-system-*) được tắt riêng cho `prototype/explore/**` trong `.impeccable/config.local.json`
(không commit), vì hướng này cố ý ra ngoài hệ HIVE hiện tại. Các luật chất lượng khác vẫn chạy.
