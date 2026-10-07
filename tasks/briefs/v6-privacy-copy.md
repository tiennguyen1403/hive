# Chữ trang `/privacy` (người dùng ĐÃ DUYỆT 06/10/2026)

*06/10/2026. Phiên chính soạn từ bản kiểm kê dữ liệu cá nhân ngày 06/10 (`tasks/plan.md`), theo QĐ-41, QĐ-44, QĐ-45. Mọi câu phải
còn đúng khi trang lên demo, tức là sau B16 (Google) và B17 (che, xoá mỗi ngày). Khi Stripe lên thì sửa lại trang.*

**Link:** cuối nhóm "Trợ giúp" ở chân trang, sau "Liên hệ": "Quyền riêng tư" / "Privacy" (`FOOT_HELP_TEXT`, `lib/feed-home.ts`).
**Khung:** như trang Giới thiệu.

*07/10, phiên chính sửa một dấu: "19:00–20:00" thành dạng khoảng giờ của Feed "19:00-20:00" (gạch nối không ngắt, `feedTight`),
theo luật người dùng không dùng gạch ngang dài trong chữ (`lib/feed-range.ts`, DESIGN.md §3). Nghĩa câu không đổi.*

## Tiếng Việt

# Quyền riêng tư

HIVE là cửa hàng demo. Đây là những gì demo lưu về bạn, ai xem được, và khi nào bị xoá.

## Demo lưu gì
- **Tài khoản:** tên, email, mật khẩu (chỉ lưu dạng băm) và số điện thoại nếu bạn nhập. Đăng nhập bằng Google thì Google gửi tên,
  email và ảnh đại diện; demo chỉ dùng tên và email.
- **Khi bạn dùng tài khoản:** địa chỉ, size, cài đặt thông báo, mẫu đã lưu và lời nhắc drop.
- **Đơn hàng:** người nhận, số điện thoại, địa chỉ, cùng email và ghi chú nếu bạn nhập.
- **Chống lạm dụng:** một mã băm từ địa chỉ IP, giữ vài ngày.

## Trên trình duyệt của bạn
- **Cookie:** ngôn ngữ, phiên đăng nhập, thông báo đã đọc, và các đơn bạn đặt khi chưa đăng nhập.
- **Bộ nhớ trình duyệt:** giỏ, mã giảm giá, tìm kiếm gần đây và chiều cao bạn nhập ở Bảng size.
- Không quảng cáo, không công cụ đo lường. Trang không tải gì từ bên thứ ba; chỉ khi đăng nhập bằng Google, trình duyệt mới chuyển
  qua Google.

## Ai xem được
- Trang quản trị của demo mở cho mọi người xem thử. Ở đó tên bạn được rút gọn; email, số điện thoại và số nhà bị che.
- Tài khoản thử là tài khoản dùng chung: những gì bạn nhập vào đó, người xem sau cũng thấy.
- Dữ liệu nằm ở Supabase và Vercel, máy chủ tại Singapore. Demo không gửi email, không bán và không chia sẻ dữ liệu.

## Khi nào bị xoá
- Mỗi ngày trong khoảng 19:00-20:00 giờ Việt Nam, demo xoá mọi tài khoản, đơn và dữ liệu bạn đã tạo.
- Dữ liệu trên trình duyệt: xoá trong cài đặt của trình duyệt.

Cập nhật [ngày lên demo].

## English

# Privacy

HIVE is a demo shop. This is what the demo keeps about you, who can see it, and when it is deleted.

## What the demo keeps
- **Account:** name, email, password (stored only as a hash) and your phone number if you add one. If you sign in with Google,
  Google sends your name, email and profile picture; the demo uses only the name and email.
- **While you use your account:** addresses, sizes, notification settings, saved styles and drop reminders.
- **Orders:** recipient, phone number, address, and the email and note if you add them.
- **Abuse protection:** a hash of your IP address, kept for a few days.

## In your browser
- **Cookies:** language, sign-in session, notifications you have read, and orders placed without an account.
- **Browser storage:** your bag, discount code, recent searches and the height you enter in the size guide.
- No ads and no analytics. Pages load nothing from third parties; only signing in with Google takes your browser to Google.

## Who can see it
- The demo's back office is open for anyone to try. There, your name is shortened and your email, phone number and street address
  are hidden.
- The demo accounts are shared: whatever you enter in them, the next visitor sees too.
- Data is stored with Supabase and Vercel, on servers in Singapore. The demo sends no email and does not sell or share data.

## When it is deleted
- Every day between 19:00 and 20:00 Vietnam time, the demo deletes every account, order and piece of data you created.
- To clear what is in your browser, use your browser's settings.

Updated [date it goes live].
