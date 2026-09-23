# Gói đầu vào cho impeccable-finish-reviewer · đợt v3 (soạn 23/09/2026, điền nốt sau lát 6)

## Yêu cầu gốc (người dùng, 21/09/2026)
"okay v2 thật sự rất tuyệt vời, bây giờ tôi muốn build v3 với nhiều chức năng và nâng cấp UI mạnh mẽ hơn nữa.
Tôi nghĩ V3 sẽ thiên về cải thiện layout, cải thiện UX/UI, màu sắc chủ đạo cho brand và cải thiện wording cho
tinh tế và chuyên nghiệp hơn. tất nhiên vẫn phải có mock UI để tôi review trước"

## Câu trả lời đã chốt (nguyên văn hoặc tóm tắt sát)
- So ba hướng trên cùng bộ thành phần; biên tập cho cửa hàng, kỷ luật cho quản trị; đổi từ "đợt" vì "nghe hơi
  đơn giản và không có màu sắc riêng cho brand"; đủ bốn nhóm chức năng + đề xuất thêm (12 chức năng giữ).
- 22:38 21/09: hướng **NHÃN** — "mệnh kim… thích màu đen… màu vàng/đen làm liên tưởng đến con ong… phong cách
  phố… có thể định hình cho phong cách và tên app trong tương lai"; bộ thành phần, giọng chữ, ba màn: Duyệt;
  từ thay "đợt": **Số**; "Tôi muốn tất cả là màu mật ong"; giữ thanh nút dưới thẻ; bỏ "Báo khi có lại"; số đo
  mô phỏng tới khi có số thật; "đang chuẩn bị" cho trang công khai; không đổi màn nào thêm; muốn vài option font.
- Font **D · Unbounded + Be Vietnam Pro**; viền ô nhập nhạt hơn; header có box-shadow.
- 01:02 22/09: 21/21 khung bước 2 Duyệt; badge **B · Vải đen**; 6 câu: thanh bên quản trị đen giữ nhưng số đếm
  là badge (vàng/đen thường, đen/vàng khi đang mở, như bong bóng giỏ); chưa có tài khoản ngân hàng, giữ mock;
  giữ cả hai danh sách Giữ lại sau và Đã lưu; khách được tự huỷ đơn chưa thanh toán; ngưỡng nhãn khách đúng;
  đồng ý thứ tự sáu lát. Dấu trên ảnh mẫu đã hết: **SOLD OUT**.
- 22/09: câu đề bìa "Mười mẫu. Cắt một lần. Hết là hết." — "chưa muốn chốt nên cứ để như hiện tại".
- 22/09: "không muốn bất kì outline nào xuất hiện" (lần thứ ba) → QĐ-23: bỏ tiện ích Tailwind, chỉ vòng focus
  bàn phím mới có `outline`.

## Artifact
`D:\Code\e-commerce\app\` (route + `app/styles/*.css` + `app/globals.css`), `components/`, `lib/`, `data/`.
Bản build chạy ở `http://127.0.0.1:3200` (reviewer không dùng trình duyệt; ảnh ở dưới là bằng chứng).

## Ảnh review (chụp 23/09 sau lát 6, full-page từ đầu trang, reduced-motion, không dữ liệu thiết bị)
`.impeccable/review/desktop.png` (1280×3913, trang chủ), `.impeccable/review/mobile.png` (390×4932, trang chủ),
`.impeccable/review/desktop-products.png` (1280×2719, danh mục), `.impeccable/review/mobile-product.png`
(390×3305, trang sản phẩm), `.impeccable/review/admin-1280.png` (1280×1538, tổng quan quản trị).

## Hợp đồng hướng
`.impeccable/surfaces/app-page-tsx.md` (THESIS · OWN-WORLD · STORY · FIRST VIEWPORT · FORM có seed key
**224e45fb**, FINISH). PRODUCT.md: `D:\Code\e-commerce\PRODUCT.md`.

## Comp đã duyệt / thẻ chất lượng
- Vòng hướng **đã gieo** (`concept-seed`, seed key 224e45fb, bảy thế giới, ứng viên 3 được chỉ định, người dùng
  chọn ứng viên 4 NHÃN lúc 22:38 21/09). Cái **không** chạy là vòng comp PNG của Impeccable: không có
  `.impeccable/mocks/`, `build/state.json`, `comp-diff`. Thay vào đó mock HTML `prototype/v3/*.html` (27 trang)
  là comp người dùng duyệt từng khung (bảng `prototype/v3/index.html`, kết quả duyệt dán lại 22/09); fidelity
  so với mock ở cùng bề ngang.
- Ảnh: 19 raster đều là ảnh thay thế Unsplash qua `lib/photos.ts`; nguồn gốc từng ảnh ghi ở DESIGN.md §1
  (bảng "Ảnh — nguồn gốc") và PRODUCT.md "Evidence on Hand" (23/09).
- Thế giới **tự dựng** (nhãn dệt), không có card catalog. Thẻ chất lượng = thẻ hướng NHÃN trên bảng duyệt:
  "Luận đề: giữ vàng mật ong làm sợi chỉ nhận diện nhưng dệt lên nền vải đen: vàng chỉ xuất hiện ở một hành động
  mỗi màn và ở khối của số đang bán. Bảng màu: vải đen #171410 cho khối số và bìa, chỉ mật ong #eba400, nền
  trắng cửa hàng, ghi ấm #6b6250, chữ liên kết #9e6817; chữ trên vàng vẫn là mực đen. Chất liệu: đường may đứt
  nét bằng chỉ vàng viền khối đen, thẻ trạng thái như tem dệt (đen, chữ vàng), ô size như tem size, bo 4px.
  Khung nhìn đầu: ảnh bìa rồi nhãn đen tràn lề: "SỐ 05" chỉ vàng 96px, đồng hồ trắng, câu đề trắng, nút vàng
  duy nhất; desktop: nhãn đen 5/12 may vào ảnh 7/12. Rủi ro thật: đen + vàng dễ thành băng cảnh báo nếu quá
  tay." Thách thức catalog (Raygun, card impeccable.style) chỉ là tham chiếu phê bình, không phải spec.

## Phát hiện hook / detector
Hook thiết kế chạy suốt các lát: không phát hiện nào treo. `impeccable detect --json app components`
sau lát 6 (23/09): `[]`. `tools/layout-sweep.js` 59 lượt: 0 tràn, 0 chữ < 11px, 0 lỗi console, 0 inline-box
(máy dò đã sửa để đi qua CSS nesting), 46 vùng chạm nhỏ đều là nút icon nav 40×44 (miễn trừ DESIGN.md §5),
2 nút đứng một mình cố ý (`.empty3`). Máy dò outline: 0 phần tử có outline lúc nghỉ trên 40 route.

## Sàn thủ công
`.claude/skills/impeccable/reference/craft-floor.md`.

## Lệch đã chấp nhận (để reviewer không tính là lỗi mà không có lý do)
Vòng focus `#c28800` thay mật ong (3:1); số "05" đầu danh mục `--brand-text`; hai nút bìa không icon (mock);
số liệu từ fixture khác mock (200/200, DH-2425 = 0908 221 447…); form địa chỉ hai cấp; sheet size không ô màu;
"Đưa vào giỏ" không icon; hàng giao nhanh không có giờ; QR là ô chờ + liên kết thật; nút Google vô hiệu "đang
chuẩn bị"; đăng ký không ô số điện thoại; tab đơn "Đang xử lý"; `/so/N` đang bán → `/products`.
