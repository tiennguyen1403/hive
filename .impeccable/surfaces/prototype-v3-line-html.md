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

## Direction contract

THESIS: dòng mới là một kệ đứng yên cạnh các Số — cùng giấy trắng, mực, đường kẻ của cửa hàng, nhưng không đồng hồ, không số cắt,
không dấu SOLD OUT. Số là một cái bìa có ngày; dòng mới là cái kệ luôn ở đó, gọi tên bằng thời gian ("Quanh năm").

OWN-WORLD: thế giới v3 "HIVE — nhãn dệt" như đã chốt ở `DESIGN.md`: sàn trắng, mực #171410, mật ong #EBA400 chỉ cho Số đang bán, nền
ảnh `--plate` #f4efe6, badge `.flat` (mật ong nhạt, chữ thường, không chấm) cho một cái tên chứ không phải trạng thái.

STORY: đọc hai luật bán đặt cạnh nhau → chọn tên → thấy dòng mới trên trang chủ (Số đang mở và giữa hai số), danh sách (hai kệ hay một
kệ hai nhóm), trang mẫu (đủ size, tạm hết), quản trị (tab, cột tồn kho, form) ở 1280 và 390 → xem tám mẫu đề xuất → đọc chữ đổi theo
→ chốt và sao chép kết quả.

FIRST VIEWPORT: tiêu đề một dòng, một câu nêu điều người dùng đã chốt, hàng chọn tên, rồi bảng so hai luật bán.

FORM: mở rộng các bề mặt đã có, nên theo new-work §3 "Extend an existing surface": không concept seed. Khung là ảnh chụp HTML thật của
cửa hàng (`line/snap.cjs` từ :3200), phần đề xuất vẽ đè bằng `line/line-mock.js`, nên khung trông đúng như app.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping
raster carrying its provenance — áp dụng khi dòng mới đi vào app (DESIGN.md ghi luật hai kệ, thẻ và trang mẫu "tạm hết", tab quản trị).
