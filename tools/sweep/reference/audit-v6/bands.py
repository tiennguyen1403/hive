"""bands.py prefix scale bandh cols state[,state2...] width [langs]
Cut shots/<lang>/<state>-<width>.png into bands of `bandh` (after scaling), lay out VI band, EN band side by side,
`cols` columns per sheet. Writes sheets/<prefix>-NN.png."""
import sys, os
from PIL import Image, ImageDraw
prefix, scale, bandh, cols = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
states = sys.argv[5].split(','); width = sys.argv[6]
langs = sys.argv[7].split(',') if len(sys.argv) > 7 else ['vi', 'en']
columns = []
for st in states:
    ims = {}
    for lg in langs:
        p = f"{os.environ.get('ROOT','shots')}/{lg}/{st}-{width}.png"
        if not os.path.exists(p): continue
        im = Image.open(p).convert('RGB')
        if scale != 1: im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
        ims[lg] = im
    if not ims: continue
    nb = max(-(-im.height // bandh) for im in ims.values())
    for b in range(nb):
        for lg in langs:
            im = ims.get(lg)
            if im is None: continue
            top = b * bandh
            if top >= im.height: band = Image.new('RGB', (im.width, 10), 'white')
            else: band = im.crop((0, top, im.width, min(im.height, top + bandh)))
            columns.append((f'{st} {lg} {width} b{b+1}/{nb}', band))
sheets = [columns[i:i + cols] for i in range(0, len(columns), cols)]
for n, group in enumerate(sheets):
    W = sum(c.width for _, c in group) + 6 * (len(group) - 1)
    H = max(c.height for _, c in group) + 18
    sh = Image.new('RGB', (W, H), (210, 30, 30))
    d = ImageDraw.Draw(sh); x = 0
    for label, c in group:
        d.rectangle([x, 0, x + c.width, 17], fill='black'); d.text((x + 3, 3), label, fill='white')
        sh.paste(c, (x, 18)); x += c.width + 6
    out = f'sheets/{prefix}-{n:02d}.png'; sh.save(out); print(out, sh.size)
