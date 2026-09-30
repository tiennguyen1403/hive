# Brief B11: tra cứu đơn nói rõ chỗ sai, giới hạn số lần tra, chỉ trả những gì màn tra cứu hiện

*30/09/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `tasks/`, `.impeccable/`, `.claude/`, `tools/`.
- **Chỉ stack Docker cục bộ.** Không đọc `.env.hosted.local`; không `supabase link/push`; không `vercel` CLI. Không bật lại
  Studio hay pg_meta.
- Máy xem thử 3200 đang chạy bản dựng lát 3b (`465b5a6`); được dừng và khởi lại theo định nghĩa agent.
- Không git commit, stash, reset hay checkout. Để nguyên `tasks/anh-san-pham-prompt.md`, `tasks/lookbook-register.md` (phiên
  khác) và các brief trong `tasks/briefs/`.

## 1. Lát

Lát UI 4a sẽ dựng Tra cứu đơn theo mock Feed (`prototype/explore/feed/track.js`, và `lookup` trong
`prototype/explore/shared/data.js`). Lát này làm phần server để màn đó giống mock.

**Người dùng chốt (30/09):** khi không khớp, báo **hai câu riêng** như mock:
- "Không có đơn nào mang mã này" (dưới ô Mã đơn);
- "Số điện thoại không khớp với đơn" (dưới ô Số điện thoại).

Việc này bỏ luật một câu chung của QĐ-16 cho riêng màn tra cứu. Bù lại, lát này thêm giới hạn số lần tra.

Hôm nay `/track` tra ngay khi trang được vẽ, từ `code` và `phone` trên URL, qua `trackOrder` → `track_order()`. Hàm trả đơn
hoặc null, không nói vì sao. Chưa có giới hạn tần suất.

| Việc | Có | Không |
|---|---|---|
| **Lý do không khớp** | Một đường tra mới trả **đơn** hoặc **một trong hai lý do**: không có đơn mang mã này, hoặc số điện thoại không khớp. Mã và số đọc như app đang đọc (`normaliseOrderCode`, `phoneDigits`). | Không đổi `track_order()` đang chạy: code cũ phải chạy được trên DB mới, vì deploy đưa DB lên trước. |
| **Chỉ trả những gì màn hiện** | Mock cho khách chưa đăng nhập thấy: mã, dòng hàng, bốn bước kèm giờ, khối việc theo trạng thái (số tiền và nội dung chuyển khoản, dòng gọi xác nhận COD, mã vận đơn, hạn đổi trả, lý do huỷ), các món và tổng tiền. **Không có địa chỉ, không có tên người nhận**: "The address and the actions that need the account stay on the order page". Đường tra mới chỉ trả chừng đó, kèm DTO có kiểu riêng. | Không mở gì thêm cho `anon`. |
| **Giới hạn số lần tra** | Bucket mới `lookup`, 10 lượt / 10 phút / người xem, theo đúng cách các bucket khác được khai (`rate_hits` check, danh sách của `take_rate`, `lib/rate-limit.ts`). Mỗi lần tra thật tốn một lượt, dù tra từ form hay từ một link mang sẵn mã và số. Hết lượt thì trả câu giới hạn tần suất của app. **Một lần tra chỉ tính một lượt**: render lại hay prefetch không được tính thêm. | — |
| **Chỗ gọi** | DAL cho đường tra mới, cùng một Server Action cho form, để UI 4a gọi mà không phải tải lại trang. Trang `/track` v3 hiện có **vẫn chạy như cũ** tới lát 4a. | Không dựng màn Feed ở lát này. |

## 2. Kiểm

- `npx supabase db reset` sạch; `npm run test:db` xanh. Thêm test:
  - đúng mã, đúng số: có đơn, không có địa chỉ hay tên người nhận;
  - mã không có: lý do "không có đơn";
  - mã có, số sai: lý do "số không khớp";
  - số viết có khoảng trắng hay dấu chấm vẫn khớp;
  - lượt thứ 11 trong 10 phút bị chặn;
  - `anon` gọi được đường tra nhưng không đọc thẳng được bảng nào;
  - `track_order()` cũ trả như trước.
- `npm test` xanh; `npm run typecheck`, `npm run build` sạch. Màn v3 không đổi hình.
- Xong thì `select public.reset_demo(public.demo_anchor());` và xoá lượt tra đã dùng khi kiểm, nếu `reset_demo` không xoá.

## 3. Nộp

- Migration, `lib/db/database.types.ts` sinh lại, DAL, action, test.
- Báo cáo theo hợp đồng của agent, gửi trọn trong **tin cuối**. Kèm:
  - chữ ký DAL và action, cùng DTO của đơn tra được, để phiên chính viết brief 4a;
  - lệnh người dùng chạy trên hosted khi deploy, và thứ tự an toàn giữa code và `db push`;
  - việc còn mở.
