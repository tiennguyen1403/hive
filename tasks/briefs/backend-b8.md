# Brief B8: email tuỳ chọn khi đặt hàng, bỏ yêu cầu "đồng ý điều kiện"

*27/09/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `tasks/`, `.impeccable/`, `.claude/`, `tools/`.
- **Chỉ stack Docker cục bộ.** Không đọc `.env.hosted.local`; không `supabase link/push`; không `vercel` CLI. Không bật lại
  Studio hay pg_meta.
- Máy xem thử 3200 đang chạy bản dựng mới nhất; được dừng và khởi lại theo định nghĩa agent.

## 1. Lát

Đợt v4 đưa Feed vào app; lát UI 2 đã dựng trang thanh toán Feed (`components/feed/checkout/CheckoutView.tsx`,
`lib/feed-checkout.ts`). Người dùng chốt ngày 27/09, xem cuối `tasks/plan.md`, mục "Lát 2 ĐẠT":
- **Email tuỳ chọn** như mock Feed (`prototype/explore/feed/checkout.js`, nhãn "Email" kèm "tuỳ chọn"). App chưa gửi email
  nào (QĐ-35).
- **Bỏ ô "Đồng ý điều kiện"** như Feed. Lát 2 đã bỏ ô trên màn, nhưng vẫn gửi `agreed: true` cho qua kiểm của server. Việc
  này ghi nhận một sự đồng ý không có thật, nên phải bỏ yêu cầu ở server.

| Việc | Có | Không |
|---|---|---|
| Đặt hàng (SQL) | Migration mới, `place_order` v6, lấy nguyên v5 (`20260927120000_card_pays_by_transfer.sql`) rồi chỉ sửa phần email: rỗng thì lưu `null`; có nhập thì vẫn phải đúng dạng như cũ. Nếu `orders.email` đang `not null` thì nới ra. Người thực hiện sự kiện `ORDER_PLACED` của khách vãng lai không email: chọn giá trị theo quy ước của nhật ký, ghi lý do. | Không đổi luật khác của `place_order`. |
| Kiểm ở server (TS) | `lib/checkout-form.ts` `validateCheckout` và `lib/order-payload.ts` `readPlaceOrderPayload`: email tuỳ chọn, chỉ kiểm dạng khi có; **không còn yêu cầu `agreed`**. Kiểu giữ `agreed` là tuỳ chọn hoặc bỏ, sao cho mã v3 mồ côi (`components/checkout/CheckoutScreen.tsx`) vẫn biên dịch; mã đó sẽ dọn ở lát cuối. | Không đụng `lib/account-form.ts`: ô đồng ý của form tạo tài khoản thuộc lát 3. |
| Màn thanh toán Feed | Nhãn "Email" kèm `<span class="opt">tuỳ chọn</span>` đúng như mock; bỏ lỗi "Nhập email"; giữ lỗi dạng email bằng chữ của mock; bỏ `agreed: true` khỏi dữ liệu gửi; sửa chú giải ở `lib/feed-checkout.ts` (dòng khoảng 123). | Không đổi gì khác trên màn. |
| Chỗ đọc email của đơn | Nơi nào in email của đơn (quản trị v3: danh sách, chi tiết, CSV, khách hàng; biên nhận; tra cứu) phải chịu được `null`: không in dòng rỗng, không in gạch ngang. | — |
| Chú giải | `lib/orders.ts#transferReference`: sửa chú giải cho khớp điều khách thấy, là nội dung **không gạch** như mock (`DH2432`). | Không đổi logic tạo nội dung. |

## 2. Kiểm

- `npx supabase db reset` sạch; `npm run test:db` xanh. Thêm test:
  - khách vãng lai đặt không email thì thành đơn, `email` null;
  - email sai dạng bị từ chối;
  - email đúng thì lưu;
  - không còn cần `agreed`.
- `npm test` xanh, gồm test mới cho `validateCheckout` và `readPlaceOrderPayload`.
- `npm run typecheck`, `npm run build` sạch.
- Trên 3200, 390 và 1280:
  - khách chưa đăng nhập đặt một đơn không email: màn đặt hàng xong đúng;
  - quản trị mở đơn đó: không dòng rỗng, không lỗi; CSV xuất được;
  - chụp vào `.playwright-cli/shots/backend/b8/`.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 3. Nộp

- Migration, test, sửa TS.
- Báo cáo theo hợp đồng của agent, kèm lệnh người dùng chạy trên hosted khi deploy, theo cùng thứ tự B6 và B7.
