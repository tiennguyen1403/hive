---
version: 1
slug: "prototype-v3-line-html"
primary_target: "prototype/v3/line.html"
related_targets: ["prototype/v3/line/line-mock.js", "prototype/v3/line/line-mock.css"]
---

# prototype/v3/line.html — dòng bán liên tục bên cạnh các Số (mock chờ duyệt)

Scope: bảng duyệt trước khi giao lát dữ liệu (`backend-implementer`) và lát giao diện (`ui-implementer`) cho một dòng mẫu bán liên
tục. Visitor mode của bảng: Operate — chủ shop so hai luật bán, chọn tên và cách xếp, rồi chốt. Các màn đích (trang chủ, danh sách,
trang mẫu, quản trị) giữ mode của chúng.

Người dùng 25/09/2026: "Tôi muốn sản phẩm không chỉ dừng lại ở từng đợt mà sẽ có nhiều sản phẩm bán xuyên suốt. tức là có sản phẩm
theo đợt và có sản phẩm bán liên tục". Trả lời hỏi lại:
- nguồn: **dòng riêng, mẫu mới**, không thuộc Số nào, hết thì may lại; mẫu trong Số vẫn cắt một lần;
- gồm: **đồ cơ bản trong 6 họ**, size S–XL.

**Vòng 2 (25/09), người dùng xem vòng 1:**
> "Tôi không thích có thêm một nav quanh năm và thêm một section quanh năm và mô tả nó, nhìn có vẻ hơi weird. chỉ cần thể hiện nó
> như là các mẫu khác thôi. ngoài ra các dòng số nên là một filter trong product list hoặc một page riêng cho số đó"

Vòng 1 (tên dòng, hai kệ, khối trang chủ, câu dưới bốn quy tắc) đã bỏ. Hợp đồng dưới đây là của vòng 2.

## Direction contract

THESIS: mẫu bán liên tục không có tên, trang hay khối riêng trước mắt người mua. Nó đứng trong lưới như mọi mẫu. Danh sách sản phẩm là
**tất cả mẫu đang bán**. Số là thứ được tách ra: có trang riêng `/so/N` hoặc là một bộ lọc. Mẫu thuộc Số mang dấu của Số: nhãn trên ảnh,
đường dẫn, đồng hồ, số cắt. Tên "bán liên tục" chỉ có trong quản trị.

OWN-WORLD: thế giới v3 "HIVE — nhãn dệt" như đã chốt ở `DESIGN.md`: sàn trắng, mực #171410, mật ong #EBA400 chỉ cho Số đang bán, nền
ảnh `--plate` #f4efe6, badge `.flat` (mật ong nhạt, chữ thường, không chấm) cho một cái tên chứ không phải trạng thái.

STORY:
1. Đọc hai loại mẫu đặt cạnh nhau.
2. Chọn Số là trang riêng hay bộ lọc, và có nhãn Số trên ảnh hay không.
3. Xem các khung ở 1280 và 390:
   - danh sách "Tất cả mẫu" và Số 05;
   - trang chủ lúc Số đang mở và lúc giữa hai số;
   - trang mẫu bán liên tục;
   - quản trị.
4. Xem tám mẫu, đọc những câu phải sửa vì sẽ thành sai.
5. Chốt và sao chép kết quả.

FIRST VIEWPORT: tiêu đề một dòng, một câu nêu ý người dùng, hàng chọn (Số là · Nhãn Số trên ảnh), rồi bảng so hai loại mẫu.

FORM: mở rộng các bề mặt đã có, nên theo new-work §3 "Extend an existing surface": không concept seed. Khung là ảnh chụp HTML thật của
cửa hàng (`line/snap.cjs` từ :3200), phần đề xuất vẽ đè bằng `line/line-mock.js`, nên khung trông đúng như app.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping
raster carrying its provenance — áp dụng khi dòng mới đi vào app (DESIGN.md ghi luật hai kệ, thẻ và trang mẫu "tạm hết", tab quản trị).
