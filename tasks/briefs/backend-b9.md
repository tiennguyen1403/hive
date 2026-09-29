# Brief B9: yêu thích, nhắc mở bán, Size của tôi, công tắc thông báo lưu theo tài khoản; sửa hồ sơ

*29/09/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `tasks/`, `.impeccable/`, `.claude/`, `tools/`.
- **Chỉ stack Docker cục bộ.** Không đọc `.env.hosted.local`; không `supabase link/push`; không `vercel` CLI. Không bật lại
  Studio hay pg_meta.
- Máy xem thử 3200 đang chạy bản dựng mới nhất (`e6b128c`); được dừng và khởi lại theo định nghĩa agent.
- Không git commit, stash, reset hay checkout. Hai tệp `tasks/anh-san-pham-prompt.md` và `tasks/lookbook-register.md` là
  của phiên khác, để nguyên.

## 1. Lát

Đợt v4 đưa Feed vào app (cuối `tasks/plan.md`, mục "Đợt v4 Feed"). Lát UI 3 dựng phần tài khoản theo mock
`prototype/explore/feed/`: `account.html` (Tôi), `favorites.html`, `profile.html`, và nút tim, "Nhắc tôi", size nhớ trên
mọi trang. Hôm nay bốn thứ đó nằm trên trình duyệt:
- yêu thích: `lib/wishlist.ts`;
- nhắc mở bán: `lib/reminder.ts`;
- size nhớ và công tắc thông báo: `lib/prefs.ts`.

Hồ sơ đang chỉ đọc. Người dùng đã chốt (27/09): **yêu thích bắt buộc đăng nhập**, và Feed lưu những thứ này theo tài khoản.
Lát này **chỉ làm phần server**. Giao diện do lát UI 3b nối sau, nên màn v3 và màn Feed hiện có không đổi hình.

Hành vi lấy từ mock: `feed.js` (`favorites`, `reminders`, `mySize`, `askSignIn`), `favorites.js`, `profile.js`,
`notifications.js` (`PREFS`), `account.js` (`profile`, `SI_RULES`). Dữ liệu khách mẫu của mock ở `prototype/explore/shared/
data.js` (`ACCOUNT.sizes`, `FAVORITES`, `REMINDERS`).

| Việc | Có | Không |
|---|---|---|
| **Yêu thích** | Bảng theo tài khoản, **mỗi mẫu một dòng** kèm màu đã lưu và lúc lưu, mới nhất trước (mock: `[{ slug, color }]`, `has(slug)`, thêm vào đầu). Màu phải là một màu của mẫu đó; không truyền màu thì lấy màu đầu (`firstColor`). Lưu được cả mẫu của Số đã đóng và mẫu Cố định. Bỏ lưu trả về dòng vừa bỏ, để **Hoàn tác** đặt nó về **đúng chỗ cũ** trong danh sách. | Không giới hạn số mẫu ngoài khoá chính. Không nhập danh sách trên trình duyệt vào tài khoản khi đăng nhập (phiên chính quyết: bỏ dữ liệu thiết bị). |
| **Nhắc mở bán** | Bảng theo tài khoản, một dòng cho mỗi Số. Bật chỉ được khi Số **chưa mở** (`opens_at > now`); tắt lúc nào cũng được. Đọc ra chỉ những Số còn sắp mở (mock lọc `UPCOMING`). | Không lưu kênh: chỉ có "Trong app" (QĐ-35, chưa có email). |
| **Size của tôi** | Hai giá trị riêng: **áo** và **quần**, mỗi cái một size trong `SIZES` hoặc để trống. | — |
| **Công tắc thông báo** | Bốn công tắc, mặc định bật: `order` (Đơn hàng), `drop` (Số mới), `wishlist` (Mẫu đã lưu sắp hết), `promo` (Mã sắp hết hạn), đúng `PREFS` của `notifications.js`. | Không dựng hộp thư hay gửi gì: lát 4 dùng. |
| **Sửa hồ sơ** | Đổi **họ tên** và **số điện thoại** của chính mình. Luật và chữ lỗi của mock (`profile.js`): tên từ 2 ký tự ("Nhập họ và tên"); số trống thì "Nhập số điện thoại", sai thì "Số điện thoại gồm 10 số, bắt đầu bằng 0"; nhận khoảng trắng và dấu chấm, lưu 10 chữ số. Đặt thêm độ dài tối đa cho tên, cả ở TS lẫn SQL. | **Email chỉ đọc** (QĐ-35): không đổi `profiles.email`, không đổi `handle`. |
| **Đọc gộp** | Một lần đọc cho người đang đăng nhập: yêu thích (mới nhất trước), nhắc (Số còn sắp mở), size áo/quần, bốn công tắc. Ví dụ hàm `my_state()` và DAL `getMyState()` trả DTO có kiểu; chưa đăng nhập thì `null`. Lát 3b gọi nó ở layout gốc, cạnh `me` (`app/layout.tsx`, `MeProvider`). | Không gắn vào layout hay màn nào ở lát này. |
| **Server Action** | Mỗi việc ghi một action, trả trạng thái mới để UI cập nhật lạc quan. Gồm: lưu mẫu, bỏ lưu kèm dòng cũ, hoàn tác, bật/tắt nhắc, đặt size áo/quần, bật/tắt công tắc, sửa hồ sơ. Chưa đăng nhập thì trả một lý do riêng, ví dụ `SIGNED_OUT`, **không ghi gì**; UI 3b sẽ hiện thông báo mời đăng nhập của mock ("Đăng nhập để lưu mẫu", "Đăng nhập để bật nhắc"). | Không đổi action có sẵn. |
| **An toàn** | RLS: mỗi tài khoản chỉ đọc và ghi dòng của mình. Ghi qua hàm `security definer` với `auth.uid()`, hoặc policy chặt, theo lối các bảng tài khoản đang có (`addresses`). Kiểm đầu vào ở cả TS và SQL. | Không mở cho `anon`. |
| **Dữ liệu mẫu** | Khách mẫu thứ nhất `c-minhanh` (email in ở trang Đăng nhập) có sẵn như khách mẫu của mock: yêu thích BỤI đen (`p-bui`), THAN navy (`p-than`), MUỐI xám (`p-muoi`), HOODIE TRƠN xám (`p-hoodie-tron`), theo thứ tự đó; nhắc Số 06; size áo L, quần M. Ghi ở `data/customers.ts`, sinh seed bằng `npm run seed:gen`, qua bảng `seed_*` như sổ địa chỉ. `reset_demo` trả tài khoản mẫu về đúng dữ liệu này. Tài khoản khách tự tạo: theo đúng cách `reset_demo` đang đối xử với sổ địa chỉ của họ, ghi rõ trong báo cáo. | Không đổi dữ liệu mẫu nào khác. |

Tài khoản mẫu dùng chung cho mọi người xem demo. Sửa tên và số của tài khoản mẫu **vẫn được**, lần reset 19:00 trả lại. Mật
khẩu mẫu vẫn khoá như B4b.

## 2. Kiểm

- `npx supabase db reset` sạch; `npm run test:db` xanh. Thêm test cho:
  - RLS: tài khoản A không đọc, không ghi được yêu thích, nhắc, size, công tắc của B; `anon` không đọc được gì;
  - lưu mẫu hai lần vẫn một dòng; màu không thuộc mẫu thì bị từ chối; bỏ lưu rồi hoàn tác về đúng chỗ;
  - bật nhắc cho Số đã mở hoặc Số không có thì bị từ chối; `my_state` không trả nhắc của Số đã mở;
  - sửa hồ sơ: tên ngắn, số sai bị từ chối; số có khoảng trắng và dấu chấm lưu 10 chữ số; email và handle không đổi;
  - `reset_demo` trả `c-minhanh` về 4 mẫu, nhắc Số 06, L/M, bốn công tắc bật.
- `npm test` xanh, có test cho các luật kiểm ở TS. `npm run typecheck`, `npm run build` sạch.
- Màn v3 và Feed không đổi hình: mở `/`, `/products/s05-khoi`, `/account` trên 3200 ở 390, 0 lỗi console.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 3. Nộp

- Migration, `lib/db/database.types.ts` sinh lại, seed sinh lại, DAL, action, test.
- Báo cáo theo hợp đồng của agent, gửi trọn trong **tin cuối** (agent không ghi được tệp báo cáo). Kèm:
  - chữ ký từng action và DTO của `getMyState()`, để phiên chính viết brief 3b;
  - lệnh người dùng chạy trên hosted khi deploy, và thứ tự an toàn giữa đẩy code và `db push` cho lát này;
  - việc còn mở.
