# Prompt tạo ảnh sản phẩm — HIVE

Viết ngày 25/09/2026 cho ChatGPT (GPT Image). Người dùng đã chốt:
- **Ảnh thẻ sản phẩm:** chỉ có món đồ, không người. Đồ mặc trên ma-nơ-canh vô hình, nền giấy trơn, cùng ánh sáng và góc chụp.
- **Ảnh người mẫu bổ sung:** mỗi **sản phẩm × màu** dùng một người mẫu nam Việt khác, góc máy/khung hình và bối cảnh khác mọi ảnh lookbook đã làm, kể cả ảnh của sản phẩm khác. Từ BỤI bản mới trở đi, người mẫu theo brief cao **ít nhất 1,75 m**, dáng cao và gọn vừa phải, không đậm người hoặc cơ bắp quá mức; ưu tiên khung toàn thân để thấy tỉ lệ. Đây là định hướng tạo ảnh, không phải số đo có thể kiểm chứng trên người ảo. Đối chiếu và cập nhật `tasks/lookbook-register.md`. Không chỉ đổi màu trên cùng một ảnh người mẫu. Dùng ảnh sản phẩm đúng màu làm tham chiếu để giữ nguyên dáng, hình in và chi tiết áo. Ảnh lookbook bổ sung không nằm trong bảng 58 tệp dưới đây.
- **Ảnh bìa Số:** có người mẫu Việt, một nam một nữ, mặc vài món của Số đó.
- Công cụ tạo ảnh là **ChatGPT**.

Mỗi màu của một mẫu có một ảnh thẻ sản phẩm. Web luôn hiện ảnh sản phẩm theo tỉ lệ **4:5**. Tổng cộng có 31 món:
- 21 mẫu đang có trong dữ liệu, thuộc Số 03, 04 và 05, kể cả mẫu đã hết (vẫn hiện trên web với dấu SOLD OUT);
- 2 mẫu hé lộ của Số 06;
- 8 mẫu cố định (thêm ngày 25/09, sau khi người dùng duyệt bảng `prototype/v3/line.html`).

31 món này cần 57 ảnh, cộng 1 ảnh bìa là 58 ảnh.

Các bước đổi màu và giữ cùng nền/đèn trong mục 1–5 dành cho ảnh thẻ **không người**; ảnh lookbook phải theo quy tắc người mẫu riêng ở trên.

Prompt viết bằng tiếng Anh vì công cụ tạo ảnh hiểu tiếng Anh tốt nhất; phần giải thích viết tiếng Việt.

> Dữ liệu chỉ ghi loại áo, chất liệu, form và màu. Các chi tiết may (túi, khoá, bo, mũ) và họa tiết in là **đề xuất theo concept của HIVE**;
> KHÓI, BỤI, NGUỘI và NẮNG đã được tạo lại theo các brief riêng. Muốn khác thì sửa thẳng trong khối prompt. Ảnh tạo ra sẽ quyết định món đồ trông thế nào, nên hãy xem kỹ.

---

## 1. Cách dùng trong ChatGPT

1. **Mỗi mẫu một cuộc trò chuyện mới.** Tin nhắn đầu gồm:
   - **KHỐI CHUNG** (mục 4);
   - ngay dưới là **khối của mẫu** (mục 6).

   Dán cả hai trong **cùng một tin nhắn**. ChatGPT trả ảnh ở màu đầu tiên của mẫu. Màu này là ảnh đại diện trên thẻ.
2. **Các màu còn lại:** trong cùng cuộc trò chuyện đó, gửi **câu đổi màu** (mục 5) cho từng màu. Làm như vậy thì món đồ giữ nguyên
   dáng, chỉ đổi màu vải.
3. **Ảnh chuẩn:** ảnh ưng ý đầu tiên (gợi ý `khoi-black.png`) là ảnh chuẩn. Từ mẫu thứ hai trở đi:
   - đính kèm ảnh chuẩn vào tin nhắn đầu;
   - thêm dòng sau vào cuối tin nhắn, để cả bộ cùng nền, cùng đèn, cùng cỡ:

     ```text
     The attached photo is the style reference: match its backdrop colour, light, shadow, camera height and garment scale exactly. Do not copy the garment itself.
     ```
4. **Khổ ảnh không đúng 4:5 cũng được.** ChatGPT hay đổi khổ, nhất là lúc đổi màu: ảnh `khoi-cream.png` ra 1198×1313 trong khi
   `khoi-black.png` là 1122×1402. Khi đưa vào web, mọi ảnh được đặt lại cùng một khung 1.200×1.500: áo rộng 84% khung, cổ áo cùng
   độ cao, nền của chính ảnh được nối thêm. Bước này đã thử trên hai ảnh KHÓI ngày 25/09 và không lộ vết nối. Điều duy nhất nó
   không cứu được là **món đồ chạm hoặc bị cắt ở mép ảnh**.
5. **Tải ảnh gốc** (PNG, đủ độ phân giải), đặt tên theo mục 3.

Tuỳ chọn: có thể tạo một Project trong ChatGPT và dán KHỐI CHUNG vào phần Instructions. Dù vậy, dán KHỐI CHUNG kèm từng tin nhắn
vẫn là cách chắc nhất.

## 2. Kiểm một ảnh trước khi giữ

- [ ] Không có chữ, số, logo, nhãn mác, thẻ treo hay hình mờ ở bất cứ đâu, kể cả trên nền.
- [ ] Không có người, tay, ma-nơ-canh lộ ra, móc treo hay đạo cụ.
- [ ] Món đồ không chạm và không bị cắt ở mép nào: bốn phía đều còn thấy nền. Khổ ảnh to nhỏ hay lệch 4:5 không sao.
- [ ] Màu vải gần với mã màu. Chú ý nhất:
  - màu **trắng** và **kem** dễ ngả xám hoặc ngả vàng;
  - màu **xám** dễ bị làm thành xám lốm đốm.
- [ ] Chi tiết khớp với khối của mẫu: số túi, khoá kéo, mũ, bo tay.
- [ ] Nền, ánh sáng và bóng giống ảnh chuẩn.

## 3. Tên tệp và nơi lưu

- **Tên:** `<mẫu>-<màu>.png`, với tên màu theo khoá trong code: `black` · `cream` · `grey` · `moss` · `brown` · `white` · `navy`.
  Ví dụ `khoi-black.png`, `khoi-cream.png`. Mẫu cố định lấy tên không dấu của mẫu: `ao-thun-tron-white.png`. Ảnh bìa là
  `cover-05.png`. Bảng đủ 58 tệp ở mục 8.
- **Nơi lưu:** thư mục `photos-raw/` ở gốc repo. Git bỏ qua thư mục này, vì ảnh gốc nặng và chưa qua xử lý.
- **Đừng tải ảnh qua trang quản trị.** Mỗi ngày cron đặt lại dữ liệu mẫu một lần, và lệnh này **xoá mọi ảnh tải lên** (`purgeUploadedPhotos`
  trong `app/api/reset/route.ts`). Khi đủ ảnh, báo phiên chính. Một lát nhỏ sẽ đưa ảnh vào dữ liệu mẫu:
  - đặt lại cùng một khung 1.200×1.500 (mục 1, bước 4), lưu WebP;
  - thay các khoá Unsplash trong `lib/photos.ts`;
  - nhúng đúng prompt của từng ảnh vào tệp làm nguồn gốc (FINISH).

  Vì vậy hãy giữ đúng tên tệp.

## 4. KHỐI CHUNG — dán đầu mọi tin nhắn tạo ảnh sản phẩm

```text
HIVE catalogue packshot — one product photo for an online streetwear shop.

Subject: exactly one garment, worn by an invisible (ghost) mannequin so it keeps a natural, worn, three-dimensional shape. No mannequin, hanger, person or body part is visible anywhere. Front view unless the garment description says otherwise; camera straight-on at chest height, no perspective distortion; the garment upright and centred.

Backdrop: a seamless matte paper sweep in a warm stone grey (about #D4CDC1), evenly lit, with no texture, no vignette and no visible floor line.

Light: one large soft key light from the front-left with gentle fill. A soft, natural contact shadow on the paper, slightly below and to the right of the garment. No harsh highlights, no blown whites, no crushed blacks.

Colour: the fabric colour must match the given hex value under neutral daylight white balance (5500 K). No colour grading, no tint, no filter.

Fabric: show the real texture and weight of the material described — knit, fleece, twill weave or nylon sheen — with natural soft folds. The garment is freshly steamed: no creases from storage.

Composition: a vertical image. The whole garment sits inside the central 4:5 area with even margins, about 75% of that area's height, so the photo can be cropped to 4:5 without touching the garment.

Style: photorealistic studio e-commerce photograph, sharp from edge to edge (85 mm lens, f/8). Minimal, utilitarian streetwear. The collection's fabric palette is seven muted colours — black, cream, grey, moss green, brown, white and navy — and its fabrics are heavyweight: dense cotton jersey, brushed fleece, cotton twill, technical nylon.

Never include: text, letters, numbers, logos, brand labels, hang tags, stickers, watermarks, props, accessories, people, or a second garment. Never add a print, patch or embroidery unless the garment description asks for one.
```

## 5. Câu đổi màu

Gửi trong cùng cuộc trò chuyện, ngay sau khi có ảnh màu đầu, mỗi màu một lần. Thay `{MÀU}` bằng cụm tiếng Anh của màu đó ở bảng dưới.

```text
Edit the image you just made. Change only the fabric colour to {MÀU}. Keep the garment's shape, folds, stitching, proportions and every detail, the backdrop, the light, the shadow and the framing exactly as they are. No text, no logos.
```

| Màu | Khoá | Cụm dán vào `{MÀU}` |
|---|---|---|
| Đen | `black` | `black (#1C1C1C), a soft true black` |
| Kem | `cream` | `cream (#E6DFD1), a warm sand off-white, not yellow` |
| Xám | `grey` | `grey (#8C8C8C), a flat mid grey, not heathered` |
| Rêu | `moss` | `moss green (#4A5240), a dark muted olive` |
| Nâu | `brown` | `brown (#5C4536), a dark earthy brown` |
| Trắng | `white` | `white (#F2F1ED), a clean soft white, not grey, not yellow` |
| Xanh than | `navy` | `navy (#2B3A52), a dark slate navy` |

## 6. Khối từng mẫu

Mỗi mẫu có dòng tóm tắt ghi tên · loại · chất liệu · form · giá, rồi đến khối prompt ở màu đầu. Dòng **Đổi màu** kể các màu còn phải
làm bằng câu đổi màu ở mục 5.

### Số 05 — đang bán (10 mẫu, 21 ảnh)

**KHÓI** · Áo thun oversize · Cotton 250gsm · Oversize · 390.000₫

```text
KHÓI — oversized T-shirt. Colour: black (#1C1C1C), a soft true black.
Heavyweight 250 gsm cotton jersey, dense, smooth and slightly matte.
Oversized cut: dropped shoulders, wide boxy body, straight hem at hip length, wide short sleeves ending just above the elbow, thick 2.5 cm ribbed crew neck.
Front design: a bold diagonal ribbon of broken halftone smoke screen-print, rising from the lower right hem toward the upper left chest and dissolving into sparse particles. Warm ash-grey and bone-white matte ink, with a few fine honey-amber (#EBA400) strokes. One tiny black side-seam tab has a single amber line but no text. The graphic follows the fabric folds; no actual smoke in the scene.
Front view.
```

Đổi màu: `cream` → `khoi-cream.png`; giữ nguyên hình in, đổi mực sáng sang than/xám đậm để đủ tương phản trên vải kem, giữ nét vàng mật ong.

**BỤI** · Áo hoodie · Nỉ bông 380gsm · Oversize · 890.000₫

```text
BỤI — oversized pullover hoodie. Colour: black (#1C1C1C), a soft true black.
Heavyweight 380 gsm brushed-back cotton fleece, thick and soft, with a dry matte face.
Oversized cut: dropped shoulders, roomy body, double-layer hood standing up around the neck with its opening facing forward, two flat drawcords in the same colour with small metal tips, kangaroo pocket, wide ribbed cuffs and hem band.
Front design — "Bản đồ mòn": five asymmetrical, interlocking fractured concrete-plate shapes screen-printed across the upper-middle chest, above the kangaroo pocket. Their irregular silhouette carries intricate miniature street-grid lines, thin eroded contour scratches, sparse halftone mineral grain and sharp negative-space fissures. Warm bone and ash-grey matte inks contrast against the black fleece; one tiny muted honey-amber (#EBA400) angled construction mark adds a restrained accent. The design reads as one bold city-map composition at thumbnail size and has close-up detail. Ink follows the fabric folds; this is deliberate print, not real dirt, smoke, or simple horizontal bars. Pocket and sleeves stay plain; no words or logos.
Front view.
```

Đổi màu: `grey` → `bui-grey.png`; vải xám phẳng #8C8C8C, giữ nguyên bố cục năm mảng bản đồ vỡ nhưng chuyển mực sang than đậm và xám đá để đủ tương phản, giữ nét vàng mật ong.

**NGUỘI** · Áo hoodie in · Nỉ bông 380gsm · Oversize · 1.290.000₫. Hình in là đề xuất.

```text
NGUỘI — oversized printed pullover hoodie. Colour: black (#1C1C1C), a soft true black.
Heavyweight 380 gsm brushed-back cotton fleece. Oversized cut: dropped shoulders, roomy body, double-layer hood standing up around the neck with its opening facing forward, flat drawcords with small metal tips, kangaroo pocket, wide ribbed cuffs and hem band.
Front design — "Dư nhiệt": one asymmetric, vertically oval thermal imprint across the upper chest, about 30 cm wide and ending above the kangaroo pocket. Seven to nine warped, interrupted isotherm contours orbit an off-centre black void. Honey-amber (#EBA400) ink is most vivid at the lower right, then cools through burnt ochre into pale ash-grey micro-halftone grain dispersing at the upper left. Add a few fine cooling fissures and subtle screen-print misregistration; keep all inks matte and bonded to the fleece. This is a residual heat mark, not a clean bullseye, sun, flame, smoke or concrete map. The print contains no letters, numbers or logos.
Front view.
```

Chỉ có màu đen.

**NẮNG** · Áo thun · Cotton 220gsm · Regular · 450.000₫

```text
NẮNG — regular-fit T-shirt. Colour: white (#F2F1ED), a clean soft white, not grey, not yellow.
Midweight 220 gsm cotton jersey, smooth.
Regular cut: set-in shoulders on the natural shoulder line, straight body, hem at the top of the hip, short sleeves ending mid-bicep, narrow 1.5 cm ribbed crew neck.
Front design — "Mảng nắng": one asymmetric, rough-edged patch of sunlight across the upper-middle chest, about 29 cm wide. Layer honey-amber and warm-ochre halftone ink with dark charcoal silhouettes of tropical roadside leaves and two very fine diagonal utility-wire shadows. Fade the patch edges into sparse print grain. Keep it a deliberately printed, matte graphic on the shirt, not real sunlight or shadows in the product photograph. No circular sun, letters, numbers, logos, smoke, city grid or simple stripes.
Front view.
```

Đổi màu: `cream` → `nang-cream.png`, vải kem #E6DFD1 và mảng in đất nung/ochre đậm hơn để không chìm trên nền sáng; `moss` → `nang-moss.png`, vải rêu #4A5240 và mảng nắng màu xương sáng pha vàng mật ong để đủ tương phản. Giữ nguyên bố cục lá và hai bóng dây điện ở cả ba màu.

**SƯƠNG** · Áo khoác dù · Dù chống nước 2 lớp · Oversize · 1.450.000₫

```text
SƯƠNG — oversized hooded shell jacket. Colour: black (#1C1C1C), a soft true black.
Two-layer waterproof nylon with a faint technical sheen and a crisp, slightly stiff drape.
Oversized cut: dropped shoulders, boxy body reaching the upper thigh, full-length front zip closed to the top under a snap storm flap, stand collar with the hood attached and lying down behind it, two zipped hand pockets, adjustable tab cuffs, drawcord hem with small toggles.
Surface design — "Lớp sương": on both upper chest panels and fading onto the shoulder yoke, two asymmetric complementary fields of small reflective-look slate-grey micro-dashes and rectangular halftone pixels. They are densest near the outer shoulders and dissolve toward the central storm flap and lower chest; three or four extremely fine interrupted silvery tracers run through them. One tiny muted honey-amber (#EBA400) bartack-like mark sits near the left upper chest. Keep the placket, pockets and seams clear. This is an intentional technical transfer print on nylon, not real condensation, water, dirt, smoke or large solid stripes. No letters or logos.
Front view.
```

Đổi màu: `moss` → `suong-moss.png`; vải rêu trầm #4A5240, giữ nguyên bố cục hạt/nét ở vai và ngực, đổi mực sang xám đá sáng pha lục nhạt để đọc rõ trên nền rêu, giữ dấu vàng mật ong nhỏ.

**MUỐI** · Quần jogger · Nỉ da cá 320gsm · Regular · 690.000₫. Mẫu đã hết, vẫn cần ảnh.

```text
MUỐI — jogger trousers. Colour: black (#1C1C1C), a soft true black.
320 gsm cotton French terry (loopback), soft and matte.
Regular tapered fit: covered elastic waistband with a flat drawcord, side-seam pockets, straight through the thigh and tapering to ribbed ankle cuffs, full length.
Front design — "Kết tinh": on the wearer's left leg (viewer's right), a narrow asymmetric trail of angular cubic salt-crystal wireframes, partial solid facets, micro-square grains and a few fine connecting fractures. The roughly 8 cm wide print starts below the side pocket at the outer upper thigh, crosses the front-outside of the knee, then disperses by mid-shin, well above the ribbed cuff. Warm mineral-bone and ash-grey matte inks contrast against the black fleece; one tiny honey-amber (#EBA400) mark accents the top. Keep the other leg mostly plain. Deliberate printed graphic, not real salt residue, stains, snowflakes, a side stripe, text or logo.
Shown from the front on an invisible lower-body mannequin, legs straight and slightly apart, the waistband slightly open so its inside back is visible.
```

Đổi màu: `grey` → `muoi-grey.png`; vải xám phẳng #8C8C8C, giữ đúng họa tiết trên ống trái và đổi mực sang than đậm với vài mặt tinh thể xám đá sáng để đủ tương phản, giữ dấu vàng nhỏ.

**THAN** · Áo khoác bomber · Dù chần bông · Oversize · 1.350.000₫

```text
THAN — oversized padded bomber jacket. Colour: black (#1C1C1C), a soft true black.
Matte nylon shell with light padding, stitched in horizontal channel quilting about 5 cm apart.
Oversized cut: dropped shoulders, boxy body ending at the waist on a wide ribbed hem band, ribbed stand collar and ribbed cuffs, full front zip closed to the top, two slanted welt pockets.
Front design — "Mạch than": an asymmetric web of fine jagged graphite-grey coal-vein lines crossing only the wearer's left upper chest (viewer's right) over two quilted channels, with a small echo on the same upper sleeve. A few muted honey-amber (#EBA400) strokes run through the centres; small mineral-grey facets and grains break away at the ends. Matte printed/embroidered artwork follows the padded fabric without covering seams, zipper or pockets. Keep the other side plain. Not real cracks, fire, lightning, smoke, a city map, text or logo.
Front view.
```

Đổi màu: `navy` → `than-navy.png`; vải dù xanh navy trầm hơi xám, giữ cùng vị trí và nét vẽ Mạch than; đổi nét xám chì thành xám đá/xám lam sáng hơn để đọc rõ trên nền navy, giữ điểm nhấn vàng mật ong tiết chế.

**CÁT** · Áo thun tay lỡ · Cotton 240gsm · Oversize · 420.000₫

```text
CÁT — oversized T-shirt with elbow-length sleeves. Colour: cream (#E6DFD1), a warm sand off-white, not yellow.
240 gsm cotton jersey, soft and slightly matte.
Oversized cut: deeply dropped shoulders, wide boxy body a little longer than usual, wide sleeves falling to the elbow, 2 cm ribbed crew neck.
Front design — "Vân xói": on the upper-middle torso, slightly toward the wearer's right (viewer's left), one roughly 30 × 29 cm asymmetric stepped wedge of six to eight differently sized wind-carved sand terraces. A dark central mass, angular tapering shards, directional etched hatching and tiny stippled grains give it depth; a diagonal channel of untouched shirt fabric cuts through the composition, and one lower edge disperses into sparse grain fragments. Matte charcoal and dusty deep-umber screenprint with one short muted honey-amber (#EBA400) notch. Complex and readable at thumbnail size, but leave generous plain fabric around it. Not actual sand, dirt, parallel brush stripes, an oval of contours, a city map, text or logo.
Front view.
```

Đổi màu: `white` → `cat-white.png`, vải trắng dịu #F2F1ED, giữ nguyên hình Vân xói và mực than/nâu đất. `brown` → `cat-brown.png`, vải nâu đất sẫm #5C4536, giữ chính xác bố cục hình; đổi phần mực nâu/than chính sang xương khoáng và xám taupe sáng để rõ trên nền tối, vẫn có khoảng âm nâu, vài nét than và một dấu vàng mật ong.

**GIÓ** · Áo sơ mi dệt · Kate lụa · Regular · 750.000₫

```text
GIÓ — regular-fit woven shirt. Colour: white (#F2F1ED), a clean soft white, not grey, not yellow.
Kate lụa: a smooth, lightweight poly-cotton plain weave with a soft silky sheen.
Regular cut: point collar, full button placket with small tonal buttons, buttoned up to the second button, one patch pocket on the left chest, long sleeves with one-button cuffs, curved shirttail hem.
Front design — "Luồng cắt": on the wearer's right front panel (viewer's left), five interlocking elongated airfoil-like slivers rise from mid-chest toward the shoulder in a loose asymmetric fan. Vary their widths, lengths and spacing; fill the slate-grey and ash-grey matte ink with intricate oblique woven hatching and broken pinstripe traces, tapering into fine sharp ends. One small muted honey-amber (#EBA400) stitch marks the lower start. Keep the placket, collar and opposite chest pocket unobscured; the remaining fabric is plain. Deliberate flat print/embroidery, not cut-out fabric, actual feathers, smoke, identical stripes, text or logo.
Front view.
```

Đổi màu: `navy` → `gio-navy.png`; vải xanh navy trầm #2B3A52, giữ nguyên phom, túi, nút và năm nét Luồng cắt; dùng mực xám đá/xám lam sáng hơn để đủ tương phản, giữ một dấu vàng mật ong nhỏ.

**ĐÁ** · Quần cargo · Kaki 320gsm · Regular · 980.000₫

```text
ĐÁ — cargo trousers. Colour: moss green (#4A5240), a dark muted olive.
320 gsm cotton twill with a visible diagonal weave, sturdy.
Regular straight leg: belt loops, button and zip fly, slanted front pockets, one bellowed cargo pocket with a flap on the outside of each thigh, plain hem, full length.
Shown from the front on an invisible lower-body mannequin, legs straight and slightly apart, the waistband slightly open.
```

Đổi màu: `black` → `da-black.png`

### Số 04 — đã đóng, đã hết (6 mẫu, 9 ảnh)

**RÊU** · Áo khoác phao · Dù chần lông vũ · Oversize · 1.500.000₫

```text
RÊU — oversized down puffer jacket. Colour: moss green (#4A5240), a dark muted olive.
Matte nylon shell filled with down in wide horizontal baffles about 10 cm apart, full and lofty.
Oversized cut: high stand collar zipped up to the chin, full front zip, two hand pockets hidden in the side seams, elastic-bound cuffs, hem at the hip.
Front view.
```

Chỉ có màu rêu.

**TRO** · Áo hoodie zip · Nỉ bông 400gsm · Oversize · 950.000₫

```text
TRO — oversized zip-up hoodie. Colour: grey (#8C8C8C), a flat mid grey, not heathered.
Heavyweight 400 gsm brushed-back cotton fleece, thick and structured.
Oversized cut: dropped shoulders, full-length front zip with a tonal metal zipper, zipped fully closed, double-layer hood standing up around the neck with its opening facing forward, flat drawcords with small metal tips, two split front pockets, wide ribbed cuffs and hem band.
Front view.
```

Đổi màu: `black` → `tro-black.png`

**SÓNG** · Áo thun in lưng · Cotton 250gsm · Oversize · 430.000₫. Chụp **mặt lưng**; hình in là đề xuất.

```text
SÓNG — oversized T-shirt with a back print. Colour: white (#F2F1ED), a clean soft white, not grey, not yellow.
Heavyweight 250 gsm cotton jersey, plain on the front.
Oversized cut: dropped shoulders, wide boxy body, wide short sleeves ending just above the elbow, ribbed crew neck.
Print: on the upper back only, just below the collar, a single-ink black screen print about 28 cm wide: eight stacked horizontal wave lines of equal weight, like a tide chart. No letters, numbers or symbols.
Shown from the BACK (rear view) so the print is visible.
```

Chỉ có màu trắng.

**VỎ** · Áo gile · Dù 2 lớp · Regular · 820.000₫

```text
VỎ — regular-fit shell vest. Colour: black (#1C1C1C), a soft true black.
Two-layer nylon, unpadded, with a faint sheen.
Regular cut: sleeveless with neatly bound armholes, stand collar, full front zip closed to the top, one flap pocket on the left chest, two zipped hand pockets, drawcord hem.
Front view; the armholes are open and empty — no sleeves, no arms.
```

Đổi màu: `cream` → `vo-cream.png`

**MƯA** · Áo khoác dù dài · Dù chống nước · Oversize · 1.420.000₫

```text
MƯA — oversized long rain coat. Colour: black (#1C1C1C), a soft true black.
Waterproof nylon with a subtle sheen and a crisp drape.
Oversized cut: dropped shoulders, straight wide body reaching the knee, stand collar with the hood attached and lying down behind it, full front zip under a snap storm flap, two large flap pockets at hip height, adjustable tab cuffs.
Front view; the whole coat, collar to hem, fits inside the central 4:5 area.
```

Chỉ có màu đen.

**KHÔ** · Quần short · Kaki 280gsm · Regular · 520.000₫

```text
KHÔ — twill shorts. Colour: cream (#E6DFD1), a warm sand off-white, not yellow.
280 gsm cotton twill with a visible diagonal weave.
Regular fit: belt loops, button and zip fly, slanted front pockets, straight legs ending just above the knee with a clean folded hem.
Shown from the front on an invisible lower-body mannequin, the waistband slightly open.
```

Đổi màu: `moss` → `kho-moss.png`

### Số 03 — đã đóng, đã hết (5 mẫu, 8 ảnh)

**ĐẤT** · Quần jogger nỉ · Nỉ da cá 320gsm · Regular · 680.000₫

```text
ĐẤT — fleece jogger trousers. Colour: brown (#5C4536), a dark earthy brown.
320 gsm cotton French terry (loopback), soft and matte. Plain.
Regular fit: elastic waistband with a flat drawcord, side-seam pockets, a sewn crease line running down the front of each leg, tapering to ribbed ankle cuffs.
Shown from the front on an invisible lower-body mannequin, legs straight and slightly apart.
```

Đổi màu: `black` → `dat-black.png`

**LỬA** · Áo thun tay dài · Cotton 240gsm · Regular · 480.000₫

```text
LỬA — regular-fit long-sleeve T-shirt. Colour: black (#1C1C1C), a soft true black.
240 gsm cotton jersey. Plain, no print.
Regular cut: set-in shoulders, straight body to the top of the hip, long sleeves finished with 6 cm ribbed cuffs, ribbed crew neck.
Front view, sleeves hanging naturally at the sides.
```

Đổi màu: `white` → `lua-white.png`

**BÃO** · Áo hoodie cổ lọ · Nỉ bông 380gsm · Oversize · 910.000₫

```text
BÃO — oversized funnel-neck hoodie. Colour: grey (#8C8C8C), a flat mid grey, not heathered.
Heavyweight 380 gsm brushed-back cotton fleece.
Oversized cut: dropped shoulders, roomy body, a tall funnel neck rising to the chin and continuing into a hood that lies down behind it, kangaroo pocket, ribbed cuffs and hem band. No drawcords.
Front view.
```

Chỉ có màu xám.

**MEN** · Áo thun nhuộm · Cotton 250gsm · Oversize · 460.000₫

```text
MEN — oversized garment-dyed T-shirt. Colour: cream (#E6DFD1), a warm sand off-white, not yellow.
250 gsm cotton jersey, garment-dyed: a soft, slightly washed hand with faint, uneven tonal clouding from the dye bath, a little stronger along the seams and the ribbing. Subtle — not tie-dye, no pattern.
Oversized cut: dropped shoulders, wide boxy body, wide short sleeves, ribbed crew neck.
Front view.
```

Chỉ có màu kem.

**VÔI** · Áo khoác gió · Dù 1 lớp · Regular · 790.000₫

```text
VÔI — regular-fit windbreaker. Colour: white (#F2F1ED), a clean soft white, not grey, not yellow.
Single-layer lightweight nylon with a fine crinkle and a soft sheen.
Regular cut: set-in sleeves, stand collar, full front zip closed to the top, two zipped hand pockets, elastic cuffs, drawcord hem.
Front view.
```

Đổi màu: `grey` → `voi-grey.png`

### Số 06 — hé lộ, chưa mở (2 mẫu, 2 ảnh)

Mẫu hé lộ chưa có màu và giá trong dữ liệu. Vì trang chưa công bố màu, màu dưới đây là **đề xuất của tôi**.

**SỎI** · Áo khoác dù. Đề xuất: xám, dáng anorak chui đầu để khác SƯƠNG.

```text
SỎI — oversized hooded anorak. Colour: grey (#8C8C8C), a flat mid grey, not heathered.
Nylon with a faint sheen and a crisp drape.
Oversized pullover cut: dropped shoulders, half-length front zip from the collar to mid-chest, hood attached and lying down behind the collar, one large kangaroo pocket across the front closed with a snap flap, elastic cuffs, drawcord hem.
Front view.
```

**NGÓI** · Áo hoodie in. Đề xuất: nâu, in hình mái ngói màu kem.

```text
NGÓI — oversized printed pullover hoodie. Colour: brown (#5C4536), a dark earthy brown.
Heavyweight 380 gsm brushed-back cotton fleece. Oversized cut: dropped shoulders, roomy body, double-layer hood standing up around the neck with its opening facing forward, flat drawcords with small metal tips, kangaroo pocket, wide ribbed cuffs and hem band.
Print: one large screen print centred on the chest, about 26 cm wide, in a single cream ink (#E6DFD1): rows of overlapping scalloped roof tiles. Matte ink with a soft hand. The print contains no letters, numbers or symbols.
Front view.
```

### Mẫu cố định — bán mọi lúc (8 mẫu, 17 ảnh)

Đồ cơ bản, không in, không thuộc Số nào. Vài mẫu gần giống một mẫu trong Số (ÁO THUN TRƠN với NẮNG, ÁO THUN TAY DÀI với LỬA,
HOODIE TRƠN với BỤI). Khối prompt ghi rõ chỗ khác để ảnh không trùng nhau: cổ, bo tay, mũ, dây rút. HOODIE TRƠN **không có dây
rút**, vì ảnh BỤI (25/09) đã có dây rút đầu kim loại.

**ÁO THUN TRƠN** · Áo thun · Cotton 220gsm · Regular · 400.000₫

```text
ÁO THUN TRƠN — regular-fit plain basic T-shirt. Colour: white (#F2F1ED), a clean soft white, not grey, not yellow.
Midweight 220 gsm cotton jersey, smooth and even. Plain, no print.
Regular cut: set-in shoulders on the natural shoulder line, straight body, hem at the top of the hip finished with a double-needle stitch, short sleeves ending mid-bicep with a double-needle hem, a slightly wider 2 cm ribbed crew neck.
Front view.
```

Đổi màu: `black` → `ao-thun-tron-black.png` · `grey` → `ao-thun-tron-grey.png`

**ÁO THUN TAY DÀI** · Áo thun tay dài · Cotton 220gsm · Regular · 450.000₫

```text
ÁO THUN TAY DÀI — regular-fit plain long-sleeve T-shirt. Colour: black (#1C1C1C), a soft true black.
Midweight 220 gsm cotton jersey. Plain, no print.
Regular cut: set-in shoulders, straight body to the top of the hip, long sleeves finished with a plain double-needle hem at the wrist — no ribbed cuffs — and a narrow 1.5 cm ribbed crew neck.
Front view, sleeves hanging naturally at the sides.
```

Đổi màu: `white` → `ao-thun-tay-dai-white.png`

**HOODIE TRƠN** · Áo hoodie · Nỉ bông 340gsm · Oversize · 750.000₫

```text
HOODIE TRƠN — oversized plain pullover hoodie. Colour: grey (#8C8C8C), a flat mid grey, not heathered.
Midweight 340 gsm brushed-back cotton fleece, soft with a matte face. Plain, no print.
Oversized cut: dropped shoulders, roomy body, single-layer hood standing up around the neck with its opening facing forward, NO drawcords and no eyelets — a clean hood opening, kangaroo pocket, ribbed cuffs and hem band.
Front view.
```

Đổi màu: `black` → `hoodie-tron-black.png` · `cream` → `hoodie-tron-cream.png`

**ÁO KHOÁC DÙ** · Áo khoác dù · Dù 1 lớp · Oversize · 850.000₫

```text
ÁO KHOÁC DÙ — oversized coach jacket. Colour: black (#1C1C1C), a soft true black.
Single-layer nylon with a soft sheen and a light, crisp drape. Plain.
Oversized cut: dropped shoulders, boxy body ending at the upper hip, turn-down shirt collar, full front closure with five tonal snap buttons all fastened, two slanted hand pockets, elasticated cuffs, a drawcord hem.
Front view.
```

Đổi màu: `navy` → `ao-khoac-du-navy.png`

**GILE PHAO** · Áo gile phao · Dù chần bông · Regular · 750.000₫

```text
GILE PHAO — regular-fit padded puffer vest. Colour: black (#1C1C1C), a soft true black.
Matte nylon shell with synthetic padding, stitched in horizontal channel quilting about 7 cm apart, full but not bulky.
Regular cut: sleeveless with neatly bound armholes, stand collar, full front zip closed to the top, two zipped hand pockets, hem at the hip.
Front view; the armholes are open and empty — no sleeves, no arms.
```

Chỉ có màu đen.

**SƠ MI OXFORD** · Áo sơ mi oxford · Cotton oxford · Regular · 590.000₫

```text
SƠ MI OXFORD — regular-fit oxford shirt. Colour: white (#F2F1ED), a clean soft white, not grey, not yellow.
Cotton oxford cloth: a soft basket weave with a visible, slightly textured surface and a matte finish.
Regular cut: button-down collar with its points buttoned down, full button placket with small tonal buttons, buttoned up to the second button, one patch pocket on the left chest, long sleeves with one-button cuffs, a back box pleat, curved shirttail hem.
Front view.
```

Đổi màu: `navy` → `so-mi-oxford-navy.png`

**QUẦN KAKI** · Quần kaki · Kaki 280gsm · Regular · 650.000₫

```text
QUẦN KAKI — regular-fit chino trousers. Colour: cream (#E6DFD1), a warm sand off-white, not yellow.
280 gsm cotton twill with a fine diagonal weave, smooth and sturdy.
Regular straight leg: belt loops, button and zip fly, slanted front pockets, two welt back pockets, clean folded hem at full length. No cargo pockets.
Shown from the front on an invisible lower-body mannequin, legs straight and slightly apart, the waistband slightly open.
```

Đổi màu: `black` → `quan-kaki-black.png`

**QUẦN SHORT NỈ** · Quần short nỉ · Nỉ da cá 300gsm · Regular · 450.000₫

```text
QUẦN SHORT NỈ — sweat shorts. Colour: grey (#8C8C8C), a flat mid grey, not heathered.
300 gsm cotton French terry (loopback), soft and matte. Plain.
Regular fit: covered elastic waistband with a flat drawcord, side-seam pockets, straight legs ending just above the knee with a clean hem.
Shown from the front on an invisible lower-body mannequin, the waistband slightly open.
```

Đổi màu: `black` → `quan-short-ni-black.png`

## 7. Ảnh bìa Số 05 (thay ảnh `hero`)

Ảnh bìa là ảnh lớn cạnh số 05 trên trang chủ:
- **điện thoại:** hiện ảnh vuông;
- **máy tính:** hiện một cột cao, bị cắt bớt hai bên.

Vì vậy ảnh bìa tạo ở tỉ lệ **1:1**, người đứng giữa. Ảnh này **không** dùng KHỐI CHUNG. Hai người mặc các món của Số 05:
- nữ mặc CÁT màu kem và ĐÁ màu rêu;
- nam mặc THAN màu đen, NẮNG màu trắng và MUỐI màu xám.

```text
HIVE — cover photograph for issue Số 05 of a Vietnamese streetwear label.
Editorial streetwear photograph, photorealistic, true natural colour, no film filter, no heavy grading.
Two Vietnamese models in their early twenties, one woman and one man, standing close together, relaxed and confident, looking past the camera, not posing for it. Framed from the knees up.
She wears an oversized cream (#E6DFD1) cotton T-shirt with wide elbow-length sleeves and moss-green (#4A5240) cotton twill cargo trousers with a flap cargo pocket on each thigh.
He wears an oversized black padded nylon bomber jacket with horizontal channel quilting, worn open over a plain white regular-fit T-shirt, and mid-grey cotton jogger trousers.
All clothing is plain: no logos, no text, no prints, no other brands.
Location: the concrete stairwell landing of an old Vietnamese apartment block (khu tập thể), weathered pale walls, late-afternoon sun coming in low from the side and casting long soft shadows.
Square 1:1 image. Keep both people well inside the frame with space above their heads: the photo is shown square on phones and cropped at the sides on desktop.
No readable text or signs anywhere in the picture.
```

Hiện chỉ Số đang bán dùng ảnh bìa riêng. Số đã đóng lấy ảnh của mẫu đầu tiên trong Số làm bìa (`components/shop/ClosedIssue.tsx`),
nên chưa cần ảnh bìa cho Số 03 và Số 04.

## 8. Bảng 58 tệp

| Số | Mẫu | Ảnh màu đầu | Ảnh đổi màu |
|---|---|---|---|
| 05 | KHÓI | `khoi-black.png` | `khoi-cream.png` |
| 05 | BỤI | `bui-black.png` | `bui-grey.png` |
| 05 | NGUỘI | `nguoi-black.png` | — |
| 05 | NẮNG | `nang-white.png` | `nang-cream.png`, `nang-moss.png` |
| 05 | SƯƠNG | `suong-black.png` | `suong-moss.png` |
| 05 | MUỐI | `muoi-black.png` | `muoi-grey.png` |
| 05 | THAN | `than-black.png` | `than-navy.png` |
| 05 | CÁT | `cat-cream.png` | `cat-white.png`, `cat-brown.png` |
| 05 | GIÓ | `gio-white.png` | `gio-navy.png` |
| 05 | ĐÁ | `da-moss.png` | `da-black.png` |
| 04 | RÊU | `reu-moss.png` | — |
| 04 | TRO | `tro-grey.png` | `tro-black.png` |
| 04 | SÓNG | `song-white.png` | — |
| 04 | VỎ | `vo-black.png` | `vo-cream.png` |
| 04 | MƯA | `mua-black.png` | — |
| 04 | KHÔ | `kho-cream.png` | `kho-moss.png` |
| 03 | ĐẤT | `dat-brown.png` | `dat-black.png` |
| 03 | LỬA | `lua-black.png` | `lua-white.png` |
| 03 | BÃO | `bao-grey.png` | — |
| 03 | MEN | `men-cream.png` | — |
| 03 | VÔI | `voi-white.png` | `voi-grey.png` |
| 06 | SỎI | `soi-grey.png` | — |
| 06 | NGÓI | `ngoi-brown.png` | — |
| Cố định | ÁO THUN TRƠN | `ao-thun-tron-white.png` | `ao-thun-tron-black.png`, `ao-thun-tron-grey.png` |
| Cố định | ÁO THUN TAY DÀI | `ao-thun-tay-dai-black.png` | `ao-thun-tay-dai-white.png` |
| Cố định | HOODIE TRƠN | `hoodie-tron-grey.png` | `hoodie-tron-black.png`, `hoodie-tron-cream.png` |
| Cố định | ÁO KHOÁC DÙ | `ao-khoac-du-black.png` | `ao-khoac-du-navy.png` |
| Cố định | GILE PHAO | `gile-phao-black.png` | — |
| Cố định | SƠ MI OXFORD | `so-mi-oxford-white.png` | `so-mi-oxford-navy.png` |
| Cố định | QUẦN KAKI | `quan-kaki-cream.png` | `quan-kaki-black.png` |
| Cố định | QUẦN SHORT NỈ | `quan-short-ni-grey.png` | `quan-short-ni-black.png` |
| 05 | Bìa | `cover-05.png` | — |

Tổng: 31 ảnh màu đầu, 26 ảnh đổi màu và 1 ảnh bìa, tức 58 tệp.
