# Prompt ChatGPT cho wordmark HIVE (24/09/2026, QĐ-29)

Mark đã chốt là **M2** (`v2/mark-m2.svg`). Người dùng tự tạo lại wordmark bằng ChatGPT; phiên chính soạn prompt.
Bản cũ bị chê vì **quá đậm, nặng** và **trông như font mặc định**. Tỷ lệ bố cục đo từ lockup cũ mà người dùng đã ưng:
chữ cao 45% đường kính mark, khe mark–chữ 10%, số 80% chiều cao chữ. Chỉ độ đậm thay đổi: nét chữ bằng khoảng nửa thân H
trong mark (bản cũ bằng đúng thân H).

## Cách dùng

1. Mở một chat mới, đính kèm `v2/mark-m2-chatgpt.png` (M2 820 px trên nền trắng 1024 px). Đừng đính kèm ảnh logo cũ,
   vì nó kéo ChatGPT về lại nét đậm cũ.
2. Dán prompt chính, thay `[DIRECTION]` bằng một đoạn A–D. Chạy mỗi hướng trong một chat mới.
3. Chỉnh bằng các câu ngắn trong cùng chat.
4. Khi đã ưng, gửi prompt bản mẫu trong cùng chat, tải ảnh về. Phiên chính vẽ lại thành vector: HIVE, dấu chấm, bộ số
   0–9 (vì Số đổi theo từng đợt), rồi ghép lockup với M2 vector. Mark ChatGPT vẽ lại chỉ để xem; bản dùng thật lấy M2 vector.

## Prompt chính

```
The attached image is the final logo mark of HIVE, a small Vietnamese streetwear label that releases its clothes in numbered drops. Design the wordmark that sits to the right of this mark.

THE MARK IS FINAL. Reproduce it exactly as attached — a honey-yellow disc with a black H whose crossbar is a bee seen from above. Do not redraw, restyle, recolour or simplify it.

LOCKUP. One horizontal line, centred on a plain white background: the mark, then "HIVE.05". HIVE is the brand name in capital letters; ".05" is the current drop number and changes with every release (.06, .07 …). HIVE in near-black #171410; the dot and 05 in honey yellow #EBA400. Letter height about 45% of the mark's diameter, vertically centred on the mark; a small gap between the mark and the H, about one tenth of the mark's diameter. The number sits on the same baseline as HIVE, about 80% of the letter height.

WHAT MUST CHANGE. The previous wordmark was far too bold and heavy, and it looked like a default geometric font. This one must be:
- Clearly lighter: a medium weight, strokes about 15% of the letter height — roughly half as thick as the stems of the H inside the mark. Nothing bold or black.
- Custom, not a stock typeface: one distinctive detail, applied the same way to every letter and digit, with everything else kept simple and quiet.

DIRECTION: [DIRECTION]

RULES. Only these two colours on white. Flat vector artwork with sharp, clean edges. No gradients, shadows, outlines, textures, 3D or mockups. No hexagons or honeycomb. No bees, stripes or icons inside the letters — the bee lives only in the mark. It must stay readable at small sizes, such as a phone navigation bar, so no hairlines or tiny details. No other text. Spell exactly: HIVE.05

OUTPUT. Landscape 3:2, the lockup large and centred with generous white space around it.
```

## Điền vào `[DIRECTION]`

**A · Cùng một góc (đề xuất).** M2 là bản "một góc": mọi nhát cắt trong mark cùng nghiêng khoảng 20°. Đem đúng góc đó vào
đầu nét chữ thì mark và chữ thành một hệ, và chi tiết riêng của chữ có lý do kể được.

```
SAME ANGLE. Every cut in the mark uses one shallow angle of about 20°: the ends of the H stems and the honey gaps along the bee's wings. Carry that single angle into the wordmark: the ends of the strokes in H, I, V, E and in the digits are cut at the same ~20° angle, like the stems of the H in the mark, as if trimmed by the same blade. Everything else is a plain, sturdy sans-serif of normal width.
```

**B · Khía chỗ nối.** Khe mật ong quanh con ong thành những vết khía nhỏ ở góc trong, nơi các nét gặp nhau (kiểu ink
trap), giúp chữ rõ hơn ở cỡ nhỏ. Khác W2: W2 tách hẳn nét, còn hướng này chỉ khía vào góc.

```
NOTCHED JOINS. The mark separates the bee from the H with narrow honey gaps. Echo that with small, clean notches (ink traps) cut into the inside corners where strokes meet: where the crossbar of the H meets its stems, inside the point of the V, where the arms of the E meet its stem, and at the joins of the digits. Square stroke ends, normal width, a precise contemporary grotesk.
```

**C · Chân vuông.** Chân chữ vuông, ngắn, như tên in trên nhãn quần áo bảo hộ. Đây là hướng xa bản cũ nhất, giữ lại để
có cái đối chiếu.

```
SQUARE SLABS. Sturdy capitals with short, square slab serifs as thick as the strokes, like a name stamped on a workwear label or a uniform tag. The slabs are the only detail: even stroke thickness with no thick-thin contrast, normal width.
```

**D · Để ChatGPT chọn.** ChatGPT tự chọn hướng, nhưng chi tiết riêng vẫn phải lấy từ mark.

```
YOUR CHOICE. Choose the direction you think suits this mark best. Its one distinctive detail must come from the mark itself: its ~20° cuts, its narrow honey gaps, or the rounded forms of the bee.
```

## Chỉnh trong cùng chat

- Vẫn nặng: `Same design, every stroke about 20% thinner. Change nothing else.`
- Nhạt quá: `Same design, every stroke about 15% thicker. Change nothing else.`
- Chi tiết chưa rõ: `Same design, make the distinctive detail a little stronger, identical on every letter and digit.`
- Chữ sát: `Same design, a little more space between the letters.`
- Mark bị vẽ sai (đính kèm lại ảnh M2): `Keep the wordmark exactly as it is and redraw the mark to match the attached image exactly.`

## Bản mẫu để vẽ lại vector

```
Keep this exact wordmark: the same letter shapes, weight, spacing and colours. Lay it out as a clean specimen sheet so it can be redrawn as vector artwork. White background, landscape 3:2, flat colours, sharp edges, perfectly horizontal, no labels and no other text. Three rows, evenly spaced:
1. The lockup: the mark followed by HIVE.05.
2. HIVE on its own, as large as the width allows.
3. The dot and all ten digits 0 1 2 3 4 5 6 7 8 9 in honey yellow #EBA400, in the same style as the 05, evenly spaced.
```
