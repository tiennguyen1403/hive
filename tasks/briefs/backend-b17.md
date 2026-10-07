# Brief B17: quản trị công khai che dữ liệu của người thật, và xoá tài khoản thật mỗi ngày

*06/10/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `supabase/README.md`, `tasks/`, `.impeccable/`, `.claude/`,
  `tools/`.
- `registry/` chỉ được sửa theo luật vá Arc ở `registry/PATCHES.md`, nếu thật cần. Ghi lại và có test.
- **Chỉ stack Docker cục bộ.** Không đọc `.env.hosted.local`. Không `supabase link`, `db push`. Không dùng `vercel` CLI.
- Máy xem thử 3200: muốn dừng thì chạy `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1` thành một lệnh
  riêng. Mã 1 thì dừng lại và báo.
- Không git commit, stash, reset hay checkout. Báo cáo chỉ nằm trong tin cuối.
- **Lệnh bị hệ thống quyền từ chối** thì không thử cách khác để làm cùng việc. Ghi lại lệnh và câu từ chối, làm tiếp phần còn
  lại, rồi báo trong tin cuối. Lát E5 bị từ chối `reset_demo`; phiên chính sẽ nhờ người dùng chạy.
- DB cục bộ vừa được người dùng đặt lại (07/10, khoảng 00:02), nên ảnh "trước" chụp ngay được, không cần đặt lại.
- Lát có sửa màn quản trị, nên đọc `.agents/skills/design-taste-frontend/SKILL.md` trước khi sửa `components/admin-arc/`.
- **Sửa tệp bằng Edit hay Write**, không sửa hàng loạt bằng script: hook impeccable chỉ chạy sau Edit và Write (lát E5 sửa bằng
  script Python nên hook không chạy lần nào).
- **Giữ ngữ cảnh gọn:** kết quả script ghi ra tệp JSON, chỉ in tóm tắt; không in diff lớn; xem tận mắt tối đa khoảng 8 ảnh.

## 1. Vì sao

Đọc **QĐ-44** và **QĐ-45** ở cuối `tasks/plan.md`, mục "Đợt v6"; đọc cả QĐ-40, các mục "Mẫu…" của E0 tới E5, và mục "kiểm
kê dữ liệu cá nhân" ngày 06/10.

Quản trị thử là công khai: ai bấm "Vào quản trị thử" cũng đọc được danh sách khách và sổ đơn.
- Hôm nay đơn của khách vãng lai và tài khoản tạo bằng email đã hiện đủ tên, email, số điện thoại, địa chỉ.
- Lát B16 thêm đăng nhập Google, tức là thêm tên và Gmail thật.
- Lần đặt lại hằng ngày xoá đơn nhưng giữ `profiles`.

Người dùng chọn **che trong quản trị** (06/10).

## 2. Luật

**Dữ liệu mẫu và người thật:**
- **Hồ sơ:** là dữ liệu mẫu khi có `handle` (tám khách mẫu `c-…`, quản trị `a-quanly`). `handle` null là người thật. Dùng lại cách
  nhận ra đã có (`isShopper`, `customerKey` trong `lib/admin-customers.ts`).
- **Đơn:** là dữ liệu mẫu khi:
  - `reset_demo` chép nó từ `seed_orders`; hoặc
  - chủ đơn là một hồ sơ mẫu, ví dụ khách bấm "Đăng nhập thử" rồi đặt đơn.

  Còn lại là người thật: đơn vãng lai đặt trực tiếp, đơn của tài khoản thật.
- Bảng `orders` chưa có dấu hiệu nào cho biết đơn chép từ seed. Chọn cách đơn giản và bền nhất, ví dụ:
  - một cột `reset_demo` đặt;
  - hoặc so `code` với `seed_orders`.

  Cách chọn phải đúng sau mỗi lần đặt lại và với mọi đơn mới. Có test DB.

**Cách che** (ký tự `•`, không theo ngôn ngữ):
- **Tên:**
  - nhiều từ: từ đầu, chữ cái đầu của từ cuối, dấu chấm. "Peter Smith" thành "Peter S.", "Nguyễn Văn Tiến" thành "Nguyễn T.";
  - một từ: chữ cái đầu rồi "•••";
  - chữ cái đầu của avatar lấy từ tên đã che.
- **Email:** hai ký tự đầu của phần trước @, "•••@", rồi tên miền: "pe•••@gmail.com". Phần trước @ chỉ một hay hai ký tự thì giữ một
  ký tự.
- **Số điện thoại:** hai số đầu, ba số cuối, phần giữa che, nhóm như số mẫu: "09•• ••• 678". Số rỗng vẫn rỗng.
- **Địa chỉ:** dòng số nhà và đường (`line`) thành "•••". Phường, tỉnh in đủ.
- **Chữ tự do khách thật gõ mà quản trị in ra:** liệt kê từng chỗ tìm thấy (ví dụ ghi chú lúc đặt hàng nếu có), che cả chỗ đó,
  rồi báo lại.
- Ghi chú nội bộ do quản trị gõ và mã vận đơn không che.

**Che ở đâu:**
- Mọi chỗ quản trị in dữ liệu của người thật:
  - danh sách và trang một khách (kể cả sổ địa chỉ), đường dẫn trên trang khách;
  - sổ đơn, trang một đơn (dòng đầu, Giao tới, thẻ Khách, hành trình), hàng chờ ở Tổng quan;
  - phiếu giao in;
  - CSV đơn, khách, nhật ký, doanh thu;
  - Nhật ký: `lib/activity-log.ts` lấy tên chủ đơn từ sổ đơn;
  - `aria-label` như "Thao tác <tên khách>".
- **Giá trị thật không được rời server.** Che ở lớp đọc dữ liệu của quản trị (`lib/db`, `lib/admin-*`), trước khi dữ liệu tới
  component. HTML, payload RSC và CSV không được chứa giá trị thật. Kiểm bằng cách tìm chuỗi thật trong phản hồi.
- **Chỗ đã biết đang lộ** (kiểm kê 06/10; số dòng có thể đã xê dịch):
  - email vãng lai và ghi chú của mỗi đơn có trong dữ liệu trang dù không hiện (`lib/db/order-dto.ts` ~252);
  - email người làm (actor) của Nhật ký có trong dữ liệu trang (`lib/db/event-dto.ts` ~418, `app/admin/log/page.tsx`). Với
    `ORDER_PLACED` của khách vãng lai, đó là email khách gõ;
  - payload `ORDER_ADDRESS_EDITED` giữ trọn người nhận, số điện thoại, số nhà trước và sau khi sửa;
  - trang một khách nạp cả sổ địa chỉ vào dữ liệu trang;
  - danh sách khách có thao tác "Chép email", và CSV khách xuất mọi hàng chứ không chỉ hàng đang lọc;
  - phiếu giao in ghi chú của khách.
- **Tìm trong quản trị** chỉ khớp chữ đang hiện. Gõ trọn email hay số điện thoại thật của một người thật thì không ra kết quả, để
  không thành cách dò xem ai có tài khoản.
- **Thao tác làm lộ phần đã che:**
  - "Sửa địa chỉ" không có với đơn của người thật;
  - nút chép số điện thoại hay email (nếu có) chép bản đã che hoặc không hiện. Báo lại đã làm cách nào ở từng chỗ.
- **Phía cửa hàng không đổi:** chủ tài khoản vẫn thấy đủ dữ liệu của mình ở Tôi, đơn, tra đơn.
- Dữ liệu mẫu hiện y như cũ: mọi màn chỉ có dữ liệu mẫu phải giống từng pixel, cả `vi` lẫn `en`.

**Xoá tài khoản thật mỗi ngày (QĐ-45):**
- Lần đặt lại hằng ngày của cron (`app/api/reset/route.ts`) xoá mọi tài khoản không thuộc dữ liệu mẫu, sau `reset_demo`.
  - Tài khoản mẫu là tám khách mẫu và quản trị mẫu. Nhận ra bằng `handle`, và đối chiếu với danh sách email cố định đã có
    (`lib/demo-accounts.ts`). Không bao giờ xoá một tài khoản trong danh sách đó.
  - Xoá qua Auth admin API bằng service client (`lib/db/service.ts`), vì cron không có phiên.
  - FK đã cascade sang hồ sơ, địa chỉ, yêu thích, nhắc, cài đặt, `removed_addresses`. Đo lại trên stack cục bộ.
- **Không** xoá khi bấm "Đặt lại dữ liệu mẫu" trong quản trị (`resetDemo`): nút đó ai cũng bấm được.
- Một tài khoản xoá lỗi thì ghi log rồi làm tiếp các tài khoản khác. Route vẫn trả kết quả như cũ, kèm số tài khoản đã xoá.
- **Test DB:** tạo hai tài khoản thật có địa chỉ, yêu thích, nhắc, cùng một đơn, rồi gọi đường xoá của cron:
  - hai tài khoản và mọi hàng của chúng biến mất;
  - chín tài khoản mẫu còn nguyên và vẫn đăng nhập được bằng `DEMO_PASSWORD`.

**Ranh giới đã chấp nhận:**
- Che ở lớp server, không đổi RLS.
- Phiên quản trị thử về lý thuyết đọc được hàng gốc qua REST của Supabase. Muốn vậy phải có publishable key, mà key này không bao
  giờ tới trình duyệt (`.env.example`).
- Nếu tìm thấy đường nào khác đưa giá trị thật tới trình duyệt, dừng lại và báo.

## 3. Kiểm

- `npm run typecheck`, `npm test`, `npm run test:db`, `npm run build` sạch. Test cũ xanh mà không sửa.
- **Test mới:**
  - hàm che: tên một từ, nhiều từ, có dấu; email ngắn; số rỗng;
  - cách phân biệt đơn mẫu và đơn thật, qua một lần đặt lại;
  - CSV;
  - tìm không khớp giá trị thật.
- **Dựng dữ liệu người thật trên stack cục bộ:**
  - một tài khoản tạo bằng email, đặt một đơn;
  - một đơn vãng lai;
  - một đơn của khách mẫu đặt bằng "Đăng nhập thử" (phải hiện đủ).
- **Ảnh** ở `.playwright-cli/shots/backend/b17/`, 1280, `vi` và `en`:
  - danh sách khách, trang khách thật;
  - sổ đơn, trang đơn thật (mở menu "Thao tác khác");
  - phiếu giao;
  - Nhật ký, Tổng quan.
- **Bản chỉ có dữ liệu mẫu:** so trước và sau ở mọi route quản trị, cả hai ngôn ngữ. Chỉ được lệch chữ chạy theo đồng hồ.
- Tìm chuỗi thật (tên đầy đủ, email, số, số nhà) trong HTML, payload RSC và CSV tải về: 0 lần.
- Đo trong cửa sổ thật 1280×800: không route nào có thanh cuộn ngang mà trước đó không có.
- Xong thì `select public.reset_demo(public.demo_anchor());` và xoá tài khoản thử đã tạo.

## 4. Báo cáo

Theo hợp đồng sáu mục, trọn trong tin cuối. Thêm:
- cách phân biệt đơn mẫu đã chọn, và vì sao;
- danh sách mọi chỗ đã che, theo màn;
- chữ tự do tìm thấy;
- các thao tác đã ẩn hay đổi.
