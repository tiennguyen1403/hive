# Mock nâng cấp UI — v3 · bước 1 (chờ duyệt)

Bước đầu của đợt v3: chọn **thế giới hình ảnh, màu thương hiệu, từ vựng và
giọng chữ** trên ba màn quan trọng nhất và một bộ thành phần. **Chưa một dòng
nào trong `app/` thay đổi.** Mở `index.html` để duyệt.

```
cd prototype && python serve.py 3100      # rồi mở http://127.0.0.1:3100/v3/
```

| Thứ | Ở đâu |
|---|---|
| Bảng duyệt: chẩn đoán v2, ba thẻ hướng, công tắc đổi hướng/từ, ba màn trong khung, chức năng, câu cần chốt, sao chép kết quả | `index.html` |
| Bộ thành phần ba hướng, bảng tương phản tính trực tiếp trên trình duyệt | `brand.html` |
| Giọng chữ: từ thay "đợt", sáu nguyên tắc, bảng thuật ngữ, 30 câu trước/sau | `voice.html` |
| Ba màn chính | `home.html` · `products.html` · `product.html` |
| Lớp đề xuất (token cho ba hướng, thang chữ, thang khoảng cách, thành phần, bố cục) | `v3.css` |
| Runtime của mock (chrome, đồng hồ đóng băng, công tắc hướng/từ, tương tác vừa đủ) | `v3.js` |
| Ảnh chụp bản v2 đang chạy để so | `before/` |
| Font, icon Iconsax, ảnh mượn tạm | dùng lại từ `../v2/` |

Ba hướng chọn trên `<html data-dir="so|phieu|nhan">`, từ vựng trên
`data-lex`, màu theo số trên `data-spot`; ba giá trị này lưu ở `localStorage`
(`v3.dir` · `v3.lex` · `v3.spot`) nên bảng duyệt, các khung và tab mở toàn màn
cùng đổi. Đồng hồ đóng băng ở **18:50 · 20/09/2026** như v2; mọi con số của v2
vẫn đúng, bốn số còn mới (NGUỘI 6 · THAN 5 · GIÓ 4 · ĐÁ 9) chọn để cộng đúng 73
và được ghi rõ trên bảng duyệt.

## Cập nhật 21/09 · sau khi chốt bước 1

Hướng **NHÃN**, từ **Số**, mật ong toàn bộ; thẻ giữ thanh nút dưới thẻ (viền
mực); bỏ "Báo khi có lại". Mặc định của `v3.js` nay là `nhan · so`. Thêm
`type.html` — năm cặp chữ (A hiện tại, B Big Shoulders Display, C Bricolage
Grotesque, D Unbounded, E Alfa Slab One), chọn trên `html[data-type]`
(`localStorage` `v3.type`); font ứng viên nằm ở `fonts/` + `fonts-trial.css`
(tải từ Google Fonts, OFL, chỉ ba subset latin/latin-ext/vietnamese).

## Bước 2 · 22/09 · 17 màn còn lại (chờ duyệt)

Chữ đã chốt D (Unbounded + Be Vietnam Pro). Thêm `v3-pages.css` và các màn:
`search` `cart` `checkout` `order-confirmed` `track` `auth` `account`
`account-orders` `account-notifications` `account-saved` `pages` `so`, quản trị
`admin-dashboard` `admin-orders` `admin-order` `admin-so` `admin-promotions`
`admin-products` `admin-customers` `admin-log` `admin-slips`. Bảng duyệt
`index.html` có mục "Bước 2" với 21 khung và 6 câu chốt. Quản trị chỉ desktop.

## Rà 22/09 · khoảng cách, canh hàng, cỡ icon · badge chờ chốt

Sửa trên cả 27 trang (chi tiết ở `tasks/plan.md`, mục "Đợt v3 — rà 22/09").
Icon: `v3.js` có bảng `OPTICAL` cắt viewBox cho `plus` `minus` `check` (mực
nhỏ hơn hẳn bộ) — cùng cách với `<Tick>` của app; thang cỡ 12/15/18/28. Badge:
`badges.html` so ba họ (A chỉ viền · B vải đen · C con dấu) trên cùng tám chỗ
dùng; chọn bằng `html[data-badge]` (`localStorage` `v3.badge`), quy tắc ở cuối
`v3.css`; bảng duyệt có mục "Bước 2b · Badge" với khung chốt. Máy dò mới trong
scratchpad phiên: `probe-icons.js` (hộp/mực/nét từng icon), `probe-align.js`
(lệch tâm hàng flex, icon lệch dòng, mép trái, biểu đồ khoảng cách).

## Bước 2 đã chốt 01:02 · 22/09 · thực thi bắt đầu

21 / 21 khung Duyệt, badge **B · Vải đen** mặc định (`html[data-badge="b"]`),
dấu trên ảnh mẫu đã hết là **SOLD OUT**, số đếm trên thanh bên quản trị là
badge (vàng/đen thường, đen/vàng khi đang mở). Còn mở: câu đề bìa, bốn phương
án chọn trên bảng (`v3.hero`, bảng `HERO` trong `v3.js`, đổi trực tiếp
`#cover-t` và `#cover-lead` ở `home.html`). Agent `ui-implementer` đang dựng
lát 0 theo `tasks/briefs/v3-lat-0.md`.

## Bước 3 · 24/09 · Tạo mẫu: ô chọn màu và ảnh (chờ duyệt)

Hai màn `admin-product-new.html` (SỎI, mẫu ví dụ) và `admin-product-edit.html`
(KHÓI) thêm đúng hai ô mà form v2 chưa có: bảy chip màu vải (thứ tự chọn là thứ
tự dải màu, màu đầu là ảnh đại diện) và một ô ảnh 4:5 cho mỗi màu (chọn tệp hoặc
kéo thả, hoặc mượn tạm một trong 18 ảnh đang dùng, luôn có nhãn "mượn tạm").
Runtime của form ở `product-form.js`; CSS ở cuối `v3-pages.css` (round 7). Bảng
duyệt `index.html` có mục "Bước 3" với hai khung và bốn câu chốt.
