# KHÓI — prompt thiết kế tự do, có ảnh người mẫu

Viết ngày 25/09/2026. Tệp này **riêng**. Nó không thay `tasks/khoi-prompt.md` (năm hướng quanh chữ "khói") và không thuộc bộ ảnh chung
`tasks/anh-san-pham-prompt.md`.

**Khác bản trước:**
- **Thiết kế tự do.** Công cụ tự nghĩ hình và cách làm; không phải là khói. Tên KHÓI chỉ là điểm xuất phát.
- **Mạnh tay hơn.** Đây là mẫu chủ lực của Số 05, không phải áo trơn thêm một chi tiết nhỏ.
- **Ảnh chính có người mẫu Việt mặc áo.** Muốn ảnh thẻ cho web thì dùng câu nối ở mục 4 để chụp lại đúng chiếc áo đó.

**Cách dùng:** dán prompt ở mục 1 và điền bốn chỗ trống `{COLOUR}`, `{STYLE}`, `{MODEL}`, `{SETTING}` bằng một dòng ở mục 2. Muốn thử
phong cách khác thì chỉ đổi `{STYLE}`, giữ nguyên phần còn lại.

---

## 1. Prompt chính — ảnh người mẫu

```text
Design and photograph a new T-shirt for HIVE, a Vietnamese streetwear label for 18–28-year-olds that sells in numbered issues: each issue is a small collection released once, every style is cut once in a fixed number, and when it sells out it is gone for good.

THE PIECE: "KHÓI" (Vietnamese for "smoke"), the lead style of Issue 05. The other styles of this issue are BỤI (dust), NGUỘI (cooled), NẮNG (sunlight), SƯƠNG (mist), MUỐI (salt), THAN (charcoal), CÁT (sand), ĐÁ (stone) and GIÓ (wind). Take the name as a starting point, loosely or not at all — the design does not have to show smoke.

KEEP THE GARMENT: an oversized heavyweight T-shirt, 250 gsm dense cotton jersey, dropped shoulders, wide boxy body, straight hem at hip length, wide short sleeves ending just above the elbow, thick 2.5 cm ribbed crew neck. Base fabric colour: {COLOUR}.

DESIGN FREELY: this is the issue's statement piece. A buyer should want it on sight and never mistake it for a plain basic tee with a small logo. Style direction: {STYLE}. Use whatever techniques suit the idea — screen print, puff print, discharge, embroidery, appliqué, woven patches, garment dye, spray, distressing, contrast stitching — on the front, the back, the sleeves or the hem. Brand elements you may use, or leave out: honey yellow (#EBA400) as the one accent colour; black and warm paper greys; heavy, wide geometric capitals; and the issue plate, a small black licence-plate-shaped label with honey-yellow lettering "S05" and a rivet dot at each end. If the design has lettering, use only these exact words: KHÓI, S05, SỐ 05, HIVE — spelled exactly, with the Vietnamese accents, and no other words. No logos of other brands.

PHOTO: an editorial lookbook photograph of {MODEL} wearing the T-shirt, {SETTING}. Three-quarter or full-length framing so the oversized fit reads clearly, with the main design fully visible (turn the model if it is on the back). The rest of the outfit stays quiet — loose black or charcoal trousers, plain sneakers, no other logos — so the T-shirt is the subject. Relaxed, natural pose; real skin texture; natural hands; no heavy retouching. 50 mm lens, true colours, no filter. Vertical 4:5 image. No captions, text or watermarks anywhere in the picture except the design on the garment.
```

## 2. Chỗ trống — chọn một dòng dán vào

### `{COLOUR}` — màu vải nền

| Màu | Dán |
|---|---|
| Đen | `black (#1C1C1C), a soft true black` |
| Kem | `cream (#E6DFD1), a warm sand off-white, not yellow` |

Dữ liệu KHÓI hiện có hai màu này. Muốn thử màu khác của bộ bảy màu thì lấy cụm màu ở mục 5 của `tasks/anh-san-pham-prompt.md`.
Nếu giữ màu mới thì dữ liệu phải đổi theo, và việc đó cần duyệt.

### `{STYLE}` — phong cách, đổi dòng này để thử kiểu khác

| # | Kiểu | Dán |
|---|---|---|
| 1 | Việt đời thường | `Vietnamese street vernacular — hand-painted shop-sign lettering, a lottery-ticket (vé số) layout built around the issue number, rubber-stamp marks, slightly misregistered prints` |
| 2 | Biển số | `the issue plate as the hero — the S05 plate blown up large across the chest or back, worn, stencilled and weathered like a real licence plate` |
| 3 | Chữ kiểu Thuỵ Sĩ | `Swiss / brutalist typography — oversized type on a strict grid, tiny spec text, generous empty space, one honey-yellow accent` |
| 4 | Áo tour cũ | `vintage tour tee — cracked, faded screen prints on the front and a big back print, garment-washed fabric` |
| 5 | Cắt dán Nhật | `Japanese graphic tee — a dense layered collage of type, technical diagrams and grainy photography, very detailed` |
| 6 | Đồ bảo hộ | `workwear utility — stencil lettering, a woven patch, a printed size-and-spec block at the hem, bar-tack details` |
| 7 | Phá cấu trúc | `avant-garde, deconstructed — raw edges, exposed seams, an asymmetric print that wraps from the front over one shoulder to the back` |
| 8 | Sang, kín | `quiet luxury — tonal embroidery and one small, perfectly finished detail; everything else is the fabric` |
| 9 | Ảnh in | `photographic — one large, grainy black-and-white photograph printed across the front` |
| 10 | Vẽ tay | `hand-drawn — loose ink-brush illustration, like a page torn from a sketchbook` |
| 11 | Khói | `smoke — a spray-dyed haze rising from the hem, or a single plume in coarse halftone dots` |
| 12 | Để công cụ chọn | `your choice — pick the direction yourself, surprise me, and make it bold` |

### `{MODEL}` — người mẫu

| Ai | Dán |
|---|---|
| Nữ | `a Vietnamese woman in her early twenties, natural make-up, hair tied back` |
| Nam | `a Vietnamese man in his early twenties, short natural hair` |
| Hai người, hai màu | `two Vietnamese friends in their early twenties, a young woman and a young man, one in the black version and one in the cream version` |

Với dòng "Hai người", đổi `{COLOUR}` thành `black (#1C1C1C) for one and cream (#E6DFD1) for the other`.

### `{SETTING}` — bối cảnh

| Nơi | Dán |
|---|---|
| Studio, khớp bộ ảnh web | `in a studio against a seamless warm stone grey paper backdrop (#D4CDC1), one large soft key light from the front-left` |
| Phố Sài Gòn | `on a quiet Saigon street at dusk, old shophouse walls and parked motorbikes softly out of focus behind` |
| Hẻm Hà Nội | `in a narrow Hanoi alley in overcast daylight, weathered yellow walls, tangled overhead cables` |
| Sân thượng | `on a concrete rooftop in Ho Chi Minh City at blue hour, city lights soft in the background` |
| Bê tông, nắng gắt | `against raw concrete in hard midday sun, strong clean shadows` |

## 3. Tránh — dán vào ô negative prompt nếu công cụ có

```text
plain blank T-shirt, tiny chest logo only, gibberish text, misspelled words, extra words, other brand logos, watermark, caption, extra fingers, deformed hands, plastic skin, heavy retouching, cropped head, garment cut off by the frame, busy outfit with other graphics
```

## 4. Câu nối — chụp lại đúng chiếc áo làm ảnh thẻ cho web

Gửi ngay sau khi có ảnh người mẫu ưng ý, trong cùng cuộc trò chuyện. Nếu công cụ không nhớ cuộc trò chuyện, đính kèm ảnh người mẫu
làm ảnh tham chiếu.

```text
Now photograph the exact same T-shirt from the previous image — same design, same placements, same colours, same fabric — as a product packshot for the shop: worn by an invisible ghost mannequin, no person or body part visible, front view, camera straight-on at chest height, centred, about 75% of the image height with even margins on all four sides. Seamless matte warm stone grey paper backdrop (#D4CDC1), one large soft key light from the front-left, a soft contact shadow below and to the right. No text other than the design on the garment. Vertical 4:5 image.
```

Nếu hình chính nằm ở lưng áo thì thay `front view` bằng `back view`. Đổi màu vải thì dùng câu đổi màu ở mục 5 của
`tasks/anh-san-pham-prompt.md`.

## 5. Chấm một ảnh

- [ ] **Có một ý rõ ràng.** Không phải áo trơn thêm logo nhỏ; nhìn một lần là nhớ.
- [ ] **Chữ đúng từng ký tự.** Chỉ có KHÓI (có dấu sắc trên Ó), S05 (số 0, không phải chữ O), SỐ 05, HIVE; không có chữ vô nghĩa.
- [ ] **Vẫn đúng dáng KHÓI:** áo thun oversize dày, vai rơi, tay tới trên khuỷu, cổ bo dày.
- [ ] **Người mẫu:** trông tự nhiên, tay và ngón tay đúng, hình trên áo thấy trọn.
- [ ] **Ảnh thẻ (mục 4):**
  - thu ảnh về rộng khoảng 171px mà vẫn nhận ra KHÓI;
  - góc trái dưới và góc trái trên không có chi tiết quan trọng, vì đó là chỗ của biển "Số 05" và SOLD OUT trên web.
- [ ] **Hợp cả bản đen lẫn bản kem**, nếu định giữ hai màu.

## 6. Lưu ảnh thử

Lưu vào `photos-raw/_thu-khoi/` với tên `<số kiểu>-<nguoi|the>-<màu>.png`, ví dụ `01-nguoi-black.png`, `01-the-black.png`,
`12-nguoi-cream.png`. Số kiểu lấy theo bảng `{STYLE}`. Git bỏ qua `photos-raw/`. Báo phiên chính khi muốn kiểm ảnh.

Khi chọn được một thiết kế:
- phiên chính sửa khối KHÓI trong bộ ảnh chung;
- ảnh người mẫu có thể dùng cho bìa Số 05 (mục 7 của tệp chung);
- giá và loại trong dữ liệu có thể phải đổi theo thiết kế. Việc đó cần duyệt.
