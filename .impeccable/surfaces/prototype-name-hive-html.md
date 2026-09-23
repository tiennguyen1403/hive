---
version: 1
slug: "prototype-name-hive-html"
primary_target: "prototype/name/hive.html"
related_targets: ["prototype/name/index.html"]
---

# prototype/name/hive.html — bảng hướng logo HIVE (mock so sánh, chưa duyệt)

Scope: một trang tĩnh trong `prototype/name/` đặt cạnh `index.html` (bảng so tên HIVE/HEX, giữ nguyên). Visitor mode: Experience — người xem là chủ shop, việc của họ là so ba hướng logo trên cùng ứng dụng thật rồi chọn một. Không phải UI sản phẩm; không sửa app.

Audience/job: chủ shop cần thấy mark ở mọi cỡ thật (16px favicon tới 96px), trên ba nền (trắng, vải đen, mật ong), và trong bốn ứng dụng đã chốt: nav 390 + favicon, bìa Số, tem treo + nhãn dệt, avatar mạng xã hội. Ràng buộc: thế giới v3 cố định (Unbounded 800, mật ong #eba400 chỉ mang chữ mực, vải đen chỉ cho Số, một sợi chỉ mật ong); không bịa câu chuyện thương hiệu; dữ liệu ứng dụng lấy từ fixture (KHÓI, 390.000₫, Số 05); tên HIVE là hướng nghiêng, chưa chốt.

Trả lời người dùng 23/09: xem cả ba lockup (HIVE trần · HIVE SAIGON · HIVE.{n}); cả ba mức ong (hình học thuần · lục giác + sọc · ong cách điệu); số đợt là ô dữ liệu, không nằm trong tệp logo.

## Direction contract

THESIS: Ba hướng, mỗi hướng một mức "ong", cùng một wordmark Unbounded 800 vì thế giới đã chốt; thứ được so là mark và cách mark sống ở 16px, thêu một màu, và cạnh số đợt. Bảng từ chối kiểu "logo trên nền trắng rồi thôi": mọi mark phải đứng trong ứng dụng thật của cửa hàng.

OWN-WORLD: giấy trắng làm sàn, vải đen #171410 cho bìa Số và nhãn dệt, chỉ mật ong #eba400 cho mark và số; mực #171410 trên mật ong, không bao giờ trắng; hairline #ece7dd chia lưới; Unbounded 800 cho wordmark và số, Be Vietnam Pro cho chú giải; bo 4px; lục giác đỉnh nhọn bán kính 48/100 là hình gốc chung.

STORY: người xem nhận ra ngay ba mark khác nhau về "độ ong", thấy cái nào còn đọc được ở favicon và trên nhãn dệt, hiểu số đợt là ô thay được, rồi chọn một hướng để đưa vào vòng mock app.

FIRST VIEWPORT: 1280: tiêu đề một dòng + ba cột A/B/C, mỗi cột mark 120px trên trắng và wordmark 64px; ngay dưới là ba lockup. 390: cột xếp dọc, mỗi hướng một khối. Không nút hành động; trang là vật so sánh.

FORM: bảng lưới hairline, hàng = ứng dụng, cột = hướng; không concept-seed vì là yêu cầu hẹp trong thế giới đã chốt (new-work §3, "shape directly").

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance — áp dụng khi hướng được chọn đi vào app; bảng mock kết thúc ở vòng duyệt của người dùng.
