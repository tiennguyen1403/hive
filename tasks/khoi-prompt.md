# KHÓI — prompt thử phong cách

Viết ngày 25/09/2026. Tệp này **riêng**, không thuộc bộ ảnh chung ở `tasks/anh-san-pham-prompt.md`. Mục đích là thử nhiều hướng
thiết kế cho KHÓI trên nhiều công cụ tạo ảnh. Khi chọn xong một hướng, phiên chính mới sửa khối KHÓI trong tệp chung và dữ liệu mẫu.

**Vì sao phải đổi.** KHÓI hiện là áo thun trơn đen/kem ("Plain, no print"). Từ khi có dòng cố định, nó trông y ÁO THUN TRƠN
(400.000₫), mà lại rẻ hơn (390.000₫). Một mẫu của Số phải là thứ chỉ có trong Số đó. KHÓI cần ba điều:
1. **Nhìn khác áo trơn ngay trên thẻ điện thoại** (ảnh rộng khoảng 171px).
2. **Mang dấu của Số:** biển S05, cùng kiểu biển "Số 05" trên web.
3. **Nói được chữ "khói":** thứ bốc lên rồi tan, như một Số hết là hết.

Prompt viết bằng tiếng Anh vì công cụ tạo ảnh hiểu tiếng Anh tốt nhất; phần giải thích viết tiếng Việt.

---

## 1. Cách ghép

**Một prompt = NỀN (mục 2) + ÁO (mục 3) + một HƯỚNG (mục 4).** Muốn có dấu của Số thì thêm BIỂN S05 (mục 5). Ghép thành một tin
nhắn hoặc một prompt, theo đúng thứ tự đó.

| Công cụ | Cách dán |
|---|---|
| ChatGPT, Gemini | Dán nguyên, một tin nhắn. Bản kem: gửi tiếp "Edit the image you just made. Change only the fabric colour to cream (#E6DFD1)…" như mục 5 của tệp chung, kèm dòng đổi màu của hướng. |
| Midjourney | Nối thành một đoạn. Thêm cuối: `--ar 4:5 --style raw --no text, logo, watermark, mannequin, hanger, person, props`. Mã hex có thể bị bỏ qua; tên màu đi kèm là đủ. |
| Ideogram | Khổ 4:5, tắt Magic Prompt. Vẽ chữ tốt nên hợp để thử biển S05. |
| Công cụ có ô negative prompt (Flux, SDXL…) | Dán mục 6 vào ô đó. |

**Bản kem:** thay dòng màu trong khối ÁO bằng dòng kem, rồi đổi màu hình ở khối HƯỚNG theo dòng "Bản kem" ngay dưới khối đó.

## 2. NỀN — giữ nguyên cho mọi hướng

Ảnh cần khớp bộ ảnh đang có của Số 05: cùng nền, đèn, góc chụp và cỡ áo. Nếu công cụ nhận ảnh tham chiếu, đính kèm
`photos-raw/khoi-black.png` với câu "Match the attached photo's backdrop, light, shadow, camera height and garment scale. Do not
copy the garment itself."

```text
Studio packshot of one garment for an online streetwear shop, photorealistic.
The garment is worn by an invisible (ghost) mannequin, so it keeps a natural, worn, three-dimensional shape; no mannequin, hanger, person or body part is visible anywhere. Front view, camera straight-on at chest height, 85 mm lens at f/8, sharp from edge to edge, no perspective distortion.
The garment is upright and centred, about 75% of the image height, with even margins on all four sides; it never touches or crosses the edge of the image.
Backdrop: a seamless matte paper sweep in warm stone grey (#D4CDC1), evenly lit, no texture, no vignette, no visible floor line.
Light: one large soft key light from the front-left with gentle fill; a soft natural contact shadow on the paper, slightly below and to the right of the garment. No blown highlights, no crushed blacks.
Colour: true to the given colours under neutral 5500 K daylight; no colour grading, no tint, no filter.
Never include text, logos, labels, tags, watermarks, props, people or a second garment, except what the design below asks for.
Vertical image, 4:5.
```

## 3. ÁO — dáng KHÓI, không đổi

```text
The garment is KHÓI ("smoke"), an oversized T-shirt from a numbered, limited streetwear issue.
Heavyweight 250 gsm cotton jersey, dense and slightly matte, with its real knit texture and soft natural folds; freshly steamed, no storage creases.
Oversized cut: dropped shoulders, wide boxy body, straight hem at hip length, wide short sleeves ending just above the elbow, thick 2.5 cm ribbed crew neck.
Fabric colour: black (#1C1C1C), a soft true black.
```

**Bản kem:** thay dòng cuối bằng `Fabric colour: cream (#E6DFD1), a warm sand off-white, not yellow.`

## 4. Năm hướng

**Lưu ý chung về vị trí.** Trên web, thẻ sản phẩm tự vẽ biển "Số 05" ở **góc trái dưới** ảnh và SOLD OUT ở **góc trái trên**.
Các hướng dưới đây đặt chi tiết chính lệch về **bên phải ảnh**, tức bên trái người mặc, để không bị hai biển đó che.

### A. Nhuộm khói — đề xuất

Khói bốc lên từ gấu áo rồi tan dần trước khi tới ngực. Nhìn thấy ngay trên ảnh nhỏ, không có chữ để công cụ vẽ hỏng. Nhuộm phun
tay nên mỗi chiếc hơi khác nhau, hợp với chuyện mỗi mẫu chỉ cắt một lần.

```text
Design: the tee is hand spray-dyed so that smoke seems to rise from the hem. A soft ash-grey haze (#8E8A84) is densest along the bottom hem, drifts upward in two or three irregular, softly curling plumes — the tallest on the right side of the image — and thins out to nothing below the chest. The sleeves, shoulders and collar stay the clean base colour. Every edge of the haze is airbrush-soft — never a stripe, band or hard line — and it is dyed into the fabric and follows the folds, not printed on top.
```

**Bản kem:** thay `ash-grey haze (#8E8A84)` bằng `warm charcoal-grey haze (#5E5953)`.

**Đã thử trên ChatGPT (25/09, bản đen + biển S05):**
- Khói thấy rõ trên ảnh nhỏ và bốc cao hơn ở bên phải, đúng như tả.
- Khói ra như **khói thật chụp ảnh**, giống một hình in, chưa giống vải nhuộm. Muốn chất nhuộm phun thì thêm câu:
  `It must look like spray-dye in the cloth — grainy and cloudy — not like a photograph of real smoke.`
- Biển S05 đúng chỗ, đúng chữ, nhưng cỡ 6 × 2 cm chỉ còn vài điểm ảnh trên thẻ. Muốn thấy biển ở thẻ thì đổi thành `10 × 3.5 cm`.

### B. Vệt khói in lưới

Một cột khói in bằng chấm halftone, vỡ dần thành chấm rời rồi biến mất. Chất in lưới streetwear, đồ hoạ rõ.

```text
Design: one single plume of smoke, screen-printed on the front in a coarse halftone of round dots in ash grey (#A19C95). It starts as a dense column just above the hem on the right side of the image, curls up across the body towards the left shoulder of the image, and there breaks apart into scattered, ever smaller dots until it disappears. It covers roughly 60% of the front. Flat water-based ink that sits in the fabric, matte, slightly worn. Back and sleeves plain.
```

**Bản kem:** thay `ash grey (#A19C95)` bằng `charcoal (#4A4743)`.

### C. Khói nhang thêu

Một sợi khói nhang thêu móc xích, mảnh và tối giản, gợi hình ảnh rất Việt. Tinh tế nhất trong năm hướng nhưng khó thấy nhất trên
ảnh nhỏ.

```text
Design: a single thin, continuous line of rising smoke, chain-stitch embroidered in off-white thread (#E9E4DA) — like the smoke from one incense stick. It starts just above the hem on the right side of the image, rises almost straight, then loosens into three slow, widening curls that fade out at chest height towards the left. Fine and minimal, about 3 mm wide; the stitches are visible and slightly raised. Nothing else on the garment.
```

**Bản kem:** thay `off-white thread (#E9E4DA)` bằng `charcoal thread (#3A3733)`.

### D. Đốt xém

Khói được "đốt" vào chính mặt vải (burnout/devoré): cùng một màu, chỗ vải bị đốt mỏng và hơi trong. Công cụ tạo ảnh hay vẽ nhầm
thành hình in, nên cần xem kỹ.

```text
Design: a tonal burnout (devoré) treatment across the whole body — drifting wisps of smoke burned into the jersey. Where the fibres are burned out the fabric turns thin and slightly see-through, so the wisps read as lighter, semi-sheer ribbons in the same colour, denser near the hem and fading towards the shoulders. No print and no second colour: the pattern is only the fabric's density.
```

**Bản kem:** giữ nguyên câu, chỉ đổi dòng màu ở khối ÁO.

### E. Khói mây

Cả áo wash thành những đám mây khói mờ, tương phản thấp. Dễ mặc nhất, ít "đồ hoạ" nhất.

```text
Design: the whole garment is garment-washed with a low-contrast smoke wash — soft, irregular clouds of slightly lighter and darker tone drifting across the body and sleeves, like smoke seen through frosted glass. The effect is even over the whole tee, faded and soft; never bright like tie-dye, never spotted.
```

**Bản kem:** giữ nguyên câu, chỉ đổi dòng màu ở khối ÁO.

## 5. BIỂN S05 — dấu của Số, thêm vào hướng nào cũng được

Đây là bản vải của biển Số trên web: vải đen, chữ mật ong, viền mảnh lùi vào trong, mỗi đầu một chốt tròn. Nếu hướng này được giữ,
mọi mẫu của một Số có thể mang cùng một biển (S05, S06…). Đó là dấu chung của cả Số, không riêng KHÓI.

```text
Add one small woven patch — the issue plate. A black woven label (#171410) shaped like a small licence plate, 6 × 2 cm with slightly rounded corners, with a thin honey-yellow (#EBA400) line inset just inside its edge, a small honey-yellow dot near each end like a rivet, and in the middle the three characters S05 (the letter S, the digit zero, the digit five) in heavy, wide, geometric capitals in honey yellow. It is stitched flat on the front, just above the hem, on the right side of the image (the wearer's left hip). This patch is the only text on the garment.
```

Muốn biển ở tay áo thì thay câu vị trí bằng `It is stitched flat on the outside of the sleeve on the right side of the image, centred, 2 cm above the sleeve hem.`

## 6. KHÔNG ĐƯỢC CÓ — cho ô negative prompt

```text
text, letters, numbers (except the S05 patch when asked for), logos, brand labels, neck labels, hang tags, stickers, watermarks, mannequin, hanger, person, hands, body parts, props, accessories, second garment, flat lay, folded garment, cropped garment, garment touching the frame edge, patterned backdrop, coloured backdrop, vignette, dramatic lighting, colour grading
```

## 7. Chấm một ảnh

- [ ] **Thu ảnh về rộng khoảng 171px** (cỡ thẻ trên điện thoại). Vẫn nhận ra KHÓI, không lẫn với ÁO THUN TRƠN?
- [ ] Vẫn là áo thun oversize dày: vai rơi, thân rộng, tay áo tới trên khuỷu, cổ bo dày.
- [ ] Bản đen và bản kem đều ổn.
- [ ] Góc trái dưới và góc trái trên không có chi tiết quan trọng, vì đó là chỗ của biển "Số 05" và SOLD OUT trên thẻ.
- [ ] Không có chữ, logo hay nhãn nào ngoài biển S05. Biển ghi đúng "S05": không "SO5", không thêm chữ lạ.
- [ ] Nền, đèn và bóng giống `photos-raw/khoi-black.png`, để KHÓI đứng cạnh các mẫu khác của Số 05 mà không lệch.
- [ ] Đáng tiền hơn một chiếc áo trơn không? Nếu hướng được chọn làm áo "đắt" hơn, giá 390.000₫ có thể phải đổi. Việc đó quyết
  sau, cùng dữ liệu.

## 8. Lưu ảnh thử

Lưu vào `photos-raw/_thu-khoi/` với tên `<hướng>[-bien]-<màu>-<công cụ>.png`, ví dụ `a-bien-black-chatgpt.png`,
`c-cream-midjourney.png`. Git bỏ qua `photos-raw/`. Báo phiên chính để kiểm từng ảnh và đặt lên thẻ thật bên cạnh các mẫu khác.

Khi chọn xong một hướng, phiên chính sẽ:
- sửa khối KHÓI trong `tasks/anh-san-pham-prompt.md`, bỏ "Plain, no print";
- đề xuất đổi loại hoặc giá trong dữ liệu nếu cần. Việc này phải được duyệt;
- nhờ bạn tạo lại `khoi-black.png` và `khoi-cream.png`.
