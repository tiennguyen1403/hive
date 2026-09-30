# Brief B12: hai mốc giờ cho hộp thư Thông báo

*30/09/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `tasks/`, `.impeccable/`, `.claude/`, `tools/`.
- **Chỉ stack Docker cục bộ.** Không đọc `.env.hosted.local`; không `supabase link/push`; không `vercel` CLI. Không bật lại
  Studio hay pg_meta.
- Máy xem thử 3200 được dừng và khởi lại theo định nghĩa agent.
- Không git commit, stash, reset hay checkout. Để nguyên `tasks/anh-san-pham-prompt.md`, `tasks/lookbook-register.md` (phiên
  khác) và các brief trong `tasks/briefs/`.

## 1. Lát

Lát UI 4a dựng trang Thông báo theo mock Feed (`prototype/explore/feed/notifications.js`). Hộp thư của mock
(`NOTIFICATIONS` trong `prototype/explore/shared/data.js`) có mỗi dòng một mốc giờ thật. App dựng hộp thư từ dữ liệu. Đơn,
Số, mã giảm giá và nhắc đã có mốc: `moments` (B10), `opensAt`, `closesAt`, `endsAt`. Hai loại dòng còn thiếu mốc:

| Dòng của mock | Cần | Có | Không |
|---|---|---|---|
| "BỤI đen còn 1 chiếc", body "Size L" (loại `wishlist`, công tắc "Mẫu đã lưu sắp hết") | Lúc màu đó còn ít như bây giờ | Với mỗi màu của mỗi mẫu trong catalogue: **lần bán gần nhất**, là mốc đặt của đơn gần nhất còn hiệu lực có màu đó, bỏ đơn đã huỷ. Chưa bán lần nào thì null. Đưa ra catalogue công khai theo cách `stock` và `soldOutAt` đang được đưa, thiếu khoá thì đọc thành null. | Không lộ gì về đơn ngoài một mốc giờ cho mỗi màu: không mã đơn, không số lượng, không người mua. |
| "Số 06 công bố: SỎI và NGÓI", body "Mở 20:00 thứ Sáu 02/10" (loại `drop`, công tắc "Số mới") | Lúc Số sắp mở được công bố | `announced_at` cho phần hé lộ của Số sắp mở (`teasers`, hoặc chỗ app đang giữ phần hé lộ). Quản trị thêm hé lộ thì ghi lúc thêm. Dữ liệu mẫu soạn mốc này theo đúng độ lệch của mock: công bố 18/09 12:00 so với mở 02/10 20:00, tức trước giờ mở 14 ngày 8 giờ; ghi quy tắc cạnh fixture. Đưa ra catalogue; thiếu thì null. | Không đổi giá trị cũ nào của fixture. |

Quy tắc dữ liệu mẫu giống B10: đây là dữ liệu mẫu tự soạn, không phải số suy ra trên màn (DESIGN.md §9 luật 1).
`reset_demo` phải dời mốc công bố cùng nhịp với các mốc khác.

## 2. Kiểm

- `npx supabase db reset` sạch; `npm run test:db` xanh. Thêm test:
  - màu có đơn thì có mốc bán gần nhất; đơn huỷ không tính; màu chưa bán thì null;
  - catalogue không lộ mã đơn hay người mua;
  - hé lộ mẫu có mốc công bố đúng độ lệch sau `reset_demo`;
  - hé lộ quản trị thêm mới có mốc lúc thêm.
- `npm test` xanh, gồm test cho fixture và `gen-seed`. `npm run typecheck`, `npm run build` sạch. Màn nào cũng không đổi hình.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 3. Nộp

- Migration, `lib/db/database.types.ts` sinh lại, seed sinh lại, DTO catalogue, test.
- Báo cáo theo hợp đồng của agent, gửi trọn trong **tin cuối**. Kèm:
  - tên trường mới trong `Product` và phần hé lộ, cách đọc;
  - lệnh deploy hosted và thứ tự an toàn;
  - việc còn mở.
