# Brief lát 9 · v3 — logo giữa màn hình khi chuyển trang

Phiên chính viết ngày 24/09/2026. Agent `ui-implementer` thực thi; phiên chính duyệt lại độc lập bằng ảnh chụp thật. Người dùng **đã duyệt**
trên bảng bấm thử ngày 24/09. Các câu gốc của người dùng:
- "Trong lúc chờ tôi nghĩ chúng ta nên thiết kế một global loading cho store. vì trên deployed site khi tôi click qua một trang khác tôi
  thấy có một chút độ trễ, tôi nghĩ điều này sẽ làm tăng UX."
- Trả lời hỏi lại: phạm vi **cửa hàng + tài khoản** (không làm khu quản trị); muốn bấm thử "Đường may" và "Logo giữa màn hình".
- "Tôi chọn logo giữa màn hình và không giảm chuyển động". Hỏi lại, người dùng chốt thêm hai điều:
  - bản chạy đủ là bản mọi người thấy; **máy nào tự bật "Giảm chuyển động"** trong cài đặt hệ điều hành thì thấy **bản đứng yên**;
  - logo **chỉ hiện khi sang trang khác**. Lọc, sắp xếp, đổi họ ngay trong trang danh mục thì không che trang, giống hiện nay.

**Mock (chuẩn đối chiếu):**
- Bảng `prototype/v3/loading.html`, kiểu "Logo giữa màn hình". Mở bằng `cd prototype && python serve.py 3100`, rồi vào `/v3/loading.html`.
- Script trong trang có đối tượng `veil` (các hàm `draw`, `start`, `done`, `tick`). Đó là **bản tham chiếu về thời gian và hình**: chép ý,
  không chép nguyên. Đối tượng `seam` (Đường may) **không làm**.
- Ảnh trang thật mà bảng dùng nằm ở `prototype/v3/loading/`.

**Số đo đã có:**
- Trên site thật, từ lúc bấm tới lúc trang mới hiện mất 0,28–0,47 s.
- Nguyên nhân (`node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`): route động không có `loading.tsx`
  thì Link không prefetch, nên bấm là phải chờ máy chủ.

Ảnh nộp vào `.playwright-cli/shots/v3/lat9/`.

## 1. Phạm vi

| Tệp | Việc |
|---|---|
| component client mới (gợi ý `components/shop/WaitVeil.tsx`) | lớp trắng, mark, cung chỉ; bắt đầu và kết thúc lượt chờ |
| hàm thuần mới + test (gợi ý `lib/wait.ts` + `lib/wait.test.ts`) | quyết định một lượt chuyển trang có che trang hay không (§2.2) |
| `app/layout.tsx` | render component **một lần**, ở trên ranh giới trang (§2.6) |
| các chỗ `router.push`/`router.replace` của cửa hàng có thể đổi trang | gọi hàm bắt đầu (§2.6) |
| CSS | theo quy ước của hệ (§2.7) |
| `app/globals.css`, `app/styles/nav.css`, `app/styles/buttons.css` | hai việc nhỏ từ finish review lát 8 (§4) |

**Không đụng:**
- Không làm "Đường may" và không thêm `loading.tsx`.
- Khu quản trị không có lớp chờ.
- Form dùng Server Action giữ trạng thái chờ riêng của nút; không gắn lớp chờ vào form submit.
- Không đụng `DESIGN.md` (phiên chính cập nhật sau khi duyệt) và mock.

## 2. Quyết định đã chốt

1. **Nơi hiện:** mọi trang cửa hàng và tài khoản, tức mọi trang render trong `ShopFrame`. Không bao giờ hiện ở `/admin`, và không hiện
   lúc tải trang lần đầu.
2. **Khi nào che.** Chỉ che khi lượt chuyển tới một **pathname khác** pathname đang đứng.
   - Che: trang chủ → `/products`, `/products` → `/products/khoi`, trang mẫu → `/cart`, các trang tài khoản với nhau, link chân trang,
     nút Lùi/Tới khi pathname đổi.
   - Không che:
     - cùng pathname, chỉ khác query: chip lọc, sắp xếp, tab họ, link họ trên thanh khi đang ở `/products`, biển Số từ
       `/products?family=…`, ô tìm kiếm trên `/search`, form tra đơn;
     - chỉ đổi `#`;
     - mở tab hay cửa sổ mới: phím bổ trợ, chuột giữa, `target="_blank"`;
     - `download`;
     - khác origin;
     - đích là `/admin…`.
3. **Thời gian** (lấy từ `veil` của bảng):
   - **Chờ 120 ms** sau cú bấm. Trang về sớm hơn thì không hiện gì.
   - **Hiện:** lớp trắng đi từ 0 lên 1 trong 160 ms (ease-out bậc ba). Cụm logo phóng từ 0,92 lên 1 trong 240 ms.
   - **Đang chờ:** một cung dài 28% vòng chạy hết một vòng mỗi 1,1 s, tuyến tính, theo chiều kim đồng hồ, bắt đầu từ 12 giờ. Cung chạy trên
     **các mũi chỉ đứng yên**: mũi chỉ không quay, chỉ ô cửa sổ để lộ chúng di chuyển.
   - **Trang về:** cung dài ra thành cả vòng trong 150 ms (ease-out), sau đó lớp trắng mờ về 0 trong 180 ms. Trang mới đã được dựng sẵn
     bên dưới; phần đóng này **không bao giờ làm chậm** trang mới.
   - **Bấm lần nữa khi đang chờ:** lớp vẫn ở đó, lượt chờ đổi sang đích mới.
   - **Giảm chuyển động** (`prefers-reduced-motion: reduce`, đọc lúc bắt đầu): không phóng, không quay, vòng hiện nguyên và đứng yên. Vẫn
     chờ 120 ms; lớp trắng hiện trong 160 ms và tắt trong 180 ms.
4. **Hình:**
   - **Lớp trắng:**
     - `position:fixed`, phủ ngang toàn màn, từ **mép dưới thanh điều hướng** tới đáy màn. Mép dưới thanh là 57 px trên điện thoại
       (56 + viền 1 px) và 65 px từ 900 px.
     - Màu là `--bg` ở 92% (dùng `color-mix`).
     - Thanh điều hướng không bao giờ bị che và vẫn bấm được.
     - Khi lớp hiện, nó chặn con trỏ trên trang (`cursor: progress`) và mang `aria-hidden`.
     - Tầng chồng: trên thanh mua dính `.buybar3` và `.suggest` (30), dưới `.nav3` (40), dưới ba lớp nổi (sheet 50, menu 55, toast 80).
   - **Cụm logo:**
     - Nằm giữa lớp trắng.
     - SVG `viewBox="-50 -50 100 100"`, rộng 100 px trên desktop và 88 px trên điện thoại (mark 64 / 56 px).
     - Mark lấy từ `prototype/name/logo/hive-mark.svg`: hình tròn r500 `#eba400` và path hình `#171410`, **chép đúng từng byte** như
       `NavLogo` đã làm, ở `scale(.064)`. Màu là màu của logo, không theo token.
     - Vòng chỉ: `r=42`, nét 2, `var(--brand)`, `pathLength="300"`, `stroke-dasharray="6 4"` (30 mũi), bắt đầu từ 12 giờ.
     - Cung: là mask lên vòng chỉ, `r=42`, nét 8, `pathLength="100"`, `stroke-dasharray="28 72"`, quay quanh tâm.
5. **Trợ năng:**
   - Trong lúc chờ, `<main>` của trang mang `aria-busy="true"`. Component đặt rồi gỡ thuộc tính này trên DOM là được.
   - Khi trang mới tới, Next tự đọc tiêu đề trang.
   - Không dời focus, không bẫy focus.
6. **Cơ chế** (đây là ràng buộc, không phải đơn thuốc):
   - **Không thêm thư viện.**
   - **Bắt đầu** có ba nguồn:
     - cú bấm trái thường lên `<a href>` nội bộ ở bất kỳ đâu trong cửa hàng, **không sửa từng `<Link>`**;
     - nút Lùi/Tới;
     - một hàm export cho các chỗ đổi trang bằng code. Hàm này áp cùng luật §2.2, nên gọi ở chỗ không đổi pathname cũng vô hại.
       Chỗ phải gọi:
       - `CheckoutScreen` → `/order-confirmed/…`;
       - các `router.push` trong `SearchBox` có thể đổi pathname;
       - mọi `router.push`/`replace` khác của cửa hàng mà `grep` tìm thấy.
       Riêng khu quản trị thì không gọi.
   - **Kết thúc** khi lượt chuyển trang đã commit.
     - Tín hiệu có tài liệu là `usePathname`/`useSearchParams` đổi giá trị. Nhưng có hai trường hợp nó không đủ, và **lớp không được kẹt**
       ở trường hợp nào:
       - **Commit về đúng URL đang đứng.** Ví dụ: bấm logo trên `/so/N` lúc Số nổi bật đã đóng, `/` redirect về lại `/so/N`. Hoặc
         đang ở `/sign-in`, bấm một link mà máy chủ redirect về đúng `/sign-in`.
       - **Cú bấm bị huỷ** (`preventDefault`, `onNavigate`).
     - Chọn một cơ chế phủ được cả hai và giải thích lựa chọn trong chú thích. Có thể là trạng thái chờ theo transition như
       `02-guides/interactive-apps.md`, hoặc theo dõi lúc router ghi lịch sử.
     - Thêm một lưới an toàn dài (khoảng 10 s), chỉ chạm tới khi có lỗi.
   - **Lớp phải sống qua lúc đổi trang** để chơi phần đóng trên trang MỚI. `ShopFrame` render theo từng trang nên nó remount khi đổi
     trang. Vì vậy component nằm trong `app/layout.tsx`, và không làm gì trên `/admin`.
   - Máy chủ render trạng thái ẩn; không lệch hydrate. Vòng `requestAnimationFrame` chỉ chạy khi lớp đang hiện. Mọi pha đo theo **một
     đồng hồ** (`performance.now()`): bảng đã gặp lỗi khi lấy mốc khung hình của rAF, vì mốc đó có thể rơi trước cú bấm.
   - **Hàm thuần quyết định §2.2** có test cho từng trường hợp: khác pathname · cùng pathname khác query · chỉ `#` · khác origin ·
     phím bổ trợ, chuột giữa, `_blank`, `download` · đích `/admin`.
7. **CSS:**
   - Lớp chờ nằm **ngoài** `.s`, giống các lớp nổi. Theo DESIGN.md §6 "Lớp nổi": selector bắt đầu bằng chính tên lớp; biến thể là class,
     không phải vị trí.
   - Chọn tệp và thứ tự nạp theo §1 của DESIGN.md. Nếu thêm tệp mới vào `globals.css` thì ghi lý do.
   - Mốc 65 px từ 900 đặt theo quy ước desktop của hệ.
   - Đặt tên class mới thì `grep` trước (DESIGN.md §8, "Bẫy trùng tên"; `lib/classnames.test.ts`).

## 3. Kiểm (agent tự chứng minh)

1. `npm run typecheck`, `npm test`, `npm run build`.
2. **Máy chủ xem thử:** dừng bản 3200 đang chạy, build, chạy `npm run preview:serve` nền và **để nó chạy** khi xong.
3. **Ảnh** vào `.playwright-cli/shots/v3/lat9/`:
   - Máy cục bộ trả trang trong khoảng 0,05–0,15 s nên gần như không thấy lớp chờ. Muốn thấy thì trong Playwright giữ lại mọi request có
     `_rsc=` chừng 1,5 s, rồi mới cho đi tiếp.
   - Cần chụp:
     - 1280 và 390: bấm một mẫu trên `/products`, chụp ở 0,6 s (lớp và logo) và sau khi trang về (không còn lớp);
     - 1280, giảm chuyển động (`emulateMedia({ reducedMotion: "reduce" })`) ở 0,6 s: vòng nguyên, đứng yên.
   - So với bảng (kiểu Logo, 3 s): màu lớp trắng, cỡ và vị trí cụm logo (giữa vùng dưới thanh), vòng chỉ và cung. Ghi mọi chỗ lệch.
4. **Hành vi** (ghi kết quả từng dòng):
   - Không hiện khi trang về nhanh hơn 120 ms.
   - Không hiện với: chip lọc, sắp xếp, link họ khi đang ở `/products`, link chỉ đổi `#`, ctrl/cmd-click, `_blank`, đi vào `/admin`.
   - Có hiện với: nút "Xem mười mẫu", một thẻ mẫu, giỏ, link chân trang, trang tài khoản, nút Lùi sang pathname khác.
   - Commit về đúng URL đang đứng, và cú bấm bị huỷ: lớp không kẹt. Chỉ rõ đã dựng hai trường hợp này ra sao.
   - Checkout → xác nhận đơn: nếu đặt đơn ở máy cục bộ không tiện, chỉ ra chỗ gọi hàm và test hàm.
   - 0 lỗi console, 0 cảnh báo hydrate, không tràn ngang, lớp không bao giờ che thanh điều hướng.
   - Chạy `tools/layout-sweep.js` một lượt và so với lượt của lát 8.

## 4. Nhân tiện: hai việc từ finish review lát 8

1. Thêm token `--r-plate: 5px` (bo góc biển Số) cạnh các token bo góc trong `app/globals.css`. Dùng nó ở `app/styles/nav.css` (hiện là
   `border-radius:5px` của `.s .nav3 .itag`).
2. Sửa chú thích cũ ở `app/styles/buttons.css:114`: "the stamp in the nav" nay là biển Số.

## 5. Báo cáo

Báo lại những mục sau:
- danh sách tệp đổi;
- kết quả typecheck, test và build (số tệp, số test);
- cơ chế bắt đầu và kết thúc đã chọn, và vì sao;
- đường dẫn ảnh, cùng bảng so với mock;
- kết quả từng dòng ở §3.4;
- mọi chỗ lệch hoặc quyết định agent phải tự đưa ra;
- trạng thái máy chủ 3200.

**Không commit.**
