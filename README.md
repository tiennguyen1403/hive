# HIVE

Cửa hàng streetwear bán theo Số (drop), dựng làm **demo cho portfolio**. Không có khách thật, không có tiền
thật: đơn đặt ở đây không được giao, không ai thu tiền.

Demo: https://hive-neon-three.vercel.app

## Dựng bằng gì

- **Next.js 16** (App Router, React 19, TypeScript): đọc dữ liệu trong Server Components, ghi bằng Server Actions.
- **Supabase**: Postgres (RLS trên mọi bảng; đặt hàng và mọi thao tác quản trị là hàm SQL), Auth (email và mật
  khẩu), Storage (ảnh sản phẩm tải lên). **Chỉ server** nói chuyện với Supabase; trình duyệt không gửi request
  nào ra ngoài origin của app.
- **Vercel Hobby**, vùng Singapore (`sin1`), cạnh dự án Supabase ở `ap-southeast-1`.
- **Hai cron hằng ngày** (`vercel.json`): `/api/reset` đặt lại dữ liệu mẫu trong khung 19:00–20:00 giờ Việt Nam
  (gói Hobby chỉ hứa đúng giờ, không hứa đúng phút); `/api/health` truy vấn cơ sở dữ liệu mỗi ngày để dự án
  Supabase Free không bị tạm dừng.
- **Giới hạn tần suất đếm trong Postgres** (bảng `rate_hits`, chỉ máy chủ đọc ghi; khoá là HMAC của IP, IPv6 tính
  theo dải /64): đặt đơn, đăng nhập và đăng ký, sổ địa chỉ, mọi thao tác quản trị, tải ảnh — để một người xem không
  làm hỏng demo cho người khác.

## Chạy cục bộ

Cần Node.js 20.9 trở lên và Docker Desktop.

1. `npm install`
2. `npx supabase start`: dựng Postgres, Auth, Storage trong Docker; lần đầu tự áp migration rồi seed.
3. Chép `.env.example` thành `.env.local`, điền từ `npx supabase status -o env`.
4. `npm run seed:users`: tạo 8 khách mẫu và 1 quản lý, rồi đặt lại dữ liệu mẫu theo giờ thật.
5. `npm run preview`: build rồi chạy ở `http://127.0.0.1:3200`.

## Kiểm

- `npm test`: logic thuần, không cần Docker.
- `npm run test:db`: hàm SQL, RLS và phân quyền; cần stack Supabase cục bộ đang chạy.
- `npx playwright cli --raw run-code --filename=tools/layout-sweep.js > .playwright-cli/sweep.json`: soát bố cục
  mọi trang ở 390px và 1280px, khi preview đang chạy.

## Tài khoản mẫu

Mật khẩu chung `xemthu-2026`, **công khai theo thiết kế**: màn đăng nhập in sẵn nó, và hai nút "Đăng nhập thử"
(khách `minhanh@email.com`) và "Vào quản trị thử" (quản lý `quanly@email.com`) mở tài khoản bằng một lần bấm.
Ai cũng đăng ký được tài khoản mới. Mỗi ngày đơn hàng, tồn kho, Số, mã giảm giá, mẫu thêm mới và ảnh tải lên về
lại bản mẫu; nút "Đặt lại dữ liệu mẫu" trong khu quản trị làm việc đó ngay lập tức.

Tài khoản mẫu dùng chung nên **không đổi được mật khẩu**; muốn thử đổi mật khẩu thì đăng ký tài khoản riêng. Lần
đặt lại hằng ngày cũng kiểm lại mật khẩu của chín tài khoản mẫu và chỉ trả về `xemthu-2026` tài khoản nào đã bị đổi,
nên không đăng xuất người đang xem.

## Cố ý không có

Theo QĐ-25 §10 (`tasks/backend.md`): cổng thanh toán và webhook ngân hàng (chuyển khoản do quản lý đối chiếu
tay, hoặc COD), API đơn vị vận chuyển (mã vận đơn nhập tay), gửi email hay SMS.

## Tài liệu

`PRODUCT.md` (sản phẩm) · `DESIGN.md` (hệ thiết kế) · `tasks/backend.md` (các quyết định backend).
