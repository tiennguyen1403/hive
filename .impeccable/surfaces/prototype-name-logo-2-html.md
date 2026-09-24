---
version: 1
slug: "prototype-name-logo-2-html"
primary_target: "prototype/name/logo-2.html"
related_targets: ["prototype/name/logo.html"]
---

# prototype/name/logo-2.html — logo vòng 2: tinh chỉnh mark, thử wordmark (mock so sánh, chưa duyệt)

Scope: bảng tĩnh cạnh `logo.html` (bản vẽ lại logo ChatGPT mà người dùng chọn, commit `c55d11f`). Visitor mode:
Experience — chủ shop so rồi chọn một mark (bản hiện tại M0 và ba bản tinh chỉnh M1–M3) và một wordmark (bốn hướng mới
W1–W4; bản hiện tại W0 chỉ để đối chiếu). Không sửa app.

Người dùng 24/09: logo "gần như là hoàn hảo", "chỉ có wordmark thì tôi chưa ưng lắm". Trả lời câu hỏi: wordmark hiện tại
**quá đậm, nặng** và **trông như font mặc định** (không chọn "chưa ăn nhập với mark", "chữ sát"); mark: **vài phương án để chọn**.
Ràng buộc: giữ hai màu mật ong #EBA400 và đen #171410; không lục giác; không vẽ lại ý tưởng mark (đĩa mật ong, H đen, con ong
nhìn từ trên làm thanh ngang, khe mật ong khoét quanh ong).

## Direction contract

THESIS: Mark giữ nguyên ý, chỉ tinh chỉnh ở ba mức có lý do đo được — sạch mối nối, một góc cho cả hình, rõ ở cỡ nhỏ. Wordmark đi
ngược bản ChatGPT: nhẹ hơn và có tính cách riêng, mỗi hướng một lý do kể được. Bảng từ chối kiểu "chữ trên nền trắng rồi thôi": mọi
wordmark đứng trong lockup, trên vải đen và trên thanh điều hướng điện thoại ở cỡ thật.

OWN-WORLD: sàn trắng; mật ong #EBA400 và mực #171410 bắt buộc; vải đen cho ngữ cảnh tối; Unbounded 800 cho tiêu đề bảng, Be Vietnam
Pro cho chú giải; hairline #ece7dd chia lưới; font mở (OFL) tự host trong `prototype/name/fonts/`.

STORY: chủ shop thấy ngay mỗi mark khác bản hiện tại ở đâu và ra sao ở 16/32 px; thấy wordmark nào nhẹ mà vẫn có tính cách, hình
dung nó trên thanh điều hướng; chọn một M và một W.

FIRST VIEWPORT: 1280: tiêu đề một dòng và một câu; ngay dưới là bốn cột M0–M3, mỗi cột mark 200 px và hàng 64/32/16 px thật. 390:
các cột xếp dọc.

FORM: hai bảng lưới hairline — mark theo cột, wordmark theo hàng; không concept-seed vì là yêu cầu hẹp trong thế giới đã chốt
(new-work §3, "shape directly").

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance — áp dụng khi lựa chọn đi vào app; bảng mock kết thúc ở vòng duyệt của người dùng.

KẾT QUẢ (24/09/2026, QĐ-29): người dùng chọn **M2**. Không chọn W nào: người dùng tự tạo lại wordmark bằng ChatGPT theo
`prototype/name/logo/prompt-wordmark.md`, rồi phiên chính vẽ lại thành vector.
