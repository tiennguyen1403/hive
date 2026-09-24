"""Measure the HIVE mark in the ChatGPT board: disc, then the black runs per row.

Coordinates are printed in units where the disc radius is 500 and the centre is
(0, 0): x to the right, y downward. Everything is read from pixels, nothing is
estimated by eye.
"""
import sys
from PIL import Image

SRC = r"C:\Users\PC\Downloads\ChatGPT Image 18_07_45 24 thg 9, 2026.png"
img = Image.open(SRC).convert("RGB")
# The main mark sits at about x 233..483, y 66..316 in the 1254 px board.
X0, Y0, X1, Y1 = 225, 58, 492, 325
px = img.load()


def kind(rgb):
    r, g, b = rgb
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if lum < 70:
        return "K"  # black ink
    if r > 190 and 120 < g < 200 and b < 90:
        return "Y"  # honey
    return "."  # background or anti-aliasing


# Disc extents: every pixel that is ink or honey belongs to the disc.
xs, ys = [], []
for y in range(Y0, Y1):
    for x in range(X0, X1):
        if kind(px[x, y]) != ".":
            xs.append(x)
            ys.append(y)
left, right, top, bottom = min(xs), max(xs), min(ys), max(ys)
cx, cy = (left + right + 1) / 2, (top + bottom + 1) / 2
r = ((right - left + 1) + (bottom - top + 1)) / 4
print(f"disc px: left {left} right {right} top {top} bottom {bottom} -> centre ({cx:.1f},{cy:.1f}) r {r:.2f}")
k = 500 / r


def norm_x(x):
    return (x + 0.5 - cx) * k


def norm_y(y):
    return (y + 0.5 - cy) * k


def runs_in_row(y):
    out, start = [], None
    for x in range(left, right + 1):
        is_ink = kind(px[x, y]) == "K"
        if is_ink and start is None:
            start = x
        if not is_ink and start is not None:
            out.append((start, x - 1))
            start = None
    if start is not None:
        out.append((start, right))
    return out


def runs_in_col(x):
    out, start = [], None
    for y in range(top, bottom + 1):
        is_ink = kind(px[x, y]) == "K"
        if is_ink and start is None:
            start = y
        if not is_ink and start is not None:
            out.append((start, y - 1))
            start = None
    if start is not None:
        out.append((start, bottom))
    return out


mode = sys.argv[1] if len(sys.argv) > 1 else "rows"
if mode == "rows":
    for y in range(top, bottom + 1):
        runs = runs_in_row(y)
        if runs:
            cells = " ".join(f"[{norm_x(a):+.0f},{norm_x(b + 1):+.0f}]" for a, b in runs)
            print(f"y {norm_y(y):+5.0f}: {cells}")
elif mode == "cols":
    for x in range(left, right + 1, 2):
        runs = runs_in_col(x)
        if runs:
            cells = " ".join(f"[{norm_y(a):+.0f},{norm_y(b + 1):+.0f}]" for a, b in runs)
            print(f"x {norm_x(x):+5.0f}: {cells}")
