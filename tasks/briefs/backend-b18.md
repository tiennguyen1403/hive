# Brief B18: trả bằng thẻ qua Stripe, chế độ thử

*07/10/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `supabase/README.md`, `tasks/`, `.impeccable/`, `.claude/`,
  `tools/`, `registry/`.
- **Chỉ stack Docker cục bộ.** Không đọc `.env.hosted.local`. Không `supabase link`, `db push`, `config push`. Không dùng `vercel` CLI.
- **Bí mật:**
  - `STRIPE_SECRET_KEY` (khoá thử, bắt đầu bằng `sk_test_`) do người dùng ghi vào `.env.local`;
  - không in giá trị ra màn hình, báo cáo, test hay chú giải; chỉ được kiểm khoá có mặt và có tiền tố `sk_test_`;
  - khoá thiếu, hoặc không phải `sk_test_`, thì làm mọi phần không cần khoá, rồi báo.
- Máy xem thử 3200: muốn dừng thì chạy `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1` thành một lệnh
  riêng. Mã 1 thì dừng lại và báo. Stack Supabase cục bộ đang chạy, có khoá Google của người dùng trong `supabase/.env`: không đọc,
  không in tệp đó.
- Không git commit, stash, reset hay checkout. Harness không cho subagent ghi tệp báo cáo: báo cáo chỉ nằm trong tin cuối.
- **Lệnh bị hệ thống quyền từ chối** thì không thử cách khác để làm cùng việc. Ghi lại lệnh và câu từ chối, làm tiếp phần còn lại,
  rồi báo.
- Lát có sửa giao diện cửa hàng và quản trị, nên đọc `.agents/skills/design-taste-frontend/SKILL.md` trước khi sửa `components/`.
- **Sửa tệp bằng Edit hay Write**, không sửa hàng loạt bằng script (hook impeccable chỉ chạy sau hai công cụ này).
- **Giữ ngữ cảnh gọn:** kết quả script ghi ra tệp JSON, chỉ in tóm tắt; không in diff lớn; xem tận mắt tối đa khoảng 8 ảnh.

## 1. Vì sao

Đọc ở cuối `tasks/plan.md`, mục "Đợt v6":
- **QĐ-42** và **QĐ-46**: cách làm và các câu người dùng đã chọn;
- QĐ-40: song ngữ, mọi mục "Mẫu…";
- QĐ-44, QĐ-45: B17;
- nhật ký B16: `safeNext`, cookie phiên, `getActionLocale`.

Luật agent đã được sửa: gói `stripe` chính thức được dùng ở lát này, chỉ với khoá thử, chỉ ở server.

**Hiện trạng** (đọc mã để xác nhận):
- lựa chọn `CARD` ở trang thanh toán (`lib/feed-checkout.ts`) ghi "Tạm thời trả bằng chuyển khoản";
- `place_order` cho đơn `CARD` vào `AWAITING_TRANSFER` với hạn giữ hàng 12 giờ, như chuyển khoản
  (`supabase/migrations/20260927120000_card_pays_by_transfer.sql`, bản mới nhất ở `…_optional_email.sql`);
- trang đặt hàng xong in thông tin chuyển khoản; quá hạn thì huỷ với lý do "quá hạn chuyển khoản", suy ra lúc đọc.

## 2. Luật

**Tích hợp:**
- Gói `stripe` (Node SDK chính thức), trong một module chỉ chạy ở server (ví dụ `lib/stripe.ts`, có `import "server-only"`). Đọc
  tài liệu Stripe qua WebFetch: Checkout Session (create, retrieve, expire), số tiền của tiền tệ không có phần lẻ (zero-decimal),
  `expires_at`, `locale`, thẻ thử.
- Trình duyệt không tải script Stripe nào. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Vercel tự thêm) **không được tham chiếu ở đâu**, nên
  không vào bundle; kiểm bằng cách tìm chuỗi trong `.next/static`.
- `.env.example` ghi hai tên biến (giá trị giả) và chú giải: lấy từ tích hợp Stripe của Vercel; ở máy thì `STRIPE_SECRET_KEY` nằm
  trong `.env.local`; khoá công khai không dùng.
- **Kiểm VND trước tiên.** Tạo một Checkout Session thử bằng VND với khoá sandbox. Stripe từ chối VND thì **dừng lại và báo**, vì
  "giá giữ VND" là quyết định của người dùng (QĐ-40). VND không có phần lẻ: 390.000₫ là `unit_amount: 390000`, không nhân 100.

**Trạng thái đơn:**
- Giữ máy trạng thái (`AWAITING_TRANSFER` → `PAID`). Không thêm giá trị enum.
- Nhãn đổi theo cách trả:
  - nhãn từng đơn: chuyển khoản vẫn "Chờ chuyển khoản" / "Awaiting transfer"; thẻ là "Chờ trả thẻ" / "Awaiting card payment";
  - tab của sổ đơn quản trị, đang là "Chờ chuyển khoản", đổi thành "Chờ thanh toán" / "Awaiting payment", vì nay chứa cả hai loại;
  - lý do huỷ khi quá hạn của đơn thẻ là "quá hạn thanh toán" / "payment overdue". Đơn chuyển khoản giữ lý do cũ.
  - Liệt kê mọi chỗ đổi.
- Thêm cột cho đơn (migration append-only): mã Checkout Session gần nhất, và mã payment intent khi đã trả. Quản trị đọc được; vai
  API khác không ghi được trực tiếp.

**Luồng:**
- **Đặt đơn thẻ:**
  - sau khi `place_order` tạo đơn như cũ, server tạo Checkout Session rồi `redirect(session.url)`. Đây là URL tuyệt đối ra ngoài, nên
    không đi qua `safeNext`;
  - tạo phiên lỗi thì về trang đặt hàng xong, có dòng báo lỗi và nút trả lại. Đơn vẫn được giữ.
- **Tham số phiên:**
  - `mode: payment`; `currency: vnd`;
  - một dòng hàng "Đơn DH-xxxx" / "Order DH-xxxx", số tiền đúng tổng đơn (đã gồm phí giao, đã trừ mã giảm giá);
  - `client_reference_id` và `metadata.order_code` là mã đơn;
  - `locale` theo ngôn ngữ của khách (`vi`, `en`);
  - `success_url` về `/order-confirmed/<mã>` kèm `{CHECKOUT_SESSION_ID}`; `cancel_url` về cùng trang, kèm cờ "chưa trả";
  - `expires_at` = hạn giữ hàng của đơn, kẹp trong khoảng 30 phút tới 24 giờ của Stripe;
  - origin lấy như `googleSignIn` của B16.
- **Xác nhận khi quay về** (không bao giờ tin chuỗi trên URL):
  - server lấy phiên theo id;
  - bắt buộc `payment_status === "paid"`, `client_reference_id` khớp mã đơn của trang, `amount_total` bằng tổng đơn,
    `currency === "vnd"`;
  - đạt thì đánh dấu `PAID` qua một hàm SQL `security definer` chỉ service role gọi được, có ghi payment intent;
  - hàm idempotent: đơn đã `PAID` thì không làm gì; đơn đã huỷ thì không hồi sinh, chỉ ghi log để quản trị xử lý tay;
  - ghi sự kiện vào Nhật ký, như lúc quản trị đánh dấu đã trả, với người làm là hệ thống.
- **Xác nhận lại khi xem:** mỗi lần trang **một đơn** (đặt hàng xong, đơn trong Tôi, tra đơn, trang đơn ở quản trị) dựng một đơn thẻ
  đang chờ mà có phiên đã lưu, server hỏi Stripe và đánh dấu đã trả nếu đã trả. Như vậy khách lỡ đóng tab sau khi trả thì đơn vẫn
  thành đã trả. Không hỏi ở trang danh sách.
- **Trả lại:** đơn thẻ đang chờ có nút "Trả bằng thẻ" / "Pay by card" ở trang đặt hàng xong và trang đơn của khách. Nút tạo phiên mới
  (phiên cũ thì `expire` nếu còn mở) rồi chuyển trang. Hết hạn giữ hàng thì không còn nút; đơn huỷ như chuyển khoản.
- **Giới hạn tần suất:** action tạo phiên dùng `takeRate(…, locale)` và `getActionLocale()`, như mẫu E2. Chọn bucket và ghi lý do.
- Khách vãng lai quay về từ Stripe trên cùng trình duyệt vẫn mở được trang đơn, nhờ cookie `guest_orders` như hiện nay. Kiểm.

**Quản trị:**
- Trang đơn và CSV của đơn thẻ: "Thẻ · Stripe" / "Card · Stripe", kèm mã tham chiếu payment intent khi đã trả. Hành trình ghi "Đã
  thanh toán qua Stripe" / "Paid via Stripe".
- **Nút "Đánh dấu đã trả" không hiện với đơn thẻ** (phiên chính quyết: tiền thẻ do Stripe xác nhận). Quản trị vẫn huỷ được.
- Không tự hoàn tiền khi huỷ (QĐ-46). Phần che dữ liệu người thật của B17 giữ nguyên.

**Giao diện cửa hàng** (chữ người dùng đã duyệt, QĐ-46):
- **Thẻ chọn `CARD`**, ba dòng:
  - "Thẻ (Visa, Mastercard)" / "Card (Visa, Mastercard)";
  - "Trả trên trang Stripe, chế độ thử." / "Pay on Stripe's page, test mode.";
  - "Thẻ thử 4242 4242 4242 4242, hạn và CVC bất kỳ." / "Test card 4242 4242 4242 4242, any expiry and CVC.". Số thẻ không ngắt
    dòng giữa các nhóm.
- **Trang đặt hàng xong của đơn thẻ:**
  - đã trả: trạng thái đã trả như hiện có;
  - đang chờ: trạng thái, hạn giữ hàng, nút "Trả bằng thẻ". Không in thông tin chuyển khoản;
  - quay về từ nút huỷ của Stripe: thêm một dòng ngắn báo chưa trả và đơn còn giữ tới giờ nào.
  - Chữ mới theo mẫu câu đang có ở trang này, cả hai ngôn ngữ; liệt kê trong báo cáo để phiên chính duyệt.
- **Trang `/privacy`:** sửa đúng ba chỗ người dùng duyệt trong `tasks/briefs/v6-privacy-copy.md`, ghi chú ngày 07/10. Đổi
  `PRIVACY_UPDATED_AT` thành ngày của lát (phiên chính sửa lại trước khi đẩy nếu cần).
- **Hỏi đáp** (`lib/feed-help.ts`): mọi câu đang nói thẻ trả bằng chuyển khoản phải sửa cho đúng. Chỉ sửa chỗ sai, cả hai ngôn ngữ,
  liệt kê trước và sau trong báo cáo.

**Không thuộc lát này:** webhook, hoàn tiền, khoá thật, trả bằng ví hay phương thức khác, lưu thẻ.

## 3. Kiểm

- `npm run typecheck`, `npm test`, `npm run test:db`, `npm run build` sạch.
- Test cũ xanh mà không sửa, trừ test đang khẳng định "thẻ trả bằng chuyển khoản" (nhãn, thông tin chuyển khoản, lý do quá hạn).
  Liệt kê từng test đã sửa và lý do.
- **Test mới:**
  - tham số phiên: số tiền VND không nhân 100, `expires_at` trong khoảng, `locale`, hai URL, mã đơn;
  - xác nhận:
    - đã trả thì đạt;
    - `session_id` giả hay của đơn khác, phiên chưa trả, số tiền lệch, tiền tệ lệch: đều bị từ chối;
    - đơn đã huỷ không hồi sinh;
    - gọi hai lần không sao;
  - xác nhận lại khi xem; trả lại; giới hạn tần suất; chữ `en` của mọi câu mới.
  - Mock client Stripe trong test đơn vị. Test DB cho hàm đánh dấu đã trả và quyền gọi.
- **Với sandbox thật** (cần khoá):
  - tạo phiên thật qua action trên 3200 (curl, hoặc playwright tới lúc chuyển trang);
  - `Location` là `checkout.stripe.com`;
  - lấy lại phiên qua API: số tiền, `vnd`, `locale`, `expires_at`, hai URL.
  - Playwright chỉ cho gọi loopback, nên trình duyệt không sang Stripe. Bước trả bằng thẻ thử do phiên chính và người dùng làm tay
    sau báo cáo; ghi sẵn các bước.
- **Bản VI:** trang thanh toán chỉ đổi ở thẻ chọn `CARD`. Mọi trang khác không đổi pixel, trừ chỗ nhãn "Chờ thanh toán" mới của quản
  trị.
- **Ảnh** ở `.playwright-cli/shots/backend/b18/`:
  - trang thanh toán chọn thẻ, `vi` và `en`, 390 và 1280;
  - trang đặt hàng xong của đơn thẻ đang chờ (có nút), và lúc quay về từ nút huỷ;
  - một đơn thẻ đã trả (dựng bằng hàm đánh dấu đã trả trong DB cục bộ): ở cửa hàng và ở trang đơn quản trị;
  - sổ đơn quản trị với tab "Chờ thanh toán";
  - `/privacy` hai ngôn ngữ.
- Sweep (bản sao `tools/layout-sweep.js`, cả hai ngôn ngữ) không thêm phát hiện. Đo trong cửa sổ thật 390×844 và 1280×800: không
  có thanh cuộn ngang mới. `impeccable detect` trước và sau.
- Xong thì `select public.reset_demo(public.demo_anchor());` (bị từ chối thì báo) và xoá tài khoản thử.

## 4. Báo cáo

Theo hợp đồng sáu mục, trọn trong tin cuối. Thêm:
- kết quả kiểm VND;
- danh sách chữ mới, đặt `vi` cạnh `en`;
- trước và sau của câu Hỏi đáp đã sửa;
- các bước để phiên chính và người dùng trả thử bằng thẻ 4242 trên 3200;
- việc cần làm khi lên hosted (biến môi trường Vercel đã có nhờ tích hợp, migration cần `db push`).
