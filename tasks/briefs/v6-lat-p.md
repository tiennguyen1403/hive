# Brief: v6 lát P, trang Quyền riêng tư `/privacy`

*07/10/2026. Agent `ui-implementer`. Không commit. B17 (`eb694c6`) và B16 (`9c0ec48`) đã xong; trang lên demo cùng lúc với nút Google.*

Đợt v6 làm demo cho khách nước ngoài. Ứng dụng Google của HIVE đã publish với link privacy policy
`https://hive-neon-three.vercel.app/privacy` (QĐ-41, 06/10). Người dùng chọn làm một trang riêng và **đã duyệt chữ** (06/10).

**Luật chung:**
- Đọc trước `.agents/skills/design-taste-frontend/SKILL.md`.
- Đọc trong `tasks/plan.md`, mục "Đợt v6": QĐ-40 đến QĐ-45, "Thuật ngữ tiếng Anh", mọi mục "Mẫu…", và "kiểm kê dữ liệu cá nhân"
  ngày 06/10.
- **Phạm vi ghi:** `app/`, `components/`, `lib/` và test bên cạnh. Không đụng `proxy.ts`, `supabase/`, `registry/`, `tools/` (dùng
  bản sao sweep ở scratchpad), `prototype/`, `tasks/`, `DESIGN.md`, `PRODUCT.md`, `.impeccable/`, `.claude/`.
- Không thêm thư viện. Không commit.
- **Lệnh bị hệ thống quyền từ chối** thì không thử cách khác để làm cùng việc. Ghi lại lệnh và câu từ chối, làm tiếp phần còn
  lại, rồi báo trong tin cuối.
- **Server:** giải phóng cổng 3200 bằng `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`, chạy thành một
  lệnh riêng. Mã 1 thì dừng lại và báo.
- **Sửa tệp bằng Edit hay Write**, không sửa hàng loạt bằng script: hook impeccable chỉ chạy sau Edit và Write (lát E5 sửa bằng
  script Python nên hook không chạy lần nào).
- **Giữ ngữ cảnh gọn:** kết quả script ghi ra tệp JSON, chỉ in tóm tắt; xem tận mắt tối đa khoảng 8 ảnh.
- Harness không cho subagent ghi tệp báo cáo: báo cáo chỉ nằm trong tin cuối.

## 1. Chữ

Lấy **đúng từng chữ** trong `tasks/briefs/v6-privacy-copy.md`, cả bản Việt lẫn bản Anh. Không thêm, bớt hay đổi câu nào.
- Dòng "Cập nhật [ngày lên demo]" / "Updated [date it goes live]" lấy từ một hằng ngày tháng. Ngày in theo luật mỗi ngôn ngữ:
  - bản Việt `06/10/2026`;
  - bản Anh kiểu Anh `6 Oct 2026`.

  Đặt hằng bằng ngày lát được duyệt; phiên chính sửa lại trước khi đẩy lên demo nếu cần.
- Phần in đậm ở đầu mỗi gạch ("Tài khoản:", "Cookie:"…) giữ in đậm.
- Viết chữ tại chỗ bằng `picker`, như các trang phụ ở E3b.

## 2. Trang và link

- **Route `/privacy`:** dựng theo đúng khung của `/about` (`app/about/page.tsx`): `FeedFrame`, thanh trên điện thoại, tiêu đề hiển
  thị, cỡ chữ và khoảng cách các khối.
  - Bốn mục, mỗi mục là một tiêu đề và một danh sách gạch đầu dòng. Danh sách dùng lại kiểu đã có trong Feed nếu có kiểu khớp.
    Đừng thêm kiểu mới nếu đã có kiểu dùng được, và báo lại đã dùng kiểu nào.
  - `<title>` theo ngôn ngữ: "Quyền riêng tư · HIVE" / "Privacy · HIVE", cùng mẫu với các trang phụ khác.
- **Link ở chân trang:** thêm vào cuối `FOOT_HELP_TEXT` (`lib/feed-home.ts`), sau "Liên hệ": "Quyền riêng tư" / "Privacy",
  `href: "/privacy"`.
  - Test `lib/feed-home.test.ts` đang khẳng định đúng danh sách cũ nên phải sửa theo. Đây là test cũ duy nhất được sửa; ghi lý do.
  - Kiểm luật `data-foot-skip`: trang `/privacy` không cần bỏ link nào.
- Các danh sách route của dự án có liệt kê trang phụ (ví dụ `lib/wait.ts`, `lib/proxy-matcher.test.ts`): thêm `/privacy` ở chỗ
  nào danh sách đó phải đủ mọi trang. Báo từng chỗ.
- Trang không cần đăng nhập. Nút đổi ngôn ngữ trên điện thoại vẫn chỉ ở 5 trang chính.

## 3. Kiểm

- `npm run typecheck`, `npm test`, `npm run build` sạch.
- **Ảnh** `.playwright-cli/shots/v6/p/`:
  - `/privacy` ở 390, 600, 900, 1280, cả `vi` lẫn `en`;
  - chân trang ở bốn bề rộng đó, hai ngôn ngữ, trước và sau.
- Mọi trang khác của cửa hàng: trước và sau chỉ được lệch ở vùng chân trang, do có thêm link. Kiểm bằng so pixel, ghi ra JSON.
- Chân trang: link thứ sáu không làm cột xuống dòng lạ, không tràn, ở cả hai ngôn ngữ.
- Script soát chữ Việt của E4 trên `/privacy` bản EN: 0.
- Sweep (bản sao `tools/layout-sweep.js`, thêm `/privacy`) ở `vi` và `en`: không thêm phát hiện. `impeccable detect` trước và sau.
- Đo trong cửa sổ thật 390×844 và 1280×800: không có thanh cuộn ngang.

## 4. Báo cáo

Theo hợp đồng trong định nghĩa agent, trọn trong tin cuối. Thêm:
- kiểu danh sách đã dùng;
- các danh sách route đã thêm `/privacy`;
- test cũ đã sửa và lý do.

Để server 3200 chạy cho phiên chính duyệt.
