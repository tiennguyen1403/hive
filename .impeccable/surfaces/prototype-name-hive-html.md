---
version: 1
slug: "prototype-name-hive-html"
primary_target: "prototype/name/hive.html"
related_targets: ["prototype/name/index.html","prototype/name/hive-2.html","prototype/name/hive-g.html"]
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

## Re-roll 1 (23/09/2026, tay bài 2 · `prototype/name/hive-2.html`)

Người dùng loại cả ba hướng A/B/C: "lục giác nhìn như tech / crypto" và "tôi hoàn toàn không có idea gì về logo".
Tay bài mới không dùng lại lục giác, sọc, con ong. Bảy ứng viên lấy từ thế giới của người mua streetwear Sài Gòn
(ba họ chất liệu: vải, kim loại/biển, chữ in): nhãn dệt · biển số vàng · một nhát cắt trên chữ · một sợi chỉ thay
chữ I · con dấu tròn · vạch cắt rập · vé số. Dựng ba: **E · Nhãn dệt** (an toàn), **F · Biển số** (táo bạo, Sài
Gòn), **G · Một nhát cắt** (typographic, không biểu tượng). Bốn còn lại demoted trên bảng kèm lý do. Đề xuất G.
Không chạy `concept-seed` vì vật thể là một mark trong thế giới đã chốt, không phải một surface; ghi rõ ở đây.
THESIS và FIRST VIEWPORT giữ như trên; FORM đổi: ba cột E/F/G, cùng hàng ứng dụng.

## Vòng G (23/09/2026, `prototype/name/hive-g.html`)

Người dùng nghiêng về G nhưng hỏi đúng: nhát cắt trên chữ H làm mark có nghĩa gì, hay cắt mù? Trả lời thật: wordmark có quy
tắc (một đường thẳng, thấp qua H, giữa I, cao qua V, E), còn mark H được đặt bằng mắt. Bảng họ G sửa điều đó bằng bốn quy tắc
nói ra được, mỗi quy tắc kèm hình dựng: **G1 Cùng một nhát** (mark = mảnh H của chính đường cắt wordmark), **G2 Cắt rồi may**
(thanh ngang H bị cắt, thay bằng một đường may mật ong — nối vào quy tắc "Một Sợi Chỉ"), **G3 Khía rập** (khía tam giác giữa
thân trái, sâu 1/6 cap), **G4 Theo thanh ngang** (cắt ngang đúng tim thanh ngang của H qua cả từ). Toạ độ đặt theo số đo glyph
Unbounded 800 đo bằng canvas trong Chromium (HIVE 104px: ink 70,7–372,8, cap 78; H 100px: ink 8,65–91,65, cap 75), không ước
lượng. Đề xuất G2. Lỗi kỹ thuật đã sửa ở cả hive-2 và hive-g: `<use>` của symbol có viewBox lệch gốc bị khung ngoài che 56 đơn vị
đầu → khung ngoài dùng viewBox bắt đầu từ 0.
