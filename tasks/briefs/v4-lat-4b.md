# Brief: v4 lát 4b, Hỏi đáp, Bảng size, đổi trả, Giới thiệu, Liên hệ

Đợt v4 đưa Feed vào app. Kế hoạch và quyết định ở cuối `tasks/plan.md`, mục "Đợt v4 Feed". Lát này là phần cuối của phần
khách. Sau nó, chỉ quản trị còn giao diện v3 (có vòng mock riêng), cùng mã mồ côi chờ lát dọn.

**Luật số một (QĐ-36):** giống mock Feed hoàn toàn. Luật cũ chặn thì làm theo mock và ghi "Xung đột luật". Lệch nhỏ: "phải
hoàn toàn giống với mock". Mock không vẽ trạng thái nào thì giữ chữ ngắn nhất. Bốn luật vô hình giữ nguyên:
- vùng chạm 46;
- bộ lọc trên URL;
- `::selection` và `caret-color`;
- khoảng ngày không ngắt dòng.

## 1. Màn và route

| Mock `prototype/explore/feed/` | Route app | Trạng thái mock cần xem |
|---|---|---|
| `help.html` + `help.js` | `/faq` (tên trang "Hỏi đáp") | thường; `?q=cod`; tìm không có kết quả; `#doi-tra` |
| `size-guide.html` + `size-guide.js` | `/size-guide` (route mới) | thường; đã chọn một chiều cao |
| chân trang (`feed.js`: `footer`, `WORDS`) | mọi trang Feed | đủ và rút gọn |
| không có mock | `/about`, `/contact` | khoác khung Feed, **giữ nội dung** đang có (QĐ-34) |

## 2. Người dùng đã chốt (30/09)

- **Đổi trả theo mock.** Feed không có trang chính sách đổi trả riêng. Mọi link "Đổi trả" đi tới nhóm Đổi trả của Hỏi đáp
  (`help.html#doi-tra`). Vì vậy:
  - `/returns` chuyển hướng tới `/faq#doi-tra`;
  - các link sau trỏ `/faq#doi-tra`: "Đổi trả 7 ngày" ở chân trang; dòng "Đổi trả · 7 ngày" ở trang sản phẩm (chân trang của
    trang đó vẫn bỏ link trùng); nút "Đổi trả tới dd/mm" ở chi tiết đơn; viên "Đổi trả tới …" ở Tôi.
  - Grep hết link `/returns`.
- **Khối "Không thấy câu cần tìm?"** cuối Hỏi đáp **giữ như mock**, nút "Gửi tin nhắn" trỏ `/contact` hiện tại. Form liên hệ
  làm sau (QĐ-34).

## 3. Việc cần làm

### 3.1 Hỏi đáp `/faq`
- Như `help.js`:
  - tiêu đề "Hỏi đáp";
  - ô "Tìm câu hỏi": không phân biệt dấu, đánh dấu chữ khớp, mở sẵn các câu tìm được, `?q=` trên URL, nút xoá chữ;
  - chip nhóm: Đặt hàng, Thanh toán, Giao hàng, Đổi trả, Size, Tài khoản, mỗi chip là anchor;
  - mỗi nhóm là các câu `<details>`, mở bằng dấu cộng;
  - `#doi-tra` mở sẵn cả nhóm;
  - tìm không có kết quả: "Không có câu nào khớp “…”" kèm "Xoá tìm";
  - thanh điện thoại hiện tiêu đề khi tiêu đề trang cuộn khuất.
- **Mọi con số trong câu trả lời đọc từ dữ liệu của app**, như mock đọc từ `data.js`: phí giao, mức miễn phí, phụ phí COD, số
  ngày giao, số ngày đổi trả, dải size, form áo, Số sắp mở và giờ mở.
- Chữ câu hỏi và câu trả lời lấy nguyên từ `help.js`, **trừ những câu sau**. Bản mock hứa điều app chưa làm. Phiên chính đã
  quyết chữ thay, theo QĐ-34 (luồng đổi trả làm sau) và QĐ-35 (chưa có email):

| Câu | Mock | Thay bằng |
|---|---|---|
| "Gửi yêu cầu đổi trả thế nào?" | "Mở đơn đã giao ở mục Đơn hàng, chọn Đổi trả. Cửa hàng trả lời trong 1 đến 3 ngày qua Thông báo và email." + link "Xem Đơn hàng" | "Yêu cầu đổi trả trên trang đơn đang chuẩn bị." Không link. |
| "Quên mật khẩu thì sao?" | "…liên kết đặt lại gửi về email." + link | "Đặt lại mật khẩu qua email đang chuẩn bị." Không link. |
| "Đổi email ở đâu?" | "Ở Hồ sơ. Email mới dùng được sau khi xác nhận…" + link | "Đổi email đang chuẩn bị." Không link. |
| "Nhắc mở bán gửi qua đâu?" | "Qua thông báo trong app và email…" | "Qua Thông báo trong app. Bật hoặc tắt ở mục Thông báo." Giữ link "Mở Thông báo". |

- **Các câu đổi trả còn lại giữ nguyên chữ mock**, vì đó là luật người dùng đã chốt ngày 27/09:
  - 7 ngày, hàng chưa mặc, còn nhãn;
  - cửa hàng trả phí gửi về;
  - hoàn vào tài khoản ngân hàng, đúng số đã trả, mã giảm giá chia theo giá;
  - chỉ hoàn phí giao và phụ phí COD khi trả cả đơn vì lỗi của cửa hàng;
  - đổi size cùng màu còn hàng trong hạn;
  - danh sách lý do.
  - Danh sách lý do và các lỗi do cửa hàng lấy từ `shared/data.js` (`RETURN_REASONS`, `SHOP_FAULT`, `RETURNS`). Đặt chúng thành
    dữ liệu trong `lib/` hoặc `data/`, **không gõ rời trong JSX**.
- Link trong câu trả lời trỏ route app:
  - Sắp mở → `/#sap-mo`;
  - Cố định → Cửa hàng lọc dòng Cố định;
  - Tra cứu đơn → `/track`;
  - Bảng size → `/size-guide`;
  - Size của tôi → `/account/profile#size`;
  - Thông báo → `/account/notifications`, "Bật báo Số mới" thì kèm `#cai-dat`.

### 3.2 Bảng size `/size-guide`
- Như `size-guide.js`:
  - "Bảng size", "Số đo mô phỏng, cm";
  - hàng chip "Chiều cao của bạn" 1m55 đến 1m85. Chọn một chiều cao thì đánh dấu dòng hợp ở cả bốn bảng và ghi "Hợp size
    **L** hoặc **XL**"; nhớ chiều cao trên thiết bị như mock;
  - áo theo form (oversize, regular), mỗi bảng kèm tên các mẫu áo đang bán thuộc form đó;
  - quần dài và quần short (`lib/pants-chart.ts`), mỗi bảng kèm tên mẫu;
  - hai dòng cách đo;
  - "Giữa hai size" cùng một câu.
- Số đo lấy từ `data/size-chart.ts` và `lib/pants-chart.ts`, như sheet Bảng size ở trang sản phẩm đang dùng.

### 3.3 Chân trang
- Theo mock: Hỏi đáp, Đổi trả 7 ngày, Tra cứu đơn, **Bảng size**, Liên hệ, đúng thứ tự và cách chia cột của mock, ở cả chân
  trang đủ lẫn rút gọn.
- Trang nào đã chứa đích của một link thì bỏ link đó, như `data-foot-skip`.

### 3.4 Giới thiệu `/about`, Liên hệ `/contact`
- Khoác khung Feed (thanh trên, chân trang rút gọn, tab bar), tiêu đề chữ hiển thị của Feed, nội dung giữ nguyên chữ đang có
  (QĐ-34).
- Khối "đang chuẩn bị" viết bằng cách Feed nói điều chưa có: nhãn "Đang chuẩn bị" như ở nút Google và Xoá tài khoản. Không
  thêm câu giải thích.

### 3.5 Còn lại
- Thêm route vào `FEED_PATHS`. Mã v3 mồ côi để nguyên, liệt kê ở báo cáo. Grep lại còn trang khách nào dùng `ShopFrame`.

## 4. Kiểm
- `npm run typecheck`, `npm test`, `npm run build` sạch; xem thử trên 3200.
- **390 và 1280:**
  - Hỏi đáp: thường, tìm "cod", tìm không có, mở từ `/returns`, mở một câu;
  - Bảng size: thường, chọn 1m75;
  - `/about`, `/contact`;
  - chân trang đủ và rút gọn.
- Bấm thử mọi link "Đổi trả" ở chân trang, trang sản phẩm, chi tiết đơn và Tôi.
- 0 lỗi console, không tràn ngang, vùng chạm đo bằng `elementFromPoint`.
- **So với mock** cùng cỡ, cùng trạng thái. Ghi mọi chỗ lệch.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 5. Ảnh cần nộp
`.playwright-cli/shots/v4/lat-4b/`: `<route>-<state>-<w>.png`, `mock-<page>-<state>-<w>.png`.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, có mục **"Xung đột luật"** và danh sách mã v3 mồ côi, gửi trọn trong **tin cuối**.
Không commit.
