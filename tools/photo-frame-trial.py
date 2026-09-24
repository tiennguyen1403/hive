"""Trial framing for the product photos (25/09/2026) — a REFERENCE for the
photo slice, not a maintained tool: every garment the same width, the same
distance from the top, on a 1200 x 1500 canvas whose backdrop is the photo's
own, continued.

Tried on photos-raw/khoi-black.png (1122x1402) and khoi-cream.png (1198x1313,
ChatGPT changed the canvas when it recoloured): both came out centred, 84% wide,
collar at 12%, no visible seam. Width is the right measure for tops; a tall
garment (trousers, the long coat MƯA) needs the height checked too, so the real
slice should fit the garment inside a safe box rather than by width alone.

Pillow only (no numpy on the machine it was written on).

usage: python tools/photo-frame-trial.py <in.png> <out.webp> [width_frac] [top_frac] [height_frac]

Since 25/09 (MUỐI, the first trousers) the garment is fitted inside a box, not
by width alone: width_frac of the canvas wide AND height_frac tall at most,
whichever binds first. Tops and hoodies stay width-bound (they reach 70-82% of
the height at 84% of the width); trousers and long coats become height-bound.
"""
import random
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT_W, OUT_H = 1200, 1500
src_path, out_path = sys.argv[1], sys.argv[2]
WIDTH_FRAC = float(sys.argv[3]) if len(sys.argv) > 3 else 0.84
TOP_FRAC = float(sys.argv[4]) if len(sys.argv) > 4 else 0.12
HEIGHT_FRAC = float(sys.argv[5]) if len(sys.argv) > 5 else 0.82

im = Image.open(src_path).convert("RGB")
W, H = im.size
px = im.load()

# 1. The backdrop as a plane per channel, fitted to the top band and the two
#    side bands of the upper half (the floor shadow lives at the bottom).
pts = []
for y in range(0, 40, 4):
    for x in range(0, W, 8):
        pts.append((x, y, px[x, y]))
for y in range(40, H // 2, 8):
    for x in list(range(0, 36, 6)) + list(range(W - 36, W, 6)):
        pts.append((x, y, px[x, y]))

def solve3(A, b):
    # Cramer's rule for a 3x3 system
    def det(m):
        return (m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
                - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
                + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]))
    d = det(A)
    out = []
    for i in range(3):
        m = [row[:] for row in A]
        for r in range(3):
            m[r][i] = b[r]
        out.append(det(m) / d)
    return out

planes = []
for ch in range(3):
    S1 = len(pts); Sx = sum(p[0] for p in pts); Sy = sum(p[1] for p in pts)
    Sxx = sum(p[0] * p[0] for p in pts); Syy = sum(p[1] * p[1] for p in pts); Sxy = sum(p[0] * p[1] for p in pts)
    Sv = sum(p[2][ch] for p in pts); Sxv = sum(p[0] * p[2][ch] for p in pts); Syv = sum(p[1] * p[2][ch] for p in pts)
    planes.append(solve3([[S1, Sx, Sy], [Sx, Sxx, Sxy], [Sy, Sxy, Syy]], [Sv, Sxv, Syv]))

def plane_at(x, y):
    return tuple(max(0, min(255, round(a + b * x + c * y))) for a, b, c in planes)

# grain of the real backdrop: spread of the top band around the plane
res = [px[x, y][1] - plane_at(x, y)[1] for y in range(0, 40, 2) for x in range(0, W, 5)]
mean = sum(res) / len(res)
grain = (sum((r - mean) ** 2 for r in res) / len(res)) ** 0.5

# 2. Where the garment is. The backdrop darkens toward the corners, so each
#    row is compared with its OWN two ends (the garment never reaches them),
#    interpolated across, rather than with one plane for the whole photo.
small_w, small_h = W // 4, H // 4
sm = im.resize((small_w, small_h), Image.BILINEAR)
sp = sm.load()
edge = max(3, small_w // 60)
def mid(vals):
    vals = sorted(vals)
    return vals[len(vals) // 2]
mask = Image.new("L", (small_w, small_h), 0)
mp = mask.load()
for y in range(small_h):
    L = [mid([sp[x, y][c] for x in range(edge)]) for c in range(3)]
    R = [mid([sp[x, y][c] for x in range(small_w - edge, small_w)]) for c in range(3)]
    for x in range(edge, small_w - edge):
        t = x / (small_w - 1)
        d = max(abs(sp[x, y][c] - (L[c] + (R[c] - L[c]) * t)) for c in range(3))
        if d > 16:
            mp[x, y] = 255
mask = mask.filter(ImageFilter.MedianFilter(3))
mp = mask.load()
cols = [x for x in range(small_w) if sum(1 for y in range(small_h) if mp[x, y]) >= 3]
rows = [y for y in range(small_h) if sum(1 for x in range(small_w) if mp[x, y]) >= 3]
gx0, gx1, gy0, gy1 = cols[0] * 4, cols[-1] * 4 + 4, rows[0] * 4, rows[-1] * 4 + 4
seen_right = gx1

# The right edge is also mirrored, and the wider of the two is kept. The key
# light comes from the front left, so the right side is where the garment's
# own shade and its cast shadow both fall: CÁT cream's shaded sleeve matched
# the paper and the mask stopped 42px short, while a lower threshold took in
# the cast shadow of every dark garment instead (MUỐI grew 72px). The lit
# left edge is reliable, and a top is symmetric about its collar or hood,
# which the light reaches on both sides. Trousers are not (MUỐI's right leg
# stands further out), so the mirror only ever widens: a shaded side is never
# cut short, and a cast shadow costs at most a couple of per cent of scale.
top = [y for y in rows if y <= rows[0] + max(2, (rows[-1] - rows[0]) // 12)]
mids = []
for y in top:
    xs = [x for x in range(small_w) if mp[x, y]]
    if xs:
        mids.append((xs[0] + xs[-1] + 1) / 2)
axis = sorted(mids)[len(mids) // 2] * 4
gx1 = max(seen_right, round(2 * axis - gx0))

# 3. Scale so the garment is WIDTH_FRAC of the canvas wide, or HEIGHT_FRAC tall
#    if that binds first; centred, its top at TOP_FRAC.
s_w = OUT_W * WIDTH_FRAC / (gx1 - gx0)
s_h = OUT_H * HEIGHT_FRAC / (gy1 - gy0)
s = min(s_w, s_h)
bound = "width" if s_w <= s_h else "height"
sw, sh = round(W * s), round(H * s)
scaled = im.resize((sw, sh), Image.LANCZOS)
ox = round(OUT_W / 2 - (gx0 + gx1) / 2 * s)
oy = round(OUT_H * TOP_FRAC - gy0 * s)

# 4. The canvas: the photo's OWN border, continued outward, with the
#    backdrop's grain. Until 25/09 this was the plane of step 1, continued —
#    fitted to the top and the upper sides, it missed a paper sweep that
#    lightens toward the floor, and NẮNG (white, cream, moss) showed a darker
#    band where the photo ended. Each edge band is averaged across its depth
#    and smoothed along its length, so the continuation starts at exactly the
#    colour the photo ends on.
x0, y0 = max(0, ox), max(0, oy)
x1, y1 = min(OUT_W, ox + sw), min(OUT_H, oy + sh)
vis = scaled.crop((x0 - ox, y0 - oy, x1 - ox, y1 - oy))
vw, vh = vis.size
band = 24
def along(img, n):  # smooth a 1-pixel strip along its length
    w, h = img.size
    if w > 1:
        return img.resize((max(1, w // n), 1), Image.BOX).resize((w, 1), Image.BILINEAR)
    return img.resize((1, max(1, h // n)), Image.BOX).resize((1, h), Image.BILINEAR)
top_b = along(vis.crop((0, 0, vw, band)).resize((vw, 1), Image.BOX), 16)
bot_b = along(vis.crop((0, vh - band, vw, vh)).resize((vw, 1), Image.BOX), 16)
lef_b = along(vis.crop((0, 0, band, vh)).resize((1, vh), Image.BOX), 16)
rig_b = along(vis.crop((vw - band, 0, vw, vh)).resize((1, vh), Image.BOX), 16)
canvas = Image.new("RGB", (OUT_W, OUT_H))
def corner(a, b):
    return tuple((p + q) // 2 for p, q in zip(a, b))
if y0 > 0:
    canvas.paste(top_b.resize((vw, y0)), (x0, 0))
if y1 < OUT_H:
    canvas.paste(bot_b.resize((vw, OUT_H - y1)), (x0, y1))
if x0 > 0:
    canvas.paste(lef_b.resize((x0, vh)), (0, y0))
    canvas.paste(corner(top_b.getpixel((0, 0)), lef_b.getpixel((0, 0))), (0, 0, x0, y0))
    canvas.paste(corner(bot_b.getpixel((0, 0)), lef_b.getpixel((0, vh - 1))), (0, y1, x0, OUT_H))
if x1 < OUT_W:
    canvas.paste(rig_b.resize((OUT_W - x1, vh)), (x1, y0))
    canvas.paste(corner(top_b.getpixel((vw - 1, 0)), rig_b.getpixel((0, 0))), (x1, 0, OUT_W, y0))
    canvas.paste(corner(bot_b.getpixel((vw - 1, 0)), rig_b.getpixel((0, vh - 1))), (x1, y1, OUT_W, OUT_H))
# Under the photo, the photo itself: its feathered edge in step 5 then fades
# into its own softened copy, never into an unfilled canvas.
canvas.paste(vis, (x0, y0))
canvas = canvas.filter(ImageFilter.GaussianBlur(6))
if grain > 0.3:
    noise = Image.effect_noise((OUT_W, OUT_H), grain * 2.2).convert("RGB")
    canvas = ImageChops.add(canvas, noise, 1.0, -128)

# 5. The photo on top, feathered where its own edge meets the continuation.
feather = 36
alpha = Image.new("L", (sw, sh), 0)
ImageDraw.Draw(alpha).rectangle((feather, feather, sw - feather, sh - feather), fill=255)
alpha = alpha.filter(ImageFilter.GaussianBlur(feather / 2))
canvas.paste(scaled, (ox, oy), alpha)
canvas.save(out_path, "WEBP", quality=86, method=6)
print(f"{src_path}: garment x {gx0}-{gx1} (seen to {seen_right}) y {gy0}-{gy1}; {bound}-bound, scale {s:.3f}; photo at ({ox},{oy}) {sw}x{sh}; grain {grain:.2f}")
