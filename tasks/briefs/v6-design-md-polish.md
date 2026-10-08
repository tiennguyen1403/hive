# DESIGN.md sau B18, B19 và lượt rà v6

*Phiên chính viết 08/10/2026. Agent: `impeccable-documenter`. Ghi điều mã đang làm, không ghi điều định làm. Đọc mã để xác nhận từng
mục, và ghi số dòng khi DESIGN.md dẫn tới mã.*

## 0. Đọc trước

- `DESIGN.md` hiện tại, nhất là §1, §3, §4, §9, §10 và bảng QĐ-36. Ghi cùng giọng văn tiếng Việt, cùng cách dẫn tệp.
- `tasks/plan.md`: các mục 07–08/10 về B18, B19, lượt rà toàn app, R1, T1, R2.
- `git log --oneline ce2fe8a~1..HEAD`, rồi đọc các diff liên quan.

## 1. Phải ghi

**B18, thẻ qua Stripe** (`ce2fe8a`):
- khối `.hold-pay` (`app/styles/feed/flow.css`) và nút "Trả bằng thẻ" (`components/feed/order/PayByCard.tsx`);
- nhãn theo cách trả:
  - "Chờ trả thẻ" / "Awaiting card payment" (`lib/order-labels.ts`);
  - tab "Chờ thanh toán" / "Awaiting payment";
  - "quá hạn thanh toán";
- hoá đơn của đơn thẻ đang chờ chỉ có một nút xanh: "Tiếp tục mua" thành `btn-line` (người dùng chốt 07/10);
- dòng quay về "Chưa trả." / "Not paid yet.";
- quản trị: "Thẻ · Stripe · pi_…"; đơn thẻ không có "Đã nhận tiền".

**B19** (`f9ff40d`):
- `/track` không đưa số điện thoại lên URL;
- hai form tra đơn POST qua Server Action;
- dòng `.si-formerr` trên form tra đơn khi không có JavaScript.

**R1, cửa hàng** (`5a51305`):
- **dải 900–1199 xếp một cột** cho `.od`, `.ok-grid`, `.me-now`, `.b-notif`; cột phụ `position: static` (người dùng chốt; mock cũng
  lỗi y hệt và đã sửa theo);
- `.co-pair` dùng `minmax(0,1fr)`; trong sheet (`.sheet-form .co-pair`), hai ô luôn xếp chồng;
- `.b-qgroup` có `scroll-margin-top` −44px / 8px, giữ scroll-padding của tài liệu (108/80);
- `.foot-lite .foot-links` 28px trong dải 900–999;
- `:lang(en) .b-hero-no` dưới 600px. §3 nay có hai luật `:lang(en)`;
- luật `<noscript>` dùng `.rv:not(.in)`;
- ở §10, bỏ hai khiếm khuyết đã sửa: thẻ vô hình khi không có script, và `/faq#…` dừng thấp.

**R2, quản trị** (`bb3ee4c`):
- `momentLabel` (`lib/datetime.ts`): mọi mốc giờ ở quản trị là "08:05 · 08/10" / "08:05 · 8 Oct"; cửa hàng giữ `dateTimeLabel`;
- ô "Mẫu" trong bảng món: loại là dòng phụ;
- bảng Mẫu bỏ form khi tên loại đã chứa nó;
- `lang` của select nằm trên `ItemText`; bỏ khiếm khuyết cũ của select khỏi §10;
- chân thanh bên in nhãn vai cho quản trị mẫu ("Store manager");
- tiêu đề tab: Tổng quan và trang một đơn;
- `/admin/drops/<số lạ>` trả 404.

**Câu chữ:**
- "hoặc", không "hay" (người dùng dặn 07/10);
- câu báo tiếng Việt không dùng gạch ngang dài giữa câu: việc cần làm thì dấu chấm, giải thích thì dấu hai chấm.

**B16 còn sót:** dòng "nút Google tắt vẫn có icon" ở bảng QĐ-36 đã cũ, vì nút Google đã bật từ B16.

**Số máy dò:**
- `npx impeccable detect --json app components`: chạy trước và sau khi sửa, ghi số;
- mốc sweep mới ở `tools/sweep/baseline-{vi,en}.json` (232 mục; VI 51, EN 50, toàn bộ là Avatar `sm` và chip Hỏi đáp đã biết). Nếu
  DESIGN.md có chỗ ghi số sweep, cập nhật chỗ đó và dẫn tới `tools/sweep/README.md`.

## 2. Luật

- Chỉ sửa `DESIGN.md` và sidecar của nó, nếu có. Không sửa mã. Không commit.
- Frontmatter và token giữ nguyên, trừ khi mã đã đổi token (lần này không có).
- Không chạy build, không chạy server, không chạy playwright: một agent khác đang dùng 3200.

## 3. Báo cáo

- Các mục đã thêm hoặc sửa, theo từng §.
- Số máy dò trước và sau.
- Chỗ nào mã khác với điều brief này nói: tin mã, ghi theo mã, và báo lại.
