---
version: 1
slug: "prototype-name-share-html"
primary_target: "prototype/name/share.html"
related_targets: ["prototype/name/index.html","prototype/name/logo.html"]
---

# prototype/name/share.html — favicon, icon điện thoại, ảnh chia sẻ link (mock so sánh, vòng 2, chờ duyệt)

Scope: bảng tĩnh trong `prototype/name/`, cạnh bảng logo. Visitor mode: Experience — chủ shop chọn một favicon (F), một nền icon
màn hình điện thoại (P) và một ảnh chia sẻ (O) sau khi thấy chúng ở cỡ thật, trong chỗ chúng xuất hiện. Không sửa app.

Vòng 2 (24/09/2026): logo đã chốt (mark M2, QĐ-29; chữ W3, QĐ-30) nên mọi ứng viên của vòng 1 (chữ H Unbounded, chấm, số bìa)
hết giá trị. Người dùng (`/impeccable`): "thiết kế lại phần share.html vì chúng ta đã chốt logo". Trả lời hỏi lại: ảnh chia sẻ
**không dùng ảnh sản phẩm** (logo, Số, câu đề trên nền); phạm vi **chung cho cả site** (favicon, icon điện thoại, một ảnh chia sẻ đổi
theo Số đang mở); ảnh riêng từng mẫu để sau.

Sự thật đã đo: M2 ở 16 px nhoè con ong thành một khối mực; từ 32 px con ong đọc được. Màn tỉ lệ ≥ 150% dùng ảnh 32 px cho tab,
nên bản 16 px chỉ hiện trên màn 100%. Facebook, Zalo giữ ảnh chia sẻ theo lúc link được quét, nên ảnh không ghi giờ đóng hay số còn.

## Direction contract

THESIS: favicon, icon điện thoại và ảnh chia sẻ là chính logo đã chốt đặt vào ba chỗ người ngoài gặp HIVE trước khi vào trang; chỗ
duy nhất được vẽ lại là 16 px. Bảng từ chối kiểu "logo giữa ô vuông trên nền trắng": ứng viên nào cũng đứng trong tab, màn hình
điện thoại, thẻ link sáng và tối, và bản cắt vuông, ở cỡ thật.

OWN-WORLD: v3 "HIVE — nhãn dệt": vải đen #171410, mật ong #eba400, sàn trắng; mark M2 (đĩa mật ong, con ong mực thành chữ H); chữ W3
(Big Shoulders Stencil 700 thành nét); ".NN" ghép từ `hive-number.json`; câu đề bìa A; đường may đứt nét mật ong; Unbounded 800
cho số lớn; nhãn dệt khâu viền.

STORY: thấy vì sao 16 px phải vẽ lại → so ba favicon phóng 8 lần và trên tab ở màn 100% → chọn nền icon điện thoại trên iPhone và
Android → so ba ảnh chia sẻ trong bài đăng, tin nhắn và bản cắt vuông, ở giao diện sáng và tối, với Số 05 và 06 → trả lời một dòng.

FIRST VIEWPORT: 1280: tiêu đề một dòng, một câu; ngay dưới là ba cột F1/F2/F3, mỗi cột bản 16 px phóng 8 lần và hàng cỡ thật.
390: các cột xếp dọc.

FORM: bảng lưới hairline như vòng 1 (hàng = ngữ cảnh, cột = ứng viên); mở rộng một thế giới đã chốt (new-work §3), không
concept-seed, không seed key.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every
shipping raster carrying its provenance — áp dụng khi lựa chọn đi vào app; bảng mock kết thúc ở vòng duyệt của người dùng.
