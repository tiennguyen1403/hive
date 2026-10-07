"""Contact sheet: grid of images, each scaled to `w` px wide, with labels.
usage: sheet.py out.png cols width label1=path1 label2=path2 ...
A long image is cropped to `maxh` (env MAXH, default 2400) unless CROP=0."""
import sys, os
from PIL import Image, ImageDraw
out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
maxh = int(os.environ.get('MAXH', '2400'))
items = []
for a in sys.argv[4:]:
    label, path = a.split('=', 1)
    try:
        im = Image.open(path).convert('RGB')
    except Exception as e:
        im = Image.new('RGB', (w, 60), 'white'); label += ' [missing]'
    s = w / im.width
    im = im.resize((w, max(1, int(im.height * s))), Image.LANCZOS)
    if im.height > maxh: im = im.crop((0, 0, w, maxh))
    items.append((label, im))
rows = [items[i:i+cols] for i in range(0, len(items), cols)]
H = sum(max(im.height for _, im in r) + 22 for r in rows)
sheet = Image.new('RGB', (cols * (w + 8), H), (200, 40, 40))
d = ImageDraw.Draw(sheet)
y = 0
for r in rows:
    rh = max(im.height for _, im in r)
    for i, (label, im) in enumerate(r):
        x = i * (w + 8)
        d.rectangle([x, y, x + w, y + 21], fill='black')
        d.text((x + 4, y + 4), label, fill='white')
        sheet.paste(im, (x, y + 22))
    y += rh + 22
sheet.save(out)
print(out, sheet.size)
