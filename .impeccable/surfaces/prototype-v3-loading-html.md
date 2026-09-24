---
version: 1
slug: "prototype-v3-loading-html"
primary_target: "prototype/v3/loading.html"
related_targets: ["components/shop/SiteNav.tsx"]
---

# prototype/v3/loading.html — tín hiệu khi bấm sang trang khác (mock chờ duyệt)

Scope: bảng bấm thử để duyệt trước khi giao `ui-implementer` thêm một chỉ báo chuyển trang cho cửa hàng và tài khoản (mọi trang
dùng `ShopFrame` → `SiteNav`, thanh `.nav3`). Khu quản trị ngoài phạm vi. Visitor mode của bảng: Experience — chủ shop bấm thử từng
kiểu trên ảnh chụp trang thật rồi chọn. Surface đích (chỉ báo trong app) là Operate: phản hồi và trạng thái, không trình diễn.

Người dùng 24/09 (`/impeccable`): trên site đã deploy, bấm sang trang khác thấy trễ; muốn một "global loading", chưa có ý tưởng UI.
Trả lời hỏi lại: phạm vi **cửa hàng + tài khoản**; muốn bấm thử **Đường may** và **Logo giữa màn hình** (không chọn khung trang
`loading.tsx`).

Số đo 24/09 (site thật, Chrome headless 1280): bấm → trang mới 0,28–0,38 s (Wi-Fi), 0,41–0,47 s (Fast 4G giả lập); URL và nội dung đổi
cùng lúc, trước đó trang cũ đứng im. Yêu cầu RSC ~0,17–0,21 s khi kết nối đã mở; hàm chạy `sin1`, cùng vùng Supabase. Nguyên nhân theo
tài liệu Next 16 (`01-getting-started/04-linking-and-navigating.md`): route động không có `loading.tsx` thì không prefetch, bấm phải
chờ máy chủ.

## Direction contract

THESIS: mỗi cú bấm được đáp lại ngay bằng chất liệu của chính cửa hàng — sợi chỉ mật ong may dọc mép thanh điều hướng, hoặc một cung
mũi may chạy quanh mark ở giữa màn — thay cho trang đứng im không tín hiệu hay một spinner/thanh tiến trình màu mặc định.

OWN-WORLD: thế giới v3 "HIVE — nhãn dệt": sàn trắng, mực #171410, chỉ mật ong #EBA400, mũi may đứt nét mật ong (viền bìa Số, dấu SOLD
OUT); mark M2 (QĐ-29). Chuyển động là động tác may: mũi chỉ đi từ trái sang phải, khi trang về thì khép mũi thành một đường liền rồi mờ.

STORY: thấy hiện trạng (bấm, im, đổi trang) → bấm thử Đường may, Logo giữa màn hình và bản kết hợp ở 0,3 / 1 / 3 giây trên ảnh thật 1280
và 390 → đọc giải phẫu từng kiểu và phần "khi làm thật" → chọn một.

FIRST VIEWPORT: tiêu đề một dòng, một câu có số đo; hàng điều khiển (Kiểu · Tốc độ · Màn, nút "Bấm thử"); sân khấu là trang chủ thật
1280 thu vừa cột, bấm được ngay trên ảnh; sợi chỉ chạy ở mép dưới thanh điều hướng trong ảnh.

FORM: mở rộng một bề mặt đã có (chỉ báo trạng thái trong cửa hàng đã chốt thế giới), nên theo new-work §3 "Extend an existing surface":
không chạy concept-seed, không seed key. Hai kiểu người dùng chọn thử, cộng "Cả hai" (logo chỉ khi chờ quá 1 giây) và "Hiện nay" để so.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping
raster carrying its provenance — áp dụng khi kiểu được chọn đi vào app (DESIGN.md ghi chỉ báo chuyển trang và luật thời gian của nó).
