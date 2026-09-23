# Bản chạy thử — BRAND

Bốn mươi ba màn hình của bản mock, nối lại thành một bản **bấm được** bằng
HTML, CSS và JavaScript thuần. Không khung, không build, không `npm install`.

Đây **chưa phải sản phẩm**. Nó tồn tại để bạn đi hết các luồng bằng tay trước
khi quyết định implement.

## Mở lên

```
cd prototype
python serve.py
```

rồi mở <http://127.0.0.1:4321>.

**Dùng `serve.py`, đừng dùng `python -m http.server`.** Khác nhau đúng một
dòng tiêu đề: `Cache-Control: no-store`. Bản chạy thử dựng lại liên tục, mà
`http.server` không nói gì về cache nên Chrome tự phỏng đoán rồi **giữ lại
trang HTML** — mở đúng địa chỉ cũ là thấy bản cũ dù trên đĩa đã mới, và
không có dấu hiệu nào báo cho biết. Chuyện này đã hai lần làm mất công xem
xét lại. `?v=` trên CSS/JS không cứu được, thẻ `<meta http-equiv>` cũng
không — Chrome bỏ qua nó cho tài liệu HTTP. Phải là tiêu đề thật.

Nếu đã lỡ mở bằng `http.server` ở cổng cũ và nghi trang bị cũ: đổi cổng
(`python serve.py 4322`) là xong — cổng khác là vùng cache khác, sạch hẳn.

Mở thẳng `index.html` bằng trình duyệt cũng chạy, chỉ khác là số món trong giỏ
và giờ đóng đợt không nhớ được giữa các màn (`file://` chặn localStorage ở một
số trình duyệt).

## Đi đường nào

Thanh đen nổi ở đáy màn hình có bốn nút: **‹ màn trước**, **tên màn đang
xem**, **màn sau ›**, và **danh sách toàn bộ màn** (có ô lọc theo tên). Bấm vào
tên màn cũng mở danh sách.

Hai mũi tên đi theo đúng thứ tự trong danh sách màn, nên lật hết một lượt là
xem hết — không sót, không trùng. Rê chuột lên mũi tên thì thấy tên màn sắp
tới. Tới đầu hoặc cuối danh sách thì mũi tên mờ đi.

| Phím | Việc |
|---|---|
| `←` `→` | lật màn trước / màn sau |
| `Esc` | đóng danh sách màn, đóng tấm trượt |

Phím mũi tên nhường lại cho ô nhập, băng ảnh đang được chọn, và bảng chọn màn —
đang gõ hay đang vuốt ảnh thì nó không cướp phím.

Ba tấm trượt (bộ lọc, bảng size, chọn size) không có trang riêng mà nằm trong
trang chủ quản của chúng; lật tới chúng thì tấm tự mở, lật đi thì tự đóng.

Thanh này không còn nút **quay lại theo lịch sử** — chỗ đó nay là mũi tên lùi.
Muốn quay lại thì dùng nút quay lại có sẵn trên đầu từng màn, hoặc nút Back của
trình duyệt.

Ba lối vào chính nằm ở trang chủ của bản chạy thử:

| Lối vào | Bắt đầu ở | Số màn |
|---|---|---|
| Mua hàng | `trang-chu.html` | 13 + 5 biến thể |
| Tài khoản | `dang-nhap.html` | 15 |
| Quản trị | `qt-tong-quan.html` | 10 + 2 bản vẽ |
| Nội dung & hỗ trợ | `gioi-thieu.html` | 5 |

## Bảng ở khu quản trị

Năm bảng quản trị dùng chung một component (`.dt`) — bộ mặt cho **TanStack
Table**. TanStack không vẽ gì cả: nó trả về row model đã lọc / sắp / phân
trang / chọn, còn vẽ là việc của mình. Mỗi mảnh trong `.dt` mang tên theo API
sinh ra nó, nên lúc dựng thật chỉ việc tra.

Màn **`qt-bang.html` — Hệ bảng dữ liệu** là bản vẽ chi tiết của component đó:
ba trạng thái thanh công cụ, tiêu đề sắp xếp, dòng đang chọn, bốn trạng thái
rỗng, cột ghim, và một bảng tra *mảnh nào ↔ API nào*. Nó không phải màn sản
phẩm; vào bằng danh sách màn ở thanh đen.

## Ba trang không phải màn sản phẩm

Xen giữa các màn có ba bản vẽ để **chọn**, không phải để dùng. Vào bằng danh
sách màn ở thanh đen.

| Trang | Là gì |
|---|---|
| `qt-bang.html` | Đặc tả component bảng: mảnh nào ↔ API nào của TanStack |
| `qt-nut-loc.html` | Bốn kiểu nút lọc, đã chốt kiểu C |
| `the-san-pham.html` | Thẻ sản phẩm: **đã chốt E+ với G**, các bước bị loại giữ lại để tra |

## Thẻ sản phẩm và tấm trượt chọn size

Thẻ trên mọi lưới là **băng ảnh vuốt ngang theo màu** — một tấm mỗi màu, cuộn
thật bằng `scroll-snap`, nên ngón tay, bàn di, con lăn và phím mũi tên đều đi
được. Size và màu không nằm trên thẻ: nút **Thêm vào giỏ** mở một tấm trượt có
đủ chỗ nói số còn lại của *từng* size, và nhắc lại đúng màu bạn vừa vuốt tới.

Thẻ chỉ lên tiếng hai lần, vì PRODUCT.md xếp khan hiếm vào nhóm *nội dung*:
**số còn lại khi đã ≤3 chiếc**, và **một dòng liệt kê size đã hết**. Mẫu nào
còn đủ hàng thì thẻ im.

Tấm trượt không phải khai cho từng màn — màn nào có thẻ là nó tự đi theo
(`gen_app.build_screen` dò nội dung đã dựng).

Mỗi màu đáng lẽ phải có **một bộ ảnh riêng**: đợt này là 21 bộ. Chưa có ảnh
thật nên mỗi tấm đang mượn một ảnh Unsplash khác nhau — kho chỉ có 18 tấm cho
21 lượt, nên ba tấm xuất hiện hai lần trong lưới mười mẫu.

## Làm được gì thật

- **Vuốt ngang ảnh thẻ để xem từng màu**; chạm nút là mở tấm chọn size, chọn
  xong nút tự xác nhận trong chốc lát.
- Chọn size, thêm vào giỏ, **tăng giảm số lượng — tiền tự tính lại**, xoá món
  (có nút hoàn tác).
- Gõ thật vào mọi ô nhập; Tỉnh / Quận / Phường là ô chọn thật.
- Mở tấm trượt **bộ lọc** và **bảng size** ngay trên màn đang xem.
- Gập mở câu hỏi thường gặp; sửa tại chỗ từng dòng ở Thông tin cá nhân.
- Màn Đổi mật khẩu kiểm tra điều kiện **theo từng ký tự** bạn gõ, và chỉ mở
  khoá nút khi đủ.
- **Đồng hồ đếm ngược của đợt chạy thật** và giống nhau ở mọi màn.
- Số món trong giỏ theo bạn qua các màn; đặt hàng xong thì giỏ sạch.

Việc nào ở bản thật có thật nhưng không dẫn sang màn nào (xuất CSV, in phiếu
giao, gửi email) thì hiện một dòng nhắn nói rõ nó sẽ làm gì — **không có nút
chết, cũng không có nút giả vờ**.

## Cái gì chưa thật

- **Ảnh là ảnh mượn tạm** từ Unsplash, chỉ để dễ hình dung bố cục.
- **Mọi con số trong khu quản trị là dữ liệu mô phỏng**, và được đánh dấu như
  vậy ngay trên màn hình.
- Những chỗ bạn chưa chốt nội dung — câu chuyện thương hiệu, xưởng may, kênh
  liên hệ — để trống có nhãn viền đứt nói rõ cần viết gì. Không bịa.
- Không có máy chủ, không có cơ sở dữ liệu, không có thanh toán.

## Sửa lại thì sửa ở đâu

| Việc | File |
|---|---|
| Màu, khoảng cách, kiểu chữ, mảnh dựng | `src/mocklib.py` |
| Thẻ sản phẩm, băng ảnh, tấm chọn size | `src/mocklib.py` — `card`, `bang_anh`, `sheet_size` |
| Nội dung từng màn | `src/gen_mock.py`, `src/screens2.py`, `src/screens3.py` |
| Năm bảng quản trị + trang đặc tả bảng | `src/screens4.py` |
| Bản vẽ chọn kiểu nút lọc | `src/screens5.py` |
| Bản vẽ chọn thẻ sản phẩm | `src/screens6.py` |
| Danh sách màn, tên file, cách đổi thẻ tĩnh thành thẻ thật | `src/gen_app.py` |
| Nối màn với nhau, hành vi khi bấm | `app.js` — **sửa tay** |
| Vỏ xem: khung máy, thanh công cụ, danh sách màn | `shell.css` — **sửa tay** |
| Máy chủ tĩnh cấm cache | `serve.py` — **sửa tay** |

`app.css`, `screens.js` và toàn bộ `*.html` ở thư mục này **do máy sinh ra** —
sửa tay sẽ mất ở lần dựng sau. Dựng lại bằng:

```
cd prototype/src
python gen_app.py
```

Chỉ cần Python, không cần thư viện ngoài.

Hệ thiết kế chỉ có một nguồn là `src/mocklib.py`: sửa màu ở đó thì cả bản mock
lẫn bản chạy thử cùng đổi. `src/contrast.py` là máy tính độ tương phản WCAG đã
dùng để kiểm mọi cặp màu — chạy trước khi đổi màu, đừng ước lượng bằng mắt.

## Bản mock có chú thích

Chạy `src/gen_app.py` cũng dựng lại bản mock dạng thư viện ảnh ở
`src/preview/mock/index.html`: cùng 43 màn nhưng xếp cạnh nhau, mỗi màn kèm một
câu giải thích vì sao nó như vậy, thêm một trang hệ thiết kế liệt kê toàn bộ
màu, icon và mảnh dựng. Bản đó để **đọc**; bản ở thư mục này để **bấm**.
