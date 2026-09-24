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

usage: python tools/photo-frame-trial.py <in.png> <out.webp> [width_frac] [top_frac]
"""
import random
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT_W, OUT_H = 1200, 1500
src_path, out_path = sys.argv[1], sys.argv[2]
WIDTH_FRAC = float(sys.argv[3]) if len(sys.argv) > 3 else 0.84
TOP_FRAC = float(sys.argv[4]) if len(sys.argv) > 4 else 0.12

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
gx0, gx1, gy0 = cols[0] * 4, cols[-1] * 4 + 4, rows[0] * 4

# 3. Scale so the garment is WIDTH_FRAC of the canvas, centred, its top at TOP_FRAC.
s = OUT_W * WIDTH_FRAC / (gx1 - gx0)
sw, sh = round(W * s), round(H * s)
scaled = im.resize((sw, sh), Image.LANCZOS)
ox = round(OUT_W / 2 - (gx0 + gx1) / 2 * s)
oy = round(OUT_H * TOP_FRAC - gy0 * s)

# 4. The canvas: the same plane, continued, with the backdrop's own grain.
lo = Image.new("RGB", (OUT_W // 10, OUT_H // 10))
lp = lo.load()
for y in range(OUT_H // 10):
    for x in range(OUT_W // 10):
        lp[x, y] = plane_at((x * 10 + 5 - ox) / s, (y * 10 + 5 - oy) / s)
canvas = lo.resize((OUT_W, OUT_H), Image.BICUBIC)
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
print(f"{src_path}: garment x {gx0}-{gx1} top {gy0}; scale {s:.3f}; photo at ({ox},{oy}) {sw}x{sh}; grain {grain:.2f}")
