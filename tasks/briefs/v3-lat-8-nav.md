# Brief lát 8 · v3 — thanh điều hướng: logo mới, biển Số, icon nét

Phiên chính viết 24/09/2026. Agent `ui-implementer` thực thi; phiên chính duyệt lại độc lập bằng ảnh chụp thật. Người dùng **đã duyệt**
qua ba vòng mock ngày 24/09. Các câu gốc của người dùng:
- "Ở bên trái sẽ là mark và wordmark (không thêm số). Ở giữa sẽ là các category, và đổi nav Số 05 thành … itag … vì nav này với itag
  chức năng giống nhau nên tôi thấy hơi thừa. sau đó đổi style của itag giống với style biển số (option F trong file hive-2.html). còn
  góc bên phải sẽ là các chức năng còn lại"
- Trả lời câu hỏi lại: **bỏ đồng hồ** (biển chỉ ghi SỐ 05), **đổi cả điện thoại**.
- "Đồng ý option B" (biển vải đen, viền và chữ mật ong)
- "Tôi chọn 20 và 18.8 theo đề xuất" (chữ HIVE cao 20 px desktop, 18,8 px điện thoại; mark giữ nguyên)
- "tôi muốn tất cả icon ở header đều là linear dù có badge hay không. và đảo màu của badge từ nền đen chữ vàng sang nền vàng chữ đen"

**Mock (chuẩn đối chiếu):**
- Bảng `prototype/name/nav.html` (mở `cd prototype && python serve.py 3100` → `/name/nav.html`).
- Ảnh ở `prototype/name/nav/`. Mỗi ảnh chụp từ app đang chạy, với `prototype/name/nav/proposal.css` và ba thao tác DOM gắn lúc chụp
  (`prototype/name/nav/capture.cjs`, hàm `dress`).
- `proposal.css` là **đặc tả CSS**: chép ý, không chép nguyên. Nó dùng tiền tố `html` để thắng cascade lúc chụp; trong app viết theo
  quy ước `.s .nav3 …` sẵn có.
- Logo: `prototype/name/logo/hive-lockup-nav.svg`: mark M2 + chữ W3, chữ cao 62,5% mark. Tỉ lệ này riêng cho thanh điều hướng; tệp
  logo chuẩn giữ 52%.

Ảnh nộp vào `.playwright-cli/shots/v3/lat8/`.

## 1. Phạm vi

| Tệp | Việc |
|---|---|
| `components/shop/SiteNav.tsx` | thứ tự mới, logo SVG, biển thay tem + link "Số NN", bỏ đồng hồ, icon luôn nét |
| `components/shop/NavLogo.tsx` (mới) | SVG nội tuyến của `hive-lockup-nav.svg` (hình tròn + 2 path), `aria-hidden`, không `<title>` |
| `lib/lexicon.ts` (+ `lib/lexicon.test.ts`) | hàm thuần `plateLabel(no, state)` → "Số 05, đang bán" / "Số 06, sắp mở" / "Số 05, đã đóng" |
| `app/styles/nav.css` | khối "nav bar, v3": `.wm` trong thanh, `.itag` thành biển, icon 20 px, bong bóng mật ong |
| `app/styles/desktop.css` | khối "the nav bar, v3" (≥ 900px): lưới 4 cột, biển 32px, bỏ `order:5`/`margin-left:auto` |

**Không đụng:** `.s .wm` gốc trong `nav.css` (chân trang `.foot3 .colophon`, thanh bên quản trị, phiếu giao hàng vẫn dùng chữ HIVE Unbounded —
ngoài phạm vi); đồng hồ lớn trên bìa trang chủ; `DESIGN.md` (phiên chính cập nhật sau duyệt); mock.

## 2. Quyết định đã chốt

1. **Thứ tự** (cả trong DOM, để phím Tab đi đúng thứ tự mắt nhìn): logo · biển · `nav.links` (5 họ) · `.icons` (tìm kiếm, đã lưu, tài
   khoản, giỏ).
2. **Desktop ≥ 900px:** `.in` thành lưới `grid-template-columns: minmax(0,1fr) auto auto minmax(0,1fr); column-gap: 24px`; giữ `height:64px`,
   `padding:0 28px 0 var(--gutd)`, `max-width:var(--max)`, `margin:0 auto`. Logo `justify-self:start`, `.icons` `justify-self:end;
   margin-left:0`. Cụm biển + họ nằm giữa thanh (lệch 6px vì lề 40/28 là chủ ý — giữ).
3. **Điện thoại < 900px:** giữ flex như hiện nay (`gap:10px`, `height:56px`, `padding:0 8px 0 var(--gut)`): logo · biển · `.icons`
   (`margin-left:auto`). `.links` vẫn ẩn.
4. **Logo** (`NavLogo`): SVG `viewBox="-500 -500 2364.99 1000"`, `height` 30px điện thoại / 32px desktop, `width:auto` (≈ 70,9 / 75,7px).
   Link `<Link className="wm" href="/" aria-label="HIVE, trang chủ">` (bỏ lớp `nm`: không còn chữ). Màu lấy nguyên từ tệp (#eba400,
   #171410) — đây là logo, không theo token.
5. **Biển Số** (`.itag`) — **vẫn là `<Link>`**, `href` giữ nguyên logic cũ (OPEN → `/products`, CLOSED → `/so/N`, UPCOMING → `/#next`):
   - Nội dung chỉ `{label}` ("Số 05", CSS viết hoa). **Bỏ** `<i>` (chấm) và `<span className="cd">` (đồng hồ).
   - `aria-label={plateLabel(drop.no, state)}` và `title` cùng chuỗi đó. Màu biển là kênh trạng thái duy nhất nhìn thấy, nên chữ trạng
     thái phải có cho trình đọc màn hình và cho tooltip.
   - Lớp: `itag` + `soon`/`shut` như `stampTone` cũ; thêm `on` + `aria-current="page"` khi `activeDrop` (prop giữ nguyên tên và nghĩa: nay
     nó thắp biển thay cho link "Số NN").
6. **Bỏ link "Số NN"** đầu `.links`; 5 họ giữ nguyên (chữ đậm + gạch mật ong khi đang chọn).
7. **Bỏ đồng hồ khỏi thanh:** xoá `useState` countdown, `useEffect` + `setInterval` mỗi giây, import `closesInLabel`/`opensInLabel`/`demoNow`
   nếu không còn dùng. Viết lại chú thích đầu component cho đúng (tem vải đen → biển Số; không còn đồng hồ; câu về "rendered only in the
   browser" bỏ đi nếu không còn đúng).
8. **Icon:** bốn `<Icon>` **không truyền `bulk`** — luôn Linear, kể cả khi có số hay đã đăng nhập (hệ quả đã báo người dùng: nút tài
   khoản không còn đổi dạng khi đăng nhập; `aria-label` "Tài khoản của …" giữ nguyên). Cỡ glyph 20px: `.s .nav3 .ib .ic{ width:20px;
   height:20px; font-size:20px; }`. Hộp nút giữ nguyên (40×44 điện thoại, 44×44 desktop).
9. **Bong bóng số** `.s .nav3 .ib b`: `top:4px; right:2px; background:var(--brand); color:var(--ink)`; phần còn lại giữ (16px, bo tròn,
   `--fs-xs` 700, tabular). Chữ mực trên mật ong ≈ 9:1.

### 2.1 CSS biển (chép ý từ `proposal.css`)

Điện thoại (`nav.css`, thay khối `.itag` cũ và các luật con `i`, `.soon i`, `.shut i`, `.cd`):

```css
.s .nav3 .itag{ --pl:var(--stage); --pi:var(--brand);
  display:inline-flex; align-items:center; justify-content:center; flex:none; position:relative; white-space:nowrap;
  height:28px; padding:0 17px; border:0; border-radius:5px;
  background:
    radial-gradient(circle at 8.5px 50%, var(--pi) 0 1.6px, transparent 2.1px),
    radial-gradient(circle at calc(100% - 8.5px) 50%, var(--pi) 0 1.6px, transparent 2.1px),
    var(--pl);
  box-shadow:inset 0 0 0 2px var(--pl), inset 0 0 0 3px var(--pi);   /* viền trong cách mép 2px, dày 1px */
  color:var(--pi); font-family:var(--font-display); font-weight:var(--fw-display);
  font-size:var(--fs-xs); line-height:1; letter-spacing:.1em; text-transform:uppercase;
  transition:background-color .12s ease; }
.s .nav3 .itag::after{ content:""; position:absolute; inset:-9px 0; }      /* giữ: 28 → 46px vùng chạm */
.s .nav3 .itag.soon{ --pl:var(--info); --pi:#fff; }                       /* trước khi mở: biển xanh */
.s .nav3 .itag.shut{ --pi:var(--stage-ink2); }                            /* đã đóng: chữ xám */
.s .nav3 .itag:hover{ --pl:var(--stage-hair); }
.s .nav3 .itag.soon:hover{ filter:brightness(1.08); }
.s .nav3 .itag.on::before{ content:""; position:absolute; left:3px; right:3px; bottom:-6px; height:2px; background:var(--brand); }
```

Desktop (`desktop.css`): `.itag{ height:32px; padding:0 19px; font-size:var(--fs-sm); }` + hai lỗ ốc dời vào `9.5px`, bán kính
`1.75px/2.25px` (xem `proposal.css`); **xoá** `order:5`, `margin-left:auto` và `.itag .cd{ display:inline }`.

Nếu một luật hover/transition của `.itag` nằm sai tệp theo quy ước của `interaction.css`, đặt theo quy ước, không theo brief. Biển không
được có vòng focus riêng: `.s :focus-visible` của hệ (`--mark`, offset 2px) đã đẹp trên biển (xem `plate-focus.png`).

## 3. Kiểm (agent tự chứng minh)

1. `npm run typecheck`, `npm test` (thêm test cho `plateLabel`: ba trạng thái), `npm run build`.
2. **Máy chủ xem thử:** cổng 3200 đang chạy `next start -p 3200` của bản build cũ. Dừng nó, build, rồi chạy `npm run preview:serve` nền và
   **để nó chạy** khi xong (phiên chính soát trên đó).
3. Ảnh (`playwright cli`, cổng 3200) vào `.playwright-cli/shots/v3/lat8/`:
   - 1280×800 trang chủ;
   - 390×844 trang chủ; 360×780 thanh;
   - 1280 `/products` (biển có gạch);
   - 1280 `/products?family=TEE`;
   - 900 thanh.
   Trước khi chụp, đặt đã lưu và giỏ để thấy bong bóng số:
   `localStorage["brand.wishlist"] = {"v":1,"ids":["khoi","bui"]}`,
   `localStorage["brand.cart"] = {"v":1,"lines":[{"productId":"khoi","color":"black","size":"M","qty":2}]}`.
   Trạng thái sắp mở / đã đóng không dựng được trên dữ liệu thật: kiểm hai màu đó bằng cách gắn lớp `soon`/`shut` vào biển trong trang lúc
   chụp, và ghi rõ đó là ảnh gắn lớp.
4. **So với mock** `prototype/name/nav/bar-1280.png`, `bar-390.png`, `bar-360.png`, `bar-900.png`, `icons-after.png`, `plate-*.png`: vị
   trí, cỡ (logo 75,7×32 / 70,9×30; biển 90×32 / 82×28), màu phải trùng. Ghi mọi chỗ lệch.
5. Đo: không tràn ngang ở 360/390/900/1280 (`scrollWidth === clientWidth` của `.nav3 .in`; mép phải nút giỏ ≤ viewport − 8 ở điện thoại);
   thứ tự Tab: logo → biển → 5 họ → 4 nút; `aria-label` và `title` của biển; bong bóng nền `rgb(235, 164, 0)` chữ `rgb(23, 20, 16)`;
   bốn icon không có lớp `duo` khi có số.
6. Không lỗi console mới (lỗi `favicon.ico` 404 có từ trước — app chưa có favicon).

## 4. Báo cáo

Danh sách tệp đổi, kết quả typecheck/test/build (số tệp/số test), đường dẫn ảnh, bảng so với mock, mọi chỗ lệch hoặc quyết định agent phải
tự đưa ra, và trạng thái máy chủ 3200.
