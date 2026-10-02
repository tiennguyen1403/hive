# Brief: v6 lát E3b, trang trợ giúp và 404 bằng tiếng Anh

*02/10/2026. Agent `ui-implementer`. Không commit.*

Đợt v6 làm app song ngữ (QĐ-40). E0 (`e363ab3`), B15 (`a00c5ea`), E1 (`da8114e`), E2 (`2cff7ca`), E3a (`8822bc0`) đã dịch nền,
dữ liệu mẫu, các màn mua sắm và vùng tài khoản. Lát này dịch
**các trang trợ giúp** và **trang 404**:
- Hỏi đáp;
- Bảng size;
- Đổi trả;
- Giới thiệu;
- Liên hệ.

Các trang này nhiều chữ nhất của cửa hàng, và có những câu nói giọng của shop, nên chữ tiếng Anh phải được chăm như chữ tiếng
Việt. Bản tiếng Việt không được đổi một pixel nào.

**Luật chung:**
- Đọc trước, trong `tasks/plan.md`, mục "Đợt v6":
  - QĐ-40;
  - "Thuật ngữ tiếng Anh": bắt buộc;
  - mọi mục "Mẫu…" của E0 tới E3a: làm đúng các mẫu đó.
- **Phạm vi ghi:**
  - được ghi trong `app/`, `components/`, `lib/`, `data/` và test bên cạnh;
  - không đụng `proxy.ts`, `registry/`, `tools/` (dùng bản sao sweep ở scratchpad), `supabase/`, `prototype/`, `tasks/`,
    `DESIGN.md`, `PRODUCT.md`, `.impeccable/`, `.claude/`.
- Không thêm thư viện. Không ghi DB. Không commit.
- **Server:** giải phóng cổng 3200 bằng `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`, chạy thành
  một lệnh riêng. Mã 1 thì dừng lại và báo.
- Harness không cho subagent ghi tệp báo cáo: báo cáo chỉ nằm trong tin cuối.

## 1. Ảnh "trước", chụp trước mọi thay đổi
Mọi route ở §2, ở 390 và 1280, ở **cả hai ngôn ngữ** (cookie `hive-lang`). Mở hết các mục gập của Hỏi đáp trước khi chụp. Khung
nhìn cao bằng trang, không dùng `fullPage`.

## 2. Phạm vi
- **Route:** `/faq` (mọi mục, kể cả đoạn đích `#doi-tra`), `/size-guide`, `/returns`, `/about`, `/contact`, một đường dẫn không có
  để ra trang 404.
- **Mã:**
  - `components/feed/help/` (`HelpView`, `SizeGuideView`);
  - `app/about`, `app/contact`, `app/returns`, `app/not-found.tsx` và các tệp chúng dùng;
  - `lib/feed-help.ts`, `lib/feed-size-guide.ts`, `lib/returns.ts`, `data/size-chart.ts` (phần các trang này in);
  - `ABOUT_LEAD`, `FOUR_RULES`, `HOME_COVER.lead` (`lib/lexicon.ts` hay nơi chúng sống).
- **`<title>` và mô tả** của các route này theo ngôn ngữ. Ảnh chia sẻ giữ tiếng Việt.

## 3. Luật dịch
- **Thuật ngữ** theo bảng, không tự chọn từ khác:
  - FAQ, Size guide, Returns, About, Contact, Track an order;
  - Drop, Basics;
  - "Cut once." / "No restocks.";
  - Bank transfer, Card, Cash on delivery (COD).
- **Mọi con số trong câu** (số ngày đổi trả, phí giao, mốc miễn phí, giờ giữ hàng…) vẫn lấy từ `lib/` như bản Việt, không gõ tay
  vào câu tiếng Anh (quy tắc 1 của `DESIGN.md` §9).
- **Câu giọng của shop** (lời dẫn trang Giới thiệu, `FOUR_RULES`, câu mở đầu các nhóm Hỏi đáp): dịch sát nghĩa, cùng độ ngắn và
  nhịp như bản Việt, kiểu Anh. Không thêm ý, không thêm câu giải thích, không đổi giọng thành giọng quảng cáo. Liệt kê riêng các
  câu này trong báo cáo, để phiên chính đưa người dùng duyệt.
- **Ô "Đang chuẩn bị"** (`.b-slot`) và thông tin liên hệ còn trống: dịch nhãn, giữ nguyên chỗ trống. Không bịa địa chỉ, số điện
  thoại hay email.
- **Bảng size:**
  - số thập phân dùng dấu chấm;
  - đơn vị cm giữ nguyên;
  - tên cột như E1 (Chest, Length, Shoulder; Waist, Hip, Length, Thigh, Height).
- Viết kiểu Anh. Không thêm câu giải thích khái niệm.

## 4. Kiểm
- `npm run typecheck`, `npm test`, `npm run build` sạch. Test cũ xanh mà không sửa. Test `en` mới cho các hàm `lib/` đã đổi, gồm
  kiểm rằng mọi con số trong câu tiếng Anh khớp hằng trong `lib/`.
- **Bản VI không đổi một pixel** ở mọi route của §2, kể cả khi mở hết các mục gập.
- **Không còn chữ Việt ở bản EN:** chạy script soát của E2 trên mọi route của §2, với mọi mục gập đang mở. Kết quả phải là 0, trừ
  chỗ ghi rõ lý do.
- **Chữ tràn:** ở bản EN, ở 390, 600, 900 và 1280. Báo chỗ bản EN xuống dòng mà bản VI không.
- **Hành vi bản EN:**
  - mở và đóng từng mục Hỏi đáp bằng chuột và bàn phím;
  - liên kết trong câu trả lời đưa tới đúng trang;
  - `/faq#doi-tra` mở đúng mục.
- **Sweep:** bản sao `tools/layout-sweep.js` ở cả `vi` lẫn `en`.
- `impeccable detect` cho `app components`: trước và sau.

## 5. Ảnh
`.playwright-cli/shots/v6/e3b/`: `before-{vi,en}-*`, `after-{vi,en}-*`, và ảnh cho từng hành vi ở §4.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, gửi trọn trong **tin cuối**. Thêm các mục:
- **câu giọng của shop**, đặt cạnh bản Việt, tách riêng;
- **mọi chữ tiếng Anh tự viết khác**, đặt cạnh bản Việt;
- kết quả script chữ Việt, theo route;
- test trước và sau;
- tệp đã sửa;
- "Xung đột luật" và "Chưa làm".

Để server 3200 chạy cho phiên chính duyệt.
