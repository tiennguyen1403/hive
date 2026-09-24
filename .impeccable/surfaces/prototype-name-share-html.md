---
version: 1
slug: "prototype-name-share-html"
primary_target: "prototype/name/share.html"
related_targets: ["prototype/name/index.html"]
---

# prototype/name/share.html — favicon + ảnh chia sẻ link (mock so sánh, chưa duyệt)

Scope: một trang tĩnh trong `prototype/name/`, cạnh các bảng tên và logo. Visitor mode: Experience — người xem là chủ
shop; việc của họ là chọn một favicon và một ảnh chia sẻ sau khi thấy chúng ở cỡ thật và trong chỗ chúng sẽ xuất hiện
(tab trình duyệt sáng và tối, kết quả tìm kiếm, màn hình điện thoại, thẻ link trong tin nhắn và bài đăng, bản cắt
vuông). Không sửa app.

Ràng buộc: thế giới v3 cố định (Unbounded 800, Be Vietnam Pro, vải đen #171410, mật ong #eba400 chỉ cho mark, số và
hành động chính, mực trên mật ong, bo 4px, đường may nét đứt 1px mật ong). **Không vẽ mark mới**: người dùng tự làm mark
(QĐ-26), năm tay bài logo đã bị loại; vòng này chỉ dùng chữ H của wordmark, dấu chấm của lockup HIVE.05 và số bìa. Không
lục giác. Không bịa: ảnh sản phẩm là ảnh thay thế và phải ghi rõ; câu đề bìa giữ A ("Mười mẫu. Cắt một lần. Hết là hết.").

## Direction contract

THESIS: Favicon và ảnh chia sẻ là bìa Số thu nhỏ, không phải một logo thứ bảy. Bảng từ chối kiểu "ô vuông đặt trên nền
trắng": mọi ứng viên đứng trong tab, kết quả tìm kiếm, màn điện thoại và thẻ link, ở cỡ thật, kể cả khi bị cắt vuông.

OWN-WORLD: sàn trắng cho bảng; ứng viên dùng vải đen #171410, mật ong #eba400, mực trên mật ong, chữ trắng trên vải;
Unbounded 800 cho H, số và tiêu đề; Be Vietnam Pro cho chú giải; hairline #ece7dd chia lưới; đường may nét đứt mật ong;
H của favicon vẽ trên lưới điểm ảnh 16 và 32 để nét ở 16px.

STORY: chủ shop thấy ngay favicon nào còn đọc được ở 16px trên tab sáng lẫn tối, ảnh chia sẻ nào nổi trong feed sáng và
còn nghĩa khi bị cắt vuông; hiểu số trên ảnh tự đổi theo Số đang mở; chọn một F và một O, kèm hai câu nhỏ.

FIRST VIEWPORT: 1280: tiêu đề một dòng và một câu; ngay dưới là ba cột F1/F2/F3, mỗi cột một ô 128px và hàng cỡ thật
16/32/48; tab sáng và tab tối nằm ngay dưới. 390: các cột xếp dọc, mỗi ứng viên một khối.

FORM: bảng lưới hairline, hàng = ngữ cảnh, cột = ứng viên, như các bảng tên trước; không concept-seed vì là yêu cầu hẹp
trong thế giới đã chốt (new-work §3, "shape directly").

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance — áp dụng khi lựa chọn đi vào app; bảng mock kết thúc ở vòng duyệt của người dùng.
