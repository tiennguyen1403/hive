# prototype/name/nav.html — thanh điều hướng mới: logo, biển Số, danh mục (mock chờ duyệt)

Scope: bảng tĩnh để duyệt trước khi giao `ui-implementer` sửa `components/shop/SiteNav.tsx`, `app/styles/nav.css` và
`app/styles/desktop.css`. Visitor mode của bảng: Experience — chủ shop xem thanh điều hướng mới trên trang thật rồi duyệt và chọn một
màu biển. Surface đích (thanh điều hướng) là Operate. Ảnh chụp từ app đang chạy (`next start`, cổng 3200): lúc chụp gắn
`proposal.css` và ba thao tác DOM, không sửa code app.

Người dùng 24/09 (`/impeccable`): desktop — trái là mark + wordmark (không số); giữa là danh mục, và link "Số 05" đổi thành itag vì
hai thứ cùng chức năng; itag mang style biển số (option F trong `hive-2.html`); phải là tìm kiếm, đã lưu, tài khoản, giỏ. Trả lời hỏi
lại: **bỏ đồng hồ** (biển chỉ ghi SỐ 05); **đổi cả điện thoại** (logo mới và biển; bố cục điện thoại giữ logo · biển · 4 icon).

Xung đột với `DESIGN.md`: "Một Sợi Chỉ" (mỗi màn một mảng mật ong là nút chính) và "Vải đen dành cho Số" (tem `.itag` là vải đen).
Biển F in trên nền trắng là biển mật ong, nên bảng dựng hai màu: **A** biển mật ong đúng như F; **B** biển vải đen, viền và chữ mật
ong (hàng thứ ba của F). Người dùng chọn một.

## Direction contract

THESIS: thanh điều hướng đọc thành ba cụm rõ ràng: của ai (logo) · đang bán gì (biển Số, rồi các họ) · bạn (4 nút). Tấm biển là thứ duy
nhất có hình khối ở giữa thanh, nên Số trở thành mỏ neo của cả thanh.

OWN-WORLD: thế giới v3 đã chốt ("HIVE — nhãn dệt"): sàn trắng, mực #171410, mật ong #EBA400, vải đen cho Số, Unbounded 800 cho số
và tiêu đề, Be Vietnam Pro cho giao diện. Biển số lấy nguyên chất liệu option F: tấm biển, viền trong cách mép 2px, hai lỗ ốc, chữ
Unbounded 800.

STORY: thấy thanh mới trên trang chủ 1280 ở cả hai màu → xem biển ở sáu trạng thái → xem danh mục đang chọn → xem điện thoại 390 và
360 → xem khổ 900 và 1440 → đọc phần sẽ đổi trong code → chọn A hoặc B.

FIRST VIEWPORT: 1280: tiêu đề một dòng, một câu, rồi hai thanh A và B chụp đúng cỡ. 390: xếp dọc.

FORM: ảnh chụp 2× hiển thị đúng cỡ CSS; lưới hai cột A | B cho mọi so sánh; không concept-seed vì đây là tinh chỉnh trong thế giới đã
chốt.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every
shipping raster carrying its provenance — áp dụng khi thanh mới đi vào app (DESIGN.md phải ghi lại itag thành biển Số và luật màu đã chọn).
